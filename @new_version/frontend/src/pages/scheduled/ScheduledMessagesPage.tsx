import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Calendar,
  Users,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  Search,
  MoreVertical,
  Send,
  Eye
} from 'lucide-react';
import { apiService, Contact, ScheduledMessage } from '../../services/api.service';

interface ScheduledMessageWithContact extends ScheduledMessage {
  contact_name?: string;
  contact_phone?: string;
}

export const ScheduledMessagesPage: React.FC = () => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessageWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessageWithContact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    contactId: '',
    content: '',
    messageType: 'text' as 'text' | 'image' | 'file',
    scheduledTime: '',
    scheduledDate: ''
  });

  const statusOptions = [
    { value: 'all', label: 'Todos', color: 'gray' },
    { value: 'pending', label: 'Pendientes', color: 'yellow' },
    { value: 'sent', label: 'Enviados', color: 'green' },
    { value: 'failed', label: 'Fallidos', color: 'red' },
    { value: 'cancelled', label: 'Cancelados', color: 'gray' }
  ];

  // Cargar mensajes programados
  const loadScheduledMessages = async () => {
    try {
      setLoading(true);
      const response = await apiService.getScheduledMessages();
      if (response.success && response.data) {
        setScheduledMessages(response.data);
      }
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar contactos
  const loadContacts = async () => {
    try {
      const response = await apiService.getContacts({ page: 1, limit: 1000 });
      if (response.success && response.data) {
        const data = response.data as any;
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  useEffect(() => {
    loadScheduledMessages();
    loadContacts();
  }, []);

  // Filtrar mensajes
  const filteredMessages = scheduledMessages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Crear mensaje programado
  const handleCreateMessage = async () => {
    if (!formData.contactId || !formData.content || !formData.scheduledDate || !formData.scheduledTime) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const scheduledTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      
      const response = await apiService.createScheduledMessage({
        contactId: parseInt(formData.contactId),
        content: formData.content,
        messageType: formData.messageType,
        scheduledTime
      });

      if (response.success) {
        setShowCreateModal(false);
        resetForm();
        loadScheduledMessages();
      } else {
        alert('Error al crear el mensaje programado');
      }
    } catch (error) {
      console.error('Error creating scheduled message:', error);
      alert('Error al crear el mensaje programado');
    }
  };

  // Actualizar mensaje programado
  const handleUpdateMessage = async () => {
    if (!editingMessage || !formData.contactId || !formData.content || !formData.scheduledDate || !formData.scheduledTime) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const scheduledTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      
      const response = await apiService.updateScheduledMessage(editingMessage.id, {
        content: formData.content,
        messageType: formData.messageType,
        scheduledTime
      });

      if (response.success) {
        setShowCreateModal(false);
        setEditingMessage(null);
        resetForm();
        loadScheduledMessages();
      } else {
        alert('Error al actualizar el mensaje programado');
      }
    } catch (error) {
      console.error('Error updating scheduled message:', error);
      alert('Error al actualizar el mensaje programado');
    }
  };

  // Eliminar mensaje programado
  const handleDeleteMessage = async (id: string) => {
    try {
      const response = await apiService.deleteScheduledMessage(id);
      if (response.success) {
        setShowDeleteConfirm(null);
        loadScheduledMessages();
      } else {
        alert('Error al eliminar el mensaje programado');
      }
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      alert('Error al eliminar el mensaje programado');
    }
  };

  // Cancelar mensaje programado
  const handleCancelMessage = async (id: string) => {
    try {
      const response = await apiService.cancelScheduledMessage(id);
      if (response.success) {
        loadScheduledMessages();
      } else {
        alert('Error al cancelar el mensaje programado');
      }
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      alert('Error al cancelar el mensaje programado');
    }
  };

  // Editar mensaje
  const handleEditMessage = (message: ScheduledMessageWithContact) => {
    setEditingMessage(message);
    const scheduledDate = new Date(message.scheduled_time).toISOString().split('T')[0];
    const scheduledTime = new Date(message.scheduled_time).toTimeString().slice(0, 5);
    
    setFormData({
      contactId: message.contact_id.toString(),
      content: message.content,
      messageType: message.message_type as 'text' | 'image' | 'file',
      scheduledTime,
      scheduledDate
    });
    setShowCreateModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      contactId: '',
      content: '',
      messageType: 'text',
      scheduledTime: '',
      scheduledDate: ''
    });
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'sent': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Obtener texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'sent': return 'Enviado';
      case 'failed': return 'Fallido';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  // Obtener icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'sent': return CheckCircle;
      case 'failed': return AlertCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
              Mensajes Programados
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Programa y gestiona el envío automático de mensajes
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingMessage(null);
              setShowCreateModal(true);
            }}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Programar Mensaje</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar mensajes o contactos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de mensajes programados */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando mensajes programados...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay mensajes programados
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Programa tu primer mensaje para comenzar a automatizar tu comunicación
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Programar Primer Mensaje
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => {
              const StatusIcon = getStatusIcon(message.status);
              return (
                <div
                  key={message.id}
                  className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50 hover:border-purple-300/50 dark:hover:border-purple-400/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {message.contact_name || 'Contacto desconocido'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {message.contact_phone || 'Sin teléfono'}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(message.scheduled_time)}</span>
                        </div>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{getStatusText(message.status)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Send className="w-4 h-4" />
                          <span className="capitalize">{message.message_type}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {message.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleEditMessage(message)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelMessage(message.id.toString())}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(message.id.toString())}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de crear/editar mensaje */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-2xl w-full border border-gray-200/50 dark:border-dark-border/50 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingMessage ? 'Editar Mensaje Programado' : 'Programar Nuevo Mensaje'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMessage(null);
                    resetForm();
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Seleccionar contacto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contacto
                  </label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} {contact.phone_number ? `(${contact.phone_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contenido del mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contenido del Mensaje
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Escribe el mensaje que quieres programar..."
                    required
                  />
                </div>

                {/* Tipo de mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Mensaje
                  </label>
                  <select
                    value={formData.messageType}
                    onChange={(e) => setFormData({ ...formData, messageType: e.target.value as 'text' | 'image' | 'file' })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="file">Archivo</option>
                  </select>
                </div>

                {/* Fecha y hora programada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMessage(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingMessage ? handleUpdateMessage : handleCreateMessage}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  {editingMessage ? 'Actualizar' : 'Programar'} Mensaje
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  ¿Eliminar Mensaje Programado?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Esta acción no se puede deshacer. El mensaje programado será eliminado permanentemente.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(showDeleteConfirm)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-600 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
