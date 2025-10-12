import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { ApiResponse } from '../types';

interface DashboardStats {
  assistants: {
    total: number;
    active: number;
    inactive: number;
  };
  conversations: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  contacts: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  templates: {
    total: number;
    active: number;
    categories: number;
  };
  tags: {
    total: number;
    active: number;
    conversations: number;
    contacts: number;
  };
  assignments: {
    total: number;
    autoAssigned: number;
    manualAssigned: number;
  };
}

export class DashboardController {
  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<DashboardStats>>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener estadísticas de asistentes
      const assistantsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active
        FROM assistants WHERE user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de conversaciones (basado en mensajes únicos por chat_id)
      const conversationsStats = await database.get(
        `SELECT 
          COUNT(DISTINCT chat_id) as total,
          COUNT(DISTINCT CASE WHEN DATE(created_at) = CURRENT_DATE THEN chat_id END) as today,
          COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN chat_id END) as thisWeek,
          COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN chat_id END) as thisMonth
        FROM messages WHERE user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de mensajes
      const messagesStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as thisWeek,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as thisMonth
        FROM messages WHERE user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de contactos
      const contactsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as newToday,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as newThisWeek,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as newThisMonth
        FROM contacts WHERE user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de plantillas
      const templatesStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN rt.is_active = true THEN 1 END) as active,
          COUNT(DISTINCT rt.category) as categories
        FROM response_templates rt
        JOIN assistants a ON rt.assistant_id = a.id
        WHERE a.user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de etiquetas
      const tagsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          (SELECT COUNT(DISTINCT conversation_id) FROM conversation_tags ct 
           JOIN tags t ON ct.tag_id = t.id WHERE t.user_id = $1) as conversations,
          (SELECT COUNT(DISTINCT contact_id) FROM contact_tags ct 
           JOIN tags t ON ct.tag_id = t.id WHERE t.user_id = $1) as contacts
        FROM tags WHERE user_id = $1`,
        [userId]
      );

      // Obtener estadísticas de asignaciones
      const assignmentsStats = await database.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN assignment_type = 'automatic' THEN 1 END) as autoAssigned
        FROM assistant_assignments aa
        JOIN assistants a ON aa.assistant_id = a.id
        WHERE a.user_id = $1`,
        [userId]
      );

      const stats: DashboardStats = {
        assistants: {
          total: parseInt(assistantsStats?.total || '0'),
          active: parseInt(assistantsStats?.active || '0'),
          inactive: parseInt(assistantsStats?.total || '0') - parseInt(assistantsStats?.active || '0')
        },
        conversations: {
          total: parseInt(conversationsStats?.total || '0'),
          today: parseInt(conversationsStats?.today || '0'),
          thisWeek: parseInt(conversationsStats?.thisWeek || '0'),
          thisMonth: parseInt(conversationsStats?.thisMonth || '0')
        },
        messages: {
          total: parseInt(messagesStats?.total || '0'),
          today: parseInt(messagesStats?.today || '0'),
          thisWeek: parseInt(messagesStats?.thisWeek || '0'),
          thisMonth: parseInt(messagesStats?.thisMonth || '0')
        },
        contacts: {
          total: parseInt(contactsStats?.total || '0'),
          newToday: parseInt(contactsStats?.newToday || '0'),
          newThisWeek: parseInt(contactsStats?.newThisWeek || '0'),
          newThisMonth: parseInt(contactsStats?.newThisMonth || '0')
        },
        templates: {
          total: parseInt(templatesStats?.total || '0'),
          active: parseInt(templatesStats?.active || '0'),
          categories: parseInt(templatesStats?.categories || '0')
        },
        tags: {
          total: parseInt(tagsStats?.total || '0'),
          active: parseInt(tagsStats?.active || '0'),
          conversations: parseInt(tagsStats?.conversations || '0'),
          contacts: parseInt(tagsStats?.contacts || '0')
        },
        assignments: {
          total: parseInt(assignmentsStats?.total || '0'),
          autoAssigned: parseInt(assignmentsStats?.autoAssigned || '0'),
          manualAssigned: parseInt(assignmentsStats?.total || '0') - parseInt(assignmentsStats?.autoAssigned || '0')
        }
      };

      return res.json({
        success: true,
        data: stats,
        message: 'Estadísticas del dashboard obtenidas exitosamente'
      });

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas del dashboard'
      });
    }
  }
}

export const dashboardController = new DashboardController();
