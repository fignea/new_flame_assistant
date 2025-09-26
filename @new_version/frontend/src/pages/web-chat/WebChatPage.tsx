import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical,
  Send,
  Phone,
  Mail,
  MapPin,
  Star,
  Tag,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Archive,
  Trash2,
  Settings,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api.service';
import { useNavigate } from 'react-router-dom';

interface WebConversation {
  id: number;
  user_id: number;
  visitor_id: number;
  title: string;
  status: 'active' | 'closed' | 'pending' | 'resolved';
  assigned_to?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  metadata: Record<string, any>;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  visitor?: {
    id: number;
    user_id: number;
    session_id: string;
    name?: string;
    email?: string;
    phone?: string;
    is_online: boolean;
    last_seen: string;
    created_at: string;
  };
  assigned_user?: {
    id: number;
    email: string;
    name: string;
    password: string;
    created_at: string;
    updated_at: string;
  };
  unread_count?: number;
}

interface WebMessage {
  id: number;
  conversation_id: number;
  sender_type: 'visitor' | 'agent' | 'system';
  sender_id?: number;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji' | 'typing';
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  sender_name?: string;
}

export const WebChatPage: React.FC = () => {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<WebConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WebConversation | null>(null);
  const [messages, setMessages] = useState<WebMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    total_conversations: 0,
    active_conversations: 0,
    online_visitors: 0,
    total_messages: 0
  });

  // Cargar conversaciones
  const loadConversations = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.getWebChatConversations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50
      });
      
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar mensajes de una conversación
  const loadMessages = async (conversationId: number) => {
    setIsLoadingMessages(true);
    try {
      const response = await apiService.getWebChatMessages(conversationId.toString(), {
        limit: 100
      });
      
      if (response.success && response.data) {
        setMessages(response.data);
        // Marcar mensajes como leídos
        await apiService.markWebChatMessagesAsRead(conversationId.toString());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const response = await apiService.getWebChatStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      const response = await apiService.sendWebChatMessage({
        conversation_id: selectedConversation.id,
        content: newMessage.trim(),
        message_type: 'text'
      });

      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        // Actualizar última actividad de la conversación
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Actualizar conversación
  const updateConversation = async (conversationId: number, updates: any) => {
    try {
      const response = await apiService.updateWebChatConversation(conversationId.toString(), updates);
      if (response.success) {
        loadConversations();
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(response.data);
        }
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  // Seleccionar conversación
  const selectConversation = (conversation: WebConversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.visitor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.visitor?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || conv.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Scroll automático a los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      loadStats();
    }
  }, [isAuthenticated, statusFilter, priorityFilter]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-100';
      case 'pending': return 'text-yellow-500 bg-yellow-100';
      case 'resolved': return 'text-blue-500 bg-blue-100';
      case 'closed': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-100';
      case 'high': return 'text-orange-500 bg-orange-100';
      case 'normal': return 'text-blue-500 bg-blue-100';
      case 'low': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Debes iniciar sesión para acceder al chat web
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      <div className="flex h-screen">
        {/* Sidebar de conversaciones */}
        <div className="w-1/3 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Chat Web
              </h1>
              <button
                onClick={() => navigate('/integrations')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.active_conversations}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Activas
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.online_visitors}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Online
                </div>
              </div>
            </div>

            {/* Búsqueda y filtros */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar conversaciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </button>
                <button
                  onClick={loadConversations}
                  disabled={isLoading}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {showFilters && (
                <div className="space-y-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activas</option>
                    <option value="pending">Pendientes</option>
                    <option value="resolved">Resueltas</option>
                    <option value="closed">Cerradas</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Todas las prioridades</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                No hay conversaciones
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conversation.title}
                          </h3>
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                            {conversation.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(conversation.priority)}`}>
                            {conversation.priority}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{conversation.visitor?.name || 'Visitante'}</span>
                          <span>•</span>
                          <span>{formatTime(conversation.last_message_at)}</span>
                          {conversation.visitor?.is_online && (
                            <>
                              <span>•</span>
                              <span className="text-green-500">Online</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Área de chat */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header de la conversación */}
              <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.title}
                      </h2>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{selectedConversation.visitor?.name || 'Visitante'}</span>
                        {selectedConversation.visitor?.email && (
                          <>
                            <span>•</span>
                            <span>{selectedConversation.visitor.email}</span>
                          </>
                        )}
                        {selectedConversation.visitor?.is_online && (
                          <>
                            <span>•</span>
                            <span className="text-green-500">Online</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateConversation(selectedConversation.id, { status: e.target.value })}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm"
                    >
                      <option value="active">Activa</option>
                      <option value="pending">Pendiente</option>
                      <option value="resolved">Resuelta</option>
                      <option value="closed">Cerrada</option>
                    </select>
                    <select
                      value={selectedConversation.priority}
                      onChange={(e) => updateConversation(selectedConversation.id, { priority: e.target.value })}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm"
                    >
                      <option value="low">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                    <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    No hay mensajes en esta conversación
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_type === 'agent'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.sender_type === 'agent' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              <div className="bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendMessage();
                      }
                    }}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Selecciona una conversación
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Elige una conversación del panel lateral para comenzar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
