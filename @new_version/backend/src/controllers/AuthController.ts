import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { database } from '../config/database';
import { generateToken } from '../middleware/auth';
import { 
  LoginRequest, 
  RegisterRequest, 
  User, 
  Tenant, 
  ApiResponse, 
  AuthResponse,
  CreateTenantRequest 
} from '../types';

export class AuthController {
  public async login(req: Request<{}, ApiResponse<AuthResponse>, LoginRequest>, res: Response<ApiResponse<AuthResponse>>) {
    try {
      const { email, password, tenant_slug } = req.body;

      // Validar datos de entrada
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario con información del tenant
      let query = `
        SELECT 
          u.id, u.tenant_id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active,
          t.id as tenant_id, t.slug, t.name as tenant_name, t.plan_type, t.limits, t.status as tenant_status
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.email = $1 AND u.is_active = TRUE AND t.deleted_at IS NULL
      `;
      const params = [email.toLowerCase()];

      // Si se proporciona tenant_slug, filtrar por tenant
      if (tenant_slug) {
        query += ' AND t.slug = $2';
        params.push(tenant_slug);
      }

      const user = await database.get(query, params) as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar que el tenant esté activo
      if (user.tenant_status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Tenant inactivo'
        });
      }

      // Generar tokens
      const accessToken = generateToken(user, user);
      const refreshToken = generateToken(user, user); // Por simplicidad, usamos el mismo token

      // Preparar respuesta
      const userResponse: User = {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        profile: {},
        preferences: {},
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      const tenantResponse: Tenant = {
        id: user.tenant_id,
        slug: user.slug,
        name: user.tenant_name,
        plan_type: user.plan_type,
        status: user.tenant_status,
        settings: {},
        billing_info: {},
        limits: user.limits,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      return res.json({
        success: true,
        data: {
          user: userResponse,
          tenant: tenantResponse,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 7 * 24 * 60 * 60
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async register(req: Request<{}, ApiResponse<AuthResponse>, RegisterRequest>, res: Response<ApiResponse<AuthResponse>>) {
    try {
      const { email, password, name, tenant_slug } = req.body;

      // Validar datos de entrada
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, contraseña y nombre son requeridos'
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya existe'
        });
      }

      // Buscar o crear tenant
      let tenant;
      if (tenant_slug) {
        // Buscar tenant existente
        tenant = await database.get(
          'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
          [tenant_slug]
        );
        
        if (!tenant) {
          return res.status(400).json({
            success: false,
            message: 'Tenant no encontrado'
          });
        }
      } else {
        // Crear nuevo tenant
        const tenantData: CreateTenantRequest = {
          name: `${name}'s Organization`,
          domain: undefined,
          plan_type: 'starter',
          settings: {},
          billing_info: {},
          limits: {
            max_users: 5,
            max_contacts: 100,
            max_conversations: 50
          }
        };

        const newTenant = await database.run(`
          INSERT INTO tenants (name, slug, plan_type, settings, billing_info, limits)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          tenantData.name,
          `org-${Date.now()}`,
          tenantData.plan_type,
          JSON.stringify(tenantData.settings),
          JSON.stringify(tenantData.billing_info),
          JSON.stringify(tenantData.limits)
        ]);

        tenant = newTenant;
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Crear usuario
      const newUser = await database.run(`
        INSERT INTO users (tenant_id, email, password_hash, name, role, permissions, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        tenant.id,
        email.toLowerCase(),
        passwordHash,
        name,
        'owner',
        JSON.stringify({}),
        true
      ]);

      // Generar tokens
      const accessToken = generateToken(newUser, tenant);
      const refreshToken = generateToken(newUser, tenant);

      // Preparar respuesta
      const userResponse: User = {
        id: newUser.id,
        tenant_id: newUser.tenant_id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        permissions: newUser.permissions,
        profile: {},
        preferences: {},
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      };

      const tenantResponse: Tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan_type: tenant.plan_type,
        status: tenant.status,
        settings: tenant.settings,
        billing_info: tenant.billing_info,
        limits: tenant.limits,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at
      };

      return res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          tenant: tenantResponse,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 7 * 24 * 60 * 60
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const tenant = (req as any).tenant;

      if (!user || !tenant) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      return res.json({
        success: true,
        data: {
          user,
          tenant
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { name, email } = req.body;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Actualizar perfil
      const updatedUser = await database.run(`
        UPDATE users 
        SET name = $1, email = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [name || user.name, email || user.email, user.id]);

      return res.json({
        success: true,
        data: {
          user: updatedUser,
          tenant: (req as any).tenant
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      // Verificar refresh token (por ahora usamos el mismo token)
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
      }

      try {
        const decoded = jwt.verify(refresh_token, jwtSecret) as any;
        
        // Obtener usuario actualizado
        const user = await database.get(`
          SELECT u.*, t.* FROM users u
          JOIN tenants t ON u.tenant_id = t.id
          WHERE u.id = $1 AND u.is_active = TRUE AND t.deleted_at IS NULL
        `, [decoded.userId]) as any;

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no válido'
          });
        }

        // Generar nuevo token
        const newToken = generateToken(user, user);

        return res.json({
          success: true,
          data: {
            access_token: newToken,
            expires_in: 7 * 24 * 60 * 60
          }
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido'
        });
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      // Por ahora solo devolvemos éxito
      // En el futuro se puede implementar blacklist de tokens
      return res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

// Exportar instancia del controlador
export const authController = new AuthController();