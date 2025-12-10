export interface LocalModel {
  id: string;
  name: string;
  size: number; // in bytes
  quantization: string;
  family: string;
  source: 'recommended' | 'user';
  file?: File; // For user-uploaded models
  downloadUrl?: string; // For recommended models
}
export const RECOMMENDED_MODELS: LocalModel[] = [
  {
    id: 'phi-2-q4k',
    name: 'Phi-2 (Q4K)',
    size: 1_620_000_000, // ~1.62 GB
    quantization: '4-bit',
    family: 'Phi',
    source: 'recommended',
    downloadUrl: 'https://huggingface.co/microsoft/phi-2/resolve/main/model-q4k.gguf',
  },
  {
    id: 'llama-3-8b-instruct-q4k',
    name: 'Llama 3 8B Instruct (Q4K)',
    size: 4_100_000_000, // ~4.1 GB
    quantization: '4-bit',
    family: 'Llama',
    source: 'recommended',
    downloadUrl: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct/resolve/main/model-q4k.gguf',
  },
  {
    id: 'gemma-2b-it-q4k',
    name: 'Gemma 2B IT (Q4K)',
    size: 1_500_000_000, // ~1.5 GB
    quantization: '4-bit',
    family: 'Gemma',
    source: 'recommended',
    downloadUrl: 'https://huggingface.co/google/gemma-2b-it/resolve/main/model-q4k.gguf',
  },
];
export function formatModelSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
export function supportsWebGPU(): boolean {
  return 'gpu' in navigator;
}
export function estimateRamForModel(modelSize: number): number {
  // A rough estimate: model size + ~20% overhead for context, etc.
  return modelSize * 1.2;
}
// In-memory registry for this phase
const userModels = new Map<string, LocalModel>();
export function addUserModel(file: File): LocalModel {
  const model: LocalModel = {
    id: `user-${file.name}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    quantization: 'Unknown',
    family: 'Unknown',
    source: 'user',
    file,
  };
  userModels.set(model.id, model);
  return model;
}
export function listUserModels(): LocalModel[] {
  return Array.from(userModels.values());
}
export function removeUserModel(id: string): boolean {
  return userModels.delete(id);
}