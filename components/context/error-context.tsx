'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { addToast } from '@heroui/toast';

interface ErrorContextValue {
  showError: (title: string, message: string) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const showError = useCallback((title: string, message: string) => {
    addToast({
      title,
      description: message,
      color: 'danger',
    });
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
