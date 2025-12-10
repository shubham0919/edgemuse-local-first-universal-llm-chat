import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Server, Settings, Cpu } from 'lucide-react';
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
import { chatService, generateSessionTitle } from '@/lib/chat';
import type { InferenceMode } from '@/lib/chat';
import type { Message, SessionInfo } from '../../worker/types';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsComponent } from '@/components/Settings';
import { Toaster, toast } from 'sonner';
function HomePageContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(chatService.getSessionId());
  const [hasUnsavedMessages, setHasUnsavedMessages] = useState(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState(() => {
    const saved = localStorage.getItem('advancedChatOptions');
    return saved ? JSON.parse(saved) : { temperature: 0.7, maxTokens: 4096 };
  });
  const { isAvailable: isLocalEngineAvailable, status: engineStatus, generate: localGenerate, currentModel, stop: stopLocalGeneration } = useLocalEngine();
  useEffect(() => {
    localStorage.setItem('advancedChatOptions', JSON.stringify(advancedOptions));
  }, [advancedOptions]);
  const loadSessions = useCallback(async () => {
    const response = await chatService.listSessions();
    if (response.success && response.data) setSessions(response.data);
  }, []);
  const loadMessages = useCallback(async () => {
    setIsProcessing(true);
    const response = await chatService.getMessages();
    if (response.success && response.data) {
      setMessages(response.data.messages);
    } else if (response.error) {
      toast.error(response.error);
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
    stopLocalGeneration();
    chatService.switchSession(sessionId);
    setCurrentSessionId(sessionId);
    setMessages([]);
    setStreamingMessage('');
  }, [currentSessionId, saveCurrentSessionIfNeeded, stopLocalGeneration]);
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
    let fullResponse = '';
    const response = await chatService.sendMessage(
      messageContent,
      'google-ai-studio/gemini-2.5-flash', // Edge model, not used for local
      advancedOptions,
      engineStatus === 'ready' ? localGenerate : undefined,
      (chunk) => {
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      }
    );
    if (!response.success) {
      toast.error(response.error || "An unknown error occurred.");
      setMessages(prev => prev.slice(0, -1)); // Remove optimistic user message
    } else {
      // For edge, we need to reload messages. For local, we construct it.
      if (chatService.inferenceMode !== 'local') {
        await loadMessages();
      } else {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
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
          <div className="py-8 md:py-10 lg:py-12 flex-1 flex flex-col min-h-0">
            <header className="pb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="lg:hidden" />
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Edge<span className="text-gradient bg-gradient-to-r from-[#F38020] to-[#2F3A8F]">Muse</span>
                  </h1>
                </motion.div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <EngineStatusBadge />
                </motion.div>
                <InferenceModeToggle />
                <Button variant="outline" onClick={() => setIsModelManagerOpen(true)}>
                  <HardDrive className="w-4 h-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Models</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-5 h-5" />
                </Button>
                <ThemeToggle className="relative top-0 right-0" />
              </div>
            </header>
            <main className="flex-1 min-h-0">
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
          </div>
          <footer className="text-center pb-4">
            <p className="text-xs text-muted-foreground">
              Built with ❤️ at Cloudflare. AI server usage is rate-limited. Local runs are unlimited.
            </p>
          </footer>
        </div>
        <ModelManager open={isModelManagerOpen} onOpenChange={setIsModelManagerOpen} />
        <SettingsComponent
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          advancedOptions={advancedOptions}
          onAdvancedOptionsChange={setAdvancedOptions}
        />
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
            <div className="flex items-center gap-2"><Cpu className="w-4 h-4" /> Hybrid</div>
          </SelectItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={localDisabled ? 'opacity-50 cursor-not-allowed' : ''}>
                <SelectItem value="local" disabled={localDisabled}>
                  <div className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Local</div>
                </SelectItem>
              </div>
            </TooltipTrigger>
            {localDisabled && <TooltipContent><p>Local engine not available or model not loaded.</p></TooltipContent>}
          </Tooltip>
          <SelectItem value="edge">
            <div className="flex items-center gap-2"><Server className="w-4 h-4" /> Edge</div>
          </SelectItem>
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
export function HomePage() {
  return (
    <LocalEngineProvider>
      <Toaster richColors />
      <HomePageContent />
    </LocalEngineProvider>
  );
}