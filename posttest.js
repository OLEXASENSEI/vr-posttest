// posttest.js — VR Post-Test Battery (v8.8 — patches over v8.7)
//
// ============================================================================
// v8.8 PATCH NOTES (over v8.7)
// ============================================================================
//// ============================================================================
// v8.8 OVERVIEW — OSF-ALIGNED DISSERTATION VERSION
// ============================================================================
//
// PRIMARY DV:
//   Posttest-only receptive vocabulary recognition accuracy
//   via picture-to-word 4AFC.
//
// WHY POSTTEST ONLY:
//   A receptive pretest using trained target words would partially teach
//   the word-image mappings before training. Therefore, trained-word
//   receptive recognition is measured only at posttest.
//
// PRIMARY 4AFC TASK:
//   12 picture-to-word trials:
//     - 8 trained targets: crack, flip, slice, stir, bowl, pan, flour, butter
//     - 4 untrained controls: chop, peel, spoon, plate
//
// EACH 4AFC TRIAL LOGS:
//   correct_answer
//   response_text
//   foil_type_selected:
//     - correct
//     - iconic_pseudo
//     - trained_foil
//     - conventional_syn
//
// SECONDARY DV:
//   Spoken production intelligibility, pre/post, pending ASR and/or
//   blind human scoring.
//
// DIAGNOSTIC / SECONDARY TASKS:
//   - SFX recognition with lures, scored by d-prime
//   - 3×3 spatial reconstruction
//   - Event-association binding
//   - Foley recognition
//   - Sequencing
//   - Teach-a-friend
//
// NO SPLIT-HALF:
//   Participants complete the same posttest recognition structure.
//   Production blocks still collect target/control audio, but production
//   is secondary/pending.
//
// TASK ORDER:
//   1. Asset check
//   2. Welcome
//   3. Participant confirm
//   4. Mic gate
//   5. Mic init
//   6. Production practice
//   7. Production controls
//   8. Production targets
//   9. Receptive 4AFC picture-to-word recognition
//   10. Binding / event association
//   11. Arrangement 3×3
//   12. SFX recognition
//   13. Foley recognition
//   14. Sequencing
//   15. Teach-a-friend
//   16. Likert
//   17. Exit
//   18. Save
//
// ============================================================================
// 1. Arrangement task lazy ground-truth resolution.
//    Pre-v8.8, buildArrangementTask() called getArrangementItems() at
//    TIMELINE CONSTRUCTION TIME (inside buildTimeline(), which runs
//    immediately when __START_POSTTEST is invoked). At that moment,
//    assignedTrainingCondition is still 'unknown' — the participant has
//    not yet confirmed their condition via the participant_confirm form.
//    getArrangementItems() therefore always fell back to the '2D' default
//    regardless of actual training condition.
//
//    the arrangement trial's
//    ground_truth field in the JSON matched the 2D spec exactly, not VR.
//    The 2D fallback is 0/5 exact-match for a VR participant by definition.
//
//    Fix: convert stimulus from a string literal to a function so it
//    evaluates ITEMS at trial render time (after participant_confirm).
//    Store the resolved items in a closure variable so on_load and
//    on_finish share the same runtime-resolved set.
//
//    Note: if ?cond=VR (or 2D/Text) is passed as a URL param, the pre-v8.8
//    code was also correct — __START_POSTTEST reads q.cond before calling
//    buildTimeline(). URL param mode is unaffected. The bug only manifests
//    when condition is entered via the participant_confirm form only.
//
// ============================================================================
// v8.7 PATCH NOTES (over v8.6)
// ============================================================================
//
// 1. Probe 3 dropped entirely. The v8.4 reframe (spatial adjacency →
//    procedural pairing) made the answer key condition-invariant, but a
//    closer audit revealed answers were derivable from world knowledge plus
//    option elimination. Spatial DV → 3×3 grid. Auditory DV → SFX recognition.
//    Probe 1 (event association) remains. Saves ~1.5 minutes.
//
// ============================================================================
// v8.5 PATCH NOTES (over v8.4)
// ============================================================================
//
// 1. Image variant extension fix. Hardcode _VARIANT_EXT = 'png' regardless
//    of base. Eliminates 24 console 404s on test launch.
//
// ============================================================================
// v8.4 PATCH NOTES (over v8.3)
// ============================================================================
//
// 1. Probe 3 reframed from spatial adjacency to procedural pairing.
//    Subsequently dropped in v8.6.
//
// ============================================================================
// v8.3 PATCH NOTES (over v8.2)
// ============================================================================
//
// 1. Probe 2 redesigned for d-prime. Previous per-word Probe 2 had
//    correct_answer=Yes on every trial; no lures, so hit rate ≠ sensitivity.
//    Replaced with standalone buildSFXRecognition: 5 targets + 4 lures
//    (chop, peel, glug, splash), Y/N + confidence, sdt_outcome pre-stamped.
//    Runs BEFORE foley 4-AFC to avoid SFX re-exposure contamination.
// 2. SINGLE_TAKE_SFX Set replaces hardcoded slice branch in sfxPath.
//
// ============================================================================
// v8.2 PATCH NOTES (over v8.1)
// ============================================================================
//
// 1. Per-condition arrangement-task ground truth. Replaced single layout
//    assumption with ARRANGEMENT_GROUND_TRUTH_BY_CONDITION { Text, 2D, VR }.
//
// ============================================================================
// v8.1 PATCH NOTES (over v8.0)
// ============================================================================
//
// 1. Production image race — idempotent _imgCache Map fix.
// 2. SFX playback hard cap — MAX_SFX_PLAYBACK_MS = 4000.
//
// ============================================================================
// v8.0 OVERVIEW
// ============================================================================
//
// PRIMARY DV: production intelligibility, pre→post, VR/2D/Text conditions.
// SECONDARY DV: form-selection (bare vs gerund) on action verbs.
// TERTIARY DV: multi-probe binding on sizzle (passive iconic).
// NO SPLIT-HALF: every participant does pre AND post on all 8 targets + 4 controls.
//
// TASK ORDER:
//   1. Asset check  2. Welcome  3. Participant confirm  4. Mic gate
//   5. Mic init  6. Production practice  7. Production controls
//   8. Production targets  9. Binding (Probe 1 only, v8.6)
//   10. Arrangement 3×3  11. SFX recognition (d-prime)
//   12. Foley recognition  13. Sequencing  14. Teach-a-friend
//   15. Likert  16. Exit  17. Save
//
// ============================================================================

(function () {
  /* ======================== GLOBAL / HELPERS ======================== */
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let assignedTrainingCondition = 'unknown';
  let microphoneAvailable = false;
  let counterbalanceList = 0;

  const MAX_SFX_PLAYBACK_MS = 4000;
  let MISSING_ASSETS = { audio: [], images: [] };

  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#fff3cd"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#856404">Image missing</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#856404">trial recorded with placeholder</text></svg>')}`;
  const PLACEHOLDER_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];
  const ASSET_BUST = Math.floor(Math.random() * 100000);
  const q = Object.fromEntries(new URLSearchParams(location.search));

  // v8.5: variants always PNG regardless of base extension.
  const _VARIANT_EXT = 'png';

  function asset(p) {
    if (typeof p === 'string' && p.trim().length) {
      const sep = p.includes('?') ? '&' : '?';
      return p + sep + 'v=' + ASSET_BUST;
    }
    return p;
  }
  function imgSrc(path) { return path ? asset(path) : PLACEHOLDER_IMG; }
  const IMG_ONERROR = `onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';"`;
  function audioSrc(path) { return path ? asset(path) : PLACEHOLDER_AUDIO; }

  let PRELOAD_IMAGES = [];

  function imagePath(base) {
    const m = base.match(/^(.+?)\.(jpg|jpeg|png)$/i);
    if (!m) return { path: base, variant: 0 };
    const stem = m[1];
    const v01 = `${stem}_01.${_VARIANT_EXT}`;
    const v02 = `${stem}_02.${_VARIANT_EXT}`;
    if (PRELOAD_IMAGES.includes(v01) && PRELOAD_IMAGES.includes(v02)) {
      const v = (Math.random() < 0.5) ? 1 : 2;
      return { path: (v === 1) ? v01 : v02, variant: v };
    }
    if (PRELOAD_IMAGES.includes(v01)) return { path: v01, variant: 1 };
    return { path: base, variant: 0 };
  }

  function pidToCounterbalance(pid) {
    const s = String(pid || 'unknown');
    let hash = 0;
    for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
    return Math.abs(hash) % 2;
  }

  const shuffle = (arr) => {
    const c = arr.slice();
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  };
  const asObject = (x) => { if (!x) return {}; if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } } return typeof x === 'object' ? x : {}; };

  function kendallTau(target, response) {
    let conc = 0, disc = 0;
    for (let i = 0; i < target.length; i++) {
      for (let j = i + 1; j < target.length; j++) {
        const ra = response.indexOf(target[i]), rb = response.indexOf(target[j]);
        if (ra === -1 || rb === -1) continue;
        if (ra < rb) conc++; else if (ra > rb) disc++;
      }
    }
    const d = conc + disc;
    return d ? (conc - disc) / d : 0;
  }

  /* ======================== STIMULI ======================== */
  const PRODUCTION_TARGETS = [
    { word: 'crack',  display: 'cracking', image: 'img/cracking.jpeg', prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.40 },
    { word: 'flip',   display: 'flipping', image: 'img/flipping.jpg',  prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.70 },
    { word: 'slice',  display: 'slicing',  image: 'img/slicing.jpg',   prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.27 },
    { word: 'stir',   display: 'stirring', image: 'img/stirring.jpg',  prompt_type: 'action', iconic: true,  iconicity_marginal: true,  target_form: 'bare', rating: 4.30 },
    { word: 'bowl',   display: 'bowl',     image: 'img/bowl.jpg',      prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.00 },
    { word: 'pan',    display: 'pan',      image: 'img/pan.jpg',       prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.45 },
    { word: 'flour',  display: 'flour',    image: 'img/flour.jpg',     prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.00 },
    { word: 'butter', display: 'butter',   image: 'img/butter.jpg',    prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.50 },
  ];

  // v8.7: spoon 3.30→4.30, plate 3.00→4.08 (Winter et al. source values)
  const PRODUCTION_CONTROLS = [
    { word: 'chop',  display: 'chopping', image: 'img/chopping.jpg', prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.50 },
    { word: 'peel',  display: 'peeling',  image: 'img/peeling.jpg',  prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.60 },
    { word: 'spoon', display: 'spoon',    image: 'img/spoon.jpg',    prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 4.30 },
    { word: 'plate', display: 'plate',    image: 'img/plate.jpg',    prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 4.08 },
  ];

  const SINGLE_TAKE_SFX = new Set(['slice', 'chop', 'peel', 'glug', 'splash']);
  function sfxPath(word) {
    if (SINGLE_TAKE_SFX.has(word)) return { path: `sounds/sfx_${word}_1.mp3`, variant: 1 };
    const v = (Math.random() < 0.5) ? 1 : 2;
    return { path: `sounds/sfx_${word}_${v}.mp3`, variant: v };
  }

  const FOLEY_RECOGNITION = [
    { sfx_word: 'crack',  target: 'cracking', options: ['cracking',  'snapping',  'chopping',  'slicing'],  correct: 0, iconic: true, target_word: 'crack',  produced_in_training: true,  iconicity_marginal: false },
    { sfx_word: 'sizzle', target: 'sizzling', options: ['simmering', 'sizzling',  'bubbling',  'whisking'], correct: 1, iconic: true, target_word: 'sizzle', produced_in_training: false, iconicity_marginal: false },
    { sfx_word: 'flip',   target: 'flipping', options: ['stirring',  'flipping',  'tossing',   'scraping'], correct: 1, iconic: true, target_word: 'flip',   produced_in_training: true,  iconicity_marginal: false },
    { sfx_word: 'slice',  target: 'slicing',  options: ['chopping',  'grating',   'slicing',   'peeling'],  correct: 2, iconic: true, target_word: 'slice',  produced_in_training: true,  iconicity_marginal: false },
    { sfx_word: 'stir',   target: 'stirring', options: ['stirring',  'whisking',  'folding',   'mixing'],   correct: 0, iconic: true, target_word: 'stir',   produced_in_training: true,  iconicity_marginal: true  },
  ];

  // SFX RECOGNITION (v8.3) — 5 targets + 4 lures, Y/N + confidence, d-prime.
  const SFX_RECOGNITION_STIMULI = [
    { word: 'crack',  trained: true,  iconic: true,  iconicity_marginal: false, produced_in_training: true  },
    { word: 'flip',   trained: true,  iconic: true,  iconicity_marginal: false, produced_in_training: true  },
    { word: 'slice',  trained: true,  iconic: true,  iconicity_marginal: false, produced_in_training: true  },
    { word: 'stir',   trained: true,  iconic: true,  iconicity_marginal: true,  produced_in_training: true  },
    { word: 'sizzle', trained: true,  iconic: true,  iconicity_marginal: false, produced_in_training: false },
    { word: 'chop',   trained: false, iconic: true,  iconicity_marginal: false, produced_in_training: false },
    { word: 'peel',   trained: false, iconic: true,  iconicity_marginal: false, produced_in_training: false },
    { word: 'glug',   trained: false, iconic: true,  iconicity_marginal: false, produced_in_training: false },
    { word: 'splash', trained: false, iconic: true,  iconicity_marginal: false, produced_in_training: false },
  ];

  // Binding task — Probe 1 (event association) only as of v8.6.
  const BINDING_PROBES = [
    {
      word: 'sizzle', iconic: true, produced: false,
      probe1_q: 'When you heard <b>sizzling</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>sizzling</b> という音を聞いたとき、何が起こっていましたか？',
      probe1_options: [
        'butter melting in a hot pan',
        'cracking an egg into the pan',
        'pouring milk into the batter',
        'flour falling into the bowl from above'
      ],
      probe1_correct: 0,
    },
    {
      word: 'crack', iconic: true, produced: true,
      probe1_q: 'When you said <b>crack</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>crack</b> と言ったとき、何が起こっていましたか？',
      probe1_options: [
        'eggshell breaking open into the bowl',
        'butter being cut with a knife',
        'flour being measured into a cup',
        'milk pouring out of a carton'
      ],
      probe1_correct: 0,
    },
    {
      word: 'bowl', iconic: false, produced: true,
      probe1_q: 'When you said <b>bowl</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>bowl</b> と言ったとき、何が起こっていましたか？',
      probe1_options: [
        'ingredients being combined inside it',
        'food being heated to cook',
        'food being flipped to cook the other side',
        'finished pancake being served'
      ],
      probe1_correct: 0,
    },
  ];

  const RECIPE_STEPS = [
    'Crack the eggs',
    'Mix the ingredients',
    'Heat the pan',
    'Pour the batter into the pan',
    'Flip the pancake',
  ];

  /* ======================== STYLES ======================== */
  function addCustomStyles() {
    const styleBlock = document.createElement('style');
    styleBlock.textContent = `
      .toast { position:fixed; bottom:20px; right:20px; background:#333; color:white; padding:15px 20px; border-radius:5px; z-index:1000; }
      .mic-error-msg { background-color:#ffebee; padding:20px; border-radius:8px; margin-top:20px; }
      .seq-selected { opacity:0.4; pointer-events:none; }
      .seq-undo-btn { margin-top:12px; background:#ff9800; color:white; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:14px; }
      .seq-undo-btn:hover { background:#f57c00; }
      .seq-reset-btn { margin-top:12px; margin-left:8px; background:#f44336; color:white; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:14px; }
      .seq-reset-btn:hover { background:#d32f2f; }
      .region-card { display:inline-block; width:200px; padding:30px 20px; margin:10px; border:2px solid #ccc; border-radius:12px; cursor:pointer; background:white; transition:all .15s ease; }
      .region-card:hover { border-color:#1a237e; transform:translateY(-2px); }
      .region-card.selected { background:#e8f5e9; border-color:#4caf50; }
    `;
    document.head.appendChild(styleBlock);
  }

  /* ======================== ASSET VALIDATION ======================== */
  function checkExists(url) {
    return fetch(asset(url), { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  }

  async function validateAssets() {
    const allAudio = new Set();
    const allImages = new Set();
    const optionalImages = new Set();
    for (const s of PRODUCTION_TARGETS) {
      allImages.add(s.image);
      const m = s.image.match(/^(.+?)\.(jpg|jpeg|png)$/i);
      if (m) { optionalImages.add(`${m[1]}_01.${_VARIANT_EXT}`); optionalImages.add(`${m[1]}_02.${_VARIANT_EXT}`); }
    }
    for (const s of PRODUCTION_CONTROLS) {
      allImages.add(s.image);
      const m = s.image.match(/^(.+?)\.(jpg|jpeg|png)$/i);
      if (m) { optionalImages.add(`${m[1]}_01.${_VARIANT_EXT}`); optionalImages.add(`${m[1]}_02.${_VARIANT_EXT}`); }
    }
    const addSfxVariants = (word) => {
      allAudio.add(`sounds/sfx_${word}_1.mp3`);
      if (!SINGLE_TAKE_SFX.has(word)) allAudio.add(`sounds/sfx_${word}_2.mp3`);
    };
    for (const s of FOLEY_RECOGNITION) addSfxVariants(s.sfx_word);
    for (const s of SFX_RECOGNITION_STIMULI) addSfxVariants(s.word);
    allImages.add('img/park_scene.jpg');
    for (const url of allAudio) { try { if (!(await checkExists(url))) MISSING_ASSETS.audio.push(url); } catch {} }
    for (const url of allImages) {
      try {
        if (!(await checkExists(url))) MISSING_ASSETS.images.push(url);
        else PRELOAD_IMAGES.push(url);
      } catch {}
    }
    for (const url of optionalImages) { try { if (await checkExists(url)) PRELOAD_IMAGES.push(url); } catch {} }
    const variantCount = [...optionalImages].filter(u => PRELOAD_IMAGES.includes(u)).length;
    console.log(`[Validation] Missing: ${MISSING_ASSETS.images.length} images, ${MISSING_ASSETS.audio.length} audio. Variants: ${variantCount}/${optionalImages.size}.`);
  }

  function buildAssetCheckScreen() {
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const imgList = MISSING_ASSETS.images.map(f => `<li>🖼 <code>${f}</code></li>`).join('');
        const audList = MISSING_ASSETS.audio.map(f => `<li>🔊 <code>${f}</code></li>`).join('');
        const total = MISSING_ASSETS.images.length + MISSING_ASSETS.audio.length;
        return `<div style="max-width:760px;margin:0 auto;text-align:left;line-height:1.6">
          <h2 style="color:#d32f2f;">⚠️ Asset Check — ${total} file${total === 1 ? '' : 's'} missing</h2>
          <p>Affected trials run with placeholders.</p>
          <ul style="font-family:monospace;font-size:13px">${imgList}${audList}</ul></div>`;
      },
      choices: ['Abort', 'Continue (acknowledge) / 続行'],
      data: () => ({ task: 'asset_check', missing_images: MISSING_ASSETS.images.slice(), missing_audio: MISSING_ASSETS.audio.slice() }),
      on_finish: (d) => {
        d.aborted = (d.response === 0);
        if (d.aborted) { try { jsPsych.endExperiment('<h2>Aborted</h2>'); } catch {} }
      }
    };
  }

  /* ======================== PARTICIPANT INFO ======================== */
  function createParticipantConfirm() {
    let captured = null;
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <h2>Post-Test / ポストテスト</h2>
        <p>Confirm your information below. / 以下を確認してください。</p>
        <form id="post-form" style="text-align:left;max-width:500px;margin:auto;">
          <div style="margin-bottom:15px;">
            <label><b>Participant ID / 参加者ID</b></label><br>
            <input name="pid" type="text" required value="${currentPID === 'unknown' ? '' : currentPID}" style="width:100%;padding:5px;">
          </div>
          <div style="margin-bottom:15px;">
            <label><b>Training Condition / 条件</b></label><br>
            <select name="cond" required style="width:100%;padding:5px;">
              <option value="">--Select / 選択--</option>
              <option value="VR" ${assignedTrainingCondition === 'VR' ? 'selected' : ''}>VR (3D Immersive)</option>
              <option value="2D" ${assignedTrainingCondition === '2D' ? 'selected' : ''}>2D (Picture Canvas)</option>
              <option value="Text" ${assignedTrainingCondition === 'Text' ? 'selected' : ''}>Text (Word Canvas)</option>
            </select>
          </div>
        </form>`,
      choices: ['Continue / 続行'],
      data: { task: 'participant_confirm' },
      on_load: function () {
        setTimeout(() => {
          const btn = document.querySelector('.jspsych-html-button-response-button button') || document.querySelector('.jspsych-btn');
          if (!btn) return;
          btn.addEventListener('click', function (e) {
            const form = document.getElementById('post-form');
            if (!form.checkValidity()) { e.preventDefault(); e.stopImmediatePropagation(); form.reportValidity(); return; }
            const fd = new FormData(form);
            captured = { pid: fd.get('pid'), cond: fd.get('cond') };
            currentPID = captured.pid || 'unknown';
            assignedTrainingCondition = captured.cond || 'unknown';
          }, { capture: true });
        }, 50);
      },
      on_finish: (d) => {
        d.responses = captured || {};
        counterbalanceList = pidToCounterbalance(currentPID);
        try {
          jsPsych.data.addProperties({
            pid: currentPID, training_condition: assignedTrainingCondition,
            counterbalance_list: counterbalanceList, test_phase: testCondition
          });
        } catch {}
      }
    };
  }

  /* ======================== MIC GATE ======================== */
  function buildMicSetupGate() {
    const gate = {
      type: T('jsPsychHtmlButtonResponse'),
      choices: ['Continue / 続行', 'Use Text Only / 文字で続行'],
      stimulus: `
        <div style="max-width:720px;margin:0 auto;text-align:center;line-height:1.6">
          <h2>Microphone Setup / マイクの設定</h2>
          <p>Click <b>Enable Microphone</b> and allow access. / <b>マイクを有効化</b>を押して許可してください。</p>
          <div style="margin:16px 0;"><button class="jspsych-btn" id="mic-enable">🎙️ Enable Microphone / マイクを有効化</button></div>
          <div id="mic-status" style="margin:10px 0;color:#666;">Status: not initialized</div>
          <div style="margin:10px auto;width:340px;height:14px;border-radius:7px;background:#eee;overflow:hidden;">
            <div id="mic-level" style="height:100%;width:0%;background:#4caf50;transition:width .08s linear;"></div>
          </div>
        </div>`,
      data: { task: 'mic_gate' },
      on_load: () => {
        const enableBtn = document.getElementById('mic-enable');
        const statusEl = document.getElementById('mic-status');
        const levelEl = document.getElementById('mic-level');
        const choiceBtns = [...document.querySelectorAll('.jspsych-html-button-response-button button')];
        const contBtn = choiceBtns[0];
        const textBtn = choiceBtns[1];
        if (contBtn) { contBtn.disabled = true; contBtn.style.opacity = '0.5'; }
        async function startStream() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const an = ctx.createAnalyser(); an.fftSize = 2048; src.connect(an);
            const buf = new Uint8Array(an.fftSize);
            (function tick() {
              an.getByteTimeDomainData(buf);
              let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
              levelEl.style.width = Math.min(100, Math.round(Math.sqrt(s / buf.length) * 220)) + '%';
              requestAnimationFrame(tick);
            })();
            statusEl.textContent = 'Microphone enabled ✔';
            if (contBtn) { contBtn.disabled = false; contBtn.style.opacity = '1'; }
            window.__mic_ok = true;
          } catch { statusEl.textContent = 'Permission denied or unavailable ✖'; window.__mic_ok = false; }
        }
        enableBtn.addEventListener('click', startStream);
        if (textBtn) textBtn.addEventListener('click', () => { window.__mic_ok = false; });
      },
      on_finish: () => {
        microphoneAvailable = !!window.__mic_ok;
        try { jsPsych.data.addProperties({ mic_available: microphoneAvailable }); } catch {}
      }
    };
    return {
      timeline: [gate],
      loop_function: () => { const last = jsPsych.data.get().last(1).values()[0] || {}; return !(microphoneAvailable || last.response === 1); }
    };
  }

  /* ======================== PRODUCTION BLOCK ======================== */
  function buildProductionBlock(timelineItems, itemRole) {
    const hasMicPlugins = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');
    const canRecordAudio = () => hasMicPlugins && microphoneAvailable;
    const tl = [];
    const repCounter = {};
    const nextRep = (word, pass) => { const k = `${word}_${pass}`; repCounter[k] = (repCounter[k] || 0) + 1; return repCounter[k]; };
    const _imgCache = new Map();
    const resolveTrialImage = () => {
      const base = jsPsych.timelineVariable('image');
      let idx = 0; try { idx = jsPsych.getProgress().current_trial_global; } catch {}
      const key = `${idx}_${base}`;
      if (!_imgCache.has(key)) _imgCache.set(key, imagePath(base));
      return _imgCache.get(key);
    };
    const blockTitle = (itemRole === 'control') ? 'First Set / 第1セット' : 'Second Set / 第2セット';
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h3>${blockTitle}</h3>
        <p>You will see kitchen pictures. Say what you see in English. / 台所の写真を見て、英語で答えてください。</p>
        <p style="color:#666;">If you don't know a word, that's okay — guess or stay silent. / 単語が分からない場合は、推測でも無言でも大丈夫です。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'production_block_intro', item_role: itemRole, phase: 'post' }
    });
    function phrasePrompt(pt) {
      return pt === 'action' ? { en: 'What is happening?', jp: '何をしていますか？' } : { en: 'What is this?', jp: 'これは何ですか？' };
    }
    const phraseAudio = hasMicPlugins ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const st = resolveTrialImage(); const p = phrasePrompt(jsPsych.timelineVariable('prompt_type'));
        return `<div style="text-align:center;"><img src="${imgSrc(st.path)}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>
          <p style="margin-top:15px;font-size:18px;"><b>${p.en}</b></p><p style="color:#666;">${p.jp}</p>
          <div style="margin-top:12px;background:#ffebee;border-radius:8px;padding:12px;"><p style="margin:0;color:#d32f2f;font-weight:bold;">🔴 Recording… 4 seconds / 録音中… 4秒</p></div></div>`;
      },
      recording_duration: 4000, show_done_button: false, allow_playback: false,
      data: () => { const st = resolveTrialImage(); return { task: 'production_phrase', target_word: jsPsych.timelineVariable('word'), display_target: jsPsych.timelineVariable('display'), prompt_type: jsPsych.timelineVariable('prompt_type'), iconic: jsPsych.timelineVariable('iconic'), iconicity_rating: jsPsych.timelineVariable('rating'), iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'), target_form: jsPsych.timelineVariable('target_form'), image_path: st.path, image_variant: st.variant, item_role: itemRole, pass: 'phrase', phase: 'post', modality: 'audio', training_condition: assignedTrainingCondition, counterbalance_list: counterbalanceList }; },
      on_finish: (d) => { const t = (d.target_word||'x').toLowerCase(); d.repetition = nextRep(t, 'phrase'); d.audio_filename = `post_${currentPID}_${itemRole}_${t}_phrase_rep${d.repetition}.webm`; }
    } : null;
    const phraseText = {
      type: T('jsPsychSurveyText'),
      preamble: () => { const st = resolveTrialImage(); const p = phrasePrompt(jsPsych.timelineVariable('prompt_type')); return `<div style="text-align:center;"><img src="${imgSrc(st.path)}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/><p style="margin-top:15px;font-size:18px;"><b>${p.en}</b></p><p style="color:#666;">${p.jp}</p><div class="mic-error-msg" style="margin-top:10px"><b>Note:</b> Type your answer in English. / 英語で入力してください。</div></div>`; },
      questions: [{ prompt: '', name: 'response', rows: 1, required: false }],
      data: () => { const st = resolveTrialImage(); return { task: 'production_phrase', target_word: jsPsych.timelineVariable('word'), display_target: jsPsych.timelineVariable('display'), prompt_type: jsPsych.timelineVariable('prompt_type'), iconic: jsPsych.timelineVariable('iconic'), iconicity_rating: jsPsych.timelineVariable('rating'), iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'), target_form: jsPsych.timelineVariable('target_form'), image_path: st.path, image_variant: st.variant, item_role: itemRole, pass: 'phrase', phase: 'post', modality: 'text', training_condition: assignedTrainingCondition, counterbalance_list: counterbalanceList }; }
    };
    const isolatedAudio = hasMicPlugins ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => { const st = resolveTrialImage(); return `<div style="text-align:center;"><img src="${imgSrc(st.path)}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/><p style="margin-top:15px;font-size:18px;"><b>Say just the word.</b></p><p style="color:#666;">単語だけを言ってください。</p><div style="margin-top:12px;background:#fff3cd;border-radius:8px;padding:12px;"><p style="margin:0;color:#856404;font-weight:bold;">🔴 Recording… 3 seconds / 録音中… 3秒</p></div></div>`; },
      recording_duration: 3000, show_done_button: false, allow_playback: false,
      data: () => { const st = resolveTrialImage(); return { task: 'production_isolated', target_word: jsPsych.timelineVariable('word'), display_target: jsPsych.timelineVariable('display'), prompt_type: jsPsych.timelineVariable('prompt_type'), iconic: jsPsych.timelineVariable('iconic'), iconicity_rating: jsPsych.timelineVariable('rating'), iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'), target_form: jsPsych.timelineVariable('target_form'), image_path: st.path, image_variant: st.variant, item_role: itemRole, pass: 'isolated', phase: 'post', modality: 'audio', training_condition: assignedTrainingCondition, counterbalance_list: counterbalanceList }; },
      on_finish: (d) => { const t = (d.target_word||'x').toLowerCase(); d.repetition = nextRep(t, 'isolated'); d.audio_filename = `post_${currentPID}_${itemRole}_${t}_isolated_rep${d.repetition}.webm`; }
    } : null;
    const isolatedText = {
      type: T('jsPsychSurveyText'),
      preamble: () => { const st = resolveTrialImage(); return `<div style="text-align:center;"><img src="${imgSrc(st.path)}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/><p style="margin-top:15px;font-size:18px;"><b>Type just the word.</b></p><p style="color:#666;">単語だけを入力してください。</p><div class="mic-error-msg" style="margin-top:10px"><b>Note:</b> One word only. / 1単語のみ。</div></div>`; },
      questions: [{ prompt: '', name: 'response', rows: 1, required: false }],
      data: () => { const st = resolveTrialImage(); return { task: 'production_isolated', target_word: jsPsych.timelineVariable('word'), display_target: jsPsych.timelineVariable('display'), prompt_type: jsPsych.timelineVariable('prompt_type'), iconic: jsPsych.timelineVariable('iconic'), iconicity_rating: jsPsych.timelineVariable('rating'), iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'), target_form: jsPsych.timelineVariable('target_form'), image_path: st.path, image_variant: st.variant, item_role: itemRole, pass: 'isolated', phase: 'post', modality: 'text', training_condition: assignedTrainingCondition, counterbalance_list: counterbalanceList }; }
    };
    if (hasMicPlugins) tl.push({ timeline: [phraseAudio], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: canRecordAudio });
    tl.push({ timeline: [phraseText], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: () => !canRecordAudio() });
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<p>Now we'll do the same pictures one more time. This time, please <b>say only the word</b> — no full sentence. / 今度は<b>単語だけ</b>を言ってください。</p>`, choices: ['Continue / 続行'], data: { task: 'production_pass_transition', item_role: itemRole, phase: 'post' } });
    if (hasMicPlugins) tl.push({ timeline: [isolatedAudio], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: canRecordAudio });
    tl.push({ timeline: [isolatedText], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: () => !canRecordAudio() });
    return tl;
  }

  /* ======================== PRODUCTION PRACTICE ======================== */
  function buildProductionPractice() {
    const hasMicPlugins = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');
    const canRecordAudio = () => hasMicPlugins && microphoneAvailable;
    const practiceImg = `<img src="${imgSrc('img/park_scene.jpg')}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>`;
    const tl = [
      { type: T('jsPsychHtmlButtonResponse'), stimulus: `<h2>Naming Task / 名前の課題</h2><p>You will see pictures and answer in English. / 写真を見て英語で答えてください。</p><p style="color:#666;margin-top:15px;">Let's do one practice. / 練習を1問しましょう。</p>`, choices: ['Continue / 続行'], data: { task: 'production_practice_intro', phase: 'post' } },
      { type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="text-align:center;">${practiceImg}<p style="margin-top:15px;"><b>Practice:</b> What do you see? / 練習：何が見えますか？</p></div>`, choices: ['Start Practice Recording / 練習録音開始'], data: { task: 'production_practice_prepare', phase: 'post' } }
    ];
    if (hasMicPlugins) {
      tl.push({ timeline: [{ type: T('jsPsychHtmlAudioResponse'), stimulus: `<div style="text-align:center;">${practiceImg}<div style="margin-top:16px;background:#ffebee;border-radius:8px;padding:15px;"><p style="margin:0;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 PRACTICE Recording… / 練習録音中… 4s</p></div></div>`, recording_duration: 4000, show_done_button: false, allow_playback: true, data: { task: 'production_practice_record', phase: 'post' } }], conditional_function: canRecordAudio });
    }
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: '<h3 style="color:green">Practice Complete! / 練習完了！</h3>', choices: ['Continue / 続行'], data: { task: 'production_practice_done', phase: 'post' } });
    return tl;
  }

  /* ======================== BINDING TASK (Probe 1 only, v8.6) ======================== */
  /* ======================== RECEPTIVE 4AFC ========================
   * Picture → Word forced-choice on all 12 items (8 targets + 4 controls).
   * Inserted AFTER production so naming responses are not influenced.
   *
   * Four-option structure per trial:
   *   correct           — the trained target word
   *   iconic_pseudo     — phonologically close pseudoword; sounds iconic
   *   trained_foil      — different trained/control word; plausible co-occurrence
   *   conventional_syn  — real English synonym; low iconicity; tests concept-without-form
   *
   * on_finish derives foil_type_selected so choice pattern is directly analysable.
   * iconicity_class logged as string ('iconic'/'conventional') for OSF-consistent naming.
   * ================================================================ */

  const RECEPTIVE_4AFC_ITEMS = [
    // ── ICONIC TARGETS ──────────────────────────────────────────────
    { word: 'crack',  image: 'img/cracking.jpeg', iconic: true,  iconicity_marginal: false, rating: 5.40, item_role: 'target',
      iconic_pseudo: 'blatch',  trained_foil: 'butter',  conventional_syn: 'break'   },
    { word: 'flip',   image: 'img/flipping.jpg',  iconic: true,  iconicity_marginal: false, rating: 5.70, item_role: 'target',
      iconic_pseudo: 'thrip',   trained_foil: 'pan',     conventional_syn: 'turn'    },
    { word: 'slice',  image: 'img/slicing.jpg',   iconic: true,  iconicity_marginal: false, rating: 5.27, item_role: 'target',
      iconic_pseudo: 'flice',   trained_foil: 'bowl',    conventional_syn: 'cut'     },
    { word: 'stir',   image: 'img/stirring.jpg',  iconic: true,  iconicity_marginal: true,  rating: 4.30, item_role: 'target',
      iconic_pseudo: 'swirp',   trained_foil: 'flour',   conventional_syn: 'combine' },
    // ── CONVENTIONAL TARGETS ─────────────────────────────────────────
    { word: 'bowl',   image: 'img/bowl.jpg',      iconic: false, iconicity_marginal: false, rating: 3.00, item_role: 'target',
      iconic_pseudo: 'broll',   trained_foil: 'crack',   conventional_syn: 'dish'    },
    { word: 'pan',    image: 'img/pan.jpg',        iconic: false, iconicity_marginal: false, rating: 3.45, item_role: 'target',
      iconic_pseudo: 'glan',    trained_foil: 'flip',    conventional_syn: 'pot'     },
    { word: 'flour',  image: 'img/flour.jpg',      iconic: false, iconicity_marginal: false, rating: 3.00, item_role: 'target',
      iconic_pseudo: 'blour',   trained_foil: 'stir',    conventional_syn: 'powder'  },
    { word: 'butter', image: 'img/butter.jpg',     iconic: false, iconicity_marginal: false, rating: 3.50, item_role: 'target',
      iconic_pseudo: 'snutter', trained_foil: 'slice',   conventional_syn: 'spread'  },
    // ── CONTROLS (untrained) ─────────────────────────────────────────
    { word: 'chop',   image: 'img/chopping.jpg',  iconic: true,  iconicity_marginal: false, rating: 5.50, item_role: 'control',
      iconic_pseudo: 'throp',   trained_foil: 'pan',     conventional_syn: 'mince'   },
    { word: 'peel',   image: 'img/peeling.jpg',   iconic: true,  iconicity_marginal: false, rating: 5.60, item_role: 'control',
      iconic_pseudo: 'freel',   trained_foil: 'flour',   conventional_syn: 'strip'   },
    { word: 'spoon',  image: 'img/spoon.jpg',      iconic: false, iconicity_marginal: false, rating: 4.30, item_role: 'control',
      iconic_pseudo: 'sploon',  trained_foil: 'bowl',    conventional_syn: 'scoop'   },
    { word: 'plate',  image: 'img/plate.jpg',      iconic: false, iconicity_marginal: false, rating: 4.08, item_role: 'control',
      iconic_pseudo: 'flate',   trained_foil: 'flip',    conventional_syn: 'tray'    },
  ];

  function buildReceptive4AFC() {
    const tl = [];

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:660px;margin:0 auto;line-height:1.6">
          <h2 style="text-align:center;">Word Recognition / 単語認識</h2>
          <p>You will see a picture. Choose the English word that matches it.</p>
          <p style="color:#444;">写真を見て、合う英単語を選んでください。</p>
          <p style="color:#888;font-size:14px;">Some words may look unfamiliar — choose your best answer.
          <br>見慣れない単語があっても、最もよいと思う答えを選んでください。</p>
        </div>`,
      choices: ['Begin / 開始'],
      data: { task: 'receptive_4afc_intro', phase: 'post' }
    });

    const trial = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const item = jsPsych.timelineVariable('item');
        return `
          <div style="text-align:center;max-width:520px;margin:0 auto;">
            <img src="${imgSrc(item.image)}" ${IMG_ONERROR}
                 style="width:280px;height:210px;object-fit:cover;border-radius:10px;
                        border:2px solid #ddd;margin-bottom:20px;" />
            <p style="color:#666;font-size:14px;margin-bottom:6px;">
              Which word matches this picture? / この写真に合う単語はどれですか？
            </p>
          </div>`;
      },
      choices: () => {
        const item = jsPsych.timelineVariable('item');
        const options = [
          { label: item.word,            type: 'correct'          },
          { label: item.iconic_pseudo,   type: 'iconic_pseudo'    },
          { label: item.trained_foil,    type: 'trained_foil'     },
          { label: item.conventional_syn, type: 'conventional_syn' },
        ];
        // Shuffle and store order for on_finish
        const shuffled = options.sort(() => Math.random() - 0.5);
        window.__4afc_order = shuffled;
        return shuffled.map(o => o.label);
      },
      button_html: '<button class="jspsych-btn" style="min-width:110px;font-size:16px;margin:6px;">%choice%</button>',
      on_finish: (d) => {
        const item    = jsPsych.timelineVariable('item');
        const order   = window.__4afc_order || [];
        const chosen  = order[d.response] || {};
        d.target_word         = item.word;
        d.iconicity_class     = item.iconic ? 'iconic' : 'conventional';
        d.iconic              = item.iconic;
        d.iconicity_marginal  = item.iconicity_marginal;
        d.iconicity_rating    = item.rating;
        d.item_role           = item.item_role;
        d.correct_answer      = item.word;
        d.response_text       = chosen.label || null;
        d.foil_type_selected  = chosen.type  || null;
        d.correct             = chosen.type === 'correct';
        d.options_order       = order.map(o => o.label);
        d.training_condition  = assignedTrainingCondition;
        d.phase               = 'post';
        window.__4afc_order   = null;
      },
      data: { task: 'receptive_4afc' }
    };

    const tvars = RECEPTIVE_4AFC_ITEMS.map(item => ({ item }));
    tl.push({ timeline: [trial], timeline_variables: tvars, randomize_order: true });

    return tl;
  }

  function buildBindingTask() {
    const tl = [];
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="max-width:600px;margin:0 auto;line-height:1.6"><h2 style="text-align:center;">Part 2: New Tasks / 第2部：新しい課題</h2><p style="color:#666;text-align:center;">The naming block is complete. The next sections are different. / 写真の命名は完了しました。</p><hr style="margin:18px 0;"><h3>Memory Probes / 記憶のテスト</h3><p>For each word, answer a short question about your training experience. / 各単語について、トレーニングについての質問に答えてください。</p></div>`, choices: ['Begin / 開始'], data: { task: 'binding_intro', phase: 'post' } });
    BINDING_PROBES.forEach(probe => {
      const opts = shuffle(probe.probe1_options.map((opt, i) => ({ text: opt, origIdx: i })));
      const correctIdx = opts.findIndex(o => o.origIdx === probe.probe1_correct);
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;max-width:600px;margin:0 auto;"><p style="font-size:18px;">${probe.probe1_q}</p><p style="color:#666;font-size:14px;">${probe.probe1_q_jp}</p></div>`,
        choices: opts.map(o => o.text),
        data: { task: 'binding_probe1_event', word: probe.word, iconic: probe.iconic, produced_in_training: probe.produced, correct_answer: correctIdx, options: opts.map(o => o.text), training_condition: assignedTrainingCondition, phase: 'post' },
        on_finish: d => { d.is_correct = (d.response === d.correct_answer); }
      });
    });
    return tl;
  }

  /* ======================== 3×3 GRID ARRANGEMENT (v8.2 — per-condition ground truth) ======================== */
  const ARRANGEMENT_GROUND_TRUTH_BY_CONDITION = {
    Text:  { flour: { row:0, col:0 }, butter: { row:0, col:2 }, bowl: { row:2, col:0 }, pan: { row:2, col:1 }, plate: { row:2, col:2 } },
    '2D':  { flour: { row:0, col:0 }, bowl:   { row:1, col:0 }, pan:  { row:1, col:1 }, plate: { row:1, col:2 }, butter: { row:2, col:1 } },
    VR:    { flour: { row:0, col:0 }, butter: { row:2, col:0 }, bowl: { row:2, col:1 }, plate: { row:1, col:1 }, pan: { row:2, col:2 } },
  };
  const ARRANGEMENT_LABELS = { flour: 'Flour', butter: 'Butter', bowl: 'Bowl', pan: 'Pan', plate: 'Plate' };
  const ARRANGEMENT_ITEM_ORDER = ['flour', 'butter', 'bowl', 'pan', 'plate'];

  function getArrangementItems() {
    const truth = ARRANGEMENT_GROUND_TRUTH_BY_CONDITION[assignedTrainingCondition] || ARRANGEMENT_GROUND_TRUTH_BY_CONDITION['2D'];
    return ARRANGEMENT_ITEM_ORDER.map(id => ({ id, label: ARRANGEMENT_LABELS[id], correct_row: truth[id].row, correct_col: truth[id].col }));
  }

  function buildArrangementTask() {
    // v8.8: ITEMS resolved lazily inside stimulus() so assignedTrainingCondition
    // is read AFTER participant_confirm, not at timeline-construction time.
    let placedState = {};
    let runtimeItems = null;  // set by stimulus function, shared by on_load + on_finish

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: function() {
        // Resolve now — assignedTrainingCondition is set by this point.
        runtimeItems = getArrangementItems();
        const tokenHtml = runtimeItems.map(it =>
          `<div class="arr-token" draggable="true" data-id="${it.id}" style="padding:10px 14px;background:#1a237e;color:white;border-radius:6px;cursor:grab;text-align:center;font-weight:600;user-select:none;">${it.label}</div>`
        ).join('');
        const cellHtml = [0,1,2].flatMap(r=>[0,1,2].map(c=>
          `<div class="arr-cell" data-row="${r}" data-col="${c}" style="border:2px dashed #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;background:white;"></div>`
        )).join('');
        return `<div style="max-width:760px;margin:0 auto;line-height:1.6"><h2 style="text-align:center;">Kitchen Layout / キッチンの配置</h2><p>Drag each item to where you remember it being during training. / トレーニング中に覚えている場所に各アイテムをドラッグしてください。</p></div>
      <div style="display:flex;justify-content:center;gap:40px;align-items:start;margin-top:30px;">
        <div><h4 style="text-align:center;margin:0 0 10px 0;color:#666;">Items / アイテム</h4>
        <div id="arr-tray" style="display:flex;flex-direction:column;gap:8px;width:120px;padding:10px;border:2px dashed #aaa;border-radius:8px;min-height:280px;">${tokenHtml}</div></div>
        <div><h4 style="text-align:center;margin:0 0 10px 0;color:#666;">Kitchen Area / キッチン</h4>
        <div id="arr-grid" style="display:grid;grid-template-columns:120px 120px 120px;grid-template-rows:90px 90px 90px;gap:6px;background:#f5f5f5;padding:6px;border-radius:8px;">${cellHtml}</div></div>
      </div>
      <p id="arr-status" style="text-align:center;margin-top:18px;color:#666;font-size:14px;">Drag all 5 items to continue. / 5つすべてをドラッグしてください。</p>`;
      },
      choices: ['Submit / 送信'],
      data: { task: 'arrangement_task', training_condition: assignedTrainingCondition, phase: 'post' },
      on_load: function () {
        placedState = {};
        const ITEMS = runtimeItems;  // guaranteed set by stimulus()
        const submitBtn = [...document.querySelectorAll('.jspsych-html-button-response-button button')][0];
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; }
        const statusEl = document.getElementById('arr-status');
        const tokens = [...document.querySelectorAll('.arr-token')];
        const cells  = [...document.querySelectorAll('.arr-cell')];
        const tray   = document.getElementById('arr-tray');
        let dragged = null;
        tokens.forEach(t => {
          t.addEventListener('dragstart', e => { dragged = t; e.dataTransfer.effectAllowed = 'move'; t.style.opacity = '0.4'; });
          t.addEventListener('dragend', () => { if (dragged) dragged.style.opacity = '1'; dragged = null; });
        });
        function updateState() {
          placedState = {};
          cells.forEach(c => { const tok = c.querySelector('.arr-token'); if (tok) placedState[tok.dataset.id] = { row: Number(c.dataset.row), col: Number(c.dataset.col) }; });
          const allPlaced = Object.keys(placedState).length === ITEMS.length;
          if (submitBtn) { submitBtn.disabled = !allPlaced; submitBtn.style.opacity = allPlaced ? '1' : '0.5'; }
          if (statusEl) statusEl.textContent = allPlaced ? 'All items placed — click Submit. / 配置完了 — 送信してください。' : `${Object.keys(placedState).length}/${ITEMS.length} placed.`;
        }
        cells.forEach(c => {
          c.addEventListener('dragover', e => { e.preventDefault(); c.style.background = '#e8f5e9'; });
          c.addEventListener('dragleave', () => { c.style.background = 'white'; });
          c.addEventListener('drop', e => { e.preventDefault(); c.style.background = 'white'; if (!dragged) return; const ex = c.querySelector('.arr-token'); if (ex && ex !== dragged) { tray.appendChild(ex); ex.style.opacity = '1'; } c.appendChild(dragged); dragged.style.opacity = '1'; updateState(); });
        });
        tray.addEventListener('dragover', e => { e.preventDefault(); });
        tray.addEventListener('drop', e => { e.preventDefault(); if (!dragged) return; tray.appendChild(dragged); dragged.style.opacity = '1'; updateState(); });
      },
      on_finish: function (d) {
        const ITEMS = runtimeItems;
        d.ground_truth = ITEMS.map(it=>({id:it.id,row:it.correct_row,col:it.correct_col}));
        d.placements = ITEMS.map(it => ({ id: it.id, placed_row: placedState[it.id]?.row ?? null, placed_col: placedState[it.id]?.col ?? null, correct_row: it.correct_row, correct_col: it.correct_col, exact_match: placedState[it.id]?.row === it.correct_row && placedState[it.id]?.col === it.correct_col, row_match: placedState[it.id]?.row === it.correct_row, col_match: placedState[it.id]?.col === it.correct_col }));
        d.exact_match_count = d.placements.filter(p => p.exact_match).length;
        d.row_match_count   = d.placements.filter(p => p.row_match).length;
        d.col_match_count   = d.placements.filter(p => p.col_match).length;
      }
    }];
  }

  /* ======================== SFX RECOGNITION (v8.3 — d-prime) ======================== */
  function buildSFXRecognition() {
    const tl = [];
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="max-width:680px;margin:0 auto;line-height:1.6"><h2 style="text-align:center;">Sound Memory / 音の記憶</h2><p>You will hear several sounds. For each one, decide whether you heard it during training. / いくつかの音を聞きます。トレーニング中に聞いたかどうか答えてください。</p><p style="color:#666;">Some sounds were in the training. Some were not. / トレーニングで使われた音と、使われていない音が混ざっています。</p></div>`, choices: ['Begin / 開始'], data: { task: 'sfx_recognition_intro', phase: 'post' } });
    shuffle(SFX_RECOGNITION_STIMULI).forEach((stim, idx) => {
      const sfx = sfxPath(stim.word);
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;"><button class="jspsych-btn" id="sfxrec-play-${idx}" style="font-size:18px;">▶️ Play sound / 音を再生</button><p id="sfxrec-status-${idx}" style="margin-top:10px;color:#666;">Listen, then answer.</p><p style="margin-top:15px;font-size:18px;"><b>Did you hear this sound during training?</b></p><p style="color:#666;">トレーニング中にこの音を聞きましたか？</p></div>`,
        choices: ['Yes / はい', 'No / いいえ'],
        data: { task: 'sfx_recognition', word: stim.word, trained: stim.trained, iconic: stim.iconic, iconicity_marginal: stim.iconicity_marginal, produced_in_training: stim.produced_in_training, audio_file: sfx.path, sfx_variant: sfx.variant, correct_answer: stim.trained ? 0 : 1, is_lure: !stim.trained, training_condition: assignedTrainingCondition, phase: 'post' },
        on_load: function () {
          const btn = document.getElementById(`sfxrec-play-${idx}`);
          const status = document.getElementById(`sfxrec-status-${idx}`);
          const audio = new Audio(audioSrc(sfx.path));
          window.__sfxrec_audio = audio;
          const answerBtns = [...document.querySelectorAll('.jspsych-html-button-response-button button')];
          let unlocked = false, stopTimer = null;
          const lockAnswers = (lock) => answerBtns.forEach(b => { b.disabled = lock; b.style.opacity = lock ? '0.5' : '1'; });
          const unlock = () => { if (!unlocked) { unlocked = true; lockAnswers(false); status.textContent = 'Choose Yes or No. / はい/いいえを選択。'; } };
          const clearStop = () => { if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; } };
          const forceStop = () => { clearStop(); try { audio.pause(); audio.currentTime = 0; } catch {} unlock(); if (btn) { btn.disabled = false; btn.textContent = '🔁 Play Again / もう一度'; } };
          lockAnswers(true);
          audio.addEventListener('ended', () => { clearStop(); unlock(); btn.textContent = '🔁 Play Again / もう一度'; btn.disabled = false; });
          audio.addEventListener('error', () => { clearStop(); status.textContent = 'Audio missing — answer anyway'; unlock(); }, { once: true });
          btn.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…'; btn.disabled = true;
            audio.currentTime = 0;
            audio.play().catch(() => { status.textContent = 'Audio failed.'; unlock(); btn.disabled = false; });
            clearStop();
            stopTimer = setTimeout(forceStop, MAX_SFX_PLAYBACK_MS);
          });
        },
        on_finish: d => {
          const a = window.__sfxrec_audio;
          if (a) { try { a.pause(); a.src = ''; } catch {} window.__sfxrec_audio = null; }
          d.is_correct = (d.response === d.correct_answer);
          if      (d.trained && d.response === 0)  d.sdt_outcome = 'hit';
          else if (d.trained && d.response === 1)  d.sdt_outcome = 'miss';
          else if (!d.trained && d.response === 0) d.sdt_outcome = 'false_alarm';
          else if (!d.trained && d.response === 1) d.sdt_outcome = 'correct_rejection';
          else d.sdt_outcome = 'unknown';
        }
      });
      tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: '<p>How confident are you? / どのくらい確信がありますか？</p>', choices: ['1 (Guess)', '2', '3', '4 (Sure)'], data: { task: 'sfx_recognition_confidence', word: stim.word, trained: stim.trained, is_lure: !stim.trained, phase: 'post' }, on_finish: d => { d.confidence = d.response !== null ? d.response + 1 : null; } });
    });
    return tl;
  }

  /* ======================== FOLEY RECOGNITION (5 trained sounds, 4-AFC) ======================== */
  function buildFoleyRecognition() {
    const tl = [];
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<h2>Sound Recognition / 音声認識</h2><p>Play each sound, then choose what action it represents. / 音を再生し、どの動作か選択してください。</p>`, choices: ['Begin / 開始'] });
    shuffle(FOLEY_RECOGNITION).forEach((stim, idx) => {
      const opts = shuffle(stim.options.map((o, i) => ({ text: o, origIdx: i })));
      const correctIdx = opts.findIndex(o => o.origIdx === stim.correct);
      const sfx = sfxPath(stim.sfx_word);
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;"><button class="jspsych-btn" id="foley-play-${idx}" style="font-size:20px;">▶️ Play sound / 音を再生</button><p id="foley-status-${idx}" style="margin-top:10px;color:#666;">Listen before answering.</p></div>`,
        choices: opts.map(o => o.text),
        data: { task: 'foley_recognition', target: stim.target, target_word: stim.target_word, iconic: stim.iconic, iconicity_marginal: stim.iconicity_marginal, produced_in_training: stim.produced_in_training, correct_answer: correctIdx, options: opts.map(o => o.text), audio_file: sfx.path, sfx_variant: sfx.variant, training_condition: assignedTrainingCondition, phase: 'post' },
        on_load: function () {
          const btn = document.getElementById(`foley-play-${idx}`);
          const status = document.getElementById(`foley-status-${idx}`);
          const audio = new Audio(audioSrc(sfx.path));
          window.__foley_audio = audio;
          const answerBtns = [...document.querySelectorAll('.jspsych-html-button-response-button button')];
          let unlocked = false, stopTimer = null;
          const lockAnswers = (lock) => answerBtns.forEach(b => { b.disabled = lock; b.style.opacity = lock ? '0.5' : '1'; });
          const unlock = () => { if (!unlocked) { unlocked = true; lockAnswers(false); status.textContent = 'Choose. / 選択。'; } };
          const clearStop = () => { if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; } };
          const forceStop = () => { clearStop(); try { audio.pause(); audio.currentTime = 0; } catch {} unlock(); if (btn) { btn.disabled = false; btn.textContent = '🔁 Play Again / もう一度'; } };
          lockAnswers(true);
          audio.addEventListener('ended', () => { clearStop(); unlock(); btn.textContent = '🔁 Play Again / もう一度'; btn.disabled = false; });
          audio.addEventListener('error', () => { clearStop(); status.textContent = 'Audio missing — answer anyway'; unlock(); }, { once: true });
          btn.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…'; btn.disabled = true;
            audio.currentTime = 0;
            audio.play().catch(() => { status.textContent = 'Audio failed.'; unlock(); btn.disabled = false; });
            clearStop();
            stopTimer = setTimeout(forceStop, MAX_SFX_PLAYBACK_MS);
          });
        },
        on_finish: d => { const a = window.__foley_audio; if (a) { try { a.pause(); a.src = ''; } catch {} window.__foley_audio = null; } d.is_correct = (d.response === d.correct_answer); }
      });
    });
    return tl;
  }

  /* ======================== SEQUENCING ======================== */
  function buildSequencing() {
    let captured = null;
    return [
      { type: T('jsPsychHtmlButtonResponse'), stimulus: `<h2>Sequencing / 順序</h2><p>Click the steps in the correct order. You can undo or reset. / 正しい順番でステップをクリックしてください。</p>`, choices: ['Start / 開始'] },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          const display = shuffle(RECIPE_STEPS);
          let html = '<div style="text-align:center;"><h3>Select the steps in order / 順番に選択してください</h3><div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
          display.forEach(s => { html += `<button class="jspsych-btn seq-btn" data-step="${s}" style="width:240px;">${s}</button>`; });
          html += '</div><div style="margin-top:12px;"><button class="seq-undo-btn" id="seq-undo" disabled>↩ Undo</button><button class="seq-reset-btn" id="seq-reset" disabled>🔄 Reset</button></div><div id="seq-output" style="margin-top:20px;min-height:40px;color:#1565c0;font-weight:600;"></div></div>';
          return html;
        },
        choices: ['Submit / 送信'],
        data: { task: 'sequencing', correct_order: RECIPE_STEPS, phase: 'post', training_condition: assignedTrainingCondition },
        on_load: () => {
          const buttons = [...document.querySelectorAll('.seq-btn')];
          const output = document.getElementById('seq-output');
          const allBtns = [...document.querySelectorAll('.jspsych-btn')].filter(b => !b.classList.contains('seq-btn'));
          const submit = allBtns[allBtns.length - 1];
          if (submit) { submit.disabled = true; submit.style.opacity = '0.5'; }
          const undoBtn = document.getElementById('seq-undo');
          const resetBtn = document.getElementById('seq-reset');
          const selected = [];
          function update() {
            if (output) output.textContent = selected.map((s, i) => `${i + 1}. ${s}`).join('  |  ');
            captured = selected.slice();
            const done = selected.length === RECIPE_STEPS.length;
            if (submit) { submit.disabled = !done; submit.style.opacity = done ? '1' : '0.5'; }
            if (undoBtn) undoBtn.disabled = !selected.length;
            if (resetBtn) resetBtn.disabled = !selected.length;
            buttons.forEach(btn => { if (selected.includes(btn.dataset.step)) { btn.classList.add('seq-selected'); btn.disabled = true; } else { btn.classList.remove('seq-selected'); btn.disabled = false; } });
          }
          buttons.forEach(btn => btn.addEventListener('click', () => { if (selected.length >= RECIPE_STEPS.length) return; selected.push(btn.dataset.step); update(); }));
          if (undoBtn) undoBtn.addEventListener('click', () => { if (selected.length) { selected.pop(); update(); } });
          if (resetBtn) resetBtn.addEventListener('click', () => { selected.length = 0; update(); });
        },
        on_finish: d => { const entered = captured || []; d.entered_sequence = entered; d.correct_positions = entered.filter((s, i) => s === d.correct_order[i]).length; d.kendall_tau = kendallTau(d.correct_order, entered); }
      }
    ];
  }

  /* ======================== TEACH A FRIEND ======================== */
  function buildTeachSomeone() {
    const hasMic = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');
    const intro = { type: T('jsPsychHtmlButtonResponse'), stimulus: `<h2>Teach a Friend / 友だちに教える</h2><p>Your friend has never cooked. Teach them how to make a pancake. / 料理をしたことのない友だちにパンケーキの作り方を教えてください。</p><p>Up to <b>60 seconds</b>. Press "Done" when finished. / 最大<b>60秒間</b>。終わったら「完了」を押してください。</p>`, choices: ['Begin / 開始'], data: { task: 'teach_intro', phase: 'post' } };
    const audioTrial = hasMic ? { type: T('jsPsychHtmlAudioResponse'), stimulus: `<div style="max-width:600px;margin:0 auto;text-align:center;"><div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;background:#fff8f8;"><div><p style="color:#333;font-size:16px;margin:0;">Teach a friend to make a pancake</p><p style="color:#888;font-size:14px;margin:8px 0 0 0;">Tools → Ingredients → Steps → Tips</p></div></div><p style="margin-top:12px;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 Teaching… up to 60s</p></div>`, recording_duration: 60000, show_done_button: true, done_button_label: 'Done / 完了', allow_playback: false, data: { task: 'teach_someone', phase: 'post', modality: 'audio', training_condition: assignedTrainingCondition, needs_audio_scoring: true }, on_finish: d => { d.audio_filename = `post_${currentPID}_teach.webm`; } } : null;
    const textTrial = { type: T('jsPsychSurveyText'), preamble: `<h3>Teach a Friend (Text)</h3><p>Teach a beginner how to make a pancake. / 初心者にパンケーキの作り方を教えてください。</p><div class="mic-error-msg"><b>Note:</b> Mic unavailable; type your answer.</div>`, questions: [{ prompt: '', name: 'teach', rows: 8, required: true }], data: { task: 'teach_someone', phase: 'post', modality: 'text', training_condition: assignedTrainingCondition } };
    const tl = [intro];
    if (hasMic) tl.push({ timeline: [audioTrial], conditional_function: () => microphoneAvailable });
    tl.push({ timeline: [textTrial], conditional_function: () => !microphoneAvailable });
    return tl;
  }

  /* ======================== LIKERT ======================== */
  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: `<h3>Training Feedback / トレーニングのフィードバック</h3><p style="color:#888;">(1 = Strongly disagree / 全くそう思わない, 5 = Strongly agree / 強くそう思う)</p>`,
      questions: [
        { prompt: 'I can remember the English words for cooking actions (e.g., crack, flip, slice).<br>料理の動作を表す英単語を覚えている。', labels: ['1','2','3','4','5'], required: true, name: 'recall_actions' },
        { prompt: 'I can remember the English words for ingredients and tools (e.g., flour, butter, bowl, pan).<br>材料や道具を表す英単語を覚えている。', labels: ['1','2','3','4','5'], required: true, name: 'recall_objects' },
        { prompt: 'The sounds in the training environment helped me learn the vocabulary.<br>トレーニング環境の音が語彙の学習に役立った。', labels: ['1','2','3','4','5'], required: true, name: 'sound_helpfulness' },
        { prompt: 'Some English words seemed to "sound like" what they mean (e.g., sizzle sounds like the noise).<br>英単語の中には、意味と音が結びついているように感じるものがあった。', labels: ['1','2','3','4','5'], required: true, name: 'iconicity_awareness' },
        { prompt: 'The training experience felt like a real cooking situation.<br>トレーニング体験は本当の料理の場面のように感じた。', labels: ['1','2','3','4','5'], required: true, name: 'immersion' },
        { prompt: 'I could explain the pancake-making procedure to someone else in English.<br>パンケーキの作り方を英語で他の人に説明できる。', labels: ['1','2','3','4','5'], required: true, name: 'procedural_confidence' },
        { prompt: 'If I had the chance to use this training again, I would want to.<br>もう一度このトレーニングを使う機会があれば、試してみたい。', labels: ['1','2','3','4','5'], required: true, name: 'willingness' }
      ],
      button_label: 'Submit / 送信',
      data: { task: 'likert_feedback', phase: 'post', training_condition: assignedTrainingCondition }
    };
  }

  /* ======================== EXIT ======================== */
  function buildExit() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Final Comments / 最終コメント</h3><p>Any comments or suggestions? / ご意見・ご要望はありますか？</p>`,
      questions: [
        { prompt: 'Were there any words you found especially easy or hard to remember? Why?<br>特に覚えやすかった、または覚えにくかった単語はありましたか？', name: 'word_difficulty', rows: 3, required: false },
        { prompt: 'Any other comments about the training or this test.<br>トレーニングやテストに関するその他のコメント。', name: 'comments', rows: 3, required: false }
      ],
      button_label: 'Finish / 完了',
      data: { task: 'exit_comments', phase: 'post', training_condition: assignedTrainingCondition }
    };
  }

  /* ======================== DATA SAVE ======================== */
  function saveData() {
    const pid = currentPID || 'unknown';
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `posttest_${pid}_${testCondition}_${ts}.json`;
    if (q.post) {
      try {
        fetch(q.post, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, condition: testCondition, training_condition: assignedTrainingCondition, data: jsPsych.data.get().values() }) })
          .then(() => console.log('[posttest] POSTed')).catch(err => console.error('[posttest] POST failed:', err));
      } catch (err) { console.error('[posttest] POST error:', err); }
    }
    try { jsPsych.data.get().localSave('json', filename); } catch (err) { console.error('[posttest] localSave failed:', err); }
    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `<div style="text-align:center;padding:40px;">
        <h2>✓ Post-test complete / ポストテスト完了</h2>
        <p><strong>Participant:</strong> ${pid} | <strong>Condition:</strong> ${assignedTrainingCondition} (${testCondition})</p>
        <p>Your responses have been saved. / 回答が保存されました。</p>
        <p>Thank you! / ご参加ありがとうございました。</p>
        <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
      </div>`;
    }
  }

  /* ======================== ENTRY ======================== */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';
    if (q.cond && ['VR', '2D', 'Text'].includes(q.cond)) assignedTrainingCondition = q.cond;
    console.log('[posttest] Starting — pid:', currentPID, 'phase:', testCondition, 'cond:', assignedTrainingCondition);
    document.querySelectorAll('.start').forEach(b => b.disabled = true);
    if (jsPsych && jsPsych.terminate) jsPsych.terminate();
    if (!document.getElementById('jspsych-target')) { const el = document.createElement('div'); el.id = 'jspsych-target'; document.body.appendChild(el); }
    addCustomStyles();
    jsPsych = T('initJsPsych')({ display_element: 'jspsych-target', show_progress_bar: true, message_progress_bar: 'Progress / 進捗', on_finish: saveData });
    window.jsPsych = jsPsych;
    (async () => {
      await validateAssets();
      try { jsPsych.data.addProperties({ missing_assets: [...MISSING_ASSETS.images, ...MISSING_ASSETS.audio] }); } catch {}
      jsPsych.run(buildTimeline());
    })();
  };

  /* ======================== TIMELINE ======================== */
  function buildTimeline() {
    const tl = [];
    tl.push({ timeline: [buildAssetCheckScreen()], conditional_function: () => (MISSING_ASSETS.images.length + MISSING_ASSETS.audio.length) > 0 });
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="text-align:left;max-width:680px;margin:0 auto;line-height:1.6"><h2 style="text-align:center;">Post-Test / ポストテスト</h2><ol style="margin:12px 0;"><li><b>Familiar tasks repeated from before training</b> — naming pictures, teaching a friend. These are repeated on purpose so we can measure what changed.<br><span style="color:#666;">トレーニング前と同じ課題（写真の命名、友だちに教える）。変化を測定するために繰り返します。</span></li><li style="margin-top:8px;"><b>New tasks you haven't seen before</b> — sound matching, memory questions about training, recipe ordering.<br><span style="color:#666;">新しい課題（音のマッチング、トレーニングについての質問、レシピの順番）。</span></li></ol><p>Please give your best effort even on the repeated parts — they're the most important data. / 繰り返しの部分でもベストを尽くしてください。</p><p style="color:#666;text-align:center;margin-top:18px;">Duration: ~25 minutes / 所要時間：約25分</p></div>`, choices: ['Begin / 開始'], data: { task: 'welcome' } });
    tl.push(createParticipantConfirm());
    tl.push(buildMicSetupGate());
    if (have('jsPsychInitializeMicrophone')) {
      tl.push({ timeline: [{ type: T('jsPsychInitializeMicrophone'), data: { task: 'mic_init' } }], conditional_function: () => microphoneAvailable });
    }
    tl.push(...buildProductionPractice());
    tl.push(...buildProductionBlock(PRODUCTION_CONTROLS, 'control'));
    tl.push(...buildProductionBlock(PRODUCTION_TARGETS, 'target'));
    tl.push(...buildReceptive4AFC());
    tl.push(...buildBindingTask());
    tl.push(...buildArrangementTask());
    // SFX recognition BEFORE foley — foley re-exposes every target SFX,
    // which would contaminate Y/N recognition memory if order were reversed.
    tl.push(...buildSFXRecognition());
    tl.push(...buildFoleyRecognition());
    tl.push(...buildSequencing());
    tl.push(...buildTeachSomeone());
    tl.push(buildLikert());
    tl.push(buildExit());
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<h2>All done! / 完了！</h2><p>Thank you for completing the post-test. / ポストテストを完了していただきありがとうございます。</p><p>Your data is being saved. / データを保存しています。</p>`, choices: ['Save & Finish / 保存して終了'], data: { task: 'session_end' } });
    return tl;
  }
})();