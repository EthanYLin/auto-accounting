"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SaveButtonOverrideContextValue {
  saveButtonOverride: boolean;
  showSaveButtonOverride: () => void;
  clearSaveButtonOverride: () => void;
}

const SaveButtonOverrideContext = createContext<SaveButtonOverrideContextValue | undefined>(undefined);

export function SaveButtonOverrideProvider({ children }: { children: React.ReactNode }) {
  const [saveButtonOverride, setSaveButtonOverride] = useState(false);

  const showSaveButtonOverride = useCallback(() => {
    setSaveButtonOverride(true);
  }, []);

  const clearSaveButtonOverride = useCallback(() => {
    setSaveButtonOverride(false);
  }, []);

  const value = useMemo<SaveButtonOverrideContextValue>(() => ({
    saveButtonOverride,
    showSaveButtonOverride,
    clearSaveButtonOverride,
  }), [saveButtonOverride, showSaveButtonOverride, clearSaveButtonOverride]);

  return (
    <SaveButtonOverrideContext.Provider value={value}>
      {children}
    </SaveButtonOverrideContext.Provider>
  );
}

export function useSaveButtonOverride() {
  const context = useContext(SaveButtonOverrideContext);
  if (context === undefined) {
    throw new Error("useSaveButtonOverride must be used within a SaveButtonOverrideProvider");
  }
  return context;
}
