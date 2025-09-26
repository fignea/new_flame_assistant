import { useState, useCallback } from 'react';

interface ErrorState {
  hasError: boolean;
  error: string | null;
  errorDetails?: any;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null
  });

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    let errorMessage = 'Ha ocurrido un error inesperado';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    setErrorState({
      hasError: true,
      error: errorMessage,
      errorDetails: error
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    errorState,
    handleError,
    clearError,
    handleAsyncError
  };
};
