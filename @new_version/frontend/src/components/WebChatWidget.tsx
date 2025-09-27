import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

interface WebChatWidgetProps {
  userId: number;
  apiUrl: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  showAvatar?: boolean;
  enableSound?: boolean;
}

export const WebChatWidget: React.FC<WebChatWidgetProps> = ({
  userId,
  apiUrl,
  title = '¡Hola! ¿En qué podemos ayudarte?',
  subtitle = 'Estamos aquí para responder tus preguntas',
  primaryColor = '#3B82F6',
  position = 'bottom-right',
  showAvatar = true,
  enableSound = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    sender: 'visitor' | 'agent';
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => {
    // Persistir sessionId en localStorage
    const stored = localStorage.getItem('flame_chat_session_id');
    if (stored) return stored;
    const newId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('flame_chat_session_id', newId);
    return newId;
  });
  const [conversationId, setConversationId] = useState<number | null>(() => {
    // Persistir conversationId en sessionStorage
    const stored = sessionStorage.getItem('flame_chat_conversation_id');
    return stored ? parseInt(stored) : null;
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático a los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inicializar WebSocket
  useEffect(() => {
    const socketUrl = apiUrl.replace('/api', '');
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
    });

    // Escuchar mensajes del agente
    newSocket.on('web:message:new', (message: any) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, {
          id: message.id.toString(),
          content: message.content,
          sender: 'agent' as const,
          timestamp: new Date(message.created_at)
        }]);
      }
    });

    // Escuchar indicador de escritura
    newSocket.on('web:typing:start', () => {
      setIsTyping(true);
    });

    newSocket.on('web:typing:stop', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [apiUrl, conversationId]);

  // Polling como respaldo
  useEffect(() => {
    if (!isConnected && conversationId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/conversations/${conversationId}/messages?limit=50`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const newMessages = data.data.map((msg: any) => ({
                id: msg.id.toString(),
                content: msg.content,
                sender: msg.sender_type as 'visitor' | 'agent',
                timestamp: new Date(msg.created_at)
              }));
              setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = newMessages.filter((m: any) => !existingIds.has(m.id));
                return [...prev, ...uniqueNew].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              });
            }
          }
        } catch (error) {
          console.error('Error en polling:', error);
        }
      }, 3000); // Polling cada 3 segundos

      setPollingInterval(interval);
    } else if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isConnected, conversationId, apiUrl]);

  // Cargar mensajes existentes al abrir el widget
  useEffect(() => {
    if (isOpen && conversationId) {
      loadMessages();
    }
  }, [isOpen, conversationId]);

  // Cargar mensajes existentes
  const loadMessages = async () => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`${apiUrl}/conversations/${conversationId}/messages?limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const loadedMessages = data.data.map((msg: any) => ({
            id: msg.id.toString(),
            content: msg.content,
            sender: msg.sender_type as 'visitor' | 'agent',
            timestamp: new Date(msg.created_at)
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      sender: 'visitor' as const,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    try {
      // Si no hay conversación, crear una
      if (!conversationId) {
        const response = await fetch(`${apiUrl}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitor: {
              session_id: sessionId,
              name: 'Visitante',
              user_agent: navigator.userAgent,
              location: window.location.href
            },
            initial_message: message.content
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newConversationId = data.data.id;
          setConversationId(newConversationId);
          sessionStorage.setItem('flame_chat_conversation_id', newConversationId.toString());
        }
      } else {
        // Enviar mensaje a conversación existente
        await fetch(`${apiUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content: message.content,
            message_type: 'text'
          })
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Manejar tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calcular la posición horizontal basada en la prop position
  const horizontalPosition = position === 'bottom-right' ? 'right' : 'left';

  return (
    <div className="fixed z-50" style={{ [horizontalPosition]: '20px', bottom: '20px' }}>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Widget de chat */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 h-96 flex flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 rounded-t-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center space-x-3">
              {showAvatar && (
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs opacity-90">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>¡Hola! 👋</p>
                    <p>¿En qué podemos ayudarte hoy?</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.sender === 'visitor'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                        style={{
                          backgroundColor: message.sender === 'visitor' ? primaryColor : undefined
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 pb-2">
                <div className="text-center">
                  <a
                    href="https://flame-ai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    Powered by <span className="font-medium">Flame AI</span>
                  </a>
                </div>
              </div>
        </div>
      )}
    </div>
  );
};
