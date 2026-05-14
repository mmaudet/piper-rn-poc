import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { VoiceKey } from '../services/voices';
import { VOICES } from '../services/voices';
import type { ModelStatus } from '../services/ModelManager';
import { colors } from './theme';

type Props = {
  voice: VoiceKey;
  status: ModelStatus;
  onDownload: () => void;
  onDelete: () => void;
};

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModelLoader({ voice, status, onDownload, onDelete }: Props) {
  const v = VOICES[voice];
  const archiveLabel = `${v.modelId} • ${formatMB(v.archiveBytes)}`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{v.languageName} — {v.voiceName}</Text>
      <Text style={styles.subtitle}>{archiveLabel}</Text>

      {status.state === 'absent' && (
        <Pressable onPress={onDownload} style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}>
          <Text style={styles.btnText}>Télécharger</Text>
        </Pressable>
      )}

      {status.state === 'downloading' && (
        <View style={styles.dlBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.dlText}>
            {(status.progress.phase ?? 'downloading').toUpperCase()} —{' '}
            {Math.round(status.progress.percent)}%
            {status.progress.totalBytes
              ? ` (${formatMB(status.progress.bytesDownloaded)} / ${formatMB(status.progress.totalBytes)})`
              : ''}
          </Text>
        </View>
      )}

      {status.state === 'ready' && (
        <View style={styles.readyRow}>
          <Text style={styles.readyLabel}>✓ Modèle prêt</Text>
          <Pressable onPress={onDelete} style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.btnPressed]}>
            <Text style={styles.btnTextDanger}>Supprimer</Text>
          </Pressable>
        </View>
      )}

      {status.state === 'error' && (
        <Text style={styles.errorText}>Erreur : {status.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  subtitle: { color: colors.textDim, fontSize: 11 },
  btn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnDanger: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.danger },
  btnPressed: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextDanger: { color: colors.danger, fontWeight: '600' },
  dlBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dlText: { color: colors.textDim, fontSize: 12 },
  readyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  readyLabel: { color: colors.success, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 12 },
});
