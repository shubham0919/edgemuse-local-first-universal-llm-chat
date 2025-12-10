import { useState, useEffect, createContext, ReactNode, useMemo } from 'react';
import * as Comlink from 'comlink';
import { supportsWebGPU } from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
import type { LocalEngine } from '@/workers/local-engine-worker';
export type EngineStatus = 'idle' | 'initializing' | 'ready' | 'generating' | 'error';
export interface LocalEngineState {
  isAvailable: boolean;
  status: EngineStatus;
  error: string | null;
  currentModel: LocalModel | null;
  initProgress: number;
}
export interface LocalEngineActions {
  initialize: (model: LocalModel) => Promise<boolean>;
  generate: (prompt: string, onToken: (token: string) => void) => Promise<void>;
  stop: () => void;
}
export type LocalEngineContextType = LocalEngineState & LocalEngineActions;
export const LocalEngineContext = createContext<LocalEngineContextType | null>(null);
export function LocalEngineProvider({ children }: { children: ReactNode }) {
  const [isGpuSupported, setIsGpuSupported] = useState(false);
  useEffect(() => {
    supportsWebGPU().then(setIsGpuSupported);
  }, []);
  const [state, setState] = useState<LocalEngineState>({
    isAvailable: isGpuSupported,
    status: 'idle',
    error: null,
    currentModel: null,
    initProgress: 0,
  });
  const workerApi = useMemo(() => {
    const worker = new Worker(new URL('../workers/local-engine-worker.ts', import.meta.url), { type: 'module' });
    return Comlink.wrap<LocalEngine>(worker);
  }, []);
  const initialize = async (model: LocalModel): Promise<boolean> => {
    setState(s => ({ ...s, status: 'initializing', error: null, currentModel: model, initProgress: 0 }));
    console.log(`Initializing model: ${model.name}`);
    try {
      await workerApi.init(model.id);
      setState(s => ({ ...s, status: 'ready', currentModel: model, initProgress: 100 }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during initialization';
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg }));
      return false;
    }
  };
  const generate = async (prompt: string, onToken: (token: string) => void) => {
    if (state.status !== 'ready') {
      throw new Error('Engine not ready for generation.');
    }
    setState(s => ({ ...s, status: 'generating' }));
    try {
      await workerApi.generate(prompt, Comlink.proxy(onToken));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during generation';
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg }));
    } finally {
      setState(s => ({ ...s, status: 'ready' }));
    }
  };
  const stop = async () => {
    console.log('Stopping generation.');
    await workerApi.interrupt();
    setState(s => ({ ...s, status: 'ready' }));
  };
  const value = { ...state, isAvailable: isGpuSupported, initialize, generate, stop };
  return (
    <LocalEngineContext.Provider value={value}>
      {children}
    </LocalEngineContext.Provider>
  );
}