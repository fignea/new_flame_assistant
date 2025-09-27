import { Request, Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse, CreateOrganizationRequest, UpdateOrganizationRequest, InviteUserRequest, UpdateUserRoleRequest, OrganizationWithStats } from '../types';
import { logger } from '../utils/logger';

export class OrganizationsController {
  // Crear nueva organización
  public async createOrganization(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { name, slug, description, plan = 'free' }: CreateOrganizationRequest = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y slug son requeridos'
        });
      }

      // Verificar que el slug no esté en uso
      const existingOrg = await database.get(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      );

      if (existingOrg) {
        return res.status(409).json({
          success: false,
          message: 'El slug ya está en uso'
        });
      }

      // Crear organización
      const result = await database.query(
        `INSERT INTO organizations (name, slug, description, plan, max_users, max_whatsapp_sessions) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, slug, description, plan, 5, 1]
      );

      const organization = result.rows[0];

      // Asignar al usuario como owner
      await database.query(
        `INSERT INTO organization_roles (organization_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [organization.id, userId, 'owner']
      );

      logger.info(`🏢 Organización creada: ${name} (${slug}) por usuario ${userId}`);

      return res.status(201).json({
        success: true,
        data: organization,
        message: 'Organización creada exitosamente'
      });

    } catch (error) {
      logger.error('Error creating organization:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener organizaciones del usuario
  public async getUserOrganizations(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const organizations = await database.query(
        `SELECT o.*, or_role.role, or_role.joined_at
         FROM organizations o
         JOIN organization_roles or_role ON o.id = or_role.organization_id
         WHERE or_role.user_id = $1 AND o.is_active = true
         ORDER BY or_role.joined_at ASC`,
        [userId]
      );

      return res.json({
        success: true,
        data: organizations.rows,
        message: 'Organizaciones obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error getting user organizations:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener detalles de una organización
  public async getOrganization(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario pertenece a la organización
      const userRole = await database.get(
        `SELECT or_role.role, o.*
         FROM organizations o
         JOIN organization_roles or_role ON o.id = or_role.organization_id
         WHERE o.id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a esta organización'
        });
      }

      // Obtener estadísticas de la organización
      const stats = await this.getOrganizationStats(parseInt(id));

      const organizationWithStats: OrganizationWithStats = {
        ...userRole,
        stats,
        user_count: 0, // Se calculará en la consulta
        role: userRole.role
      };

      return res.json({
        success: true,
        data: organizationWithStats,
        message: 'Organización obtenida exitosamente'
      });

    } catch (error) {
      logger.error('Error getting organization:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar organización
  public async updateOrganization(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData: UpdateOrganizationRequest = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario es owner o admin
      const userRole = await database.get(
        `SELECT or_role.role
         FROM organization_roles or_role
         WHERE or_role.organization_id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar esta organización'
        });
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }
      if (updateData.settings) {
        updateFields.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(updateData.settings));
      }
      if (updateData.plan) {
        updateFields.push(`plan = $${paramCount++}`);
        values.push(updateData.plan);
      }
      if (updateData.max_users) {
        updateFields.push(`max_users = $${paramCount++}`);
        values.push(updateData.max_users);
      }
      if (updateData.max_whatsapp_sessions) {
        updateFields.push(`max_whatsapp_sessions = $${paramCount++}`);
        values.push(updateData.max_whatsapp_sessions);
      }
      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updateData.is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await database.query(
        `UPDATE organizations SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Organización actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error updating organization:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Invitar usuario a la organización
  public async inviteUser(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { email, role = 'member', permissions = {} }: InviteUserRequest = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario es owner o admin
      const userRole = await database.get(
        `SELECT or_role.role
         FROM organization_roles or_role
         WHERE or_role.organization_id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para invitar usuarios'
        });
      }

      // Buscar el usuario por email
      const user = await database.get(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar que no esté ya en la organización
      const existingRole = await database.get(
        'SELECT id FROM organization_roles WHERE organization_id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (existingRole) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya pertenece a esta organización'
        });
      }

      // Invitar usuario
      const result = await database.query(
        `INSERT INTO organization_roles (organization_id, user_id, role, permissions, invited_by) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, user.id, role, JSON.stringify(permissions), userId]
      );

      logger.info(`👥 Usuario ${email} invitado a organización ${id} con rol ${role}`);

      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Usuario invitado exitosamente'
      });

    } catch (error) {
      logger.error('Error inviting user:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuarios de la organización
  public async getOrganizationUsers(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario pertenece a la organización
      const userRole = await database.get(
        `SELECT or_role.role
         FROM organization_roles or_role
         WHERE or_role.organization_id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a esta organización'
        });
      }

      const users = await database.query(
        `SELECT u.id, u.email, u.name, u.created_at, or_role.role, or_role.joined_at, or_role.permissions
         FROM users u
         JOIN organization_roles or_role ON u.id = or_role.user_id
         WHERE or_role.organization_id = $1
         ORDER BY or_role.joined_at ASC`,
        [id]
      );

      return res.json({
        success: true,
        data: users.rows,
        message: 'Usuarios obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting organization users:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Cambiar rol de usuario
  public async updateUserRole(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id, userId: targetUserId } = req.params;
      const { role, permissions = {} }: UpdateUserRoleRequest = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario es owner
      const userRole = await database.get(
        `SELECT or_role.role
         FROM organization_roles or_role
         WHERE or_role.organization_id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole || userRole.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Solo el owner puede cambiar roles'
        });
      }

      // Actualizar rol
      const result = await database.query(
        `UPDATE organization_roles 
         SET role = $1, permissions = $2, updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = $3 AND user_id = $4
         RETURNING *`,
        [role, JSON.stringify(permissions), id, targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado en la organización'
        });
      }

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Rol actualizado exitosamente'
      });

    } catch (error) {
      logger.error('Error updating user role:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar usuario de la organización
  public async removeUser(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id, userId: targetUserId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el usuario es owner o admin
      const userRole = await database.get(
        `SELECT or_role.role
         FROM organization_roles or_role
         WHERE or_role.organization_id = $1 AND or_role.user_id = $2`,
        [id, userId]
      );

      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar usuarios'
        });
      }

      // No permitir que el owner se elimine a sí mismo
      if (parseInt(targetUserId) === userId && userRole.role === 'owner') {
        return res.status(400).json({
          success: false,
          message: 'El owner no puede eliminarse a sí mismo'
        });
      }

      // Eliminar usuario
      const result = await database.query(
        'DELETE FROM organization_roles WHERE organization_id = $1 AND user_id = $2 RETURNING *',
        [id, targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado en la organización'
        });
      }

      logger.info(`👥 Usuario ${targetUserId} eliminado de organización ${id}`);

      return res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error removing user:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de la organización
  private async getOrganizationStats(organizationId: number) {
    try {
      const [whatsappSessions, contacts, messages, assistants, webConversations, webVisitors] = await Promise.all([
        database.get('SELECT COUNT(*) as count FROM whatsapp_sessions WHERE organization_id = $1', [organizationId]),
        database.get('SELECT COUNT(*) as count FROM contacts WHERE organization_id = $1', [organizationId]),
        database.get('SELECT COUNT(*) as count FROM messages WHERE organization_id = $1', [organizationId]),
        database.get('SELECT COUNT(*) as count FROM assistants WHERE organization_id = $1', [organizationId]),
        database.get('SELECT COUNT(*) as count FROM web_conversations WHERE organization_id = $1', [organizationId]),
        database.get('SELECT COUNT(*) as count FROM web_visitors WHERE organization_id = $1 AND is_online = true', [organizationId])
      ]);

      const activeWhatsappSessions = await database.get(
        'SELECT COUNT(*) as count FROM whatsapp_sessions WHERE organization_id = $1 AND is_connected = true',
        [organizationId]
      );

      return {
        total_users: 0, // Se calculará en la consulta principal
        total_whatsapp_sessions: parseInt(whatsappSessions?.count || '0'),
        total_contacts: parseInt(contacts?.count || '0'),
        total_messages: parseInt(messages?.count || '0'),
        total_assistants: parseInt(assistants?.count || '0'),
        total_web_conversations: parseInt(webConversations?.count || '0'),
        active_whatsapp_sessions: parseInt(activeWhatsappSessions?.count || '0'),
        online_visitors: parseInt(webVisitors?.count || '0')
      };
    } catch (error) {
      logger.error('Error getting organization stats:', error);
      return {
        total_users: 0,
        total_whatsapp_sessions: 0,
        total_contacts: 0,
        total_messages: 0,
        total_assistants: 0,
        total_web_conversations: 0,
        active_whatsapp_sessions: 0,
        online_visitors: 0
      };
    }
  }
}

export const organizationsController = new OrganizationsController();
