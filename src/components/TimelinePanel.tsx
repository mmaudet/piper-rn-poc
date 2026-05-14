import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RunResult, StepInfo } from '../services/types';
import { presetLabel } from '../services/presets';
import { colors, typography } from './theme';

type Props = {
  currentSteps: StepInfo[];
  lastRun: RunResult | null;
};

function stepIcon(state: StepInfo['state']): string {
  switch (state) {
    case 'pending':
      return '⚪';
    case 'running':
      return '🟡';
    case 'done':
      return '🟢';
    case 'skipped':
      return '⏭';
  }
}

function fmtDuration(ms: number | undefined): string {
  if (ms == null) return '___ ms';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function TimelinePanel({ currentSteps, lastRun }: Props) {
  const ttfaStep = currentSteps.find((s) => s.key === 'ttfa');
  const ttfaMs = ttfaStep?.durationMs;

  return (
    <View style={styles.container}>
      {lastRun ? (
        <Text style={styles.header}>
          Preset : {presetLabel(lastRun.presetKey)} • length={lastRun.params.lengthScale.toFixed(2)} • noise={lastRun.params.noiseScale.toFixed(2)} • noise_w={lastRun.params.noiseW.toFixed(2)}
        </Text>
      ) : (
        <Text style={styles.header}>En attente d'une génération…</Text>
      )}
      <View style={styles.separator} />

      {currentSteps.map((s) => {
        if (s.key === 'ttfa') {
          return <TtfaRow key={s.key} step={s} />;
        }
        return (
          <View key={s.key} style={styles.row}>
            <Text style={styles.icon}>{stepIcon(s.state)}</Text>
            <Text style={[styles.label, s.bundled && styles.labelBundled]} numberOfLines={1}>
              {s.label}
              {s.bundled ? '*' : ''}
            </Text>
            <Text style={styles.duration}>{fmtDuration(s.durationMs)}</Text>
          </View>
        );
      })}

      <View style={styles.separator} />
      {lastRun ? (
        <View style={styles.stats}>
          <StatRow label="Durée audio générée" value={`${(lastRun.totalAudioMs / 1000).toFixed(2)} s`} />
          <StatRow label="RTF (audio_s / inférence_s)" value={`${lastRun.rtf.toFixed(2)}x`} />
          <StatRow label="Taille PCM totale" value={fmtMB(lastRun.pcmBytes)} />
          <StatRow label="Device" value={lastRun.deviceLabel} />
        </View>
      ) : null}

      <Text style={styles.footnote}>
        * Étapes regroupées dans l'appel natif generateSpeech (sherpa-onnx ne les expose pas séparément).
      </Text>

      {ttfaMs != null && !ttfaStep?.bundled ? null : null}
      {/* TTFA already rendered inline; placeholder keeps key for future scroll-to-row */}
      {void ttfaMs}
    </View>
  );
}

function TtfaRow({ step }: { step: StepInfo }) {
  const value = step.durationMs;
  return (
    <View style={styles.ttfaBox}>
      <Text style={styles.ttfaIcon}>🔊</Text>
      <Text style={styles.ttfaLabel}>TIME TO FIRST AUDIO</Text>
      <Text style={styles.ttfaValue}>{fmtDuration(value)}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  header: { color: colors.textDim, fontSize: 12, fontFamily: typography.mono },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 14, width: 20 },
  label: { color: colors.text, flex: 1, fontSize: 13 },
  labelBundled: { color: colors.textDim, fontStyle: 'italic' },
  duration: {
    color: colors.accent,
    fontFamily: typography.mono,
    fontSize: 12,
    minWidth: 80,
    textAlign: 'right',
  },
  ttfaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ttfaBg,
    borderColor: colors.ttfaBorder,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 6,
  },
  ttfaIcon: { fontSize: 22 },
  ttfaLabel: { color: colors.success, fontSize: 15, fontWeight: '700', flex: 1, letterSpacing: 0.5 },
  ttfaValue: { color: colors.success, fontSize: 22, fontWeight: '800', fontFamily: typography.mono },
  stats: { gap: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { color: colors.textDim, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 12, fontFamily: typography.mono },
  footnote: { color: colors.muted, fontSize: 10, marginTop: 6, fontStyle: 'italic' },
});
