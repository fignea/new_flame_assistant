import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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

      // Verificar que el tenant esté activo
      if (user.tenant_status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Tenant suspendido o inactivo'
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

      // Actualizar último login
      await database.run(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generar token
      const userData: User = {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        password_hash: user.password_hash,
        name: user.name,
        role: user.role,
        permissions: user.permissions || {},
        profile: {},
        preferences: {},
        is_active: user.is_active,
        created_at: '',
        updated_at: ''
      };

      const tenantData: Tenant = {
        id: user.tenant_id,
        slug: user.slug,
        name: user.tenant_name,
        plan_type: user.plan_type,
        status: user.tenant_status,
        settings: {},
        billing_info: {},
        limits: user.limits || {},
        created_at: '',
        updated_at: ''
      };

      const token = generateToken(userData, tenantData);

      // Respuesta exitosa (sin incluir la contraseña)
      const { password_hash: _, ...userWithoutPassword } = userData;
      
      return res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          tenant: tenantData,
          access_token: token,
          refresh_token: token, // Por ahora usamos el mismo token
          expires_in: 7 * 24 * 60 * 60 // 7 días en segundos
        },
        message: 'Inicio de sesión exitoso'
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
      const { email, password, name, tenant_slug, role = 'agent' } = req.body;

      // Validar datos de entrada
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, contraseña y nombre son requeridos'
        });
      }

      // Buscar tenant por slug
      let tenant: any;
      if (tenant_slug) {
        tenant = await database.get(
          'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
          [tenant_slug]
        );
        
        if (!tenant) {
          return res.status(404).json({
            success: false,
            message: 'Tenant no encontrado'
          });
        }

        if (tenant.status !== 'active') {
          return res.status(403).json({
            success: false,
            message: 'Tenant no está activo'
          });
        }
      } else {
        // Si no se proporciona tenant, crear uno nuevo
        const tenantData: CreateTenantRequest = {
          name: `${name}'s Organization`,
          plan_type: 'starter',
          settings: { timezone: 'America/Mexico_City', language: 'es' },
          limits: { max_users: 10, max_contacts: 1000, max_conversations: 5000 }
        };

        const tenantId = await this.createTenant(tenantData);
        tenant = await database.get('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      }

      // Verificar si el usuario ya existe en este tenant
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [email.toLowerCase(), tenant.id]
      );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya existe en este tenant'
        });
      }

      // Verificar límites del tenant
      const userCount = await database.get(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL',
        [tenant.id]
      ) as any;

      if (userCount.count >= tenant.limits.max_users) {
        return res.status(403).json({
          success: false,
          message: 'Límite de usuarios alcanzado para este tenant'
        });
      }

      // Encriptar contraseña
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Crear usuario
      const userId = await database.run(`
        INSERT INTO users (tenant_id, email, password_hash, name, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
        RETURNING id
      `, [tenant.id, email.toLowerCase(), passwordHash, name, role]);

      // Obtener usuario creado
      const newUser = await database.get(
        'SELECT id, tenant_id, email, name, role, permissions, is_active, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      ) as User;

      // Generar token
      const token = generateToken(newUser, tenant);

      // Respuesta exitosa
      const { password_hash: _, ...userWithoutPassword } = newUser;
      
      return res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          tenant: tenant,
          access_token: token,
          refresh_token: token,
          expires_in: 7 * 24 * 60 * 60
        },
        message: 'Usuario registrado exitosamente'
      });

    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async createTenant(tenantData: CreateTenantRequest): Promise<string> {
    try {
      // Generar slug único
      const baseSlug = tenantData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let slug = baseSlug;
      let counter = 0;
      
      while (await this.tenantSlugExists(slug)) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      // Crear tenant
      const tenantId = await database.run(`
        INSERT INTO tenants (slug, name, domain, plan_type, status, settings, billing_info, limits, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, NOW(), NOW())
        RETURNING id
      `, [
        slug,
        tenantData.name,
        tenantData.domain || null,
        tenantData.plan_type || 'starter',
        JSON.stringify(tenantData.settings || {}),
        JSON.stringify(tenantData.billing_info || {}),
        JSON.stringify(tenantData.limits || {})
      ]);

      return tenantId;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  private async tenantSlugExists(slug: string): Promise<boolean> {
    const result = await database.get(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug]
    );
    return !!result;
  }

  public async getTenants(req: Request, res: Response<ApiResponse<Tenant[]>>) {
    try {
      const tenants = await database.all(
        'SELECT * FROM tenants WHERE deleted_at IS NULL ORDER BY created_at DESC'
      ) as Tenant[];

      return res.json({
        success: true,
        data: tenants
      });
    } catch (error) {
      console.error('Get tenants error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo tenants'
      });
    }
  }

  public async getTenantBySlug(req: Request, res: Response<ApiResponse<Tenant>>) {
    try {
      const { slug } = req.params;

      const tenant = await database.get(
        'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
        [slug]
      ) as Tenant;

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant no encontrado'
        });
      }

      return res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      console.error('Get tenant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo tenant'
      });
    }
  }

  public async refreshToken(req: Request, res: Response<ApiResponse<{ access_token: string; expires_in: number }>>) {
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

  public async logout(req: Request, res: Response<ApiResponse>) {
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