import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as Comlink from 'comlink';
import { supportsWebGPU } from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
import type { LocalEngine } from '@/workers/local-engine-worker';
import { LocalEngineContext, LocalEngineState } from '@/types/local-engine';
export function LocalEngineProvider({ children }: { children: ReactNode }) {
  if (!React) throw new Error('React not available');
  const [isGpuSupported, setIsGpuSupported] = useState(false);
  const [state, setState] = useState<LocalEngineState>({
    isAvailable: false,
    status: 'idle',
    error: null,
    currentModel: null,
    initProgress: 0,
  });
  useEffect(() => {
    supportsWebGPU().then(setIsGpuSupported);
  }, []);
  const workerApi = useMemo(() => {
    const worker = new Worker(new URL('../workers/local-engine-worker.ts', import.meta.url), { type: 'module' });
    return Comlink.wrap<LocalEngine>(worker);
  }, []);
  const initialize = useCallback(async (model: LocalModel): Promise<boolean> => {
    setState(s => ({ ...s, status: 'initializing', error: null, currentModel: model, initProgress: 0 }));
    console.log(`Initializing model: ${model.name}`);
    try {
      await workerApi.init(model.id, Comlink.proxy((progress: { progress: number; text: string }) => {
        setState(s => ({ ...s, initProgress: progress.progress * 100 }));
      }));
      setState(s => ({ ...s, status: 'ready', currentModel: model, initProgress: 100 }));
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during initialization';
      console.error(errorMsg);
      setState(s => ({ ...s, status: 'error', error: errorMsg, currentModel: null }));
      return false;
    }
  }, [workerApi]);
  const generate = useCallback(async (prompt: string, onToken: (token: string) => void, options?: { temperature?: number; maxTokens?: number }) => {
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
      throw new Error('use_edge');
    } finally {
      setState(s => ({ ...s, status: 'ready' }));
    }
  }, [state.status, workerApi]);
  const stop = useCallback(async () => {
    console.log('Stopping generation.');
    await workerApi.interrupt();
    if (state.status === 'generating') {
      setState(s => ({ ...s, status: 'ready' }));
    }
  }, [state.status, workerApi]);
  useEffect(() => {
    setState(s => ({ ...s, isAvailable: isGpuSupported }));
  }, [isGpuSupported]);
  const value = useMemo(() => ({ ...state, initialize, generate, stop }), [state, initialize, generate, stop]);
  return (
    <LocalEngineContext.Provider value={value}>
      {children}
    </LocalEngineContext.Provider>
  );
}