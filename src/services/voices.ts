export type VoiceKey = 'fr' | 'en' | 'it' | 'es' | 'de';

export type Voice = {
  key: VoiceKey;
  modelId: string;
  languageName: string;
  languageCode: string;
  voiceName: string;
  quality: 'medium';
  speaker: 'female' | 'male';
  flag: string;
  archiveBytes: number;
  sampleRate: number;
};

export const VOICES: Record<VoiceKey, Voice> = {
  fr: {
    key: 'fr',
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
};

export const VOICE_KEYS: readonly VoiceKey[] = ['fr', 'en', 'it', 'es', 'de'];

export function getVoice(key: VoiceKey): Voice {
  return VOICES[key];
}
