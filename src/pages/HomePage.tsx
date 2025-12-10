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
import { LocalEngineProvider, useLocalEngine } from '@/components/LocalEngineAdapter';
import { chatService, generateSessionTitle, MODELS } from '@/lib/chat';
import type { InferenceMode } from '@/lib/chat';
import type { Message, SessionInfo } from '../../worker/types';
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
  const { isAvailable: isLocalEngineAvailable, status: engineStatus, generate: localGenerate } = useLocalEngine();
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
    const localGenerator = engineStatus === 'ready' ? localGenerate : undefined;
    await chatService.sendMessage(messageContent, model, localGenerator, (chunk) => {
      setStreamingMessage(prev => prev + chunk);
    });
    if (chatService.inferenceMode === 'edge') {
      await loadMessages();
    } else {
      const finalAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingMessage,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, finalAssistantMessage]);
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