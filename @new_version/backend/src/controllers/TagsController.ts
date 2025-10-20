import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, Tag, PaginatedResponse } from '../types';
import { database } from '../config/database';

export class TagsController {
  public async getTags(req: AuthenticatedRequest, res: Response<PaginatedResponse<Tag>>) {
    try {
      const { page = 1, limit = 10, is_active } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      let whereClause = 'WHERE tenant_id = $1';
      const params: any[] = [req.tenant?.id];
      
      if (is_active !== undefined) {
        whereClause += ' AND is_active = $2';
        params.push(is_active === 'true');
      }

      const tags = await database.all(`
        SELECT id, name, color, description, is_active, created_at, updated_at
        FROM tags
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, Number(limit), offset]);

      const total = await database.get(`
        SELECT COUNT(*) as count
        FROM tags
        ${whereClause}
      `, params) as any;

      return res.json({
        success: true,
        data: tags,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.count,
          pages: Math.ceil(total.count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo tags',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    }
  }

  public async getTag(req: AuthenticatedRequest, res: Response<ApiResponse<Tag>>) {
    try {
      const { id } = req.params;
      
      const tag = await database.get(`
        SELECT id, name, color, description, is_active, created_at, updated_at
        FROM tags
        WHERE id = $1 AND tenant_id = $2
      `, [id, req.tenant?.id]);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag no encontrado'
        });
      }

      return res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Get tag error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo tag'
      });
    }
  }

  public async createTag(req: AuthenticatedRequest, res: Response<ApiResponse<Tag>>) {
    try {
      const { name, color, description } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del tag es requerido'
        });
      }

      const tag = await database.get(`
        INSERT INTO tags (tenant_id, name, color, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING id, name, color, description, is_active, created_at, updated_at
      `, [req.tenant?.id, name, color || '#3B82F6', description || '']);

      return res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Create tag error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando tag'
      });
    }
  }

  public async updateTag(req: AuthenticatedRequest, res: Response<ApiResponse<Tag>>) {
    try {
      const { id } = req.params;
      const { name, color, description, is_active } = req.body;
      
      const tag = await database.get(`
        UPDATE tags
        SET name = COALESCE($3, name),
            color = COALESCE($4, color),
            description = COALESCE($5, description),
            is_active = COALESCE($6, is_active),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, name, color, description, is_active, created_at, updated_at
      `, [id, req.tenant?.id, name, color, description, is_active]);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag no encontrado'
        });
      }

      return res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Update tag error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando tag'
      });
    }
  }

  public async deleteTag(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      
      const result = await database.run(`
        DELETE FROM tags
        WHERE id = $1 AND tenant_id = $2
      `, [id, req.tenant?.id]);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tag no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { deleted: true }
      });
    } catch (error) {
      console.error('Delete tag error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando tag'
      });
    }
  }

  public async addTagToConversation(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { id: tagId, conversationId } = req.params;
      
      await database.run(`
        INSERT INTO conversation_tags (conversation_id, tag_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (conversation_id, tag_id) DO NOTHING
      `, [conversationId, tagId]);

      return res.json({
        success: true,
        data: { added: true }
      });
    } catch (error) {
      console.error('Add tag to conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error agregando tag a conversación'
      });
    }
  }

  public async removeTagFromConversation(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { id: tagId, conversationId } = req.params;
      
      const result = await database.run(`
        DELETE FROM conversation_tags
        WHERE conversation_id = $1 AND tag_id = $2
      `, [conversationId, tagId]);

      return res.json({
        success: true,
        data: { removed: result.changes > 0 }
      });
    } catch (error) {
      console.error('Remove tag from conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error removiendo tag de conversación'
      });
    }
  }
}

export const tagsController = new TagsController();
