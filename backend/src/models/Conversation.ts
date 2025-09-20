import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Conversation {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  status: 'active' | 'pending' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_assistant_id?: string;
  last_message?: string;
  last_message_time?: Date;
  unread_count: number;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export class ConversationModel {
  constructor(private db: Pool) {}

  async create(conversationData: {
    user_id: string;
    contact_name: string;
    contact_phone?: string;
    contact_email?: string;
    platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_assistant_id?: string;
    tags?: string[];
  }): Promise<Conversation> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO conversations (
        id, user_id, contact_name, contact_phone, contact_email, 
        platform, priority, assigned_assistant_id, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      conversationData.user_id,
      conversationData.contact_name,
      conversationData.contact_phone || null,
      conversationData.contact_email || null,
      conversationData.platform,
      conversationData.priority || 'medium',
      conversationData.assigned_assistant_id || null,
      conversationData.tags || []
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Conversation | null> {
    const query = 'SELECT * FROM conversations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string, filters: {
    status?: string;
    platform?: string;
    priority?: string;
    assigned_assistant_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ conversations: Conversation[]; total: number }> {
    const { status, platform, priority, assigned_assistant_id, search, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const values = [userId];
    let paramCount = 2;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (platform) {
      conditions.push(`platform = $${paramCount++}`);
      values.push(platform);
    }
    if (priority) {
      conditions.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (assigned_assistant_id) {
      conditions.push(`assigned_assistant_id = $${paramCount++}`);
      values.push(assigned_assistant_id);
    }
    if (search) {
      conditions.push(`(contact_name ILIKE $${paramCount} OR contact_phone ILIKE $${paramCount} OR contact_email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) FROM conversations ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.count || '0');

    const query = `
      SELECT * FROM conversations 
      ${whereClause}
      ORDER BY last_message_time DESC NULLS LAST, created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    values.push(limit.toString(), offset.toString());
    const result = await this.db.query(query, values);

    return { conversations: result.rows, total };
  }

  async update(id: string, updates: {
    status?: 'active' | 'pending' | 'resolved' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_assistant_id?: string;
    tags?: string[];
    last_message?: string;
    last_message_time?: Date;
    unread_count?: number;
  }): Promise<Conversation | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.priority) {
      fields.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }
    if (updates.assigned_assistant_id !== undefined) {
      fields.push(`assigned_assistant_id = $${paramCount++}`);
      values.push(updates.assigned_assistant_id);
    }
    if (updates.tags) {
      fields.push(`tags = $${paramCount++}`);
      values.push(updates.tags);
    }
    if (updates.last_message !== undefined) {
      fields.push(`last_message = $${paramCount++}`);
      values.push(updates.last_message);
    }
    if (updates.last_message_time) {
      fields.push(`last_message_time = $${paramCount++}`);
      values.push(updates.last_message_time);
    }
    if (updates.unread_count !== undefined) {
      fields.push(`unread_count = $${paramCount++}`);
      values.push(updates.unread_count);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE conversations 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM conversations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async incrementUnreadCount(id: string): Promise<boolean> {
    const query = `
      UPDATE conversations 
      SET unread_count = unread_count + 1, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async resetUnreadCount(id: string): Promise<boolean> {
    const query = `
      UPDATE conversations 
      SET unread_count = 0, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const query = `
      SELECT SUM(unread_count) as total 
      FROM conversations 
      WHERE user_id = $1 AND status IN ('active', 'pending')
    `;
    
    const result = await this.db.query(query, [userId]);
    return parseInt(result.rows[0]?.total || '0') || 0;
  }
}
