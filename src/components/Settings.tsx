import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Cpu, MemoryStick, AlertTriangle } from 'lucide-react';
import { chatService } from '@/lib/chat';
import type { InferenceMode } from '@/lib/chat';
interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedOptions: { temperature: number; maxTokens: number };
  onAdvancedOptionsChange: (options: { temperature: number; maxTokens: number }) => void;
}
export function Settings({ open, onOpenChange, advancedOptions, onAdvancedOptionsChange }: SettingsProps) {
  const [diagnostics, setDiagnostics] = useState({
    webGpu: 'checking' as 'supported' | 'unsupported' | 'checking',
    deviceMemory: navigator.deviceMemory || 0,
  });
  useEffect(() => {
    async function checkWebGpu() {
      const supported = await navigator.gpu?.requestAdapter() != null;
      setDiagnostics(d => ({ ...d, webGpu: supported ? 'supported' : 'unsupported' }));
    }
    checkWebGpu();
  }, []);
  const handleModeChange = (checked: boolean) => {
    const newMode: InferenceMode = checked ? 'hybrid' : 'edge';
    chatService.setInferenceMode(newMode);
    // Force a re-render in parent if needed, but for now, service is sufficient
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-2xl font-display">Settings & Diagnostics</SheetTitle>
          <SheetDescription>Configure chat behavior and view device capabilities.</SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Advanced Chat Options</h3>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {advancedOptions.temperature.toFixed(2)}</Label>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.01}
                value={[advancedOptions.temperature]}
                onValueChange={(value) => onAdvancedOptionsChange({ ...advancedOptions, temperature: value[0] })}
              />
              <p className="text-xs text-muted-foreground">Controls randomness. Lower is more deterministic.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                value={advancedOptions.maxTokens}
                onChange={(e) => onAdvancedOptionsChange({ ...advancedOptions, maxTokens: parseInt(e.target.value, 10) || 2048 })}
              />
              <p className="text-xs text-muted-foreground">Maximum length of the generated response.</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Device Diagnostics</h3>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">WebGPU Support</span>
              </div>
              {diagnostics.webGpu === 'checking' && <Badge variant="secondary">Checking...</Badge>}
              {diagnostics.webGpu === 'supported' && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1" /> Supported</Badge>}
              {diagnostics.webGpu === 'unsupported' && <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" /> Unsupported</Badge>}
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <MemoryStick className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Device Memory</span>
              </div>
              <Badge variant="outline">{diagnostics.deviceMemory ? `${diagnostics.deviceMemory} GB (approx)` : 'N/A'}</Badge>
            </div>
            {diagnostics.webGpu === 'unsupported' && (
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p>Local inference may be slow or unavailable. Hybrid mode will fall back to the edge.</p>
              </div>
            )}
          </div>
        </div>
        <SheetFooter>
          <p className="text-xs text-muted-foreground text-center w-full">Settings are saved automatically in your browser.</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}