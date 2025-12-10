import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { supportsWebGPU } from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
type EngineStatus = 'idle' | 'initializing' | 'ready' | 'generating' | 'error';
interface LocalEngineState {
  isAvailable: boolean;
  status: EngineStatus;
  error: string | null;
  currentModel: LocalModel | null;
}
interface LocalEngineActions {
  initialize: (model: LocalModel) => Promise<boolean>;
  generate: (prompt: string, onToken: (token: string) => void) => Promise<void>;
  stop: () => void;
}
type LocalEngineContextType = LocalEngineState & LocalEngineActions;
const LocalEngineContext = createContext<LocalEngineContextType | null>(null);
export function LocalEngineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalEngineState>({
    isAvailable: supportsWebGPU(),
    status: 'idle',
    error: null,
    currentModel: null,
  });
  const initialize = useCallback(async (model: LocalModel): Promise<boolean> => {
    setState(s => ({ ...s, status: 'initializing', error: null, currentModel: model }));
    console.log(`[Mock] Initializing model: ${model.name}`);
    // Simulate model loading time
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (model.size > 4_000_000_000) { // Simulate failure for large models
      const errorMsg = `[Mock] Not enough memory to load ${model.name}.`;
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg }));
      return false;
    }
    console.log(`[Mock] Model ${model.name} is ready.`);
    setState(s => ({ ...s, status: 'ready', currentModel: model }));
    return true;
  }, []);
  const generate = useCallback(async (prompt: string, onToken: (token: string) => void) => {
    if (state.status !== 'ready') {
      console.error('[Mock] Engine not ready for generation.');
      return;
    }
    setState(s => ({ ...s, status: 'generating' }));
    const mockResponse = `This is a mocked streaming response for the prompt: "${prompt}". The local model, ${state.currentModel?.name}, is processing this request on your device. This demonstrates the token-by-token generation capability of EdgeMuse's local-first architecture.`;
    const tokens = mockResponse.split(' ');
    for (const token of tokens) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onToken(token + ' ');
    }
    setState(s => ({ ...s, status: 'ready' }));
  }, [state.status, state.currentModel]);
  const stop = useCallback(() => {
    console.log('[Mock] Stopping generation.');
    setState(s => ({ ...s, status: 'ready' }));
  }, []);
  const value = { ...state, initialize, generate, stop };
  return (
    <LocalEngineContext.Provider value={value}>
      {children}
    </LocalEngineContext.Provider>
  );
}
export function useLocalEngine(): LocalEngineContextType {
  const context = useContext(LocalEngineContext);
  if (!context) {
    throw new Error('useLocalEngine must be used within a LocalEngineProvider');
  }
  return context;
}