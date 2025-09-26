import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorNotificationProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
  context?: string;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  context
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              {context ? `Error en ${context}` : 'Error'}
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            
            {onRetry && (
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700 text-xs font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reintentar
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
