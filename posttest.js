// posttest.js — VR Post-Test Battery (v8.0 — REDESIGNED)
//
// ============================================================================
// v8.0 OVERVIEW (full redesign over v7.4)
// ============================================================================
//
// Pre/post comparability is the foundation. Word lists, two-pass production
// elicitation, parallel controls, and counterbalance stamping all match
// pretest v8.0 exactly. Anything that pre-teaches Group B targets before
// production (4AFC, speeded match, sequencing-with-targets) has been moved
// AFTER the production block or cut.
//
// PRIMARY DV: production intelligibility on iconicity-bearing phonemes,
//   measured pre→post across VR / 2D / Text training conditions.
//
// SECONDARY DV: form-selection (bare vs gerund) on action verbs, scored
//   post-hoc from Whisper transcripts on isolated-pass audio.
//
// TERTIARY DV: multi-probe binding test on `sizzle` (passive/implicit
//   iconic — never produced in training) — does spatial-acoustic affordance
//   in VR strengthen SFX-word binding even without participant articulation?
//
// ----------------------------------------------------------------------------
// STIMULUS DESIGN — synced with pretest v8.0
// ----------------------------------------------------------------------------
//
// PRODUCTION TARGETS (8) — same 8 as pretest. Pre→post change is the
// primary DV. All 8 pretested + posttested for every participant (no
// split-half).
//   ICONIC (3): crack, flip, slice
//   MARGINAL ICONIC (1): stir — form-selection secondary analysis
//   CONVENTIONAL (4): bowl, pan, flour, butter
//
// PARALLEL CONTROLS (4) — never trained, pretested + posttested for every
// participant. Pre→post change estimates testing/familiarization.
//   ICONIC: chop, peel
//   CONVENTIONAL: ladle, kettle
//
// PASSIVE/IMPLICIT ICONIC (1, NOT in production block):
//   sizzle 5.30 — never produced during training (it's the SFX consequence
//   of "butter the pan" or "heat the pan"). Tested in multi-probe binding
//   block ONLY. Posttest production for `sizzle` would test articulation
//   of a never-produced word, which is a baseline measure with no training
//   comparison possible.
//
// ----------------------------------------------------------------------------
// TASK ORDER (rationale: production first, anything that pre-teaches LAST)
// ----------------------------------------------------------------------------
//
//   1.  Asset launch-check (only if assets missing)
//   2.  Welcome
//   3.  Participant info — reads pid, stamps counterbalance for analysis
//   4.  Mic gate
//   5.  Mic plugin init (HOISTED to right after gate — fixes v7.4 mic bugs)
//   6.  Production practice (1 trial — same park scene as pretest)
//   7.  Production controls (chop, peel, ladle, kettle — phrase + isolated × 2)
//   8.  Production targets (all 8 — phrase + isolated × 2)
//   9.  Multi-probe binding task — sizzle and a few comparators
//   10. Foley recognition (trained sounds: cracking, flipping, slicing, sizzling)
//   11. Procedural recall (free-typing the recipe steps — KEEP from v7.4)
//   12. Sequencing (drag-to-order — KEEP from v7.4)
//   13. Blind retell (45s audio — KEEP)
//   14. Teach a friend (60s audio — KEEP)
//   15. Recognition + confidence (12 items: 8 trained + 4 distractors — TRIMMED)
//   16. Likert (KEEP)
//   17. Exit comments (KEEP)
//   18. Save
//
// CUT FROM v7.4:
//   - 4AFC ingredients/actions block — pre-teaches Group B targets
//   - Speeded word-picture match — pre-teaches AND tests recognition speed
//     (not addressing the hypothesis)
//   - Group A naming block (separate) — merged into single production block
//   - Naming Stage 3 scene description — replaced by spatial multi-probe
//   - Foley split into Group A + Group B — merged into single 4-item block
//   - 19-item recognition test — trimmed to 12 (8 trained + 4 foils)
//
// ============================================================================

(function () {
  /* ======================== GLOBAL / HELPERS ======================== */
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';   // set via __START_POSTTEST(pid, delayed)
  let assignedTrainingCondition = 'unknown';  // VR / 2D / Text — set via URL ?cond=
  let microphoneAvailable = false;
  let counterbalanceList = 0;        // hashed from pid; informational only

  // Track every asset URL that fails its HEAD check at startup, so the
  // launch-check screen can list them and every saved trial record can carry
  // the list for downstream analysis.
  let MISSING_ASSETS = { audio: [], images: [] };

  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#fff3cd"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#856404">Image missing</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#856404">trial recorded with placeholder</text></svg>')}`;
  const PLACEHOLDER_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];
  const ASSET_BUST = Math.floor(Math.random() * 100000);
  const q = Object.fromEntries(new URLSearchParams(location.search));

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

  // Counterbalance hash — same function as pretest v8.0 so trial data
  // matches across pre and post for any later split-half analysis.
  function pidToCounterbalance(pid) {
    const s = String(pid || 'unknown');
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2;
  }

  const shuffle = (arr) => {
    const c = arr.slice();
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
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

  /* ======================== STIMULI (synced to pretest v8.0) ======================== */
  // Production targets — IDENTICAL to pretest v8.0. Image filenames match.
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

  const PRODUCTION_CONTROLS = [
    { word: 'chop',   display: 'chopping', image: 'img/chopping.jpg', prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.50 },
    { word: 'peel',   display: 'peeling',  image: 'img/peeling.jpg',  prompt_type: 'action', iconic: true,  iconicity_marginal: false, target_form: 'bare', rating: 5.60 },
    { word: 'ladle',  display: 'ladle',    image: 'img/ladle.jpg',    prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.67 },
    { word: 'kettle', display: 'kettle',   image: 'img/kettle.jpg',   prompt_type: 'object', iconic: false, iconicity_marginal: false, target_form: 'bare', rating: 3.80 },
  ];

  // Foley recognition — 4 trained sounds. Each pairs the canonical SFX
  // from training with a 4AFC of action verbs. `sizzle` is uniquely
  // important here because it's the only iconic word the participant
  // never produced during training — its recognition is the cleanest
  // measure of passive multimodal binding.
  const FOLEY_RECOGNITION = [
    { audio: 'sounds/sfx_cracking.mp3', target: 'cracking', options: ['cracking', 'flipping', 'mixing', 'pouring'],   correct: 0, iconic: true, target_word: 'crack',  produced_in_training: true  },
    { audio: 'sounds/sfx_sizzling.mp3', target: 'sizzling', options: ['boiling', 'sizzling', 'pouring', 'cracking'],  correct: 1, iconic: true, target_word: 'sizzle', produced_in_training: false },
    { audio: 'sounds/sfx_flipping.mp3', target: 'flipping', options: ['stirring', 'cracking', 'flipping', 'slicing'], correct: 2, iconic: true, target_word: 'flip',   produced_in_training: true  },
    { audio: 'sounds/sfx_slicing.mp3',  target: 'slicing',  options: ['pouring', 'mixing', 'cracking', 'slicing'],    correct: 3, iconic: true, target_word: 'slice',  produced_in_training: true  },
  ];

  // Multi-probe binding task — focuses on SIZZLE (the unique passive-iconic
  // case) but tests two comparators (one produced-iconic, one conventional)
  // to anchor the measurement.
  //
  // Three probes per word:
  //   Probe 1 (Object association): "When you said/heard this word, what
  //     was happening?" 4-AFC scene options.
  //   Probe 2 (SFX recognition): "Did you hear this sound during training?"
  //     Yes/No + confidence.
  //   Probe 3 (Location): "Where did this happen?" — 3 schematic regions
  //     all conditions could have encoded (Ingredient / Cooking / Plating).
  //
  // Predicted: VR > 2D > Text on Probe 3 specifically (location), uniform
  // on 1 and 2. The location advantage is the spatial-affordance signal.
  const BINDING_PROBES = [
    {
      word: 'sizzle',
      iconic: true, produced: false,
      probe1_q: 'When you heard <b>sizzling</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>sizzling</b> という音を聞いたとき、何が起こっていましたか？',
      probe1_options: ['oil heating in the pan', 'water boiling on the stove', 'an egg cracking', 'flour falling into the bowl'],
      probe1_correct: 0,
      probe2_audio: 'sounds/sfx_sizzling.mp3',
      probe3_correct: 'cooking',
    },
    {
      word: 'crack',
      iconic: true, produced: true,
      probe1_q: 'When you said <b>crack</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>crack</b> と言ったとき、何が起こっていましたか？',
      probe1_options: ['butter melting in the pan', 'the egg breaking open', 'flour pouring into the bowl', 'milk being poured'],
      probe1_correct: 1,
      probe2_audio: 'sounds/sfx_cracking.mp3',
      probe3_correct: 'ingredient',
    },
    {
      word: 'bowl',
      iconic: false, produced: true,
      probe1_q: 'When you said <b>bowl</b> during training, what was happening?',
      probe1_q_jp: 'トレーニングで <b>bowl</b> と言ったとき、何が起こっていましたか？',
      probe1_options: ['pancake on a plate', 'pan heating on stove', 'ingredients combining', 'butter melting'],
      probe1_correct: 2,
      probe2_audio: null,  // bowl has no SFX — Probe 2 skipped for this word
      probe3_correct: 'ingredient',
    },
  ];

  // Recognition + confidence (TRIMMED from v7.4's 19 to 12 — 8 trained + 4 foils)
  const RECOGNITION_ITEMS = [
    // Trained iconic (4)
    { word: 'crack',   trained: true,  iconic: true,  rating: 5.40, role: 'target_iconic' },
    { word: 'flip',    trained: true,  iconic: true,  rating: 5.70, role: 'target_iconic' },
    { word: 'slice',   trained: true,  iconic: true,  rating: 5.27, role: 'target_iconic' },
    { word: 'stir',    trained: true,  iconic: true,  rating: 4.30, role: 'target_marginal' },
    // Trained conventional (4)
    { word: 'bowl',    trained: true,  iconic: false, rating: 3.00, role: 'target_arbitrary' },
    { word: 'pan',     trained: true,  iconic: false, rating: 3.45, role: 'target_arbitrary' },
    { word: 'flour',   trained: true,  iconic: false, rating: 3.00, role: 'target_arbitrary' },
    { word: 'butter',  trained: true,  iconic: false, rating: 3.50, role: 'target_arbitrary' },
    // Foils — 2 iconic + 2 conventional, untrained kitchen vocab
    { word: 'glug',    trained: false, iconic: true,  rating: 6.20, role: 'foil_iconic' },
    { word: 'splash',  trained: false, iconic: true,  rating: 6.09, role: 'foil_iconic' },
    { word: 'fork',    trained: false, iconic: false, rating: 3.90, role: 'foil_arbitrary' },
    { word: 'cup',     trained: false, iconic: false, rating: 3.83, role: 'foil_arbitrary' },
  ];

  // Recipe steps — used by procedural recall (free typing) AND sequencing
  // (drag-to-order). Note: sequencing IS pre-teaching exposure to recipe
  // structure, but it runs AFTER all production tasks, so it doesn't
  // contaminate primary DVs.
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
    return fetch(asset(url), { method: 'HEAD' })
      .then(r => r.ok)
      .catch(() => false);
  }

  async function validateAssets() {
    const allAudio = new Set();
    const allImages = new Set();
    for (const s of PRODUCTION_TARGETS) allImages.add(s.image);
    for (const s of PRODUCTION_CONTROLS) allImages.add(s.image);
    for (const s of FOLEY_RECOGNITION) allAudio.add(s.audio);
    for (const s of BINDING_PROBES) { if (s.probe2_audio) allAudio.add(s.probe2_audio); }
    allImages.add('img/park_scene.jpg');

    for (const url of allAudio) {
      try { if (!(await checkExists(url))) MISSING_ASSETS.audio.push(url); } catch {}
    }
    for (const url of allImages) {
      try { if (!(await checkExists(url))) MISSING_ASSETS.images.push(url); } catch {}
    }

    console.log(`[Validation] Missing: ${MISSING_ASSETS.images.length} images, ${MISSING_ASSETS.audio.length} audio.`);
    if (MISSING_ASSETS.images.length || MISSING_ASSETS.audio.length) {
      console.warn('[Validation] Missing images:', MISSING_ASSETS.images);
      console.warn('[Validation] Missing audio:', MISSING_ASSETS.audio);
    }
  }

  function buildAssetCheckScreen() {
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const imgList = MISSING_ASSETS.images.map(f => `<li style="margin:2px 0">🖼 <code>${f}</code></li>`).join('');
        const audList = MISSING_ASSETS.audio.map(f => `<li style="margin:2px 0">🔊 <code>${f}</code></li>`).join('');
        const total = MISSING_ASSETS.images.length + MISSING_ASSETS.audio.length;
        return `<div style="max-width:760px;margin:0 auto;text-align:left;line-height:1.6">
          <h2 style="color:#d32f2f;">⚠️ Asset Check — ${total} file${total === 1 ? '' : 's'} missing</h2>
          <p>Affected trials run with placeholders. Trial data carries a missing-assets list for analysis.</p>
          <ul style="font-family:monospace;font-size:13px;margin:8px 0 0 18px">${imgList}${audList}</ul></div>`;
      },
      choices: ['Abort', 'Continue (acknowledge) / 続行'],
      data: () => ({
        task: 'asset_check',
        missing_images: MISSING_ASSETS.images.slice(),
        missing_audio: MISSING_ASSETS.audio.slice()
      }),
      on_finish: (d) => {
        d.aborted = (d.response === 0);
        if (d.aborted) {
          try { jsPsych.endExperiment('<h2>Aborted</h2><p>Fix missing assets and reload.</p>'); } catch {}
        }
      }
    };
  }

  /* ======================== PARTICIPANT INFO (light) ======================== */
  // Posttest is shorter than pretest on demographics — we already have them
  // from pretest. Just confirm pid + condition.
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
            if (!form.checkValidity()) {
              e.preventDefault();
              e.stopImmediatePropagation();
              form.reportValidity();
              return;
            }
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
            pid: currentPID,
            training_condition: assignedTrainingCondition,
            counterbalance_list: counterbalanceList,
            test_phase: testCondition  // 'immediate' or 'delayed'
          });
        } catch {}
        console.log(`[posttest] pid=${currentPID}, condition=${assignedTrainingCondition}, counterbalance=${counterbalanceList}, phase=${testCondition}`);
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
          <p>Click <b>Enable Microphone</b> and allow access.</p>
          <p><b>マイクを有効化</b>を押して許可してください。</p>
          <div style="margin:16px 0;">
            <button class="jspsych-btn" id="mic-enable">🎙️ Enable Microphone / マイクを有効化</button>
          </div>
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
          } catch (err) {
            statusEl.textContent = 'Permission denied or unavailable ✖';
            window.__mic_ok = false;
          }
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
      loop_function: () => {
        const last = jsPsych.data.get().last(1).values()[0] || {};
        return !(microphoneAvailable || last.response === 1);
      }
    };
  }

  /* ======================== PRODUCTION BLOCK (synced with pretest v8.0) ======================== */
  // Same structure as pretest v8.0. Two-pass elicitation: phrase then
  // isolated, both with 2 reps. Audio filenames use phase='post' prefix
  // so analysts can pair pre/post by participant + word + pass.
  function buildProductionBlock(timelineItems, itemRole) {
    const hasMicPlugins = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');
    const canRecordAudio = () => hasMicPlugins && microphoneAvailable;

    const tl = [];

    const blockTitle = (itemRole === 'control') ? 'First Set / 第1セット' : 'Second Set / 第2セット';
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h3>${blockTitle}</h3>
        <p>You will see kitchen pictures. Say what you see in English.</p>
        <p>台所の写真を見て、英語で答えてください。</p>
        <p style="color:#666;">If you don't know a word, that's okay — guess or stay silent.</p>
        <p style="color:#666;">単語が分からない場合は、推測でも無言でも大丈夫です。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'production_block_intro', item_role: itemRole, phase: 'post' }
    });

    function phrasePrompt(promptType) {
      return promptType === 'action'
        ? { en: 'What is happening?', jp: '何をしていますか？' }
        : { en: 'What is this?',      jp: 'これは何ですか？' };
    }

    // PHRASE PASS
    const phraseAudio = hasMicPlugins ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const img = imgSrc(jsPsych.timelineVariable('image'));
        const p = phrasePrompt(jsPsych.timelineVariable('prompt_type'));
        return `<div style="text-align:center;">
          <img src="${img}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>
          <p style="margin-top:15px;font-size:18px;"><b>${p.en}</b></p>
          <p style="color:#666;">${p.jp}</p>
          <div style="margin-top:12px;background:#ffebee;border-radius:8px;padding:12px;">
            <p style="margin:0;color:#d32f2f;font-weight:bold;">🔴 Recording… 4 seconds / 録音中… 4秒</p>
          </div></div>`;
      },
      recording_duration: 4000, show_done_button: false, allow_playback: false,
      data: () => ({
        task: 'production_phrase',
        target_word: jsPsych.timelineVariable('word'),
        display_target: jsPsych.timelineVariable('display'),
        prompt_type: jsPsych.timelineVariable('prompt_type'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'),
        target_form: jsPsych.timelineVariable('target_form'),
        item_role: itemRole,
        pass: 'phrase',
        phase: 'post',
        modality: 'audio',
        training_condition: assignedTrainingCondition,
        counterbalance_list: counterbalanceList
      }),
      on_finish: (d) => {
        d.audio_filename = `post_${currentPID}_${itemRole}_${(d.target_word||'x').toLowerCase()}_phrase_rep${d.repetition||'?'}.wav`;
      }
    } : null;

    const phraseText = {
      type: T('jsPsychSurveyText'),
      preamble: () => {
        const img = imgSrc(jsPsych.timelineVariable('image'));
        const p = phrasePrompt(jsPsych.timelineVariable('prompt_type'));
        return `<div style="text-align:center;">
          <img src="${img}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>
          <p style="margin-top:15px;font-size:18px;"><b>${p.en}</b></p>
          <p style="color:#666;">${p.jp}</p>
          <div class="mic-error-msg" style="margin-top:10px"><b>Note:</b> Type your answer in English. / 英語で入力してください。</div></div>`;
      },
      questions: [{ prompt: '', name: 'response', rows: 1, required: false }],
      data: () => ({
        task: 'production_phrase',
        target_word: jsPsych.timelineVariable('word'),
        display_target: jsPsych.timelineVariable('display'),
        prompt_type: jsPsych.timelineVariable('prompt_type'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'),
        target_form: jsPsych.timelineVariable('target_form'),
        item_role: itemRole, pass: 'phrase', phase: 'post', modality: 'text',
        training_condition: assignedTrainingCondition,
        counterbalance_list: counterbalanceList
      })
    };

    // ISOLATED PASS
    const isolatedAudio = hasMicPlugins ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const img = imgSrc(jsPsych.timelineVariable('image'));
        return `<div style="text-align:center;">
          <img src="${img}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>
          <p style="margin-top:15px;font-size:18px;"><b>Say just the word.</b></p>
          <p style="color:#666;">単語だけを言ってください。</p>
          <div style="margin-top:12px;background:#fff3cd;border-radius:8px;padding:12px;">
            <p style="margin:0;color:#856404;font-weight:bold;">🔴 Recording… 3 seconds / 録音中… 3秒</p>
          </div></div>`;
      },
      recording_duration: 3000, show_done_button: false, allow_playback: false,
      data: () => ({
        task: 'production_isolated',
        target_word: jsPsych.timelineVariable('word'),
        display_target: jsPsych.timelineVariable('display'),
        prompt_type: jsPsych.timelineVariable('prompt_type'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'),
        target_form: jsPsych.timelineVariable('target_form'),
        item_role: itemRole, pass: 'isolated', phase: 'post', modality: 'audio',
        training_condition: assignedTrainingCondition,
        counterbalance_list: counterbalanceList
      }),
      on_finish: (d) => {
        d.audio_filename = `post_${currentPID}_${itemRole}_${(d.target_word||'x').toLowerCase()}_isolated_rep${d.repetition||'?'}.wav`;
      }
    } : null;

    const isolatedText = {
      type: T('jsPsychSurveyText'),
      preamble: () => {
        const img = imgSrc(jsPsych.timelineVariable('image'));
        return `<div style="text-align:center;">
          <img src="${img}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>
          <p style="margin-top:15px;font-size:18px;"><b>Type just the word.</b></p>
          <p style="color:#666;">単語だけを入力してください。</p>
          <div class="mic-error-msg" style="margin-top:10px"><b>Note:</b> One word only. / 1単語のみ。</div></div>`;
      },
      questions: [{ prompt: '', name: 'response', rows: 1, required: false }],
      data: () => ({
        task: 'production_isolated',
        target_word: jsPsych.timelineVariable('word'),
        display_target: jsPsych.timelineVariable('display'),
        prompt_type: jsPsych.timelineVariable('prompt_type'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        iconicity_marginal: jsPsych.timelineVariable('iconicity_marginal'),
        target_form: jsPsych.timelineVariable('target_form'),
        item_role: itemRole, pass: 'isolated', phase: 'post', modality: 'text',
        training_condition: assignedTrainingCondition,
        counterbalance_list: counterbalanceList
      })
    };

    if (hasMicPlugins) {
      tl.push({ timeline: [phraseAudio], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: canRecordAudio });
    }
    tl.push({ timeline: [phraseText], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: () => !canRecordAudio() });

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<p>Now we'll do the same pictures one more time. This time, please <b>say only the word</b> — no full sentence.</p>
        <p>同じ写真をもう一度見ます。今度は<b>単語だけ</b>を言ってください — 文章は不要です。</p>`,
      choices: ['Continue / 続行'],
      data: { task: 'production_pass_transition', item_role: itemRole, phase: 'post' }
    });

    if (hasMicPlugins) {
      tl.push({ timeline: [isolatedAudio], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: canRecordAudio });
    }
    tl.push({ timeline: [isolatedText], timeline_variables: timelineItems, randomize_order: true, repetitions: 2, conditional_function: () => !canRecordAudio() });

    return tl;
  }

  /* ======================== PRODUCTION PRACTICE ======================== */
  function buildProductionPractice() {
    const hasMicPlugins = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');
    const canRecordAudio = () => hasMicPlugins && microphoneAvailable;
    const practiceImg = `<img src="${imgSrc('img/park_scene.jpg')}" style="width:300px;border-radius:8px;" ${IMG_ONERROR}/>`;

    const tl = [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>Naming Task / 名前の課題</h2>
          <p>You will see pictures and answer in English. Some you'll know, some you may not — that's okay.</p>
          <p>写真を見て英語で答えてください。知らない単語があっても大丈夫です。</p>
          <p>For each picture you'll be asked: <b>"What is this?"</b> or <b>"What is happening?"</b></p>
          <p>各写真で <b>「これは何？」</b> または <b>「何をしている？」</b> と聞かれます。</p>
          <p style="color:#666;margin-top:15px;">Let's do one practice. / 練習を1問しましょう。</p>`,
        choices: ['Continue / 続行'],
        data: { task: 'production_practice_intro', phase: 'post' }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">${practiceImg}
          <p style="margin-top:15px;"><b>Practice:</b> What do you see?</p>
          <p>練習：何が見えますか？</p></div>`,
        choices: ['Start Practice Recording / 練習録音開始'],
        data: { task: 'production_practice_prepare', phase: 'post' }
      }
    ];

    if (hasMicPlugins) {
      tl.push({
        timeline: [{
          type: T('jsPsychHtmlAudioResponse'),
          stimulus: `<div style="text-align:center;">${practiceImg}
            <div style="margin-top:16px;background:#ffebee;border-radius:8px;padding:15px;">
              <p style="margin:0;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 PRACTICE Recording… / 練習録音中…</p>
              <p style="margin:8px 0;font-size:14px;">4 seconds!</p>
            </div></div>`,
          recording_duration: 4000, show_done_button: false, allow_playback: true,
          data: { task: 'production_practice_record', phase: 'post' }
        }],
        conditional_function: canRecordAudio
      });
    }

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h3 style="color:green">Practice Complete! / 練習完了！</h3>',
      choices: ['Continue / 続行'],
      data: { task: 'production_practice_done', phase: 'post' }
    });

    return tl;
  }

  /* ======================== MULTI-PROBE BINDING TASK ======================== */
  // Three probes per word in BINDING_PROBES. Each probe tests a different
  // type of binding: object/event association, SFX recognition, spatial
  // region. The location probe is the spatial-affordance signal.
  function buildBindingTask() {
    const tl = [];

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Memory Probes / 記憶のテスト</h2>
        <p>For each word, you'll answer a few short questions about what you experienced during training.</p>
        <p>各単語について、トレーニング中の経験に関する短い質問に答えてください。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'binding_intro', phase: 'post' }
    });

    BINDING_PROBES.forEach(probe => {
      // Probe 1: Object/event association (4-AFC)
      const opts1 = shuffle(probe.probe1_options.map((opt, i) => ({ text: opt, origIdx: i })));
      const correct1Idx = opts1.findIndex(o => o.origIdx === probe.probe1_correct);
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;max-width:600px;margin:0 auto;">
          <p style="font-size:18px;">${probe.probe1_q}</p>
          <p style="color:#666;font-size:14px;">${probe.probe1_q_jp}</p>
        </div>`,
        choices: opts1.map(o => o.text),
        data: {
          task: 'binding_probe1_event',
          word: probe.word,
          iconic: probe.iconic,
          produced_in_training: probe.produced,
          correct_answer: correct1Idx,
          options: opts1.map(o => o.text),
          training_condition: assignedTrainingCondition,
          phase: 'post'
        },
        on_finish: d => { d.is_correct = (d.response === d.correct_answer); }
      });

      // Probe 2: SFX recognition (Yes/No + confidence) — skip if no audio
      if (probe.probe2_audio) {
        tl.push({
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: `<div style="text-align:center;">
            <button class="jspsych-btn" id="binding-play" style="font-size:18px;">▶️ Play sound / 音を再生</button>
            <p id="binding-status" style="margin-top:10px;color:#666;">Listen, then answer.</p>
            <p style="margin-top:15px;font-size:18px;"><b>Did you hear this sound during training?</b></p>
            <p style="color:#666;">トレーニング中にこの音を聞きましたか？</p>
          </div>`,
          choices: ['Yes / はい', 'No / いいえ'],
          data: {
            task: 'binding_probe2_sfx',
            word: probe.word,
            iconic: probe.iconic,
            produced_in_training: probe.produced,
            audio_file: probe.probe2_audio,
            correct_answer: 0,  // all SFX in BINDING_PROBES were heard during training
            training_condition: assignedTrainingCondition,
            phase: 'post'
          },
          on_load: function () {
            const btn = document.getElementById('binding-play');
            const status = document.getElementById('binding-status');
            const audio = new Audio(audioSrc(probe.probe2_audio));
            const answerBtns = [...document.querySelectorAll('.jspsych-html-button-response-button button')];
            let unlocked = false;
            function lockAnswers(lock) { answerBtns.forEach(b => { b.disabled = lock; b.style.opacity = lock ? '0.5' : '1'; }); }
            function unlock() { if (!unlocked) { unlocked = true; lockAnswers(false); status.textContent = 'Choose Yes or No. / はい/いいえを選択。'; } }
            lockAnswers(true);
            audio.addEventListener('ended', () => { unlock(); btn.textContent = '🔁 Play Again / もう一度'; btn.disabled = false; });
            audio.addEventListener('error', () => { status.textContent = 'Audio missing — answer anyway'; unlock(); }, { once: true });
            btn.addEventListener('click', () => {
              status.textContent = 'Playing… / 再生中…';
              btn.disabled = true;
              audio.currentTime = 0;
              audio.play().catch(() => { status.textContent = 'Audio failed.'; unlock(); btn.disabled = false; });
            });
          },
          on_finish: d => { d.is_correct = (d.response === d.correct_answer); }
        });

        // Confidence
        tl.push({
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: '<p>How confident are you? / どのくらい確信がありますか？</p>',
          choices: ['1 (Guess)', '2', '3', '4 (Sure)'],
          data: { task: 'binding_probe2_confidence', word: probe.word, phase: 'post' },
          on_finish: d => { d.confidence = d.response !== null ? d.response + 1 : null; }
        });
      }

      // Probe 3: Location — three schematic regions
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;max-width:700px;margin:0 auto;">
          <p style="font-size:18px;"><b>Where in the kitchen did <em>${probe.word}</em> happen?</b></p>
          <p style="color:#666;">キッチンのどこで <em>${probe.word}</em> が起こりましたか？</p>
          <p style="color:#666;font-size:14px;margin-top:20px;">If you don't remember, choose the closest guess. / 覚えていない場合は、近いものを選んでください。</p>
        </div>`,
        choices: ['Ingredient Area / 材料エリア', 'Cooking Area / 調理エリア', 'Plating Area / 盛り付けエリア'],
        data: {
          task: 'binding_probe3_location',
          word: probe.word,
          iconic: probe.iconic,
          produced_in_training: probe.produced,
          correct_answer_label: probe.probe3_correct,
          training_condition: assignedTrainingCondition,
          phase: 'post'
        },
        on_finish: d => {
          const labelMap = ['ingredient', 'cooking', 'plating'];
          d.response_label = labelMap[d.response];
          d.is_correct = (d.response_label === d.correct_answer_label);
        }
      });
    });

    return tl;
  }

  /* ======================== FOLEY RECOGNITION (4 trained sounds) ======================== */
  function buildFoleyRecognition() {
    const tl = [];
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Sound Recognition / 音声認識</h2><p>Play each sound, then choose what action it represents.</p><p>音を再生し、どの動作か選択してください。</p>`,
      choices: ['Begin / 開始']
    });

    shuffle(FOLEY_RECOGNITION).forEach((stim, idx) => {
      const opts = shuffle(stim.options.map((o, i) => ({ text: o, origIdx: i })));
      const correctIdx = opts.findIndex(o => o.origIdx === stim.correct);

      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <button class="jspsych-btn" id="foley-play-${idx}" style="font-size:20px;">▶️ Play sound / 音を再生</button>
          <p id="foley-status-${idx}" style="margin-top:10px;color:#666;">Listen before answering.</p>
        </div>`,
        choices: opts.map(o => o.text),
        data: {
          task: 'foley_recognition',
          target: stim.target,
          target_word: stim.target_word,
          iconic: stim.iconic,
          produced_in_training: stim.produced_in_training,
          correct_answer: correctIdx,
          options: opts.map(o => o.text),
          audio_file: stim.audio,
          training_condition: assignedTrainingCondition,
          phase: 'post'
        },
        on_load: function () {
          const btn = document.getElementById(`foley-play-${idx}`);
          const status = document.getElementById(`foley-status-${idx}`);
          const audio = new Audio(audioSrc(stim.audio));
          window.__foley_audio = audio;
          const answerBtns = [...document.querySelectorAll('.jspsych-html-button-response-button button')];
          let unlocked = false;
          function lockAnswers(lock) { answerBtns.forEach(b => { b.disabled = lock; b.style.opacity = lock ? '0.5' : '1'; }); }
          function unlock() { if (!unlocked) { unlocked = true; lockAnswers(false); status.textContent = 'Choose. / 選択。'; } }
          lockAnswers(true);
          audio.addEventListener('ended', () => { unlock(); btn.textContent = '🔁 Play Again / もう一度'; btn.disabled = false; });
          audio.addEventListener('error', () => { status.textContent = 'Audio missing — answer anyway'; unlock(); }, { once: true });
          btn.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…';
            btn.disabled = true;
            audio.currentTime = 0;
            audio.play().catch(() => { status.textContent = 'Audio failed.'; unlock(); btn.disabled = false; });
          });
        },
        on_finish: d => {
          const a = window.__foley_audio;
          if (a) { try { a.pause(); a.src = ''; } catch {} window.__foley_audio = null; }
          d.is_correct = (d.response === d.correct_answer);
        }
      });
    });

    return tl;
  }

  /* ======================== PROCEDURAL RECALL ======================== */
  function buildProceduralRecall() {
    return [{
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Recipe Recall / レシピの想起</h3>
        <p>Explain the pancake-making steps you learned from the training.</p>
        <p>トレーニングで学んだパンケーキ作りの手順を説明してください。</p>
        <p style="color:#888;">Write one step per line, in order. / 1行に1つのステップを、順番に書いてください。</p>`,
      questions: RECIPE_STEPS.map((_, i) => ({
        prompt: `Step ${i + 1} / ステップ ${i + 1}:`,
        name: `step_${i + 1}`,
        rows: 2,
        required: i < RECIPE_STEPS.length - 1
      })),
      button_label: 'Submit / 送信',
      data: { task: 'procedural_recall', phase: 'post', training_condition: assignedTrainingCondition },
      on_finish: d => { d.steps = Object.values(asObject(d.response)); }
    }];
  }

  /* ======================== SEQUENCING ======================== */
  function buildSequencing() {
    let captured = null;

    return [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>Sequencing / 順序</h2>
          <p>Click the steps in the correct order. You can undo or reset.</p>
          <p>正しい順番でステップをクリックしてください。元に戻すこともリセットもできます。</p>`,
        choices: ['Start / 開始']
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          const display = shuffle(RECIPE_STEPS);
          let html = '<div style="text-align:center;"><h3>Select the steps in order / 順番に選択してください</h3>';
          html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
          display.forEach(s => { html += `<button class="jspsych-btn seq-btn" data-step="${s}" style="width:240px;">${s}</button>`; });
          html += '</div>';
          html += '<div style="margin-top:12px;">';
          html += '<button class="seq-undo-btn" id="seq-undo" disabled>↩ Undo / 元に戻す</button>';
          html += '<button class="seq-reset-btn" id="seq-reset" disabled>🔄 Reset / リセット</button>';
          html += '</div>';
          html += '<div id="seq-output" style="margin-top:20px;min-height:40px;color:#1565c0;font-weight:600;"></div></div>';
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
            if (selected.length === RECIPE_STEPS.length) {
              if (submit) { submit.disabled = false; submit.style.opacity = '1'; }
            } else {
              if (submit) { submit.disabled = true; submit.style.opacity = '0.5'; }
            }
            if (undoBtn) undoBtn.disabled = selected.length === 0;
            if (resetBtn) resetBtn.disabled = selected.length === 0;
            buttons.forEach(btn => {
              if (selected.includes(btn.dataset.step)) {
                btn.classList.add('seq-selected'); btn.disabled = true;
              } else {
                btn.classList.remove('seq-selected'); btn.disabled = false;
              }
            });
          }

          buttons.forEach(btn => btn.addEventListener('click', () => {
            if (selected.length >= RECIPE_STEPS.length) return;
            selected.push(btn.dataset.step);
            update();
          }));
          if (undoBtn) undoBtn.addEventListener('click', () => { if (selected.length) { selected.pop(); update(); } });
          if (resetBtn) resetBtn.addEventListener('click', () => { selected.length = 0; update(); });
        },
        on_finish: d => {
          const entered = captured || [];
          d.entered_sequence = entered;
          d.correct_positions = entered.filter((s, i) => s === d.correct_order[i]).length;
          d.kendall_tau = kendallTau(d.correct_order, entered);
        }
      }
    ];
  }

  /* ======================== BLIND RETELL (45s audio) ======================== */
  function buildBlindRetell() {
    const hasMic = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');

    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Blind Retell / 視覚なしで説明</h2>
        <p>Without any pictures, <b>explain how to make a pancake</b> from memory.</p>
        <p>画像なしで<b>パンケーキの作り方</b>を記憶から説明してください。</p>
        <p>You will have up to <b>45 seconds</b>. Press "Done" when finished.</p>
        <p>最大<b>45秒間</b>です。終わったら「完了」を押してください。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'blind_retell_intro', phase: 'post' }
    };

    const audioTrial = hasMic ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="max-width:600px;margin:0 auto;text-align:center;">
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;background:#fff8f8;">
          <div><p style="color:#333;font-size:16px;margin:0;">Explain how to make a pancake / パンケーキの作り方を説明</p>
          <p style="color:#888;font-size:14px;margin:8px 0 0 0;">Ingredients → Tools → Steps → Sounds</p></div>
        </div>
        <p style="margin-top:12px;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 Recording… up to 45s / 録音中… 最大45秒</p></div>`,
      recording_duration: 45000, show_done_button: true, done_button_label: 'Done / 完了', allow_playback: false,
      data: { task: 'blind_retell', phase: 'post', modality: 'audio', training_condition: assignedTrainingCondition, needs_audio_scoring: true },
      on_finish: d => { d.audio_filename = `post_${currentPID}_blind_retell.wav`; }
    } : null;

    const textTrial = {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Blind Retell (Text)</h3>
        <p>Explain how to make a pancake step by step.<br>パンケーキの作り方を順を追って説明してください。</p>
        <div class="mic-error-msg"><b>Note:</b> Mic unavailable; type your answer.</div>`,
      questions: [{ prompt: '', name: 'retell', rows: 8, required: true }],
      data: { task: 'blind_retell', phase: 'post', modality: 'text', training_condition: assignedTrainingCondition }
    };

    const tl = [intro];
    if (hasMic) {
      tl.push({ timeline: [audioTrial], conditional_function: () => microphoneAvailable });
    }
    tl.push({ timeline: [textTrial], conditional_function: () => !microphoneAvailable });
    return tl;
  }

  /* ======================== TEACH A FRIEND (60s audio) ======================== */
  function buildTeachSomeone() {
    const hasMic = have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');

    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Teach a Friend / 友だちに教える</h2>
        <p>Your friend has never cooked. Teach them how to make a pancake.</p>
        <p>料理をしたことのない友だちにパンケーキの作り方を教えてください。</p>
        <p>You have up to <b>60 seconds</b>. Press "Done" when finished.<br>最大<b>60秒間</b>。終わったら「完了」を押してください。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'teach_intro', phase: 'post' }
    };

    const audioTrial = hasMic ? {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="max-width:600px;margin:0 auto;text-align:center;">
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;background:#fff8f8;">
          <div><p style="color:#333;font-size:16px;margin:0;">Teach a friend to make a pancake / 友だちに教える</p>
          <p style="color:#888;font-size:14px;margin:8px 0 0 0;">Tools → Ingredients → Steps → Tips → Done check</p></div>
        </div>
        <p style="margin-top:12px;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 Teaching… up to 60s / 説明中… 最大60秒</p></div>`,
      recording_duration: 60000, show_done_button: true, done_button_label: 'Done / 完了', allow_playback: false,
      data: { task: 'teach_someone', phase: 'post', modality: 'audio', training_condition: assignedTrainingCondition, needs_audio_scoring: true },
      on_finish: d => { d.audio_filename = `post_${currentPID}_teach.wav`; }
    } : null;

    const textTrial = {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Teach a Friend (Text)</h3>
        <p>Teach a beginner how to make a pancake.<br>初心者にパンケーキの作り方を教えてください。</p>
        <div class="mic-error-msg"><b>Note:</b> Mic unavailable; type your answer.</div>`,
      questions: [{ prompt: '', name: 'teach', rows: 8, required: true }],
      data: { task: 'teach_someone', phase: 'post', modality: 'text', training_condition: assignedTrainingCondition }
    };

    const tl = [intro];
    if (hasMic) {
      tl.push({ timeline: [audioTrial], conditional_function: () => microphoneAvailable });
    }
    tl.push({ timeline: [textTrial], conditional_function: () => !microphoneAvailable });
    return tl;
  }

  /* ======================== RECOGNITION + CONFIDENCE (12 items) ======================== */
  function buildRecognition() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Recognition Test / 認識テスト</h2><p>Did this word appear in the training?</p><p>この単語はトレーニングに出てきましたか？</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'recognition_intro', phase: 'post' }
    };

    const trials = shuffle(RECOGNITION_ITEMS).flatMap(item => [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <div style="padding:28px;background:#f8f9fa;border-radius:12px;border:1px solid #ddd;"><h2 style="margin:0;">${item.word}</h2></div>
          <p style="margin-top:18px;">Did you encounter this word in the training?<br>トレーニングでこの単語に出会いましたか？</p></div>`,
        choices: ['YES', 'NO'],
        data: {
          task: 'recognition_test',
          word: item.word,
          trained: item.trained,
          iconic: item.iconic,
          iconicity_rating: item.rating,
          item_role: item.role,
          training_condition: assignedTrainingCondition,
          phase: 'post'
        },
        on_finish: d => {
          const yes = (d.response === 0);
          d.response_label = yes ? 'yes' : 'no';
          d.correct = (yes === d.trained);
        }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<p>How confident are you? / どのくらい確信がありますか？</p>',
        choices: ['1 (Guess)', '2', '3', '4 (Sure)'],
        data: { task: 'recognition_confidence', word: item.word, phase: 'post' },
        on_finish: d => { d.confidence = d.response !== null ? d.response + 1 : null; }
      }
    ]);

    return [intro, ...trials];
  }

  /* ======================== LIKERT ======================== */
  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: `<h3>Training Feedback / トレーニングのフィードバック</h3>
        <p>Rate your experience with the training. / トレーニングでの体験を評価してください。</p>
        <p style="color:#888;">(1 = Strongly disagree / 全くそう思わない, 5 = Strongly agree / 強くそう思う)</p>`,
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
        { prompt: 'Were there any words you found especially easy or hard to remember? Why?<br>特に覚えやすかった、または覚えにくかった単語はありましたか？その理由は？', name: 'word_difficulty', rows: 3, required: false },
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
        const payload = jsPsych.data.get().values();
        fetch(q.post, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid, condition: testCondition, training_condition: assignedTrainingCondition, data: payload })
        }).then(() => console.log('[posttest] Data POSTed')).catch(err => console.error('[posttest] POST failed:', err));
      } catch (err) { console.error('[posttest] POST error:', err); }
    }

    try { jsPsych.data.get().localSave('json', filename); } catch (err) { console.error('[posttest] localSave failed:', err); }

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `<div style="text-align:center;padding:40px;">
        <h2>✓ Post-test complete / ポストテスト完了</h2>
        <p><strong>Participant:</strong> ${pid}</p>
        <p><strong>Condition:</strong> ${assignedTrainingCondition} (${testCondition})</p>
        <p>Your responses have been saved.</p>
        <p>回答が保存されました。</p>
        <p>Thank you! / ご参加ありがとうございました。</p>
        <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
      </div>`;
    }
  }

  /* ======================== ENTRY ======================== */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';

    // URL ?cond=VR/2D/Text overrides; otherwise asked in confirm screen
    if (q.cond && ['VR', '2D', 'Text'].includes(q.cond)) {
      assignedTrainingCondition = q.cond;
    }

    console.log('[posttest] Starting — pid:', currentPID, 'phase:', testCondition, 'cond:', assignedTrainingCondition);

    document.querySelectorAll('.start').forEach(b => b.disabled = true);
    if (jsPsych && jsPsych.terminate) jsPsych.terminate();

    if (!document.getElementById('jspsych-target')) {
      const el = document.createElement('div');
      el.id = 'jspsych-target';
      document.body.appendChild(el);
    }

    addCustomStyles();

    jsPsych = T('initJsPsych')({
      display_element: 'jspsych-target',
      show_progress_bar: true,
      message_progress_bar: 'Progress / 進捗',
      on_finish: saveData
    });
    window.jsPsych = jsPsych;

    (async () => {
      await validateAssets();
      try {
        jsPsych.data.addProperties({
          missing_assets: [...MISSING_ASSETS.images, ...MISSING_ASSETS.audio]
        });
      } catch {}
      jsPsych.run(buildTimeline());
    })();
  };

  /* ======================== TIMELINE ======================== */
  function buildTimeline() {
    const tl = [];

    // Asset launch-check (only if missing)
    tl.push({
      timeline: [buildAssetCheckScreen()],
      conditional_function: () => (MISSING_ASSETS.images.length + MISSING_ASSETS.audio.length) > 0
    });

    // Welcome + participant confirm
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <h2>Post-Test / ポストテスト</h2>
        <p>This test measures what you learned in the training session.</p>
        <p>トレーニングセッションで学んだ内容を測定します。</p>
        <p style="color:#666;">Duration: ~25 minutes / 所要時間：約25分</p>
      </div>`,
      choices: ['Begin / 開始']
    });

    tl.push(createParticipantConfirm());

    // Mic gate + plugin init (HOISTED to right after gate to avoid the v7.4
    // double-prompt + late-init bugs)
    tl.push(buildMicSetupGate());
    if (have('jsPsychInitializeMicrophone')) {
      tl.push({
        timeline: [{
          type: T('jsPsychInitializeMicrophone'),
          data: { task: 'mic_init' },
          on_finish: (d) => { microphoneAvailable = !!d.mic_allowed; }
        }],
        conditional_function: () => microphoneAvailable
      });
    }

    // PRIMARY DV: production
    tl.push(...buildProductionPractice());
    tl.push(...buildProductionBlock(PRODUCTION_CONTROLS, 'control'));
    tl.push(...buildProductionBlock(PRODUCTION_TARGETS, 'target'));

    // TERTIARY DV: multi-probe binding (sizzle + comparators)
    tl.push(...buildBindingTask());

    // Foley recognition
    tl.push(...buildFoleyRecognition());

    // Procedural recall + sequencing (after production — these CAN
    // re-expose targets but production is already collected)
    tl.push(...buildProceduralRecall());
    tl.push(...buildSequencing());

    // Spontaneous-production tasks
    tl.push(...buildBlindRetell());
    tl.push(...buildTeachSomeone());

    // Recognition + Likert + Exit
    tl.push(...buildRecognition());
    tl.push(buildLikert());
    tl.push(buildExit());

    // Save
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>All done! / 完了！</h2>
        <p>Thank you for completing the post-test.</p>
        <p>ポストテストを完了していただきありがとうございます。</p>
        <p>Your data is being saved. / データを保存しています。</p>`,
      choices: ['Save & Finish / 保存して終了'],
      on_finish: () => saveData()
    });

    return tl;
  }
})();