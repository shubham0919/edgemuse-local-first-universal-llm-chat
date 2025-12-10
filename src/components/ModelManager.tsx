import { useState, useEffect, useCallback } from 'react';
import { Cpu, MemoryStick, Trash2, Wand2, CheckCircle, XCircle, Download, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalEngine } from '@/hooks/useLocalEngine';
import {
  RECOMMENDED_MODELS,
  formatModelSize,
  estimateRamForModel,
  listLocalModels,
  saveModelInfo,
  removeModel,
  clearAllModels,
} from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
import { Toaster, toast } from 'sonner';
interface ModelManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function ModelManager({ open, onOpenChange }: ModelManagerProps) {
  const { initialize, status: engineStatus, currentModel, initProgress } = useLocalEngine();
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshModels = useCallback(async () => {
    setIsLoading(true);
    const models = await listLocalModels();
    setLocalModels(models);
    setIsLoading(false);
  }, []);
  useEffect(() => {
    if (open) {
      refreshModels();
    }
  }, [open, refreshModels]);
  const handleLoadModel = async (model: LocalModel) => {
    toast.info(`Loading ${model.name}...`);
    const success = await initialize(model);
    if (success) {
      toast.success(`${model.name} loaded successfully!`);
    } else {
      toast.error(`Failed to load ${model.name}.`);
    }
  };
  const handleDownloadModel = async (model: LocalModel) => {
    toast.info(`Adding ${model.name} to your local models.`);
    await saveModelInfo(model);
    await refreshModels();
    toast.success(`${model.name} is available to load.`);
  };
  const handleRemoveModel = async (id: string) => {
    await removeModel(id);
    await refreshModels();
    toast.success('Model removed.');
  };
  const handleClearCache = async () => {
    await clearAllModels();
    await refreshModels();
    toast.success('All local model metadata cleared.');
  };
  return (
    <>
      <Toaster />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-2xl font-display">Model Manager</SheetTitle>
            <SheetDescription>Manage local models that run directly on your device via WebLLM.</SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Models</CardTitle>
                <CardDescription>Select a model to load it into the local engine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Recommended Models</h3>
                {RECOMMENDED_MODELS.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onLoad={handleLoadModel}
                    onDownload={handleDownloadModel}
                    isDownloaded={localModels.some(m => m.id === model.id)}
                    isLoading={engineStatus === 'initializing' && currentModel?.id === model.id}
                    isCurrent={currentModel?.id === model.id && engineStatus === 'ready'}
                    progress={engineStatus === 'initializing' && currentModel?.id === model.id ? initProgress : 0}
                  />
                ))}
                <h3 className="text-sm font-semibold text-muted-foreground pt-4">Your Local Models</h3>
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : localModels.length > 0 ? (
                  localModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onLoad={handleLoadModel}
                      onRemove={handleRemoveModel}
                      isDownloaded={true}
                      isLoading={engineStatus === 'initializing' && currentModel?.id === model.id}
                      isCurrent={currentModel?.id === model.id && engineStatus === 'ready'}
                      progress={engineStatus === 'initializing' && currentModel?.id === model.id ? initProgress : 0}
                    />
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">No local models added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <SheetFooter className="p-6 border-t flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Models are downloaded and cached by your browser.
            </p>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Metadata
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
function ModelCard({ model, onLoad, onRemove, onDownload, isDownloaded, isLoading, isCurrent, progress }: { model: LocalModel; onLoad: (model: LocalModel) => void; onRemove?: (id: string) => void; onDownload?: (model: LocalModel) => void; isDownloaded: boolean; isLoading: boolean; isCurrent: boolean; progress: number; }) {
  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
      <div className="flex-1">
        <h3 className="font-semibold flex items-center gap-2">
          {model.name}
          {isCurrent && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Loaded</Badge>}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><Cpu className="w-4 h-4" /> {model.family}</span>
          <span className="flex items-center gap-1"><MemoryStick className="w-4 h-4" /> {formatModelSize(estimateRamForModel(model.size))} RAM</span>
        </div>
        {isLoading && <Progress value={progress} className="mt-2 h-1" />}
      </div>
      <div className="flex items-center gap-2">
        {isDownloaded ? (
          <Button variant="outline" size="sm" onClick={() => onLoad(model)} disabled={isLoading || isCurrent}>
            {isLoading ? <RotateCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {isLoading ? 'Loading...' : isCurrent ? 'Loaded' : 'Load Model'}
          </Button>
        ) : onDownload && (
          <Button variant="outline" size="sm" onClick={() => onDownload(model)}>
            <Download className="w-4 h-4 mr-2" />
            Add to Local
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={() => onRemove(model.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}