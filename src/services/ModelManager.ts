import {
  ModelCategory,
  ensureModelByCategory,
  isModelDownloadedByCategory,
  getLocalModelPathByCategory,
  deleteModelByCategory,
  refreshModelsByCategory,
  type DownloadProgress,
  type TtsModelMeta,
} from 'react-native-sherpa-onnx/download';
import { VOICES, type VoiceKey, type Voice } from './voices';

export type ModelStatus =
  | { state: 'absent' }
  | { state: 'downloading'; progress: DownloadProgress }
  | { state: 'ready'; localPath: string }
  | { state: 'error'; message: string };

export type DownloadCallbacks = {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
};

let registryRefreshed = false;

async function ensureRegistry(): Promise<void> {
  if (registryRefreshed) return;
  try {
    await refreshModelsByCategory<TtsModelMeta>(ModelCategory.Tts);
    registryRefreshed = true;
  } catch (err) {
    console.warn('ModelManager: registry refresh failed', err);
  }
}

export async function getModelStatus(voiceKey: VoiceKey): Promise<ModelStatus> {
  const voice = VOICES[voiceKey];
  try {
    const downloaded = await isModelDownloadedByCategory(
      ModelCategory.Tts,
      voice.modelId,
    );
    if (!downloaded) return { state: 'absent' };
    const localPath = await getLocalModelPathByCategory(
      ModelCategory.Tts,
      voice.modelId,
    );
    if (!localPath) return { state: 'absent' };
    return { state: 'ready', localPath };
  } catch (err) {
    return { state: 'error', message: String(err) };
  }
}

export async function downloadVoice(
  voiceKey: VoiceKey,
  cb?: DownloadCallbacks,
): Promise<string> {
  const voice = VOICES[voiceKey];
  await ensureRegistry();
  const result = await ensureModelByCategory<TtsModelMeta>(
    ModelCategory.Tts,
    voice.modelId,
    {
      onProgress: cb?.onProgress,
      signal: cb?.signal,
      deleteArchiveAfterExtract: true,
    },
  );
  return result.localPath;
}

export async function deleteVoice(voiceKey: VoiceKey): Promise<void> {
  const voice = VOICES[voiceKey];
  await deleteModelByCategory(ModelCategory.Tts, voice.modelId);
}

export async function listDownloadedVoices(): Promise<VoiceKey[]> {
  const out: VoiceKey[] = [];
  for (const v of Object.values(VOICES) as Voice[]) {
    const downloaded = await isModelDownloadedByCategory(
      ModelCategory.Tts,
      v.modelId,
    );
    if (downloaded) out.push(v.key);
  }
  return out;
}

export function totalArchiveBytes(voiceKeys: readonly VoiceKey[]): number {
  return voiceKeys.reduce((acc, k) => acc + VOICES[k].archiveBytes, 0);
}
