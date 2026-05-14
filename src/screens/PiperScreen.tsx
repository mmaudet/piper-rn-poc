import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageSelector } from '../components/LanguageSelector';
import { ModelLoader } from '../components/ModelLoader';
import { SynthesisParamPanel } from '../components/SynthesisParamPanel';
import { TextInputBlock } from '../components/TextInputBlock';
import { TimelinePanel } from '../components/TimelinePanel';
import { RunHistory } from '../components/RunHistory';
import { colors } from '../components/theme';
import { VOICE_KEYS, VOICES, type VoiceKey } from '../services/voices';
import {
  DEFAULT_PRESET,
  PRESETS,
  detectPreset,
  type PresetKey,
  type SynthParams,
} from '../services/presets';
import { SAMPLE_TEXTS } from '../services/sampleTexts';
import {
  deleteVoice,
  downloadVoice,
  getModelStatus,
  type ModelStatus,
} from '../services/ModelManager';
import { unloadEngine } from '../services/SherpaTTS';
import { runPipeline } from '../services/TTSPipeline';
import {
  exportMarkdown,
  logRun,
  subscribe,
  clearHistory,
} from '../services/BenchmarkLogger';
import { STEP_DEFS, type RunResult, type StepInfo } from '../services/types';

function emptyStatuses(): Record<VoiceKey, ModelStatus> {
  return VOICE_KEYS.reduce((acc, k) => {
    acc[k] = { state: 'absent' };
    return acc;
  }, {} as Record<VoiceKey, ModelStatus>);
}

function freshSteps(): StepInfo[] {
  return STEP_DEFS.map((s) => ({ ...s, state: 'pending' as const }));
}

export function PiperScreen() {
  const insets = useSafeAreaInsets();
  const [voice, setVoice] = useState<VoiceKey>('fr');
  const [statuses, setStatuses] = useState<Record<VoiceKey, ModelStatus>>(emptyStatuses);
  const [presetKey, setPresetKey] = useState<PresetKey>(DEFAULT_PRESET);
  const [params, setParams] = useState<SynthParams>(PRESETS[DEFAULT_PRESET]);
  const [text, setText] = useState<string>(SAMPLE_TEXTS.fr);
  const [busy, setBusy] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<StepInfo[]>(freshSteps());
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<readonly RunResult[]>([]);
  const loadedVoiceRef = useRef<VoiceKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = emptyStatuses();
      for (const k of VOICE_KEYS) {
        next[k] = await getModelStatus(k);
      }
      if (!cancelled) setStatuses(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribe(setHistory), []);

  useEffect(() => {
    setText(SAMPLE_TEXTS[voice]);
  }, [voice]);

  const refreshStatus = useCallback(async (key: VoiceKey) => {
    const s = await getModelStatus(key);
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }, []);

  const onPresetChange = useCallback((key: PresetKey) => {
    setPresetKey(key);
    if (key !== 'custom') {
      setParams(PRESETS[key]);
    }
  }, []);

  const onParamsChange = useCallback((next: SynthParams) => {
    setParams(next);
    setPresetKey(detectPreset(next));
  }, []);

  const onDownload = useCallback(async () => {
    const key = voice;
    setStatuses((prev) => ({
      ...prev,
      [key]: {
        state: 'downloading',
        progress: { bytesDownloaded: 0, totalBytes: 0, percent: 0 },
      },
    }));
    try {
      await downloadVoice(key, {
        onProgress: (progress) => {
          setStatuses((prev) => {
            const cur = prev[key];
            if (cur?.state !== 'downloading') return prev;
            return { ...prev, [key]: { state: 'downloading', progress } };
          });
        },
      });
      await refreshStatus(key);
    } catch (err) {
      Alert.alert('Download failed', String(err));
      setStatuses((prev) => ({
        ...prev,
        [key]: { state: 'error', message: String(err) },
      }));
    }
  }, [voice, refreshStatus]);

  const onDelete = useCallback(async () => {
    const key = voice;
    try {
      if (loadedVoiceRef.current === key) {
        await unloadEngine();
        loadedVoiceRef.current = null;
      }
      await deleteVoice(key);
      await refreshStatus(key);
    } catch (err) {
      Alert.alert('Delete failed', String(err));
    }
  }, [voice, refreshStatus]);

  const onSelectVoice = useCallback(
    async (key: VoiceKey) => {
      if (key === voice) return;
      if (loadedVoiceRef.current && loadedVoiceRef.current !== key) {
        await unloadEngine();
        loadedVoiceRef.current = null;
      }
      setVoice(key);
    },
    [voice],
  );

  const onGenerate = useCallback(async () => {
    const status = statuses[voice];
    if (status?.state !== 'ready') {
      Alert.alert('Modèle absent', 'Télécharge la voix avant de générer.');
      return;
    }
    setBusy(true);
    const steps = freshSteps();
    setCurrentSteps(steps);
    try {
      const result = await runPipeline(
        {
          text,
          voice,
          presetKey,
          params,
          modelPath: status.localPath,
          modelAlreadyLoaded: loadedVoiceRef.current === voice,
        },
        {
          onEvent: (e) => {
            if (e.type === 'step') {
              setCurrentSteps((prev) => {
                const next = prev.slice();
                const idx = next.findIndex((s) => s.key === e.step.key);
                if (idx >= 0) next[idx] = e.step;
                return next;
              });
            }
          },
        },
      );
      loadedVoiceRef.current = voice;
      setLastRun(result);
      logRun(result);
    } catch (err) {
      Alert.alert('Génération échouée', String(err));
    } finally {
      setBusy(false);
    }
  }, [voice, statuses, text, presetKey, params]);

  const onCopyMarkdown = useCallback(async () => {
    const md = exportMarkdown();
    try {
      await Share.share({ message: md, title: 'Piper RN POC — Benchmarks' });
    } catch (err) {
      console.warn('Share failed', err);
    }
  }, []);

  const status = statuses[voice];
  const canGenerate = status?.state === 'ready' && text.trim().length > 0;
  const disabledReason =
    status?.state !== 'ready'
      ? `Télécharge la voix ${VOICES[voice].languageCode} d'abord`
      : !text.trim()
      ? 'Texte vide'
      : '';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Piper TTS — On-device POC</Text>
        <Text style={styles.subtitle}>
          5 langues • 3 paramètres modulables • streaming par phrase • benchmarks RTF/TTFA
        </Text>
      </View>

      <Section title="1. Langue">
        <LanguageSelector selected={voice} statuses={statuses} onSelect={onSelectVoice} />
      </Section>

      <Section title="2. Modèle">
        <ModelLoader
          voice={voice}
          status={status ?? { state: 'absent' }}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </Section>

      <Section title="3. Paramètres de synthèse">
        <SynthesisParamPanel
          presetKey={presetKey}
          params={params}
          onPresetChange={onPresetChange}
          onParamsChange={onParamsChange}
        />
      </Section>

      <Section title="4. Texte à synthétiser">
        <TextInputBlock
          text={text}
          onChangeText={setText}
          onGenerate={onGenerate}
          isBusy={busy}
          canGenerate={canGenerate}
          disabledReason={disabledReason}
        />
      </Section>

      <Section title="5. Chronométrage temps réel">
        <TimelinePanel currentSteps={currentSteps} lastRun={lastRun} />
      </Section>

      <Section title="6. Historique des runs">
        <RunHistory history={history} onCopyMarkdown={onCopyMarkdown} onClear={clearHistory} />
      </Section>

      <Text style={styles.footer}>Built with Claude Code</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 14, gap: 14 },
  titleBlock: { gap: 4, marginBottom: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textDim, fontSize: 12 },
  section: { gap: 8 },
  sectionTitle: { color: colors.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  footer: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
