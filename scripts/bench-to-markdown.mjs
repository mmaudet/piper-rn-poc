#!/usr/bin/env node
// Reads /tmp/piper-bench.log (or arg path), parses PIPER_BENCH JSON lines,
// emits a Markdown table row per run, ready to paste into README.

import { readFileSync } from 'node:fs';

const LANG_CODE = {
  fr: 'FR',
  en: 'EN',
  it: 'IT',
  es: 'ES',
  de: 'DE',
};

const VOICE_ID = {
  fr: 'fr_FR-siwis-medium',
  en: 'en_US-lessac-medium',
  it: 'it_IT-paola-medium',
  es: 'es_ES-sharvard-medium',
  de: 'de_DE-thorsten-medium',
};

const PRESET_LABEL = {
  narration: 'Narration patrimoniale',
  documentary: 'Documentaire',
  conversation: 'Conversation',
  fastread: 'Lecture rapide',
  custom: 'Personnalisé',
};

function parseLog(path) {
  const raw = readFileSync(path, 'utf8');
  const runs = [];
  for (const line of raw.split('\n')) {
    const idx = line.indexOf('PIPER_BENCH ');
    if (idx < 0) continue;
    try {
      const json = line.slice(idx + 'PIPER_BENCH '.length).trim();
      runs.push(JSON.parse(json));
    } catch (err) {
      console.error('parse error', err.message);
    }
  }
  return runs;
}

function row(r) {
  const lang = LANG_CODE[r.voice] ?? r.voice;
  const voice = VOICE_ID[r.voice] ?? r.voice;
  const preset = PRESET_LABEL[r.presetKey] ?? r.presetKey;
  const len = r.params.lengthScale.toFixed(2);
  const ns = r.params.noiseScale.toFixed(2);
  const nw = r.params.noiseW.toFixed(2);
  const audio = (r.totalAudioMs / 1000).toFixed(1);
  const rtf = r.rtf.toFixed(2);
  return `| ${lang} | \`${voice}\` | ${preset} | ${len} | ${ns} | ${nw} | ${r.deviceLabel} | ${r.ttfaMs} | ${rtf}× | ${audio} |`;
}

const path = process.argv[2] ?? '/tmp/piper-bench.log';
const runs = parseLog(path);

const header = [
  '| Language | Voice | Preset | length | noise | noise_w | Device | TTFA (ms) | RTF (infer) | Audio dur (s) |',
  '|----------|-------|--------|-------:|------:|--------:|--------|---------:|------------:|--------------:|',
];

console.log(header.join('\n'));
for (const r of runs) console.log(row(r));
console.log('');
console.log(`_${runs.length} run(s) logged_`);
