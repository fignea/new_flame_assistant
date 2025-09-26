import React, { useState } from 'react';
import { WebChatWidget } from '../../components/WebChatWidget';
import { Settings, Copy, Download, Eye } from 'lucide-react';

export const WidgetDemoPage: React.FC = () => {
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

  const [showCode, setShowCode] = useState(false);

  const generateScript = () => {
    return `
<!-- Flame Chat Widget -->
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

  // Código del widget aquí...
  console.log('Flame Chat Widget configurado:', config);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Widget de Chat Web - Demo
          </h1>
          <p className="text-gray-600">
            Configura y prueba el widget de chat en vivo para tu sitio web
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel de configuración */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración del Widget
              </h2>
              <Settings className="w-5 h-5 text-gray-500" />
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Widget
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Subtítulo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={config.subtitle}
                  onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Color primario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Posición */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posición
                </label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value as 'bottom-right' | 'bottom-left' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showAvatar" className="ml-2 text-sm text-gray-700">
                    Mostrar avatar
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableSound"
                    checked={config.enableSound}
                    onChange={(e) => setConfig({ ...config, enableSound: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableSound" className="ml-2 text-sm text-gray-700">
                    Habilitar sonidos
                  </label>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showCode ? 'Ocultar' : 'Ver'} Código</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </button>

                  <button
                    onClick={downloadScript}
                    className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de vista previa */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Vista Previa
            </h2>

            <div className="relative bg-gray-100 rounded-lg h-96 overflow-hidden">
              {/* Simulación de página web */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Mi Sitio Web
                </h3>
                <p className="text-gray-600 mb-4">
                  Esta es una simulación de cómo se verá el widget en tu sitio web.
                </p>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
              </div>

              {/* Widget de chat */}
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
            </div>
          </div>
        </div>

        {/* Código generado */}
        {showCode && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Código de Integración
            </h2>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{generateScript()}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
