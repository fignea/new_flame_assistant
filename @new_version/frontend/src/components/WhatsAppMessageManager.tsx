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
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api.service';

interface WhatsAppMessage {
  id: string;
  key: any;
  message: any;
  messageTimestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  fromMe: boolean;
  chatId: string;
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
}

const WhatsAppMessageManager: React.FC<WhatsAppMessageManagerProps> = ({
  userId,
  isConnected,
  onMessageSent,
  onMessageReceived
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar chats al conectar
  useEffect(() => {
    if (isConnected) {
      loadChats();
    }
  }, [isConnected]);

  // Cargar mensajes cuando se selecciona un chat
  useEffect(() => {
    if (selectedChat && isConnected) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat, isConnected]);

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

    setIsSending(true);
    try {
      const response = await apiService.sendMessage({
        contactId: selectedChat.id,
        content: newMessage.trim(),
        messageType: 'text'
      });
      
      if (response.success && response.data) {
        // Agregar mensaje a la lista local
        const sentMessage: WhatsAppMessage = {
          id: response.data.messageId,
          key: { id: response.data.messageId, remoteJid: selectedChat.id, fromMe: true },
          message: { conversation: newMessage },
          messageTimestamp: response.data.timestamp,
          status: 'sent',
          fromMe: true,
          chatId: selectedChat.id,
          senderId: userId,
          senderName: 'Tú',
          body: newMessage.trim(),
          type: 'text',
          hasMedia: false
        };

        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        if (onMessageSent) {
          onMessageSent(sentMessage);
        }
      } else {
        throw new Error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al enviar el mensaje');
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
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isConnected) {
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
