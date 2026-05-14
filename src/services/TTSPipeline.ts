import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import {
  loadEngine,
  synthesizeSentence,
  getActiveEngine,
  type SynthChunk,
} from './SherpaTTS';
import type { SynthParams } from './presets';
import { VOICES, type VoiceKey } from './voices';
import type { PresetKey } from './presets';
import { STEP_DEFS, type RunResult, type StepInfo, type PipelineStepKey } from './types';

Sound.setCategory('Playback', true);

export type PipelineEvent =
  | { type: 'step'; step: StepInfo }
  | { type: 'partial'; run: Partial<RunResult> };

export type PipelineHandlers = {
  onEvent?: (e: PipelineEvent) => void;
};

// Latin sentence endings need a trailing whitespace to avoid splitting on abbreviations / decimals.
// CJK sentence endings (。！？) are not followed by whitespace and split cleanly on their own.
const SENTENCE_SPLIT_RE = /([.!?]+\s+|[。！？]+)/g;

export function splitIntoSentences(text: string): string[] {
  // Normalize whitespace but preserve CJK characters.
  const cleaned = text.trim().replace(/[ \t\n\r]+/g, ' ');
  if (!cleaned) return [];
  const parts = cleaned.split(SENTENCE_SPLIT_RE);
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i];
    if (body == null || body.length === 0) continue;
    const punct = parts[i + 1] ?? '';
    const s = (body + punct).trim();
    if (s.length > 0) sentences.push(s);
  }
  if (sentences.length === 0 && cleaned.length > 0) sentences.push(cleaned);
  return sentences;
}

function nowMs(): number {
  return Date.now();
}

function deviceLabel(): string {
  if (Platform.OS === 'android') {
    const c = Platform.constants as {
      Brand?: string;
      Model?: string;
      Release?: string;
    };
    const parts = [c.Brand, c.Model].filter(Boolean).join(' ');
    return parts ? `${parts} (Android ${c.Release ?? Platform.Version})` : `Android ${Platform.Version}`;
  }
  if (Platform.OS === 'ios') {
    const c = Platform.constants as {
      systemName?: string;
      osVersion?: string;
      Model?: string;
    };
    const model = c.Model ?? 'iPhone';
    return `${model} (iOS ${c.osVersion ?? Platform.Version})`;
  }
  return `${Platform.OS} ${Platform.Version}`;
}

function freshSteps(): StepInfo[] {
  return STEP_DEFS.map((s) => ({ ...s, state: 'pending' as const }));
}

function setStep(
  steps: StepInfo[],
  key: PipelineStepKey,
  patch: Partial<StepInfo>,
  onEvent?: PipelineHandlers['onEvent'],
): void {
  const idx = steps.findIndex((s) => s.key === key);
  if (idx < 0) return;
  const existing = steps[idx];
  if (!existing) return;
  const merged: StepInfo = { ...existing, ...patch };
  steps[idx] = merged;
  onEvent?.({ type: 'step', step: merged });
}

function loadSound(path: string): Promise<Sound> {
  return new Promise((resolve, reject) => {
    const s = new Sound(path, '', (err) => {
      if (err) reject(err);
      else resolve(s);
    });
  });
}

function playSound(sound: Sound): Promise<void> {
  return new Promise((resolve) => {
    sound.play((success) => {
      if (!success) console.warn('Sound.play returned !success');
      sound.release();
      resolve();
    });
  });
}

export type PipelineInput = {
  text: string;
  voice: VoiceKey;
  presetKey: PresetKey;
  params: SynthParams;
  modelPath: string;
  modelAlreadyLoaded: boolean;
};

export async function runPipeline(
  input: PipelineInput,
  handlers: PipelineHandlers = {},
): Promise<RunResult> {
  const { onEvent } = handlers;
  const steps = freshSteps();
  const t0 = nowMs();
  const sentences = splitIntoSentences(input.text);
  const runId = `run-${t0}`;

  // Step 1: model load
  setStep(steps, 'modelLoad', { state: 'running' }, onEvent);
  const tModelStart = nowMs();
  if (input.modelAlreadyLoaded && getActiveEngine()) {
    setStep(
      steps,
      'modelLoad',
      { state: 'skipped', durationMs: 0 },
      onEvent,
    );
  } else {
    await loadEngine(VOICES[input.voice], input.modelPath, input.params);
    setStep(
      steps,
      'modelLoad',
      { state: 'done', durationMs: nowMs() - tModelStart },
      onEvent,
    );
  }

  // Step 2: text preprocessing (JS sentence split done above, just timestamp it)
  setStep(steps, 'preprocess', { state: 'running' }, onEvent);
  const tPreStart = nowMs();
  // Already split; record near-zero time.
  setStep(
    steps,
    'preprocess',
    { state: 'done', durationMs: Math.max(1, nowMs() - tPreStart) },
    onEvent,
  );

  // Steps 3-6: bundled native synthesis for the first sentence
  for (const k of ['phonemize', 'mapPhonemes', 'inferFirst', 'decodeFirst'] as PipelineStepKey[]) {
    setStep(steps, k, { state: 'running' }, onEvent);
  }
  const tSynthStart = nowMs();
  const firstChunk = await synthesizeSentence(sentences[0] ?? '', input.params);
  const firstSynthMs = nowMs() - tSynthStart;
  for (const k of ['phonemize', 'mapPhonemes', 'inferFirst', 'decodeFirst'] as PipelineStepKey[]) {
    setStep(steps, k, { state: 'done', durationMs: firstSynthMs }, onEvent);
  }

  // Step 7: buffer ready (WAV written = saveAudioToFile inside synthesizeSentence)
  setStep(steps, 'bufferReady', { state: 'done', durationMs: firstSynthMs }, onEvent);

  // Schedule subsequent sentences synthesis in parallel with playback.
  const remainingSentences = sentences.slice(1);
  const restChunks: SynthChunk[] = [];
  let restSynthMs = 0;
  const restPromise = (async () => {
    if (remainingSentences.length === 0) return;
    setStep(steps, 'inferRest', { state: 'running' }, onEvent);
    const tRestStart = nowMs();
    for (const s of remainingSentences) {
      const c = await synthesizeSentence(s, input.params);
      restChunks.push(c);
    }
    restSynthMs = nowMs() - tRestStart;
    setStep(steps, 'inferRest', { state: 'done', durationMs: restSynthMs }, onEvent);
  })();

  // Step 8: TTFA — load and play first WAV, record moment play() is invoked.
  const firstSound = await loadSound(firstChunk.wavPath);
  const tPlayCall = nowMs();
  const ttfaMs = tPlayCall - t0;
  setStep(steps, 'ttfa', { state: 'done', durationMs: ttfaMs }, onEvent);

  const playFirst = playSound(firstSound);

  await playFirst;

  // Wait for the rest of synthesis, then play them in order.
  await restPromise;
  for (const c of restChunks) {
    const snd = await loadSound(c.wavPath);
    await playSound(snd);
  }

  if (remainingSentences.length === 0) {
    setStep(steps, 'inferRest', { state: 'skipped', durationMs: 0 }, onEvent);
  }

  const totalGenerationMs = nowMs() - t0;
  const totalAudioMs =
    (firstChunk.durationSeconds +
      restChunks.reduce((a, c) => a + c.durationSeconds, 0)) *
    1000;
  const pcmBytes =
    (firstChunk.sampleCount + restChunks.reduce((a, c) => a + c.sampleCount, 0)) * 4;
  const inferenceMs = firstSynthMs + restSynthMs;
  const rtf = inferenceMs > 0 ? totalAudioMs / inferenceMs : 0;

  setStep(steps, 'complete', { state: 'done', durationMs: totalGenerationMs }, onEvent);

  const result: RunResult = {
    id: runId,
    startedAt: t0,
    voice: input.voice,
    presetKey: input.presetKey,
    params: input.params,
    sentenceCount: sentences.length,
    textLength: input.text.length,
    steps,
    ttfaMs,
    totalGenerationMs,
    inferenceMs,
    totalAudioMs,
    rtf,
    pcmBytes,
    deviceLabel: deviceLabel(),
  };
  const engine = getActiveEngine();
  console.log(
    `PIPER_BENCH ${JSON.stringify({
      voice: result.voice,
      presetKey: result.presetKey,
      params: result.params,
      ttfaMs: result.ttfaMs,
      inferenceMs: result.inferenceMs,
      totalGenerationMs: result.totalGenerationMs,
      totalAudioMs: result.totalAudioMs,
      rtf: Number(result.rtf.toFixed(2)),
      pcmBytes: result.pcmBytes,
      deviceLabel: result.deviceLabel,
      provider: engine?.provider ?? 'unknown',
      numThreads: engine?.numThreads ?? 0,
      cold: !input.modelAlreadyLoaded,
    })}`,
  );
  return result;
}
