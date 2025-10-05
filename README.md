# vr-posttest
posttest for iconicity in VR experiment

A. Primary learning outcomes (immediate post; ~12–15 min)

Receptive form-meaning (4AFC)

New image set for each target word (alternate tokens/angles to avoid picture practice).

Record accuracy + RT (trim outliers).

Items: all trained words + a few foils.

Productive naming (mic-gated)

New images or line drawings of the same items; keep the same mic-gating you use now.

Score with simple rubric (0=incorrect/other L1, 1=recognizable but mispronounced, 2=correct & comprehensible). Optionally add ASR for speed/latency.

Contexted comprehension (iconicity-aligned)

Foley→meaning with novel audio tokens (new sizzle/pour recordings): pick the correct action/object.

Word→picture speeded match (trained words only), RT+accuracy.

Procedural transfer

Order-of-operations drag-and-drop (e.g., crack→mix→pour→flip→serve). Score with Kendall’s τ or simple % in correct order.

B. Near-/far-transfer (optional, +5–8 min)

Visual iconicity generalization: repeat shape–word pairing with new nonce pairs (e.g., maluma/takete variants) and one or two new utensil silhouettes to see if the iconicity benefit extends beyond trained items.

Selective phoneme discrimination: only if your VR condition targeted those contrasts; otherwise keep phoneme discrimination as a pre-only covariate.

C. Delayed retention (D+7 days; ~8–10 min)

Shortened battery: 4AFC receptive + mic-gated naming + one foley→meaning block (novel tokens again). This captures durability without over-testing.

D. Scoring & analysis plan

Primary metrics: % correct and median RT (trimmed) on 4AFC/word–picture; rubric scores for naming; % correct on foley and sequence.

Stats: Trial-level mixed-effects (condition × time) for accuracy/RT; ANCOVA on post with pre as covariate for any repeated constructs; report Hedges’ g for gains.

Forms & counterbalancing: Prepare A/B image sets (and A/B foley tokens) and counterbalance across participants to neutralize item effects.

Do not repeat MSSQ, digit/spatial span at post; they’re covariates, not outcomes.

E. Concrete item blueprint (suggested counts)

4AFC receptive: 12–16 items (all trained words + 4 foils), alt images.

Mic-gated naming: 8–12 items (trained set).

Foley mapping (novel tokens): 8–12 trials, balanced by mapping_type (size-pitch/texture/action/process).

Sequence ordering: 1–2 trials of 5 steps.

Delayed: half-length versions (e.g., 6–8 4AFC, 6–8 naming, 6–8 foley).

F. Implementation notes (jsPsych-friendly)

Reuse your current structure: preload alt images/audio, reuse mic-gate, keep early-stop logic out of outcomes (only for spans).

Log set_version (A vs B), token_version (foley alt), and RTs; save JSON per trial like you already do.

If you want, I can draft a posttest.js timeline that plugs into your current stack (parallel assets, A/B lists, scoring helpers, and a 1-week follow-up route).