import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse, DashboardStats } from '../types';


export class DashboardController {
  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<DashboardStats>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener información del tenant
      const tenant = await database.get(
        'SELECT name, plan_type, status FROM tenants WHERE id = $1',
        [tenantId]
      );

      // Obtener estadísticas de asistentes
      const assistantsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
        FROM assistants WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId]
      );

      // Obtener estadísticas de conversaciones
      const conversationsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as thisWeek,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as thisMonth
        FROM conversations WHERE tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de mensajes
      const messagesStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as thisWeek,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as thisMonth
        FROM messages WHERE tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de contactos
      const contactsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as newToday,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as newThisWeek,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as newThisMonth
        FROM contacts WHERE tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de plantillas
      const templatesStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(DISTINCT category) as categories
        FROM response_templates WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId]
      );

      // Obtener estadísticas de etiquetas
      const tagsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active
        FROM tags WHERE tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de etiquetas en conversaciones
      const conversationTagsStats = await database.get(
        `SELECT COUNT(*) as conversations
        FROM conversation_tags ct
        JOIN conversations c ON ct.conversation_id = c.id
        WHERE c.tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de etiquetas en contactos
      const contactTagsStats = await database.get(
        `SELECT COUNT(*) as contacts
        FROM contact_tags ct
        JOIN contacts c ON ct.contact_id = c.id
        WHERE c.tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas de asignaciones
      const assignmentsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN assignment_type = 'automatic' THEN 1 END) as autoAssigned,
          COUNT(CASE WHEN assignment_type = 'manual' THEN 1 END) as manualAssigned
        FROM assistant_assignments WHERE tenant_id = $1`,
        [tenantId]
      );

      const stats: DashboardStats = {
        tenant_id: tenantId,
        tenant_name: tenant?.name || 'Unknown',
        plan_type: tenant?.plan_type || 'starter',
        tenant_status: tenant?.status || 'active',
        total_users: 1, // Por ahora hardcodeado, se puede implementar después
        total_contacts: contactsStats?.total || 0,
        total_conversations: conversationsStats?.total || 0,
        total_messages: messagesStats?.total || 0,
        active_conversations: conversationsStats?.active || 0,
        messages_today: messagesStats?.today || 0,
        avg_resolution_time: conversationsStats?.avg_resolution_time,
        avg_satisfaction_score: conversationsStats?.avg_satisfaction_score
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del dashboard'
      });
    }
  }

  public async getRecentActivity(req: AuthenticatedRequest, res: Response<ApiResponse<any[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener actividad reciente (últimos mensajes, conversaciones, etc.)
      const recentMessages = await database.all(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          m.sender_type,
          c.title as conversation_title,
          ct.name as contact_name,
          a.name as assistant_name
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN assistants a ON m.assistant_id = a.id
        WHERE m.tenant_id = $1
        ORDER BY m.created_at DESC
        LIMIT 20
      `, [tenantId]);

      return res.json({
        success: true,
        data: recentMessages
      });

    } catch (error) {
      console.error('Recent activity error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo actividad reciente'
      });
    }
  }

  public async getPerformanceMetrics(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener métricas de rendimiento
      const avgResponseTime = await database.get(`
        SELECT AVG(resolution_time) as avg_time
        FROM conversations 
        WHERE tenant_id = $1 AND resolution_time IS NOT NULL
      `, [tenantId]);

      const satisfactionScore = await database.get(`
        SELECT AVG(satisfaction_score) as avg_score
        FROM conversations 
        WHERE tenant_id = $1 AND satisfaction_score IS NOT NULL
      `, [tenantId]);

      const autoResponseRate = await database.get(`
        SELECT 
          COUNT(CASE WHEN is_auto_response = true THEN 1 END) as auto_responses,
          COUNT(*) as total_messages
        FROM messages 
        WHERE tenant_id = $1
      `, [tenantId]);

      const metrics = {
        avg_response_time: avgResponseTime?.avg_time || 0,
        satisfaction_score: satisfactionScore?.avg_score || 0,
        auto_response_rate: autoResponseRate?.total_messages > 0 
          ? (autoResponseRate.auto_responses / autoResponseRate.total_messages) * 100 
          : 0
      };

      return res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Performance metrics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de rendimiento'
      });
    }
  }

  public async getTenantInfo(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener información del tenant
      const tenant = await database.get(`
        SELECT 
          id, slug, name, plan_type, status, settings, limits,
          created_at, updated_at
        FROM tenants 
        WHERE id = $1
      `, [tenantId]);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant no encontrado'
        });
      }

      // Obtener estadísticas de uso
      const usage = await database.get(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND deleted_at IS NULL) as users_count,
          (SELECT COUNT(*) FROM contacts WHERE tenant_id = $1) as contacts_count,
          (SELECT COUNT(*) FROM conversations WHERE tenant_id = $1) as conversations_count,
          (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.tenant_id = $1) as messages_count
      `, [tenantId]);

      const tenantInfo = {
        ...tenant,
        usage: {
          users: usage?.users_count || 0,
          contacts: usage?.contacts_count || 0,
          conversations: usage?.conversations_count || 0,
          messages: usage?.messages_count || 0
        }
      };

      return res.json({
        success: true,
        data: tenantInfo
      });

    } catch (error) {
      console.error('Tenant info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo información del tenant'
      });
    }
  }
}

// Exportar instancia del controlador
export const dashboardController = new DashboardController();