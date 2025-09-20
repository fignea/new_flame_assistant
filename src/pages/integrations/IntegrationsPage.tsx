import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';

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
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const integrations: Integration[] = [
    {
      id: 'whatsapp-web',
      name: 'WhatsApp Web',
      description: 'Conecta tu cuenta de WhatsApp Web para enviar y recibir mensajes',
      icon: MessageCircle,
      available: true,
      connected: false,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
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
    setIsGeneratingQR(true);
    // Simulamos la generación del QR
    setTimeout(() => {
      setWhatsappQR('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=whatsapp-web-demo');
      setIsGeneratingQR(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                  <button
                    onClick={integration.id === 'whatsapp-web' ? generateWhatsAppQR : undefined}
                    disabled={integration.id !== 'whatsapp-web'}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {integration.id === 'whatsapp-web' ? 'Conectar' : 'Próximamente'}
                  </button>
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
        {whatsappQR && (
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
                  Escanea este código QR con tu teléfono para conectar WhatsApp Web
                </p>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-dark-border mb-6 inline-block">
                  <img 
                    src={whatsappQR} 
                    alt="WhatsApp QR Code" 
                    className="w-48 h-48"
                  />
                </div>

                {/* Instructions */}
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

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setWhatsappQR(null)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => copyToClipboard(whatsappQR)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGeneratingQR && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-200/50 dark:border-dark-border/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Generando código QR...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Por favor espera mientras preparamos tu conexión
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
