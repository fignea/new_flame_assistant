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
  X,
  Trash2,
  Ban,
  AlertTriangle,
  Edit,
  Download,
  Loader2
} from 'lucide-react';
import { apiService, Contact, PaginatedResponse } from '../../services/api.service';
import { useNotificationHelpers } from '../../components/NotificationSystem';

export const ContactsPage: React.FC = () => {
  const { showSuccess, showError } = useNotificationHelpers();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Contact | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<Contact | null>(null);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState(false);
  const [blockingContact, setBlockingContact] = useState(false);
  const [unblockingContact, setUnblockingContact] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

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
        showSuccess('Mensaje enviado', 'El mensaje se ha enviado exitosamente');
      } else {
        showError('Error al enviar mensaje', response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Error al enviar mensaje', 'No se pudo enviar el mensaje');
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
      const response = await apiService.updateContact(editingContact.id.toString(), updatedData);
      if (response.success) {
        setContacts(prev => prev.map(contact => 
          contact.id === editingContact.id 
            ? { ...contact, ...updatedData }
            : contact
        ));
        setShowEditModal(false);
        setEditingContact(null);
        showSuccess('Contacto actualizado', 'Los cambios se han guardado exitosamente');
      } else {
        showError('Error al actualizar contacto', response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      showError('Error al actualizar contacto', 'No se pudieron guardar los cambios');
    }
  };

  // Eliminar contacto
  const deleteContact = async () => {
    if (!showDeleteConfirm) return;

    try {
      setDeletingContact(true);
      const response = await apiService.deleteContact(showDeleteConfirm.id.toString());
      if (response.success) {
        setContacts(prev => prev.filter(contact => contact.id !== showDeleteConfirm.id));
        setShowDeleteConfirm(null);
        showSuccess('Contacto eliminado', 'El contacto se ha eliminado exitosamente');
      } else {
        showError('Error al eliminar contacto', response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      showError('Error al eliminar contacto', 'No se pudo eliminar el contacto');
    } finally {
      setDeletingContact(false);
    }
  };

  // Bloquear contacto
  const blockContact = async () => {
    if (!showBlockConfirm) return;

    try {
      setBlockingContact(true);
      const response = await apiService.blockContact(showBlockConfirm.id.toString());
      if (response.success) {
        setContacts(prev => prev.map(contact => 
          contact.id === showBlockConfirm.id 
            ? { ...contact, is_blocked: true }
            : contact
        ));
        setShowBlockConfirm(null);
        showSuccess('Contacto bloqueado', 'El contacto ha sido bloqueado exitosamente');
      } else {
        showError('Error al bloquear contacto', response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error blocking contact:', error);
      showError('Error al bloquear contacto', 'No se pudo bloquear el contacto');
    } finally {
      setBlockingContact(false);
    }
  };

  // Desbloquear contacto
  const unblockContact = async () => {
    if (!showUnblockConfirm) return;

    try {
      setUnblockingContact(true);
      const response = await apiService.unblockContact(showUnblockConfirm.id.toString());
      if (response.success) {
        setContacts(prev => prev.map(contact => 
          contact.id === showUnblockConfirm.id 
            ? { ...contact, is_blocked: false }
            : contact
        ));
        setShowUnblockConfirm(null);
        showSuccess('Contacto desbloqueado', 'El contacto ha sido desbloqueado exitosamente');
      } else {
        showError('Error al desbloquear contacto', response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error unblocking contact:', error);
      showError('Error al desbloquear contacto', 'No se pudo desbloquear el contacto');
    } finally {
      setUnblockingContact(false);
    }
  };

  // Obtener datos del contacto/grupo
  const fetchContactData = async (contact: Contact) => {
    try {
      setFetchingData(true);
      
      // Llamar al endpoint para obtener datos actualizados del contacto/grupo
      const response = await apiService.getContactData(contact.whatsapp_id);
      
      if (response.success && response.data) {
        const updatedData = response.data;
        
        // Actualizar el contacto en la lista local con los nuevos datos
        setContacts(prev => prev.map(c => 
          c.id === contact.id 
            ? { 
                ...c, 
                name: updatedData.name || c.name,
                avatar_url: updatedData.avatar_url || c.avatar_url,
                phone_number: updatedData.phone_number || c.phone_number
              }
            : c
        ));
        
        showSuccess(
          'Datos actualizados', 
          `Se obtuvieron los datos actualizados para ${contact.is_group ? 'el grupo' : 'el contacto'}`
        );
      } else {
        showError('Error al obtener datos', response.message || 'No se pudieron obtener los datos actualizados');
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
      showError('Error al obtener datos', 'No se pudieron obtener los datos del contacto/grupo');
    } finally {
      setFetchingData(false);
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

  // Filtrar contactos por tipo (la búsqueda por nombre/número se hace en el backend)
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
                  placeholder="Buscar por nombre, número o grupo..."
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

        {/* Resultados de búsqueda */}
        {searchTerm && (
          <div className="mb-4 px-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? (
                'Buscando...'
              ) : (
                `${filteredContacts.length} resultado${filteredContacts.length !== 1 ? 's' : ''} para "${searchTerm}"`
              )}
            </p>
          </div>
        )}

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
                {searchTerm ? `No se encontraron contactos para "${searchTerm}"` : 'No hay contactos disponibles'}
              </p>
              {searchTerm && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Busca por nombre, número de teléfono o ID de WhatsApp
                </p>
              )}
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
                          {(contact as any).is_blocked && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Ban className="w-2.5 h-2.5 text-white" />
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
                            {(contact as any).is_blocked && (
                              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full flex items-center space-x-1">
                                <Ban className="w-3 h-3" />
                                <span>Bloqueado</span>
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
                        <div className="relative group">
                          <button 
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Opciones del contacto"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Menú desplegable */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => fetchContactData(contact)}
                                disabled={fetchingData}
                                className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {fetchingData ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span>Obtener datos</span>
                              </button>
                              <button
                                onClick={() => handleEditContact(contact)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Editar</span>
                              </button>
                              {contact.is_blocked ? (
                                <button
                                  onClick={() => setShowUnblockConfirm(contact)}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Desbloquear</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setShowBlockConfirm(contact)}
                                  className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center space-x-2"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Bloquear</span>
                                </button>
                              )}
                              <button
                                onClick={() => setShowDeleteConfirm(contact)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        </div>
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

        {/* Modal de confirmación para eliminar contacto */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Eliminar Contacto
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Esta acción no se puede deshacer
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300">
                    ¿Estás seguro de que quieres eliminar el contacto{' '}
                    <span className="font-semibold">
                      {showDeleteConfirm.name || showDeleteConfirm.phone_number || 'este contacto'}
                    </span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Se eliminará permanentemente de tu lista de contactos.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteContact}
                    disabled={deletingContact}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {deletingContact ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para bloquear contacto */}
        {showBlockConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                    <Ban className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Bloquear Contacto
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Restringir comunicación
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300">
                    ¿Estás seguro de que quieres bloquear el contacto{' '}
                    <span className="font-semibold">
                      {showBlockConfirm.name || showBlockConfirm.phone_number || 'este contacto'}
                    </span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    No podrás enviar ni recibir mensajes de este contacto.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBlockConfirm(null)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={blockContact}
                    disabled={blockingContact}
                    className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {blockingContact ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Bloqueando...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        <span>Bloquear</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para desbloquear contacto */}
        {showUnblockConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <Ban className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Desbloquear Contacto
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Restaurar comunicación
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300">
                    ¿Estás seguro de que quieres desbloquear el contacto{' '}
                    <span className="font-semibold">
                      {showUnblockConfirm.name || showUnblockConfirm.phone_number || 'este contacto'}
                    </span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Podrás enviar y recibir mensajes de este contacto nuevamente.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUnblockConfirm(null)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={unblockContact}
                    disabled={unblockingContact}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {unblockingContact ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Desbloqueando...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        <span>Desbloquear</span>
                      </>
                    )}
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
