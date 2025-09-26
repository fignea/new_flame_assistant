import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse, WebConversation, WebMessage, WebVisitor, WebChatStats, CreateWebConversationRequest, SendWebMessageRequest, UpdateWebConversationRequest, WebChatWidgetConfig } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Variable global para el servidor Socket.IO (se establecerá desde server.ts)
let io: any = null;

export function setSocketIO(socketIO: any) {
  io = socketIO;
}

export class WebController {
  // Crear o obtener conversación web
  public async createConversation(req: AuthenticatedRequest, res: Response<ApiResponse<WebConversation>>) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const { visitor, initial_message }: CreateWebConversationRequest = req.body;

      if (!visitor?.session_id) {
        return res.status(400).json({
          success: false,
          message: 'Session ID del visitante es requerido'
        });
      }

      // Buscar o crear visitante
      let visitorRecord = await database.get(
        'SELECT * FROM web_visitors WHERE user_id = $1 AND session_id = $2',
        [userId, visitor.session_id]
      );

      if (!visitorRecord) {
        const visitorResult = await database.query(
          `INSERT INTO web_visitors (user_id, session_id, name, email, phone, ip_address, user_agent, location, is_online)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            userId,
            visitor.session_id,
            visitor.name || null,
            visitor.email || null,
            visitor.phone || null,
            visitor.ip_address || null,
            visitor.user_agent || null,
            visitor.location || null,
            true
          ]
        );
        visitorRecord = visitorResult.rows[0];
      } else {
        // Actualizar estado online
        await database.query(
          'UPDATE web_visitors SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
          [visitorRecord.id]
        );
      }

      // Buscar conversación activa existente
      let conversation = await database.get(
        `SELECT wc.*, wv.name as visitor_name, wv.email as visitor_email, wv.phone as visitor_phone
         FROM web_conversations wc
         JOIN web_visitors wv ON wc.visitor_id = wv.id
         WHERE wc.user_id = $1 AND wc.visitor_id = $2 AND wc.status = 'active'
         ORDER BY wc.created_at DESC
         LIMIT 1`,
        [userId, visitorRecord.id]
      );

      if (!conversation) {
        // Crear nueva conversación
        const title = visitor.name || visitor.email || `Visitante ${visitor.session_id.slice(0, 8)}`;
        const conversationResult = await database.query(
          `INSERT INTO web_conversations (user_id, visitor_id, title, status, priority, tags, metadata)
           VALUES ($1, $2, $3, 'active', 'normal', '[]', '{}')
           RETURNING *`,
          [userId, visitorRecord.id, title]
        );
        conversation = conversationResult.rows[0];
      }

      // Agregar mensaje inicial si se proporciona
      if (initial_message) {
        await this.addMessage(conversation.id, 'visitor', visitorRecord.id, initial_message, 'text');
      }

      // Obtener conversación completa con datos del visitante
      const fullConversation = await this.getConversationById(conversation.id, userId);

      // Emitir evento de nueva conversación
      if (io && fullConversation) {
        io.to(`web:${userId}`).emit('web:conversation:new', fullConversation);
      }

      return res.json({
        success: true,
        data: fullConversation!,
        message: 'Conversación creada/obtenida exitosamente'
      });

    } catch (error) {
      logger.error('Error creating web conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener conversaciones del usuario
  public async getConversations(req: AuthenticatedRequest, res: Response<ApiResponse<WebConversation[]>>) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const { status, assigned_to, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT 
          wc.*,
          wv.name as visitor_name,
          wv.email as visitor_email,
          wv.phone as visitor_phone,
          wv.is_online,
          wv.last_seen,
          u.name as assigned_user_name,
          u.email as assigned_user_email,
          (SELECT COUNT(*) FROM web_messages wm WHERE wm.conversation_id = wc.id AND wm.sender_type = 'visitor' AND wm.is_read = false) as unread_count
        FROM web_conversations wc
        JOIN web_visitors wv ON wc.visitor_id = wv.id
        LEFT JOIN users u ON wc.assigned_to = u.id
        WHERE wc.user_id = $1
      `;

      const params: any[] = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND wc.status = $${paramCount}`;
        params.push(status);
      }

      if (assigned_to) {
        paramCount++;
        query += ` AND wc.assigned_to = $${paramCount}`;
        params.push(assigned_to);
      }

      query += ` ORDER BY wc.last_message_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      const conversations = result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        visitor_id: row.visitor_id,
        title: row.title,
        status: row.status,
        assigned_to: row.assigned_to,
        priority: row.priority,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        visitor: {
          id: row.visitor_id,
          user_id: row.user_id,
          session_id: '', // No exponer session_id
          name: row.visitor_name,
          email: row.visitor_email,
          phone: row.visitor_phone,
          is_online: row.is_online,
          last_seen: row.last_seen,
          created_at: ''
        },
        assigned_user: row.assigned_user_name ? {
          id: row.assigned_to,
          email: row.assigned_user_email,
          name: row.assigned_user_name,
          password: '',
          created_at: '',
          updated_at: ''
        } : undefined,
        unread_count: parseInt(row.unread_count) || 0
      }));

      return res.json({
        success: true,
        data: conversations,
        message: 'Conversaciones obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error getting web conversations:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener conversación por ID
  public async getConversationById(conversationId: number, userId: number): Promise<WebConversation | null> {
    try {
      const result = await database.query(
        `SELECT 
          wc.*,
          wv.name as visitor_name,
          wv.email as visitor_email,
          wv.phone as visitor_phone,
          wv.is_online,
          wv.last_seen,
          u.name as assigned_user_name,
          u.email as assigned_user_email
        FROM web_conversations wc
        JOIN web_visitors wv ON wc.visitor_id = wv.id
        LEFT JOIN users u ON wc.assigned_to = u.id
        WHERE wc.id = $1 AND wc.user_id = $2`,
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        visitor_id: row.visitor_id,
        title: row.title,
        status: row.status,
        assigned_to: row.assigned_to,
        priority: row.priority,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        visitor: {
          id: row.visitor_id,
          user_id: row.user_id,
          session_id: '',
          name: row.visitor_name,
          email: row.visitor_email,
          phone: row.visitor_phone,
          is_online: row.is_online,
          last_seen: row.last_seen,
          created_at: ''
        },
        assigned_user: row.assigned_user_name ? {
          id: row.assigned_to,
          email: row.assigned_user_email,
          name: row.assigned_user_name,
          password: '',
          created_at: '',
          updated_at: ''
        } : undefined
      };
    } catch (error) {
      logger.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  // Obtener mensajes de una conversación
  public async getMessages(req: AuthenticatedRequest, res: Response<ApiResponse<WebMessage[]>>) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que la conversación pertenece al usuario
      const conversation = await this.getConversationById(parseInt(conversationId), userId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      const { limit = 50, offset = 0 } = req.query;

      const result = await database.query(
        `SELECT 
          wm.*,
          wv.name as visitor_name,
          u.name as agent_name
        FROM web_messages wm
        LEFT JOIN web_visitors wv ON wm.sender_type = 'visitor' AND wm.sender_id = wv.id
        LEFT JOIN users u ON wm.sender_type = 'agent' AND wm.sender_id = u.id
        WHERE wm.conversation_id = $1
        ORDER BY wm.created_at ASC
        LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );

      const messages = result.rows.map((row: any) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        sender_type: row.sender_type,
        sender_id: row.sender_id,
        content: row.content,
        message_type: row.message_type,
        is_read: row.is_read,
        metadata: JSON.parse(row.metadata || '{}'),
        created_at: row.created_at,
        sender_name: row.sender_type === 'visitor' ? row.visitor_name : row.agent_name
      }));

      return res.json({
        success: true,
        data: messages,
        message: 'Mensajes obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting web messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Enviar mensaje
  public async sendMessage(req: AuthenticatedRequest, res: Response<ApiResponse<WebMessage>>) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const { conversation_id, content, message_type = 'text', metadata = {} }: SendWebMessageRequest = req.body;

      if (!conversation_id || !content) {
        return res.status(400).json({
          success: false,
          message: 'ID de conversación y contenido son requeridos'
        });
      }

      // Verificar que la conversación pertenece al usuario
      const conversation = await this.getConversationById(conversation_id, userId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      // Agregar mensaje
      const message = await this.addMessage(conversation_id, 'agent', userId, content, message_type, metadata);

      // Actualizar timestamp de última actividad
      await database.query(
        'UPDATE web_conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversation_id]
      );

      // Emitir evento de nuevo mensaje
      if (io) {
        io.to(`web:conversation:${conversation_id}`).emit('web:message:new', message);
        io.to(`web:${userId}`).emit('web:message:new', message);
      }

      return res.json({
        success: true,
        data: message,
        message: 'Mensaje enviado exitosamente'
      });

    } catch (error) {
      logger.error('Error sending web message:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar mensaje (método interno)
  private async addMessage(
    conversationId: number, 
    senderType: 'visitor' | 'agent' | 'system', 
    senderId: number, 
    content: string, 
    messageType: string = 'text',
    metadata: Record<string, any> = {}
  ): Promise<WebMessage> {
    const result = await database.query(
      `INSERT INTO web_messages (conversation_id, sender_type, sender_id, content, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [conversationId, senderType, senderId, content, messageType, JSON.stringify(metadata)]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      content: row.content,
      message_type: row.message_type,
      is_read: row.is_read,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: row.created_at
    };
  }

  // Actualizar conversación
  public async updateConversation(req: AuthenticatedRequest, res: Response<ApiResponse<WebConversation>>) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;
      const updates: UpdateWebConversationRequest = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que la conversación pertenece al usuario
      const existingConversation = await this.getConversationById(parseInt(conversationId), userId);
      if (!existingConversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      // Construir query de actualización
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (updates.status) {
        paramCount++;
        updateFields.push(`status = $${paramCount}`);
        params.push(updates.status);
      }

      if (updates.assigned_to !== undefined) {
        paramCount++;
        updateFields.push(`assigned_to = $${paramCount}`);
        params.push(updates.assigned_to);
      }

      if (updates.priority) {
        paramCount++;
        updateFields.push(`priority = $${paramCount}`);
        params.push(updates.priority);
      }

      if (updates.tags) {
        paramCount++;
        updateFields.push(`tags = $${paramCount}`);
        params.push(JSON.stringify(updates.tags));
      }

      if (updates.metadata) {
        paramCount++;
        updateFields.push(`metadata = $${paramCount}`);
        params.push(JSON.stringify(updates.metadata));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      paramCount++;
      params.push(parseInt(conversationId));

      const query = `UPDATE web_conversations SET ${updateFields.join(', ')} WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}`;
      params.push(userId);

      await database.query(query, params);

      // Obtener conversación actualizada
      const updatedConversation = await this.getConversationById(parseInt(conversationId), userId);

      // Emitir evento de conversación actualizada
      if (io && updatedConversation) {
        io.to(`web:${userId}`).emit('web:conversation:updated', updatedConversation);
        io.to(`web:conversation:${conversationId}`).emit('web:conversation:updated', updatedConversation);
      }

      return res.json({
        success: true,
        data: updatedConversation!,
        message: 'Conversación actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error updating web conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas
  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<WebChatStats>>) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const stats = await database.query(
        `SELECT 
          (SELECT COUNT(*) FROM web_conversations WHERE user_id = $1) as total_conversations,
          (SELECT COUNT(*) FROM web_conversations WHERE user_id = $1 AND status = 'active') as active_conversations,
          (SELECT COUNT(*) FROM web_conversations WHERE user_id = $1 AND status = 'closed') as closed_conversations,
          (SELECT COUNT(*) FROM web_messages wm 
           JOIN web_conversations wc ON wm.conversation_id = wc.id 
           WHERE wc.user_id = $1) as total_messages,
          (SELECT COUNT(*) FROM web_visitors WHERE user_id = $1 AND is_online = true) as online_visitors
        `,
        [userId]
      );

      const row = stats.rows[0];
      const webStats: WebChatStats = {
        total_conversations: parseInt(row.total_conversations),
        active_conversations: parseInt(row.active_conversations),
        closed_conversations: parseInt(row.closed_conversations),
        total_messages: parseInt(row.total_messages),
        online_visitors: parseInt(row.online_visitors),
        average_response_time: 0, // TODO: Calcular tiempo promedio de respuesta
        satisfaction_score: undefined
      };

      return res.json({
        success: true,
        data: webStats,
        message: 'Estadísticas obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error getting web chat stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener script del widget
  public async getWidgetScript(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const { domain } = req.query;

      const script = `
(function() {
  // Configuración del widget
  const config = {
    userId: ${userId},
    domain: '${domain || 'localhost:3001'}',
    apiUrl: 'http://${domain || 'localhost:3001'}/api/integrations/web',
    widgetId: 'flame-chat-widget-${userId}',
    position: 'bottom-right',
    primaryColor: '#3B82F6',
    title: '¡Hola! ¿En qué podemos ayudarte?',
    subtitle: 'Estamos aquí para responder tus preguntas',
    showAvatar: true,
    enableSound: true
  };

  // Crear widget
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = config.widgetId;
    widget.innerHTML = \`
      <div class="flame-chat-widget" style="
        position: fixed;
        \${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
        bottom: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        z-index: 10000;
        display: none;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div class="flame-chat-header" style="
          background: \${config.primaryColor};
          color: white;
          padding: 16px;
          border-radius: 12px 12px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            \${config.showAvatar ? \`<div style="
              width: 32px;
              height: 32px;
              background: rgba(255,255,255,0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            ">💬</div>\` : ''}
            <div>
              <div style="font-weight: 600; font-size: 14px;">\${config.title}</div>
              <div style="font-size: 12px; opacity: 0.9;">\${config.subtitle}</div>
            </div>
          </div>
          <button id="flame-chat-close" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
          ">×</button>
        </div>
        <div class="flame-chat-messages" style="
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: #f8fafc;
        ">
          <div class="flame-chat-welcome" style="
            text-align: center;
            color: #64748b;
            font-size: 14px;
            margin-bottom: 16px;
          ">
            ¡Hola! 👋<br>
            ¿En qué podemos ayudarte hoy?
          </div>
        </div>
        <div class="flame-chat-input" style="
          padding: 16px;
          border-top: 1px solid #e2e8f0;
          background: white;
          border-radius: 0 0 12px 12px;
        ">
          <div style="display: flex; gap: 8px;">
            <input type="text" id="flame-chat-message-input" placeholder="Escribe tu mensaje..." style="
              flex: 1;
              padding: 12px;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              outline: none;
              font-size: 14px;
            ">
            <button id="flame-chat-send" style="
              background: \${config.primaryColor};
              color: white;
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            ">→</button>
          </div>
        </div>
      </div>
    \`;
    
    document.body.appendChild(widget);
    return widget;
  }

  // Crear botón flotante
  function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'flame-chat-button';
    button.innerHTML = \`
      <div style="
        position: fixed;
        \${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
        bottom: 20px;
        width: 60px;
        height: 60px;
        background: \${config.primaryColor};
        border-radius: 50%;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <span style="color: white; font-size: 24px;">💬</span>
      </div>
    \`;
    
    document.body.appendChild(button);
    return button;
  }

  // Inicializar
  function init() {
    const widget = createWidget();
    const button = createFloatingButton();
    let isOpen = false;
    let sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

    // Eventos
    button.addEventListener('click', () => {
      isOpen = !isOpen;
      widget.style.display = isOpen ? 'flex' : 'none';
      button.style.display = isOpen ? 'none' : 'flex';
    });

    document.getElementById('flame-chat-close')?.addEventListener('click', () => {
      isOpen = false;
      widget.style.display = 'none';
      button.style.display = 'flex';
    });

    // Enviar mensaje
    document.getElementById('flame-chat-send')?.addEventListener('click', sendMessage);
    document.getElementById('flame-chat-message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
      const input = document.getElementById('flame-chat-message-input');
      const message = input.value.trim();
      if (!message) return;

      // Agregar mensaje a la UI
      addMessageToUI(message, 'visitor');
      input.value = '';

      // Enviar al servidor
      fetch(\`\${config.apiUrl}/conversations\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor: { session_id: sessionId },
          initial_message: message
        })
      }).catch(console.error);
    }

    function addMessageToUI(message, sender) {
      const messagesContainer = document.querySelector('.flame-chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = \`
        margin-bottom: 12px;
        text-align: \${sender === 'visitor' ? 'right' : 'left'};
      \`;
      messageDiv.innerHTML = \`
        <div style="
          display: inline-block;
          background: \${sender === 'visitor' ? config.primaryColor : '#e2e8f0'};
          color: \${sender === 'visitor' ? 'white' : '#1f2937'};
          padding: 8px 12px;
          border-radius: 18px;
          max-width: 80%;
          font-size: 14px;
        ">\${message}</div>
      \`;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Cargar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
      `;

      res.setHeader('Content-Type', 'application/javascript');
      res.send(script);

    } catch (error) {
      logger.error('Error generating widget script:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando script del widget'
      });
    }
  }

  // Marcar mensajes como leídos
  public async markMessagesAsRead(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que la conversación pertenece al usuario
      const conversation = await this.getConversationById(parseInt(conversationId), userId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      await database.query(
        'UPDATE web_messages SET is_read = true WHERE conversation_id = $1 AND sender_type = \'visitor\'',
        [conversationId]
      );

      return res.json({
        success: true,
        message: 'Mensajes marcados como leídos'
      });

    } catch (error) {
      logger.error('Error marking messages as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

export const webController = new WebController();
