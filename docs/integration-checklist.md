# Integration checklist — vendoring this POC into a host React Native app

> This POC is a benchmark + dev tool. If you want to vendor it into a production React Native app, here are the known blockers and a pre-flight checklist drawn from the lessons learned building it.

---

## What this POC proves

End-to-end pipeline works on Pixel 10 Pro Fold (Tensor G5, Android 16, arm64-v8a):

- 5 languages, 5 presets, 3-slider live modulation
- Cold-start TTFA 2.2 s (Release + NNAPI + numThreads=4), warm-start 1.2 s — at or below the spec target of 1.5 s
- Inference RTF 9-13× across all languages (above the spec target ≥ 4× by 2-3×)
- Pipeline fully visible in UI with measured timings per step
- Memory footprint OK, no crashes through repeated runs

## Known blockers / dependencies before integrating into a host app

### Build environment

- **JDK 21 LTS** required for Android builds. JDK 24 breaks AGP 8.12's `:app:configureCMakeDebug` step (JEP 472 restricted-method warnings escalate to fatal). Your host app's CI Dockerfile and local dev docs must pin JDK 21.
- **Xcode 26+ with the iOS platform fully installed** (not just the SDK). Several reduced-disk Xcode installs (Mac Mini CI agents in particular) ship the SDK but not the simulator runtime — `xcodebuild` then reports `iOS XX is not installed` and refuses to build for any simulator. Either install via `xcodebuild -downloadPlatform iOS` or accept device-only testing.

### Native dependencies and APK size

- **`react-native-sherpa-onnx` brings ~80 MB XCFramework on iOS** at `pod install` time. The runtime app size impact is ~25 MB per ABI on Android, similar on iOS. Combined with already-shipped host app native deps, may push past the 200 MB cellular App Store limit. **Mitigation paths**:
  - On-demand asset packs (iOS) / Play Asset Delivery (Android) for the model archives — sherpa-onnx wrapper already supports these
  - Conditional download of only the languages the user picks (already implemented in this POC)
  - Strip unused architectures in Release builds (`reactNativeArchitectures=arm64-v8a` for distribution, drop x86 / x86_64)
- **`@kesha-antonov/react-native-background-downloader`** must be a direct dep (RN autolinking does not pick up transitive native modules). Already documented in `DECISIONS.md`.

### Voice models

- **5 voices × 64-77 MB = ~333 MB** of user data if all languages downloaded. Acceptable for opt-in download; not for app bundle. Strategy: ship the default voice with the app, download others on demand. Cleanup logic via `cleanupLeastRecentlyUsed()` (sherpa-onnx ships this).
- **License chain**: each Piper voice carries its own license in `MODEL_CARD` inside the archive. Your host app must surface this in a credits screen.
- **eSpeak-ng is GPL-3.0** — statically linked through sherpa-onnx. Combined with this POC's AGPL-3.0 wrapper, your host app's distribution model must be license-compatible (closed-source SaaS-style distribution probably fine; closed-source on-premise sales would not be).

### Performance — to validate before prod

- **Release build benchmarks are documented** in this POC (TTFA 2.2 s cold / 1.2 s warm on Pixel 10 Pro Fold). Re-measure on your target devices before committing.
- **NNAPI provider** acceleration on Tensor G5 was validated. On other SoCs (Qualcomm Snapdragon, MediaTek Dimensity), test that NNAPI doesn't fall back to CPU silently. The wrapper exposes `getQnnSupport()` helpers for Qualcomm.
- **CoreML provider** on Apple Silicon iPhones untested in this POC.
- **Ablation** was not done in this POC — all four optimization levers (R8 / NNAPI / numThreads / warm-start) were flipped together. A v2 iteration could measure each independently to attribute the gain precisely.

### iOS simulator gap

- iOS validation in this POC was done by reasoning (TS compiles, pods install, integration matches official examples) but **no actual iOS run was performed** because the dev machine was missing the iOS 26.5 simulator runtime. Before merging into a host app:
  - Build for iOS simulator on a properly-provisioned Mac
  - Validate on a physical iPhone 15 / 16 / 17
  - Confirm AVAudioPlayer background-audio session behavior matches Android's

### Streaming & audio session

- Current playback uses **`react-native-sound`** which keeps the audio session synchronous and does not handle interruptions gracefully (incoming call, Bluetooth disconnection, route changes). For prod, evaluate switching to `react-native-track-player` which manages a proper audio session, lock-screen controls, and notification.
- Sentence-level streaming (cut on `.!?`) works well for narrative FR/EN/IT/ES/DE text. **German compound sentences and abbreviations may need tuning** (`Dr.`, `St.`, `usw.` — currently treated as sentence breaks). Lazy fix: a stopword exception list.

### Pipeline observability

- The 4 internal phases of `generateSpeech` (phonemize / map / infer / decode) are **bundled into one native call** and we can't measure them separately. The UI shows them sharing the same duration with a `*` and an explanatory footnote. For prod, either patch sherpa-onnx to expose timestamps or stop showing the separate rows.

### LICENSE alignment

- POC is **AGPL-3.0**. Your host app's prod license may differ. Before vendoring code from this POC, audit each file and decide whether to:
  - Republish under the host app's license (requires reauthorization from contributors)
  - Use the POC as a git submodule and respect AGPL boundaries

## Pre-flight checklist (before opening the integration PR)

- [ ] Reproduce baseline benchmarks on your target prod device(s)
- [ ] Build and test Release configuration with R8 + ProGuard
- [ ] Validate NNAPI / CoreML providers' actual acceleration vs CPU fallback on your target SoC
- [ ] Decide on bundling vs runtime-only model strategy
- [ ] Add Sentry / equivalent crash reporting around the native bridge (sherpa-onnx)
- [ ] Audit license surface (AGPL → host app license, eSpeak-NG GPL constraints)
- [ ] Lock in `numThreads` and `provider` per device class
- [ ] Re-verify iOS path with a real simulator and a real iPhone
- [ ] Decide on graceful fallback to `react-native-tts` (system TTS) when Piper engine fails to initialize
- [ ] Design the model-download UX in your host app's flow (onboarding? first-use? settings?)
