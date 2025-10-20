import cron from 'node-cron';
import { database } from '../config/database';
import { whatsappService } from './WhatsAppService';
import { ScheduledMessage } from '../types';

export class ScheduledMessagesService {
  private isRunning = false;

  constructor() {
    this.startScheduler();
    console.log('📅 ScheduledMessagesService initialized');
  }

  private startScheduler(): void {
    // Ejecutar cada minuto para verificar programación
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) return; // Evitar ejecuciones concurrentes
      
      this.isRunning = true;
      try {
        await this.processPendingMessages();
      } catch (error) {
        console.error('❌ Error processing scheduled messages:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Scheduled messages cron job started');
  }

  private async processPendingMessages(): Promise<void> {
    try {
      // Obtener programación pendientes que ya deben enviarse
      const result = await database.query(
        `SELECT sm.*, c.whatsapp_id, c.name as contact_name
         FROM scheduled_messages sm
         LEFT JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.status = 'pending' 
         AND sm.scheduled_time <= NOW()
         ORDER BY sm.scheduled_time ASC
         LIMIT 10`, // Procesar máximo 10 mensajes por vez
        []
      );

      const pendingMessages = result.rows as (ScheduledMessage & { whatsapp_id: string; contact_name: string })[];

      if (pendingMessages.length === 0) {
        return;
      }

      console.log(`📤 Processing ${pendingMessages.length} scheduled messages`);

      for (const message of pendingMessages) {
        await this.sendScheduledMessage(message);
      }

    } catch (error) {
      console.error('❌ Error getting pending messages:', error);
    }
  }

  private async sendScheduledMessage(message: ScheduledMessage & { whatsapp_id: string; contact_name: string }): Promise<void> {
    try {
      console.log(`📤 Sending scheduled message ${message.id} to ${message.contact_name}`);

      // Verificar que el usuario tiene una sesión de WhatsApp conectada
      const connectionStatus = whatsappService.getConnectionStatus(message.created_by);
      
      if (!connectionStatus.isConnected) {
        console.log(`❌ WhatsApp not connected for user ${message.created_by}, marking message as failed`);
        
        await database.run(
          `UPDATE scheduled_messages 
           SET status = 'failed', 
               error_message = 'WhatsApp no conectado', 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [message.id]
        );
        return;
      }

      // Enviar el mensaje
      const sentMessage = await whatsappService.sendMessage(
        message.created_by,
        message.whatsapp_id,
        message.content
      );

      if (sentMessage) {
        // Marcar como enviado exitosamente
        await database.run(
          `UPDATE scheduled_messages 
           SET status = 'sent', 
               sent_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [message.id]
        );

        console.log(`✅ Scheduled message ${message.id} sent successfully`);
      } else {
        throw new Error('Failed to send message through WhatsApp service');
      }

    } catch (error) {
      console.error(`❌ Error sending scheduled message ${message.id}:`, error);

      // Marcar como fallido
      await database.run(
        `UPDATE scheduled_messages 
         SET status = 'failed', 
             error_message = $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Error desconocido', message.id]
      );
    }
  }

  public async getUpcomingMessages(userId: string, limit: number = 5): Promise<any[]> {
    try {
      const result = await database.query(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id
         FROM scheduled_messages sm
         LEFT JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.created_by = $1 
         AND sm.status = 'pending'
         AND sm.scheduled_time > NOW()
         ORDER BY sm.scheduled_time ASC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting upcoming messages:', error);
      return [];
    }
  }

  public async getRecentSentMessages(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await database.query(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id
         FROM scheduled_messages sm
         LEFT JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.created_by = $1 
         AND sm.status = 'sent'
         ORDER BY sm.sent_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting recent sent messages:', error);
      return [];
    }
  }

  public async getFailedMessages(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await database.query(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id
         FROM scheduled_messages sm
         LEFT JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.created_by = $1 
         AND sm.status = 'failed'
         ORDER BY sm.updated_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting failed messages:', error);
      return [];
    }
  }

  public async retryFailedMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      // Verificar que el mensaje existe, pertenece al usuario y está fallido
      const message = await database.get(
        'SELECT * FROM scheduled_messages WHERE id = $1 AND created_by = $2 AND status = $3',
        [messageId, userId, 'failed']
      );

      if (!message) {
        return false;
      }

      // Marcar como pendiente para que sea procesado en el próximo ciclo
      await database.run(
        `UPDATE scheduled_messages 
         SET status = 'pending', 
             error_message = NULL, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [messageId]
      );

      console.log(`🔄 Message ${messageId} marked for retry`);
      return true;

    } catch (error) {
      console.error('Error retrying failed message:', error);
      return false;
    }
  }

  public getStats() {
    return {
      isRunning: this.isRunning,
      schedulerActive: true
    };
  }
}

export const scheduledMessagesService = new ScheduledMessagesService();
