# Issue draft — Blockers / pre-flight for integration into `murmure-mobile`

> To be filed as a GitHub issue on the public repo (or kept in `murmure-mobile`'s internal tracker) once this POC is published.
> Title suggestion: **"Integrating piper-rn-poc into murmure-mobile — known blockers and pre-flight checklist"**

---

## What this POC proves

End-to-end pipeline works on Pixel 10 Pro Fold (Tensor G5, Android 16, arm64-v8a) in Debug build:

- 5 languages, 5 presets, 3-slider live modulation
- Cold-start TTFA ~3.4 s on French (Narration patrimoniale preset)
- Inference RTF ~6.6× (well above the spec target ≥ 4×)
- Pipeline fully visible in UI with measured timings per step
- Memory footprint OK, no crashes through repeated runs

## Known blockers / dependencies before integrating into `murmure-mobile`

### Build environment

- **JDK 21 LTS** required for Android builds. JDK 24 breaks AGP 8.12's `:app:configureCMakeDebug` step (JEP 472 restricted-method warnings escalate to fatal). `murmure-mobile`'s CI Dockerfile and local dev docs must pin JDK 21.
- **Xcode 26+ with the iOS platform fully installed** (not just the SDK). Several reduced-disk Xcode installs (Mac Mini CI agents in particular) ship the SDK but not the simulator runtime — `xcodebuild` then reports `iOS XX is not installed` and refuses to build for any simulator. Either install via `xcodebuild -downloadPlatform iOS` or accept device-only testing.

### Native dependencies and APK size

- **`react-native-sherpa-onnx` brings ~80 MB XCFramework on iOS** at `pod install` time. The runtime app size impact is ~25 MB per ABI on Android, similar on iOS. Combined with already-shipped Murmure native deps, may push the app past the 200 MB cellular App Store limit. **Mitigation paths**:
  - On-demand asset packs (iOS) / Play Asset Delivery (Android) for the model archives — sherpa-onnx wrapper already supports these
  - Conditional download of only the languages the user picks (already implemented in this POC)
  - Strip unused architectures in Release builds (`reactNativeArchitectures=arm64-v8a` for distribution, drop x86 / x86_64)
- **`@kesha-antonov/react-native-background-downloader`** must be a direct dep (RN autolinking does not pick up transitive native modules). Already documented in `DECISIONS.md`.

### Voice models

- **5 voices × 64-77 MB = ~333 MB** of user data if all languages downloaded. Acceptable for opt-in download; not for app bundle. Strategy: ship the FR `siwis` voice as default, download others on demand. Cleanup logic via `cleanupLeastRecentlyUsed()` (sherpa-onnx ships this).
- **License chain**: each Piper voice carries its own license in `MODEL_CARD` inside the archive. Murmure's prod app must surface this in a credits screen.
- **eSpeak-ng is GPL-3.0** — statically linked through sherpa-onnx. Combined with AGPL-3.0 wrapper, requires Murmure's distribution model to be license-compatible (closed-source SaaS-style distribution probably fine; closed-source on-premise sales would not).

### Performance — to validate before prod

- **Release build benchmarks** are pending. The 3.4 s cold TTFA is from a Debug build; expect 2-3× improvement in Release.
- **NNAPI provider** on Tensor G5 should accelerate ONNX inference significantly. Untested. Risk: fallback to CPU if NPU schedule is rejected for VITS ops.
- **CoreML provider** on Apple Silicon iPhones similarly untested in this POC.
- **Warm-start TTFA** should be ~800 ms lower than cold (model load skipped). To measure on 5 languages × 2 devices.

### iOS simulator gap

- iOS validation in this POC was done by reasoning (TS compiles, pods install, integration matches official examples) but **no actual iOS run was performed** because the dev machine was missing the iOS 26.5 simulator runtime. Before merging into `murmure-mobile`:
  - Build for iOS simulator on a properly-provisioned Mac
  - Validate on a physical iPhone 15 / 16 / 17
  - Confirm AVAudioPlayer background-audio session behavior matches Android's

### Streaming & audio session

- Current playback uses **`react-native-sound`** which keeps the audio session synchronous and does not handle interruptions gracefully (incoming call, Bluetooth disconnection, route changes). For prod, evaluate switching to `react-native-track-player` which manages a proper audio session, lock-screen controls, and notification.
- Sentence-level streaming (cut on `.!?`) works well for narrative French/English/Italian/Spanish/German text. **German compound sentences and abbreviations may need tuning** (`Dr.`, `St.`, `usw.` — currently treated as sentence breaks). Lazy fix: a stopword exception list.

### Pipeline observability

- The 4 internal phases of `generateSpeech` (phonemize / map / infer / decode) are **bundled into one native call** and we can't measure them separately. The UI shows them sharing the same duration with a `*` and an explanatory footnote. For prod, either patch sherpa-onnx to expose timestamps or stop showing the separate rows.

### LICENSE alignment

- POC is **AGPL-3.0** to match the spec. Murmure prod is likely a different license. Before vendoring code from this POC into `murmure-mobile`, audit each file and decide whether to:
  - Republish under the prod license (requires reauthorization — straightforward since author is the same)
  - Use the POC as a git submodule and respect AGPL boundaries

## Pre-flight checklist (before opening the integration PR)

- [ ] Reproduce baseline benchmarks on the target Murmure prod device(s)
- [ ] Build and test Release configuration with R8 + ProGuard
- [ ] Validate NNAPI / CoreML providers' actual acceleration vs CPU fallback
- [ ] Decide on bundling vs runtime-only model strategy
- [ ] Add Sentry / equivalent crash reporting around the native bridge (sherpa-onnx)
- [ ] Audit license surface (AGPL → prod license, eSpeak-NG GPL constraints)
- [ ] Lock in `numThreads` and `provider` per device class via the QNN detection helpers sherpa-onnx ships
- [ ] Re-verify iOS path with a real simulator and a real iPhone
- [ ] Decide on graceful fallback to `react-native-tts` (system TTS) when Piper engine fails to initialize
- [ ] Design the model-download UX in Murmure's flow (currently a separate screen — does it belong in onboarding? on first geofence trigger? in settings?)
