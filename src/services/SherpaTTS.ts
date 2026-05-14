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

export async function loadEngine(
  modelPath: string,
  params: SynthParams,
  numThreads: number = 2,
): Promise<LoadedEngine> {
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

  const engine = await createTTS({
    modelPath: fileModelPath(modelPath),
    modelType: 'vits',
    numThreads,
    debug: false,
    modelOptions: vitsOptions(params),
  });
  const info = await engine.getModelInfo();
  activeEngine = {
    engine,
    sampleRate: info.sampleRate ?? 22050,
    modelPath,
    params,
  };
  activeKey = key;
  return activeEngine;
}

export async function updateParams(params: SynthParams): Promise<void> {
  if (!activeEngine) return;
  await activeEngine.engine.updateParams({
    modelOptions: vitsOptions(params),
  });
  activeEngine.params = params;
  activeKey = `${activeEngine.modelPath}::${params.lengthScale}:${params.noiseScale}:${params.noiseW}:2`;
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
  // Touch params so TS does not flag it; engine already initialized with these.
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
