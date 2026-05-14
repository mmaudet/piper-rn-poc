export type PresetKey =
  | 'narration'
  | 'documentary'
  | 'conversation'
  | 'fastread'
  | 'custom';

export type SynthParams = {
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
};

export type Preset = SynthParams & {
  key: Exclude<PresetKey, 'custom'>;
  label: string;
  badge?: string;
};

export const MODEL_DEFAULTS: SynthParams = {
  lengthScale: 1.0,
  noiseScale: 0.667,
  noiseW: 0.8,
};

export const SLIDER_RANGES = {
  lengthScale: { min: 0.5, max: 1.5, step: 0.01 },
  noiseScale: { min: 0.3, max: 0.9, step: 0.01 },
  noiseW: { min: 0.3, max: 1.0, step: 0.01 },
} as const;

export const PRESETS: Record<Exclude<PresetKey, 'custom'>, Preset> = {
  narration: {
    key: 'narration',
    label: 'Narration patrimoniale',
    badge: '⭐',
    lengthScale: 1.1,
    noiseScale: 0.5,
    noiseW: 0.7,
  },
  documentary: {
    key: 'documentary',
    label: 'Documentaire',
    lengthScale: 1.0,
    noiseScale: 0.55,
    noiseW: 0.75,
  },
  conversation: {
    key: 'conversation',
    label: 'Conversation',
    lengthScale: 0.95,
    noiseScale: 0.7,
    noiseW: 0.85,
  },
  fastread: {
    key: 'fastread',
    label: 'Lecture rapide',
    lengthScale: 0.85,
    noiseScale: 0.6,
    noiseW: 0.7,
  },
};

export const PRESET_ORDER: readonly Exclude<PresetKey, 'custom'>[] = [
  'narration',
  'documentary',
  'conversation',
  'fastread',
];

export const DEFAULT_PRESET: Exclude<PresetKey, 'custom'> = 'narration';

const TOLERANCE = 0.005;

export function paramsMatchPreset(params: SynthParams, preset: Preset): boolean {
  return (
    Math.abs(params.lengthScale - preset.lengthScale) < TOLERANCE &&
    Math.abs(params.noiseScale - preset.noiseScale) < TOLERANCE &&
    Math.abs(params.noiseW - preset.noiseW) < TOLERANCE
  );
}

export function detectPreset(params: SynthParams): PresetKey {
  for (const key of PRESET_ORDER) {
    if (paramsMatchPreset(params, PRESETS[key])) return key;
  }
  return 'custom';
}

export function presetLabel(key: PresetKey): string {
  if (key === 'custom') return 'Personnalisé';
  return PRESETS[key].label;
}

/** Which slider knobs are actually consumed by each model type. */
export type ApplicableParams = {
  length: boolean;
  noise: boolean;
  noiseW: boolean;
};

export function applicableParamsForModelType(
  modelType: 'vits' | 'supertonic' | 'kokoro',
): ApplicableParams {
  if (modelType === 'vits') return { length: true, noise: true, noiseW: true };
  // Supertonic + Kokoro only use a length / speed knob; noise params are ignored.
  return { length: true, noise: false, noiseW: false };
}

