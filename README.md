# Post-Test Battery — VR Iconicity Study (v7.1)

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
- **v7:** Task redesign over v6.1.3.
  1. **4AFC redesign** — split into two category-pure blocks: an Ingredients block (butter, flour with milk/sugar distractors) and an Actions block (sizzling, mixing, stirring, pouring — self-distracting within category). Prevents the previous "category giveaway" where a verb target shown alongside noun distractors made the answer trivial.
  2. **Picture Naming redesigned** as a 3-stage progressive task:
     - **Stage 1 — Ingredient naming:** "What is this?" (4 s recording per item)
     - **Stage 2 — Action naming:** "What is happening?" (4 s recording per item)
     - **Stage 3 — Scene description:** 8 s free description over a Group B cooking scene
     The post-test deliberately does **not** play a model pronunciation or ask for a repeat — that would contaminate the measurement of what participants learned.
  3. **New assets required:** `scene_cooking_B.jpg`, `scene_plating_B.jpg` for Stage 3.
- **v7.1:** Fixes over v7.
  1. **Naming text fallback now reachable.** v7's outer `conditional_function: () => microphoneAvailable` on the naming block prevented the per-item text fallbacks inside `buildNamingTrials` from ever firing — without a mic, the entire block was skipped. The outer gate is removed; per-item audio/text branches now fire correctly based on mic availability.
  2. **Stage 3 scene description text fallback added.** Previously audio-only; now provides a typed-description survey when no mic is available.
  3. **Practice trials gated on mic.** Audio-only practice is skipped (rather than hanging) when no mic is available.
  4. **`SKIP_NAMING_IF_NO_MIC` default flipped to `false`.** New default is "collect text data when there's no mic." Set the flag back to `true` to restore the legacy "skip whole block with notification" behavior.
  5. **Scene images preloaded.** `scene_cooking_B.jpg` and `scene_plating_B.jpg` added to the preloader's image list so failures surface up front.
  6. **Stale top-of-file comment cleaned up.** The v7 header no longer claims Stages 1–2 do "name → hear model → repeat"; it now matches the actual implementation.

## Tasks

### 1. Microphone Setup Gate (1 min)
Interactive mic permission with audio level meter. Required for full audio capture in naming, retell, and teach tasks. With `SKIP_NAMING_IF_NO_MIC = false` (the v7.1 default), all three of those tasks fall through to typed text fallbacks when no mic is available — no data is lost. With the flag set to `true`, the naming block is skipped entirely (with a notification) when no mic is available; retell and teach still fall through to text.

Button detection uses the `.jspsych-html-button-response-button button` selector (v6.1.3 Chrome fix retained).

### 2. 4AFC Vocabulary Check — Group B (2–3 min) — *redesigned in v7*
Two category-pure blocks, each with its own intro screen.

**Block A — Ingredients (2 trials):**
- Targets: `butter`, `flour`
- Distractor pool: `milk`, `sugar` (other ingredient nouns; never trained as targets)
- Each trial shows the target plus 3 of the remaining ingredient pictures → 4 labeled choices (A/B/C/D).

**Block B — Actions (4 trials):**
- Targets: `sizzling`, `mixing`, `stirring`, `pouring`
- Each trial shows the target plus the 3 other action pictures → 4 labeled choices. Distractors are the other Group B verbs themselves, so the block is self-distracting.

Total: 6 trials, same as v6, but with no cross-category cues.

Trials are tagged with `iconic`, `iconicity_rating`, `word_group: 'B'`, and a new `stimulus_category` field (`ingredient` / `action` / `process`).

Measures: receptive vocabulary learning under category-controlled distractor conditions.

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
- Audio cleaned up between trials
- Answer buttons locked until audio playback completes
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

### 8. Progressive Naming & Description — Group B (4–6 min) — *new in v7*
Replaces the v6 Picture Naming task. Three sequential stages, each with its own intro screen and shared mic-init / practice front-end.

**Front-end (once):**
- Section overview screen listing the three parts
- `jsPsychInitializeMicrophone` step
- Practice trial: `park_scene.jpg` (non-cooking), 4 s recording, with playback enabled and a "Practice Complete" confirmation

**Stage 1 — Ingredient naming**
- Items: `butter`, `flour`
- Prompt: "What is this? / これは何ですか？"
- 4 s recording per item, no model audio, no repeat
- Task tag: `naming_ingredient_spontaneous`, `stage: 'ingredient'`

**Stage 2 — Action naming**
- Items: `sizzling`, `mixing`, `stirring`, `pouring`
- Prompt: "What is happening? / 何をしていますか？"
- 4 s recording per item, no model audio, no repeat
- Task tag: `naming_action_spontaneous`, `stage: 'action'`

**Stage 3 — Scene description**
- 2 cooking scenes shown in fixed order: `scene_cooking_B.jpg` (batter being poured/cooked), `scene_plating_B.jpg` (finished pancake with butter)
- Prompt: "Describe everything you see, hear, and smell."
- 8 s recording per scene (audio); typed description (text fallback)
- Task tag: `naming_scene_description`, `stage: 'scene'`

**Mic dependency (v7.1):** the naming block runs whenever `SKIP_NAMING_IF_NO_MIC` is `false` (default) **or** a mic is available. When no mic is available:
- Practice trials are skipped (audio-only, not meaningful as typing practice).
- Stages 1, 2, and 3 each fall through to per-item typed-text fallbacks.
- If `SKIP_NAMING_IF_NO_MIC` is set to `true`, the entire naming block is skipped instead and a notification is shown.

Each audio trial writes `audio_filename` (e.g. `post_<PID>_butter_ingredient.wav`, `post_<PID>_scene_cooking_groupB.wav`) and is flagged `needs_audio_scoring: true`. Text-fallback trials carry `modality: 'text'` and the typed response in the trial's `response` field.

Measures: productive vocabulary at item level (Stages 1–2) and connected description / vocabulary deployment at scene level (Stage 3).

### 9. Transfer Recognition Test (immediate only, 3–4 min)
- All 12 trained words + 7 foils presented one at a time
- "Did this word appear in the training?" → YES/NO + confidence (1–4)
- Foils: glug, splash, drizzle, knife, salt (iconic) + fork, cup (arbitrary) — **5 iconic + 2 arbitrary** (per v6.1.3 reclassification)
- Tagged: `trained`, `type`, `iconic`, `word_group`
- Measures: recognition memory, d-prime (hits vs. false alarms), iconicity advantage in recognition

### 10. Blind Retell (45 seconds)
- Preparation step with instructions before recording begins
- No pictures — explain pancake-making from memory
- Audio recording (45 s) or text fallback
- Measures: narrative production, vocabulary use in context

### 11. Teach a Friend (60 seconds)
- Preparation step with instructions before recording begins
- No pictures — teach a beginner how to make a pancake
- Should include: tools, ingredients, key actions, safety tips, success checks
- Audio recording (60 s) or text fallback
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
- Microphone (recommended; v7.1 provides typed-text fallbacks for all naming, retell, and teach tasks when no mic is available)
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
| milk (distractor / 4AFC ingredient foil) | `milk_01.png`, `milk_02.png` |
| sugar (distractor / 4AFC ingredient foil) | `sugar_01.png`, `sugar_02.png` |
| practice | `park_scene.jpg` |
| **scene — cooking (Group B)** *(new in v7)* | `scene_cooking_B.jpg` |
| **scene — plating (Group B)** *(new in v7)* | `scene_plating_B.jpg` |

The two scene images are single-file (no variants) and are used only by Stage 3 of the naming task. As of v7.1 they are included in the preloader's image list, so a missing scene file will surface during the loading screen rather than at run time.

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

> **Note:** Mix audio files are `.wav` while all others are `.mp3`. Both formats are supported by modern browsers. Consider converting to `.mp3` for consistency in future versions.

Missing assets display SVG placeholders (images) or silent audio rather than crashing.

## Data Output
Auto-downloads JSON: `posttest_[PID]_[condition].json`. Optionally POSTed to a server via `?post=[URL]` query parameter (consistent with pretest).

### Key data fields per trial

| Field | Description |
|---|---|
| `task` | Task identifier (e.g., `4afc`, `naming_ingredient_spontaneous`, `naming_action_spontaneous`, `naming_scene_description`, `transfer_test`, `foley_groupA`) |
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
| `stimulus_category` *(new in v7)* | 4AFC trial category (`ingredient`, `action`, `process`, etc.) |
| `stage` *(new in v7)* | Naming stage (`ingredient`, `action`, `scene`) |
| `scene` *(new in v7)* | Scene identifier on Stage 3 (`cooking_groupB`, `plating_groupB`) |
| `audio_filename` | For naming and scene trials, suggested filename for the recorded clip |

## Analysis Notes

### Primary comparison
- Within post-test: Group B iconic (n=3) vs. Group B arbitrary (n=3) on 4AFC, Stages 1–2 of naming, speeded match
- Pre/post: compare Group A pre-test scores with Group B post-test scores (matched on iconicity)
- Between conditions: compare Group B post-test scores across VR vs. 2D vs. Text conditions

### 4AFC analysis (v7-specific)
- The two blocks intentionally trade off some statistical convenience for measurement validity: in v6, mixed-category 4AFC trials gave away the answer by category, so v7 keeps distractors within-category. The unavoidable consequence is that ingredient targets are all arbitrary and 3 of the 4 action targets are iconic — i.e., category and iconicity are partially confounded **within blocks**. This is a property of the lexicon being sampled (food/object nouns tend toward arbitrary; sound/motion verbs tend toward iconic), not a flaw in the design.
- The 3-iconic-vs-3-arbitrary balance is preserved at the **task level**, so iconic-vs-arbitrary contrasts should be analyzed across the full 6-item set rather than within a single block. Item-level mixed-effects models with `stimulus_category` as a covariate (or stratification factor) are the natural approach.
- Note also that raw accuracy across blocks is not directly comparable: the Ingredients block has 2 targets drawn from a 4-item ingredient pool, while the Actions block has 4 targets drawn from a 4-item action pool, so chance level and competitor strength differ.

### Naming analysis (v7-specific)
- Stages 1 and 2 yield item-level production data analogous to v6 picture naming, scoreable for target word use, pronunciation, and latency.
- Stage 3 yields connected speech that can be coded for trained vocabulary use, sequence accuracy, and iconicity-related lexical choices. Note that scene order is fixed (cooking before plating), so any order effects across the two scenes are confounded with content.

### Cross-group foley comparison
- Group B foley performance vs. Group A foley performance in post-test
- Tests whether iconic sounds from both groups are recognized equally after training
- Since Group A sounds were also present during training but Group A *vocabulary* was baseline-tested in the pre-test, foley recognition provides a complementary measure

### Transfer test scoring
- Compute d-prime: hit rate (trained words correctly recognized) vs. false alarm rate (foils incorrectly endorsed)
- Compare d-prime for iconic vs. arbitrary trained words
- Confidence ratings allow signal detection analysis
- Foil set is 5 iconic + 2 arbitrary (knife and salt reclassified in v6.1.3) — provides more statistical power for testing whether untrained iconic words show a general recognition advantage independent of training.

### Critical config flags
```javascript
NAMING_VERBS_ONLY  = false  // MUST be false — otherwise loses butter/flour (arbitrary)
FOURAFC_VERBS_ONLY = false  // MUST be false — otherwise loses butter/flour (arbitrary)
SKIP_NAMING_IF_NO_MIC = false // v7.1 default — fall through to text fallbacks
                              // when no mic. Set to true to skip the whole
                              // naming block with a notification instead.
```
Changing the first two to `true` would remove the arbitrary noun targets, destroying the iconic/arbitrary balance. The third controls behavior of the naming block when no microphone is available.

## Task Availability by Condition

| Task | Immediate | Delayed |
|---|---|---|
| 4AFC Vocabulary (Ingredients + Actions) | ✅ | ✅ |
| Speeded Match | ✅ | ❌ |
| Procedural Recall | ✅ | ✅ |
| Sequencing | ✅ | ❌ |
| Foley — Group B | ✅ (5 trials) | ✅ (3 trials) |
| Foley — Group A | ✅ (3 trials) | ❌ |
| Progressive Naming & Description (3 stages) | ✅ | ✅ |
| Transfer Recognition | ✅ | ❌ |
| Blind Retell | ✅ | ✅ |
| Teach a Friend | ✅ | ✅ |
| Likert Feedback | ✅ | ✅ |
| Exit Comments | ✅ | ✅ |