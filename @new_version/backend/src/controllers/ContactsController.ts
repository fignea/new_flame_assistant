import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse } from '../types';

export interface Contact {
  id: string;
  tenant_id: string;
  external_id: string;
  platform: string;
  name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_group: boolean;
  is_blocked: boolean;
  metadata?: any;
  tags: string[];
  custom_fields?: any;
  last_interaction_at?: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export class ContactsController {
  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse<Contact[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { page = 1, limit = 50, search, platform, is_group, is_blocked } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let whereConditions = ['tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      if (search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (platform) {
        whereConditions.push(`platform = $${paramIndex}`);
        params.push(platform);
        paramIndex++;
      }

      if (is_group !== undefined) {
        whereConditions.push(`is_group = $${paramIndex}`);
        params.push(is_group === 'true');
        paramIndex++;
      }

      if (is_blocked !== undefined) {
        whereConditions.push(`is_blocked = $${paramIndex}`);
        params.push(is_blocked === 'true');
        paramIndex++;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const contacts = await database.all(
        `SELECT 
          id, tenant_id, external_id, platform, name, phone, email, avatar_url,
          is_group, is_blocked, metadata, tags, custom_fields, last_interaction_at,
          interaction_count, created_at, updated_at
        FROM contacts 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY last_interaction_at DESC NULLS LAST, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
      );

      const total = await database.get(
        `SELECT COUNT(*) as count FROM contacts WHERE ${whereConditions.join(' AND ')}`,
        params
      );

      return res.json({
        success: true,
        data: contacts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total?.count || 0,
          pages: Math.ceil((total?.count || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo contactos'
      });
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse<Contact>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const contact = await database.get(
        `SELECT 
          id, tenant_id, external_id, platform, name, phone, email, avatar_url,
          is_group, is_blocked, metadata, tags, custom_fields, last_interaction_at,
          interaction_count, created_at, updated_at
        FROM contacts 
        WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: contact
      });

    } catch (error) {
      console.error('Get contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo contacto'
      });
    }
  }

  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<Contact>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const {
        external_id,
        platform,
        name,
        phone,
        email,
        avatar_url,
        is_group = false,
        is_blocked = false,
        metadata = {},
        tags = [],
        custom_fields = {}
      } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!external_id || !platform) {
        return res.status(400).json({
          success: false,
          message: 'external_id y platform son requeridos'
        });
      }

      const contact = await database.get(
        `INSERT INTO contacts (
          tenant_id, external_id, platform, name, phone, email, avatar_url,
          is_group, is_blocked, metadata, tags, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          tenantId, external_id, platform, name, phone, email, avatar_url,
          is_group, is_blocked, JSON.stringify(metadata), tags, JSON.stringify(custom_fields)
        ]
      );

      return res.status(201).json({
        success: true,
        data: contact
      });

    } catch (error) {
      console.error('Create contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando contacto'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<Contact>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      const updateData = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Construir query dinámicamente
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramIndex}`);
          if (key === 'metadata' || key === 'custom_fields') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      values.push(id, tenantId);
      const query = `
        UPDATE contacts 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const contact = await database.get(query, values);

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: contact
      });

    } catch (error) {
      console.error('Update contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando contacto'
      });
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response<ApiResponse<null>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const result = await database.run(
        `DELETE FROM contacts WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: 'Contacto eliminado correctamente'
      });

    } catch (error) {
      console.error('Delete contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando contacto'
      });
    }
  }

  public async block(req: AuthenticatedRequest, res: Response<ApiResponse<Contact>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const contact = await database.get(
        `UPDATE contacts 
        SET is_blocked = true, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
        [id, tenantId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: contact,
        message: 'Contacto bloqueado correctamente'
      });

    } catch (error) {
      console.error('Block contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error bloqueando contacto'
      });
    }
  }

  public async unblock(req: AuthenticatedRequest, res: Response<ApiResponse<Contact>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const contact = await database.get(
        `UPDATE contacts 
        SET is_blocked = false, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
        [id, tenantId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: contact,
        message: 'Contacto desbloqueado correctamente'
      });

    } catch (error) {
      console.error('Unblock contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error desbloqueando contacto'
      });
    }
  }

  public async search(req: AuthenticatedRequest, res: Response<ApiResponse<Contact[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { q, platform, limit = 20 } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Query de búsqueda es requerido'
        });
      }

      let whereConditions = ['tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      whereConditions.push(`(name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${q}%`);
      paramIndex++;

      if (platform) {
        whereConditions.push(`platform = $${paramIndex}`);
        params.push(platform);
        paramIndex++;
      }

      const contacts = await database.all(
        `SELECT 
          id, tenant_id, external_id, platform, name, phone, email, avatar_url,
          is_group, is_blocked, metadata, tags, custom_fields, last_interaction_at,
          interaction_count, created_at, updated_at
        FROM contacts 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY last_interaction_at DESC NULLS LAST, created_at DESC
        LIMIT $${paramIndex}`,
        [...params, Number(limit)]
      );

      return res.json({
        success: true,
        data: contacts
      });

    } catch (error) {
      console.error('Search contacts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error buscando contactos'
      });
    }
  }
}

export const contactsController = new ContactsController();
