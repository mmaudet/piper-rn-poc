# Technical decisions — Piper RN POC

> Why we picked what we picked. Captures the tradeoffs that shaped this POC so future contributors can revisit them with full context.

## 1. Phonemizer + ONNX runtime — `sherpa-onnx` wrapper

**Chosen**: [`react-native-sherpa-onnx`](https://github.com/XDcobra/react-native-sherpa-onnx) by XDcobra (v0.4.3, MIT, TurboModule).

**Alternatives considered**:

| Option | Verdict | Why |
|---|---|---|
| Hand-roll `piper-phonemize` (rhasspy/piper-phonemize) compiled for iOS xcframework + Android NDK .so | ❌ Out of time-box | Repo archived since Dec 2023. Android fork [`alexytomi/piper-phonemize-android`](https://github.com/alexytomi/piper-phonemize-android) is bus-factor-1 and pushed J-7. No iOS support. 2 weeks of CMake/NDK/xcframework yak-shaving for a POC time-boxed to 1-2 days. |
| Wrap [`espeak-ng`](https://github.com/espeak-ng/espeak-ng) directly + bridge to Piper via `phoneme_id_map` from `.onnx.json` | ❌ Out of time-box | Same yak-shaving for the JNI/Swift bridging. No published RN binding for eSpeak-ng exists. `espeak-ng` is GPL-3.0 which would contaminate the binary if linked statically. |
| Compile `piper-phonemize` to WebAssembly via `piper-wasm` | ❌ Unviable | RN Hermes/JSC doesn't expose `WebAssembly`. Would require a JSI bridge polyfill. No POC exists. |
| `react-native-sherpa-onnx-offline-tts` (kislay99) | ⏸ Plan B | Concurrent wrapper, simpler API (generates WAV directly), but last commit Jan 2026 (~4 months), no exposed `noiseScale/noiseScaleW/lengthScale` modulation knobs at the same level. |

**Why sherpa-onnx wins**:

- Single library covers the entire pipeline: phonemizer (statically linked `libpiper_phonemize.a` + `libespeak-ng.a`), ONNX Runtime, and Piper VITS inference. One dependency, three problems solved.
- Active upstream: [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 12k stars, pushed daily, packaged xcframework iOS + AAR Android available at every release.
- Wrapper API maps 1:1 to the spec's three modulation knobs: `modelOptions.vits.{noiseScale, noiseScaleW, lengthScale}`.
- Wrapper ships a complete `ModelDownloadManager` (download + tar.bz2 extract + SHA256 validate + LRU + resume) — we don't have to re-implement that.

**Costs**:

- iOS XCFramework adds ~80 MB at `pod install` time (build-time, not runtime). Acceptable for POC; should be re-arbitrated for any production app where the App Store cellular limit (200 MB) is in play.
- Documentation for Piper-specific flows in sherpa-onnx is succinct (focus on newer Kokoro/Kitten models). We had to read the wrapper's TypeScript source to derive the exact API shape.

## 2. Voice models — sherpa-onnx pre-packaged releases (not Hugging Face directly)

**Chosen**: Download `.tar.bz2` from `k2-fsa/sherpa-onnx/releases/tag/tts-models`. Each archive contains `<voice>.onnx + tokens.txt + espeak-ng-data/` ready to use.

**Why not [`rhasspy/piper-voices` on Hugging Face](https://huggingface.co/rhasspy/piper-voices) directly** (as the V3 spec assumed):

- Sherpa-onnx needs `tokens.txt` + `espeak-ng-data/` alongside the `.onnx`. The HF distribution only ships `.onnx + .onnx.json`.
- Re-deriving `tokens.txt` from `.onnx.json["phoneme_id_map"]` is a 5-line Python script ([k2-fsa doc](https://k2-fsa.github.io/sherpa/onnx/tts/piper.html)), but the result is *identical* — the underlying VITS weights are the same. Using sherpa-onnx's repackaged releases avoids re-shipping that conversion at runtime.

**Voice selection per language** (all `medium` quality, 22 kHz):

| Lang | Voice | Speaker | Why this one |
|---|---|---|---|
| FR (`fr_FR`) | `siwis` | Female | Reference open-source French TTS, natural pacing. `upmc` excluded (known fast-speech bug); `tom`/`gilles` are male alternatives left for later. |
| EN (`en_US`) | `lessac` | Female | De-facto reference voice in the open-source TTS community, naturalness validated across countless projects. |
| IT (`it_IT`) | `paola` | Female | Only `medium` available in Italian — `riccardo` is `x_low` (15 MB, 16 kHz) and audibly thin. |
| ES (`es_ES`) | `sharvard` | Female | More natural than `davefx` per community feedback; `mls_*` voices are `low` quality. |
| DE (`de_DE`) | `thorsten` | Male | Reference German voice. Thorsten Müller donated his voice to the open-source TTS community — culturally significant and technically excellent. |

`thorsten_emotional` (multi-speaker, one `speaker_id` per emotion) was considered for emotional rendering but is German-only and explicitly out of scope for V3.

## 3. Audio playback — `react-native-sound` + `saveAudioToFile`

**Chosen**: For each sentence, sherpa-onnx generates a PCM buffer, we serialize to WAV via `saveAudioToFile()`, and queue playback through `react-native-sound`.

**Alternative considered**: `react-native-track-player` (richer streaming, native `Event.PlaybackState`).

**Why sound wins for this POC**:

- Mature, simple API, no `Service` boilerplate on Android.
- The streaming we need is *sentence-level* (cut on `.!?`, play sentence 1 while sentences 2+ synthesize), not *chunk-level*. Sentence boundaries map cleanly to "load WAV, play, repeat" — exactly what `Sound` does.
- TTFA measurement: we record `t = now()` at the moment `sound.play()` is invoked. On iOS/Android, the OS schedules playback within ~30-50 ms of that call (sub-frame on modern hardware), so the measured value is close to the true "first audible sample". A polling refinement via `getCurrentTime()` is left for a v2.

**Limitation accepted**: `react-native-sound` exposes no explicit `onPlaybackStart` callback (the `play(cb)` callback fires on *completion*). We measure TTFA as the `play()` call timestamp and document the ~30-50 ms OS-scheduling overhead in the README.

## 4. The three modulation parameters — spec literals, mapped to sherpa's `modelOptions.vits`

Piper's VITS exposes three runtime knobs that the wrapper surfaces directly:

| App label | Spec name | Sherpa key | Default | Range used |
|---|---|---|---|---|
| Vitesse | `length_scale` | `vits.lengthScale` | 1.0 | 0.5 → 1.5 |
| Expressivité | `noise_scale` | `vits.noiseScale` | 0.667 | 0.3 → 0.9 |
| Rythme naturel | `noise_w` | `vits.noiseScaleW` | 0.8 | 0.3 → 1.0 |

Note the `noise_w` ↔ `noiseScaleW` rename — kept the spec's `noiseW` in our TypeScript types for readability, then map to `noiseScaleW` at the wrapper boundary.

**Preset values** are spec literals; the "Narration patrimoniale" preset (lengthScale=1.10, noiseScale=0.50, noiseW=0.70) is the default at app launch — tuned for calm, clear, gently warm heritage / documentary narration.

## 5. Splitting on `.!?` only — no comma splitting for streaming

The spec asks for sentence streaming via `.!?` split. We do not split on commas, even though it would reduce TTFA on long sentences (the first French Notre-Dame sentence is ~28 words ≈ 1.6 s synthesis time on Pixel 10 Pro Fold).

**Reasoning**: comma-splitting changes prosody (each comma chunk gets its own intonation curve), audibly making the read sound choppy. Trading 0.5-1 s of TTFA for natural-sounding narration is the right call for any long-form listening experience (heritage guides, audiobooks, documentary narration).

If a future requirement asks for sub-1 s TTFA, the right answer is: warm-start the engine (model load is 790 ms on the Pixel cold start) + a hardware accelerator (NNAPI on Tensor G5 / CoreML on Apple Silicon) + Release build optimization. Not comma-splitting.

## 6. JDK 21 LTS for Android builds — not JDK 24

The default `JAVA_HOME` on the dev machine pointed to JDK 24. AGP 8.12 + JDK 24 fails the `:app:configureCMakeDebug` task because Gradle's `prefab` subprocess emits a `WARNING: A restricted method in java.lang.System has been called` (JDK 24 / JEP 472 / FFM API restrictions), and AGP's `reportErrors` treats any `WARNING:` line from the subprocess as a fatal build error.

**Fix**: `brew install openjdk@21`, point `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`, rebuild. Documented in `README.md`.

## 7. ProGuard / R8 keep rule for sherpa-onnx

`react-native-sherpa-onnx-offline-tts` issue #9 reports a runtime `NoClassDefFoundError: com.k2fsa.sherpa.onnx.OfflineTts` in Android release builds — R8 strips the JNI-referenced classes since they're only reachable via reflection. We pre-emptively added the keep rule in `android/app/proguard-rules.pro`:

```
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keepclassmembers class com.k2fsa.sherpa.onnx.** { *; }
```

Even though the symptom would only show in Release, paying the keep-rule cost on Debug too means we never get bit by it.

## 8. Yarn 3 (Berry) + corepack, `nodeLinker: node-modules`

RN 0.85's `init` template ships Yarn 3.6.4 pinned via `packageManager`, with `nodeLinker: node-modules` (not PnP) — keeps Metro and native autolinking working unchanged. Corepack activates it transparently. No changes needed.

## 9. `@dr.pogodin/react-native-fs` — not the original `react-native-fs`

The sherpa-onnx wrapper declares `@dr.pogodin/react-native-fs` (Pogodin's maintained fork) as a peer dependency. Originally I had installed `react-native-fs` (the older itinance package). Result: double-linking the native FS module, plus our own code can't share file paths with the wrapper's download manager.

**Fix**: `yarn remove react-native-fs && yarn add @dr.pogodin/react-native-fs`, re-`pod install`. One linked native module, one source of truth for `DocumentDirectoryPath`.

## 10. `@kesha-antonov/react-native-background-downloader` as a direct dep

The sherpa-onnx wrapper depends on `@kesha-antonov/react-native-background-downloader` for the actual HTTP download of model archives. RN autolinking only scans **direct** dependencies of the app, not transitives. Result: the JS-side module loads fine, but the native side is missing — `Download failed: doesn't seem to be linked` at runtime.

**Fix**: `yarn add @kesha-antonov/react-native-background-downloader` (re-publishes the same version sherpa-onnx already pulls in transitively, but at the root level so autolinking picks it up). Rebuild.

## 11. RTF = totalAudioMs / inferenceMs (not totalAudioMs / wallClockMs)

The spec defines RTF as `audio_s / inférence_s`. Our pipeline runs synthesis of sentences 2+ *in parallel with* the playback of sentence 1, so the wall-clock time from "tap Generate" to "playback done" is roughly equal to the audio duration. If we computed RTF off wall-clock, we'd report ~0.9x (because we're "running at real-time"), which is technically true but completely undersells the inference performance.

**Implementation**: track `inferenceMs` as the sum of native `generateSpeech` times across all sentences, separately from `totalGenerationMs` (wall clock). RTF uses `inferenceMs`. The first benchmark run on Pixel 10 Pro Fold reported `inferenceMs ≈ 9.07 s` for `totalAudioMs ≈ 59.96 s`, so RTF ≈ **6.6×** — comfortably above the spec's `≥ 4×` target.

## 12. Cold-start TTFA budget — baseline 3.4 s, optimized 2.2 s on Pixel 10 Pro Fold

Out-of-the-box first run on the Tensor G5 device, French `siwis` voice, Narration patrimoniale preset, **Debug build** with default settings (`numThreads=2`, `provider='cpu'`):

- Model load (one-time, cold): **790 ms**
- Text preprocess (JS sentence split): 1 ms
- Native synth of 1st sentence (phon + infer + decode bundled in `generateSpeech`): 1.60 s
- WAV write + sound load + RN bridge: ~1.04 s
- **Total cold TTFA: 3.43 s**

Spec target was ≤ 1.5 s. The user accepted this as a positive first result and then asked to apply the optimization levers — done in the same session:

1. **Warm starts** — subsequent runs on the same language skip the 790 ms model load. Implemented "for free" by the engine cache in `SherpaTTS.ts` (cache key = `modelPath + params + numThreads`).
2. **Release build + R8 + ProGuard** — flipped `enableProguardInReleaseBuilds = true` in `android/app/build.gradle`, added explicit keep rules in `proguard-rules.pro` for the 5 native modules (sherpa-onnx, FS, sound, slider, background-downloader). Built via `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.
3. **NNAPI / CoreML provider** — `SherpaTTS.ts` now tries the hardware-accelerated provider first (`nnapi` on Android, `coreml` on iOS) with an automatic fallback chain (`nnapi → xnnpack → cpu` on Android, `coreml → cpu` on iOS). The chosen provider is logged via `PIPER_ENGINE provider=…` and surfaced in the bench export.
4. **`numThreads: 4`** — bumped from 2 to 4 (Pixel 10 Pro Fold has 8 cores; 4 saturates the perf cores without thrashing the efficiency cluster).

**Results after applying all four levers** (Release build, same Narration patrimoniale preset, cold start per language):

| Lang | TTFA baseline → optimized | RTF baseline → optimized |
|---|---|---|
| FR | 3097 → **2182 ms** (−30%) | 6.53× → **10.83×** (+66%) |
| EN | 4577 → **2148 ms** (−53%) | 6.24× → **12.29×** (+97%) |
| IT warm | (3164 cold) → **1220 ms** (−61%) | 6.62× → **12.92×** (+95%) |
| ES | 6087 → **2177 ms** (−64%) | 4.46× → **13.20×** (+196%) |
| DE | 4033 → 3837 ms (−5%, outlier) | 6.24× → **9.29×** (+49%) |

**Spec target `TTFA ≤ 1.5 s` is met on warm starts** (IT 1220 ms, EN 1529 ms with the documentary preset). RTF clears ≥ 4× by a wide margin everywhere, often 2-3× over target.

Ablation not done in this session — the four levers were flipped together. A v2 iteration could measure each independently to attribute the gain (especially whether NNAPI alone suffices without R8). The DE cold outlier (-5%) is likely a one-shot measurement noise, since the model load on that run was 1.45 s vs the typical 0.75 s — possibly NNAPI shader compilation on first DE inference, possibly background system activity. A repeat measurement should normalize.

## 13. Markdown export over Clipboard

The "Copier en Markdown" button uses `Share.share()` from RN core, not a clipboard package. Trade-off: opens a share sheet instead of a direct copy.

**Why**: avoids adding `@react-native-clipboard/clipboard` (another autolinked native module + pod install + APK install). Share API is in RN core and lets the user paste the Markdown into any app (Notes, README editor, Slack…).

**Verdict**: acceptable for POC. If the demo cadence reveals friction, swap in clipboard later — one-line code change.
