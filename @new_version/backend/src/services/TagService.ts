import { database } from '../config/database';
import { Tag, ConversationTag, ContactTag } from '../types';

export class TagService {
  /**
   * Crear una nueva etiqueta
   */
  static async createTag(
    tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>,
    userId: number
  ): Promise<Tag> {
    try {
      // Verificar que no existe una etiqueta con el mismo nombre
      const existingTag = await database.get(
        'SELECT id FROM tags WHERE name = $1 AND user_id = $2',
        [tag.name, userId]
      );

      if (existingTag) {
        throw new Error('Ya existe una etiqueta con este nombre');
      }

      await database.run(
        `INSERT INTO tags (user_id, name, color, description, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, tag.name, tag.color, tag.description || null, tag.is_active !== undefined ? tag.is_active : true]
      );

      // Obtener la etiqueta creada
      const result = await database.get(
        `SELECT * FROM tags WHERE user_id = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1`,
        [userId, tag.name]
      );

      return result;
    } catch (error) {
      console.error('Error creando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las etiquetas de un usuario
   */
  static async getUserTags(userId: number, activeOnly: boolean = false): Promise<Tag[]> {
    try {
      let query = 'SELECT * FROM tags WHERE user_id = $1';
      const params: any[] = [userId];

      if (activeOnly) {
        query += ' AND is_active = true';
      }

      query += ' ORDER BY name ASC';

      const tags = await database.all(query, params);
      return tags;
    } catch (error) {
      console.error('Error obteniendo etiquetas del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener una etiqueta por ID
   */
  static async getTagById(tagId: number, userId: number): Promise<Tag | null> {
    try {
      const tag = await database.get(
        'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
      );

      return tag || null;
    } catch (error) {
      console.error('Error obteniendo etiqueta por ID:', error);
      throw error;
    }
  }

  /**
   * Actualizar una etiqueta
   */
  static async updateTag(
    tagId: number,
    updates: Partial<Tag>,
    userId: number
  ): Promise<Tag | null> {
    try {
      // Verificar que la etiqueta pertenece al usuario
      const existingTag = await database.get(
        'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
      );

      if (!existingTag) {
        throw new Error('Etiqueta no encontrada o no autorizada');
      }

      // Construir query dinámicamente
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.color !== undefined) {
        fields.push(`color = $${paramIndex++}`);
        values.push(updates.color);
      }

      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(tagId);

      const query = `
        UPDATE tags 
        SET ${fields.join(', ')} 
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(userId);

      await database.run(query, values);

      // Obtener la etiqueta actualizada
      const result = await database.get(
        `SELECT * FROM tags WHERE id = $1 AND user_id = $2`,
        [tagId, userId]
      );

      return result || null;
    } catch (error) {
      console.error('Error actualizando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Eliminar una etiqueta
   */
  static async deleteTag(tagId: number, userId: number): Promise<boolean> {
    try {
      // Primero eliminar todas las relaciones
      await database.run(
        'DELETE FROM conversation_tags WHERE tag_id = $1',
        [tagId]
      );

      await database.run(
        'DELETE FROM contact_tags WHERE tag_id = $1',
        [tagId]
      );

      // Luego eliminar la etiqueta
      const result = await database.run(
        'DELETE FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error eliminando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Asignar etiqueta a una conversación
   */
  static async tagConversation(
    conversationId: string,
    platform: string,
    tagId: number,
    userId: number
  ): Promise<ConversationTag> {
    try {
      // Verificar que la etiqueta pertenece al usuario
      const tag = await database.get(
        'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
      );

      if (!tag) {
        throw new Error('Etiqueta no encontrada o no autorizada');
      }

      // Verificar que no existe la relación
      const existingRelation = await database.get(
        'SELECT id FROM conversation_tags WHERE conversation_id = $1 AND platform = $2 AND tag_id = $3',
        [conversationId, platform, tagId]
      );

      if (existingRelation) {
        throw new Error('La conversación ya tiene esta etiqueta asignada');
      }

      await database.run(
        `INSERT INTO conversation_tags (conversation_id, platform, tag_id, created_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [conversationId, platform, tagId]
      );

      // Obtener la relación creada
      const result = await database.get(
        `SELECT * FROM conversation_tags 
         WHERE conversation_id = $1 AND platform = $2 AND tag_id = $3`,
        [conversationId, platform, tagId]
      );

      return result;
    } catch (error) {
      console.error('Error etiquetando conversación:', error);
      throw error;
    }
  }

  /**
   * Asignar etiqueta a un contacto
   */
  static async tagContact(
    contactId: number,
    tagId: number,
    userId: number
  ): Promise<ContactTag> {
    try {
      // Verificar que la etiqueta y el contacto pertenecen al usuario
      const tag = await database.get(
        'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
      );

      const contact = await database.get(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (!tag || !contact) {
        throw new Error('Etiqueta o contacto no encontrado o no autorizado');
      }

      // Verificar que no existe la relación
      const existingRelation = await database.get(
        'SELECT id FROM contact_tags WHERE contact_id = $1 AND tag_id = $2',
        [contactId, tagId]
      );

      if (existingRelation) {
        throw new Error('El contacto ya tiene esta etiqueta asignada');
      }

      await database.run(
        `INSERT INTO contact_tags (contact_id, tag_id, created_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [contactId, tagId]
      );

      // Obtener la relación creada
      const result = await database.get(
        `SELECT * FROM contact_tags WHERE contact_id = $1 AND tag_id = $2`,
        [contactId, tagId]
      );

      return result;
    } catch (error) {
      console.error('Error etiquetando contacto:', error);
      throw error;
    }
  }

  /**
   * Obtener etiquetas de una conversación
   */
  static async getConversationTags(
    conversationId: string,
    platform: string,
    userId: number
  ): Promise<Tag[]> {
    try {
      const tags = await database.all(
        `SELECT t.* FROM tags t
         JOIN conversation_tags ct ON t.id = ct.tag_id
         WHERE ct.conversation_id = $1 
         AND ct.platform = $2
         AND t.user_id = $3
         ORDER BY t.name ASC`,
        [conversationId, platform, userId]
      );

      return tags;
    } catch (error) {
      console.error('Error obteniendo etiquetas de conversación:', error);
      throw error;
    }
  }

  /**
   * Obtener etiquetas de un contacto
   */
  static async getContactTags(contactId: number, userId: number): Promise<Tag[]> {
    try {
      const tags = await database.all(
        `SELECT t.* FROM tags t
         JOIN contact_tags ct ON t.id = ct.tag_id
         WHERE ct.contact_id = $1 
         AND t.user_id = $2
         ORDER BY t.name ASC`,
        [contactId, userId]
      );

      return tags;
    } catch (error) {
      console.error('Error obteniendo etiquetas de contacto:', error);
      throw error;
    }
  }

  /**
   * Remover etiqueta de una conversación
   */
  static async untagConversation(
    conversationId: string,
    platform: string,
    tagId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const result = await database.run(
        `DELETE FROM conversation_tags 
         WHERE conversation_id = $1 
         AND platform = $2 
         AND tag_id = $3
         AND tag_id IN (SELECT id FROM tags WHERE user_id = $4)`,
        [conversationId, platform, tagId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error removiendo etiqueta de conversación:', error);
      throw error;
    }
  }

  /**
   * Remover etiqueta de un contacto
   */
  static async untagContact(
    contactId: number,
    tagId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const result = await database.run(
        `DELETE FROM contact_tags 
         WHERE contact_id = $1 
         AND tag_id = $2
         AND tag_id IN (SELECT id FROM tags WHERE user_id = $3)`,
        [contactId, tagId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error removiendo etiqueta de contacto:', error);
      throw error;
    }
  }

  /**
   * Buscar conversaciones por etiqueta
   */
  static async getConversationsByTag(
    tagId: number,
    userId: number,
    platform?: string
  ): Promise<ConversationTag[]> {
    try {
      let query = `
        SELECT ct.*, t.name as tag_name, t.color as tag_color
        FROM conversation_tags ct
        JOIN tags t ON ct.tag_id = t.id
        WHERE ct.tag_id = $1 AND t.user_id = $2
      `;
      const params: any[] = [tagId, userId];

      if (platform) {
        query += ' AND ct.platform = $3';
        params.push(platform);
      }

      query += ' ORDER BY ct.created_at DESC';

      const conversations = await database.all(query, params);
      return conversations;
    } catch (error) {
      console.error('Error obteniendo conversaciones por etiqueta:', error);
      throw error;
    }
  }

  /**
   * Buscar contactos por etiqueta
   */
  static async getContactsByTag(
    tagId: number,
    userId: number
  ): Promise<ContactTag[]> {
    try {
      const contacts = await database.all(
        `SELECT ct.*, t.name as tag_name, t.color as tag_color, c.name as contact_name
         FROM contact_tags ct
         JOIN tags t ON ct.tag_id = t.id
         JOIN contacts c ON ct.contact_id = c.id
         WHERE ct.tag_id = $1 AND t.user_id = $2
         ORDER BY ct.created_at DESC`,
        [tagId, userId]
      );

      return contacts;
    } catch (error) {
      console.error('Error obteniendo contactos por etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de etiquetas
   */
  static async getTagStats(userId: number): Promise<{
    total_tags: number;
    active_tags: number;
    most_used_tags: Array<{ tag_id: number; tag_name: string; count: number }>;
  }> {
    try {
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_tags,
           COUNT(CASE WHEN is_active = true THEN 1 END) as active_tags
         FROM tags 
         WHERE user_id = $1`,
        [userId]
      );

      const mostUsed = await database.all(
        `SELECT 
           t.id as tag_id,
           t.name as tag_name,
           COUNT(ct.tag_id) as count
         FROM tags t
         LEFT JOIN conversation_tags ct ON t.id = ct.tag_id
         WHERE t.user_id = $1 AND t.is_active = true
         GROUP BY t.id, t.name
         ORDER BY count DESC
         LIMIT 10`,
        [userId]
      );

      return {
        total_tags: stats.total_tags || 0,
        active_tags: stats.active_tags || 0,
        most_used_tags: mostUsed
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de etiquetas:', error);
      throw error;
    }
  }
}
