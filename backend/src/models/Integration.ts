import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Integration {
  id: string;
  user_id: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  status: 'active' | 'inactive' | 'error';
  credentials: Record<string, any>;
  webhook_url?: string;
  last_sync?: Date;
  created_at: Date;
  updated_at: Date;
}

export class IntegrationModel {
  constructor(private db: Pool) {}

  async create(integrationData: {
    user_id: string;
    platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
    credentials: Record<string, any>;
    webhook_url?: string;
  }): Promise<Integration> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO integrations (id, user_id, platform, credentials, webhook_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      id,
      integrationData.user_id,
      integrationData.platform,
      JSON.stringify(integrationData.credentials),
      integrationData.webhook_url || null
    ];

    const result = await this.db.query(query, values);
    return {
      ...result.rows[0],
      credentials: JSON.parse(result.rows[0].credentials)
    };
  }

  async findById(id: string): Promise<Integration | null> {
    const query = 'SELECT * FROM integrations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      credentials: JSON.parse(result.rows[0].credentials)
    };
  }

  async findByUserId(userId: string): Promise<Integration[]> {
    const query = 'SELECT * FROM integrations WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [userId]);
    
    return result.rows.map(row => ({
      ...row,
      credentials: JSON.parse(row.credentials)
    }));
  }

  async findByPlatform(userId: string, platform: string): Promise<Integration | null> {
    const query = 'SELECT * FROM integrations WHERE user_id = $1 AND platform = $2';
    const result = await this.db.query(query, [userId, platform]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      credentials: JSON.parse(result.rows[0].credentials)
    };
  }

  async update(id: string, updates: {
    status?: 'active' | 'inactive' | 'error';
    credentials?: Record<string, any>;
    webhook_url?: string;
    last_sync?: Date;
  }): Promise<Integration | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.credentials) {
      fields.push(`credentials = $${paramCount++}`);
      values.push(JSON.stringify(updates.credentials));
    }
    if (updates.webhook_url !== undefined) {
      fields.push(`webhook_url = $${paramCount++}`);
      values.push(updates.webhook_url);
    }
    if (updates.last_sync) {
      fields.push(`last_sync = $${paramCount++}`);
      values.push(updates.last_sync);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE integrations 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      credentials: JSON.parse(result.rows[0].credentials)
    };
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM integrations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async updateStatus(id: string, status: 'active' | 'inactive' | 'error'): Promise<boolean> {
    const query = `
      UPDATE integrations 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    const result = await this.db.query(query, [status, id]);
    return (result.rowCount || 0) > 0;
  }

  async updateLastSync(id: string): Promise<boolean> {
    const query = `
      UPDATE integrations 
      SET last_sync = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getAll(filters: {
    user_id?: string;
    platform?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ integrations: Integration[]; total: number }> {
    const { user_id, platform, status, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (user_id) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(user_id);
    }
    if (platform) {
      conditions.push(`platform = $${paramCount++}`);
      values.push(platform);
    }
    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM integrations ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM integrations 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    values.push(limit, offset);
    const result = await this.db.query(query, values);

    const integrations = result.rows.map(row => ({
      ...row,
      credentials: JSON.parse(row.credentials)
    }));

    return { integrations, total };
  }
}
