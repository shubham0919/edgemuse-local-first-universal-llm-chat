import { useContext } } from 'react';
import { LocalEngineContext, LocalEngineContextType } from '@/components/LocalEngineAdapter';
export function useLocalEngine(): LocalEngineContextType {
  const context = useContext(LocalEngineContext);
  if (!context) {
    throw new Error('useLocalEngine must be used within a LocalEngineProvider');
  }
  return context;
}