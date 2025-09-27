import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Image as ImageIcon,
  FileText,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Edit,
  Ban,
  Trash2,
  Download,
  User
} from 'lucide-react';
import { apiService } from '../services/api.service';
import { useSocketIO } from '../hooks/useSocketIO';

interface WhatsAppMessage {
  id: string;
  key: any;
  message: any;
  messageTimestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  fromMe: boolean;
  chatId: string; // chat_hash
  whatsappId?: string; // whatsapp_id para referencia
  senderId: string;
  senderName?: string;
  body?: string;
  type: string;
  hasMedia: boolean;
  media?: {
    mimetype?: string;
    filename?: string;
    caption?: string;
    url?: string;
  };
  quotedMessage?: WhatsAppMessage;
  contextInfo?: any;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  isReadOnly: boolean;
  unreadCount: number;
  lastMessage?: WhatsAppMessage;
  participants: string[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  pinned: boolean;
  ephemeralExpiration?: number;
  ephemeralSettingTimestamp?: number;
}

interface WhatsAppMessageManagerProps {
  userId: string;
  isConnected: boolean;
  onMessageSent?: (message: WhatsAppMessage) => void;
  onMessageReceived?: (message: WhatsAppMessage) => void;
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const WhatsAppMessageManager: React.FC<WhatsAppMessageManagerProps> = ({
  userId,
  isConnected,
  onMessageSent,
  onMessageReceived,
  onNotification
}) => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configurar WebSocket para recibir mensajes en tiempo real
  const { isConnected: wsConnected, joinUserRoom, leaveUserRoom } = useSocketIO({
    onMessage: (message) => {
      console.log('📨 WebSocket message received:', message);
      
      if (message.type === 'whatsapp:message') {
        const messageData = message.data;
        console.log('📨 Processing message data:', messageData);
        
        // Solo procesar mensajes del chat actual
        console.log('📨 Checking if message is for current chat:', {
          messageChatId: messageData.chatId,
          selectedChatId: selectedChat?.id,
          isMatch: selectedChat && messageData.chatId === selectedChat.id
        });
        
        if (selectedChat && messageData.chatId === selectedChat.id) {
          console.log('📨 Message is for current chat, processing...');
          
          // Verificar si es una actualización de estado de un mensaje existente
          setMessages(prev => {
            const existingMessage = prev.find(msg => msg.id === messageData.id);
            
            if (existingMessage) {
              // El mensaje ya existe, verificar si es una actualización de estado
              const isStatusUpdate = messageData.isFromMe && messageData.status && 
                (messageData.status === 'delivered' || messageData.status === 'read') &&
                existingMessage.status !== messageData.status;
              
              if (isStatusUpdate) {
                console.log('📨 This is a status update, updating existing message...');
                console.log('📨 Updating message status:', messageData.id, 'from', existingMessage.status, 'to', messageData.status);
                
                // Actualizar solo el estado del mensaje existente
                return prev.map(msg => {
                  if (msg.id === messageData.id) {
                    return { ...msg, status: messageData.status };
                  }
                  return msg;
                });
              } else {
                console.log('📨 Message already exists with same status, skipping...');
                return prev; // No hacer cambios
              }
            }
            
            // El mensaje no existe, es un mensaje nuevo
            console.log('📨 New message, adding to list...');
            
            // Convertir el mensaje al formato esperado
            const formattedMessage: WhatsAppMessage = {
              id: messageData.id || messageData.key?.id || '',
              key: messageData.key || { id: messageData.id, remoteJid: messageData.chatId, fromMe: messageData.isFromMe },
              message: messageData.message || { conversation: messageData.content },
              messageTimestamp: messageData.timestamp || messageData.messageTimestamp || Date.now() / 1000,
              status: messageData.status || 'delivered',
              fromMe: messageData.isFromMe || messageData.fromMe || false,
              chatId: messageData.chatId,
              senderId: messageData.senderId || messageData.chatId,
              senderName: messageData.senderName || (messageData.isFromMe ? 'Tú' : messageData.chatId.split('@')[0]),
              body: messageData.content || messageData.body || '',
              type: messageData.messageType || messageData.type || 'text',
              hasMedia: messageData.hasMedia || false,
              media: messageData.media
            };

            console.log('📨 Formatted message:', formattedMessage);
            
            // Notificar al componente padre
            if (onMessageReceived) {
              onMessageReceived(formattedMessage);
            }
            
            return [...prev, formattedMessage];
          });
          
          return; // No procesar más
        } else {
          console.log('📨 Message not for current chat:', messageData.chatId, 'vs', selectedChat?.id);
        }
      }
    },
    onConnect: () => {
      if (userId) {
        joinUserRoom(userId.toString());
      }
    },
    onDisconnect: () => {
      if (userId) {
        leaveUserRoom(userId.toString());
      }
    }
  });

  // Scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showChatMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.chat-menu-container')) {
          setShowChatMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatMenu]);

  // Cargar chats al conectar
  useEffect(() => {
    if (isConnected && wsConnected) {
      loadChats();
    }
  }, [isConnected, wsConnected]);

  // Cargar mensajes cuando se selecciona un chat
  useEffect(() => {
    if (selectedChat && isConnected && wsConnected) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat, isConnected, wsConnected]);

  // Cargar chats
  const loadChats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getWhatsAppChatsNew();
      
      if (response.success && response.data) {
        setChats(response.data);
      } else {
        throw new Error(response.message || 'Error al cargar chats');
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setError('Error al cargar los chats');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar mensajes de un chat
  const loadMessages = async (chatId: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.getWhatsAppMessagesNew(chatId, { limit: 50 });
      
      if (response.success && response.data) {
        // Filtrar mensajes de status y grupos
        const filteredMessages = (response.data.messages || []).filter((message: WhatsAppMessage) => {
          return !isStatusMessage(message) && !isGroupMessage(message.chatId);
        });
        setMessages(filteredMessages);
      } else {
        throw new Error(response.message || 'Error al cargar mensajes');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para detectar mensajes de status
  const isStatusMessage = (message: WhatsAppMessage): boolean => {
    const statusPatterns = [
      /^\[Status\]/i,
      /^\[Estado\]/i,
      /^\[Story\]/i,
      /^\[Historia\]/i,
      /^\[View Once\]/i,
      /^\[Ver una vez\]/i,
      /^\[Ephemeral\]/i,
      /^\[Temporal\]/i,
      /^\[Protocol Update\]/i,
      /^\[Security Update\]/i,
      /^\[Audio\]/i,
      /^\[Image\]/i,
      /^\[Video\]/i,
      /^\[Document\]/i,
      /^\[Sticker\]/i
    ];

    const statusContent = [
      'Status',
      'Estado',
      'Story',
      'Historia',
      'View Once',
      'Ver una vez',
      'Ephemeral',
      'Temporal',
      'Protocol Update',
      'Security Update',
      '[Audio]',
      '[Image]',
      '[Video]',
      '[Document]',
      '[Sticker]'
    ];

    const statusMessageTypes = [
      'ephemeral',
      'view_once',
      'view_once_image',
      'view_once_video',
      'protocol_update',
      'security_update',
      'audio',
      'image',
      'video',
      'document',
      'sticker'
    ];

    const messageContent = message.body || message.message?.conversation || '';
    
    // Filtrar mensajes que son solo emojis o símbolos
    const isOnlyEmojis = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0FF}\u{1F200}-\u{1F2FF}\s*]+$/u.test(messageContent);
    
    // Filtrar mensajes muy cortos que podrían ser estados
    const isVeryShort = messageContent.trim().length <= 3 && !messageContent.includes(' ');
    
    return statusPatterns.some(pattern => pattern.test(messageContent)) ||
           statusContent.some(status => messageContent.includes(status)) ||
           statusMessageTypes.includes(message.type) ||
           isOnlyEmojis ||
           isVeryShort;
  };

  // Función para detectar mensajes de grupos
  const isGroupMessage = (chatId: string): boolean => {
    return chatId.includes('@g.us');
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isSending) return;

    const messageContent = newMessage.trim();
    setIsSending(true);
    setNewMessage(''); // Limpiar el input inmediatamente
    
    try {
      const response = await apiService.sendMessage({
        contactId: selectedChat.id,
        content: messageContent,
        messageType: 'text'
      });
      
      if (response.success && response.data) {
        // No agregar el mensaje localmente aquí - se recibirá a través de WebSocket
        // Solo notificar que se envió exitosamente
        if (onMessageSent) {
          onMessageSent({
            id: response.data.messageId,
            key: { id: response.data.messageId, remoteJid: selectedChat.id, fromMe: true },
            message: { conversation: messageContent },
            messageTimestamp: response.data.timestamp,
            status: 'sent',
            fromMe: true,
            chatId: selectedChat.id,
            senderId: userId,
            senderName: 'Tú',
            body: messageContent,
            type: 'text',
            hasMedia: false
          });
        }
      } else {
        throw new Error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al enviar el mensaje');
      // Restaurar el mensaje en el input si falló
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // Enviar archivo
  const sendFile = async (file: File) => {
    if (!selectedChat) return;

    try {
      const response = await apiService.sendMediaMessage(
        selectedChat.id, 
        file, 
        newMessage.trim() || undefined
      );
      
      if (response.success && response.data) {
        // Agregar mensaje a la lista local
        const sentMessage: WhatsAppMessage = {
          id: response.data.messageId,
          key: { id: response.data.messageId, remoteJid: selectedChat.id, fromMe: true },
          message: { imageMessage: { caption: newMessage.trim() } },
          messageTimestamp: response.data.timestamp,
          status: 'sent',
          fromMe: true,
          chatId: selectedChat.id,
          senderId: userId,
          senderName: 'Tú',
          body: newMessage.trim() || 'Archivo enviado',
          type: response.data.mediaType,
          hasMedia: true,
          media: {
            mimetype: file.type,
            filename: file.name,
            caption: newMessage.trim()
          }
        };

        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        setShowAttachmentMenu(false);
        
        if (onMessageSent) {
          onMessageSent(sentMessage);
        }
      } else {
        throw new Error(response.message || 'Error al enviar archivo');
      }
    } catch (error) {
      console.error('Error sending file:', error);
      setError('Error al enviar el archivo');
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      sendFile(file);
    }
  };

  // Buscar mensajes
  const searchMessages = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await apiService.searchMessages(searchQuery);
      
      if (response.success && response.data) {
        console.log('Search results:', response.data);
        // Aquí podrías mostrar los resultados de búsqueda en un modal o panel
      } else {
        throw new Error(response.message || 'Error al buscar mensajes');
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      setError('Error al buscar mensajes');
    }
  };

  // Marcar mensajes como leídos
  const markAsRead = async (chatId: string) => {
    try {
      await apiService.markAsRead(chatId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Obtener icono de estado del mensaje
  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Obtener icono de tipo de mensaje
  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Mic className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Formatear timestamp
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) {
      return '--:--';
    }
    
    try {
      let date: Date;
      
      // Los timestamps de WhatsApp suelen estar en segundos desde 1970
      // pero algunos pueden estar en milisegundos
      if (timestamp > 1000000000000) {
        // Timestamp en milisegundos
        date = new Date(timestamp);
      } else if (timestamp > 1000000000) {
        // Timestamp en segundos (muy grande, probablemente incorrecto)
        // Convertir a milisegundos dividiendo por 1000 si es muy grande
        date = new Date(timestamp / 1000);
      } else {
        // Timestamp en segundos normal
        date = new Date(timestamp * 1000);
      }
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return '--:--';
      }
      
      // Verificar si la fecha es razonable (no en el futuro lejano)
      const now = new Date();
      const yearDiff = date.getFullYear() - now.getFullYear();
      if (yearDiff > 10 || yearDiff < -10) {
        console.warn('Timestamp seems incorrect (too far in future/past):', timestamp, date);
        return '--:--';
      }
      
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return '--:--';
    }
  };

  // Obtener datos del contacto/grupo
  const fetchContactData = async () => {
    if (!selectedChat) return;
    
    try {
      setIsUpdatingData(true);
      
      const response = await apiService.getContactData(selectedChat.id);
      
      if (response.success && response.data) {
        const updatedData = response.data;
        
        // Actualizar el chat con los nuevos datos
        setSelectedChat(prev => prev ? {
          ...prev,
          name: updatedData.name || prev.name,
          participants: updatedData.isGroup ? prev.participants : [selectedChat.id]
        } : null);
        
        onNotification?.('success', 'Datos actualizados exitosamente');
      } else {
        onNotification?.('error', 'Error al obtener datos: ' + (response.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
      onNotification?.('error', 'Error al obtener los datos del contacto/grupo');
    } finally {
      setIsUpdatingData(false);
    }
  };

  // Editar contacto
  const editContact = () => {
    if (!selectedChat) return;
    // Aquí podrías abrir un modal de edición o navegar a la página de contactos
    onNotification?.('info', 'Función de edición - Implementar modal o navegación');
  };

  // Bloquear/Desbloquear contacto
  const toggleBlockContact = async () => {
    if (!selectedChat) return;
    
    try {
      // Aquí implementarías la lógica de bloqueo
      onNotification?.('info', 'Función de bloqueo - Implementar lógica de bloqueo');
    } catch (error) {
      console.error('Error toggling block:', error);
      onNotification?.('error', 'Error al cambiar el estado de bloqueo');
    }
  };

  // Eliminar contacto
  const deleteContact = async () => {
    if (!selectedChat) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        // Aquí implementarías la lógica de eliminación
        onNotification?.('info', 'Función de eliminación - Implementar lógica de eliminación');
      } catch (error) {
        console.error('Error deleting contact:', error);
        onNotification?.('error', 'Error al eliminar el contacto');
      }
    }
  };

  if (!isConnected || !wsConnected) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Conecta WhatsApp para gestionar mensajes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Lista de chats */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header de chats */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
            <button
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat);
                    markAsRead(chat.id);
                  }}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chat.name}
                        </h3>
                        {chat.isGroup && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Grupo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.lastMessage?.body || 'Sin mensajes'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs text-gray-400">
                        {chat.lastMessage ? formatTimestamp(chat.lastMessage.messageTimestamp) : ''}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedChat.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedChat.isGroup ? 'Grupo' : 'Conversación individual'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
                    <Video className="w-5 h-5" />
                  </button>
                  
                  {/* Menú de opciones */}
                  <div className="relative chat-menu-container">
                    <button
                      onClick={() => setShowChatMenu(!showChatMenu)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {showChatMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              fetchContactData();
                              setShowChatMenu(false);
                            }}
                            disabled={isUpdatingData}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                            <span>{isUpdatingData ? 'Obteniendo datos...' : 'Obtener datos'}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              editContact();
                              setShowChatMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Editar contacto</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              toggleBlockContact();
                              setShowChatMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Bloquear contacto</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              deleteContact();
                              setShowChatMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar contacto</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.fromMe
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          {message.hasMedia && getMessageTypeIcon(message.type)}
                          <span className="text-xs opacity-75">
                            {message.senderName}
                          </span>
                        </div>
                        <p className="text-sm">{message.body}</p>
                        {message.media && (
                          <div className="mt-2">
                            <p className="text-xs opacity-75">
                              {message.media.filename || 'Archivo'}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs opacity-75">
                            {formatTimestamp(message.messageTimestamp)}
                          </span>
                          {message.fromMe && getMessageStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Menú de archivos adjuntos */}
              {showAttachmentMenu && (
                <div className="absolute bottom-16 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Imagen</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Documento</span>
                  </button>
                </div>
              )}

              {/* Input oculto para archivos */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Selecciona un chat para comenzar</p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppMessageManager;
