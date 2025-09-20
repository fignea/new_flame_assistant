import React from 'react';
import { MessageSquare, Clock, Wrench } from 'lucide-react';

export const InboxPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <Wrench className="w-12 h-12 text-orange-500" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur animate-pulse"></div>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
          Work in Progress
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          La sección de Inbox está en desarrollo. Próximamente podrás gestionar todas tus conversaciones desde aquí.
        </p>
        
        <div className="bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50">
          <div className="flex items-center space-x-3 text-orange-600 dark:text-orange-400 mb-4">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Funcionalidades próximas:</span>
          </div>
          <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Gestión de conversaciones en tiempo real</li>
            <li>• Filtros y búsqueda avanzada</li>
            <li>• Respuestas automáticas con IA</li>
            <li>• Integración con múltiples canales</li>
            <li>• Análisis de sentimientos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
