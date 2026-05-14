import type { PresetKey, SynthParams } from './presets';
import type { VoiceKey } from './voices';

export type PipelineStepKey =
  | 'modelLoad'
  | 'preprocess'
  | 'phonemize'
  | 'mapPhonemes'
  | 'inferFirst'
  | 'decodeFirst'
  | 'bufferReady'
  | 'ttfa'
  | 'inferRest'
  | 'complete';

export type StepState = 'pending' | 'running' | 'done' | 'skipped';

export type StepInfo = {
  key: PipelineStepKey;
  label: string;
  state: StepState;
  durationMs?: number;
  /** True if this step is bundled into the native generateSpeech call. */
  bundled?: boolean;
};

export const STEP_DEFS: readonly Omit<StepInfo, 'state' | 'durationMs'>[] = [
  { key: 'modelLoad', label: 'Chargement modèle ONNX en mémoire' },
  { key: 'preprocess', label: 'Préprocessing texte (normalisation)' },
  { key: 'phonemize', label: 'Phonémisation eSpeak-ng', bundled: true },
  { key: 'mapPhonemes', label: 'Mapping phonèmes → IDs', bundled: true },
  { key: 'inferFirst', label: 'Inférence 1ʳᵉ phrase (ONNX)', bundled: true },
  { key: 'decodeFirst', label: 'Décodage PCM 1ʳᵉ phrase', bundled: true },
  { key: 'bufferReady', label: 'Buffer audio prêt' },
  { key: 'ttfa', label: 'TIME TO FIRST AUDIO' },
  { key: 'inferRest', label: 'Inférence phrases suivantes' },
  { key: 'complete', label: 'Génération complète terminée' },
];

export type RunResult = {
  id: string;
  startedAt: number;
  voice: VoiceKey;
  presetKey: PresetKey;
  params: SynthParams;
  sentenceCount: number;
  textLength: number;
  steps: StepInfo[];
  ttfaMs: number;
  /** Wall-clock from tap to last sample played. Includes playback time. */
  totalGenerationMs: number;
  /** Sum of native synthesis time across all sentences. Excludes model load + playback. */
  inferenceMs: number;
  totalAudioMs: number;
  /** Real-Time Factor = totalAudioMs / inferenceMs. >1 means faster than realtime. */
  rtf: number;
  pcmBytes: number;
  deviceLabel: string;
};
