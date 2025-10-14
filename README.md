#VR Post-Test Overview

Structure
Single-page web app (vr-posttest/) built on jsPsych 7.
No SurveyJS dependency; only built-in jsPsych plugins (HTML response, survey-text/likert, microphone, etc.).
Assets (img/, sounds/) preload at start to avoid mid-task hiccups.
Automatic JSON download (posttest_<PID>_<condition>.json) when participants finish.
Immediate Post-Test (~12–15 minutes)
4AFC Receptive Vocabulary

12–16 trials (all trained words + foils).
Alternate images per word chosen at runtime (different angles/tokens).
Records accuracy + RT (ready for trimming in analysis).
Speeded Word→Picture Match

Trained words only.
records accuracy and RT
Procedural Recall (Open Text)

Five slots (“Step 1 … Step 5”), bilingual instructions.
Sequencing (Order-of-Operations)

Click-to-order interface (dragless).
Automatically computes Kendall’s τ and % steps in correct position.
(skipped in delayed session)
Foley→Meaning Mapping

8–12 trials (texture/action/process, depending on block).
Uses preloaded audio tokens; currently calling default tokens but ready for A/B variants.
Mic-Gated Picture Naming

Microphone check → manual “Start recording” → 4-second auto capture; 800 ms gap between items.
Bilingual prompt.

One audio file per item (ideal for intelligibility scoring).
Flags needs_audio_scoring = true in data for downstream rubric scoring (0/1/2 scale, manual or ASR-assisted).
Transfer Recognition + Confidence

Trained vs. foil words, simple yes/no with follow-up confidence slider.
Language Training Feedback (Likert)

Bilingual prompts with clarified anchors (1 = Not at all / 5 = Very much).
Final Comments

Bilingual request for detailed experience/concerns/suggestions.
Delayed Retention Session (D+7, ~8–10 minutes)

Participant clicks “Start Delayed.”
Same timeline but shortened counts:
4AFC: ~6–8 items.
Foley: ~6 trials.
Naming: ~6 images.

Sequencing and transfer recognition are skipped.
Data export uses posttest_<PID>_delayed.json.

Data & Scoring Hints
Every trial logs: PID, condition (immediate/delayed), RT (when applicable), and stimulus metadata.
Naming trials each store one clip; rubric column left blank for later scoring (0/1/2).
Sequencing block logs Kendall’s τ automatically.}

For RT analysis: filter invalid trials, trim (e.g., 2.5 SD) and compute medians within condition.
Compare immediate vs. delayed with mixed models / ANCOVA as outlined in the study plan, using pre-test covariates.
Counterbalancing Hooks (Optional)

Current build samples a random variant per image/audio each run.
Ready for A/B scheduling by seeding choiceMap and AUDIO_VARIANTS with version-specific lists and tagging set_version / token_version per participant (commented scaffolding already in code if you want to re-enable it).
