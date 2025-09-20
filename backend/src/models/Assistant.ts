import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'auto' | 'ai';
  status: 'active' | 'inactive' | 'training';
  auto_response?: string;
  ai_prompt?: string;
  created_at: Date;
  updated_at: Date;
}

export class AssistantModel {
  constructor(private db: Pool) {}

  async create(assistantData: {
    user_id: string;
    name: string;
    description?: string;
    type: 'auto' | 'ai';
    auto_response?: string;
    ai_prompt?: string;
  }): Promise<Assistant> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO assistants (id, user_id, name, description, type, auto_response, ai_prompt)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      id,
      assistantData.user_id,
      assistantData.name,
      assistantData.description || null,
      assistantData.type,
      assistantData.auto_response || null,
      assistantData.ai_prompt || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Assistant | null> {
    const query = 'SELECT * FROM assistants WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Assistant[]> {
    const query = 'SELECT * FROM assistants WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async update(id: string, updates: {
    name?: string;
    description?: string;
    type?: 'auto' | 'ai';
    status?: 'active' | 'inactive' | 'training';
    auto_response?: string;
    ai_prompt?: string;
  }): Promise<Assistant | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.type) {
      fields.push(`type = $${paramCount++}`);
      values.push(updates.type);
    }
    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.auto_response !== undefined) {
      fields.push(`auto_response = $${paramCount++}`);
      values.push(updates.auto_response);
    }
    if (updates.ai_prompt !== undefined) {
      fields.push(`ai_prompt = $${paramCount++}`);
      values.push(updates.ai_prompt);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE assistants 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM assistants WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getAll(filters: {
    user_id?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ assistants: Assistant[]; total: number }> {
    const { user_id, status, type, page = 1, limit = 10, search } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (user_id) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(user_id);
    }
    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM assistants ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM assistants 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    values.push(limit, offset);
    const result = await this.db.query(query, values);

    return { assistants: result.rows, total };
  }
}
