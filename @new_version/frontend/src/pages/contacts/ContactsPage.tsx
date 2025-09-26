import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  MessageCircle, 
  Phone, 
  Mail, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Users as UsersIcon,
  Eye,
  Send,
  X
} from 'lucide-react';
import { apiService, Contact, PaginatedResponse } from '../../services/api.service';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'groups'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const itemsPerPage = 20;

  // Cargar contactos
  const loadContacts = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await apiService.getContacts({
        page,
        limit: itemsPerPage,
        search: search || undefined
      });

      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Contact>;
        setContacts(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalContacts(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar contactos con WhatsApp
  const syncContactsWithWhatsApp = async () => {
    try {
      setLoading(true);
      // Aquí se podría implementar una llamada específica para sincronizar contactos
      // Por ahora, simplemente recargamos los contactos
      await loadContacts(currentPage, searchTerm);
    } catch (error) {
      console.error('Error syncing contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar envío de mensaje
  const handleSendMessage = (contact: Contact) => {
    setSelectedContact(contact);
    setShowSendMessageModal(true);
    setMessageText('');
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!selectedContact || !messageText.trim()) return;

    try {
      setSendingMessage(true);
      const response = await apiService.sendMessage({
        contactId: selectedContact.whatsapp_id,
        content: messageText.trim(),
        messageType: 'text'
      });

      if (response.success) {
        setShowSendMessageModal(false);
        setMessageText('');
        setSelectedContact(null);
        // Mostrar notificación de éxito
        alert('Mensaje enviado exitosamente');
      } else {
        alert('Error al enviar el mensaje: ' + (response.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  // Manejar edición de contacto
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  // Actualizar contacto
  const updateContact = async (updatedData: Partial<Contact>) => {
    if (!editingContact) return;

    try {
      // Aquí se implementaría la llamada a la API para actualizar el contacto
      // Por ahora, actualizamos localmente
      setContacts(prev => prev.map(contact => 
        contact.id === editingContact.id 
          ? { ...contact, ...updatedData }
          : contact
      ));
      setShowEditModal(false);
      setEditingContact(null);
      alert('Contacto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Error al actualizar el contacto');
    }
  };

  // Efecto para cargar contactos al montar el componente
  useEffect(() => {
    loadContacts(currentPage, searchTerm);
  }, [currentPage]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        loadContacts(1, searchTerm);
        setCurrentPage(1);
      } else {
        loadContacts(1);
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Filtrar contactos por tipo
  const filteredContacts = (contacts || []).filter(contact => {
    if (filterType === 'individual') return !contact.is_group;
    if (filterType === 'groups') return contact.is_group;
    return true;
  });

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Obtener iniciales del nombre
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Manejar búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Manejar ver detalles del contacto
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDetails(true);
  };

  // Renderizar paginación
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            i === currentPage
              ? 'bg-green-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalContacts)} de {totalContacts} contactos
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pages}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                Gestión de Contactos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Administra tu base de contactos de WhatsApp
              </p>
            </div>
            <button
              onClick={syncContactsWithWhatsApp}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>
        
        {/* Filtros y búsqueda */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar contactos por nombre o número..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark-card dark:text-white"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('individual')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterType === 'individual'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Individuales
              </button>
              <button
                onClick={() => setFilterType('groups')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterType === 'groups'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <UsersIcon className="w-4 h-4 inline mr-2" />
                Grupos
              </button>
            </div>
          </div>
        </div>

        {/* Lista de contactos */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando contactos...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron contactos
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay contactos disponibles'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <div className="relative">
                          {contact.avatar_url ? (
                            <img
                              src={contact.avatar_url}
                              alt={contact.name || 'Contacto'}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                              contact.is_group 
                                ? 'bg-blue-500' 
                                : 'bg-green-500'
                            }`}>
                              {getInitials(contact.name)}
                            </div>
                          )}
                          {contact.is_group && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <UsersIcon className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Información del contacto */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {contact.name || 'Sin nombre'}
                            </h3>
                            {contact.is_group && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                Grupo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            {contact.phone_number && (
                              <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4" />
                                <span className="text-sm">{contact.phone_number}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">
                                Agregado {formatDate(contact.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewContact(contact)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendMessage(contact)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Enviar mensaje"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditContact(contact)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar contacto"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && renderPagination()}
            </>
          )}
        </div>

        {/* Modal de detalles del contacto */}
        {showContactDetails && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Detalles del Contacto
                  </h2>
                  <button
                    onClick={() => setShowContactDetails(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center mb-6">
                  {selectedContact.avatar_url ? (
                    <img
                      src={selectedContact.avatar_url}
                      alt={selectedContact.name || 'Contacto'}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-4 ${
                      selectedContact.is_group 
                        ? 'bg-blue-500' 
                        : 'bg-green-500'
                    }`}>
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedContact.name || 'Sin nombre'}
                  </h3>
                  
                  {selectedContact.is_group && (
                    <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      Grupo de WhatsApp
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedContact.phone_number && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Número de teléfono</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedContact.phone_number}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
                    <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">ID de WhatsApp</p>
                      <p className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                        {selectedContact.whatsapp_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de creación</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(selectedContact.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => handleSendMessage(selectedContact)}
                    className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
                    Enviar Mensaje
                  </button>
                  <button
                    onClick={() => setShowContactDetails(false)}
                    className="flex-1 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal de envío de mensaje */}
        {showSendMessageModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Enviar Mensaje
                  </h2>
                  <button
                    onClick={() => setShowSendMessageModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Enviar mensaje a:
                  </p>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      selectedContact.is_group ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      {getInitials(selectedContact.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedContact.name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedContact.phone_number || selectedContact.whatsapp_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensaje
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full p-3 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark-card dark:text-white resize-none"
                    rows={4}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSendMessageModal(false)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {sendingMessage ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición de contacto */}
        {showEditModal && editingContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Editar Contacto
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      defaultValue={editingContact.name || ''}
                      onChange={(e) => setEditingContact(prev => prev ? {...prev, name: e.target.value} : null)}
                      className="w-full p-3 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark-card dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Número de teléfono
                    </label>
                    <input
                      type="text"
                      defaultValue={editingContact.phone_number || ''}
                      onChange={(e) => setEditingContact(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                      className="w-full p-3 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark-card dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      URL del avatar
                    </label>
                    <input
                      type="url"
                      defaultValue={editingContact.avatar_url || ''}
                      onChange={(e) => setEditingContact(prev => prev ? {...prev, avatar_url: e.target.value} : null)}
                      className="w-full p-3 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark-card dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => updateContact(editingContact)}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Guardar Cambios
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
