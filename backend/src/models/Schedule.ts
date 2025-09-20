import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Schedule {
  id: string;
  assistant_id: string;
  day_of_week: number; // 0-6 (Domingo-Sábado)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  enabled: boolean;
  created_at: Date;
}

export class ScheduleModel {
  constructor(private db: Pool) {}

  async create(scheduleData: {
    assistant_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    enabled?: boolean;
  }): Promise<Schedule> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO schedules (id, assistant_id, day_of_week, start_time, end_time, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      id,
      scheduleData.assistant_id,
      scheduleData.day_of_week,
      scheduleData.start_time,
      scheduleData.end_time,
      scheduleData.enabled !== undefined ? scheduleData.enabled : true
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Schedule | null> {
    const query = 'SELECT * FROM schedules WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByAssistantId(assistantId: string): Promise<Schedule[]> {
    const query = 'SELECT * FROM schedules WHERE assistant_id = $1 ORDER BY day_of_week, start_time';
    const result = await this.db.query(query, [assistantId]);
    return result.rows;
  }

  async update(id: string, updates: {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    enabled?: boolean;
  }): Promise<Schedule | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.day_of_week !== undefined) {
      fields.push(`day_of_week = $${paramCount++}`);
      values.push(updates.day_of_week);
    }
    if (updates.start_time) {
      fields.push(`start_time = $${paramCount++}`);
      values.push(updates.start_time);
    }
    if (updates.end_time) {
      fields.push(`end_time = $${paramCount++}`);
      values.push(updates.end_time);
    }
    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramCount++}`);
      values.push(updates.enabled);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE schedules 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM schedules WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async deleteByAssistantId(assistantId: string): Promise<boolean> {
    const query = 'DELETE FROM schedules WHERE assistant_id = $1';
    const result = await this.db.query(query, [assistantId]);
    return (result.rowCount || 0) > 0;
  }

  async isAssistantActive(assistantId: string, dayOfWeek: number, currentTime: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM schedules 
      WHERE assistant_id = $1 
        AND day_of_week = $2 
        AND enabled = true
        AND start_time <= $3 
        AND end_time > $3
    `;
    
    const result = await this.db.query(query, [assistantId, dayOfWeek, currentTime]);
    return parseInt(result.rows[0].count) > 0;
  }

  async getActiveSchedules(assistantId: string): Promise<Schedule[]> {
    const query = `
      SELECT * FROM schedules 
      WHERE assistant_id = $1 AND enabled = true
      ORDER BY day_of_week, start_time
    `;
    
    const result = await this.db.query(query, [assistantId]);
    return result.rows;
  }

  async getScheduleByDay(assistantId: string, dayOfWeek: number): Promise<Schedule[]> {
    const query = `
      SELECT * FROM schedules 
      WHERE assistant_id = $1 AND day_of_week = $2
      ORDER BY start_time
    `;
    
    const result = await this.db.query(query, [assistantId, dayOfWeek]);
    return result.rows;
  }
}
