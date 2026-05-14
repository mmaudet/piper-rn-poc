import { Platform } from 'react-native';
import {
  createTTS,
  saveAudioToFile,
  type TtsEngine,
  type GeneratedAudio,
} from 'react-native-sherpa-onnx/tts';
import { fileModelPath } from 'react-native-sherpa-onnx';
import { DocumentDirectoryPath, mkdir } from '@dr.pogodin/react-native-fs';
import type { SynthParams } from './presets';

export type LoadedEngine = {
  engine: TtsEngine;
  sampleRate: number;
  modelPath: string;
  params: SynthParams;
  provider: string;
  numThreads: number;
};

const TEMP_DIR = `${DocumentDirectoryPath}/piper-tmp`.replace(/\/+/g, '/');
let tempDirEnsured = false;

async function ensureTempDir(): Promise<string> {
  if (!tempDirEnsured) {
    await mkdir(TEMP_DIR);
    tempDirEnsured = true;
  }
  return TEMP_DIR;
}

let activeEngine: LoadedEngine | null = null;
let activeKey: string | null = null;

function vitsOptions(params: SynthParams) {
  return {
    vits: {
      noiseScale: params.noiseScale,
      noiseScaleW: params.noiseW,
      lengthScale: params.lengthScale,
    },
  };
}

const DEFAULT_NUM_THREADS = 4;

function preferredProviders(): string[] {
  if (Platform.OS === 'android') return ['nnapi', 'xnnpack', 'cpu'];
  if (Platform.OS === 'ios') return ['coreml', 'cpu'];
  return ['cpu'];
}

async function tryCreateTTS(
  modelPath: string,
  params: SynthParams,
  numThreads: number,
  provider: string,
): Promise<TtsEngine> {
  return await createTTS({
    modelPath: fileModelPath(modelPath),
    modelType: 'vits',
    numThreads,
    provider,
    debug: false,
    modelOptions: vitsOptions(params),
  });
}

export async function loadEngine(
  modelPath: string,
  params: SynthParams,
  numThreads: number = DEFAULT_NUM_THREADS,
): Promise<LoadedEngine> {
  const providers = preferredProviders();
  const key = `${modelPath}::${params.lengthScale}:${params.noiseScale}:${params.noiseW}:${numThreads}`;
  if (activeEngine && activeKey === key) return activeEngine;

  if (activeEngine) {
    try {
      await activeEngine.engine.destroy();
    } catch (err) {
      console.warn('SherpaTTS: destroy failed', err);
    }
    activeEngine = null;
    activeKey = null;
  }

  let lastErr: unknown = null;
  for (const provider of providers) {
    try {
      const engine = await tryCreateTTS(modelPath, params, numThreads, provider);
      const info = await engine.getModelInfo();
      activeEngine = {
        engine,
        sampleRate: info.sampleRate ?? 22050,
        modelPath,
        params,
        provider,
        numThreads,
      };
      activeKey = key;
      console.log(
        `PIPER_ENGINE provider=${provider} numThreads=${numThreads} sampleRate=${activeEngine.sampleRate}`,
      );
      return activeEngine;
    } catch (err) {
      lastErr = err;
      console.warn(
        `SherpaTTS: provider '${provider}' failed (${String(err)}), trying next…`,
      );
    }
  }
  throw new Error(
    `Failed to load TTS engine on any provider [${providers.join(',')}]: ${String(lastErr)}`,
  );
}

export async function updateParams(params: SynthParams): Promise<void> {
  if (!activeEngine) return;
  await activeEngine.engine.updateParams({
    modelOptions: vitsOptions(params),
  });
  activeEngine.params = params;
  activeKey = `${activeEngine.modelPath}::${params.lengthScale}:${params.noiseScale}:${params.noiseW}:${activeEngine.numThreads}`;
}

export type SynthChunk = {
  wavPath: string;
  durationSeconds: number;
  sampleCount: number;
  sampleRate: number;
};

let wavCounter = 0;

export async function synthesizeSentence(
  text: string,
  params: SynthParams,
): Promise<SynthChunk> {
  if (!activeEngine) {
    throw new Error('TTS engine not loaded');
  }
  const audio: GeneratedAudio = await activeEngine.engine.generateSpeech(text, {
    silenceScale: 0.2,
  });
  const dir = await ensureTempDir();
  wavCounter += 1;
  const wavPath = `${dir}/chunk-${Date.now()}-${wavCounter}.wav`;
  await saveAudioToFile(audio, wavPath);
  const sampleRate = audio.sampleRate ?? activeEngine.sampleRate;
  const sampleCount = audio.samples?.length ?? 0;
  void params;
  return {
    wavPath,
    durationSeconds: sampleCount / sampleRate,
    sampleCount,
    sampleRate,
  };
}

export async function unloadEngine(): Promise<void> {
  if (!activeEngine) return;
  try {
    await activeEngine.engine.destroy();
  } catch (err) {
    console.warn('SherpaTTS: destroy failed', err);
  }
  activeEngine = null;
  activeKey = null;
}

export function getActiveEngine(): LoadedEngine | null {
  return activeEngine;
}
