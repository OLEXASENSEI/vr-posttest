# Post-Test Battery — VR Iconicity Study

## Purpose

This post-test measures **learning gains** after the VR cooking training, focusing on whether **iconic words** (sound-symbolic) are acquired more readily than **arbitrary words**. It uses Group B words exclusively for the core vocabulary assessments to enable uncontaminated pre/post comparison via the split-half design.

## Design

**Balanced 6×6 split-half — Group B assessed here:**

| | Iconic (≥ 4.5) | Arbitrary (< 4.5) |
|---|---|---|
| **Group A (pre-test only)** | flip (5.70), crack (5.40), whisk (4.55) | bowl (3.00), spatula (3.91), pan (3.45) |
| **Group B (post-test)** | sizzle (5.30), mix (5.10), stirring (4.82) | pour (3.60), butter (3.50), flour (3.00) |

All 6 Group B words are tested in every applicable task. The `FOURAFC_VERBS_ONLY` and `NAMING_VERBS_ONLY` flags are set to **`false`** to maintain the 3 iconic + 3 arbitrary balance — changing these would break the experimental design.

### Conditions
- **Immediate:** Full battery administered right after training
- **Delayed:** Reduced battery (fewer foley trials, no speeded match or sequencing)

## Duration

~25–30 minutes (immediate) / ~20 minutes (delayed)

## Entry Point

Called via: `window.__START_POSTTEST(participantID, isDelayed)`

## Tasks

### 1. Microphone Setup Gate (1 min)
Interactive mic permission with audio level meter. Required for naming and retell tasks; text fallback available.

### 2. 4AFC Vocabulary Check — Group B (2–3 min)
- Hear/see a Group B word → select matching picture from 4 choices
- All 6 targets tested: sizzling, mixing, stirring, pouring, butter, flour
- Distractor images from same category + pancake/egg fillers
- Tagged with `iconic`, `iconicity_rating`, `word_group: 'B'`
- **Measures:** receptive vocabulary learning (iconic vs. arbitrary comparison)

### 3. Speeded Word-Picture Match (immediate only, 3–4 min)
- See word + image → press **A** (match) or **L** (no match)
- 500 ms fixation cross between trials; 3500 ms response window
- Group B words only; match and mismatch trials
- **Measures:** lexical access speed, form-meaning link strength

### 4. Procedural Recall — Free Response (2–3 min)
- Write 5 pancake-making steps from memory (no pictures shown)
- Format hint available via expandable section
- **Measures:** procedural knowledge retention from training

### 5. Sequencing — Click in Order (immediate only, 2–3 min)
- 5 scrambled steps displayed as buttons → click in correct order
- Submit button enables when all 5 selected
- Scored: correct positions, Kendall's tau correlation
- **Measures:** procedural sequencing accuracy

### 6. Foley Sound Recognition — Group B (2–3 min)
- Play cooking sounds → choose what it represents (2AFC)
- 5 trials (immediate) or 3 trials (delayed): sizzle, mix, stir, pour, spread
- Audio properly cleaned up between trials via closure variable
- **Measures:** sound-meaning mapping for trained sounds

### 7. Picture Naming with Practice — Group B (3–5 min)
- **Practice trial** with non-cooking image (park scene)
- **6 main trials** (Group B): sizzling, mixing, stirring, pouring, butter, flour
- 4-second recording per image; prompt: objects, actions, sounds, smells
- Requires microphone; entire section skipped with notification if unavailable
- **Measures:** productive vocabulary, pronunciation accuracy post-training

### 8. Transfer Recognition Test (immediate only, 3–4 min)
- All 12 trained words + 7 foils presented one at a time
- "Did this word appear in the training?" → YES/NO + confidence (1–4)
- Foils: glug, splash, drizzle (iconic) + fork, cup, knife, salt (arbitrary)
- Tagged: `trained`, `type`, `iconic`, `word_group`
- **Measures:** recognition memory, d-prime (hits vs. false alarms), iconicity advantage in recognition

### 9. Blind Retell (45 seconds)
- No pictures — explain pancake-making from memory
- Audio recording (45s) or text fallback
- **Measures:** narrative production, vocabulary use in context

### 10. Teach a Friend (60 seconds)
- No pictures — teach a beginner how to make a pancake
- Should include: tools, ingredients, key actions, safety tips, success checks
- Audio recording (60s) or text fallback
- **Measures:** depth of procedural knowledge, vocabulary deployment

### 11. Likert Feedback (1 min)
Three 5-point scales:
- Vocabulary confidence increase
- Procedure confidence
- Training helpfulness

### 12. Exit Comments
Open-ended free response for participant feedback.

## Technical Requirements

- Modern browser (Chrome, Firefox, Edge)
- Headphones or speakers
- Microphone (required for naming/retell; text fallback available)
- jsPsych 7.x with plugins:
  - `jsPsychHtmlButtonResponse`, `jsPsychHtmlKeyboardResponse`
  - `jsPsychSurveyText`, `jsPsychSurveyLikert`
  - `jsPsychPreload`
  - `jsPsychInitializeMicrophone`, `jsPsychHtmlAudioResponse`

## Asset Requirements

### Images (`/img/`)
Each Group B word has 2 variants (randomly selected per trial):
- `sizzling_01.png`, `sizzling_02.png`
- `mixing_01.png`, `mixing_02.png`
- `stirring_01.png`, `stirring_02.png`
- `pouring_01.png`, `pouring_02.png`
- `butter_01.png`, `butter_02.png`
- `flour_01.png`, `flour_02.png`
- `pancake_01.png`, `pancake_02.png` (distractor)
- `egg_01.png`, `egg_02.png` (distractor)
- `park_scene.jpg` (practice)

### Audio (`/sounds/`)
Each has 2 variants:
- `sizzle_1.mp3`, `sizzle_2.mp3`
- `mix_1.mp3`, `mix_2.mp3`
- `stir_1.mp3`, `stir_2.mp3`
- `pour_1.mp3`, `pour_2.mp3`
- `spread_1.mp3`, `spread_2.mp3`

Missing assets display SVG placeholders (images) or silent audio rather than crashing.

## Data Output

Auto-downloads JSON: `posttest_[PID]_[condition].json`

### Key data fields per trial
| Field | Description |
|---|---|
| `task` | Task identifier (e.g., `4afc`, `naming_audio`, `transfer_test`) |
| `iconic` | `true`/`false`/`null` — target word's iconicity |
| `iconicity_rating` | Winter et al. rating (1–7) |
| `word_group` | `A`, `B`, `foil` |
| `phase` | Always `post` |
| `condition` | `immediate` or `delayed` |
| `correct` / `is_correct` | Boolean accuracy |
| `rt` | Response time (ms) |
| `needs_audio_scoring` | `true` for trials requiring manual transcription scoring |
| `modality` | `audio` or `text` (for mic/fallback tasks) |

## Analysis Notes

### Primary comparison
- **Within post-test:** Group B iconic (n=3) vs. Group B arbitrary (n=3) on 4AFC, naming, speeded match
- **Pre/post:** Compare Group A pre-test scores with Group B post-test scores (matched on iconicity)

### Transfer test scoring
- Compute d-prime: hit rate (trained words correctly recognized) vs. false alarm rate (foils incorrectly endorsed)
- Compare d-prime for iconic vs. arbitrary trained words
- Confidence ratings allow signal detection analysis

### Critical config flags
```javascript
NAMING_VERBS_ONLY  = false  // MUST be false — otherwise loses butter/flour (arbitrary)
FOURAFC_VERBS_ONLY = false  // MUST be false — otherwise loses butter/flour (arbitrary)
```
Changing these to `true` would remove the arbitrary noun targets, destroying the iconic/arbitrary balance.
