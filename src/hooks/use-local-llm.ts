import { useLocalEngine } from '@/hooks/useLocalEngine';
// This hook provides a simplified interface to the LocalEngineAdapter
// for components like ChatView. It abstracts away the direct context usage.
export function useLocalLLM() {
  const {
    isAvailable,
    status,
    error,
    currentModel,
    initialize,
    generate,
    stop
  } = useLocalEngine();
  return {
    isLocalEngineAvailable: isAvailable,
    engineStatus: status,
    engineError: error,
    currentLocalModel: currentModel,
    initializeLocalModel: initialize,
    generateLocal: generate,
    stopLocalGeneration: stop,
  };
}