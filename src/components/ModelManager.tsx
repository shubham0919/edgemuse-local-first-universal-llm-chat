import { useState, useCallback } from 'react';
import { UploadCloud, Cpu, MemoryStick, Trash2, Wand2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDropzone } from 'react-dropzone';
import { useLocalEngine } from './LocalEngineAdapter';
import { RECOMMENDED_MODELS, formatModelSize, addUserModel, listUserModels, removeUserModel } from '@/lib/local-model';
import type { LocalModel } from '@/lib/local-model';
interface ModelManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function ModelManager({ open, onOpenChange }: ModelManagerProps) {
  const { initialize, status: engineStatus, currentModel } = useLocalEngine();
  const [userModels, setUserModels] = useState<LocalModel[]>(listUserModels());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      addUserModel(file);
    });
    setUserModels(listUserModels());
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.gguf'] },
  });
  const handleTestModel = async (model: LocalModel) => {
    setTestStatus('testing');
    const success = await initialize(model);
    setTestStatus(success ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };
  const handleRemoveModel = (id: string) => {
    removeUserModel(id);
    setUserModels(listUserModels());
  };
  const totalStorage = 10 * 1024 * 1024 * 1024; // Mock 10GB total
  const usedStorage = userModels.reduce((acc, model) => acc + model.size, 0);
  const storagePercentage = (usedStorage / totalStorage) * 100;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl font-display">Model Manager</SheetTitle>
          <SheetDescription>Manage local models that run directly on your device.</SheetDescription>
        </SheetHeader>
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Local Storage</CardTitle>
              <CardDescription>Models you upload are stored in your browser.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={storagePercentage} />
                <p className="text-sm text-muted-foreground">
                  {formatModelSize(usedStorage)} of {formatModelSize(totalStorage)} used
                </p>
              </div>
            </CardContent>
          </Card>
          <Tabs defaultValue="recommended">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
              <TabsTrigger value="user">My Models</TabsTrigger>
            </TabsList>
            <TabsContent value="recommended" className="mt-4 space-y-4">
              {RECOMMENDED_MODELS.map((model) => (
                <ModelCard key={model.id} model={model} onTest={handleTestModel} testStatus={testStatus} currentModel={currentModel} engineStatus={engineStatus} />
              ))}
            </TabsContent>
            <TabsContent value="user" className="mt-4 space-y-4">
              <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Drag & drop a .gguf model file here, or click to select</p>
              </div>
              {userModels.length > 0 ? (
                userModels.map((model) => (
                  <ModelCard key={model.id} model={model} onTest={handleTestModel} onRemove={handleRemoveModel} testStatus={testStatus} currentModel={currentModel} engineStatus={engineStatus} />
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">You haven't uploaded any models yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <SheetFooter className="p-6 border-t">
          <p className="text-xs text-muted-foreground">
            Model files must respect their original licenses. Large models may not run on all devices.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
function ModelCard({ model, onTest, onRemove, testStatus, currentModel, engineStatus }: { model: LocalModel; onTest: (model: LocalModel) => void; onRemove?: (id: string) => void; testStatus: 'idle' | 'testing' | 'success' | 'error'; currentModel: LocalModel | null; engineStatus: string; }) {
  const isCurrent = currentModel?.id === model.id;
  const isReady = isCurrent && engineStatus === 'ready';
  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
      <div className="flex-1">
        <h3 className="font-semibold">{model.name} {isReady && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Loaded</Badge>}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><Cpu className="w-4 h-4" /> {model.family}</span>
          <span className="flex items-center gap-1"><MemoryStick className="w-4 h-4" /> {formatModelSize(model.size)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onTest(model)} disabled={testStatus === 'testing'}>
          {testStatus === 'testing' && <Wand2 className="w-4 h-4 mr-2 animate-pulse" />}
          {testStatus === 'success' && <CheckCircle className="w-4 h-4 mr-2 text-green-500" />}
          {testStatus === 'error' && <XCircle className="w-4 h-4 mr-2 text-red-500" />}
          Test Model
        </Button>
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={() => onRemove(model.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}