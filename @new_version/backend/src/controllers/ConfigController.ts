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
        `SELECT 
          id, email, name, role, permissions, profile, preferences, 
          is_active, created_at, updated_at
        FROM users 
        WHERE id = $1 AND tenant_id = $2`,
        [userId, req.tenant?.id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener información del tenant
      const tenant = await database.get(
        `SELECT 
          id, slug, name, plan_type, status, settings, limits, 
          billing_info, created_at
        FROM tenants 
        WHERE id = $1`,
        [req.tenant?.id]
      );

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

      // Contar usuarios del tenant
      const usersCount = await database.get('SELECT COUNT(*)::integer as count FROM users WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar contactos
      const contactsCount = await database.get('SELECT COUNT(*)::integer as count FROM contacts WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar conversaciones
      const conversationsCount = await database.get('SELECT COUNT(*)::integer as count FROM conversations WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar mensajes
      const messagesCount = await database.get('SELECT COUNT(*)::integer as count FROM messages WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar programación
      const scheduledCount = await database.get('SELECT COUNT(*)::integer as count FROM scheduled_messages WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar asistentes
      const assistantsCount = await database.get('SELECT COUNT(*)::integer as count FROM assistants WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar plantillas
      const templatesCount = await database.get('SELECT COUNT(*)::integer as count FROM response_templates WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar tags
      const tagsCount = await database.get('SELECT COUNT(*)::integer as count FROM tags WHERE tenant_id = $1', [req.tenant?.id]);
      
      // Contar archivos multimedia
      const mediaCount = await database.get('SELECT COUNT(*)::integer as count FROM media_files WHERE tenant_id = $1', [req.tenant?.id]);

      // Obtener estadísticas del sistema
      const stats = {
        tenant: {
          totalUsers: usersCount?.count || 0,
          totalContacts: contactsCount?.count || 0,
          totalConversations: conversationsCount?.count || 0,
          totalMessages: messagesCount?.count || 0,
          totalScheduledMessages: scheduledCount?.count || 0,
          totalAssistants: assistantsCount?.count || 0,
          totalTemplates: templatesCount?.count || 0,
          totalTags: tagsCount?.count || 0,
          totalMediaFiles: mediaCount?.count || 0
        },
        system: {
          systemUptime: Math.floor(process.uptime()),
          memoryUsage: {
            rss: Math.floor(process.memoryUsage().rss / 1024 / 1024),
            heapTotal: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
            heapUsed: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
            external: Math.floor(process.memoryUsage().external / 1024 / 1024)
          },
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || 'development'
        }
      };

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
      
      // Obtener versión de PostgreSQL
      const versionQuery = await database.get('SELECT version()');
      const version = versionQuery?.version?.match(/PostgreSQL (\d+\.\d+)/)?.[1] || 'Unknown';
      
      // Obtener tamaño de la base de datos
      const sizeQuery = await database.get(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      // Obtener número de conexiones activas
      const connectionsQuery = await database.get(`
        SELECT count(*)::integer as count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      // Obtener estadísticas de tablas
      const tablesQuery = await database.all(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);
      
      const status = {
        connected: !!testQuery,
        type: 'PostgreSQL',
        version: version,
        size: sizeQuery?.size || 'Unknown',
        activeConnections: connectionsQuery?.count || 0,
        tables: tablesQuery || [],
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

  public async populateDemoData(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const tenantSlug = req.tenant?.slug;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Solo permitir para el tenant 'flame'
      if (tenantSlug !== 'flame') {
        return res.status(403).json({
          success: false,
          message: 'Esta función solo está disponible para la organización FLAME (demo)'
        });
      }

      // Verificar que el usuario sea owner o admin
      if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los propietarios y administradores pueden poblar datos de demo'
        });
      }

      // Leer y ejecutar el script SQL
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(process.cwd(), 'scripts', 'populate-demo-data.sql');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({
          success: false,
          message: 'Script de demo no encontrado'
        });
      }

      const sqlScript = fs.readFileSync(scriptPath, 'utf8');
      
      // Ejecutar el script
      await database.query(sqlScript);

      return res.json({
        success: true,
        message: 'Datos de demostración poblados exitosamente',
        data: {
          populated: true,
          tenant: tenantSlug
        }
      });

    } catch (error) {
      console.error('Populate demo data error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al poblar datos de demostración',
        data: {
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      });
    }
  }
}

export const configController = new ConfigController();

