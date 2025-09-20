import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  constructor(private db: Pool) {}

  async create(userData: {
    email: string;
    password: string;
    name: string;
    avatar_url?: string;
    role?: string;
  }): Promise<User> {
    const id = uuidv4();
    const password_hash = await bcrypt.hash(userData.password, 12);
    
    const query = `
      INSERT INTO users (id, email, password_hash, name, avatar_url, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      id,
      userData.email,
      password_hash,
      userData.name,
      userData.avatar_url || null,
      userData.role || 'user'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await this.db.query(query, [email]);
    return result.rows[0] || null;
  }

  async update(id: string, updates: {
    name?: string;
    avatar_url?: string;
    email?: string;
  }): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatar_url);
    }
    if (updates.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const password_hash = await bcrypt.hash(newPassword, 12);
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    
    const result = await this.db.query(query, [password_hash, id]);
    return (result.rowCount || 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async getAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10, search } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    const values = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    values.push(limit, offset);
    const result = await this.db.query(query, values);

    return { users: result.rows, total };
  }
}
