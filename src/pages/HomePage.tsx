import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Cpu, HardDrive, Server, Settings, Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChatView } from '@/components/ChatView';
import { ModelManager } from '@/components/ModelManager';
import { SessionSidebarEnhanced } from '@/components/SessionSidebarEnhanced';
import { LocalEngineProvider } from '@/components/LocalEngineAdapter';
import { useLocalEngine } from '@/hooks/useLocalEngine';
import { chatService, generateSessionTitle, MODELS } from '@/lib/chat';
import type { InferenceMode } from '@/lib/chat';
import type { Message, SessionInfo } from '../../worker/types';
import { Badge } from '@/components/ui/badge';
import { formatModelSize, estimateRamForModel } from '@/lib/local-model';
function HomePageContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(chatService.getSessionId());
  const [hasUnsavedMessages, setHasUnsavedMessages] = useState(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const { isAvailable: isLocalEngineAvailable, status: engineStatus, generate: localGenerate, currentModel } = useLocalEngine();
  const loadSessions = useCallback(async () => {
    const response = await chatService.listSessions();
    if (response.success && response.data) setSessions(response.data);
  }, []);
  const loadMessages = useCallback(async () => {
    setIsProcessing(true);
    const response = await chatService.getMessages();
    if (response.success && response.data) {
      setMessages(response.data.messages);
      setModel(response.data.model);
    }
    setIsProcessing(false);
  }, []);
  useEffect(() => {
    loadSessions();
    loadMessages();
  }, [currentSessionId, loadSessions, loadMessages]);
  useEffect(() => {
    const currentSessionExists = sessions.some(s => s.id === currentSessionId);
    setHasUnsavedMessages(messages.length > 0 && !currentSessionExists);
  }, [messages, currentSessionId, sessions]);
  const saveCurrentSessionIfNeeded = useCallback(async () => {
    if (hasUnsavedMessages) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = generateSessionTitle(firstUserMessage?.content);
      await chatService.createSession(title, currentSessionId, firstUserMessage?.content);
      await loadSessions();
    }
  }, [hasUnsavedMessages, messages, currentSessionId, loadSessions]);
  const handleNewSession = useCallback(async () => {
    await saveCurrentSessionIfNeeded();
    chatService.newSession();
    setCurrentSessionId(chatService.getSessionId());
    setMessages([]);
    setStreamingMessage('');
  }, [saveCurrentSessionIfNeeded]);
  const handleSwitchSession = useCallback(async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    await saveCurrentSessionIfNeeded();
    chatService.switchSession(sessionId);
    setCurrentSessionId(sessionId);
    setMessages([]);
    setStreamingMessage('');
  }, [currentSessionId, saveCurrentSessionIfNeeded]);
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await chatService.deleteSession(sessionId);
    await loadSessions();
    if (sessionId === currentSessionId) {
      await handleNewSession();
    }
  }, [currentSessionId, loadSessions, handleNewSession]);
  const handleRenameSession = useCallback(async (sessionId: string, newTitle: string) => {
    await chatService.updateSessionTitle(sessionId, newTitle);
    await loadSessions();
  }, [loadSessions]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const messageContent = input.trim();
    setInput('');
    setIsProcessing(true);
    setStreamingMessage('');
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    if (hasUnsavedMessages && messages.length === 0) {
      const title = generateSessionTitle(messageContent);
      await chatService.createSession(title, currentSessionId, messageContent);
      await loadSessions();
    }
    const useLocal = chatService.inferenceMode !== 'edge' && engineStatus === 'ready';
    try {
      if (useLocal) {
        await localGenerate(messageContent, (chunk) => {
          setStreamingMessage(prev => prev + chunk);
        });
        const finalAssistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: streamingMessage + (await localGenerate(messageContent, () => {}) || ''), // a bit of a hack to get the full message
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, finalAssistantMessage]);
      } else {
        if (chatService.inferenceMode === 'local') {
          throw new Error('Local model not ready. Switch to Hybrid or Edge mode.');
        }
        await chatService.sendMessage(messageContent, model, undefined, (chunk) => {
          setStreamingMessage(prev => prev + chunk);
        });
        await loadMessages();
      }
    } catch (error) {
      console.error("Chat submission error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      const errorResponseMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorResponseMessage]);
    }
    setStreamingMessage('');
    setIsProcessing(false);
  };
  return (
    <SidebarProvider>
      <SessionSidebarEnhanced
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        hasUnsavedMessages={hasUnsavedMessages}
      />
      <SidebarInset>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">
          <header className="py-4 md:py-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="lg:hidden" />
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden sm:block">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  Edge<span className="text-gradient bg-gradient-to-r from-[#F38020] to-[#2F3A8F]">Muse</span>
                </h1>
                <p className="text-xs text-muted-foreground">Local-first Universal LLM Chat</p>
              </motion.div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <EngineStatusBadge />
              </motion.div>
              <InferenceModeToggle />
              <Button variant="outline" onClick={() => setIsModelManagerOpen(true)}>
                <HardDrive className="w-4 h-4 mr-2" />
                Models
              </Button>
              <ThemeToggle className="relative top-0 right-0" />
            </div>
          </header>
          <main className="flex-1 pb-8 md:pb-10 lg:pb-12 min-h-0">
            <Card className="h-full w-full max-w-4xl mx-auto glass-dark shadow-2xl shadow-primary/10 border-primary/20">
              <ChatView
                messages={messages}
                streamingMessage={streamingMessage}
                isProcessing={isProcessing}
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
              />
            </Card>
          </main>
          <footer className="text-center pb-4">
            <p className="text-xs text-muted-foreground">
              Note: AI server usage is rate-limited. Local runs are unlimited on-device. Built with ❤️ at Cloudflare.
            </p>
          </footer>
        </div>
        <ModelManager open={isModelManagerOpen} onOpenChange={setIsModelManagerOpen} />
      </SidebarInset>
    </SidebarProvider>
  );
}
function EngineStatusBadge() {
  const { status, currentModel, isAvailable } = useLocalEngine();
  if (!isAvailable) {
    return <Badge variant="destructive">No WebGPU</Badge>;
  }
  if (status === 'ready' && currentModel) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Local: Ready ({currentModel.name.split(' ')[0]})
      </Badge>
    );
  }
  if (status === 'initializing') {
    return <Badge variant="secondary">Local: Initializing...</Badge>;
  }
  return <Badge variant="outline">Engine: Idle</Badge>;
}
function InferenceModeToggle() {
  const { isAvailable: isLocalEngineAvailable, status: engineStatus } = useLocalEngine();
  const [mode, setMode] = useState<InferenceMode>(chatService.inferenceMode);
  const handleModeChange = (newMode: string) => {
    const validMode = newMode as InferenceMode;
    setMode(validMode);
    chatService.setInferenceMode(validMode);
  };
  const localDisabled = !isLocalEngineAvailable || engineStatus !== 'ready';
  return (
    <TooltipProvider>
      <Select onValueChange={handleModeChange} value={mode}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hybrid">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Hybrid
            </div>
          </SelectItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={localDisabled ? 'opacity-50 cursor-not-allowed' : ''}>
                <SelectItem value="local" disabled={localDisabled}>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> Local
                  </div>
                </SelectItem>
              </div>
            </TooltipTrigger>
            {localDisabled && (
              <TooltipContent>
                <p>Local engine not available or model not loaded.</p>
              </TooltipContent>
            )}
          </Tooltip>
          <SelectItem value="edge">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" /> Edge
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
export function HomePage() {
  return (
    <LocalEngineProvider>
      <HomePageContent />
    </LocalEngineProvider>
  );
}