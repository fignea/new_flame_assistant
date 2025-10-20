import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse, DashboardStats, DashboardStatsTransformed } from '../types';


export class DashboardController {
  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<DashboardStatsTransformed>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Usar la vista materializada para obtener estadísticas
      const stats = await database.get(
        `SELECT 
          tenant_id,
          tenant_name,
          plan_type,
          tenant_status,
          total_users,
          total_contacts,
          total_conversations,
          total_messages,
          active_conversations,
          messages_today,
          avg_resolution_time,
          avg_satisfaction_score
        FROM dashboard_stats 
        WHERE tenant_id = $1`,
        [tenantId]
      );

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Estadísticas no encontradas'
        });
      }

      // Transformar los datos para que coincidan con la estructura esperada por el frontend
      const transformedStats = {
        assistants: {
          total: 0, // Se calculará por separado
          active: 0,
          inactive: 0
        },
        conversations: {
          total: parseInt(stats.total_conversations) || 0,
          today: parseInt(stats.messages_today) || 0,
          thisWeek: 0, // Se calculará por separado
          thisMonth: 0 // Se calculará por separado
        },
        messages: {
          total: parseInt(stats.total_messages) || 0,
          today: parseInt(stats.messages_today) || 0,
          thisWeek: 0, // Se calculará por separado
          thisMonth: 0 // Se calculará por separado
        },
        contacts: {
          total: parseInt(stats.total_contacts) || 0,
          newToday: 0, // Se calculará por separado
          newThisWeek: 0, // Se calculará por separado
          newThisMonth: 0 // Se calculará por separado
        },
        templates: {
          total: 0, // Se calculará por separado
          active: 0,
          categories: 0
        },
        tags: {
          total: 0, // Se calculará por separado
          active: 0,
          conversations: 0
        },
        performance: {
          avgResponseTime: stats.avg_resolution_time || 0,
          satisfactionScore: stats.avg_satisfaction_score || 0,
          activeConversations: parseInt(stats.active_conversations) || 0
        },
        tenant: {
          id: stats.tenant_id,
          name: stats.tenant_name,
          plan: stats.plan_type,
          status: stats.tenant_status
        }
      };

      return res.json({
        success: true,
        data: transformedStats
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