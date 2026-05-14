import { VOICES } from './voices';
import { presetLabel } from './presets';
import type { RunResult } from './types';

const MAX_HISTORY = 5;

let history: RunResult[] = [];
const listeners = new Set<(h: readonly RunResult[]) => void>();

export function logRun(run: RunResult): void {
  history = [run, ...history].slice(0, MAX_HISTORY);
  for (const l of listeners) l(history);
}

export function getHistory(): readonly RunResult[] {
  return history;
}

export function subscribe(
  cb: (h: readonly RunResult[]) => void,
): () => void {
  listeners.add(cb);
  cb(history);
  return () => {
    listeners.delete(cb);
  };
}

export function clearHistory(): void {
  history = [];
  for (const l of listeners) l(history);
}

function pad(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function runToMarkdownRow(run: RunResult): string {
  const v = VOICES[run.voice];
  return `| ${v.languageCode.split('_')[0]?.toUpperCase()} | ${v.modelId} | ${presetLabel(run.presetKey)} | ${pad(run.params.lengthScale)} | ${pad(run.params.noiseScale)} | ${pad(run.params.noiseW)} | ${run.deviceLabel} | ${run.ttfaMs} | ${pad(run.rtf)} | ${pad(run.totalGenerationMs / 1000)} | ${pad(run.totalAudioMs / 1000)} |`;
}

const TABLE_HEADER = [
  '| Language | Voice | Preset | length | noise | noise_w | Device | TTFA (ms) | RTF | Total gen (s) | Audio dur (s) |',
  '|----------|-------|--------|--------|-------|---------|--------|-----------|-----|---------------|---------------|',
].join('\n');

export function exportMarkdown(): string {
  if (history.length === 0) return '_No runs yet._';
  const rows = history.map(runToMarkdownRow).join('\n');
  return `${TABLE_HEADER}\n${rows}`;
}
