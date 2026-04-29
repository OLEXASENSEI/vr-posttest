# Sound Meets Space — v8.0 Test Battery

**Author:** Robert Anthony Olexa (Hakodate KOSEN / iST Cross Lab)
**Chapter:** Dissertation Ch. 5 — Sound Meets Space
**Defense:** July 1, 2026 (preliminary May 2026)
**Status:** v8.0 pretest + posttest live; spatial reconstruction deferred to v8.1
**Last update:** 2026-04-29 (v1.1 — post script-reality reconciliation)

---

## 1. Reframe summary

v7.x measured vocabulary knowledge (lexical decision, receptive 4AFC, recognition). For Japanese KOSEN students who already know basic kitchen vocabulary, those measures are floor-effect-prone and don't address the dissertation's claim. v8.0 measures **production intelligibility on iconicity-bearing phonemes**, pre→post, across three training conditions. Receptive vocabulary is gone; phoneme-level articulation is the dependent variable.

The reframing also reckoned with **what training actually does**. v7.x design assumed participants passively perceive iconic words; v8.0 reflects that participants actively produce them. Each utterance ("crack the egg," "flip the pancake") is gated by Whisper intelligibility — say it intelligibly, the visual event happens with synchronized SFX. The participant is the agent of every event. This makes training **forced production with multimodal contingent feedback**, much closer to motor-learning paradigms than to receptive vocabulary studies.

The chapter argues a two-step claim:
1. **Replication:** standard psycholinguistic iconicity effects (high-iconicity words produced more accurately than low-iconicity) appear across all three conditions, validating that VR's third-space (Ch. 3, Olexa & Taquet 2026) doesn't erode learning.
2. **Amplification:** iconicity gains are steepest in VR > 2D > Text — VR's spatial-acoustic co-location amplifies the iconicity-production loop because SFX, visual event, and articulation share a spatial frame.

---

## 2. Primary statistical contrast

```
DV:        pre→post change in production intelligibility (per phoneme target)
Predictors:
  Condition (VR / 2D / Text)        — between subjects
  Iconicity class (iconic / conv.)  — within subjects, item-level
  Time (pre / post)                 — within subjects
  Item role (target / control)      — within subjects
Random effects: (1 | participant) + (1 | word)
Covariates: phoneme discrimination, foley iconicity, Corsi, digit span,
            English years, TOEIC/EIKEN, VR experience
```

**Predicted three-way interaction:** Condition × Iconicity × Time, with the iconicity slope (post − pre) being VR > 2D > Text. Control items lane (chop, peel, ladle, kettle) subtracts pure testing/familiarization gain.

**Sensitivity analysis:** the same model with continuous Winter ratings instead of categorical iconic/conventional. Convergence supports the categorical operationalization.

---

## 3. Stimulus design (locked against Winter et al. 2024 + canonical training script)

### 3.1 Production targets (8 trained items)

All 8 are pretested AND posttested for every participant. No split-half — pretest production with no feedback is minimal contamination.

| Word | Class | Rating | Form-selection notes |
|---|---|---:|---|
| crack | iconic | 5.40 | Target form: bare. Gerund alternative: cracking. |
| flip | iconic | 5.70 | Target form: bare. Gerund alternative: flipping. |
| slice | iconic | 5.27 | Target form: bare. Gerund alternative: slicing. |
| stir | marginal iconic | 4.30 | Target form: bare. Form-selection probe. |
| bowl | conventional | 3.00 | — |
| pan | conventional | 3.45 | — |
| flour | conventional | 3.00 | — |
| butter | conventional | 3.50 | — |

**Class means:** iconic (excl. stir) 5.46, conventional 3.24, Δ = 2.22. Difference exceeds the database interquartile range.

### 3.2 Parallel controls (4 untrained items)

| Word | Class | Rating |
|---|---|---:|
| chop | iconic control | 5.50 |
| peel | iconic control | 5.60 |
| ladle | conventional control | 3.67 |
| kettle | conventional control | 3.80 |

Iconicity gradient parallels targets'. Pre→post change on these estimates pure testing effect.

### 3.3 Passive/implicit iconic — `sizzle`

**`sizzle` is not in the production block.** Rationale: participants never produce `sizzle` during training. They produce `butter the pan` or `heat the pan`, and `sizzle` is the SFX consequence. Eliciting production of an unproduced word measures baseline articulation with no training comparison possible.

Tested instead in the posttest **multi-probe binding task** as the unique passive-iconic case. Predicted: VR's spatial-acoustic affordance produces stronger SFX-word binding for `sizzle` than 2D > Text, even without articulation.

### 3.4 Why class, not continuous Winter rating

Per-item rating SEs are 1.5–2.5 with n ≈ 10 raters per word. A continuous predictor with that much measurement error would swamp any condition × iconicity interaction. Class-based contrast is more robust; continuous rating is a sensitivity analysis.

Some Winter ratings are intuitively suspect (e.g., `knife` 5.29, `milk` 5.09, `mix` 5.10 in the top decile alongside `sizzle`/`crack`) — likely rater drift. Items in this rating-anomaly territory are excluded from the iconic class and live in the unanalyzed filler role.

---

## 4. Form-selection secondary analysis

The marginal-iconic word `stir` (rating 4.30 bare / 4.82 gerund) carries a specific theoretical bet. The gerund form `stirring` is more iconic than the bare imperative because the /-ɪŋ/ ending phonologically lengthens the action, mapping iconically onto the continuous nature of stirring. For Japanese L2 learners (whose L1 mimetic system is rich with durational iconicity, e.g., gitaigo doubling: `guruguru` for stirring/swirling), the gerund form may be preferred over the bare imperative for iconic action verbs as a sound-meaning-driven form-selection error.

All action verbs in v8.0 (crack, flip, slice, stir) carry `target_form: 'bare'` in their trial data. Post-hoc Whisper transcription on isolated-pass audio scores whether the participant produced the bare form, the gerund, or another variant. Form-selection analysis: gerund-substitution rate by iconicity × condition.

**Predicted:** higher gerund-substitution rate for iconic verbs, amplified in VR > 2D > Text. Reported as a secondary finding (exploratory but theoretically grounded).

---

## 5. Pretest structure (~15 min)

```
1.  Asset launch-check (only if missing assets)
2.  Welcome
3.  Participant info → stamps counterbalance for analysis
4.  Mic setup gate
5.  Forward digit span (3, 4, 5)              — WM covariate
6.  Phoneme discrimination (12 trials)        — phonological perception covariate
7.  Foley iconicity (4 trials)                — iconicity-sensitivity moderator
8.  Spatial span / Corsi (3, 4)               — spatial WM covariate
9.  Production practice (1 trial, park scene)
10. Production controls (4 items × phrase + isolated × 2 reps each = 32 recordings)
11. Production targets (8 items × phrase + isolated × 2 reps each = 64 recordings)
12. Save
```

### 5.1 Two-pass elicitation per production item

**Phrase pass (4s recording):**
- Object items: "What is this?" → expected "It's a [word]"
- Action items: "What is happening?" → expected "She is [word]ing"
- Matches what training does; preserves ecological validity.

**Isolated pass (3s recording):**
- Same picture: "Say just the word."
- Forces single-word production. Primary measurement signal because there's no carrier-phrase context for Whisper or naïve listener to compensate with.

Phrase block runs across all items first, then isolated, with a transition screen between. This separates passes so phrase production doesn't immediately prime isolated.

### 5.2 Phoneme discrimination contrasts (12 trials)

10 different-pair trials targeting phonemes in v8.0 stimuli, plus 2 identity-control trials (same audio file played twice; participants who score 0/2 on these are excluded as non-attenders).

| # | Pair | Contrast | Targets |
|---:|---|---|---|
| 1 | slice / sris | /sl/–/sɹ/ | slice |
| 2 | crack / clack | /kr/–/kl/ | crack |
| 3 | flip / frip | /fl/–/fɹ/ | flip |
| 4 | sizzle / siddle | medial /z/–/d/ | sizzle |
| 5 | bowl / vowl | /b/–/v/ | bowl |
| 6 | pan / pun | /æ/–/ʌ/ | pan |
| 7 | flour / floor | /aʊə/–/ɔː/ | flour |
| 8 | butter / batter | /ʌ/–/æ/ | butter |
| 9 | spoon / soon | /sp/ cluster | spoon (filler) |
| 10 | stir / star | /ɜːr/–/ɑːr/ | stir |
| 11 | crack / crack | identity | attention check |
| 12 | pan / pan | identity | attention check |

Each trial yields per-target perceptual baseline as a moderator for production gain.

---

## 6. Posttest structure (~25 min immediate; ~20 min delayed)

```
1.  Asset launch-check
2.  Welcome
3.  Participant confirm (pid + training condition)
4.  Mic gate
5.  Mic plugin init (HOISTED — fixes v7.4 double-prompt bug)
6.  Production practice
7.  Production controls — phrase + isolated × 2 reps (32 recordings)
8.  Production targets — phrase + isolated × 2 reps (64 recordings)
9.  Multi-probe binding task — sizzle, crack, bowl × 3 probes
10. Foley recognition (4 trained sounds)
11. Procedural recall (free typing)
12. Sequencing (drag-to-order)
13. Blind retell (45s audio)
14. Teach a friend (60s audio)
15. Recognition + confidence (12 items: 8 trained + 4 foils)
16. Likert (7 items)
17. Exit comments
18. Save
```

### 6.1 Cuts from v7.4

- **4AFC ingredients/actions block** — pre-taught Group B targets before naming. Cut.
- **Speeded word-picture match** — pre-taught targets and tested recognition speed (didn't address hypothesis). Cut.
- **Group A naming as separate block** — merged into single production block.
- **Naming Stage 3 scene description** — replaced by spatial multi-probe.
- **Foley split into Group A + B** — merged into single 4-item block.
- **19-item recognition test** — trimmed to 12.

### 6.2 Multi-probe binding task

For each of 3 words (`sizzle` — passive iconic; `crack` — produced iconic; `bowl` — produced conventional), three probes:

| Probe | Question | All conditions can encode? |
|---|---|---|
| 1. Event association | "When you said/heard X, what was happening?" 4-AFC | Yes — event memory is condition-invariant |
| 2. SFX recognition | "Did you hear this sound during training?" Yes/No + confidence | Yes — SFX held constant across conditions |
| 3. Location | "Where in the kitchen did this happen?" Ingredient / Cooking / Plating | Yes — three regions are schematic, modality-neutral |

Probe 3 is the **spatial-affordance signal**. Predicted: VR > 2D > Text on Probe 3, uniform across conditions on Probes 1 and 2. The location advantage is convergent evidence for the spatial-affordance hypothesis alongside the production-intelligibility result.

### 6.3 Why no drag-and-place spatial reconstruction

v8.0 originally proposed a drag-and-place spatial reconstruction task as the strongest spatial-encoding measure. After auditing the actual training conditions, this was deferred:

- The 2D condition shows objects as pictures at fixed canvas positions (Euclidean spatial encoding).
- The Text condition shows word labels in container boxes (containment/relational encoding) — fundamentally different from Euclidean.
- A single ground-truth Euclidean layout would unfairly favor the 2D condition because it's the only group that encoded Euclidean positions.

The schematic 3-region location probe (Probe 3) is the conservative, defensible version of the spatial test: all three conditions could have encoded "ingredient area vs cooking area vs plating area" regardless of modality. A pixel-precise drag-and-place task is deferred to v8.1 as a follow-up study with appropriate controls (e.g., counterbalanced ground-truth layouts, separate per-condition encoding metrics).

---

## 7. Audio measurement pipeline (downstream)

Audio filename schema:

```
pre_{pid}_{role}_{word}_{pass}_rep{N}.wav
post_{pid}_{role}_{word}_{pass}_rep{N}.wav
```

This lets analysts pair pre/post by participant + word + pass for change-score analysis.

Three measurement tracks:

1. **Forced alignment + per-segment scoring** (Montreal Forced Aligner). Primary for cluster/duration features. Produces per-phoneme accuracy for each token.
2. **Naïve L1-English raters → intelligibility Likert** on isolated-pass audio. Primary for "did this sound like the target word?" Most aligned with downstream communicative use.
3. **Acoustic measures** (VOT for /p t k/, F1/F2 for /æ/ /ʌ/ /ɜː/, sibilant centroid for /s/ /ʃ/ /z/, duration ratios). Diagnostic where specific predictions exist.

The isolated-pass audio is the primary input. Phrase-pass audio supports a secondary analysis on naturalness/lexical-retrieval. Whisper transcripts on isolated audio also drive the form-selection (bare-vs-gerund) analysis.

---

## 8. Required assets

### Audio files (sounds/)

**Phoneme discrimination — new for v8.0 (11):**
slice, sris, crack, clack, sizzle, siddle, vowl, pun, floor, spoon, soon

**Phoneme discrimination — carry-over from v7.3 (9):**
flip, frip, bowl, pan, flour, butter, batter, stir, star

**Foley iconicity — pretest (4):** high_tinkle, liquid_flow, egg_crack, sizzle

**Foley recognition — posttest (4):**
sfx_cracking, sfx_sizzling, sfx_flipping, sfx_slicing

### Image files (img/)

**Production targets (8):** cracking, flipping, slicing, stirring, bowl, pan, flour, butter

**Production controls (4):** chopping, peeling, ladle, kettle

**Practice:** park_scene

---

## 9. File layout

```
/
├── pretest.html              # entry point — loads jsPsych + pretest.js
├── pretest.js                # v8.0
├── posttest.html             # entry point — loads jsPsych + posttest.js
├── posttest.js               # v8.0
├── img/                      # all picture stimuli
├── sounds/                   # all audio (phoneme + foley + SFX)
└── README.md                 # this document
```

---

## 10. Counterbalance hash (pretest + posttest synced)

Both pretest and posttest use the same hash function on participant ID:

```js
function pidToCounterbalance(pid) {
  const s = String(pid || 'unknown');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2;
}
```

In v8.0, all 8 trained targets are pretested and posttested for everyone — counterbalance is **stamped in trial data but does not gate stimuli**. This is so future analyses (or a v8.1 split-half re-introduction) can use the same field without re-architecting code.

**Lock pid format before data collection begins.** Hash distribution depends on pid format; switching from numeric to alphanumeric mid-study would shift counterbalance distribution.

---

## 11. Decisions made and trade-offs accepted

| Decision | Trade-off accepted |
|---|---|
| Class-based iconicity contrast over continuous Winter rating | Lose granularity; gain robustness against per-item rating noise |
| Drop receptive 4AFC entirely | Lose receptive baseline; gain ~3 min and remove pre-teaching |
| Drop lexical decision | Lose word-recognition speed covariate; gain ~3 min |
| No split-half — pretest all 8 targets for everyone | Slight pretest contamination risk, mitigated by parallel controls. Gain 8-vs-8 within-subject coverage and clean change-score analysis |
| `sizzle` not a production target | Loss of one iconic data point in production. Gain: honest acknowledgment that participants never produce `sizzle` during training. Tested instead via multi-probe binding |
| Stir as marginal-iconic with form-selection analysis | Adds one item that's analyzed separately. Gain: secondary publishable finding on durational iconicity in L2 |
| Phrase + isolated two-pass elicitation | +90s per block; solves Whisper-rescue confound for phoneme-level analysis |
| Drop drag-and-place spatial reconstruction | Lose strongest spatial-encoding measure; gain defensibility (avoids Euclidean-vs-containment confound). Schematic 3-region probe is conservative dunk; full version deferred to v8.1 |
| Pretest 15 min + Posttest 25 min in 1-hour total session | Hard ceiling, drives every cut |

---

## 12. Reproducibility notes

- Counterbalance assignment is **deterministic from participant ID** via the hash function above. Re-running with the same pid produces the same stamp.
- All trial records carry: `pid`, `phase` (pre/post), `training_condition`, `counterbalance_list`, `target_word`, `iconic`, `iconicity_rating`, `iconicity_marginal`, `target_form`, `item_role`, `pass`, `audio_filename` (audio mode) / `response` (text mode).
- Audio files use the canonical naming schema in §7 — analysts can pair pre/post tokens without parsing trial logs.
- The form-selection analysis requires post-hoc Whisper transcription of isolated-pass audio; the test does NOT perform this scoring during the session.

---

## 13. Citation

Olexa, R. A. (in preparation). *Sound Meets Space: Iconicity amplification through spatial affordance in immersive VR language learning* [Doctoral dissertation, Institute of Science Tokyo].

Olexa, R. A., & Taquet, D. (2026). Virtual reality study abroad and language contact patterns in Japanese EFL learners. *Discover Education*.

Winter, B., et al. (2024). Iconicity ratings for 14,000+ English words.

---

*Document version 1.1 (2026-04-29). Update header date and changelog on every substantive revision.*

## Changelog

- **v1.1 (2026-04-29):** Reconciled with canonical training script. Removed `sizzle` from production targets (it's an SFX consequence, not a participant utterance). Added `stir` as marginal-iconic with form-selection secondary analysis. Dropped split-half — pretest all 8 targets. Added multi-probe binding task with 3-region location probe as conservative spatial-affordance test. Deferred drag-and-place spatial reconstruction to v8.1. Posttest fully redesigned: cut 4AFC + speeded match, mic-init hoisted, word lists synced with pretest, two-pass production added.
- **v1.0 (2026-04-29):** Initial v8.0 documentation with split-half counterbalance, sizzle as production target, drag-and-place spatial reconstruction.