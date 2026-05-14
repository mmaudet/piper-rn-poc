# LinkedIn — draft post

> À valider avant publication. Angle perso + side project + benchmark on-device. Le post précise que ce **n'est pas une app standalone** — c'est un outil de mesure qui se déploie via laptop USB.

---

## Post

🎙️ Depuis quelques semaines je m'intéresse de près à la **génération de voix en temps réel, on-device, sur téléphone mobile**.

C'est pour un side project dont je vous parlerai bientôt — mais avant ça, j'avais besoin de savoir si une TTS neurale moderne pouvait vraiment tourner **localement, sans cloud, avec une qualité d'écoute crédible** sur un smartphone récent.

Donc j'ai construit un **outil de benchmark React Native** pour mesurer ça précisément. Stack : **Piper TTS** (modèles VITS ONNX, open source), **sherpa-onnx** (k2-fsa, qui embarque eSpeak-NG + ONNX Runtime statiquement liés), **React Native 0.85** TurboModule. 5 langues européennes (FR / EN / IT / ES / DE), 3 paramètres modulables en direct (vitesse, expressivité, rythme), timeline temps réel pour visualiser chaque étape de la pipeline.

Résultats sur Pixel 10 Pro Fold (Tensor G5) après tuning (Release build + NNAPI sur NPU + numThreads=4) :
- **TTFA warm-start : 1.2 s** (sous la cible spec de 1.5 s)
- **RTF : 9× à 13×** (jusqu'à 3× au-dessus de la cible spec ≥4×)
- Gain vs baseline non-optimisée : jusqu'à **-64% TTFA, +196% RTF** sur l'espagnol

⚠️ **Ce n'est pas une app à télécharger** — c'est un outil de mesure pour développeurs. Pour le tester, il faut cloner le repo, brancher son téléphone Android en USB sur son laptop, et déployer via `yarn android` (ou `gradle installRelease`). iOS validé par la chaîne de build, test direct device à confirmer.

Tout est public en AGPL-3.0, code + benchmarks + screenshots :
→ **github.com/mmaudet/piper-rn-poc**

Curieux si certain·e·s d'entre vous ont déjà bench-marqué Piper / Kokoro / Supertonic on-device — partagez vos chiffres si oui !

#EdgeAI #TTS #SovereignAI #ReactNative #OpenSource #OnDeviceAI

---

## Notes

- Longueur : ~10 lignes, légèrement plus long que les versions précédentes mais nécessaire pour expliquer le caveat "outil de mesure, pas app standalone"
- Tone : direct, technique, sans hype
- Hashtags à doser
- Optionnel : joindre 1-2 screenshots du benchmark UI (docs/screenshots/02-home.png + 05-timeline.png)
- Le teaser "side project dont je vous parlerai bientôt" crée la curiosité sans révéler le projet sous-jacent
- Invite engagement final : "partagez vos chiffres" — augmente la portée
