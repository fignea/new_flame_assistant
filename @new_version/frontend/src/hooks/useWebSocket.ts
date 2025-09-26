import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { wsConfig } from '../config/api';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
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
      const socket = io(wsConfig.url, wsConfig.options);
      socketRef.current = socket;

      socket.on('connect', () => {
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
            connect();
          }, reconnectInterval);
        }
      });

      socket.on('error', (err) => {
        setError('Socket.IO connection error');
        onError?.(err);
      });

      // Escuchar todos los eventos de mensaje
      socket.onAny((eventName, ...args) => {
        onMessage?.({
          type: eventName,
          data: args[0],
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
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', room);
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
    leaveConversation
  };
};

export default useWebSocket;
