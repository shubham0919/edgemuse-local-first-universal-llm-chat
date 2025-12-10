import React, { useContext } from 'react';
import { LocalEngineContext, LocalEngineContextType } from '@/types/local-engine';
export function useLocalEngine(): LocalEngineContextType {
  const context = useContext(LocalEngineContext);
  if (context === null) {
    throw new Error('useLocalEngine must be used within a LocalEngineProvider');
  }
  return context;
}