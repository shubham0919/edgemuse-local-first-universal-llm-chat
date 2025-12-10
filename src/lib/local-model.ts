import localforage from 'localforage';
import '@/types/navigator.d.ts';
export type StorageEstimate = { usage?: number; quota?: number };
export interface LocalModel {
  id: string; // Corresponds to web-llm's local_id
  name: string;
  size: number; // in bytes
  quantization: string;
  family: string;
  source: 'recommended' | 'user';
  downloadUrl?: string; // For recommended models
  file?: File; // For user-uploaded models
}
// Use CORS-safe URLs from MLC-AI's official repo
export const RECOMMENDED_MODELS: LocalModel[] = [
  {
    id: 'Phi-3-mini-4k-instruct-q4f16_1',
    name: 'Phi-3 Mini 4k Instruct (Q4F16)',
    size: 2_300_000_000, // ~2.3 GB
    quantization: '4-bit',
    family: 'Phi',
    source: 'recommended',
    downloadUrl: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/',
  },
];
const modelStore = localforage.createInstance({
  name: 'EdgeMuseDB',
  storeName: 'models',
});
export async function listLocalModels(): Promise<LocalModel[]> {
  const keys = await modelStore.keys();
  const models: LocalModel[] = [];
  for (const key of keys) {
    const model = await modelStore.getItem<LocalModel>(key);
    if (model) {
      models.push(model);
    }
  }
  return models;
}
export async function saveModelInfo(model: LocalModel): Promise<void> {
  await modelStore.setItem(model.id, model);
}
export async function getModelInfo(id: string): Promise<LocalModel | null> {
  return await modelStore.getItem<LocalModel>(id);
}
export async function removeModel(id: string): Promise<void> {
  await modelStore.removeItem(id);
  // Note: This only removes metadata. The actual model files are managed by web-llm's cache.
}
export async function clearAllModels(): Promise<void> {
  await modelStore.clear();
  // Note: This only removes metadata. The actual model files are managed by web-llm's cache.
}
export function formatModelSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
export async function supportsWebGPU(): Promise<boolean> {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (e) {
    console.error("Error checking WebGPU support:", e);
    return false;
  }
}
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      return (await navigator.storage.estimate()) ?? null;
    } catch (error) {
      console.error("Could not estimate storage:", error);
      return null;
    }
  }
  return null;
}
export function estimateRamForModel(modelSize: number): number {
  // A rough estimate: model size + ~50% overhead for context, KV cache, etc.
  return modelSize * 1.5;
}