import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { database } from '../config/database';

export class ConfigController {
  public async getProfile(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const user = await database.get(
        'SELECT id, email, name, created_at FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.tenant?.id]
      );

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
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el perfil'
      });
    }
  }

  public async updateProfile(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { name, email } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!name && !email) {
        return res.status(400).json({
          success: false,
          message: 'Al menos un campo debe ser proporcionado'
        });
      }

      // Verificar si el email ya existe (si se está actualizando)
      if (email) {
        const existingUser = await database.get(
          'SELECT id FROM users WHERE email = $1 AND id != $2 AND tenant_id = $3',
          [email, userId, req.tenant?.id]
        );

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'El email ya está en uso'
          });
        }
      }

      // Construir query de actualización
      const updates: string[] = [];
      const params: any[] = [];

      if (name) {
        updates.push(`name = $${params.length + 1}`);
        params.push(name);
      }
      if (email) {
        updates.push(`email = $${params.length + 1}`);
        params.push(email);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId, req.tenant?.id);

      await database.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`,
        params
      );

      // Obtener el usuario actualizado
      const updatedUser = await database.get(
        'SELECT id, email, name, created_at FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.tenant?.id]
      );

      return res.json({
        success: true,
        data: updatedUser,
        message: 'Perfil actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el perfil'
      });
    }
  }

  public async changePassword(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva contraseña son requeridas'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      // Obtener usuario con contraseña
      const user = await database.get(
        'SELECT password FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.tenant?.id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña actual
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await database.run(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
        [hashedPassword, userId, req.tenant?.id]
      );

      return res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar la contraseña'
      });
    }
  }

  public async getSystemInfo(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener estadísticas del sistema
      const stats = {
        totalUsers: 0,
        totalContacts: 0,
        totalMessages: 0,
        totalScheduledMessages: 0,
        totalAssistants: 0,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      };

      // Contar usuarios del tenant
      const usersCount = await database.get('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [req.tenant?.id]);
      stats.totalUsers = usersCount?.count || 0;

      // Contar contactos
      const contactsCount = await database.get('SELECT COUNT(*) as count FROM contacts WHERE tenant_id = $1', [req.tenant?.id]);
      stats.totalContacts = contactsCount?.count || 0;

      // Contar mensajes
      const messagesCount = await database.get('SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1', [req.tenant?.id]);
      stats.totalMessages = messagesCount?.count || 0;

      // Contar programación
      const scheduledCount = await database.get('SELECT COUNT(*) as count FROM scheduled_messages WHERE tenant_id = $1', [req.tenant?.id]);
      stats.totalScheduledMessages = scheduledCount?.count || 0;

      // Contar asistentes
      const assistantsCount = await database.get('SELECT COUNT(*) as count FROM assistants WHERE tenant_id = $1', [req.tenant?.id]);
      stats.totalAssistants = assistantsCount?.count || 0;

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get system info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del sistema'
      });
    }
  }

  public async getDatabaseStatus(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar conexión a la base de datos
      const testQuery = await database.get('SELECT 1 as test');
      
      const status = {
        connected: !!testQuery,
        type: 'PostgreSQL',
        version: '15',
        lastCheck: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Get database status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar el estado de la base de datos',
        data: {
          connected: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      });
    }
  }
}

export const configController = new ConfigController();
