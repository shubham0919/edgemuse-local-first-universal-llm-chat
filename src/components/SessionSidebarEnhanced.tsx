import { useState } from 'react';
import { Home, MessageSquare, Plus, Trash2, Edit, MoreVertical, X } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SessionInfo } from '../../worker/types';
interface SessionSidebarProps {
  sessions: SessionInfo[];
  currentSessionId: string;
  onSwitchSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  hasUnsavedMessages: boolean;
}
export function SessionSidebarEnhanced({
  sessions,
  currentSessionId,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  hasUnsavedMessages,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const handleRenameStart = (session: SessionInfo) => {
    setEditingId(session.id);
    setRenameValue(session.title);
  };
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && renameValue.trim()) {
      onRenameSession(editingId, renameValue.trim());
    }
    setEditingId(null);
  };
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-display font-bold">EdgeMuse</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onNewSession}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <ScrollArea className="h-full">
          <SidebarMenu>
            {sessions.map((session) => (
              <SidebarMenuItem key={session.id} className="group relative">
                {editingId === session.id ? (
                  <form onSubmit={handleRenameSubmit} className="w-full">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      autoFocus
                      className="h-9"
                    />
                  </form>
                ) : (
                  <>
                    <SidebarMenuButton
                      onClick={() => onSwitchSession(session.id)}
                      isActive={session.id === currentSessionId}
                      className="w-full justify-start"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      <span className="truncate flex-1 text-left">{session.title}</span>
                      {session.id === currentSessionId && hasUnsavedMessages && (
                        <span className="w-2 h-2 rounded-full bg-primary ml-2" title="Unsaved changes"></span>
                      )}
                    </SidebarMenuButton>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleRenameStart(session)}>
                            <Edit className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteSession(session.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}