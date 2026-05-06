# Sound Meets Space — VR Pre/Post Test Battery

jsPsych implementation of the pre- and post-test instruments for the dissertation experiment **Sound Meets Space: Iconicity and L2 Vocabulary Acquisition in VR**.

| | |
|---|---|
| **Researcher** | Robert Anthony Olexa, Hakodate KOSEN / iST Cross Laboratory |
| **Supervisor** | Dr. Jeffrey Cross |
| **Defense** | July 1, 2026 |
| **Current versions** | pretest v8.3 · posttest v8.7 (May 2026) |
| **Status** | Pilot complete; data collection in progress |

---

## Study overview

Three-condition between-subjects design (VR / 2D / Text) with within-subject pre→post measurement on Japanese KOSEN second-year English learners. Participants train on a kitchen-vocabulary recipe in one of the three modalities, then are measured on production intelligibility, form-selection patterns, and multimodal binding.

**Hypothesis.** VR's spatial-acoustic affordance amplifies iconicity effects in L2 vocabulary acquisition more than 2D, which amplifies more than Text. Iconic words show steeper pre→post intelligibility gains in VR, with the iconicity gradient steepest in the order VR > 2D > Text.

This repository contains only the pretest and posttest jsPsych instruments. The training conditions (Unity VR, 2D picture canvas, Text canvas) are separate codebases.

---

## Word inventory

The same word list is used in pretest and posttest production blocks. All ratings are from Winter et al. (2024), n=14,776.

### Production targets (8) — pre + post + trained

|              | Iconic                             | Conventional                                    |
|--------------|------------------------------------|-------------------------------------------------|
| **Word**     | crack 5.40 · flip 5.70 · slice 5.27 | bowl 3.00 · pan 3.45 · flour 3.00 · butter 3.50 |
| **Marginal** | stir 4.30 (gerund 4.82)             |                                                 |

`stir` is a marginal-iconic case included for the form-selection secondary analysis.

### Parallel controls (4) — pre + post + never trained

|              | Iconic                  | Mid-range (testing/familiarization estimators) |
|--------------|-------------------------|------------------------------------------------|
| **Word**     | chop 5.50 · peel 5.60   | spoon 4.30 · plate 4.08                        |

The control set mirrors the iconicity split of the targets so the iconicity × time interaction can be estimated cleanly. Pre→post change on controls estimates testing/familiarization effects. Note: spoon (4.30) and plate (4.08) fall in the mid-range of the Winter scale rather than the low-conventional range (v8.3/v8.7: corrected from earlier mis-read of 3.30/3.00). They function as testing/familiarization estimators; the primary iconicity contrast rests entirely on the trained target set (conventional-noun mean 3.24 vs iconic-target mean 5.46).

### Passive iconic (1) — posttest binding probes only

`sizzle` (5.30). Sizzle is retained as a passive iconic item rather than a production target. Its Winter et al. iconicity rating is high (5.30), but because participants do not produce the word during training — it is the sound-effect consequence of an action ("butter the pan", "heat the pan") rather than an utterance — it is not included in the primary production-intelligibility analysis. Instead, it is analyzed through posttest auditory/event-binding measures.

### SFX recognition lures (4) — posttest only, never trained

`chop · peel · glug · splash` — used as "No"-correct trials in the SFX recognition block to enable d-prime calculation. All iconic-class kitchen-action sounds, plausibly part of *some* kitchen training but not part of *this* training. Chop and peel double as production controls; glug and splash were originally retired recognition foils.

---

## Dependent variables

**Primary — Production intelligibility on iconicity-bearing phonemes.** Measured pre→post on all 8 trained targets and 4 controls. Two-pass elicitation per item (phrase pass: "What is happening?" / "What is this?" with 4-second recording; isolated pass: "Say just the word." with 3-second recording). Each pass × item = 2 reps. Scored post-hoc via Whisper transcription, forced alignment, naïve-rater intelligibility ratings, and acoustic measures.

The primary statistical contrast is **Condition × Iconicity × Time**, with the parallel-control lane providing a within-subject estimate of testing/familiarization effects.

**Secondary — Form-selection (bare vs gerund) on action verbs.** Tests whether learners substitute the gerund form (`stirring`) for the bare imperative (`stir`) more often for iconic verbs and more often in VR than 2D > Text. All action verbs (crack, flip, slice, stir; chop, peel) are coded `target_form: 'bare'` so post-hoc Whisper transcription can score gerund-substitution rate uniformly.

**Tertiary — Multimodal binding measures (posttest).** Three independent measures:

1. **Event association (Probe 1)** — 4-AFC for sizzle, crack, bowl. Distractors are training-content overlapping; cannot be answered from world knowledge alone.
2. **Spatial reconstruction (3×3 grid arrangement)** — coarse-grained drag-and-drop. Per-condition ground truth (VR/2D/Text scenes have different layouts).
3. **SFX recognition with lures (d-prime)** — 5 trained targets + 4 untrained lures, Yes/No + confidence. Yields hits and false alarms per participant for d-prime as the auditory-encoding sensitivity measure independent of yes-bias.

---

## Task structure

### Pretest (~13 min)

| # | Task | Items | Purpose |
|---|------|-------|---------|
| 1 | Asset launch-check | (conditional) | Abort if files missing |
| 2 | Welcome | 1 | — |
| 3 | Participant info | 1 | pid, age, L1, English years, TOEIC/EIKEN, VR experience |
| 4 | Mic gate + plugin init | 1 | — |
| 5 | Phoneme discrimination | 12 | Covariate; v8.1 caps replays at 2/sound |
| 6 | Bouba/kiki | 4 | Covariate: cross-modal iconicity |
| 7 | Foley iconicity | 4 | Covariate: sound→meaning mapping |
| 8 | Receptive vocabulary | 12 | Covariate: vocab breadth (v8.1 tightened distractors) |
| 9 | Production practice | 1 | Park scene |
| 10 | Production controls | 4 × 2 × 2 | chop, peel, spoon, plate |
| 11 | Production targets | 8 × 2 × 2 | All 8 trained targets |
| 12 | Teach-a-friend baseline | 1 (60s) | Pre→post Δ baseline |
| 13 | Save | 1 | — |

### Posttest (~18 min)

| # | Task | Items | Purpose |
|---|------|-------|---------|
| 1 | Asset launch-check | (conditional) | — |
| 2 | Welcome (with framing) | 1 | Tells participants part 1 is repeated, part 2 is new |
| 3 | Participant confirm | 1 | pid + training condition |
| 4 | Mic gate + plugin init | 1 | — |
| 5 | Production practice | 1 | — |
| 6 | Production controls | 4 × 2 × 2 | Mirror of pretest |
| 7 | Production targets | 8 × 2 × 2 | Mirror of pretest |
| 8 | Multi-probe binding | sizzle, crack, bowl × Probe 1 only | Event-association DV (v8.6: Probes 2/3 dropped) |
| 9 | 3×3 grid arrangement | 5 items, per-condition ground truth | Spatial-encoding DV |
| 10 | SFX recognition (d-prime) | 5 targets + 4 lures, Y/N + confidence | Auditory-encoding DV (v8.3: replaces old Probe 2) |
| 11 | Foley recognition | 5 SFX, 4-AFC | Trained-sound→action verb identification |
| 12 | Sequencing | 5 recipe steps | Kendall tau scoring |
| 13 | Teach-a-friend | 1 (60s) | Pairs with pretest baseline |
| 14 | Likert | 7 items | Self-reported recall / awareness / immersion |
| 15 | Exit comments | 2 free-text | — |
| 16 | Save | 1 | — |

Within the post-production sequence, **SFX recognition runs before foley 4-AFC** because foley re-exposes participants to every target SFX, which would contaminate Y/N recognition memory.

---

## Repository layout

```
.
├── pretest.js                # v8.3
├── posttest.js               # v8.7
├── pretest.html              # jsPsych shell
├── posttest.html             # jsPsych shell
├── img/
│   ├── cracking.jpeg, flipping.jpg, slicing.jpg, stirring.jpg     # action targets
│   ├── bowl.jpg, pan.jpg, flour.jpg, butter.jpg                   # object targets
│   ├── chopping.jpg, peeling.jpg, spoon.jpg, plate.jpg            # controls
│   ├── park_scene.jpg                                             # practice
│   └── {item}_01.png, {item}_02.png                               # variants — PNG by convention
├── sounds/
│   ├── slice.mp3, crack.mp3, flip.mp3, sizzle.mp3, ...            # phoneme-discrim words
│   ├── sris.mp3, clack.mp3, frip.mp3, ...                         # phoneme-discrim contrasts
│   ├── high_tinkle.mp3, liquid_flow.mp3, egg_crack.mp3            # foley iconicity
│   ├── sfx_crack_{1,2}.mp3, sfx_flip_{1,2}.mp3, ...               # trained SFX (2 variants)
│   ├── sfx_slice_1.mp3                                            # trained SFX (single take)
│   └── sfx_chop_1.mp3, sfx_peel_1.mp3, sfx_glug_1.mp3, sfx_splash_1.mp3   # SFX recognition lures
└── README.md
```

### Image variant convention

Variant filenames use `{stem}_01.png` / `{stem}_02.png` regardless of the base image's extension. Hardcoded via `_VARIANT_EXT = 'png'` in both files. If both variants exist, `imagePath()` randomizes per trial and stamps `image_variant: 1` or `2`. If only `_01` exists, that's used. If neither exists, base file with `image_variant: 0`.

### SFX file convention

`sounds/sfx_{word}_{1|2}.mp3` for two-take words; `sounds/sfx_{word}_1.mp3` for single-take words. Single-take words listed in `SINGLE_TAKE_SFX = {slice, chop, peel, glug, splash}`. `sfxPath()` resolves at trial-construction time and stamps `sfx_variant`.

---

## Deployment

### Dependencies

jsPsych 7.3.4 with: `jspsych-html-button-response`, `jspsych-html-keyboard-response`, `jspsych-survey-text`, `jspsych-survey-likert`, `jspsych-initialize-microphone`, `jspsych-html-audio-response`.

### Browser requirements

Modern Chrome / Firefox / Safari. **HTTPS required** for microphone access. If embedded in an iframe, parent must include `allow="microphone *"`.

### URL parameters

- `?cond=VR` / `?cond=2D` / `?cond=Text` — pre-fills training condition (posttest only). Used by arrangement task to select per-condition ground truth.
- `?post=<URL>` — POST submission endpoint (otherwise data downloads as JSON).

### Entry points

- **Pretest**: auto-runs on `DOMContentLoaded`
- **Posttest**: invoke `window.__START_POSTTEST(pid, delayed)` — `delayed` is a boolean

---

## Data output

JSON file per session:
- Pretest: `pretest_{pid}_{timestamp}.json`
- Posttest: `posttest_{pid}_{immediate|delayed}_{timestamp}.json`

Array of trial records. Standard jsPsych fields plus task-specific fields.

| Field | Type | Notes |
|-------|------|-------|
| `task` | string | Trial category |
| `phase` | `'pre'` \| `'post'` | Always present on measurement trials |
| `pid` | string | Set on every trial |
| `training_condition` | `'VR'` \| `'2D'` \| `'Text'` | Posttest only |
| `counterbalance_list` | `0` \| `1` | Hashed from pid; informational |
| `target_word` / `word` | string | Production / SFX / binding trials |
| `iconic` | bool | |
| `iconicity_rating` | float | Winter et al. continuous |
| `iconicity_marginal` | bool | Marks `stir` |
| `target_form` | `'bare'` | All action verbs |
| `pass` | `'phrase'` \| `'isolated'` | Production only |
| `repetition` | int | 1 or 2 per (word, pass) |
| `item_role` | `'control'` \| `'target'` | Production only |
| `image_path` | string | Resolved path |
| `image_variant` | `0` \| `1` \| `2` | 0 = base, 1/2 = variant |
| `audio_filename` | string | For audio export |
| `response` | various | Audio blob, text, or button index |
| `correct` / `is_correct` | bool | Objective tasks |
| `is_lure` | bool | SFX recognition trials |
| `sdt_outcome` | string | SFX recognition: `'hit'`, `'miss'`, `'false_alarm'`, `'correct_rejection'` |
| `playA_count` / `playB_count` | int | Phoneme discrimination replays |
| `missing_assets` | array | URL list at session start |

### d-prime calculation (SFX recognition)

```r
library(dplyr)
sfx_rec <- data %>% filter(task == "sfx_recognition")

per_pp <- sfx_rec %>%
  group_by(pid, training_condition) %>%
  summarize(
    hits   = sum(sdt_outcome == "hit"),
    misses = sum(sdt_outcome == "miss"),
    fas    = sum(sdt_outcome == "false_alarm"),
    crs    = sum(sdt_outcome == "correct_rejection"),
    hit_rate = (hits + 0.5) / (hits + misses + 1),       # log-linear correction
    fa_rate  = (fas  + 0.5) / (fas  + crs    + 1),
    d_prime  = qnorm(hit_rate) - qnorm(fa_rate)
  )
```

### Audio extraction (post-hoc)

```python
import json, base64, re

with open('pretest_1_2026-05-01...json') as f:
    data = json.load(f)

for trial in data:
    if trial.get('task') in ('production_phrase', 'production_isolated'):
        if trial.get('audio_filename') and isinstance(trial.get('response'), str):
            b64 = re.sub(r'^data:audio/[^;]+;base64,', '', trial['response'])
            with open(trial['audio_filename'], 'wb') as out:
                out.write(base64.b64decode(b64))
```

---

## Version history

### Pretest v8.3 / Posttest v8.7 — Control ratings corrected; WORD_CLASSIFICATION dedup

`PRODUCTION_CONTROLS` rating correction in both files: spoon 3.30 → 4.30, plate 3.00 → 4.08 (Winter et al. source values). The earlier values were a mis-read of the database. Spoon and plate sit in the mid-range rather than the low-conventional range, so they are correctly described as testing/familiarization-effect estimators rather than low-iconicity comparators. The primary iconicity contrast (trained iconic targets vs conventional targets) is unaffected.

Pretest v8.3 also removes duplicate `'spoon'` and `'plate'` keys from `WORD_CLASSIFICATION`'s FILLER section; those entries previously overrode the CONVENTIONAL CONTROLS entries with different (and now-correct) ratings in the same object literal. Each word now appears once, in the CONVENTIONAL CONTROLS section, with `role: 'control'` and the correct Winter rating.

### Posttest v8.6 — Probe 3 dropped

The v8.4 reframe (spatial adjacency → procedural pairing) made the answer key condition-invariant, but procedural-pairing answers were derivable from world knowledge plus option elimination, independent of training memory. Spatial DV moves entirely to the 3×3 grid; auditory DV to SFX recognition; Probe 1 carries event-association. Saves ~1.5 minutes.

### Posttest v8.5 / Pretest v8.2 — Image variant extension fix

Hardcoded `_VARIANT_EXT = 'png'` constant in both files. Pre-v8.5/v8.2, variant probes used the base extension (e.g., `cracking.jpeg` → `cracking_01.jpeg`); variants were created as PNG by convention, so every probe 404'd. Side benefit: 24 fewer console 404s at launch.

### Posttest v8.4 (superseded by v8.6)

Probe 3 reframed from spatial adjacency to procedural pairing. Adjacency had condition-dependent ground truth and systematically biased Text and VR participants downward. Replaced with procedural-pairing 4-AFC; subsequently dropped entirely in v8.6.

### Posttest v8.3 — Probe 2 redesigned for d-prime

Previous per-word Probe 2 had `correct_answer: 0` (Yes) on every trial because every SFX presented was a target. Without lures, hit rate could not be separated from yes-bias. Replaced with standalone `buildSFXRecognition` block: 5 targets + 4 untrained lures (chop, peel, glug, splash), Y/N + 4-point confidence, `is_lure` flag, pre-computed `sdt_outcome`. `SINGLE_TAKE_SFX` Set replaces the hardcoded `slice` branch in `sfxPath`. Block placement: SFX recognition runs *before* foley 4-AFC to avoid contamination.

### Posttest v8.2 — Per-condition arrangement ground truth

Pre-v8.2 used a single `ARRANGEMENT_ITEMS` const assumed "approximately consistent across VR/2D/Text scenes." After auditing the actual scenes, layouts differ noticeably. Replaced with `ARRANGEMENT_GROUND_TRUTH_BY_CONDITION { Text, '2D', VR }` plus a `getArrangementItems()` resolver. Default fallback is the 2D layout when condition is `'unknown'`.

### Pretest v8.1 / Posttest v8.1

- **Phoneme discrim 2-play cap (pretest).** Previous unlimited replays let participants ceiling on the perceptual covariate. Per-trial `playA_count` / `playB_count` logged.
- **Receptive vocab distractor rewrite (pretest).** Distractors share the target's semantic frame so participants can't succeed via category-elimination.
- **Production image race fix (posttest).** Idempotent `_imgCache` Map ports the v8.0.1 pretest fix. Eliminates "Image missing" placeholder rendering on first trial of each block.
- **SFX playback hard cap (posttest).** `MAX_SFX_PLAYBACK_MS = 4000` guards against UI freeze on overly long audio files.

### v8.0 — full redesign over v7.x

- Primary DV redefined from vocabulary recall to production intelligibility on iconic phonemes.
- Two-pass elicitation (phrase + isolated) replaces single-pass naming.
- **Split-half counterbalance dropped.** Every participant completes pre and post on all 8 targets and 4 controls. Pretest production with no feedback is minimal contamination, and the parallel-control lane gives a cleaner within-subject estimate of testing effects than splitting target coverage.
- Parallel controls (chop, peel, spoon, plate) added for difference-in-differences identification of training effects.
- Marginal-iconic case (`stir`) added for form-selection secondary analysis.
- Multi-probe binding task replaces 4AFC scene description.
- Receptive 4AFC, speeded match, lexical decision, reverse digit span, ideophone Likert, 19-item recognition test all cut to fit a 15-minute pretest budget.

---

## Open items

- **Sequencing / arrangement performance watch.** Pid 23 scored Kendall tau = 0 on sequencing and 0/5 exact-match on arrangement. If the next 2–3 participants score similarly, the procedural-memory measures may be too difficult, or the arrangement ground truth may need scene-by-scene re-verification.
- **Phoneme discrim ceiling watch.** Pid 1 was 12/12 even before the v8.1 play-cap landed. With the cap, watch whether the pattern persists. If cohort-wide ceiling holds, consider tightening to 1 play/sound (one-line `MAX_PLAYS` change).
- **Lure SFX recording quality.** v8.3 requires `sfx_chop_1.mp3`, `sfx_peel_1.mp3`, `sfx_glug_1.mp3`, `sfx_splash_1.mp3` from the same recording session as the targets, with matching loudness normalization.
- **Probe 1 ground truth verification.** With Probes 2 and 3 dropped, Probe 1 (event association for sizzle, crack, bowl) is the only remaining binding probe. Worth verifying that the "correct" event for each word is unambiguously the most-strongly-paired event in each of the three training scenes.

---

## License & citation

Internal research instrument. Cite as:

> Olexa, R. A. (2026). *Sound Meets Space: Iconicity and L2 vocabulary acquisition in VR — pre/post test battery* (pretest v8.3, posttest v8.7) [Software]. Hakodate KOSEN / Institute of Science Tokyo.