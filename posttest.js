/**
 * posttest.js — jsPsych-only, aligned with VR post-test requirements.
 * Consolidated FIXED VERSION:
 * - Microphone setup gate (permission + level meter) + logged fallback
 * - Audio cleanup to prevent overlapping sounds
 * - Voice recording practice section with real image (preloaded)
 * - Clear, LEAK-FREE recipe recall instructions (no content hints)
 * - Audio loop prevention
 * - Speeded match uses A/L + fixation (parallel to LDT)
 * - Blind Retell (no visuals, 45s) and Teach Someone (no visuals, 60s)
 * - 4AFC & Foley correctness fields fixed (no overwrite)
 * - Phase tagging (phase:'post') for harmonized analysis
 * - Verbs-only options/caps for 4AFC & Naming; skip naming if no mic
 */
(function () {
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  const T = (name) => window[name];

  /* ---------- CONFIG SWITCHES ---------- */
  const SKIP_NAMING_IF_NO_MIC = true;   // if mic blocked, skip naming entirely (don’t pollute intelligibility)
  const NAMING_VERBS_ONLY      = true;   // only action/process words for naming
  const NAMING_MAX_ITEMS       = 6;      // cap number of naming trials
  const FOURAFC_VERBS_ONLY     = true;   // verbs-only pool for 4AFC
  const FOURAFC_MAX_ITEMS      = 6;      // cap number of 4AFC trials

  // practice image used in naming practice (actually shows)
  const PRACTICE_IMG = 'img/park_scene.jpg';
  const practiceImgHTML = `
    <img
      src="${PRACTICE_IMG}?v=${Math.random().toString(36).slice(2)}"
      alt="Practice scene"
      style="width:350px;height:auto;border-radius:8px;display:block;margin:0 auto;"
      onerror="this.onerror=null; this.replaceWith(
        Object.assign(document.createElement('div'),{
          style:'width:350px;height:250px;background:#e0e0e0;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto;',
          innerText:'Park Scene (image missing)'
        })
      );"
    />
  `;

  /* ---------- Styling (inject once) ---------- */
  const styleBlock = document.createElement('style');
  styleBlock.textContent = `
    .choice-grid { display:flex; flex-wrap:wrap; gap:18px; justify-content:center; }
    .choice-card { width: 220px; border:1px solid #ccc; border-radius:12px; padding:0; overflow:hidden; background:white; display:flex; flex-direction:column; align-items:center; gap:0; box-shadow:0 3px 12px rgba(0,0,0,0.08); transition:transform .15s ease; }
    .choice-card:hover { transform:translateY(-4px); }
    .choice-card img { width:100%; height:150px; object-fit:cover; display:block; }
    .choice-card span { display:block; width:100%; padding:10px 0; font-size:15px; font-weight:600; color:#1a237e; text-transform:capitalize; }
    .choice-card button { all:unset; width:100%; height:100%; cursor:pointer; }
    .choice-card-inner { width:100%; display:flex; flex-direction:column; align-items:center; }
    .mic-error-msg { background-color:#ffebee; padding:20px; border-radius:8px; margin-top:20px; }
  `;
  document.head.appendChild(styleBlock);

  /* ---------- Stimuli ---------- */
  const PICTURES = [
    { word: 'bowl',     category: 'object',     variants: ['img/bowl_01.png',     'img/bowl_02.png'] },
    { word: 'butter',   category: 'object',     variants: ['img/butter_01.png',   'img/butter_02.png'] },
    { word: 'cracking', category: 'action',     variants: ['img/cracking_01.png', 'img/cracking_02.png'] },
    { word: 'egg',      category: 'object',     variants: ['img/egg_01.png',      'img/egg_02.png'] },
    { word: 'flipping', category: 'action',     variants: ['img/flipping_01.png', 'img/flipping_02.png'] },
    { word: 'flour',    category: 'ingredient', variants: ['img/flour_01.png',    'img/flour_02.png'] },
    { word: 'milk',     category: 'ingredient', variants: ['img/milk_01.png',     'img/milk_02.png'] },
    { word: 'mixing',   category: 'action',     variants: ['img/mixing_01.png',   'img/mixing_02.png'] },
    { word: 'pan',      category: 'object',     variants: ['img/pan_01.png',      'img/pan_02.png'] },
    { word: 'pancake',  category: 'food',       variants: ['img/pancake_01.png',  'img/pancake_02.png'] },
    { word: 'pouring',  category: 'action',     variants: ['img/pouring_01.png',  'img/pouring_02.png'] },
    { word: 'sizzling', category: 'process',    variants: ['img/sizzling_01.png', 'img/sizzling_02.png'] },
    { word: 'spatula',  category: 'object',     variants: ['img/spatula_01.png',  'img/spatula_02.png'] },
    { word: 'sugar',    category: 'ingredient', variants: ['img/sugar_01.png',    'img/sugar_02.png'] },
    { word: 'whisk',    category: 'object',     variants: ['img/whisk_01.png',    'img/whisk_02.png'] },
  ];

  const AUDIO_VARIANTS = {
    crack:  ['sounds/crack_1.mp3',  'sounds/crack_2.mp3'],
    whisk:  ['sounds/whisk_1.mp3',  'sounds/whisk_2.mp3'],
    pour:   ['sounds/pour_1.mp3',   'sounds/pour_2.mp3'],
    sizzle: ['sounds/sizzle_1.mp3', 'sounds/sizzle_2.mp3'],
    flip:   ['sounds/flip_1.mp3',   'sounds/flip_2.mp3'],
    spread: ['sounds/spread_1.mp3', 'sounds/spread_2.mp3'],
  };

  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
      <rect width="320" height="240" fill="#e3f2fd"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="26" fill="#1565c0">Image missing</text>
    </svg>`)}`;

  const PLACEHOLDER_AUDIO =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  const transfer_words = [
    { word: 'sizzle', pos: 'verb',  iconic: true,  type: 'target_iconic',     trained: true  },
    { word: 'crack',  pos: 'verb',  iconic: true,  type: 'target_iconic',     trained: true  },
    { word: 'flip',   pos: 'verb',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'pour',   pos: 'verb',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'whisk',  pos: 'verb',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'bowl',   pos: 'noun',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'spatula',pos: 'noun',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'flour',  pos: 'noun',  iconic: false, type: 'target_arbitrary',  trained: true  },
    { word: 'glug',   pos: 'verb',  iconic: true,  type: 'foil_iconic',       trained: false },
    { word: 'splash', pos: 'verb',  iconic: true,  type: 'foil_iconic',       trained: false },
    { word: 'tss',    pos: 'interj',iconic: true,  type: 'foil_iconic',       trained: false },
    { word: 'fork',   pos: 'noun',  iconic: false, type: 'foil_true',         trained: false },
    { word: 'knife',  pos: 'noun',  iconic: false, type: 'foil_true',         trained: false },
    { word: 'salt',   pos: 'noun',  iconic: false, type: 'foil_true',         trained: false },
    { word: 'cup',    pos: 'noun',  iconic: false, type: 'foil_true',         trained: false },
  ];

  const foley_stimuli = [
    { audio: 'crack',  options: ['cracking an egg', 'whisking'],            correct: 0 },
    { audio: 'whisk',  options: ['whisking batter', 'pouring'],             correct: 0 },
    { audio: 'pour',   options: ['pouring batter', 'flipping a pancake'],   correct: 0 },
    { audio: 'sizzle', options: ['pancake sizzling', 'stirring dry flour'], correct: 0 },
    { audio: 'flip',   options: ['flipping pancake', 'cracking an egg'],    correct: 0 },
    { audio: 'spread', options: ['spreading butter', 'pouring milk'],       correct: 0 },
  ];

  const sequence_steps = [
    'Crack eggs', 'Mix flour and eggs', 'Heat the pan', 'Pour batter on pan', 'Flip when ready'
  ];

  /* ---------- helpers ---------- */
  const shuffle = (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
  const choiceMap = Object.fromEntries(PICTURES.map(p => [p.word, p.variants]));
  const randomVariant = (mapping, key) => {
    const list = mapping[key];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  };
  const asObject = (x) => {
    if (!x) return {};
    if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } }
    return (typeof x === 'object') ? x : {};
  };
  const pickImageSrc = (word) => randomVariant(choiceMap, word) || PLACEHOLDER_IMG;
  const pickAudioSrc = (key) => randomVariant(AUDIO_VARIANTS, key) || PLACEHOLDER_AUDIO;
  const isVerbLike = (pic) => pic?.category === 'action' || pic?.category === 'process';

  function choiceButton(word, src) {
    const displaySrc = src || PLACEHOLDER_IMG;
    return `
      <button class="choice-card" data-choice="${word}" aria-label="${word}">
        <img src="${displaySrc}" alt="${word}"
             onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
      </button>`;
  }

  function kendallTau(target, response) {
    let concordant = 0;
    let discordant = 0;
    for (let i = 0; i < target.length; i++) {
      for (let j = i + 1; j < target.length; j++) {
        const a = target[i], b = target[j];
        const ra = response.indexOf(a);
        const rb = response.indexOf(b);
        if (ra === -1 || rb === -1) continue;
        if (ra < rb) concordant++;
        else if (ra > rb) discordant++;
      }
    }
    const denom = concordant + discordant;
    return denom ? (concordant - discordant) / denom : 0;
  }

  /* ----- Mic fallback utility ----- */
  function micOrTextBlock(jspsychAudioTrial, textFallbackPrompt, dataTag) {
    if (!microphoneAvailable) {
      return {
        type: T('jsPsychSurveyText'),
        preamble: `<h3>Speaking (Text Fallback)</h3><p>${textFallbackPrompt}</p>
          <div class="mic-error-msg"><b>Note:</b> Mic unavailable, type your answer.</div>`,
        questions: [{prompt: 'Type here / ここに入力', name: 'typed_answer', rows: 6, required: true}],
        data: Object.assign({}, dataTag, { modality: 'text' })
      };
    }
    const trial = Object.assign({}, jspsychAudioTrial);
    trial.data = Object.assign({}, (jspsychAudioTrial.data||{}), dataTag, { modality: 'audio' });
    return trial;
  }

  /* ----- Microphone Setup Gate (permission + level meter) ----- */
  function buildMicSetupGate({ required = true } = {}) {
    let streamRef = null;

    const gate = {
      type: T('jsPsychHtmlButtonResponse'),
      choices: ['Continue / 続行', required ? 'Use Text Only / 文字で続行' : 'Skip'],
      button_html: [
        '<button class="jspsych-btn" id="mic-continue" disabled>%choice%</button>',
        '<button class="jspsych-btn" id="mic-textonly">%choice%</button>'
      ],
      stimulus: `
        <div style="max-width:720px;margin:0 auto;text-align:center;line-height:1.6">
          <h2>Microphone Setup / マイクの設定</h2>
          <p>Click <b>Enable Microphone</b> and allow access. Speak to test the level meter.</p>
          <p><b>マイクを有効化</b>を押して許可してください。話してテストしてください。</p>

          <div style="margin:16px 0;">
            <button class="jspsych-btn" id="mic-enable">🎙️ Enable Microphone / マイクを有効化</button>
          </div>

          <div id="mic-status" style="margin:10px 0;color:#666;">Status: not initialized</div>

          <div style="margin:10px auto;width:340px;height:14px;border-radius:7px;background:#eee;overflow:hidden;">
            <div id="mic-level" style="height:100%;width:0%;background:#4caf50;transition:width .08s linear;"></div>
          </div>

          <div style="background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:12px;text-align:left;margin-top:12px">
            <b>Troubleshooting</b>
            <ul style="margin:8px 0 0 18px">
              <li>Use <b>HTTPS</b> page (required for mic)</li>
              <li>If embedded in an <code>&lt;iframe&gt;</code>, add <code>allow="microphone *; camera *; autoplay *"</code></li>
              <li>On iOS/Safari: tap the page first (user gesture), then enable</li>
              <li>If blocked, check site permissions in the address bar</li>
            </ul>
          </div>
        </div>
      `,
      data: { task: 'mic_gate' },
      on_load: () => {
        const enableBtn  = document.getElementById('mic-enable');
        const contBtn    = document.getElementById('mic-continue');
        const textOnly   = document.getElementById('mic-textonly');
        const statusEl   = document.getElementById('mic-status');
        const levelEl    = document.getElementById('mic-level');

        async function startStream() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true }
            });
            streamRef = stream;

            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);

            const data = new Uint8Array(analyser.fftSize);
            function tick() {
              analyser.getByteTimeDomainData(data);
              let sum = 0;
              for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;
                sum += v * v;
              }
              const rms = Math.sqrt(sum / data.length);
              const pct = Math.min(100, Math.max(0, Math.round(rms * 220)));
              levelEl.style.width = pct + '%';
              requestAnimationFrame(tick);
            }
            tick();

            statusEl.textContent = 'Status: microphone enabled ✔';
            contBtn.disabled = false;
            window.__mic_ok = true;
          } catch (err) {
            console.error('[mic] getUserMedia error:', err);
            statusEl.textContent = 'Status: permission denied or device unavailable ✖';
            contBtn.disabled = true;
            window.__mic_ok = false;
          }
        }

        enableBtn.addEventListener('click', startStream);
        textOnly.addEventListener('click', () => { window.__mic_ok = false; });

        window.addEventListener('beforeunload', () => {
          try { streamRef?.getTracks()?.forEach(t => t.stop()); } catch {}
        });
      },
      on_finish: () => {
        microphoneAvailable = !!window.__mic_ok;
        try { jsPsych.data.addProperties({ mic_available: microphoneAvailable }); } catch {}
      }
    };

    return {
      timeline: [gate],
      loop_function: () => {
        if (!required) return false;
        const last = jsPsych.data.get().last(1).values()[0] || {};
        const pressedIndex = last.button_pressed; // "0" Continue, "1" Text-only
        if (microphoneAvailable || pressedIndex === 1) return false;
        return true;
      }
    };
  }

  /* ---------- Entry ---------- */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';
    console.log('[posttest] Starting condition:', testCondition, 'PID:', currentPID);

    document.querySelectorAll('.start').forEach(btn => btn.disabled = true);
    jsPsych?.terminate?.();

    jsPsych = T('initJsPsych')({
      display_element: 'jspsych-target',
      show_progress_bar: true,
      message_progress_bar: 'Progress / 進捗',
      on_finish: saveData
    });

    // Tag dataset for downstream analysis
    try { jsPsych.data.addProperties({ phase: 'post', pid: currentPID, condition: testCondition }); } catch {}

    jsPsych.run(buildTimeline(delayed));
  };

  window.addEventListener('beforeunload', () => {
    try { jsPsych?.terminate?.(); } catch {}
  });

  /* ---------- Timeline ---------- */
  function buildTimeline(delayed) {
    const tl = [];

    // preload all assets
    let preloadImages = [...new Set(PICTURES.flatMap(p => p.variants))];
    preloadImages.push(PRACTICE_IMG); // Practice image for naming
    const preloadAudio = [...new Set(Object.values(AUDIO_VARIANTS).flat())];
    tl.push({
      type: T('jsPsychPreload'),
      auto_preload: false,
      images: preloadImages,
      audio: preloadAudio,
      message: 'Loading images and sounds…'
    });

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <h2>VR Post-Test</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>This session measures recall, retention, and pronunciation.</p>
        <div style="background:#fff3cd;padding:15px;border-radius:8px;margin-top:20px;max-width:600px;margin:20px auto;">
          <p><b>Important:</b> Answer based on what you learned in the training session, not from the pre-test.</p>
          <p><b>重要:</b> プリテストではなく、トレーニングセッションで学んだ内容に基づいて回答してください。</p>
        </div>
      </div>`,
      choices: ['Begin / 開始']
    });

    // Require mic (or explicit text-only fallback) before speaking tasks
    tl.push(buildMicSetupGate({ required: true }));

    // Tasks
    tl.push(...build4AFC(delayed));
    if (!delayed) tl.push(...buildSpeededMatch());
    tl.push(...buildProceduralRecall());
    if (!delayed) tl.push(...buildSequencing());
    tl.push(...buildFoley(delayed));
    tl.push(...buildNaming(delayed));
    if (!delayed) {
      const transfer = buildTransfer();
      tl.push(transfer.intro);
      tl.push(...transfer.trials);
    }

    // No-visual speaking tasks
    tl.push(...buildBlindRetell());
    tl.push(...buildTeachSomeone());

    tl.push(buildLikert());
    tl.push(buildExit());
    return tl;
  }

  /* ----- 4AFC (verbs-only + cap supported) ----- */
  function build4AFC(delayed) {
    let pool = delayed ? PICTURES.slice(0, 6) : PICTURES.slice();
    if (FOURAFC_VERBS_ONLY) pool = pool.filter(isVerbLike);
    if (FOURAFC_MAX_ITEMS && Number.isFinite(FOURAFC_MAX_ITEMS)) {
      pool = shuffle(pool).slice(0, Math.min(FOURAFC_MAX_ITEMS, pool.length));
    }

    const trials = pool.map(targetPic => {
      const sameCategory = pool.filter(p => p.category === targetPic.category && p.word !== targetPic.word);
      let foils = sample(sameCategory, 3);
      if (foils.length < 3) {
        const extras = pool.filter(p => p.word !== targetPic.word && !foils.includes(p));
        foils = foils.concat(sample(extras, 3 - foils.length));
      }
      const choices = shuffle([targetPic, ...foils]).slice(0, 4);
      const labels = choices.map(c => c.word);
      const images = choices.map(c => pickImageSrc(c.word));
      const buttonHtml = labels.map((label, idx) => choiceButton(label, images[idx]));
      const correctIndex = labels.indexOf(targetPic.word);

      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <h3 style="margin-bottom:20px;">Which picture is <em>${targetPic.word}</em>?</h3>
          <div class="choice-grid"></div>
        </div>`,
        choices: labels,
        button_html: buttonHtml,
        data: { task: '4afc', word: targetPic.word, choices: labels, correct: correctIndex, pid: currentPID, condition: testCondition },
        on_finish: data => {
          const idx = data.correct; // index stored earlier
          data.correct_index = idx;
          data.is_correct = (data.response === idx);
        }
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Vocabulary Check</h2><p>Select the picture that matches the word.</p>',
      choices: ['Start']
    }, ...trials];
  }

  /* ----- Speeded match (A/L + fixation) ----- */
  function buildSpeededMatch() {
    const fixation = {
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: '<div style="font-size:60px;">+</div>',
      choices: 'NO_KEYS',
      trial_duration: 500
    };

    const combos = [];
    const shuffled = shuffle(PICTURES);
    shuffled.forEach(pic => {
      const srcTrue = pickImageSrc(pic.word);
      combos.push({ word: pic.word, match: true, src: srcTrue });
      const foil = shuffled.find(p => p !== pic && p.category === pic.category);
      if (foil) {
        const srcFalse = pickImageSrc(foil.word);
        combos.push({ word: pic.word, match: false, src: srcFalse });
      }
    });

    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <h2>Word → Picture (Speeded)</h2>
        <p><b>A</b> = matches the word, <b>L</b> = does not match</p>
        <p>Between trials you will see <b>+</b>.</p>`,
      choices: ['Begin']
    };

    const trial = {
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: () => {
        const stim = jsPsych.timelineVariable('stim');
        return `<div style="text-align:center;">
          <h3>${stim.word.toUpperCase()}</h3>
          <div style="display:flex;justify-content:center;margin:18px 0;">
            <img src="${stim.src}" alt="${stim.word}"
              style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;"
              onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          </div>
          <p style="margin-top:12px;color:#666;">A = match, L = not match</p>
        </div>`;
      },
      choices: ['a', 'l'],
      trial_duration: 3500,
      data: () => {
        const stim = jsPsych.timelineVariable('stim');
        return {
          task: 'word_picture_speeded',
          word: stim.word,
          match: stim.match,
          correct_response: stim.match ? 'a' : 'l',
          pid: currentPID,
          condition: testCondition
        };
      },
      on_finish: d => { d.correct = (d.response === d.correct_response); }
    };

    const tv = shuffle(combos)
      .slice(0, Math.min(combos.length, 2 * shuffled.length))
      .map(stim => ({ stim }));

    return [
      intro,
      { timeline: [fixation, trial], timeline_variables: tv, randomize_order: true }
    ];
  }

  /* ----- Procedural recall (LEAK-FREE PREAMBLE) ----- */
  function buildProceduralRecall() {
    const formatHint = `
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;">Need a format hint? / フォーマットのヒント</summary>
        <div style="margin-top:8px;">
          <p>Use time-order words and write one step per line. (No example content shown.)</p>
          <ul style="text-align:left;margin-top:6px;">
            <li><i>First, …</i></li>
            <li><i>Then, …</i></li>
            <li><i>Next, …</i></li>
            <li><i>Finally, …</i></li>
          </ul>
        </div>
      </details>`;

    return [{
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Recipe Recall / レシピの想起</h3>
        <p><b>Important:</b> Explain the pancake-making steps you learned from the training (no pictures will be shown here).</p>
        <p><b>重要:</b> トレーニングで学んだパンケーキ作りの手順を説明してください（ここでは画像は表示されません）。</p>
        <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:16px 0;">
          <p>Write <b>one step per line</b>, in order. Do <b>not</b> copy any example steps.</p>
          <p><b>Note:</b> Base your answer on what you learned in the training, NOT on the pre-test.</p>
        </div>
        ${formatHint}`,
      questions: sequence_steps.map((_, i) => ({
        prompt: `Step ${i + 1}:`,
        name: `step_${i + 1}`,
        rows: 2,
        required: i < sequence_steps.length - 1
      })),
      button_label: 'Submit',
      data: { task: 'procedural_free', pid: currentPID, condition: testCondition },
      on_finish: data => { data.steps = Object.values(asObject(data.response)); }
    }];
  }

  /* ----- Sequencing ----- */
  function buildSequencing() {
    const shuffled = shuffle(sequence_steps);
    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sequencing</h2><p>Click the steps in the correct order.</p>',
      choices: ['Start']
    }, {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        let html = '<div style="text-align:center;"><h3>Select the steps in order</h3>';
        html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
        shuffled.forEach(step => {
          html += `<button class="jspsych-btn seq-btn" data-step="${step}" style="width:220px;">${step}</button>`;
        });
        html += '</div><div id="seq-output" style="margin-top:20px;min-height:40px;color:#1565c0;font-weight:600;"></div></div>';
        return html;
      },
      choices: ['Submit'],
      button_html: '<button class="jspsych-btn" id="seq-submit" disabled style="opacity:0.5;">%choice%</button>',
      data: { task: 'sequencing', correct_order: sequence_steps, pid: currentPID, condition: testCondition },
      on_load: () => {
        const buttons = Array.from(document.querySelectorAll('.seq-btn'));
        const output = document.getElementById('seq-output');
        const submit = document.getElementById('seq-submit');
        const selected = [];
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            if (selected.length === sequence_steps.length) return;
            selected.push(btn.dataset.step);
            btn.disabled = true;
            btn.style.opacity = '0.4';
            output.textContent = selected.map((s, i) => `${i + 1}. ${s}`).join('  |  ');
            if (selected.length === sequence_steps.length) {
              submit.disabled = false;
              submit.style.opacity = '1';
            }
          });
        });
      },
      on_finish: data => {
        const text = document.getElementById('seq-output')?.textContent || '';
        const entered = text.split('|').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        data.entered_sequence = entered;
        data.correct_positions = entered.filter((step, i) => step === data.correct_order[i]).length;
        data.kendall_tau = kendallTau(data.correct_order, entered);
      }
    }];
  }

  /* ----- Foley recognition WITH AUDIO CLEANUP ----- */
  function buildFoley(delayed) {
    const pool = delayed ? foley_stimuli.slice(0, 3) : foley_stimuli;
    const trials = pool.map((stim, idx) => {
      const audioSrc = pickAudioSrc(stim.audio);
      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <button class="jspsych-btn" id="play-${idx}">▶️ Play sound</button>
          <p id="status-${idx}" style="margin-top:10px;color:#666;">Listen before answering.</p>
        </div>`,
        choices: stim.options,
        data: { task: 'foley', audio_key: stim.audio, correct: stim.correct, options: stim.options, pid: currentPID, condition: testCondition, audio_src: audioSrc },
        on_load: function() {
          const audio = new Audio(audioSrc);
          audio.loop = false; // Prevent looping
          const play = document.getElementById(`play-${idx}`);
          const status = document.getElementById(`status-${idx}`);
          this._audioRef = audio;

          play.addEventListener('click', () => {
            status.textContent = 'Playing…';
            audio.currentTime = 0;
            audio.play().then(() => {
              setTimeout(() => status.textContent = 'Choose the best option.', 500);
            }).catch(() => status.textContent = 'Audio failed (placeholder).');
          });
        },
        on_finish: function(data) {
          const audio = this._audioRef;
          if (audio) {
            try { audio.pause(); audio.currentTime = 0; audio.src = ''; } catch(e) {}
          }
          const correctIndex = data.correct;
          data.correct_index = correctIndex;
          data.is_correct = (data.response === correctIndex);
        },
        post_trial_gap: 300
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sound Recognition</h2><p>Play the sound, then choose what it represents.</p>',
      choices: ['Begin']
    }, ...trials];
  }

  /* ----- Picture naming (verbs-only + cap + practice image + conditional skip) ----- */
  function buildNaming(delayed) {
    let pool = delayed ? PICTURES.slice(0, 6) : PICTURES.slice();
    if (NAMING_VERBS_ONLY) pool = pool.filter(isVerbLike);
    if (NAMING_MAX_ITEMS && Number.isFinite(NAMING_MAX_ITEMS)) {
      pool = shuffle(pool).slice(0, Math.min(NAMING_MAX_ITEMS, pool.length));
    }
    const items = shuffle(pool).map(pic => ({
      target: pic.word,
      category: pic.category,
      image: pickImageSrc(pic.word)
    }));

    // Microphone initialization with error handling (secondary safety net)
    const micInit = {
      type: T('jsPsychInitializeMicrophone'),
      data: { task: 'mic_init' },
      on_finish: (d) => {
        if(d.mic_allowed) microphoneAvailable = true;
      },
      on_load: function() {
        setTimeout(() => {
          if (!microphoneAvailable) {
            const display = document.getElementById('jspsych-content');
            if (display && !display.querySelector('.mic-error-msg')) {
              const errorMsg = document.createElement('div');
              errorMsg.className = 'mic-error-msg';
              errorMsg.innerHTML = `
                <p style="color:#c62828;"><b>Microphone access required</b></p>
                <p>Please allow microphone access and reload the page if needed.</p>
                <p>マイクアクセスが必要です。許可してページを再読み込みしてください。</p>`;
              display.appendChild(errorMsg);
            }
          }
        }, 3000);
      }
    };

    // Practice section introduction
    const practiceIntro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:600px;margin:0 auto;">
          <h3>Practice Recording / 録音練習</h3>
          <p>Let's practice with an example image unrelated to cooking.</p>
          <p>料理と関係のない画像で練習しましょう。</p>
          
          <div style="background:#e3f2fd;padding:15px;border-radius:8px;margin-top:20px;">
            <p><b>What to describe in 4 seconds:</b></p>
            <ul style="text-align:left;">
              <li>Objects you see / 見える物体</li>
              <li>Actions happening / 起きている動作</li>
              <li>Sounds you imagine / 想像される音</li>
              <li>Smells you imagine / 想像される匂い</li>
            </ul>
          </div>
          
          <p style="margin-top:20px;"><b>Example:</b> "I see trees and grass. People walking. Birds chirping sounds. Fresh air smell."</p>
        </div>`,
      choices: ['Try Practice / 練習を試す'],
      data: { task: 'picture_naming_practice_intro' }
    };

    // Practice prepare (uses real image)
    const practicePrepare = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:520px;margin:0 auto;text-align:center;">
          <div style="background:#f0f4f8;padding:20px;border-radius:10px;margin-bottom:20px;">
            <p style="margin:0;font-size:18px;color:#333;">
              <b>Practice: Describe this park scene</b><br>
              <span style="font-size:14px;">練習：この公園の場面を説明してください</span>
            </p>
          </div>
          ${practiceImgHTML}
          <div style="margin-top:20px;padding:15px;background:#fff3cd;border-radius:8px;">
            <p><b>Remember:</b> Objects, Actions, Sounds, Smells (4 seconds)</p>
          </div>
        </div>`,
      choices: ['Start Practice Recording / 練習録音開始'],
      data: { task: 'picture_naming_practice_prepare' }
    };

    // Practice recording (uses real image)
    const practiceRecord = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `
        <div style="max-width:520px;margin:0 auto;text-align:center;">
          ${practiceImgHTML}
          <div style="margin-top:16px;background:#ffebee;border-radius:8px;padding:15px;">
            <p style="margin:0;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 PRACTICE Recording... / 練習録音中...</p>
            <p style="margin:8px 0;font-size:14px;">4 seconds to describe!</p>
          </div>
        </div>`,
      recording_duration: 4000,
      show_done_button: false,
      allow_playback: true,
      data: { task: 'picture_naming_practice_record' }
    };

    // Practice feedback
    const practiceFeedback = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:600px;margin:0 auto;">
          <h3 style="color:green">Practice Complete! / 練習完了！</h3>
          <p>Good! Now you'll do the same with cooking-related pictures.</p>
          <p>よくできました！次は料理関連の画像で同じことをします。</p>
          
          <div style="background:#e8f5e9;padding:15px;border-radius:8px;margin-top:20px;">
            <p><b>Remember for the real task:</b></p>
            <ul style="text-align:left;">
              <li>You have only 4 seconds / 4秒間のみ</li>
              <li>Describe what you see and imagine / 見えるものと想像するものを説明</li>
              <li>Speak clearly in English / 英語ではっきりと話す</li>
            </ul>
          </div>
        </div>`,
      choices: ['Begin Real Task / 本番開始'],
      data: { task: 'picture_naming_practice_complete' }
    };

    // Main task trials
    const prepTrial = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const img = jsPsych.timelineVariable('image');
        const word = jsPsych.timelineVariable('target');
        return `<div style="max-width:520px;margin:0 auto;text-align:center;">
          <img src="${img}" alt="${word}"
              style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;margin-bottom:12px;"
              onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          <div style="background:#fff3cd;padding:15px;border-radius:8px;margin-top:15px;">
            <p><b>Remember to describe:</b> Objects, Actions, Sounds, Smells</p>
          </div>
          <p>Click "Start recording" when you are ready (4 seconds).</p>
        </div>`;
      },
      choices: ['Start recording / 録音開始'],
      data: {
        task: 'naming_prepare',
        target: () => jsPsych.timelineVariable('target'),
        category: () => jsPsych.timelineVariable('category'),
        pid: currentPID,
        condition: testCondition
      }
    };

    const recordTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const img = jsPsych.timelineVariable('image');
        const word = jsPsych.timelineVariable('target');
        return `<div style="max-width:520px;margin:0 auto;text-align:center;">
          <img src="${img}" alt="${word}"
              style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;margin-bottom:12px;"
              onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          <p style="margin-top:6px;color:#d32f2f;font-weight:bold;">
            🔴 Recording… describe the object, action, sounds, smells in English.<br/>
            録音中：物・動作・音・匂いを英語で説明してください。（4秒）
          </p>
        </div>`;
      },
      recording_duration: 4000,
      show_done_button: false,
      allow_playback: false,
      post_trial_gap: 800,
      data: {
        task: 'naming_audio',
        target: () => jsPsych.timelineVariable('target'),
        category: () => jsPsych.timelineVariable('category'),
        pid: currentPID,
        condition: testCondition
      },
      on_finish: data => {
        data.needs_audio_scoring = true;
        data.rubric_score = null;
      }
    };

    const namingBlock = {
      timeline: [
        {
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: `<div style="text-align:center;">
            <h2>Picture Naming</h2>
            <p>Describe the object, action, sounds, smells in English.<br>
               英語で物・動作・音・匂いを説明してください。</p>
            <p style="color:#666;">First, let's practice with an example.</p>
          </div>`,
          choices: ['Continue / 続行']
        },
        practiceIntro,
        practicePrepare,
        practiceRecord,
        practiceFeedback,
        { timeline: [prepTrial, recordTrial], timeline_variables: items, randomize_order: true }
      ]
    };

    return [
      micInit,
      {
        timeline: [namingBlock],
        conditional_function: () => !(SKIP_NAMING_IF_NO_MIC && !microphoneAvailable)
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="max-width:640px;margin:0 auto;text-align:center;">
          <h3>Skipping Picture Naming</h3>
          <p>Microphone access was not granted, so the picture-naming section is skipped.</p>
          <p>マイクの許可がないため、絵の説明セクションをスキップします。</p>
        </div>`,
        choices: ['Continue / 続行'],
        conditional_function: () => SKIP_NAMING_IF_NO_MIC && !microphoneAvailable
      }
    ];
  }

  /* ----- Transfer recognition ----- */
  function buildTransfer() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Recognition Test</h2><p>Did this word appear in the VR training?</p>',
      choices: ['Begin']
    };

    const trials = transfer_words.flatMap(item => ([
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <div style="padding:28px;background:#f8f9fa;border-radius:12px;border:1px solid #ddd;">
            <h2 style="margin:0;">${item.word}</h2>
          </div>
          <p style="margin-top:18px;">Did you encounter this word in the VR training?</p>
        </div>`,
        choices: ['YES', 'NO'],
        data: { task: 'transfer_test', word: item.word, trained: item.trained, type: item.type, pos: item.pos, iconic: item.iconic, pid: currentPID, condition: testCondition },
        on_finish: data => {
          const yes = (data.response === 0);
          data.response_label = yes ? 'yes' : 'no';
          data.correct = (yes === data.trained);
        }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<p>How confident are you?</p>',
        choices: ['1 (Guess)', '2', '3', '4 (Sure)'],
        data: { task: 'transfer_confidence', word: item.word },
        on_finish: data => { data.confidence = (data.response ?? null) !== null ? (data.response + 1) : null; }
      }
    ]));

    return { intro, trials };
  }

  /* ----- Blind Retell (no visuals, 45s) ----- */
  function buildBlindRetell() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:650px;margin:0 auto;text-align:center;">
          <h2>Blind Retell / 視覚なしで説明</h2>
          <p>Without any pictures, <b>explain how to make a pancake</b> from memory.</p>
          <p>画像なしで<b>パンケーキの作り方</b>を記憶から説明してください。</p>
          <p>You will have <b>45 seconds</b>.</p>
        </div>`,
      choices: ['Begin / 開始'],
      data: { task: 'blind_retell_intro' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;">
          <p style="color:#666;">(No visual cues / 視覚ヒントなし)</p>
        </div>
        <p style="margin-top:10px;color:#d32f2f;font-weight:bold;">🔴 Recording… 45s</p>`,
      recording_duration: 45000,
      show_done_button: false,
      allow_playback: false,
      post_trial_gap: 800
    };

    const textPrompt = `Explain how to make a pancake step by step. Use time order words (first, then, next...).`;

    return [
      intro,
      micOrTextBlock(audioTrial, textPrompt, { task: 'blind_retell', pid: currentPID, condition: testCondition, needs_audio_scoring: true })
    ];
  }

  /* ----- Teach Someone (no visuals, 60s) ----- */
  function buildTeachSomeone() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="max-width:680px;margin:0 auto;text-align:center;">
          <h2>Teach a Friend / 友だちに教える</h2>
          <p>Your friend has never cooked. Teach them how to make a pancake so they can succeed.</p>
          <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:left;">
            <ul style="margin:0 0 0 1em;">
              <li>Tools & ingredients</li><li>Key actions (crack, mix, pour, flip)</li>
              <li>Safety/timing tips</li><li>Success check (bubbles, golden color)</li>
            </ul>
          </div>
          <p>You will have <b>60 seconds</b>.</p>
        </div>`,
      choices: ['Begin / 開始'],
      data: { task: 'teach_intro' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;">
          <p style="color:#666;">(No visual cues / 視覚ヒントなし)</p>
        </div>
        <p style="margin-top:10px;color:#d32f2f;font-weight:bold;">🔴 Teaching… 60s</p>`,
      recording_duration: 60000,
      show_done_button: false,
      allow_playback: false,
      post_trial_gap: 800
    };

    const textPrompt = `Teach a beginner how to make a pancake (tools, ingredients, actions, tips, success checks).`;

    return [
      intro,
      micOrTextBlock(audioTrial, textPrompt, { task: 'teach_someone', pid: currentPID, condition: testCondition, needs_audio_scoring: true })
    ];
  }

  /* ----- Likert feedback ----- */
  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: `<h3>Language Training Feedback / 言語トレーニングに関するフィードバック</h3>
        <p>Please rate your experience with the text/2D/VR training.<br>
           テキスト／2D／VRトレーニングについて、以下の項目を評価してください。<br>
           <small>(1 = Not at all / あてはまらない, 5 = Very much / とてもあてはまる)</small></p>`,
      questions: [
        {
          prompt: 'Did your confidence in the vocabulary increase?<br>語彙に対する自信は高まりましたか？',
          labels: ['1 = Not at all / あてはまらない', '2', '3', '4', '5 = Very much / とてもあてはまる'],
          required: true,
          name: 'confidence_vocab'
        },
        {
          prompt: 'How confident are you with the learning procedure?<br>学習手順についてどの程度自信がありますか？',
          labels: ['1 = Not at all / あてはまらない', '2', '3', '4', '5 = Very much / とてもあてはまる'],
          required: true,
          name: 'confidence_proc'
        },
        {
          prompt: 'How helpful was the training for your language learning?<br>このトレーニングは語学学習にどの程度役立ちましたか？',
          labels: ['1 = Not at all / あてはまらない', '2', '3', '4', '5 = Very much / とてもあてはまる'],
          required: true,
          name: 'helpfulness'
        }
      ],
      button_label: 'Submit / 送信',
      data: { task: 'likert_feedback', pid: currentPID, condition: testCondition }
    };
  }

  /* ----- Final comments ----- */
  function buildExit() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: '<h3>Final Comments</h3><p>Please share your experience with the training. Do you have any comments, concerns, or suggestions?</p>',
      questions: [{ prompt: 'Your comments / ご意見', name: 'comments', rows: 4, required: false }],
      button_label: 'Finish',
      data: { task: 'exit_comments', pid: currentPID, condition: testCondition }
    };
  }

  /* ----- Save & download ----- */
  function saveData() {
    const filename = `posttest_${currentPID}_${testCondition}.json`;
    try {
      jsPsych.data.get().localSave('json', filename);
      console.log('[posttest] Data saved as', filename);
    } catch (err) {
      console.error('[posttest] localSave failed:', err);
    }

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <h2>✓ Post-test complete</h2>
          <p><strong>Participant:</strong> ${currentPID}</p>
          <p><strong>Condition:</strong> ${testCondition}</p>
          <p style="margin-top:20px;">A JSON file with your responses has been downloaded automatically.</p>
          <p>Thank you for participating! ご参加ありがとうございました。</p>
          <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
        </div>`;
    }
  }
})();
