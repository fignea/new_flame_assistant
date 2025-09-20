import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender: 'user' | 'assistant' | 'agent';
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
  created_at: Date;
}

export class MessageModel {
  constructor(private db: Pool) {}

  async create(messageData: {
    conversation_id: string;
    content: string;
    sender: 'user' | 'assistant' | 'agent';
    type?: 'text' | 'image' | 'file' | 'audio' | 'video';
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    metadata?: Record<string, any>;
  }): Promise<Message> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO messages (id, conversation_id, content, sender, type, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      id,
      messageData.conversation_id,
      messageData.content,
      messageData.sender,
      messageData.type || 'text',
      messageData.status || 'sent',
      messageData.metadata ? JSON.stringify(messageData.metadata) : null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findByConversationId(conversationId: string, filters: {
    page?: number;
    limit?: number;
    sender?: string;
    type?: string;
  } = {}): Promise<{ messages: Message[]; total: number }> {
    const { page = 1, limit = 50, sender, type } = filters;
    const offset = (page - 1) * limit;

    const conditions = ['conversation_id = $1'];
    const values = [conversationId];
    let paramCount = 2;

    if (sender) {
      conditions.push(`sender = $${paramCount++}`);
      values.push(sender);
    }
    if (type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) FROM messages ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.count || '0');

    const query = `
      SELECT * FROM messages 
      ${whereClause}
      ORDER BY created_at ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    values.push(limit.toString(), offset.toString());
    const result = await this.db.query(query, values);

    // Parse metadata JSON
    const messages = result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));

    return { messages, total };
  }

  async findById(id: string): Promise<Message | null> {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0];
    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null
    };
  }

  async update(id: string, updates: {
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    metadata?: Record<string, any>;
  }): Promise<Message | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE messages 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0];
    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null
    };
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM messages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async markAsRead(conversationId: string, sender: 'user' | 'assistant' | 'agent'): Promise<boolean> {
    const query = `
      UPDATE messages 
      SET status = 'read'
      WHERE conversation_id = $1 AND sender = $2 AND status != 'read'
    `;
    
    const result = await this.db.query(query, [conversationId, sender]);
    return (result.rowCount || 0) > 0;
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [conversationId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0];
    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null
    };
  }

  async getMessageStats(conversationId: string): Promise<{
    total: number;
    by_sender: Record<string, number>;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        sender,
        type,
        status
      FROM messages 
      WHERE conversation_id = $1
      GROUP BY sender, type, status
    `;
    
    const result = await this.db.query(query, [conversationId]);
    
    const stats = {
      total: 0,
      by_sender: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      by_status: {} as Record<string, number>
    };

    result.rows.forEach(row => {
      const count = parseInt(row.total);
      stats.total += count;
      
      stats.by_sender[row.sender] = (stats.by_sender[row.sender] || 0) + count;
      stats.by_type[row.type] = (stats.by_type[row.type] || 0) + count;
      stats.by_status[row.status] = (stats.by_status[row.status] || 0) + count;
    });

    return stats;
  }
}
