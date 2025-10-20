import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, User, PaginatedResponse } from '../types';
import { database } from '../config/database';
import * as bcrypt from 'bcryptjs';

export class UsersController {
  // Listar todos los usuarios del tenant
  public async getAll(req: AuthenticatedRequest, res: Response<PaginatedResponse<User>>) {
    try {
      const tenantId = req.tenant?.id;
      const { page = 1, limit = 20, role, is_active, search } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0
          }
        });
      }

      const offset = (Number(page) - 1) * Number(limit);
      
      let whereClause = 'WHERE tenant_id = $1 AND deleted_at IS NULL';
      const params: any[] = [tenantId];
      
      if (role) {
        whereClause += ` AND role = $${params.length + 1}`;
        params.push(role);
      }
      
      if (is_active !== undefined) {
        whereClause += ` AND is_active = $${params.length + 1}`;
        params.push(is_active === 'true');
      }
      
      if (search) {
        whereClause += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
      }

      const users = await database.all(`
        SELECT 
          id, tenant_id, email, name, role, permissions, profile, preferences,
          is_active, last_login_at, email_verified_at, created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, Number(limit), offset]);

      const total = await database.get(`
        SELECT COUNT(*)::integer as count
        FROM users
        ${whereClause}
      `, params) as any;

      return res.json({
        success: true,
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.count || 0,
          pages: Math.ceil((total.count || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo usuarios',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }
  }

  // Obtener usuario por ID
  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse<User>>) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const user = await database.get(`
        SELECT 
          id, tenant_id, email, name, role, permissions, profile, preferences,
          is_active, last_login_at, email_verified_at, created_at, updated_at
        FROM users 
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      `, [id, tenantId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      return res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Get user by id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo usuario'
      });
    }
  }

  // Crear nuevo usuario
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<User>>) {
    try {
      const tenantId = req.tenant?.id;
      const { email, password, name, role = 'agent', permissions = {}, is_active = true } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Validar campos requeridos
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, contraseña y nombre son requeridos'
        });
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      // Validar contraseña
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Validar rol
      const validRoles = ['owner', 'admin', 'agent', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido. Valores permitidos: owner, admin, agent, viewer'
        });
      }

      // Verificar si el email ya existe en el tenant
      const existingUser = await database.get(
        'SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL',
        [tenantId, email]
      );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado en esta organización'
        });
      }

      // Hash de la contraseña
      const password_hash = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await database.get(`
        INSERT INTO users (
          tenant_id, email, password_hash, name, role, permissions, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id, tenant_id, email, name, role, permissions, profile, preferences,
          is_active, last_login_at, email_verified_at, created_at, updated_at
      `, [tenantId, email, password_hash, name, role, JSON.stringify(permissions), is_active]);

      return res.status(201).json({
        success: true,
        data: user,
        message: 'Usuario creado exitosamente'
      });

    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando usuario'
      });
    }
  }

  // Actualizar usuario
  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<User>>) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.id;
      const updateData = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario existe y pertenece al tenant
      const existingUser = await database.get(
        'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Validar rol si se está actualizando
      if (updateData.role) {
        const validRoles = ['owner', 'admin', 'agent', 'viewer'];
        if (!validRoles.includes(updateData.role)) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          });
        }
      }

      // Validar email si se está actualizando
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            success: false,
            message: 'Email inválido'
          });
        }

        // Verificar que el email no esté en uso
        const emailInUse = await database.get(
          'SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND id != $3 AND deleted_at IS NULL',
          [tenantId, updateData.email, id]
        );

        if (emailInUse) {
          return res.status(409).json({
            success: false,
            message: 'El email ya está en uso'
          });
        }
      }

      // Construir query dinámicamente
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ['email', 'name', 'role', 'permissions', 'profile', 'preferences', 'is_active'];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = $${paramIndex}`);
          if (key === 'permissions' || key === 'profile' || key === 'preferences') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos válidos para actualizar'
        });
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, tenantId);

      const user = await database.get(`
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
        RETURNING 
          id, tenant_id, email, name, role, permissions, profile, preferences,
          is_active, last_login_at, email_verified_at, created_at, updated_at
      `, values);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      return res.json({
        success: true,
        data: user,
        message: 'Usuario actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando usuario'
      });
    }
  }

  // Eliminar usuario (soft delete)
  public async delete(req: AuthenticatedRequest, res: Response<ApiResponse<null>>) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.id;
      const currentUserId = req.user?.id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // No permitir que un usuario se elimine a sí mismo
      if (id === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      // Verificar que el usuario existe
      const user = await database.get(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Soft delete
      const result = await database.query(
        'UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando usuario'
      });
    }
  }

  // Cambiar contraseña de un usuario
  public async changePassword(req: AuthenticatedRequest, res: Response<ApiResponse<null>>) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.id;
      const { newPassword } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Verificar que el usuario existe
      const user = await database.get(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Hash de la nueva contraseña
      const password_hash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await database.run(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
        [password_hash, id, tenantId]
      );

      return res.json({
        success: true,
        data: null,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cambiando contraseña'
      });
    }
  }

  // Activar/Desactivar usuario
  public async toggleActive(req: AuthenticatedRequest, res: Response<ApiResponse<User>>) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.id;
      const currentUserId = req.user?.id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // No permitir que un usuario se desactive a sí mismo
      if (id === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes desactivar tu propia cuenta'
        });
      }

      // Obtener estado actual
      const currentUser = await database.get(
        'SELECT is_active FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Toggle estado
      const newStatus = !currentUser.is_active;

      const user = await database.get(`
        UPDATE users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING 
          id, tenant_id, email, name, role, permissions, profile, preferences,
          is_active, last_login_at, email_verified_at, created_at, updated_at
      `, [newStatus, id, tenantId]);

      return res.json({
        success: true,
        data: user,
        message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error) {
      console.error('Toggle user active error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cambiando estado del usuario'
      });
    }
  }

  // Obtener estadísticas de usuarios
  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const totalUsers = await database.get(
        'SELECT COUNT(*)::integer as count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL',
        [tenantId]
      );

      const activeUsers = await database.get(
        'SELECT COUNT(*)::integer as count FROM users WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL',
        [tenantId]
      );

      const usersByRole = await database.all(`
        SELECT role, COUNT(*)::integer as count
        FROM users
        WHERE tenant_id = $1 AND deleted_at IS NULL
        GROUP BY role
      `, [tenantId]);

      const roleStats: Record<string, number> = {};
      usersByRole.forEach((stat: any) => {
        roleStats[stat.role] = stat.count;
      });

      const recentLogins = await database.all(`
        SELECT id, name, email, last_login_at
        FROM users
        WHERE tenant_id = $1 AND deleted_at IS NULL AND last_login_at IS NOT NULL
        ORDER BY last_login_at DESC
        LIMIT 5
      `, [tenantId]);

      const stats = {
        total: totalUsers.count || 0,
        active: activeUsers.count || 0,
        inactive: (totalUsers.count || 0) - (activeUsers.count || 0),
        byRole: roleStats,
        recentLogins
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get users stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de usuarios'
      });
    }
  }
}

export const usersController = new UsersController();

