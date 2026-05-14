# LinkedIn — draft post

> Format demandé : court (5 lignes), angle souveraineté + edge AI + modulation dynamique. À valider avant publication.

---

## Version A — focus technique

🎙️ **TTS souverain on-device, en React Native, en 1 jour.**

Piper TTS (modèles VITS open source) qui tourne en local sur iPhone + Pixel, sans réseau, avec **5 langues européennes** et **3 paramètres modulables en temps réel** (vitesse, expressivité, rythme). Sur Pixel 10 Pro Fold : **TTFA 3.4s** au premier essai (cold start) — un baseline qui ne demande qu'à être tuné (NNAPI, Release build, plus de threads).

Souveraineté numérique + Edge AI + qualité audio quasi-naturelle, sans cloud. Le repo est public, AGPL-3.0, prêt à embarquer dans une vraie app.

→ github.com/mmaudet/piper-rn-poc

#EdgeAI #TTS #OpenSource #ReactNative #SovereignAI

---

## Version B — focus produit

🎙️ Et si la TTS de qualité tournait **sans cloud**, sur ton téléphone, en 5 langues ?

POC de 1 jour : Piper TTS (ONNX/VITS) embarqué dans une app React Native, iOS + Android, 100% on-device. 3 paramètres modulables en direct (vitesse, expressivité, rythme) + 5 presets. TTFA 3.4s sur Pixel 10 Pro Fold en baseline non-optimisée.

Cas d'usage : guides patrimoniaux, accessibilité, agents conversationnels offline, narration de jeux mobile. Toute la souveraineté numérique d'un coup, en AGPL-3.0.

→ github.com/mmaudet/piper-rn-poc

#EdgeAI #TTS #ReactNative #SovereignAI #OpenSource

---

## Version C — focus storytelling Murmure

🎙️ Pour Murmure (mémoires audio sur monuments historiques), je voulais valider si une **TTS souveraine** pouvait tourner **sans cloud, sur le téléphone du visiteur**, et garder un rendu narratif crédible.

Réponse : oui. POC React Native + Piper (VITS ONNX) + sherpa-onnx, 5 langues européennes, **3 paramètres modulables en direct** pour ajuster la voix au ton patrimonial. **TTFA 3.4s, RTF 6.6×** sur Pixel 10 Pro Fold dès le 1er run.

L'edge AI mature, c'est aussi ça : du contenu local, qualité naturelle, zéro fuite de donnée vers un cloud. Repo public, AGPL-3.0.

→ github.com/mmaudet/piper-rn-poc

#EdgeAI #SovereignAI #TTS #ReactNative #Patrimoine

---

## Notes pour Michel

- 3 variantes au choix selon le public ciblé
- Tous incluent le compte github.com/mmaudet (à créer si besoin)
- La V0 du post mentionne du chiffrage qui peut évoluer après benchmarks complets (warm-start, NNAPI tuning) — peut-être attendre la v2 du tableau de benchmarks pour publier
- Hashtags à doser selon réseau (LinkedIn ≠ X)
- Optionnel : joindre un GIF démo court (15s, switch langue + preset)
- Voice & ton : direct, technique, sans hype — match avec ton positionnement
