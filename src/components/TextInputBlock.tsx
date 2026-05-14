import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from './theme';

type Props = {
  text: string;
  onChangeText: (s: string) => void;
  onGenerate: () => void;
  isBusy: boolean;
  canGenerate: boolean;
  disabledReason?: string;
};

export function TextInputBlock({
  text,
  onChangeText,
  onGenerate,
  isBusy,
  canGenerate,
  disabledReason,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={onChangeText}
        multiline
        placeholder="Texte à synthétiser…"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <View style={styles.row}>
        <Text style={styles.charCount}>{text.length} caractères</Text>
        <Pressable
          onPress={onGenerate}
          disabled={!canGenerate || isBusy}
          style={({ pressed }) => [
            styles.btn,
            (!canGenerate || isBusy) && styles.btnDisabled,
            pressed && canGenerate && !isBusy && styles.pressed,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Générer & jouer</Text>
          )}
        </Pressable>
      </View>
      {!canGenerate && disabledReason ? (
        <Text style={styles.reason}>{disabledReason}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  input: {
    minHeight: 130,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  charCount: { color: colors.muted, fontSize: 12 },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.surfaceAlt },
  pressed: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600' },
  reason: { color: colors.muted, fontSize: 12, textAlign: 'right' },
});
