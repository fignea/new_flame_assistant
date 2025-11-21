import { database } from '../config/database';
import { AssignmentService } from './AssignmentService';
import { TemplateService } from './TemplateService';
import { OpenAIService } from './OpenAIService';
import { Assistant, Message, ResponseTemplate } from '../types';

export class AutoResponseService {
  /**
   * Procesar mensaje entrante y generar respuesta automática
   */
  static async processIncomingMessage(
    message: Message,
    userId: string
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    templateUsed?: ResponseTemplate;
    assistantUsed?: Assistant;
  }> {
    try {
      // 1. Verificar si hay un asistente asignado a esta conversación
      const assignment = await AssignmentService.getAssignedAssistant(
        message.conversation_id,
        'whatsapp', // Por ahora solo WhatsApp, se puede expandir
        userId
      );

      if (!assignment) {
        return { shouldRespond: false };
      }

      // 2. Obtener el asistente completo
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [assignment.assistant_id, userId]
      );

      if (!assistant || !assistant.is_active) {
        return { shouldRespond: false };
      }

      // 3. Verificar si el asistente tiene auto-respuesta habilitada
      if (!assistant.auto_assign) {
        return { shouldRespond: false };
      }

      // 4. Buscar plantillas que coincidan con el mensaje
      const templates = await this.findMatchingTemplates(
        message.content,
        assistant.id,
        userId
      );

      let response: string;
      let templateUsed: ResponseTemplate | undefined;

      if (templates.length > 0) {
        // Usar la plantilla con mayor prioridad
        const template = templates[0];
        response = template.content;
        templateUsed = template;

        // Aplicar variables dinámicas si es necesario
        response = this.applyTemplateVariables(response, message);
      } else {
        // Generar respuesta con IA
        response = await this.generateAIResponse(message, assistant, userId);
      }

      // 5. Aplicar delay si está configurado
      if (assistant.response_delay > 0) {
        await this.delay(assistant.response_delay * 1000);
      }

      return {
        shouldRespond: true,
        response,
        templateUsed,
        assistantUsed: assistant
      };
    } catch (error) {
      console.error('Error procesando mensaje entrante:', error);
      return { shouldRespond: false };
    }
  }

  /**
   * Buscar plantillas que coincidan con el contenido del mensaje
   */
  private static async findMatchingTemplates(
    messageContent: string,
    assistantId: string,
    userId: string
  ): Promise<ResponseTemplate[]> {
    try {
      // Convertir mensaje a palabras clave
      const keywords = this.extractKeywords(messageContent);
      
      // Buscar plantillas por palabras clave
      const templates = await TemplateService.findTemplatesByKeywords(
        keywords,
        userId,
        assistantId
      );

      // Filtrar plantillas activas y ordenar por prioridad
      return templates
        .filter(template => template.is_active)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    } catch (error) {
      console.error('Error buscando plantillas coincidentes:', error);
      return [];
    }
  }

  /**
   * Extraer palabras clave del mensaje
   */
  private static extractKeywords(messageContent: string): string[] {
    // Limpiar y normalizar el mensaje
    const cleaned = messageContent
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    // Dividir en palabras y filtrar palabras comunes
    const words = cleaned.split(' ');
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'uno', 'como', 'pero', 'sus', 'le', 'ha', 'me', 'si', 'sin', 'sobre', 'este', 'ya', 'entre', 'cuando', 'todo', 'esta', 'ser', 'son', 'dos', 'también', 'fue', 'había', 'era', 'eran', 'sido', 'estado', 'estaba', 'estaban', 'está', 'están', 'esté', 'estén', 'estará', 'estarán', 'estaría', 'estarían', 'he', 'has', 'ha', 'han', 'había', 'habías', 'habíamos', 'habían', 'habré', 'habrás', 'habrá', 'habremos', 'habrán', 'habría', 'habrías', 'habríamos', 'habrían', 'haya', 'hayas', 'hayamos', 'hayan', 'hubiera', 'hubieras', 'hubiéramos', 'hubieran', 'hubiese', 'hubieses', 'hubiésemos', 'hubiesen', 'hubiere', 'hubieres', 'hubiéremos', 'hubieren', 'soy', 'eres', 'es', 'somos', 'sois', 'son', 'era', 'eras', 'éramos', 'erais', 'eran', 'fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron', 'seré', 'serás', 'será', 'seremos', 'seréis', 'serán', 'sería', 'serías', 'seríamos', 'seríais', 'serían', 'sea', 'seas', 'seamos', 'seáis', 'sean', 'fuera', 'fueras', 'fuéramos', 'fuerais', 'fueran', 'fuese', 'fueses', 'fuésemos', 'fueseis', 'fuesen', 'fuere', 'fueres', 'fuéremos', 'fuereis', 'fueren'
    ]);

    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Máximo 10 palabras clave
  }

  /**
   * Aplicar variables dinámicas a las plantillas
   */
  private static applyTemplateVariables(
    template: string,
    message: Message
  ): string {
    let processedTemplate = template;

    // Variables disponibles
    const variables = {
      '{nombre_cliente}': message.sender_id ? 'Cliente' : 'Usuario', // Se puede mejorar obteniendo el nombre real
      '{fecha}': new Date().toLocaleDateString('es-ES'),
      '{hora}': new Date().toLocaleTimeString('es-ES'),
      '{empresa}': 'Nuestra empresa', // Se puede hacer configurable
      '{mensaje_original}': message.content
    };

    // Reemplazar variables
    Object.entries(variables).forEach(([variable, value]) => {
      processedTemplate = processedTemplate.replace(new RegExp(variable, 'g'), value);
    });

    return processedTemplate;
  }

  /**
   * Generar respuesta usando IA
   */
  private static async generateAIResponse(
    message: Message,
    assistant: Assistant,
    userId: string
  ): Promise<string> {
    try {
      // Obtener historial de conversación reciente
      const conversationHistory = await this.getConversationHistory(
        message.conversation_id,
        userId,
        10 // Últimos 10 mensajes
      );

      // Generar respuesta con OpenAI
      const aiResponse = await OpenAIService.generateResponse(
        message.content,
        assistant,
        conversationHistory
      );

      return OpenAIService.processResponse(aiResponse.response, assistant);
    } catch (error) {
      console.error('Error generando respuesta con IA:', error);
      
      // Respuesta de emergencia
      return OpenAIService.generateFallbackResponse(assistant);
    }
  }

  /**
   * Obtener historial de conversación
   */
  private static async getConversationHistory(
    chatId: string,
    userId: string,
    limit: number = 10
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const messages = await database.all(
        `SELECT content, is_from_me, assistant_id, is_auto_response
         FROM messages 
         WHERE chat_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [chatId, userId, limit]
      );

      return messages
        .reverse() // Ordenar cronológicamente
        .map(msg => ({
          role: msg.is_from_me ? 'assistant' : 'user',
          content: msg.content
        }));
    } catch (error) {
      console.error('Error obteniendo historial de conversación:', error);
      return [];
    }
  }

  /**
   * Enviar respuesta automática
   */
  static async sendAutoResponse(
    chatId: string,
    response: string,
    userId: string,
    assistantId?: number,
    templateId?: string
  ): Promise<boolean> {
    try {
      // Aquí se integraría con el servicio de WhatsApp para enviar el mensaje
      // Por ahora solo registramos en la base de datos
      
      const messageId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(
        `INSERT INTO messages 
         (user_id, whatsapp_message_id, chat_id, content, message_type, is_from_me, 
          timestamp, status, assistant_id, is_auto_response, template_id, created_at) 
         VALUES ($1, $2, $3, $4, 'text', true, CURRENT_TIMESTAMP, 'sent', $5, true, $6, CURRENT_TIMESTAMP)`,
        [userId, messageId, chatId, response, assistantId, templateId]
      );

      // TODO: Integrar con WhatsAppService para enviar el mensaje real
      console.log(`Respuesta automática enviada a ${chatId}: ${response}`);

      return true;
    } catch (error) {
      console.error('Error enviando respuesta automática:', error);
      return false;
    }
  }

  /**
   * Procesar mensaje web entrante
   */
  static async processWebMessage(
    conversationId: string,
    messageContent: string,
    userId: string
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    templateUsed?: ResponseTemplate;
    assistantUsed?: Assistant;
  }> {
    try {
      // Buscar asignación para conversación web
      const assignment = await AssignmentService.getAssignedAssistant(
        conversationId.toString(),
        'web',
        userId
      );

      if (!assignment) {
        return { shouldRespond: false };
      }

      // Obtener asistente
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [assignment.assistant_id, userId]
      );

      if (!assistant || !assistant.is_active) {
        return { shouldRespond: false };
      }

      // Buscar plantillas o generar respuesta IA
      const templates = await this.findMatchingTemplates(
        messageContent,
        assistant.id,
        userId
      );

      let response: string;
      let templateUsed: ResponseTemplate | undefined;

      if (templates.length > 0) {
        const template = templates[0];
        response = template.content;
        templateUsed = template;
      } else {
        response = await this.generateAIResponse(
          { 
            id: '',
            tenant_id: '',
            conversation_id: conversationId,
            external_message_id: '',
            sender_type: 'user',
            content: messageContent,
            message_type: 'text',
            media_metadata: {},
            is_from_me: false,
            is_auto_response: false,
            status: 'sent',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Message,
          assistant,
          userId
        );
      }

      return {
        shouldRespond: true,
        response,
        templateUsed,
        assistantUsed: assistant
      };
    } catch (error) {
      console.error('Error procesando mensaje web:', error);
      return { shouldRespond: false };
    }
  }

  /**
   * Verificar si un asistente debe responder automáticamente
   */
  static async shouldAutoRespond(
    conversationId: string,
    platform: string,
    userId: string
  ): Promise<boolean> {
    try {
      const assignment = await AssignmentService.getAssignedAssistant(
        conversationId,
        platform as any,
        userId
      );

      if (!assignment) {
        return false;
      }

      const assistant = await database.get(
        'SELECT auto_assign, is_active FROM assistants WHERE id = $1 AND user_id = $2',
        [assignment.assistant_id, userId]
      );

      return !!(assistant && assistant.is_active && assistant.auto_assign);
    } catch (error) {
      console.error('Error verificando auto-respuesta:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de respuestas automáticas
   */
  static async getAutoResponseStats(userId: number): Promise<{
    total_responses: number;
    responses_today: number;
    responses_by_assistant: Array<{ assistant_id: number; assistant_name: string; count: number }>;
    responses_by_template: Array<{ template_id: number; template_name: string; count: number }>;
  }> {
    try {
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_responses,
           COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as responses_today
         FROM messages 
         WHERE user_id = $1 AND is_auto_response = true`,
        [userId]
      );

      const byAssistant = await database.all(
        `SELECT 
           m.assistant_id,
           a.name as assistant_name,
           COUNT(*) as count
         FROM messages m
         LEFT JOIN assistants a ON m.assistant_id = a.id
         WHERE m.user_id = $1 AND m.is_auto_response = true
         GROUP BY m.assistant_id, a.name
         ORDER BY count DESC`,
        [userId]
      );

      const byTemplate = await database.all(
        `SELECT 
           m.template_id,
           rt.name as template_name,
           COUNT(*) as count
         FROM messages m
         LEFT JOIN response_templates rt ON m.template_id = rt.id
         WHERE m.user_id = $1 AND m.is_auto_response = true AND m.template_id IS NOT NULL
         GROUP BY m.template_id, rt.name
         ORDER BY count DESC`,
        [userId]
      );

      return {
        total_responses: stats.total_responses || 0,
        responses_today: stats.responses_today || 0,
        responses_by_assistant: byAssistant,
        responses_by_template: byTemplate
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de respuestas automáticas:', error);
      throw error;
    }
  }

  /**
   * Función de delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
