export type VoiceKey = 'fr' | 'en' | 'it' | 'es' | 'de' | 'nl' | 'ja' | 'zh';

export type ModelKind = 'vits' | 'supertonic' | 'kokoro';

export type Voice = {
  key: VoiceKey;
  modelType: ModelKind;
  /** Archive ID as published in k2-fsa/sherpa-onnx releases (`tts-models` tag). Multiple voices can share the same archive (e.g. Supertonic-3 covers nl + ja). */
  modelId: string;
  languageName: string;
  /** BCP-47-ish code shown in UI (`fr_FR`, `nl`, `cmn`, etc.) */
  languageCode: string;
  voiceName: string;
  /** For Supertonic: lang code consumed via `extra: { lang }` at generate time. Undefined for VITS / single-lang Kokoro. */
  generateLang?: string;
  /** Default speaker ID for multi-speaker models. Undefined or 0 for single-speaker. */
  defaultSid?: number;
  quality: 'medium' | 'int8';
  speaker: 'female' | 'male';
  flag: string;
  archiveBytes: number;
  sampleRate: number;
};

const SUPERTONIC_3_MODEL_ID = 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11';
const SUPERTONIC_3_ARCHIVE_BYTES = 102_000_000; // approx; refreshed on first download
const MELO_ZH_MODEL_ID = 'vits-melo-tts-zh_en';
const MELO_ZH_ARCHIVE_BYTES = 167_006_755; // confirmed against sherpa-onnx checksum.txt

export const VOICES: Record<VoiceKey, Voice> = {
  fr: {
    key: 'fr',
    modelType: 'vits',
    modelId: 'vits-piper-fr_FR-siwis-medium',
    languageName: 'Français',
    languageCode: 'fr_FR',
    voiceName: 'siwis',
    quality: 'medium',
    speaker: 'female',
    flag: '🇫🇷',
    archiveBytes: 67_207_459,
    sampleRate: 22050,
  },
  en: {
    key: 'en',
    modelType: 'vits',
    modelId: 'vits-piper-en_US-lessac-medium',
    languageName: 'English',
    languageCode: 'en_US',
    voiceName: 'lessac',
    quality: 'medium',
    speaker: 'female',
    flag: '🇺🇸',
    archiveBytes: 67_230_653,
    sampleRate: 22050,
  },
  it: {
    key: 'it',
    modelType: 'vits',
    modelId: 'vits-piper-it_IT-paola-medium',
    languageName: 'Italiano',
    languageCode: 'it_IT',
    voiceName: 'paola',
    quality: 'medium',
    speaker: 'female',
    flag: '🇮🇹',
    archiveBytes: 67_221_173,
    sampleRate: 22050,
  },
  es: {
    key: 'es',
    modelType: 'vits',
    modelId: 'vits-piper-es_ES-sharvard-medium',
    languageName: 'Español',
    languageCode: 'es_ES',
    voiceName: 'sharvard',
    quality: 'medium',
    speaker: 'female',
    flag: '🇪🇸',
    archiveBytes: 80_318_184,
    sampleRate: 22050,
  },
  de: {
    key: 'de',
    modelType: 'vits',
    modelId: 'vits-piper-de_DE-thorsten-medium',
    languageName: 'Deutsch',
    languageCode: 'de_DE',
    voiceName: 'thorsten',
    quality: 'medium',
    speaker: 'male',
    flag: '🇩🇪',
    archiveBytes: 67_214_254,
    sampleRate: 22050,
  },
  nl: {
    key: 'nl',
    modelType: 'supertonic',
    modelId: SUPERTONIC_3_MODEL_ID,
    languageName: 'Nederlands',
    languageCode: 'nl',
    voiceName: 'supertonic-F3',
    generateLang: 'nl',
    defaultSid: 2,
    quality: 'int8',
    speaker: 'female',
    flag: '🇳🇱',
    archiveBytes: SUPERTONIC_3_ARCHIVE_BYTES,
    sampleRate: 24000,
  },
  ja: {
    key: 'ja',
    modelType: 'supertonic',
    modelId: SUPERTONIC_3_MODEL_ID,
    languageName: '日本語',
    languageCode: 'ja',
    voiceName: 'supertonic-F3',
    generateLang: 'ja',
    defaultSid: 2,
    quality: 'int8',
    speaker: 'female',
    flag: '🇯🇵',
    archiveBytes: SUPERTONIC_3_ARCHIVE_BYTES,
    sampleRate: 24000,
  },
  zh: {
    key: 'zh',
    modelType: 'vits',
    modelId: MELO_ZH_MODEL_ID,
    languageName: '中文',
    languageCode: 'cmn',
    voiceName: 'melo-tts',
    quality: 'medium',
    speaker: 'female',
    flag: '🇨🇳',
    archiveBytes: MELO_ZH_ARCHIVE_BYTES,
    sampleRate: 44100,
  },
};

export const VOICE_KEYS: readonly VoiceKey[] = [
  'fr',
  'en',
  'it',
  'es',
  'de',
  'nl',
  'ja',
  'zh',
];

export function getVoice(key: VoiceKey): Voice {
  return VOICES[key];
}

export function isVits(v: Voice): boolean {
  return v.modelType === 'vits';
}
