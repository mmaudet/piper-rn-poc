import { Platform } from 'react-native';
import {
  createTTS,
  saveAudioToFile,
  type TtsEngine,
  type GeneratedAudio,
} from 'react-native-sherpa-onnx/tts';
import { fileModelPath } from 'react-native-sherpa-onnx';
import {
  DocumentDirectoryPath,
  mkdir,
  exists,
  copyFile,
  readDir,
} from '@dr.pogodin/react-native-fs';
import type { SynthParams } from './presets';
import type { Voice } from './voices';

export type LoadedEngine = {
  engine: TtsEngine;
  sampleRate: number;
  modelPath: string;
  params: SynthParams;
  provider: string;
  numThreads: number;
  voice: Voice;
  /** Resolved ruleFsts string if any (Kokoro multi-lang). */
  ruleFsts?: string;
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

function kokoroOptions(params: SynthParams) {
  return {
    kokoro: {
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

/**
 * Workaround for the Kokoro multi-lang wrapper limitation: the wrapper picks
 * up `lexicon.txt` (the "default") and ignores `lexicon-<lang>.txt`. To make
 * Chinese work we copy `lexicon-zh.txt` to `lexicon.txt` if the latter is
 * missing, and we collect the rule FSTs to pass via `ruleFsts`.
 *
 * Returns the resolved ruleFsts CSV string (or undefined if not Kokoro).
 */
async function prepareKokoroDir(modelDir: string): Promise<string | undefined> {
  const defaultLex = `${modelDir}/lexicon.txt`;
  const zhLex = `${modelDir}/lexicon-zh.txt`;
  if (!(await exists(defaultLex)) && (await exists(zhLex))) {
    await copyFile(zhLex, defaultLex);
  }
  const entries = await readDir(modelDir);
  const fsts = entries
    .filter((e) => e.isFile() && /\.fst$/.test(e.name))
    .map((e) => e.path);
  if (fsts.length === 0) return undefined;
  return fsts.join(',');
}

async function tryCreateTTS(
  voice: Voice,
  modelPath: string,
  params: SynthParams,
  numThreads: number,
  provider: string,
): Promise<{ engine: TtsEngine; ruleFsts: string | undefined }> {
  let modelOptions: Record<string, unknown> | undefined;
  let ruleFsts: string | undefined;

  if (voice.modelType === 'vits') {
    modelOptions = vitsOptions(params);
  } else if (voice.modelType === 'kokoro') {
    modelOptions = kokoroOptions(params);
    ruleFsts = await prepareKokoroDir(modelPath);
  }
  // supertonic: no init-time modelOptions; lang is passed at generate time via `extra`.

  const cfg = {
    modelPath: fileModelPath(modelPath),
    modelType: voice.modelType,
    numThreads,
    provider,
    debug: false,
    ...(modelOptions ? { modelOptions } : {}),
    ...(ruleFsts ? { ruleFsts } : {}),
  } as Parameters<typeof createTTS>[0];

  const engine = await createTTS(cfg);
  return { engine, ruleFsts };
}

export async function loadEngine(
  voice: Voice,
  modelPath: string,
  params: SynthParams,
  numThreads: number = DEFAULT_NUM_THREADS,
): Promise<LoadedEngine> {
  const providers = preferredProviders();
  const key = `${voice.key}::${modelPath}::${params.lengthScale}:${params.noiseScale}:${params.noiseW}:${numThreads}`;
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
      const { engine, ruleFsts } = await tryCreateTTS(
        voice,
        modelPath,
        params,
        numThreads,
        provider,
      );
      const info = await engine.getModelInfo();
      activeEngine = {
        engine,
        sampleRate: info.sampleRate ?? voice.sampleRate,
        modelPath,
        params,
        provider,
        numThreads,
        voice,
        ruleFsts,
      };
      activeKey = key;
      console.log(
        `PIPER_ENGINE voice=${voice.key} modelType=${voice.modelType} provider=${provider} numThreads=${numThreads} sampleRate=${activeEngine.sampleRate} ruleFsts=${ruleFsts ?? 'none'}`,
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
  const voice = activeEngine.voice;
  if (voice.modelType === 'vits') {
    await activeEngine.engine.updateParams({ modelOptions: vitsOptions(params) });
  } else if (voice.modelType === 'kokoro') {
    await activeEngine.engine.updateParams({ modelOptions: kokoroOptions(params) });
  }
  // supertonic: nothing to update at init level; length is applied via speed at generate.
  activeEngine.params = params;
  activeKey = `${voice.key}::${activeEngine.modelPath}::${params.lengthScale}:${params.noiseScale}:${params.noiseW}:${activeEngine.numThreads}`;
}

export type SynthChunk = {
  wavPath: string;
  durationSeconds: number;
  sampleCount: number;
  sampleRate: number;
};

let wavCounter = 0;

function generateOptionsFor(voice: Voice, params: SynthParams): Record<string, unknown> {
  const opts: Record<string, unknown> = { silenceScale: 0.2 };
  if (voice.defaultSid !== undefined) opts.sid = voice.defaultSid;
  if (voice.modelType === 'supertonic') {
    // Length applies via the `speed` knob at generate time. speed > 1 = faster.
    // Our `lengthScale` convention is >1 = slower, so we invert.
    opts.speed = 1 / Math.max(params.lengthScale, 0.01);
    if (voice.generateLang) opts.extra = { lang: voice.generateLang };
  }
  return opts;
}

export async function synthesizeSentence(
  text: string,
  params: SynthParams,
): Promise<SynthChunk> {
  if (!activeEngine) {
    throw new Error('TTS engine not loaded');
  }
  const voice = activeEngine.voice;
  const opts = generateOptionsFor(voice, params);
  const audio: GeneratedAudio = await activeEngine.engine.generateSpeech(text, opts);
  const dir = await ensureTempDir();
  wavCounter += 1;
  const wavPath = `${dir}/chunk-${Date.now()}-${wavCounter}.wav`;
  await saveAudioToFile(audio, wavPath);
  const sampleRate = audio.sampleRate ?? activeEngine.sampleRate;
  const sampleCount = audio.samples?.length ?? 0;
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
