import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  MODEL_DEFAULTS,
  PRESETS,
  PRESET_ORDER,
  SLIDER_RANGES,
  type PresetKey,
  type SynthParams,
} from '../services/presets';
import { colors } from './theme';

type Props = {
  presetKey: PresetKey;
  params: SynthParams;
  onPresetChange: (key: PresetKey) => void;
  onParamsChange: (params: SynthParams) => void;
};

export function SynthesisParamPanel({
  presetKey,
  params,
  onPresetChange,
  onParamsChange,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.presetRow}>
        {PRESET_ORDER.map((key) => {
          const p = PRESETS[key];
          const active = presetKey === key;
          return (
            <Pressable
              key={key}
              onPress={() => onPresetChange(key)}
              style={({ pressed }) => [
                styles.preset,
                active && styles.presetActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                {p.badge ? `${p.badge} ` : ''}
                {p.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onPresetChange('custom')}
          style={({ pressed }) => [
            styles.preset,
            presetKey === 'custom' && styles.presetActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.presetLabel, presetKey === 'custom' && styles.presetLabelActive]}>
            Personnalisé
          </Text>
        </Pressable>
      </View>

      <ParamSlider
        label="length_scale (vitesse)"
        range={SLIDER_RANGES.lengthScale}
        value={params.lengthScale}
        onChange={(v) => onParamsChange({ ...params, lengthScale: v })}
      />
      <ParamSlider
        label="noise_scale (expressivité)"
        range={SLIDER_RANGES.noiseScale}
        value={params.noiseScale}
        onChange={(v) => onParamsChange({ ...params, noiseScale: v })}
      />
      <ParamSlider
        label="noise_w (rythme naturel)"
        range={SLIDER_RANGES.noiseW}
        value={params.noiseW}
        onChange={(v) => onParamsChange({ ...params, noiseW: v })}
      />

      <Pressable
        onPress={() => onParamsChange(MODEL_DEFAULTS)}
        style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
      >
        <Text style={styles.resetText}>Reset défauts modèle (1.00 / 0.667 / 0.80)</Text>
      </Pressable>
    </View>
  );
}

type SliderProps = {
  label: string;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (v: number) => void;
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function ParamSlider({ label, range, value, onChange }: SliderProps) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHead}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value.toFixed(2)}</Text>
      </View>
      <Slider
        minimumValue={range.min}
        maximumValue={range.max}
        step={range.step}
        value={value}
        onValueChange={(v) => onChange(roundTo(v, range.step))}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
      />
      <View style={styles.sliderRange}>
        <Text style={styles.sliderRangeText}>{range.min.toFixed(2)}</Text>
        <Text style={styles.sliderRangeText}>{range.max.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  presetLabel: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  presetLabelActive: { color: colors.accent },
  pressed: { opacity: 0.7 },
  sliderBlock: { gap: 2 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { color: colors.text, fontSize: 13, fontWeight: '500' },
  sliderValue: { color: colors.accent, fontSize: 13, fontFamily: 'Menlo', fontWeight: '600' },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderRangeText: { color: colors.muted, fontSize: 10, fontFamily: 'Menlo' },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: { color: colors.textDim, fontSize: 11 },
});
