/**
 * posttest.js — VR Post-Test Battery (CORRECTED v2)
 * GROUP B WORDS: sizzle, mix, stirring (iconic) + pour, butter, flour (arbitrary)
 *
 * CRITICAL FIXES in v2:
 *  1. FOURAFC_VERBS_ONLY & NAMING_VERBS_ONLY → false (must test ALL 6 words for balance)
 *  2. Fixed audio cleanup (closure variable, not `this`)
 *  3. Removed internal design notes from participant-facing screens
 *  4. Fixed conditional mic-skip timeline structure
 *  5. Standardized iconicity metadata across all trials
 *  6. Harmonized foil ratings with pretest (knife/salt → null)
 */
(function () {
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  const T = (name) => window[name];

  /* ---------- CONFIG ---------- */
  const SKIP_NAMING_IF_NO_MIC = true;

  // ⚠ CRITICAL: Both must be FALSE to maintain 3 iconic + 3 arbitrary balance
  const NAMING_VERBS_ONLY  = false;
  const NAMING_MAX_ITEMS   = 6;
  const FOURAFC_VERBS_ONLY = false;
  const FOURAFC_MAX_ITEMS  = 6;

  const PRACTICE_IMG = 'img/park_scene.jpg';
  const practiceImgHTML = `
    <img src="${PRACTICE_IMG}?v=${Math.random().toString(36).slice(2)}"
      alt="Practice scene" style="width:350px;height:auto;border-radius:8px;display:block;margin:0 auto;"
      onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{
        style:'width:350px;height:250px;background:#e0e0e0;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto;',
        innerText:'Park Scene (image missing)'}));" />`;

  /* ---------- Styling ---------- */
  const styleBlock = document.createElement('style');
  styleBlock.textContent = `
    .choice-grid{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;}
    .choice-card{width:220px;border:1px solid #ccc;border-radius:12px;padding:0;overflow:hidden;background:white;display:flex;flex-direction:column;align-items:center;box-shadow:0 3px 12px rgba(0,0,0,.08);transition:transform .15s ease;cursor:pointer;}
    .choice-card:hover{transform:translateY(-4px);}
    .choice-card img{width:100%;height:150px;object-fit:cover;display:block;}
    .choice-card span{display:block;width:100%;padding:10px 0;font-size:15px;font-weight:600;color:#1a237e;text-transform:capitalize;}
    .mic-error-msg{background-color:#ffebee;padding:20px;border-radius:8px;margin-top:20px;}
  `;
  document.head.appendChild(styleBlock);

  /* ---------- STIMULI ---------- */
  const PICTURES = [
    // GROUP B — post-test targets (iconic)
    { word: 'sizzling', category: 'process', iconic: true,  rating: 5.30, variants: ['img/sizzling_01.png', 'img/sizzling_02.png'] },
    { word: 'mixing',   category: 'action',  iconic: true,  rating: 5.10, variants: ['img/mixing_01.png',   'img/mixing_02.png'] },
    // NOTE: No stirring images exist on server — using mixing as visual proxy.
    // TODO: Upload stirring_01.png and stirring_02.png and restore original variants.
    { word: 'stirring', category: 'action',  iconic: true,  rating: 4.82, variants: ['img/mixing_01.png',   'img/mixing_02.png'] },
    // GROUP B — post-test targets (arbitrary)
    { word: 'pouring',  category: 'action',  iconic: false, rating: 3.60, variants: ['img/pouring_01.png',  'img/pouring_02.png'] },
    { word: 'butter',   category: 'ingredient', iconic: false, rating: 3.50, variants: ['img/butter_01.png', 'img/butter_02.png'] },
    { word: 'flour',    category: 'ingredient', iconic: false, rating: 3.00, variants: ['img/flour_01.png',  'img/flour_02.png'] },
    // Distractor images
    { word: 'pancake',  category: 'food',   iconic: null, rating: null, variants: ['img/pancake_01.png', 'img/pancake_02.png'] },
    { word: 'egg',      category: 'object', iconic: null, rating: null, variants: ['img/egg_01.png',     'img/egg_02.png'] },
  ];

  // Group B target word list (the 6 words that must all be tested)
  const GROUP_B_TARGETS = ['sizzling', 'mixing', 'stirring', 'pouring', 'butter', 'flour'];

  const AUDIO_VARIANTS = {
    sizzle: ['sounds/sizzle_1.mp3', 'sounds/sizzle_2.mp3'],
    // NOTE: No mix_1.mp3 or mix_2.mp3 on server — mix audio unavailable
    // TODO: Upload mix_1.mp3 and mix_2.mp3 to restore
    // mix:    ['sounds/mix_1.mp3',    'sounds/mix_2.mp3'],
    // NOTE: No stir_1.mp3 or stir_2.mp3 on server — stir audio unavailable
    // TODO: Upload stir_1.mp3 and stir_2.mp3 to restore
    // stir:   ['sounds/stir_1.mp3',   'sounds/stir_2.mp3'],
    pour:   ['sounds/pour_1.mp3',   'sounds/pour_2.mp3'],
    spread: ['sounds/spread_1.mp3', 'sounds/spread_2.mp3'],
  };

  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#e3f2fd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#1565c0">Image missing</text></svg>')}`;
  const PLACEHOLDER_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  // ALL 12 trained words + foils for transfer recognition
  const transfer_words = [
    // Group A — iconic (trained, pre-tested)
    { word: 'flip',    pos: 'verb', iconic: true,  rating: 5.70, type: 'target_iconic',    trained: true,  group: 'A' },
    { word: 'crack',   pos: 'verb', iconic: true,  rating: 5.40, type: 'target_iconic',    trained: true,  group: 'A' },
    { word: 'whisk',   pos: 'verb', iconic: true,  rating: 4.55, type: 'target_iconic',    trained: true,  group: 'A' },
    // Group B — iconic (trained, post-tested)
    { word: 'sizzle',   pos: 'verb', iconic: true,  rating: 5.30, type: 'target_iconic',    trained: true,  group: 'B' },
    { word: 'mix',      pos: 'verb', iconic: true,  rating: 5.10, type: 'target_iconic',    trained: true,  group: 'B' },
    { word: 'stirring', pos: 'verb', iconic: true,  rating: 4.82, type: 'target_iconic',    trained: true,  group: 'B' },
    // Group A — arbitrary (trained, pre-tested)
    { word: 'bowl',    pos: 'noun', iconic: false, rating: 3.00, type: 'target_arbitrary', trained: true,  group: 'A' },
    { word: 'spatula', pos: 'noun', iconic: false, rating: 3.91, type: 'target_arbitrary', trained: true,  group: 'A' },
    { word: 'pan',     pos: 'noun', iconic: false, rating: 3.45, type: 'target_arbitrary', trained: true,  group: 'A' },
    // Group B — arbitrary (trained, post-tested)
    { word: 'pour',    pos: 'verb', iconic: false, rating: 3.60, type: 'target_arbitrary', trained: true,  group: 'B' },
    { word: 'butter',  pos: 'noun', iconic: false, rating: 3.50, type: 'target_arbitrary', trained: true,  group: 'B' },
    { word: 'flour',   pos: 'noun', iconic: false, rating: 3.00, type: 'target_arbitrary', trained: true,  group: 'B' },
    // Foils — iconic (untrained)
    { word: 'glug',    pos: 'verb', iconic: true,  rating: 6.20, type: 'foil_iconic', trained: false, group: 'foil' },
    { word: 'splash',  pos: 'verb', iconic: true,  rating: 6.09, type: 'foil_iconic', trained: false, group: 'foil' },
    { word: 'drizzle', pos: 'verb', iconic: true,  rating: 6.00, type: 'foil_iconic', trained: false, group: 'foil' },
    // Foils — arbitrary (untrained) — ratings set to null for consistency with pretest
    { word: 'fork',  pos: 'noun', iconic: false, rating: 3.90, type: 'foil_arbitrary', trained: false, group: 'foil' },
    { word: 'cup',   pos: 'noun', iconic: false, rating: 3.83, type: 'foil_arbitrary', trained: false, group: 'foil' },
    { word: 'knife', pos: 'noun', iconic: false, rating: null,  type: 'foil_arbitrary', trained: false, group: 'foil' },
    { word: 'salt',  pos: 'noun', iconic: false, rating: null,  type: 'foil_arbitrary', trained: false, group: 'foil' },
  ];

  const foley_stimuli = [
    { audio: 'sizzle', options: ['pancake sizzling', 'stirring dry flour'], correct: 0 },
    // mix and stir audio files don't exist — trials removed
    // TODO: Restore when mix_1.mp3/mix_2.mp3 and stir_1.mp3/stir_2.mp3 are uploaded
    // { audio: 'mix',    options: ['mixing batter', 'pouring'],              correct: 0 },
    // { audio: 'stir',   options: ['stirring', 'cracking an egg'],           correct: 0 },
    { audio: 'pour',   options: ['pouring batter', 'flipping a pancake'],  correct: 0 },
    { audio: 'spread', options: ['spreading butter', 'pouring milk'],      correct: 0 },
  ];

  const sequence_steps = ['Crack eggs', 'Mix flour and eggs', 'Heat the pan', 'Pour batter on pan', 'Flip when ready'];

  /* ---------- helpers ---------- */
  const shuffle = (arr) => {
    const c = arr.slice();
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
  const choiceMap = Object.fromEntries(PICTURES.map(p => [p.word, p.variants]));
  const randomVariant = (m, k) => { const l = m[k]; return l?.length ? l[Math.floor(Math.random() * l.length)] : null; };
  const asObject = (x) => { if (!x) return {}; if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } } return typeof x === 'object' ? x : {}; };
  const pickImageSrc = (w) => {
    const src = randomVariant(choiceMap, w);
    if (!src) console.warn('[posttest] No image found for:', w);
    return src || PLACEHOLDER_IMG;
  };
  const pickAudioSrc = (k) => {
    const src = randomVariant(AUDIO_VARIANTS, k);
    if (!src) console.warn('[posttest] No audio found for:', k);
    return src || PLACEHOLDER_AUDIO;
  };

  function choiceButton(word, src) {
    return `<button class="choice-card" data-choice="${word}" aria-label="${word}">
      <img src="${src || PLACEHOLDER_IMG}" alt="${word}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
    </button>`;
  }

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

  /* ---------- Mic fallback ---------- */
  function micOrTextBlock(audioTrial, textPrompt, dataTag) {
    if (!microphoneAvailable) {
      return {
        type: T('jsPsychSurveyText'),
        preamble: `<h3>Speaking (Text Fallback)</h3><p>${textPrompt}</p>
          <div class="mic-error-msg"><b>Note:</b> Mic unavailable; type your answer.</div>`,
        questions: [{ prompt: 'Type here / ここに入力', name: 'typed_answer', rows: 6, required: true }],
        data: Object.assign({}, dataTag, { modality: 'text' })
      };
    }
    return Object.assign({}, audioTrial, { data: Object.assign({}, audioTrial.data || {}, dataTag, { modality: 'audio' }) });
  }

  /* ---------- Mic Gate ---------- */
  function buildMicSetupGate({ required = true } = {}) {
    const gate = {
      type: T('jsPsychHtmlButtonResponse'),
      choices: ['Continue / 続行', 'Use Text Only / 文字で続行'],
      button_html: [
        '<button class="jspsych-btn" id="mic-continue" disabled>%choice%</button>',
        '<button class="jspsych-btn" id="mic-textonly">%choice%</button>'
      ],
      stimulus: `
        <div style="max-width:720px;margin:0 auto;text-align:center;line-height:1.6">
          <h2>Microphone Setup / マイクの設定</h2>
          <p>Click <b>Enable Microphone</b> and allow access. Speak to test the level meter.</p>
          <p><b>マイクを有効化</b>を押して許可してください。</p>
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
              <li>Use <b>HTTPS</b> (required for mic)</li>
              <li>If in iframe, add <code>allow="microphone *"</code></li>
              <li>iOS/Safari: tap page first, then enable</li>
            </ul>
          </div>
        </div>`,
      data: { task: 'mic_gate' },
      on_load: () => {
        const enableBtn = document.getElementById('mic-enable');
        const contBtn = document.getElementById('mic-continue');
        const statusEl = document.getElementById('mic-status');
        const levelEl = document.getElementById('mic-level');

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
            contBtn.disabled = false;
            window.__mic_ok = true;
          } catch (err) {
            statusEl.textContent = 'Permission denied or unavailable ✖';
            window.__mic_ok = false;
          }
        }
        enableBtn.addEventListener('click', startStream);
        document.getElementById('mic-textonly').addEventListener('click', () => { window.__mic_ok = false; });
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
        return !(microphoneAvailable || last.button_pressed === 1);
      }
    };
  }

  /* ---------- Entry ---------- */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';
    console.log('[posttest] condition:', testCondition, 'PID:', currentPID);

    document.querySelectorAll('.start').forEach(b => b.disabled = true);
    jsPsych?.terminate?.();

    // Ensure display element exists
    if (!document.getElementById('jspsych-target')) {
      const el = document.createElement('div');
      el.id = 'jspsych-target';
      document.body.appendChild(el);
      console.warn('[posttest] Created missing #jspsych-target element');
    }

    jsPsych = T('initJsPsych')({
      display_element: 'jspsych-target',
      show_progress_bar: true,
      message_progress_bar: 'Progress / 進捗',
      on_finish: saveData
    });

    try { jsPsych.data.addProperties({ phase: 'post', pid: currentPID, condition: testCondition }); } catch {}
    jsPsych.run(buildTimeline(delayed));
  };

  /* ---------- Timeline ---------- */
  function buildTimeline(delayed) {
    const tl = [];

    // Preload
    const preloadImages = [...new Set(PICTURES.flatMap(p => p.variants))];
    preloadImages.push(PRACTICE_IMG);
    const preloadAudio = [...new Set(Object.values(AUDIO_VARIANTS).flat())];
    tl.push({
      type: T('jsPsychPreload'),
      auto_preload: false,
      images: preloadImages,
      audio: preloadAudio,
      message: 'Loading assets… / アセットを読み込み中…',
      continue_after_error: true,
      error_message: 'Some assets could not be loaded. The test will continue with available content.',
      max_load_time: 10000,
      on_error: (file) => { console.warn('[posttest] Preload failed for:', file); },
      on_finish: (data) => {
        if (data.failed_images?.length || data.failed_audio?.length) {
          console.warn('[posttest] Failed assets:', { images: data.failed_images, audio: data.failed_audio });
        }
      }
    });

    // Welcome
    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <h2>Post-Test / ポストテスト</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>This test measures what you learned in the training session.</p>
        <p>トレーニングセッションで学んだ内容を測定します。</p>
        <p style="color:#666;">Answer based on what you learned in training, not from the pre-test.</p>
      </div>`,
      choices: ['Begin / 開始']
    });

    tl.push(buildMicSetupGate({ required: true }));

    // Core tasks
    tl.push(...build4AFC(delayed));
    if (!delayed) tl.push(...buildSpeededMatch());
    tl.push(...buildProceduralRecall());
    if (!delayed) tl.push(...buildSequencing());
    tl.push(...buildFoley(delayed));
    tl.push(...buildNaming(delayed));
    if (!delayed) {
      const transfer = buildTransfer();
      tl.push(transfer.intro, ...transfer.trials);
    }
    tl.push(...buildBlindRetell());
    tl.push(...buildTeachSomeone());
    tl.push(buildLikert());
    tl.push(buildExit());
    return tl;
  }

  /* ---------- 4AFC (GROUP B — all 6 words) ---------- */
  function build4AFC() {
    let pool = PICTURES.filter(p => GROUP_B_TARGETS.includes(p.word));
    if (FOURAFC_VERBS_ONLY) pool = pool.filter(p => p.category === 'action' || p.category === 'process');
    if (FOURAFC_MAX_ITEMS && Number.isFinite(FOURAFC_MAX_ITEMS)) pool = shuffle(pool).slice(0, FOURAFC_MAX_ITEMS);

    const trials = pool.map(targetPic => {
      // Build foil set from other pictures
      const sameCategory = pool.filter(p => p.category === targetPic.category && p.word !== targetPic.word);
      let foils = sample(sameCategory, 3);
      if (foils.length < 3) {
        const extras = pool.filter(p => p.word !== targetPic.word && !foils.includes(p));
        foils = foils.concat(sample(extras, 3 - foils.length));
      }
      // Add distractor images if still short
      if (foils.length < 3) {
        const distractors = PICTURES.filter(p => !GROUP_B_TARGETS.includes(p.word) && !foils.includes(p));
        foils = foils.concat(sample(distractors, 3 - foils.length));
      }
      const choices = shuffle([targetPic, ...foils]).slice(0, 4);
      const labels = choices.map(c => c.word);
      const images = choices.map(c => pickImageSrc(c.word));
      const correctIndex = labels.indexOf(targetPic.word);

      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <h3 style="margin-bottom:20px;">Which picture is <em>${targetPic.word}</em>?<br>
          <span style="font-size:14px;">どの画像が「${targetPic.word}」ですか？</span></h3>
          <div class="choice-grid"></div>
        </div>`,
        choices: labels,
        button_html: labels.map((l, i) => choiceButton(l, images[i])),
        data: {
          task: '4afc', word: targetPic.word, choices: labels,
          correct: correctIndex, pid: currentPID, condition: testCondition,
          iconic: targetPic.iconic, iconicity_rating: targetPic.rating,
          word_group: 'B', phase: 'post'
        },
        on_finish: d => { d.is_correct = (d.response === d.correct); }
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Vocabulary Check / 語彙チェック</h2>
        <p>Select the picture that matches the word.</p>
        <p>単語に合う画像を選択してください。</p>`,
      choices: ['Start / 開始']
    }, ...trials];
  }

  /* ---------- Speeded match ---------- */
  function buildSpeededMatch() {
    const fixation = {
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: '<div style="font-size:60px;">+</div>',
      choices: 'NO_KEYS',
      trial_duration: 500
    };

    const groupBPics = PICTURES.filter(p => GROUP_B_TARGETS.includes(p.word));
    const combos = [];
    const shuffled = shuffle(groupBPics);

    shuffled.forEach(pic => {
      combos.push({ word: pic.word, match: true, src: pickImageSrc(pic.word), iconic: pic.iconic, rating: pic.rating });
      const foil = shuffled.find(p => p !== pic && p.category === pic.category);
      if (foil) combos.push({ word: pic.word, match: false, src: pickImageSrc(foil.word), iconic: pic.iconic, rating: pic.rating });
    });

    const trial = {
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: () => {
        const s = jsPsych.timelineVariable('stim');
        return `<div style="text-align:center;">
          <h3>${s.word.toUpperCase()}</h3>
          <div style="display:flex;justify-content:center;margin:18px 0;">
            <img src="${s.src}" alt="${s.word}" style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;"
              onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          </div>
          <p style="margin-top:12px;color:#666;">A = match / 一致, L = not match / 不一致</p>
        </div>`;
      },
      choices: ['a', 'l'],
      trial_duration: 3500,
      data: () => {
        const s = jsPsych.timelineVariable('stim');
        return {
          task: 'word_picture_speeded', word: s.word, match: s.match,
          correct_response: s.match ? 'a' : 'l',
          iconic: s.iconic, iconicity_rating: s.rating,
          pid: currentPID, condition: testCondition,
          word_group: 'B', phase: 'post'
        };
      },
      on_finish: d => { d.correct = (d.response === d.correct_response); }
    };

    const tv = shuffle(combos).slice(0, Math.min(combos.length, 2 * shuffled.length)).map(s => ({ stim: s }));
    return [
      { type: T('jsPsychHtmlButtonResponse'), stimulus: '<h2>Word → Picture (Speeded)</h2><p><b>A</b> = matches, <b>L</b> = does not match. A "+" appears between trials.</p>', choices: ['Begin / 開始'] },
      { timeline: [fixation, trial], timeline_variables: tv, randomize_order: true }
    ];
  }

  /* ---------- Procedural recall ---------- */
  function buildProceduralRecall() {
    return [{
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Recipe Recall / レシピの想起</h3>
        <p>Explain the pancake-making steps you learned from the training.</p>
        <p>トレーニングで学んだパンケーキ作りの手順を説明してください。</p>
        <p style="color:#888;">Write one step per line, in order.</p>`,
      questions: sequence_steps.map((_, i) => ({
        prompt: `Step ${i + 1}:`, name: `step_${i + 1}`, rows: 2, required: i < sequence_steps.length - 1
      })),
      button_label: 'Submit / 送信',
      data: { task: 'procedural_free', pid: currentPID, condition: testCondition, phase: 'post' },
      on_finish: d => { d.steps = Object.values(asObject(d.response)); }
    }];
  }

  /* ---------- Sequencing ---------- */
  function buildSequencing() {
    const shuffled = shuffle(sequence_steps);
    return [
      { type: T('jsPsychHtmlButtonResponse'), stimulus: '<h2>Sequencing / 順序</h2><p>Click the steps in the correct order. / 正しい順番でクリック。</p>', choices: ['Start / 開始'] },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          let html = '<div style="text-align:center;"><h3>Select the steps in order / 順番に選択</h3>';
          html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
          shuffled.forEach(s => { html += `<button class="jspsych-btn seq-btn" data-step="${s}" style="width:220px;">${s}</button>`; });
          html += '</div><div id="seq-output" style="margin-top:20px;min-height:40px;color:#1565c0;font-weight:600;"></div></div>';
          return html;
        },
        choices: ['Submit / 送信'],
        button_html: '<button class="jspsych-btn" id="seq-submit" disabled style="opacity:0.5;">%choice%</button>',
        data: { task: 'sequencing', correct_order: sequence_steps, pid: currentPID, condition: testCondition, phase: 'post' },
        on_load: () => {
          const buttons = Array.from(document.querySelectorAll('.seq-btn'));
          const output = document.getElementById('seq-output');
          const submit = document.getElementById('seq-submit');
          const selected = [];
          buttons.forEach(btn => {
            btn.addEventListener('click', () => {
              if (selected.length === sequence_steps.length) return;
              selected.push(btn.dataset.step);
              btn.disabled = true; btn.style.opacity = '0.4';
              output.textContent = selected.map((s, i) => `${i + 1}. ${s}`).join('  |  ');
              if (selected.length === sequence_steps.length) { submit.disabled = false; submit.style.opacity = '1'; }
            });
          });
        },
        on_finish: d => {
          const text = document.getElementById('seq-output')?.textContent || '';
          const entered = text.split('|').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
          d.entered_sequence = entered;
          d.correct_positions = entered.filter((s, i) => s === d.correct_order[i]).length;
          d.kendall_tau = kendallTau(d.correct_order, entered);
        }
      }
    ];
  }

  /* ---------- Foley (GROUP B sounds) ---------- */
  function buildFoley(delayed) {
    const pool = delayed ? foley_stimuli.slice(0, 3) : foley_stimuli;

    const trials = pool.map((stim, idx) => {
      const audioSrc = pickAudioSrc(stim.audio);
      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <button class="jspsych-btn" id="foley-play-${idx}">▶️ Play sound / 音を再生</button>
          <p id="foley-status-${idx}" style="margin-top:10px;color:#666;">Listen before answering.</p>
        </div>`,
        choices: stim.options,
        data: {
          task: 'foley', audio_key: stim.audio, correct: stim.correct,
          options: stim.options, pid: currentPID, condition: testCondition,
          audio_src: audioSrc, word_group: 'B', phase: 'post'
        },
        on_load: function () {
          const audio = new Audio(audioSrc);
          audio.loop = false;
          // Store via closure + window for cleanup
          window.__foley_audio = audio;

          const play = document.getElementById(`foley-play-${idx}`);
          const status = document.getElementById(`foley-status-${idx}`);

          play.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…';
            audio.currentTime = 0;
            audio.play().then(() => { setTimeout(() => { status.textContent = 'Choose the best option. / 答えを選択'; }, 500); })
              .catch(() => { status.textContent = 'Audio failed.'; });
          });
        },
        on_finish: (d) => {
          const a = window.__foley_audio;
          if (a) { try { a.pause(); a.currentTime = 0; a.src = ''; } catch {} }
          window.__foley_audio = null;
          d.is_correct = (d.response === d.correct);
        },
        post_trial_gap: 300
      };
    });

    return [
      { type: T('jsPsychHtmlButtonResponse'), stimulus: '<h2>Sound Recognition / 音声認識</h2><p>Play the sound, then choose what it represents.</p>', choices: ['Begin / 開始'] },
      ...trials
    ];
  }

  /* ---------- Picture naming (GROUP B — all 6 words, with practice) ---------- */
  function buildNaming() {
    let pool = PICTURES.filter(p => GROUP_B_TARGETS.includes(p.word));
    if (NAMING_VERBS_ONLY) pool = pool.filter(p => p.category === 'action' || p.category === 'process');
    if (NAMING_MAX_ITEMS && Number.isFinite(NAMING_MAX_ITEMS)) pool = shuffle(pool).slice(0, NAMING_MAX_ITEMS);

    const items = shuffle(pool).map(pic => ({
      target: pic.word, category: pic.category, image: pickImageSrc(pic.word),
      iconic: pic.iconic, rating: pic.rating
    }));

    const micInit = {
      type: T('jsPsychInitializeMicrophone'),
      data: { task: 'mic_init' },
      on_finish: (d) => { if (d.mic_allowed) microphoneAvailable = true; }
    };

    // Practice
    const practiceIntro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h3>Practice Recording / 録音練習</h3>
        <p>Let's practice with an unrelated image. / 関係のない画像で練習。</p>
        <div style="background:#e3f2fd;padding:15px;border-radius:8px;margin-top:20px;">
          <p><b>Describe in 4 seconds:</b> Objects / Actions / Sounds / Smells</p>
        </div>`,
      choices: ['Try Practice / 練習を試す'],
      data: { task: 'naming_practice_intro' }
    };

    const practicePrepare = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="max-width:520px;margin:0 auto;text-align:center;">
        ${practiceImgHTML}
        <div style="margin-top:20px;padding:15px;background:#fff3cd;border-radius:8px;">
          <p><b>Remember:</b> Objects, Actions, Sounds, Smells (4 seconds)</p>
        </div></div>`,
      choices: ['Start Practice Recording / 練習録音開始'],
      data: { task: 'naming_practice_prepare' }
    };

    const practiceRecord = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="max-width:520px;margin:0 auto;text-align:center;">
        ${practiceImgHTML}
        <div style="margin-top:16px;background:#ffebee;border-radius:8px;padding:15px;">
          <p style="margin:0;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 PRACTICE Recording… / 練習録音中…</p>
          <p style="margin:8px 0;font-size:14px;">4 seconds!</p>
        </div></div>`,
      recording_duration: 4000,
      show_done_button: false,
      allow_playback: true,
      data: { task: 'naming_practice_record' }
    };

    const practiceFeedback = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h3 style="color:green">Practice Complete! / 練習完了！</h3><p>Now the real task. / 次は本番です。</p>',
      choices: ['Begin Real Task / 本番開始'],
      data: { task: 'naming_practice_complete' }
    };

    const prepTrial = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const img = jsPsych.timelineVariable('image');
        return `<div style="max-width:520px;margin:0 auto;text-align:center;">
          <img src="${img}" alt="" style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;margin-bottom:12px;"
            onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          <div style="background:#fff3cd;padding:15px;border-radius:8px;margin-top:15px;">
            <p><b>Describe:</b> Objects, Actions, Sounds, Smells</p>
          </div>
          <p>Click when ready (4 seconds). / 準備ができたらクリック。</p>
        </div>`;
      },
      choices: ['Start Recording / 録音開始'],
      data: () => ({
        task: 'naming_prepare', target: jsPsych.timelineVariable('target'),
        category: jsPsych.timelineVariable('category'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        pid: currentPID, condition: testCondition,
        word_group: 'B', phase: 'post'
      })
    };

    const recordTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const img = jsPsych.timelineVariable('image');
        return `<div style="max-width:520px;margin:0 auto;text-align:center;">
          <img src="${img}" alt="" style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;margin-bottom:12px;"
            onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          <p style="margin-top:6px;color:#d32f2f;font-weight:bold;">
            🔴 Recording… Objects, Actions, Sounds, Smells (4s)<br/>
            録音中：物・動作・音・匂い（4秒）
          </p>
        </div>`;
      },
      recording_duration: 4000,
      show_done_button: false,
      allow_playback: false,
      post_trial_gap: 800,
      data: () => ({
        task: 'naming_audio', target: jsPsych.timelineVariable('target'),
        category: jsPsych.timelineVariable('category'),
        iconic: jsPsych.timelineVariable('iconic'),
        iconicity_rating: jsPsych.timelineVariable('rating'),
        pid: currentPID, condition: testCondition,
        word_group: 'B', phase: 'post',
        needs_audio_scoring: true
      })
    };

    // Wrap naming in conditional based on mic
    const namingBlock = {
      timeline: [
        {
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: `<h2>Picture Naming / 絵の説明</h2>
            <p>Describe the object, action, sounds, smells in English.</p>
            <p>英語で物・動作・音・匂いを説明してください。</p>`,
          choices: ['Continue / 続行']
        },
        practiceIntro, practicePrepare, practiceRecord, practiceFeedback,
        { timeline: [prepTrial, recordTrial], timeline_variables: items, randomize_order: true }
      ],
      conditional_function: () => microphoneAvailable
    };

    const skipMsg = {
      timeline: [{
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h3>Skipping Picture Naming</h3><p>Microphone not available. / マイクが利用できません。</p>',
        choices: ['Continue / 続行']
      }],
      conditional_function: () => SKIP_NAMING_IF_NO_MIC && !microphoneAvailable
    };

    return [micInit, namingBlock, skipMsg];
  }

  /* ---------- Transfer recognition ---------- */
  function buildTransfer() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Recognition Test / 認識テスト</h2>
        <p>Did this word appear in the training?</p>
        <p>この単語はトレーニングに出てきましたか？</p>`,
      choices: ['Begin / 開始']
    };

    const trials = transfer_words.flatMap(item => [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <div style="padding:28px;background:#f8f9fa;border-radius:12px;border:1px solid #ddd;">
            <h2 style="margin:0;">${item.word}</h2>
          </div>
          <p style="margin-top:18px;">Did you encounter this word in the training?<br>
          トレーニングでこの単語に出会いましたか？</p>
        </div>`,
        choices: ['YES', 'NO'],
        data: {
          task: 'transfer_test', word: item.word, trained: item.trained,
          type: item.type, pos: item.pos, iconic: item.iconic,
          iconicity_rating: item.rating, word_group: item.group,
          pid: currentPID, condition: testCondition, phase: 'post'
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
        data: { task: 'transfer_confidence', word: item.word, phase: 'post' },
        on_finish: d => { d.confidence = d.response !== null ? d.response + 1 : null; }
      }
    ]);

    return { intro, trials };
  }

  /* ---------- Blind Retell ---------- */
  function buildBlindRetell() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Blind Retell / 視覚なしで説明</h2>
        <p>Without any pictures, <b>explain how to make a pancake</b> from memory.</p>
        <p>画像なしで<b>パンケーキの作り方</b>を記憶から説明してください。</p>
        <p>You have <b>45 seconds</b>. / <b>45秒間</b>。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'blind_retell_intro' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;">
        <p style="color:#666;">(No visual cues / 視覚ヒントなし)</p>
      </div><p style="margin-top:10px;color:#d32f2f;font-weight:bold;">🔴 Recording… 45s</p>`,
      recording_duration: 45000, show_done_button: false, allow_playback: false, post_trial_gap: 800
    };

    return [intro, micOrTextBlock(audioTrial, 'Explain how to make a pancake step by step.', { task: 'blind_retell', pid: currentPID, condition: testCondition, phase: 'post', needs_audio_scoring: true })];
  }

  /* ---------- Teach Someone ---------- */
  function buildTeachSomeone() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Teach a Friend / 友だちに教える</h2>
        <p>Your friend has never cooked. Teach them how to make a pancake.</p>
        <p>料理をしたことのない友だちにパンケーキの作り方を教えてください。</p>
        <p>Include: tools, ingredients, key actions, safety/timing tips, success checks.</p>
        <p>You have <b>60 seconds</b>. / <b>60秒間</b>。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'teach_intro' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;">
        <p style="color:#666;">(No visual cues / 視覚ヒントなし)</p>
      </div><p style="margin-top:10px;color:#d32f2f;font-weight:bold;">🔴 Teaching… 60s</p>`,
      recording_duration: 60000, show_done_button: false, allow_playback: false, post_trial_gap: 800
    };

    return [intro, micOrTextBlock(audioTrial, 'Teach a beginner how to make a pancake.', { task: 'teach_someone', pid: currentPID, condition: testCondition, phase: 'post', needs_audio_scoring: true })];
  }

  /* ---------- Likert ---------- */
  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: `<h3>Training Feedback / トレーニングのフィードバック</h3>
        <p>Rate your experience. / 体験を評価してください。</p>
        <p style="color:#888;">(1 = Not at all / あてはまらない, 5 = Very much / とてもあてはまる)</p>`,
      questions: [
        { prompt: 'Did your vocabulary confidence increase? / 語彙に対する自信は高まりましたか？', labels: ['1', '2', '3', '4', '5'], required: true, name: 'confidence_vocab' },
        { prompt: 'How confident are you with the procedure? / 手順への自信は？', labels: ['1', '2', '3', '4', '5'], required: true, name: 'confidence_proc' },
        { prompt: 'How helpful was the training? / トレーニングはどの程度役立ちましたか？', labels: ['1', '2', '3', '4', '5'], required: true, name: 'helpfulness' }
      ],
      button_label: 'Submit / 送信',
      data: { task: 'likert_feedback', pid: currentPID, condition: testCondition, phase: 'post' }
    };
  }

  /* ---------- Exit ---------- */
  function buildExit() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: '<h3>Final Comments / 最終コメント</h3><p>Any comments, concerns, or suggestions? / ご意見・ご要望はありますか？</p>',
      questions: [{ prompt: 'Your comments / ご意見', name: 'comments', rows: 4, required: false }],
      button_label: 'Finish / 完了',
      data: { task: 'exit_comments', pid: currentPID, condition: testCondition, phase: 'post' }
    };
  }

  /* ---------- Save ---------- */
  function saveData() {
    const filename = `posttest_${currentPID}_${testCondition}.json`;
    try { jsPsych.data.get().localSave('json', filename); } catch (err) { console.error('[posttest] save failed:', err); }

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `<div style="text-align:center;padding:40px;">
        <h2>✓ Post-test complete / ポストテスト完了</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p style="margin-top:20px;">Your responses have been downloaded as JSON.</p>
        <p>Thank you! / ご参加ありがとうございました。</p>
        <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
      </div>`;
    }
  }
})();