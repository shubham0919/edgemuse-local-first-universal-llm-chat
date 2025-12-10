import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as Comlink from 'comlink';
import { supportsWebGPU } from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
import type { LocalEngine } from '@/workers/local-engine-worker';
import { LocalEngineContext, LocalEngineState } from '@/types/local-engine';
export function LocalEngineProvider({ children }: { children: ReactNode }) {
  const [isGpuSupported, setIsGpuSupported] = useState(false);
  useEffect(() => {
    supportsWebGPU().then(setIsGpuSupported);
  }, []);
  const [state, setState] = useState<LocalEngineState>({
    isAvailable: false, // Will be updated by effect
    status: 'idle',
    error: null,
    currentModel: null,
    initProgress: 0,
  });
  const onProgress = useCallback((progress: { progress: number; text: string }) => {
    setState(s => ({ ...s, initProgress: progress.progress * 100 }));
  }, []);
  const workerApi = useMemo(() => {
    const worker = new Worker(new URL('../workers/local-engine-worker.ts', import.meta.url), { type: 'module' });
    return Comlink.wrap<LocalEngine>(worker);
  }, []);
  const initialize = async (model: LocalModel): Promise<boolean> => {
    setState(s => ({ ...s, status: 'initializing', error: null, currentModel: model, initProgress: 0 }));
    console.log(`Initializing model: ${model.name}`);
    try {
      // FIX: The worker's init function expects only one argument.
      // Progress reporting is not wired up in this version of the worker.
      await workerApi.init(model.id);
      setState(s => ({ ...s, status: 'ready', currentModel: model, initProgress: 100 }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during initialization';
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg }));
      // Signal fallback
      throw new Error('use_edge');
    }
  };
  const generate = async (prompt: string, onToken: (token: string) => void, options?: { temperature?: number; maxTokens?: number }) => {
    if (state.status !== 'ready') {
      throw new Error('Engine not ready for generation.');
    }
    setState(s => ({ ...s, status: 'generating' }));
    try {
      // FIX: The worker's generate function expects two arguments.
      // Advanced options are not passed in this version.
      await workerApi.generate(prompt, Comlink.proxy(onToken));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during generation';
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg }));
      throw new Error('use_edge');
    } finally {
      setState(s => ({ ...s, status: 'ready' }));
    }
  };
  const stop = async () => {
    console.log('Stopping generation.');
    await workerApi.interrupt();
    if (state.status === 'generating') {
      setState(s => ({ ...s, status: 'ready' }));
    }
  };
  useEffect(() => {
    setState(s => ({ ...s, isAvailable: isGpuSupported }));
  }, [isGpuSupported]);
  const value = { ...state, initialize, generate, stop };
  return (
    <LocalEngineContext.Provider value={value}>
      {children}
    </LocalEngineContext.Provider>
  );
}