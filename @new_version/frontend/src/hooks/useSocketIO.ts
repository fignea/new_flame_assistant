import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { wsConfig } from '../config/api';

export interface SocketIOMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface UseSocketIOOptions {
  onMessage?: (message: SocketIOMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useSocketIO = (options: UseSocketIOOptions = {}) => {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('No authentication token available');
        onError?.('No authentication token available');
        return;
      }

      const socket = io(wsConfig.url, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        auth: {
          token: token
        },
        ...wsConfig.options
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket.IO connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        onDisconnect?.();
        
        // Intentar reconectar si no fue un cierre intencional
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            // Verificar que el token siga disponible antes de reconectar
            const token = localStorage.getItem('accessToken');
            if (token) {
              connect();
            }
          }, reconnectInterval);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
        setError('Socket.IO connection error');
        onError?.(err);
      });

      // Escuchar todos los eventos de WhatsApp
      socket.on('whatsapp:message', (data) => {
        onMessage?.({
          type: 'whatsapp:message',
          data,
          timestamp: Date.now()
        });
      });

      socket.on('whatsapp:connected', (data) => {
        onMessage?.({
          type: 'whatsapp:connected',
          data,
          timestamp: Date.now()
        });
      });

      socket.on('whatsapp:disconnected', () => {
        onMessage?.({
          type: 'whatsapp:disconnected',
          data: {},
          timestamp: Date.now()
        });
      });

      socket.on('whatsapp:qr', (data) => {
        onMessage?.({
          type: 'whatsapp:qr',
          data,
          timestamp: Date.now()
        });
      });

      socket.on('whatsapp:contact', (data) => {
        onMessage?.({
          type: 'whatsapp:contact',
          data,
          timestamp: Date.now()
        });
      });

    } catch (err) {
      setError('Failed to create Socket.IO connection');
      console.error('Socket.IO connection error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', message);
    } else {
      console.warn('Socket.IO is not connected');
    }
  };

  const joinRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', room);
    } else {
      console.warn('Socket.IO is not connected');
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', room);
    } else {
      console.warn('Socket.IO is not connected');
    }
  };

  const joinUserRoom = (userId: string) => {
    joinRoom(`user:${userId}`);
  };

  const leaveUserRoom = (userId: string) => {
    leaveRoom(`user:${userId}`);
  };

  const joinConversation = (conversationId: string) => {
    joinRoom(`conversation:${conversationId}`);
  };

  const leaveConversation = (conversationId: string) => {
    leaveRoom(`conversation:${conversationId}`);
  };

  const reconnectWithNewToken = () => {
    // Desconectar y reconectar con el nuevo token
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    leaveRoom,
    joinUserRoom,
    leaveUserRoom,
    joinConversation,
    leaveConversation,
    reconnectWithNewToken
  };
};

export default useSocketIO;
