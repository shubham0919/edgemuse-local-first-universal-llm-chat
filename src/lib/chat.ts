import localforage from 'localforage';
import type { Message, ChatState, ToolCall, WeatherResult, MCPResult, ErrorResult, SessionInfo } from '../../worker/types';
export interface ChatResponse {
  success: boolean;
  data?: ChatState;
  error?: string;
}
export const MODELS = [
  { id: 'google-ai-studio/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google-ai-studio/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'google-ai-studio/gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];
export type InferenceMode = 'local' | 'edge' | 'hybrid';
const offlineStore = localforage.createInstance({
  name: 'EdgeMuseDB',
  storeName: 'offlineChats',
});
class ChatService {
  private sessionId: string;
  private baseUrl: string;
  public inferenceMode: InferenceMode = 'hybrid';
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }
  setInferenceMode(mode: InferenceMode) {
    this.inferenceMode = mode;
  }
  async sendMessage(
    message: string,
    model: string,
    options: { temperature?: number; maxTokens?: number },
    localGenerate?: (prompt: string, onToken: (chunk: string) => void, options?: { temperature?: number; maxTokens?: number }) => Promise<void>,
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    const useLocal = this.inferenceMode !== 'edge' && localGenerate;
    if (!navigator.onLine) {
      return { success: false, error: "You are offline. Please check your connection." };
    }
    if (useLocal) {
      try {
        await localGenerate(message, (chunk) => {
          if (onChunk) onChunk(chunk);
        }, options);
        return { success: true };
      } catch (error) {
        console.error('Local generation failed:', error);
        if (this.inferenceMode === 'hybrid') {
          console.log('Falling back to edge inference.');
          return this.sendToEdge(message, model, options, onChunk);
        }
        return { success: false, error: 'Local generation failed. Check model manager or switch to Edge/Hybrid mode.' };
      }
    }
    return this.sendToEdge(message, model, options, onChunk);
  }
  private async sendToEdge(
    message: string,
    model: string,
    options: { temperature?: number; maxTokens?: number },
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model, stream: !!onChunk, ...options }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) onChunk(chunk);
        }
        return { success: true };
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to send message to edge:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  }
  async getMessages(): Promise<ChatResponse> {
    if (!navigator.onLine) {
      const cached = await this.loadCachedMessages(this.sessionId);
      if (cached) return { success: true, data: cached };
      return { success: false, error: "You are offline and no cached messages are available." };
    }
    try {
      const response = await fetch(`${this.baseUrl}/messages`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        await this.cacheMessages(this.sessionId, result.data);
      }
      return result;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return { success: false, error: 'Failed to load messages' };
    }
  }
  async cacheMessages(sessionId: string, state: ChatState): Promise<void> {
    await offlineStore.setItem(sessionId, { state, timestamp: Date.now() });
  }
  async loadCachedMessages(sessionId: string): Promise<ChatState | null> {
    const data = await offlineStore.getItem<{ state: ChatState; timestamp: number }>(sessionId);
    if (data && (Date.now() - data.timestamp < 24 * 60 * 60 * 1000)) { // 24h TTL
      return data.state;
    }
    return null;
  }
  async clearMessages(): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/clear`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to clear messages:', error);
      return { success: false, error: 'Failed to clear messages' };
    }
  }
  getSessionId(): string { return this.sessionId; }
  newSession(): void {
    this.sessionId = crypto.randomUUID();
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }
  switchSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.baseUrl = `/api/chat/${sessionId}`;
  }
  async createSession(title?: string, sessionId?: string, firstMessage?: string): Promise<{ success: boolean; data?: { sessionId: string; title: string }; error?: string }> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sessionId, firstMessage })
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to create session' };
    }
  }
  async listSessions(): Promise<{ success: boolean; data?: SessionInfo[]; error?: string }> {
    try {
      const response = await fetch('/api/sessions');
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to list sessions' };
    }
  }
  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to delete session' };
    }
  }
  async updateSessionTitle(sessionId: string, title: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to update session title' };
    }
  }
  async updateModel(model: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to update model:', error);
      return { success: false, error: 'Failed to update model' };
    }
  }
}
export const chatService = new ChatService();
export const formatTime = (timestamp: number): string => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const generateSessionTitle = (firstUserMessage?: string): string => {
  const now = new Date();
  const dateTime = now.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (!firstUserMessage?.trim()) return `Chat ${dateTime}`;
  const cleanMessage = firstUserMessage.trim().replace(/\s+/g, ' ');
  const truncated = cleanMessage.length > 40 ? cleanMessage.slice(0, 37) + '...' : cleanMessage;
  return `${truncated} • ${dateTime}`;
};
export const renderToolCall = (toolCall: ToolCall): string => {
  const result = toolCall.result as WeatherResult | MCPResult | ErrorResult | undefined;
  if (!result) return `⚠️ ${toolCall.name}: No result`;
  if ('error' in result) return `❌ ${toolCall.name}: ${result.error}`;
  if ('content' in result) {
    const content = (result.content || '').substring(0, 50);
    return `🔧 ${toolCall.name}: ${content}...`;
  }
  if (toolCall.name === 'get_weather') {
    const weather = result as WeatherResult;
    return `🌤️ Weather in ${weather.location}: ${weather.temperature}°C, ${weather.condition}`;
  }
  return `🔧 ${toolCall.name}: Done`;
};