import { useEffect, useRef, useState } from 'react';
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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsConfig.url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        
        // Intentar reconectar si no fue un cierre intencional
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
      };

    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const joinRoom = (room: string) => {
    sendMessage({
      type: 'join-room',
      room
    });
  };

  const leaveRoom = (room: string) => {
    sendMessage({
      type: 'leave-room',
      room
    });
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
