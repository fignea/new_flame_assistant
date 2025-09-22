import { pool } from '../config/database.config';
import { logger } from '../utils/logger';

export interface WhatsAppSessionData {
  id: string;
  userId: string;
  sessionId: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppSessionModel {
  // Crear una nueva sesión
  static async create(sessionData: Omit<WhatsAppSessionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhatsAppSessionData> {
    const query = `
      INSERT INTO whatsapp_sessions (
        user_id, session_id, qr_code, is_connected, is_authenticated,
        phone_number, user_name, last_seen, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id, session_id, qr_code, is_connected, is_authenticated,
                phone_number, user_name, last_seen, expires_at, created_at, updated_at
    `;

    const values = [
      sessionData.userId,
      sessionData.sessionId,
      sessionData.qrCode || null,
      sessionData.isConnected,
      sessionData.isAuthenticated,
      sessionData.phoneNumber || null,
      sessionData.userName || null,
      sessionData.lastSeen || null,
      sessionData.expiresAt || null
    ];

    try {
      const result = await pool.query(query, values);
      const session = result.rows[0];
      
      return {
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      logger.error('Error creating WhatsApp session:', error);
      throw error;
    }
  }

  // Obtener sesión por ID
  static async getById(id: string): Promise<WhatsAppSessionData | null> {
    const query = `
      SELECT id, user_id, session_id, qr_code, is_connected, is_authenticated,
             phone_number, user_name, last_seen, expires_at, created_at, updated_at
      FROM whatsapp_sessions
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      logger.error('Error getting WhatsApp session by ID:', error);
      throw error;
    }
  }

  // Obtener sesión por sessionId
  static async getBySessionId(sessionId: string): Promise<WhatsAppSessionData | null> {
    const query = `
      SELECT id, user_id, session_id, qr_code, is_connected, is_authenticated,
             phone_number, user_name, last_seen, expires_at, created_at, updated_at
      FROM whatsapp_sessions
      WHERE session_id = $1
    `;

    try {
      const result = await pool.query(query, [sessionId]);
      if (result.rows.length === 0) return null;

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      logger.error('Error getting WhatsApp session by sessionId:', error);
      throw error;
    }
  }

  // Obtener sesión por userId
  static async getByUserId(userId: string): Promise<WhatsAppSessionData | null> {
    const query = `
      SELECT id, user_id, session_id, qr_code, is_connected, is_authenticated,
             phone_number, user_name, last_seen, expires_at, created_at, updated_at
      FROM whatsapp_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [userId]);
      if (result.rows.length === 0) return null;

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      logger.error('Error getting WhatsApp session by userId:', error);
      throw error;
    }
  }

  // Actualizar sesión
  static async update(id: string, updates: Partial<Omit<WhatsAppSessionData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<WhatsAppSessionData | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE whatsapp_sessions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, session_id, qr_code, is_connected, is_authenticated,
                phone_number, user_name, last_seen, expires_at, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return null;

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      logger.error('Error updating WhatsApp session:', error);
      throw error;
    }
  }

  // Eliminar sesión
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM whatsapp_sessions WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error deleting WhatsApp session:', error);
      throw error;
    }
  }

  // Eliminar sesión por sessionId
  static async deleteBySessionId(sessionId: string): Promise<boolean> {
    const query = 'DELETE FROM whatsapp_sessions WHERE session_id = $1';
    
    try {
      const result = await pool.query(query, [sessionId]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error deleting WhatsApp session by sessionId:', error);
      throw error;
    }
  }

  // Obtener todas las sesiones activas
  static async getActiveSessions(): Promise<WhatsAppSessionData[]> {
    const query = `
      SELECT id, user_id, session_id, qr_code, is_connected, is_authenticated,
             phone_number, user_name, last_seen, expires_at, created_at, updated_at
      FROM whatsapp_sessions
      WHERE is_connected = true AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY updated_at DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map(session => ({
        id: session.id,
        userId: session.user_id,
        sessionId: session.session_id,
        qrCode: session.qr_code,
        isConnected: session.is_connected,
        isAuthenticated: session.is_authenticated,
        phoneNumber: session.phone_number,
        userName: session.user_name,
        lastSeen: session.last_seen,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }));
    } catch (error) {
      logger.error('Error getting active WhatsApp sessions:', error);
      throw error;
    }
  }

  // Limpiar sesiones expiradas
  static async cleanupExpiredSessions(): Promise<number> {
    const query = `
      DELETE FROM whatsapp_sessions
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    try {
      const result = await pool.query(query);
      logger.info(`Cleaned up ${result.rowCount} expired WhatsApp sessions`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired WhatsApp sessions:', error);
      throw error;
    }
  }

  // Obtener estadísticas de sesiones
  static async getSessionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_connected = true AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END) as active,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired
      FROM whatsapp_sessions
    `;

    try {
      const result = await pool.query(query);
      const stats = result.rows[0];
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        expired: parseInt(stats.expired)
      };
    } catch (error) {
      logger.error('Error getting WhatsApp session stats:', error);
      throw error;
    }
  }
}
