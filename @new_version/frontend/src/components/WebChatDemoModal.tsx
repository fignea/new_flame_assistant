import React, { useState } from 'react';
import { WebChatWidget } from './WebChatWidget';
import { Settings, Copy, Download, X } from 'lucide-react';

interface WebChatDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebChatDemoModal: React.FC<WebChatDemoModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState({
    userId: 1,
    apiUrl: 'http://localhost:3001/api/integrations/web',
    title: '¡Hola! ¿En qué podemos ayudarte?',
    subtitle: 'Estamos aquí para responder tus preguntas',
    primaryColor: '#3B82F6',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    showAvatar: true,
    enableSound: true
  });


  const generateScript = () => {
    return `
<!-- Flame Chat Widget -->
<script src="https://cdn.jsdelivr.net/gh/flame-ai/chat-widget@latest/dist/flame-chat-widget.min.js"></script>
<script>
(function() {
  const config = {
    userId: ${config.userId},
    apiUrl: '${config.apiUrl}',
    title: '${config.title}',
    subtitle: '${config.subtitle}',
    primaryColor: '${config.primaryColor}',
    position: '${config.position}',
    showAvatar: ${config.showAvatar},
    enableSound: ${config.enableSound}
  };

  // Inicializar el widget de Flame Chat
  if (window.FlameChatWidget) {
    window.FlameChatWidget.init(config);
  } else {
    console.error('Flame Chat Widget no se pudo cargar. Verifica que el script esté incluido correctamente.');
  }
})();
</script>
    `.trim();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateScript());
    alert('Código copiado al portapapeles');
  };

  const downloadScript = () => {
    const blob = new Blob([generateScript()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flame-chat-widget.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Widget de chat flotante para demo */}
      <WebChatWidget
        userId={config.userId}
        apiUrl={config.apiUrl}
        title={config.title}
        subtitle={config.subtitle}
        primaryColor={config.primaryColor}
        position={config.position}
        showAvatar={config.showAvatar}
        enableSound={config.enableSound}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Demo de Chat Web
              </h2>
              <p className="text-purple-100 mt-1">
                Configura y obtén el código para integrar el chat en tu sitio web
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Panel de configuración */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    Configuración del Widget
                  </h3>
                  <Settings className="w-5 h-5 text-purple-400" />
                </div>

                <div className="space-y-4">
                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Título del Widget
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                  </div>

                  {/* Subtítulo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subtítulo
                    </label>
                    <input
                      type="text"
                      value={config.subtitle}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                  </div>

                  {/* Color primario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Color Primario
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="w-12 h-10 border border-gray-600 rounded-lg cursor-pointer bg-gray-700"
                      />
                      <input
                        type="text"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Posición */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Posición
                    </label>
                    <select
                      value={config.position}
                      onChange={(e) => setConfig({ ...config, position: e.target.value as 'bottom-right' | 'bottom-left' })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    >
                      <option value="bottom-right">Esquina inferior derecha</option>
                      <option value="bottom-left">Esquina inferior izquierda</option>
                    </select>
                  </div>

                  {/* Opciones adicionales */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showAvatar"
                        checked={config.showAvatar}
                        onChange={(e) => setConfig({ ...config, showAvatar: e.target.checked })}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                      />
                      <label htmlFor="showAvatar" className="ml-2 text-sm text-gray-300">
                        Mostrar avatar
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableSound"
                        checked={config.enableSound}
                        onChange={(e) => setConfig({ ...config, enableSound: e.target.checked })}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                      />
                      <label htmlFor="enableSound" className="ml-2 text-sm text-gray-300">
                        Habilitar sonidos
                      </label>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </button>

                      <button
                        onClick={downloadScript}
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Descargar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel de código */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Código de Integración
                </h3>

                <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 overflow-x-auto h-96">
                  <pre className="text-green-400 text-sm">
                    <code>{generateScript()}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
