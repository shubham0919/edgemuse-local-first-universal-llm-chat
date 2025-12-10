import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Clock, Wrench, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime, renderToolCall } from '@/lib/chat';
import type { Message } from '../../worker/types';
import { CodeBlock } from './CodeBlock';
interface ChatViewProps {
  messages: Message[];
  streamingMessage: string;
  isProcessing: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}
function parseContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    const codeBlockMatch = part.match(/```(\w+)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'plaintext';
      const code = codeBlockMatch[2];
      return <CodeBlock key={index} code={code} language={language} />;
    }
    return <p key={index} className="whitespace-pre-wrap text-pretty">{part}</p>;
  });
}
export function ChatView({ messages, streamingMessage, isProcessing, input, onInputChange, onSubmit }: ChatViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrolledToBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 1;
      const newScrollHeight = el.scrollHeight;
      if (newScrollHeight > prevScrollHeight.current && isScrolledToBottom) {
        el.scrollTo({ top: newScrollHeight, behavior: 'smooth' });
      }
      prevScrollHeight.current = newScrollHeight;
    }
  }, [messages, streamingMessage]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };
  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  return (
    <div className="flex flex-col h-full">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center h-full"
          >
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h2 className="text-2xl font-semibold text-foreground">Welcome to EdgeMuse</h2>
            <p className="mt-2 max-w-md">Start a conversation by typing below. Try running a model locally for unlimited, private inference.</p>
          </motion.div>
        )}
        <motion.div variants={listVariants} initial="hidden" animate="visible">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        </motion.div>
        {streamingMessage && (
          <StreamingMessageBubble content={streamingMessage} />
        )}
        {isProcessing && !streamingMessage && messages.length > 0 && (
          <LoadingBubble />
        )}
      </div>
      <form onSubmit={onSubmit} className="p-4 border-t bg-background/80 backdrop-blur-sm transition-shadow duration-200 focus-within:shadow-glow">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask EdgeMuse anything..."
            className="flex-1 min-h-[48px] max-h-48 resize-none pr-14 py-3"
            rows={1}
            disabled={isProcessing}
            aria-label="Chat input"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-105 active:scale-95"
            disabled={!input.trim() || isProcessing}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
const bubbleVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      variants={bubbleVariants}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
    >
      {!isUser && <div className="w-8 h-8 rounded-full bg-gradient-primary center flex-shrink-0"><Bot className="w-5 h-5 text-white" /></div>}
      <div className={`max-w-[80%] sm:max-w-[70%] p-4 rounded-2xl ${isUser ? 'bg-primary text-primary-foreground rounded-br-lg' : 'bg-muted rounded-bl-lg'}`}>
        <div>{parseContent(message.content)}</div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs opacity-80">
              <Wrench className="w-3 h-3" />
              <span>Tools used:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.toolCalls.map((tool, idx) => (
                <Badge key={idx} variant={isUser ? 'secondary' : 'outline'} className="text-xs font-normal">
                  {renderToolCall(tool)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="text-xs opacity-60 mt-2 text-right"><Clock className="w-3 h-3 inline mr-1" />{formatTime(message.timestamp)}</div>
      </div>
      {isUser && <div className="w-8 h-8 rounded-full bg-secondary center flex-shrink-0"><User className="w-5 h-5 text-secondary-foreground" /></div>}
    </motion.div>
  );
}
function StreamingMessageBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3 justify-start mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-primary center flex-shrink-0"><Bot className="w-5 h-5 text-white" /></div>
      <div className="max-w-[80%] sm:max-w-[70%] p-4 rounded-2xl bg-muted rounded-bl-lg">
        <div>{parseContent(content)}<span className="animate-pulse">▍</span></div>
      </div>
    </div>
  );
}
function LoadingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 justify-start mb-6"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-primary center flex-shrink-0"><Bot className="w-5 h-5 text-white" /></div>
      <div className="max-w-[80%] sm:max-w-[70%] p-4 rounded-2xl bg-muted rounded-bl-lg space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </motion.div>
  );
}