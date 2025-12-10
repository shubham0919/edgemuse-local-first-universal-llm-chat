import { createContext } from 'react';
import type { LocalModel } from '@/lib/local-model';
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
  generate: (prompt: string, onToken: (token: string) => void, options?: { temperature?: number; maxTokens?: number }) => Promise<void>;
  stop: () => void;
}
export type LocalEngineContextType = LocalEngineState & LocalEngineActions;
export const LocalEngineContext = createContext<LocalEngineContextType | null>(null);