import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VOICE_KEYS, VOICES, type VoiceKey } from '../services/voices';
import type { ModelStatus } from '../services/ModelManager';
import { colors } from './theme';

type Props = {
  selected: VoiceKey;
  statuses: Record<VoiceKey, ModelStatus>;
  onSelect: (key: VoiceKey) => void;
};

export function LanguageSelector({ selected, statuses, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {VOICE_KEYS.map((key) => {
        const voice = VOICES[key];
        const status = statuses[key];
        const isSelected = key === selected;
        const isReady = status?.state === 'ready';
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.btn,
              isSelected && styles.btnSelected,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.flag}>{voice.flag}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {voice.key.toUpperCase()}
            </Text>
            <Text style={[styles.statusDot, isReady ? styles.statusReady : styles.statusAbsent]}>
              {isReady ? '✓' : '↓'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  btn: {
    flex: 1,
    minWidth: 56,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  btnSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  btnPressed: { opacity: 0.7 },
  flag: { fontSize: 22 },
  label: { fontSize: 12, fontWeight: '600', color: colors.text },
  labelSelected: { color: colors.accent },
  statusDot: { fontSize: 11, fontWeight: '700' },
  statusReady: { color: colors.success },
  statusAbsent: { color: colors.muted },
});
