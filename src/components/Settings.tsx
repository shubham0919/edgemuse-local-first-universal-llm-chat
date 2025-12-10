import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Cpu, MemoryStick, AlertTriangle, Database } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { getStorageEstimate } from '@/lib/local-model';
import { toast } from 'sonner';
import '@/types/navigator.d.ts';
interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedOptions: { temperature: number; maxTokens: number };
  onAdvancedOptionsChange: (options: { temperature: number; maxTokens: number }) => void;
}
export function Settings({ open, onOpenChange, advancedOptions, onAdvancedOptionsChange }: SettingsProps) {
  const [diagnostics, setDiagnostics] = useState({
    webGpu: 'checking' as 'supported' | 'unsupported' | 'checking',
    wasmSimd: 'checking' as 'supported' | 'unsupported' | 'checking',
    deviceMemory: (navigator as any).deviceMemory || 0,
    storage: null as { usage: number; quota: number } | null,
  });
  useEffect(() => {
    if (!open) return;
    async function runChecks() {
      // WebGPU Check
      const adapter = await navigator.gpu?.requestAdapter();
      const webGpu = adapter ? 'supported' : 'unsupported';
      // WASM SIMD Check
      const wasmSimd = await (async () => {
        try {
          // This is the official way to detect SIMD support.
          return await WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
        } catch (e) {
          return false;
        }
      })() ? 'supported' : 'unsupported';
      // Storage Check
      const storage = await getStorageEstimate();
      if (storage && storage.quota > 0 && storage.usage / storage.quota > 0.8) {
        toast.warning('Local model storage is nearly full.', {
          description: 'Consider removing unused models to free up space.',
        });
      }
      setDiagnostics(d => ({ ...d, webGpu, wasmSimd, storage }));
    }
    runChecks();
  }, [open]);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
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
            <DiagnosticItem icon={Cpu} label="WebGPU Support" status={diagnostics.webGpu} />
            <DiagnosticItem icon={Cpu} label="WASM SIMD Support" status={diagnostics.wasmSimd} />
            <DiagnosticItem icon={MemoryStick} label="Device Memory" value={diagnostics.deviceMemory ? `${diagnostics.deviceMemory} GB (approx)` : 'N/A'} />
            <DiagnosticItem icon={Database} label="Local Storage" value={diagnostics.storage ? `${formatBytes(diagnostics.storage.usage)} / ${formatBytes(diagnostics.storage.quota)}` : 'N/A'} />
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
function DiagnosticItem({ icon: Icon, label, status, value }: { icon: React.ElementType, label: string, status?: 'checking' | 'supported' | 'unsupported', value?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      {status && (
        <>
          {status === 'checking' && <Badge variant="secondary">Checking...</Badge>}
          {status === 'supported' && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-4 h-4 mr-1" /> Supported</Badge>}
          {status === 'unsupported' && <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" /> Unsupported</Badge>}
        </>
      )}
      {value && <Badge variant="outline">{value}</Badge>}
    </div>
  );
}