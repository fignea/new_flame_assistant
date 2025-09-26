import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical, 
  Send, 
  Bot, 
  Paperclip, 
  Smile, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  Copy,
  Download,
  Settings,
  Zap,
  MessageCircle,
  Mail,
  Calendar,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Mic,
  Video
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api.service';
import { useSocketIO } from '../../hooks/useSocketIO';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'agent';
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: string;
    fileType?: string;
  };
}

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

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  status: 'active' | 'pending' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAssistant?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: string[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const InboxPage: React.FC = () => {
  const { isAuthenticated, user } = useApp();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [whatsappChats, setWhatsappChats] = useState<WhatsAppChat[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber?: string;
    userName?: string;
  } | null>(null);
  const [showWhatsAppOnly, setShowWhatsAppOnly] = useState(false);

  // Configurar Socket.IO para recibir mensajes en tiempo real
  const { isConnected: wsConnected, joinUserRoom, leaveUserRoom, reconnectWithNewToken } = useSocketIO({
    onMessage: (message) => {
      console.log('Socket.IO message received:', message);
      
      if (message.type === 'whatsapp:message') {
        // Agregar nuevo mensaje a la lista
        const newMessage = message.data;
        setWhatsappMessages(prev => [...prev, newMessage]);
        
        // Actualizar la lista de chats si es necesario
        if (newMessage.chatId) {
          setWhatsappChats(prev => {
            const existingChat = prev.find(chat => chat.id === newMessage.chatId);
            if (existingChat) {
              // Actualizar el chat existente
              return prev.map(chat => 
                chat.id === newMessage.chatId 
                  ? { ...chat, lastMessage: newMessage.content, lastMessageTime: new Date(newMessage.timestamp * 1000) }
                  : chat
              );
            } else {
              // Crear nuevo chat si no existe
              const newChat = {
                id: newMessage.chatId,
                name: newMessage.senderName || newMessage.chatId.split('@')[0],
                phoneNumber: newMessage.chatId.includes('@s.whatsapp.net') ? newMessage.chatId.split('@')[0] : undefined,
                lastMessage: newMessage.content,
                lastMessageTime: new Date(newMessage.timestamp * 1000),
                unreadCount: 0,
                isGroup: newMessage.chatId.includes('@g.us'),
                avatar: undefined
              };
              return [newChat, ...prev];
            }
          });
        }
      } else if (message.type === 'whatsapp:connected') {
        // Actualizar estado de conexión
        setWhatsappStatus(prev => ({
          ...prev,
          isConnected: true,
          isAuthenticated: true,
          phoneNumber: message.data.phoneNumber,
          userName: message.data.userName
        }));
      } else if (message.type === 'whatsapp:disconnected') {
        // Actualizar estado de desconexión
        setWhatsappStatus(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false
        }));
      }
    },
    onConnect: () => {
      console.log('Socket.IO connected');
      if (user?.id) {
        joinUserRoom(user.id.toString());
      }
    },
    onDisconnect: () => {
      console.log('Socket.IO disconnected');
    },
    onError: (error) => {
      console.error('Socket.IO error:', error);
    }
  });

  // Cargar estado de WhatsApp al montar el componente
  useEffect(() => {
    if (isAuthenticated) {
      checkWhatsAppStatus();
      // Reconectar Socket.IO cuando el usuario se autentique
      reconnectWithNewToken();
    }
  }, [isAuthenticated]);

  // Cargar chats de WhatsApp cuando esté conectado
  useEffect(() => {
    if (whatsappStatus?.isConnected) {
      loadWhatsAppChats();
    }
  }, [whatsappStatus?.isConnected]);

  // Cargar mensajes cuando se selecciona un chat de WhatsApp
  useEffect(() => {
    if (selectedConversation && whatsappStatus?.isConnected) {
      // Si es un chat de WhatsApp, extraer el ID real del chat
      const chatId = selectedConversation.startsWith('whatsapp_') 
        ? selectedConversation.replace('whatsapp_', '') 
        : selectedConversation;
      loadWhatsAppMessages(chatId);
    }
  }, [selectedConversation, whatsappStatus?.isConnected]);

  // Verificar estado de WhatsApp
  const checkWhatsAppStatus = async () => {
    try {
      const response = await apiService.getWhatsAppStatus();
      if (response.success && response.data) {
        setWhatsappStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };

  // Cargar chats de WhatsApp
  const loadWhatsAppChats = async () => {
    try {
      setIsLoadingWhatsApp(true);
      const response = await apiService.getWhatsAppChatsNew();
      if (response.success && response.data) {
        setWhatsappChats(response.data);
      }
    } catch (error) {
      console.error('Error loading WhatsApp chats:', error);
    } finally {
      setIsLoadingWhatsApp(false);
    }
  };

  // Cargar mensajes de WhatsApp
  const loadWhatsAppMessages = async (chatId: string) => {
    try {
      setIsLoadingWhatsApp(true);
      const response = await apiService.getWhatsAppMessagesNew(chatId, { limit: 50 });
      if (response.success && response.data) {
        // Filtrar mensajes de status y grupos
        const filteredMessages = (response.data.messages || []).filter((message: WhatsAppMessage) => {
          const isStatus = isStatusMessage(message);
          const isGroup = isGroupMessage(message.chatId);
          
          if (isStatus) {
            console.log('🚫 Filtering status message:', message.body || message.message?.conversation);
          }
          if (isGroup) {
            console.log('🚫 Filtering group message:', message.chatId);
          }
          
          return !isStatus && !isGroup;
        });
        setWhatsappMessages(filteredMessages);
      }
    } catch (error) {
      console.error('Error loading WhatsApp messages:', error);
    } finally {
      setIsLoadingWhatsApp(false);
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

  // Enviar mensaje de WhatsApp
  const sendWhatsAppMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !whatsappStatus?.isConnected || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      // Si es un chat de WhatsApp, extraer el ID real del chat
      const chatId = selectedConversation.startsWith('whatsapp_') 
        ? selectedConversation.replace('whatsapp_', '') 
        : selectedConversation;
      
      const response = await apiService.sendMessage({
        contactId: chatId,
        content: newMessage.trim(),
        messageType: 'text'
      });
      if (response.success && response.data) {
        // Agregar mensaje a la lista local con el estado correcto del backend
        const sentMessage: WhatsAppMessage = {
          id: response.data.message?.id || response.data.messageId,
          key: { id: response.data.message?.id || response.data.messageId, remoteJid: chatId, fromMe: true },
          message: { conversation: newMessage },
          messageTimestamp: response.data.message?.timestamp || response.data.timestamp || Date.now() / 1000,
          status: response.data.message?.status || 'delivered', // Usar el estado del backend
          fromMe: true,
          chatId: chatId,
          senderId: user?.id || '',
          senderName: 'Tú',
          body: newMessage.trim(),
          type: 'text',
          hasMedia: false
        };

        setWhatsappMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'María González',
      contactPhone: '+34 612 345 678',
      contactEmail: 'maria.gonzalez@email.com',
      platform: 'whatsapp',
      status: 'active',
      priority: 'high',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: 'Hola, me interesa saber más sobre sus productos',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 3,
      tags: ['ventas', 'productos', 'urgente'],
      messages: [
        {
          id: '1',
          content: 'Hola, me interesa saber más sobre sus productos',
          sender: 'user',
          timestamp: '2024-01-20T14:25:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '2',
          content: '¡Hola María! Me da mucho gusto saber de tu interés en nuestros productos. ¿Hay algún producto específico que te interese?',
          sender: 'assistant',
          timestamp: '2024-01-20T14:26:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '3',
          content: 'Sí, me interesan especialmente los productos de tecnología',
          sender: 'user',
          timestamp: '2024-01-20T14:28:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '4',
          content: 'Perfecto, tenemos una excelente línea de productos tecnológicos. ¿Te gustaría que te envíe nuestro catálogo?',
          sender: 'assistant',
          timestamp: '2024-01-20T14:30:00Z',
          type: 'text',
          status: 'delivered'
        }
      ],
      createdAt: '2024-01-20T14:25:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    {
      id: '2',
      contactName: 'Carlos Ruiz',
      contactPhone: '+34 698 765 432',
      platform: 'whatsapp',
      status: 'pending',
      priority: 'medium',
      assignedAssistant: 'Soporte Técnico',
      lastMessage: 'Tengo un problema con mi pedido',
      lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Ayer
      unreadCount: 1,
      tags: ['soporte', 'pedido', 'problema'],
      messages: [
        {
          id: '5',
          content: 'Tengo un problema con mi pedido',
          sender: 'user',
          timestamp: '2024-01-20T13:40:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '6',
          content: 'Hola Carlos, lamento escuchar que tienes un problema con tu pedido. ¿Podrías contarme más detalles?',
          sender: 'assistant',
          timestamp: '2024-01-20T13:45:00Z',
          type: 'text',
          status: 'delivered'
        }
      ],
      createdAt: '2024-01-20T13:40:00Z',
      updatedAt: '2024-01-20T13:45:00Z'
    },
    {
      id: '3',
      contactName: 'Ana Martín',
      contactPhone: '+34 611 222 333',
      platform: 'facebook',
      status: 'resolved',
      priority: 'low',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: 'Gracias por la ayuda',
      lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Hace 3 días
      unreadCount: 0,
      tags: ['resuelto', 'agradecimiento'],
      messages: [
        {
          id: '7',
          content: '¿Cuáles son sus horarios de atención?',
          sender: 'user',
          timestamp: '2024-01-19T16:15:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '8',
          content: 'Nuestros horarios de atención son de lunes a viernes de 9:00 AM a 6:00 PM',
          sender: 'assistant',
          timestamp: '2024-01-19T16:18:00Z',
          type: 'text',
          status: 'read'
        },
        {
          id: '9',
          content: 'Gracias por la ayuda',
          sender: 'user',
          timestamp: '2024-01-19T16:20:00Z',
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: '2024-01-19T16:15:00Z',
      updatedAt: '2024-01-19T16:20:00Z'
    },
    {
      id: '4',
      contactName: 'Roberto Silva',
      contactPhone: '+34 655 123 456',
      platform: 'whatsapp',
      status: 'active',
      priority: 'urgent',
      assignedAssistant: 'Soporte Técnico',
      lastMessage: 'URGENTE: Mi sistema no funciona',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Hace 2 horas
      unreadCount: 5,
      tags: ['urgente', 'sistema', 'fallo'],
      messages: [
        {
          id: '10',
          content: 'URGENTE: Mi sistema no funciona',
          sender: 'user',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      contactName: 'Laura Fernández',
      contactPhone: '+34 611 999 888',
      contactEmail: 'laura.fernandez@email.com',
      platform: 'facebook',
      status: 'pending',
      priority: 'medium',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: '¿Tienen descuentos para estudiantes?',
      lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Hace 4 horas
      unreadCount: 2,
      tags: ['descuentos', 'estudiantes', 'precio'],
      messages: [
        {
          id: '11',
          content: '¿Tienen descuentos para estudiantes?',
          sender: 'user',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '6',
      contactName: 'Miguel Torres',
      contactPhone: '+34 633 444 555',
      platform: 'whatsapp',
      status: 'resolved',
      priority: 'low',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: 'Perfecto, muchas gracias',
      lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Hace 2 días
      unreadCount: 0,
      tags: ['resuelto', 'agradecimiento'],
      messages: [
        {
          id: '12',
          content: '¿Cuál es el tiempo de entrega?',
          sender: 'user',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '13',
          content: 'El tiempo de entrega es de 3-5 días hábiles',
          sender: 'assistant',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '14',
          content: 'Perfecto, muchas gracias',
          sender: 'user',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString()
    },
    {
      id: '7',
      contactName: 'Sofia Martínez',
      contactPhone: '+34 677 888 999',
      platform: 'instagram',
      status: 'active',
      priority: 'high',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: 'Me interesa el producto premium',
      lastMessageTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // Hace 6 horas
      unreadCount: 1,
      tags: ['premium', 'producto', 'interés'],
      messages: [
        {
          id: '15',
          content: 'Me interesa el producto premium',
          sender: 'user',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '8',
      contactName: 'David López',
      contactPhone: '+34 644 777 333',
      platform: 'whatsapp',
      status: 'pending',
      priority: 'medium',
      assignedAssistant: 'Soporte Técnico',
      lastMessage: 'No puedo acceder a mi cuenta',
      lastMessageTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // Hace 8 horas
      unreadCount: 3,
      tags: ['cuenta', 'acceso', 'problema'],
      messages: [
        {
          id: '16',
          content: 'No puedo acceder a mi cuenta',
          sender: 'user',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '9',
      contactName: 'Elena García',
      contactPhone: '+34 666 555 444',
      contactEmail: 'elena.garcia@email.com',
      platform: 'facebook',
      status: 'resolved',
      priority: 'low',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: 'Excelente servicio, los recomiendo',
      lastMessageTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // Hace 4 días
      unreadCount: 0,
      tags: ['recomendación', 'servicio', 'satisfacción'],
      messages: [
        {
          id: '17',
          content: '¿Cómo puedo cancelar mi pedido?',
          sender: 'user',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '18',
          content: 'Puedes cancelar tu pedido desde tu panel de usuario',
          sender: 'assistant',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '19',
          content: 'Excelente servicio, los recomiendo',
          sender: 'user',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
    },
    {
      id: '10',
      contactName: 'Javier Ruiz',
      contactPhone: '+34 699 111 222',
      platform: 'whatsapp',
      status: 'active',
      priority: 'high',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: '¿Tienen garantía extendida?',
      lastMessageTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Hace 12 horas
      unreadCount: 2,
      tags: ['garantía', 'extendida', 'consulta'],
      messages: [
        {
          id: '20',
          content: '¿Tienen garantía extendida?',
          sender: 'user',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '11',
      contactName: 'Carmen Vega',
      contactPhone: '+34 655 666 777',
      platform: 'instagram',
      status: 'pending',
      priority: 'medium',
      assignedAssistant: 'Asistente de Ventas',
      lastMessage: '¿Hacen envíos internacionales?',
      lastMessageTime: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // Hace 18 horas
      unreadCount: 1,
      tags: ['envíos', 'internacional', 'logística'],
      messages: [
        {
          id: '21',
          content: '¿Hacen envíos internacionales?',
          sender: 'user',
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '12',
      contactName: 'Antonio Morales',
      contactPhone: '+34 633 222 111',
      platform: 'whatsapp',
      status: 'resolved',
      priority: 'low',
      assignedAssistant: 'Soporte Técnico',
      lastMessage: 'Problema resuelto, gracias',
      lastMessageTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Hace 5 días
      unreadCount: 0,
      tags: ['resuelto', 'problema', 'agradecimiento'],
      messages: [
        {
          id: '22',
          content: 'Mi pedido llegó dañado',
          sender: 'user',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '23',
          content: 'Lamento mucho el inconveniente. Te enviaremos un reemplazo inmediatamente',
          sender: 'assistant',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: '24',
          content: 'Problema resuelto, gracias',
          sender: 'user',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    },
    {
      id: '13',
      contactName: 'Isabel Sánchez',
      contactPhone: '+34 677 333 444',
      contactEmail: 'isabel.sanchez@email.com',
      platform: 'facebook',
      status: 'active',
      priority: 'urgent',
      assignedAssistant: 'Soporte Técnico',
      lastMessage: 'EMERGENCIA: Sistema caído',
      lastMessageTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Hace 30 minutos
      unreadCount: 4,
      tags: ['emergencia', 'sistema', 'caído'],
      messages: [
        {
          id: '25',
          content: 'EMERGENCIA: Sistema caído',
          sender: 'user',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        }
      ],
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ]);

  // Combinar conversaciones normales con chats de WhatsApp
  const allConversations = [
    ...conversations.map(conv => ({
      ...conv,
      isWhatsApp: false,
      whatsappChat: null
    })),
    ...whatsappChats.map(chat => ({
      id: `whatsapp_${chat.id}`,
      contactName: chat.name,
      contactPhone: chat.id.includes('@g.us') ? 'Grupo' : chat.id.split('@')[0],
      platform: 'whatsapp' as const,
      status: 'active' as const,
      priority: 'medium' as const,
      assignedAssistant: 'WhatsApp Assistant',
      lastMessage: chat.lastMessage?.body || 'Sin mensajes',
      lastMessageTime: new Date(chat.lastMessage?.messageTimestamp * 1000 || chat.updatedAt).toISOString(),
      unreadCount: chat.unreadCount,
      tags: chat.isGroup ? ['grupo'] : ['individual'],
      messages: [],
      createdAt: new Date(chat.createdAt).toISOString(),
      updatedAt: new Date(chat.updatedAt).toISOString(),
      isWhatsApp: true,
      whatsappChat: chat
    }))
  ];

  const filteredConversations = allConversations.filter(conversation => {
    const matchesSearch = conversation.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || conversation.priority === priorityFilter;
    const matchesPlatform = platformFilter === 'all' || conversation.platform === platformFilter;
    const matchesWhatsApp = !showWhatsAppOnly || conversation.isWhatsApp;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesPlatform && matchesWhatsApp;
  });

  const selectedConv = allConversations.find(c => c.id === selectedConversation);
  const isWhatsAppConversation = selectedConv?.isWhatsApp || false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'resolved': return 'text-blue-500 bg-blue-500/10';
      case 'archived': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return MessageCircle;
      case 'facebook': return MessageSquare;
      case 'instagram': return MessageSquare;
      case 'telegram': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatTimeForBubble = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatWhatsAppTimestamp = (timestamp: number) => {
    try {
      // Si el timestamp es muy grande, probablemente ya está en milisegundos
      if (timestamp > 1000000000000) {
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      // Si es menor, está en segundos, convertir a milisegundos
      return new Date(timestamp * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return '--:--';
    }
  };

  const formatDateForList = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Resetear las horas para comparar solo fechas
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffInDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Hoy';
    } else if (diffInDays === 1) {
      return 'Ayer';
    } else if (diffInDays < 7) {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[date.getDay()];
    } else if (diffInDays < 14) {
      return 'Semana pasada';
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    if (isWhatsAppConversation) {
      // Enviar mensaje de WhatsApp
      sendWhatsAppMessage();
    } else {
      // Enviar mensaje normal
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sent'
      };

      setConversations(conversations.map(conv => 
        conv.id === selectedConv.id 
          ? { 
              ...conv, 
              messages: [...conv.messages, newMsg],
              lastMessage: newMessage,
              lastMessageTime: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : conv
      ));

      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      <div className="flex h-screen">
        {/* Sidebar - Lista de conversaciones */}
        <div className="w-1/3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-dark-border/50 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 dark:border-dark-border/50">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
              Inbox
            </h1>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-2 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="pending">Pendiente</option>
                <option value="resolved">Resuelto</option>
                <option value="archived">Archivado</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas las prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas las plataformas</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            {/* WhatsApp Status and Toggle */}
            {whatsappStatus && (
              <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className={`w-4 h-4 ${whatsappStatus.isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      WhatsApp {whatsappStatus.isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                    {whatsappStatus.isConnected && whatsappStatus.userName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({whatsappStatus.userName})
                      </span>
                    )}
                  </div>
                  {whatsappStatus.isConnected && (
                    <button
                      onClick={() => setShowWhatsAppOnly(!showWhatsAppOnly)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        showWhatsAppOnly 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {showWhatsAppOnly ? 'Solo WhatsApp' : 'Ver WhatsApp'}
                    </button>
                  )}
                </div>
                {whatsappStatus.isConnected && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {whatsappChats.length} chats disponibles
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay conversaciones
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No se encontraron conversaciones con ese criterio' : 'Las conversaciones aparecerán aquí'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conversation) => {
                  const PlatformIcon = getPlatformIcon(conversation.platform);
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                        selectedConversation === conversation.id
                          ? 'bg-purple-500/10 border-2 border-purple-500/50'
                          : 'bg-white/50 dark:bg-dark-card/50 hover:bg-white dark:hover:bg-dark-card border border-gray-200/50 dark:border-dark-border/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PlatformIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {conversation.contactName}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateForList(conversation.lastMessageTime)}
                              </span>
                              {conversation.unreadCount > 0 && (
                                <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                            {conversation.lastMessage}
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                              {conversation.status}
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(conversation.priority)}`}>
                              {conversation.priority}
                            </div>
                            {conversation.assignedAssistant && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Bot className="w-3 h-3" />
                                <span>{conversation.assignedAssistant}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200/50 dark:border-dark-border/50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedConv.contactName}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{selectedConv.contactPhone}</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedConv.status)}`}>
                          {selectedConv.status}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedConv.priority)}`}>
                          {selectedConv.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Bot className="w-5 h-5 text-gray-500" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoadingWhatsApp ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    <span className="ml-2 text-gray-500">Cargando mensajes...</span>
                  </div>
                ) : isWhatsAppConversation ? (
                  // Mostrar mensajes de WhatsApp
                  whatsappMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <MessageCircle className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No hay mensajes en este chat</p>
                    </div>
                  ) : (
                    whatsappMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.fromMe
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}>
                          {!message.fromMe && (
                            <div className="text-xs opacity-75 mb-1">
                              {message.senderName}
                            </div>
                          )}
                          <p className="text-sm">{message.body}</p>
                          {message.hasMedia && (
                            <div className="mt-2 flex items-center space-x-1">
                              {message.type === 'image' && <ImageIcon className="w-4 h-4" />}
                              {message.type === 'video' && <Video className="w-4 h-4" />}
                              {message.type === 'audio' && <Mic className="w-4 h-4" />}
                              {message.type === 'document' && <FileText className="w-4 h-4" />}
                              <span className="text-xs opacity-75">
                                {message.media?.filename || 'Archivo'}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">
                              {formatWhatsAppTimestamp(message.messageTimestamp)}
                            </span>
                            {message.fromMe && (
                              <div className="flex items-center space-x-1">
                                {message.status === 'sent' && <Clock className="w-3 h-3" />}
                                {message.status === 'delivered' && <CheckCircle className="w-3 h-3" />}
                                {message.status === 'read' && <CheckCircle className="w-3 h-3 text-blue-400" />}
                                {message.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  // Mostrar mensajes normales
                  selectedConv.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender === 'user'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : message.sender === 'assistant'
                          ? 'bg-purple-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-70">
                            {formatTimeForBubble(message.timestamp)}
                          </span>
                          {message.sender !== 'user' && (
                            <div className="flex items-center space-x-1">
                              {message.status === 'sent' && <Clock className="w-3 h-3" />}
                              {message.status === 'delivered' && <CheckCircle className="w-3 h-3" />}
                              {message.status === 'read' && <CheckCircle className="w-3 h-3 text-blue-400" />}
                              {message.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-200/50 dark:border-dark-border/50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
                {isWhatsAppConversation && !whatsappStatus?.isConnected && (
                  <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      ⚠️ WhatsApp no está conectado. Ve a Integraciones para conectar tu cuenta.
                    </p>
                  </div>
                )}
                
                <div className="flex items-end space-x-3">
                  <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isWhatsAppConversation 
                          ? whatsappStatus?.isConnected 
                            ? "Escribe un mensaje de WhatsApp..." 
                            : "Conecta WhatsApp para enviar mensajes"
                          : "Escribe tu mensaje..."
                      }
                      rows={1}
                      disabled={isWhatsAppConversation && !whatsappStatus?.isConnected}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Smile className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || (isWhatsAppConversation && !whatsappStatus?.isConnected)}
                    className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isWhatsAppConversation
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                {isWhatsAppConversation && whatsappStatus?.isConnected && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>Enviando a través de WhatsApp</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-24 h-24 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Selecciona una conversación
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Elige una conversación de la lista para comenzar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};