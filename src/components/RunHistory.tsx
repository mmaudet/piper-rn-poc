import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RunResult } from '../services/types';
import { presetLabel } from '../services/presets';
import { VOICES } from '../services/voices';
import { colors, typography } from './theme';

type Props = {
  history: readonly RunResult[];
  onCopyMarkdown: () => void;
  onClear: () => void;
};

function fmt(num: number, decimals = 0): string {
  return num.toFixed(decimals);
}

export function RunHistory({ history, onCopyMarkdown, onClear }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique ({history.length}/5)</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onCopyMarkdown}
            disabled={history.length === 0}
            style={({ pressed }) => [
              styles.btn,
              history.length === 0 && styles.btnDisabled,
              pressed && history.length > 0 && styles.pressed,
            ]}
          >
            <Text style={styles.btnText}>Copier en Markdown</Text>
          </Pressable>
          <Pressable
            onPress={onClear}
            disabled={history.length === 0}
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              history.length === 0 && styles.btnDisabled,
              pressed && history.length > 0 && styles.pressed,
            ]}
          >
            <Text style={styles.btnTextGhost}>Effacer</Text>
          </Pressable>
        </View>
      </View>
      {history.length === 0 ? (
        <Text style={styles.empty}>Pas encore de run. Lance une génération.</Text>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
          {history.map((r) => (
            <View key={r.id} style={styles.runRow}>
              <View style={styles.runHead}>
                <Text style={styles.runVoice}>
                  {VOICES[r.voice].flag} {VOICES[r.voice].languageCode}
                </Text>
                <Text style={styles.runPreset}>{presetLabel(r.presetKey)}</Text>
              </View>
              <Text style={styles.runParams}>
                len={r.params.lengthScale.toFixed(2)} • noise={r.params.noiseScale.toFixed(2)} • noise_w={r.params.noiseW.toFixed(2)}
              </Text>
              <View style={styles.metrics}>
                <Metric label="TTFA" value={`${fmt(r.ttfaMs)} ms`} />
                <Metric label="RTF" value={`${r.rtf.toFixed(2)}x`} />
                <Metric label="Audio" value={`${(r.totalAudioMs / 1000).toFixed(1)}s`} />
                <Metric label="Total gen" value={`${(r.totalGenerationMs / 1000).toFixed(1)}s`} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 6 },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnTextGhost: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.muted, fontStyle: 'italic', fontSize: 12 },
  scroll: { maxHeight: 240 },
  runRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  runHead: { flexDirection: 'row', justifyContent: 'space-between' },
  runVoice: { color: colors.text, fontWeight: '600', fontSize: 12 },
  runPreset: { color: colors.accent, fontWeight: '600', fontSize: 12 },
  runParams: { color: colors.muted, fontSize: 11, fontFamily: typography.mono },
  metrics: { flexDirection: 'row', marginTop: 4, gap: 12, flexWrap: 'wrap' },
  metric: { gap: 0 },
  metricLabel: { color: colors.muted, fontSize: 9 },
  metricValue: { color: colors.text, fontSize: 12, fontFamily: typography.mono, fontWeight: '600' },
});
