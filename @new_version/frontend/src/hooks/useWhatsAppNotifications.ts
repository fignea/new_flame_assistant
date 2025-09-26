import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useNotifications } from '../components/NotificationSystem';
import { useApp } from '../contexts/AppContext';

export interface WhatsAppMessage {
  id: string;
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: number;
  messageType: string;
  isFromMe: boolean;
  status: string;
}

export interface WhatsAppNotificationData {
  userId: number;
  message: WhatsAppMessage;
}

export const useWhatsAppNotifications = () => {
  const { user } = useApp();
  const { addNotification } = useNotifications();

  const handleNewMessage = useCallback((data: WhatsAppNotificationData) => {
    // Solo procesar mensajes para el usuario actual
    if (!user || data.userId !== user.id) {
      return;
    }

    const { message } = data;
    
    // No mostrar notificaciones para mensajes propios
    if (message.isFromMe) {
      return;
    }

    // Formatear el nombre del remitente
    const senderName = message.senderName || message.senderId.replace('@s.whatsapp.net', '');
    
    // Formatear el contenido del mensaje
    let content = message.content;
    if (content.length > 100) {
      content = content.substring(0, 100) + '...';
    }

    // Formatear la fecha
    const date = new Date(message.timestamp * 1000);
    const formattedDate = date.toLocaleString('es-ES', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Crear la notificación
    addNotification({
      type: 'message',
      title: `💬 Nuevo mensaje de ${senderName}`,
      message: `${content}\n\n📅 ${formattedDate}`,
      duration: 8000, // 8 segundos para que el usuario pueda leer
    });
  }, [user, addNotification]);

  const { isConnected, joinUserRoom, leaveUserRoom } = useWebSocket({
    onMessage: (message) => {
      console.log('🔔 Notification hook received message:', message);
      if (message.type === 'whatsapp:message') {
        console.log('📨 Processing WhatsApp message for notifications:', message.data);
        handleNewMessage({
          userId: user?.id || 0,
          message: message.data
        });
      }
    },
    onConnect: () => {
      if (user) {
        joinUserRoom(user.id.toString());
      }
    },
    onDisconnect: () => {
      if (user) {
        leaveUserRoom(user.id.toString());
      }
    }
  });

  // Unirse a la sala del usuario cuando se conecte
  useEffect(() => {
    if (isConnected && user) {
      joinUserRoom(user.id.toString());
    }
  }, [isConnected, user, joinUserRoom]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (user) {
        leaveUserRoom(user.id.toString());
      }
    };
  }, [user, leaveUserRoom]);

  return {
    isConnected
  };
};

export default useWhatsAppNotifications;
