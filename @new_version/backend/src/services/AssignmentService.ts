import { database } from '../config/database';
import { AssistantAssignment, AssignmentStats } from '../types';

export class AssignmentService {
  /**
   * Asignar un asistente a una conversación
   */
  static async assignAssistant(
    assistantId: number,
    conversationId: string,
    platform: 'whatsapp' | 'web' | 'facebook' | 'instagram' | 'telegram',
    userId: number
  ): Promise<AssistantAssignment> {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await database.get(
        'SELECT id FROM assistants WHERE id = $1 AND user_id = $2',
        [assistantId, userId]
      );

      if (!assistant) {
        throw new Error('Asistente no encontrado o no autorizado');
      }

      // Desactivar asignaciones anteriores para esta conversación
      await database.run(
        'UPDATE assistant_assignments SET is_active = false WHERE conversation_id = $1 AND platform = $2',
        [conversationId, platform]
      );

      // Crear nueva asignación
      await database.run(
        `INSERT INTO assistant_assignments 
         (assistant_id, conversation_id, platform, assigned_at, is_active) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true)`,
        [assistantId, conversationId, platform]
      );

      // Obtener la asignación creada
      const result = await database.get(
        `SELECT * FROM assistant_assignments 
         WHERE assistant_id = $1 AND conversation_id = $2 AND platform = $3 
         ORDER BY assigned_at DESC LIMIT 1`,
        [assistantId, conversationId, platform]
      );

      return result;
    } catch (error) {
      console.error('Error asignando asistente:', error);
      throw error;
    }
  }

  /**
   * Obtener asistente asignado a una conversación
   */
  static async getAssignedAssistant(
    conversationId: string,
    platform: string,
    userId: number
  ): Promise<AssistantAssignment | null> {
    try {
      const assignment = await database.get(
        `SELECT aa.*, a.name as assistant_name, a.is_active as assistant_active
         FROM assistant_assignments aa
         JOIN assistants a ON aa.assistant_id = a.id
         WHERE aa.conversation_id = $1 
         AND aa.platform = $2 
         AND aa.is_active = true
         AND a.user_id = $3`,
        [conversationId, platform, userId]
      );

      return assignment || null;
    } catch (error) {
      console.error('Error obteniendo asistente asignado:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las asignaciones de un usuario
   */
  static async getUserAssignments(userId: number): Promise<AssistantAssignment[]> {
    try {
      const assignments = await database.all(
        `SELECT aa.*, a.name as assistant_name, a.is_active as assistant_active
         FROM assistant_assignments aa
         JOIN assistants a ON aa.assistant_id = a.id
         WHERE a.user_id = $1
         ORDER BY aa.assigned_at DESC`,
        [userId]
      );

      return assignments;
    } catch (error) {
      console.error('Error obteniendo asignaciones del usuario:', error);
      throw error;
    }
  }

  /**
   * Desasignar asistente de una conversación
   */
  static async unassignAssistant(
    conversationId: string,
    platform: string,
    userId: number
  ): Promise<boolean> {
    try {
      const result = await database.run(
        `UPDATE assistant_assignments 
         SET is_active = false 
         WHERE conversation_id = $1 
         AND platform = $2
         AND assistant_id IN (
           SELECT id FROM assistants WHERE user_id = $3
         )`,
        [conversationId, platform, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error desasignando asistente:', error);
      throw error;
    }
  }

  /**
   * Asignación automática basada en reglas
   */
  static async autoAssignAssistant(
    conversationId: string,
    platform: string,
    userId: number,
    contactId?: number
  ): Promise<AssistantAssignment | null> {
    try {
      // Buscar asistentes con auto_assign habilitado
      const assistants = await database.all(
        `SELECT * FROM assistants 
         WHERE user_id = $1 
         AND is_active = true 
         AND auto_assign = true
         ORDER BY created_at ASC`,
        [userId]
      );

      if (assistants.length === 0) {
        return null;
      }

      // Lógica simple: asignar el primer asistente disponible
      // En el futuro se puede mejorar con reglas más complejas
      const assistant = assistants[0];

      return await this.assignAssistant(
        assistant.id,
        conversationId,
        platform as any,
        userId
      );
    } catch (error) {
      console.error('Error en asignación automática:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de asignaciones
   */
  static async getAssignmentStats(userId: number): Promise<AssignmentStats> {
    try {
      // Obtener estadísticas básicas de asignaciones
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_assignments,
           COUNT(CASE WHEN aa.is_active = true THEN 1 END) as active_assignments,
           COUNT(CASE WHEN aa.platform = 'whatsapp' THEN 1 END) as whatsapp_assignments,
           COUNT(CASE WHEN aa.platform = 'web' THEN 1 END) as web_assignments,
           COUNT(CASE WHEN aa.assigned_at >= CURRENT_DATE THEN 1 END) as today_assignments
         FROM assistant_assignments aa
         JOIN assistants a ON aa.assistant_id = a.id
         WHERE a.user_id = $1`,
        [userId]
      );

      return {
        total_assignments: parseInt(stats?.total_assignments) || 0,
        active_assignments: parseInt(stats?.active_assignments) || 0,
        whatsapp_assignments: parseInt(stats?.whatsapp_assignments) || 0,
        web_assignments: parseInt(stats?.web_assignments) || 0,
        today_assignments: parseInt(stats?.today_assignments) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de asignaciones:', error);
      // Retornar estadísticas por defecto en caso de error
      return {
        total_assignments: 0,
        active_assignments: 0,
        whatsapp_assignments: 0,
        web_assignments: 0,
        today_assignments: 0
      };
    }
  }

  /**
   * Obtener conversaciones por asistente
   */
  static async getConversationsByAssistant(
    assistantId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<AssistantAssignment[]> {
    try {
      const assignments = await database.all(
        `SELECT aa.*, a.name as assistant_name
         FROM assistant_assignments aa
         JOIN assistants a ON aa.assistant_id = a.id
         WHERE aa.assistant_id = $1 
         AND a.user_id = $2
         ORDER BY aa.assigned_at DESC
         LIMIT $3 OFFSET $4`,
        [assistantId, userId, limit, offset]
      );

      return assignments;
    } catch (error) {
      console.error('Error obteniendo conversaciones por asistente:', error);
      throw error;
    }
  }

  /**
   * Verificar si una conversación tiene asistente asignado
   */
  static async hasAssignedAssistant(
    conversationId: string,
    platform: string,
    userId: number
  ): Promise<boolean> {
    try {
      const assignment = await database.get(
        `SELECT 1 FROM assistant_assignments aa
         JOIN assistants a ON aa.assistant_id = a.id
         WHERE aa.conversation_id = $1 
         AND aa.platform = $2 
         AND aa.is_active = true
         AND a.user_id = $3`,
        [conversationId, platform, userId]
      );

      return !!assignment;
    } catch (error) {
      console.error('Error verificando asignación:', error);
      throw error;
    }
  }
}
