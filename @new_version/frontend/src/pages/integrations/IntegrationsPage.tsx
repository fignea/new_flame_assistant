import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  MessageCircle, 
  Facebook, 
  Instagram, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Copy,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api.service';
import { useNavigate } from 'react-router-dom';
// Importación dinámica de QRCode para evitar problemas con Vite

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  available: boolean;
  connected: boolean;
  color: string;
  bgColor: string;
}

export const IntegrationsPage: React.FC = () => {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [qrImageData, setQrImageData] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber?: string;
    userName?: string;
    lastSeen?: string;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Generar imagen QR cuando se reciba el código
  useEffect(() => {
    if (whatsappQR) {
      generateQRImage(whatsappQR);
    } else {
      setQrImageData(null);
    }
  }, [whatsappQR]);

  const generateQRImage = async (qrString: string) => {
    try {
      // Si el QR ya es un Data URL, usarlo directamente
      if (qrString.startsWith('data:image/')) {
        setQrImageData(qrString);
        return;
      }

      // Si es un string QR, generar la imagen
      const QRCode = await import('qrcode');
      const qrImageUrl = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrImageData(qrImageUrl);
    } catch (error) {
      console.error('Error generating QR image:', error);
      setError('Error generando la imagen del código QR');
    }
  };

  const integrations: Integration[] = [
    {
      id: 'whatsapp-web',
      name: 'WhatsApp Web',
      description: whatsappStatus?.isConnected 
        ? `Conectado como ${whatsappStatus.userName || 'Usuario WhatsApp'}${whatsappStatus.phoneNumber ? ` (${whatsappStatus.phoneNumber})` : ''}${whatsappStatus.lastSeen ? ` - Última conexión: ${new Date(whatsappStatus.lastSeen).toLocaleString()}` : ''}`
        : 'Conecta tu cuenta de WhatsApp Web para enviar y recibir mensajes',
      icon: MessageCircle,
      available: true,
      connected: whatsappStatus?.isConnected || false,
      color: whatsappStatus?.isConnected ? 'text-green-500' : 'text-gray-500',
      bgColor: whatsappStatus?.isConnected ? 'bg-green-500/10' : 'bg-gray-500/10'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Integración con Facebook Messenger (próximamente)',
      icon: Facebook,
      available: false,
      connected: false,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Integración con Instagram Direct (próximamente)',
      icon: Instagram,
      available: false,
      connected: false,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    {
      id: 'whatsapp-business',
      name: 'WhatsApp Business',
      description: 'API oficial de WhatsApp Business (próximamente)',
      icon: MessageCircle,
      available: false,
      connected: false,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10'
    }
  ];

  const generateWhatsAppQR = async () => {
    if (!isAuthenticated) {
      setError('Debes iniciar sesión para conectar WhatsApp Web');
      return;
    }

    setIsGeneratingQR(true);
    setError(null);
    setWhatsappQR(null); // Limpiar QR anterior
    
    try {
      console.log('Creating WhatsApp session...');
      const response = await apiService.createWhatsAppSession();
      console.log('WhatsApp session response:', response);
      
      if (response.success && response.data) {
        if (response.data?.qrCode) {
          // QR disponible inmediatamente
          setWhatsappQR(response.data.qrCode);
          console.log('QR Code received immediately from backend');
          setIsGeneratingQR(false);
        } else if (response.data?.sessionId) {
          // QR pendiente, hacer polling
          console.log('Session created, polling for QR...');
          // NO cambiar isGeneratingQR aquí, mantener el modal abierto
          pollForQRCode();
        }
      } else {
        throw new Error(response.message || 'Error creando sesión de WhatsApp');
      }
    } catch (error) {
      console.error('Error calling WhatsApp API:', error);
      setError(error instanceof Error ? error.message : 'Error conectando con WhatsApp Web');
      setIsGeneratingQR(false);
    }
  };

  const pollForQRCode = async () => {
    const maxAttempts = 60; // 60 intentos = 2 minutos
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`Polling for QR code, attempt ${attempts}/${maxAttempts}`);
        
        // Primero verificar el estado de conexión
        const statusResponse = await apiService.getWhatsAppStatus();
        if (statusResponse.success && statusResponse.data && 'isConnected' in statusResponse.data && statusResponse.data.isConnected) {
          console.log('WhatsApp connected! Closing modal and updating status');
          setWhatsappStatus(statusResponse.data as any);
          setWhatsappQR(null);
          setIsGeneratingQR(false);
          return;
        }
        
        // Si no está conectado, verificar si hay QR disponible
        const qrResponse = await apiService.getWhatsAppQR();
        if (qrResponse.success && qrResponse.data && 'qrCode' in qrResponse.data && qrResponse.data.qrCode) {
          setWhatsappQR(qrResponse.data.qrCode);
          console.log('QR Code received from polling');
          setIsGeneratingQR(false); // Detener el estado de carga
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll cada 2 segundos
        } else {
          setError('Timeout esperando el código QR de WhatsApp Web');
          setIsGeneratingQR(false); // Detener el estado de carga
        }
      } catch (error) {
        console.error('Error polling for QR code:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setError('Error obteniendo el código QR de WhatsApp Web');
          setIsGeneratingQR(false); // Detener el estado de carga
        }
      }
    };

    poll();
  };

  // Función para desconectar WhatsApp
  const disconnectWhatsApp = async () => {
    try {
      setError(null);
      const response = await apiService.disconnectWhatsApp();
      if (response.success) {
        setWhatsappStatus(null);
        setWhatsappQR(null);
        setIsGeneratingQR(false);
      } else {
        setError(response.message || 'Error al desconectar WhatsApp');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      setError('Error al desconectar WhatsApp');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkWhatsAppStatus = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingStatus(true);
    try {
      const response = await apiService.getWhatsAppStatus();
      if (response.success && response.data) {
        setWhatsappStatus(response.data as any);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };


  // Verificar estado al cargar la página
  React.useEffect(() => {
    if (isAuthenticated) {
      checkWhatsAppStatus();
    }
  }, [isAuthenticated]);

  // Polling continuo para detectar cambios de estado cuando el modal está abierto
  React.useEffect(() => {
    // Solo hacer polling si el modal está abierto (hay QR o se está generando)
    if (!whatsappQR && !isGeneratingQR) return;

    const interval = setInterval(async () => {
      try {
        const response = await apiService.getWhatsAppStatus();
        if (response.success && response.data?.isConnected) {
          console.log('WhatsApp connected! Closing modal and updating status');
          setWhatsappStatus(response.data);
          setWhatsappQR(null);
          setIsGeneratingQR(false);
          
          // Mostrar notificación de conexión exitosa
          setError(null);
          setNotification({
            type: 'success',
            message: `¡WhatsApp conectado exitosamente! Conectado como ${response.data.userName || 'Usuario WhatsApp'}`
          });
          
          // Limpiar notificación después de 5 segundos
          setTimeout(() => setNotification(null), 5000);
          
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    }, 2000); // Verificar cada 2 segundos para mayor responsividad

    return () => clearInterval(interval);
  }, [whatsappQR, isGeneratingQR]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            Integraciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Conecta tu asistente con diferentes plataformas y servicios
          </p>
          {!isAuthenticated && (
            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ Debes iniciar sesión para conectar las integraciones
              </p>
            </div>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">
                ❌ {error}
              </p>
            </div>
          )}
          {notification && (
            <div className={`mt-4 p-4 rounded-lg border ${
              notification.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                : notification.type === 'error'
                ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
            }`}>
              <p className={`text-sm ${
                notification.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : notification.type === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {notification.type === 'success' && '✅ '}
                {notification.type === 'error' && '❌ '}
                {notification.type === 'info' && 'ℹ️ '}
                {notification.message}
              </p>
            </div>
          )}
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.id}
                className={`relative bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                  integration.available
                    ? 'border-gray-200/50 dark:border-dark-border/50 hover:border-purple-300/50 dark:hover:border-purple-400/50 hover:shadow-lg'
                    : 'border-gray-200/30 dark:border-dark-border/30 opacity-60'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {integration.available ? (
                    <div className="flex items-center space-x-1 text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Disponible</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Próximamente</span>
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 ${integration.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${integration.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {integration.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {integration.description}
                </p>

                    {/* Action Button */}
                    {integration.available ? (
                      <div className="space-y-2">
                        {integration.id === 'whatsapp-web' && whatsappStatus?.isConnected ? (
                          <div className="space-y-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate('/inbox')}
                                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Gestionar Mensajes</span>
                              </button>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={checkWhatsAppStatus}
                                disabled={isLoadingStatus}
                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                              >
                                {isLoadingStatus ? 'Verificando...' : 'Actualizar Estado'}
                              </button>
                              <button
                                onClick={disconnectWhatsApp}
                                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-600 transition-colors"
                              >
                                Desconectar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={integration.id === 'whatsapp-web' ? generateWhatsAppQR : undefined}
                            disabled={integration.id !== 'whatsapp-web' || !isAuthenticated}
                            className={`w-full px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                              integration.id === 'whatsapp-web' && isAuthenticated
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {integration.id === 'whatsapp-web' 
                              ? (isAuthenticated ? 'Conectar' : 'Inicia sesión primero')
                              : 'Próximamente'
                            }
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl font-medium cursor-not-allowed"
                      >
                        No disponible
                      </button>
                    )}
              </div>
            );
          })}
        </div>

            {/* WhatsApp QR Modal */}
            {(whatsappQR || isGeneratingQR) && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-8 h-8 text-green-500" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Conectar WhatsApp Web
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {whatsappQR 
                        ? 'Escanea este código QR con tu teléfono para conectar WhatsApp Web'
                        : 'Preparando conexión con WhatsApp Web...'
                      }
                    </p>

                    {/* Indicador de conexión en progreso */}
                    {whatsappQR && whatsappStatus && !whatsappStatus.isConnected && (
                      <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
                          <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                            Esperando conexión... Escanea el QR con tu teléfono
                          </span>
                        </div>
                      </div>
                    )}

                    {isGeneratingQR && !whatsappQR && (
                      <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                          <span className="text-blue-800 dark:text-blue-200 text-sm">
                            Iniciando WhatsApp Web... Esto puede tomar 30-60 segundos
                          </span>
                        </div>
                      </div>
                    )}

                    {/* QR Code */}
                    {whatsappQR ? (
                      <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-dark-border mb-6 inline-block">
                        {qrImageData ? (
                          <img 
                            src={qrImageData} 
                            alt="WhatsApp QR Code" 
                            className="w-48 h-48"
                          />
                        ) : (
                          <div className="w-48 h-48 flex items-center justify-center">
                            <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border mb-6 inline-block">
                        <div className="w-48 h-48 flex items-center justify-center">
                          <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    {whatsappQR && (
                      <div className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 mb-6 text-left">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Instrucciones:
                        </h4>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>1. Abre WhatsApp en tu teléfono</li>
                          <li>2. Toca los tres puntos (⋮)</li>
                          <li>3. Selecciona "Dispositivos vinculados"</li>
                          <li>4. Toca "Vincular un dispositivo"</li>
                          <li>5. Escanea este código QR</li>
                        </ol>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setWhatsappQR(null);
                          setQrImageData(null);
                          setIsGeneratingQR(false);
                        }}
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                      {whatsappQR && (
                        <button
                          onClick={() => copyToClipboard(whatsappQR)}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


      </div>
    </div>
  );
};
