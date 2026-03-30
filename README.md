# Post-Test Battery — VR Iconicity Study (v6.1.3)

## Purpose

This post-test measures learning gains after the training conditions (VR / 2D / Text), focusing on whether iconic words (sound-symbolic) are acquired more readily than arbitrary words. It uses Group B words exclusively for the core vocabulary assessments to enable uncontaminated pre/post comparison via the split-half design.

## Design

Balanced 6×6 split-half — Group B assessed here:

| | Iconic (≥ 4.5) | Arbitrary (< 4.5) |
|---|---|---|
| **Group A (pre-test only)** | flip (5.70), crack (5.40), whisk (4.55) | bowl (3.00), spatula (3.91), pan (3.45) |
| **Group B (post-test)** | sizzle (5.30), mix (5.10), stirring (4.82) | pour (3.60), butter (3.50), flour (3.00) |
| **Foils (never trained)** | glug (6.20), splash (6.09), drizzle (6.00), knife (5.29), salt (4.62) | fork (3.90), cup (3.83) |

All 6 Group B words are tested in every applicable task. The `FOURAFC_VERBS_ONLY` and `NAMING_VERBS_ONLY` flags are set to `false` to maintain the 3 iconic + 3 arbitrary balance — changing these would break the experimental design.

All iconicity ratings verified against Winter et al. database (14,777 words).

**Note on "stir":** The base form "stir" has a rating of 4.30 (below threshold), but the -ing form "stirring" has 4.82 (above threshold). The study uses 4.82 throughout. This discrepancy should be documented in the methods section.

## Conditions

- **Immediate:** Full battery administered right after training (~30 min)
- **Delayed:** Reduced battery — fewer foley trials, no speeded match, no sequencing, no Group A foley, no transfer test (~20 min)

## Duration

~30 minutes (immediate) / ~20 minutes (delayed)

## Entry Point

```javascript
window.__START_POSTTEST(participantID, isDelayed)
```

## Version History

- **v1–v2:** Initial implementations with various fixes
- **v3:** 4AFC word labels, sequencing undo/reset, revised Likert items, mic initialization before audio tasks
- **v4:** Fixed stirring images (now uses own files), restored mix/stir audio, restored 5 foley trials, added Group A foley comparison, added milk/sugar distractors, closure-captured sequencing data, consistent save with POST support
- **v5:** Blind retell preparation step, conditional VR reuse Likert wording, mic gate button-filtering fix, foley on_load null guards
- **v6:** 4AFC delayed parameter fix, 4AFC choice card layout fix (images in stimulus HTML, A/B/C/D label buttons), foley button locking for jsPsych 7.3, micInit moved inside conditional block, buildTeachSomeone prepare step added
- **v6.1:** Removed cache-busting query strings from assetUrl (broke local servers), removed async HEAD-fetch image validation, removed random query string from PRACTICE_IMG
- **v6.1.2:** Minor cleanup
- **v6.1.3:** Fixed knife classification (iconic=true, rating=5.29, foil_iconic) and salt classification (iconic=true, rating=4.62, foil_iconic) per Winter et al. database. Applied Chrome mic gate button detection fix (`.jspsych-html-button-response-button button` selector).

## Tasks

### 1. Microphone Setup Gate (1 min)
Interactive mic permission with audio level meter. Required for naming and retell tasks; text fallback available.

**v6.1.3 fix:** Button detection now uses `.jspsych-html-button-response-button button` selector instead of scanning all `.jspsych-btn` elements. Fixes Chrome compatibility issue where extensions or progress bar elements caused the Continue button to remain permanently greyed out.

### 2. 4AFC Vocabulary Check — Group B (2–3 min)
- See a Group B word → select matching picture from 4 labeled choices (A/B/C/D)
- All 6 targets tested: sizzling, mixing, stirring, pouring, butter, flour
- Distractor images from same category + pancake, egg, milk, sugar fillers
- Images displayed in stimulus HTML; participants click A/B/C/D buttons (v6 layout fix)
- Tagged with `iconic`, `iconicity_rating`, `word_group: 'B'`
- Measures: receptive vocabulary learning (iconic vs. arbitrary comparison)

### 3. Speeded Word-Picture Match (immediate only, 3–4 min)
- See word + image → press A (match) or L (no match)
- 500 ms fixation cross between trials; 3500 ms response window
- Group B words only; match and mismatch trials
- Measures: lexical access speed, form-meaning link strength

### 4. Procedural Recall — Free Response (2–3 min)
- Write 5 pancake-making steps from memory (no pictures shown)
- Japanese instruction: "1行に1つのステップを、順番に書いてください"
- Measures: procedural knowledge retention from training

### 5. Sequencing — Click in Order (immediate only, 2–3 min)
- 5 scrambled steps displayed as buttons → click in correct order
- **Undo and Reset buttons** for correcting mistakes
- Submit button enables when all 5 selected
- Scored: correct positions, Kendall's tau correlation
- Measures: procedural sequencing accuracy

### 6. Foley Sound Recognition — Group B (2–3 min)
Play cooking sounds → choose what it represents (2AFC).
- **5 trials** (immediate) or **3 trials** (delayed):
  1. `sizzle` — pancake sizzling vs. stirring dry flour
  2. `mix` — mixing batter vs. pouring liquid
  3. `stir` — stirring a bowl vs. cracking an egg
  4. `pour` — pouring batter vs. flipping a pancake
  5. `spread` — spreading butter vs. pouring milk
- Option display order randomized per trial
- Audio properly cleaned up between trials
- Answer buttons locked until audio playback completes (v6 fix)
- Tagged with `iconic`, `iconicity_rating` per sound
- Measures: sound-meaning mapping for trained sounds

### 7. Group A Foley Comparison (immediate only, 1–2 min)
Tests recognition of Group A cooking sounds for cross-group comparison.
- **3 trials** using Group A audio variants:
  1. `crack` — cracking an egg vs. stirring a pot
  2. `flip` — flipping a pancake vs. pouring batter
  3. `whisk` — whisking eggs vs. sizzling oil
- Same format as Group B foley
- Tagged with `task: 'foley_groupA'`, `word_group: 'A'`
- Measures: whether iconic Group A sounds are recognized comparably to Group B after training

### 8. Picture Naming with Practice — Group B (3–5 min)
- Practice trial with non-cooking image (park scene)
- 6 main trials (Group B): sizzling, mixing, stirring, pouring, butter, flour
- 4-second recording per image; prompt: objects, actions, sounds, smells
- Preparation step before each recording (v6)
- Requires microphone; entire section skipped with notification if unavailable
- Measures: productive vocabulary, pronunciation accuracy post-training

### 9. Transfer Recognition Test (immediate only, 3–4 min)
- All 12 trained words + 7 foils presented one at a time
- "Did this word appear in the training?" → YES/NO + confidence (1–4)
- Foils: glug, splash, drizzle, knife, salt (iconic) + fork, cup (arbitrary)
- Tagged: `trained`, `type`, `iconic`, `word_group`
- Measures: recognition memory, d-prime (hits vs. false alarms), iconicity advantage in recognition

**v6.1.3 change:** Knife and salt are now correctly classified as iconic foils (ratings 5.29 and 4.62 respectively). This changes the foil balance from 3 iconic + 4 arbitrary to **5 iconic + 2 arbitrary**. This is analytically useful — more iconic foils provide a stronger test of whether iconicity alone (without training) produces a recognition advantage.

### 10. Blind Retell (45 seconds)
- Preparation step with instructions before recording begins (v5+)
- No pictures — explain pancake-making from memory
- Audio recording (45s) or text fallback
- Measures: narrative production, vocabulary use in context

### 11. Teach a Friend (60 seconds)
- Preparation step with instructions before recording begins (v6)
- No pictures — teach a beginner how to make a pancake
- Should include: tools, ingredients, key actions, safety tips, success checks
- Audio recording (60s) or text fallback
- Measures: depth of procedural knowledge, vocabulary deployment

### 12. Likert Feedback (1–2 min)
Seven 5-point scales (1 = strongly disagree, 5 = strongly agree):

| Item | Variable Name | Construct |
|---|---|---|
| Recall of cooking action words | `recall_actions` | Vocabulary confidence (verbs) |
| Recall of ingredient/tool words | `recall_objects` | Vocabulary confidence (nouns) |
| Training sounds helped learning | `sound_helpfulness` | Sound-aided learning |
| Words "sounded like" their meaning | `iconicity_awareness` | Iconicity metacognition |
| Training felt like real cooking | `immersion` | Presence / immersion |
| Could explain procedure in English | `procedural_confidence` | Procedural confidence |
| Would use VR for English again | `willingness_vr` | Technology acceptance |

### 13. Exit Comments
Open-ended free response:
- Which words were easiest/hardest to remember and why
- General comments about training or test

## Technical Requirements

- Modern browser (Chrome, Brave, Firefox, Safari)
- Headphones or speakers
- Microphone (required for naming/retell; text fallback available)
- HTTPS required for microphone access
- jsPsych 7.x with plugins:
  - `jsPsychHtmlButtonResponse`
  - `jsPsychHtmlKeyboardResponse`
  - `jsPsychSurveyText`
  - `jsPsychSurveyLikert`
  - `jsPsychPreload`
  - `jsPsychInitializeMicrophone`
  - `jsPsychHtmlAudioResponse`

## Asset Requirements

### Images (`/img/`)

Each Group B word has 2 variants (randomly selected per trial):

| Word | Files |
|---|---|
| sizzling | `sizzling_01.png`, `sizzling_02.png` |
| mixing | `mixing_01.png`, `mixing_02.png` |
| stirring | `stirring_01.png`, `stirring_02.png` |
| pouring | `pouring_01.png`, `pouring_02.png` |
| butter | `butter_01.png`, `butter_02.png` |
| flour | `flour_01.png`, `flour_02.png` |
| pancake (distractor) | `pancake_01.png`, `pancake_02.png` |
| egg (distractor) | `egg_01.png`, `egg_02.png` |
| milk (distractor) | `milk_01.png`, `milk_02.png` |
| sugar (distractor) | `sugar_01.png`, `sugar_02.png` |
| practice | `park_scene.jpg` |

### Audio (`/sounds/`)

Each has 2 variants (randomly selected per trial):

| Sound | Files | Format |
|---|---|---|
| sizzle | `sizzle_1.mp3`, `sizzle_2.mp3` | MP3 |
| mix | `mix_1.wav`, `mix_2.wav` | WAV |
| stir | `stir_1.mp3`, `stir_2.mp3` | MP3 |
| pour | `pour_1.mp3`, `pour_2.mp3` | MP3 |
| spread | `spread_1.mp3`, `spread_2.mp3` | MP3 |
| crack (Group A) | `crack_1.mp3`, `crack_2.mp3` | MP3 |
| flip (Group A) | `flip_1.mp3`, `flip_2.mp3` | MP3 |
| whisk (Group A) | `whisk_1.mp3`, `whisk_2.mp3` | MP3 |

> **Note:** Mix audio files are `.wav` format while all others are `.mp3`. Both formats are supported by modern browsers. Consider converting to `.mp3` for consistency in future versions.

Missing assets display SVG placeholders (images) or silent audio rather than crashing.

## Data Output

Auto-downloads JSON: `posttest_[PID]_[condition].json`

Optionally POST to server via `?post=[URL]` query parameter (consistent with pretest).

### Key data fields per trial

| Field | Description |
|---|---|
| `task` | Task identifier (e.g., `4afc`, `naming_audio`, `transfer_test`, `foley_groupA`) |
| `iconic` | `true`/`false`/`null` — target word's iconicity |
| `iconicity_rating` | Winter et al. rating (1–7) |
| `word_group` | `A`, `B`, `foil` |
| `phase` | Always `post` |
| `condition` | `immediate` or `delayed` |
| `correct` / `is_correct` | Boolean accuracy |
| `rt` | Response time (ms) |
| `needs_audio_scoring` | `true` for trials requiring manual transcription scoring |
| `modality` | `audio` or `text` (for mic/fallback tasks) |
| `type` | Transfer test word type (e.g., `target_iconic`, `foil_arbitrary`, `foil_iconic`) |
| `trained` | `true`/`false` — whether word appeared in training (transfer test) |
| `confidence` | 1–4 confidence rating (transfer test) |

## Analysis Notes

### Primary comparison
- Within post-test: Group B iconic (n=3) vs. Group B arbitrary (n=3) on 4AFC, naming, speeded match
- Pre/post: Compare Group A pre-test scores with Group B post-test scores (matched on iconicity)
- Between conditions: Compare Group B post-test scores across VR vs. 2D vs. Text conditions

### Cross-group foley comparison
- Group B foley performance vs. Group A foley performance in post-test
- Tests whether iconic sounds from both groups are recognized equally after training
- Since Group A sounds were also present during training but Group A *vocabulary* was baseline-tested in the pre-test, foley recognition provides a complementary measure

### Transfer test scoring
- Compute d-prime: hit rate (trained words correctly recognized) vs. false alarm rate (foils incorrectly endorsed)
- Compare d-prime for iconic vs. arbitrary trained words
- Confidence ratings allow signal detection analysis
- **v6.1.3 note:** Foil set is now 5 iconic + 2 arbitrary (knife and salt reclassified). This provides more statistical power for testing whether untrained iconic words show a general recognition advantage independent of training.

### Critical config flags

```javascript
NAMING_VERBS_ONLY  = false  // MUST be false — otherwise loses butter/flour (arbitrary)
FOURAFC_VERBS_ONLY = false  // MUST be false — otherwise loses butter/flour (arbitrary)
```

Changing these to `true` would remove the arbitrary noun targets, destroying the iconic/arbitrary balance.

## Task Availability by Condition

| Task | Immediate | Delayed |
|---|---|---|
| 4AFC Vocabulary | ✅ | ✅ |
| Speeded Match | ✅ | ❌ |
| Procedural Recall | ✅ | ✅ |
| Sequencing | ✅ | ❌ |
| Foley — Group B | ✅ (5 trials) | ✅ (3 trials) |
| Foley — Group A | ✅ (3 trials) | ❌ |
| Picture Naming | ✅ | ✅ |
| Transfer Recognition | ✅ | ❌ |
| Blind Retell | ✅ | ✅ |
| Teach a Friend | ✅ | ✅ |
| Likert Feedback | ✅ | ✅ |
| Exit Comments | ✅ | ✅ |
