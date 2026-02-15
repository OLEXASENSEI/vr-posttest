/**
 * posttest.js — VR Post-Test Battery (CORRECTED v5)
 * GROUP B WORDS: sizzle, mix, stir (iconic) + pour, butter, flour (arbitrary)
 *
 * v5 FIXES (from v4):
 *  1. Blind Retell: Added preparation step with "Start Recording" button
 *     before recording begins (previously jumped straight to recording after
 *     intro, leaving participants confused by "(No visual cues)" screen)
 *  2. Likert: Reworded VR reuse question to be conditional ("If you had the
 *     chance...") so it works for both VR and non-VR conditions
 *  3. Mic gate: Applied same button-filtering fix as pretest v4 (filter out
 *     stimulus-embedded #mic-enable from jspsych-btn query)
 *  4. Mic gate loop_function: Fixed to use response instead of button_pressed
 *     (jsPsych 7 compatibility)
 *  5. Foley on_load: Added null guards for DOM elements
 *
 * v4 FIXES retained:
 *  1. Stirring images: Now uses stirring_01.png/02.png
 *  2. Mix/stir audio: Added to AUDIO_VARIANTS
 *  3. Foley: Restored mix/stir trials → 5 total
 *  4. Group A foley comparison: Added using crack/flip/whisk audio
 *  5. 4AFC: Added milk/sugar as additional distractor images
 *  6. Word forms: Standardized
 *  7. Save: Added optional POST endpoint
 */
(function () {
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  const T = (name) => window[name];
  const q = Object.fromEntries(new URLSearchParams(location.search));

  /* ---------- CONFIG ---------- */
  const SKIP_NAMING_IF_NO_MIC = true;

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
    .choice-card{width:220px;border:1px solid #ccc;border-radius:12px;padding:0;overflow:hidden;background:white;display:flex;flex-direction:column;align-items:center;box-shadow:0 3px 12px rgba(0,0,0,.08);transition:transform .15s ease, border-color .15s ease;cursor:pointer;}
    .choice-card:hover{transform:translateY(-4px);border-color:#1a237e;}
    .choice-card img{width:100%;height:150px;object-fit:cover;display:block;border-radius:12px;}
    .mic-error-msg{background-color:#ffebee;padding:20px;border-radius:8px;margin-top:20px;}
    .seq-selected{opacity:0.4;pointer-events:none;}
    .seq-undo-btn{margin-top:12px;background:#ff9800;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:14px;}
    .seq-undo-btn:hover{background:#f57c00;}
    .seq-reset-btn{margin-top:12px;margin-left:8px;background:#f44336;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:14px;}
    .seq-reset-btn:hover{background:#d32f2f;}
  `;
  document.head.appendChild(styleBlock);

  /* ---------- STIMULI ---------- */
  const PICTURES = [
    { word: 'sizzling', category: 'process', iconic: true,  rating: 5.30, variants: ['img/sizzling_01.png', 'img/sizzling_02.png'] },
    { word: 'mixing',   category: 'action',  iconic: true,  rating: 5.10, variants: ['img/mixing_01.png',   'img/mixing_02.png'] },
    { word: 'stirring', category: 'action',  iconic: true,  rating: 4.82, variants: ['img/stirring_01.png', 'img/stirring_02.png'] },
    { word: 'pouring',  category: 'action',  iconic: false, rating: 3.60, variants: ['img/pouring_01.png',  'img/pouring_02.png'] },
    { word: 'butter',   category: 'ingredient', iconic: false, rating: 3.50, variants: ['img/butter_01.png', 'img/butter_02.png'] },
    { word: 'flour',    category: 'ingredient', iconic: false, rating: 3.00, variants: ['img/flour_01.png',  'img/flour_02.png'] },
    { word: 'pancake',  category: 'food',       iconic: null, rating: null, variants: ['img/pancake_01.png', 'img/pancake_02.png'] },
    { word: 'egg',      category: 'object',     iconic: null, rating: null, variants: ['img/egg_01.png',     'img/egg_02.png'] },
    { word: 'milk',     category: 'ingredient', iconic: null, rating: null, variants: ['img/milk_01.png',    'img/milk_02.png'] },
    { word: 'sugar',    category: 'ingredient', iconic: null, rating: null, variants: ['img/sugar_01.png',   'img/sugar_02.png'] },
  ];

  const GROUP_B_TARGETS = ['sizzling', 'mixing', 'stirring', 'pouring', 'butter', 'flour'];

  const AUDIO_VARIANTS = {
    sizzle: ['sounds/sizzle_1.mp3', 'sounds/sizzle_2.mp3'],
    mix:    ['sounds/mix_1.wav',    'sounds/mix_2.wav'],
    stir:   ['sounds/stir_1.mp3',   'sounds/stir_2.mp3'],
    pour:   ['sounds/pour_1.mp3',   'sounds/pour_2.mp3'],
    spread: ['sounds/spread_1.mp3', 'sounds/spread_2.mp3'],
    crack:  ['sounds/crack_1.mp3',  'sounds/crack_2.mp3'],
    flip:   ['sounds/flip_1.mp3',   'sounds/flip_2.mp3'],
    whisk:  ['sounds/whisk_1.mp3',  'sounds/whisk_2.mp3'],
  };

  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#e3f2fd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#1565c0">Image missing</text></svg>')}`;
  const PLACEHOLDER_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  const transfer_words = [
    { word: 'flip',      pos: 'verb', iconic: true,  rating: 5.70, type: 'target_iconic',    trained: true,  group: 'A' },
    { word: 'crack',     pos: 'verb', iconic: true,  rating: 5.40, type: 'target_iconic',    trained: true,  group: 'A' },
    { word: 'whisk',     pos: 'verb', iconic: true,  rating: 4.55, type: 'target_iconic',    trained: true,  group: 'A' },
    { word: 'sizzle',    pos: 'verb', iconic: true,  rating: 5.30, type: 'target_iconic',    trained: true,  group: 'B' },
    { word: 'mix',       pos: 'verb', iconic: true,  rating: 5.10, type: 'target_iconic',    trained: true,  group: 'B' },
    { word: 'stir',      pos: 'verb', iconic: true,  rating: 4.82, type: 'target_iconic',    trained: true,  group: 'B' },
    { word: 'bowl',      pos: 'noun', iconic: false, rating: 3.00, type: 'target_arbitrary', trained: true,  group: 'A' },
    { word: 'spatula',   pos: 'noun', iconic: false, rating: 3.91, type: 'target_arbitrary', trained: true,  group: 'A' },
    { word: 'pan',       pos: 'noun', iconic: false, rating: 3.45, type: 'target_arbitrary', trained: true,  group: 'A' },
    { word: 'pour',      pos: 'verb', iconic: false, rating: 3.60, type: 'target_arbitrary', trained: true,  group: 'B' },
    { word: 'butter',    pos: 'noun', iconic: false, rating: 3.50, type: 'target_arbitrary', trained: true,  group: 'B' },
    { word: 'flour',     pos: 'noun', iconic: false, rating: 3.00, type: 'target_arbitrary', trained: true,  group: 'B' },
    { word: 'glug',      pos: 'verb', iconic: true,  rating: 6.20, type: 'foil_iconic',      trained: false, group: 'foil' },
    { word: 'splash',    pos: 'verb', iconic: true,  rating: 6.09, type: 'foil_iconic',      trained: false, group: 'foil' },
    { word: 'drizzle',   pos: 'verb', iconic: true,  rating: 6.00, type: 'foil_iconic',      trained: false, group: 'foil' },
    { word: 'fork',      pos: 'noun', iconic: false, rating: 3.90, type: 'foil_arbitrary',   trained: false, group: 'foil' },
    { word: 'cup',       pos: 'noun', iconic: false, rating: 3.83, type: 'foil_arbitrary',   trained: false, group: 'foil' },
    { word: 'knife',     pos: 'noun', iconic: false, rating: null,  type: 'foil_arbitrary',  trained: false, group: 'foil' },
    { word: 'salt',      pos: 'noun', iconic: false, rating: null,  type: 'foil_arbitrary',  trained: false, group: 'foil' },
  ];

  const foley_stimuli_groupB = [
    { audio: 'sizzle', options: ['pancake sizzling', 'stirring dry flour'],   correct: 0, group: 'B', iconic: true,  rating: 5.30 },
    { audio: 'mix',    options: ['mixing batter', 'pouring liquid'],          correct: 0, group: 'B', iconic: true,  rating: 5.10 },
    { audio: 'stir',   options: ['stirring batter', 'cracking an egg'],       correct: 0, group: 'B', iconic: true,  rating: 4.82 },
    { audio: 'pour',   options: ['pouring batter', 'flipping a pancake'],     correct: 0, group: 'B', iconic: false, rating: 3.60 },
    { audio: 'spread', options: ['spreading butter', 'pouring milk'],         correct: 0, group: 'B', iconic: false, rating: 3.50 },
  ];

  const foley_stimuli_groupA = [
    { audio: 'crack', options: ['cracking an egg', 'stirring a pot'],     correct: 0, group: 'A', iconic: true,  rating: 5.40 },
    { audio: 'flip',  options: ['flipping a pancake', 'pouring batter'], correct: 0, group: 'A', iconic: true,  rating: 5.70 },
    { audio: 'whisk', options: ['whisking eggs', 'sizzling oil'],        correct: 0, group: 'A', iconic: true,  rating: 4.55 },
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
    return `<button class="choice-card" data-choice="${word}" aria-label="option">
      <img src="${src || PLACEHOLDER_IMG}" alt="choice" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
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

  /* ---------- Mic fallback (runtime conditional) ---------- */
  function micOrTextNodes(audioTrial, textPrompt, dataTag) {
    return [
      {
        timeline: [Object.assign({}, audioTrial, { data: Object.assign({}, audioTrial.data || {}, dataTag, { modality: 'audio' }) })],
        conditional_function: () => microphoneAvailable
      },
      {
        timeline: [{
          type: T('jsPsychSurveyText'),
          preamble: `<h3>Speaking (Text Fallback)</h3><p>${textPrompt}</p>
            <div class="mic-error-msg"><b>Note:</b> Mic unavailable; type your answer.<br>
            <b>注意：</b>マイクが使用できません。回答を入力してください。</div>`,
          questions: [{ prompt: 'Type here / ここに入力', name: 'typed_answer', rows: 6, required: true }],
          data: Object.assign({}, dataTag, { modality: 'text' })
        }],
        conditional_function: () => !microphoneAvailable
      }
    ];
  }

  /* ---------- Mic Gate — v5 FIX: button filtering + response check ---------- */
  function buildMicSetupGate({ required = true } = {}) {
    const gate = {
      type: T('jsPsychHtmlButtonResponse'),
      choices: ['Continue / 続行', 'Use Text Only / 文字で続行'],
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
        const statusEl = document.getElementById('mic-status');
        const levelEl = document.getElementById('mic-level');

        // v5 FIX: Filter out stimulus-embedded #mic-enable from button query
        const allBtns = [...document.querySelectorAll('.jspsych-btn')];
        const choiceBtns = allBtns.filter(b => b.id !== 'mic-enable');
        const contBtn = choiceBtns.length >= 2 ? choiceBtns[choiceBtns.length - 2] : null;
        const textBtn = choiceBtns.length >= 1 ? choiceBtns[choiceBtns.length - 1] : null;

        if (!enableBtn || !statusEl || !levelEl) {
          console.error('[mic_gate] DOM elements not found');
          window.__mic_ok = false;
          return;
        }

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
            if (contBtn) { contBtn.disabled = true; contBtn.style.opacity = '0.5'; }
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
        if (!required) return false;
        const last = jsPsych.data.get().last(1).values()[0] || {};
        // v5 FIX: jsPsych 7 uses 'response' (integer), not 'button_pressed'
        return !(microphoneAvailable || last.response === 1);
      }
    };
  }

  /* ---------- Data Save ---------- */
  function saveData() {
    const pid = currentPID || 'unknown';
    const filename = `posttest_${pid}_${testCondition}.json`;

    if (q.post) {
      try {
        const payload = jsPsych.data.get().values();
        fetch(q.post, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid, condition: testCondition, data: payload })
        }).then(() => console.log('[posttest] Data POSTed successfully'))
          .catch(err => console.error('[posttest] POST failed:', err));
      } catch (err) { console.error('[posttest] POST error:', err); }
    }

    try { jsPsych.data.get().localSave('json', filename); } catch (err) { console.error('[posttest] localSave failed:', err); }

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `<div style="text-align:center;padding:40px;">
        <h2>✓ Post-test complete / ポストテスト完了</h2>
        <p><strong>Participant:</strong> ${pid}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>Your responses have been saved.</p>
        <p>回答が保存されました。</p>
        <p>Thank you! / ご参加ありがとうございました。</p>
        <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
      </div>`;
    }
  }

  /* ---------- Entry ---------- */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';
    console.log('[posttest] condition:', testCondition, 'PID:', currentPID);

    document.querySelectorAll('.start').forEach(b => b.disabled = true);
    jsPsych?.terminate?.();

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
      max_load_time: 30000,
      on_error: (file) => { console.warn('[posttest] Preload failed for:', file); },
      on_finish: (data) => {
        if (data.failed_images?.length || data.failed_audio?.length) {
          console.warn('[posttest] Failed assets:', { images: data.failed_images, audio: data.failed_audio });
        }
      }
    });

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <h2>Post-Test / ポストテスト</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>This test measures what you learned in the training session.</p>
        <p>トレーニングセッションで学んだ内容を測定します。</p>
        <p style="color:#666;">Answer based on what you learned in training, not from the pre-test.</p>
        <p style="color:#666;">プレテストではなく、トレーニングで学んだ内容に基づいて回答してください。</p>
      </div>`,
      choices: ['Begin / 開始']
    });

    tl.push(buildMicSetupGate({ required: true }));

    tl.push(...build4AFC(delayed));
    if (!delayed) tl.push(...buildSpeededMatch());
    tl.push(...buildProceduralRecall());
    if (!delayed) tl.push(...buildSequencing());
    tl.push(...buildFoley(delayed));
    if (!delayed) tl.push(...buildGroupAFoley());
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

  /* ---------- 4AFC ---------- */
  function build4AFC() {
    let pool = PICTURES.filter(p => GROUP_B_TARGETS.includes(p.word));
    if (FOURAFC_VERBS_ONLY) pool = pool.filter(p => p.category === 'action' || p.category === 'process');
    if (FOURAFC_MAX_ITEMS && Number.isFinite(FOURAFC_MAX_ITEMS)) pool = shuffle(pool).slice(0, FOURAFC_MAX_ITEMS);

    const distractorPool = PICTURES.filter(p => !GROUP_B_TARGETS.includes(p.word));

    const trials = shuffle(pool).map(targetPic => {
      const eligible = pool.filter(p => p.word !== targetPic.word);
      const sameCategory = eligible.filter(p => p.category === targetPic.category);
      let foils = sample(sameCategory, 3);
      if (foils.length < 3) {
        const extras = eligible.filter(p => !foils.includes(p));
        foils = foils.concat(sample(extras, 3 - foils.length));
      }
      if (foils.length < 3) {
        const available = distractorPool.filter(p => !foils.includes(p));
        foils = foils.concat(sample(available, 3 - foils.length));
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
        button_html: (choice, index) => choiceButton(labels[index], images[index]),
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
      const foilCandidates = shuffled.filter(p => p !== pic && p.category === pic.category);
      const foil = foilCandidates.length > 0
        ? foilCandidates[0]
        : shuffled.find(p => p !== pic);
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
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>Word → Picture (Speeded)</h2>
          <p><b>A</b> = matches, <b>L</b> = does not match. A "+" appears between trials.</p>
          <p><b>A</b> = 一致、<b>L</b> = 不一致。試行の間に「+」が表示されます。</p>`,
        choices: ['Begin / 開始']
      },
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
        <p style="color:#888;">Write one step per line, in order.<br>
        1行に1つのステップを、順番に書いてください。</p>`,
      questions: sequence_steps.map((_, i) => ({
        prompt: `Step ${i + 1} / ステップ ${i + 1}:`, name: `step_${i + 1}`, rows: 2, required: i < sequence_steps.length - 1
      })),
      button_label: 'Submit / 送信',
      data: { task: 'procedural_free', pid: currentPID, condition: testCondition, phase: 'post' },
      on_finish: d => { d.steps = Object.values(asObject(d.response)); }
    }];
  }

  /* ---------- Sequencing ---------- */
  function buildSequencing() {
    let capturedSequence = null;

    return [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>Sequencing / 順序</h2>
          <p>Click the steps in the correct order. You can undo or reset if you make a mistake.</p>
          <p>正しい順番でステップをクリックしてください。間違えた場合は「元に戻す」や「リセット」ができます。</p>`,
        choices: ['Start / 開始']
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          const displayOrder = shuffle(sequence_steps);
          let html = '<div style="text-align:center;"><h3>Select the steps in order / 順番に選択してください</h3>';
          html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
          displayOrder.forEach(s => { html += `<button class="jspsych-btn seq-btn" data-step="${s}" style="width:220px;">${s}</button>`; });
          html += '</div>';
          html += '<div style="margin-top:12px;">';
          html += '<button class="seq-undo-btn" id="seq-undo" disabled>↩ Undo / 元に戻す</button>';
          html += '<button class="seq-reset-btn" id="seq-reset" disabled>🔄 Reset / リセット</button>';
          html += '</div>';
          html += '<div id="seq-output" style="margin-top:20px;min-height:40px;color:#1565c0;font-weight:600;"></div></div>';
          return html;
        },
        choices: ['Submit / 送信'],
        data: { task: 'sequencing', correct_order: sequence_steps, pid: currentPID, condition: testCondition, phase: 'post' },
        on_load: () => {
          const buttons = Array.from(document.querySelectorAll('.seq-btn'));
          const output = document.getElementById('seq-output');
          const allBtns = document.querySelectorAll('.jspsych-btn');
          const submit = allBtns[allBtns.length - 1];
          if (submit) { submit.disabled = true; submit.style.opacity = '0.5'; }
          const undoBtn = document.getElementById('seq-undo');
          const resetBtn = document.getElementById('seq-reset');
          const selected = [];

          function updateDisplay() {
            if (output) output.textContent = selected.map((s, i) => `${i + 1}. ${s}`).join('  |  ');
            capturedSequence = selected.slice();
            if (selected.length === sequence_steps.length) {
              if (submit) { submit.disabled = false; submit.style.opacity = '1'; }
            } else {
              if (submit) { submit.disabled = true; submit.style.opacity = '0.5'; }
            }
            if (undoBtn) undoBtn.disabled = selected.length === 0;
            if (resetBtn) resetBtn.disabled = selected.length === 0;
            buttons.forEach(btn => {
              if (selected.includes(btn.dataset.step)) {
                btn.classList.add('seq-selected');
                btn.disabled = true;
              } else {
                btn.classList.remove('seq-selected');
                btn.disabled = false;
              }
            });
          }

          buttons.forEach(btn => {
            btn.addEventListener('click', () => {
              if (selected.length >= sequence_steps.length) return;
              selected.push(btn.dataset.step);
              updateDisplay();
            });
          });

          if (undoBtn) undoBtn.addEventListener('click', () => {
            if (selected.length === 0) return;
            selected.pop();
            updateDisplay();
          });

          if (resetBtn) resetBtn.addEventListener('click', () => {
            selected.length = 0;
            updateDisplay();
          });
        },
        on_finish: d => {
          const entered = capturedSequence || [];
          d.entered_sequence = entered;
          d.correct_positions = entered.filter((s, i) => s === d.correct_order[i]).length;
          d.kendall_tau = kendallTau(d.correct_order, entered);
        }
      }
    ];
  }

  /* ---------- Foley (GROUP B) ---------- */
  function buildFoley(delayed) {
    const pool = delayed ? foley_stimuli_groupB.slice(0, 3) : foley_stimuli_groupB;

    const trials = shuffle(pool).map((stim, idx) => {
      const audioSrc = pickAudioSrc(stim.audio);
      const optionOrder = shuffle(stim.options.map((opt, i) => ({ text: opt, origIdx: i })));
      const displayOptions = optionOrder.map(o => o.text);
      const correctDisplayIdx = optionOrder.findIndex(o => o.origIdx === stim.correct);

      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <button class="jspsych-btn" id="foley-play-${idx}">▶️ Play sound / 音を再生</button>
          <p id="foley-status-${idx}" style="margin-top:10px;color:#666;">Listen before answering. / 答える前に聞いてください。</p>
        </div>`,
        choices: displayOptions,
        data: {
          task: 'foley', audio_key: stim.audio, correct: correctDisplayIdx,
          options: displayOptions, pid: currentPID, condition: testCondition,
          audio_src: audioSrc, word_group: stim.group,
          iconic: stim.iconic, iconicity_rating: stim.rating, phase: 'post'
        },
        on_load: function () {
          const audio = new Audio(audioSrc);
          audio.loop = false;
          window.__foley_audio = audio;

          const play = document.getElementById(`foley-play-${idx}`);
          const status = document.getElementById(`foley-status-${idx}`);

          // v5 FIX: Guard DOM element access
          if (!play || !status) {
            console.error('[foley] DOM elements not found');
            return;
          }

          play.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…';
            audio.currentTime = 0;
            audio.play().then(() => { setTimeout(() => { status.textContent = 'Choose the best option. / 答えを選択してください。'; }, 500); })
              .catch(() => { status.textContent = 'Audio failed. / 音声の再生に失敗しました。'; });
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
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>Sound Recognition / 音声認識</h2>
          <p>Play the sound, then choose what it represents.</p>
          <p>音を再生し、何を表しているかを選択してください。</p>`,
        choices: ['Begin / 開始']
      },
      ...trials
    ];
  }

  /* ---------- Group A Foley ---------- */
  function buildGroupAFoley() {
    const trials = shuffle(foley_stimuli_groupA).map((stim, idx) => {
      const audioSrc = pickAudioSrc(stim.audio);
      const optionOrder = shuffle(stim.options.map((opt, i) => ({ text: opt, origIdx: i })));
      const displayOptions = optionOrder.map(o => o.text);
      const correctDisplayIdx = optionOrder.findIndex(o => o.origIdx === stim.correct);

      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <button class="jspsych-btn" id="foleyA-play-${idx}">▶️ Play sound / 音を再生</button>
          <p id="foleyA-status-${idx}" style="margin-top:10px;color:#666;">Listen before answering. / 答える前に聞いてください。</p>
        </div>`,
        choices: displayOptions,
        data: {
          task: 'foley_groupA', audio_key: stim.audio, correct: correctDisplayIdx,
          options: displayOptions, pid: currentPID, condition: testCondition,
          audio_src: audioSrc, word_group: stim.group,
          iconic: stim.iconic, iconicity_rating: stim.rating, phase: 'post'
        },
        on_load: function () {
          const audio = new Audio(audioSrc);
          audio.loop = false;
          window.__foley_audio = audio;

          const play = document.getElementById(`foleyA-play-${idx}`);
          const status = document.getElementById(`foleyA-status-${idx}`);

          // v5 FIX: Guard DOM element access
          if (!play || !status) {
            console.error('[foleyA] DOM elements not found');
            return;
          }

          play.addEventListener('click', () => {
            status.textContent = 'Playing… / 再生中…';
            audio.currentTime = 0;
            audio.play().then(() => { setTimeout(() => { status.textContent = 'Choose the best option. / 答えを選択してください。'; }, 500); })
              .catch(() => { status.textContent = 'Audio failed. / 音声の再生に失敗しました。'; });
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
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<h2>More Sounds / さらに音声</h2>
          <p>A few more cooking sounds to identify.</p>
          <p>さらにいくつかの料理の音を識別してください。</p>`,
        choices: ['Continue / 続行']
      },
      ...trials
    ];
  }

  /* ---------- Picture naming ---------- */
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

    const practiceIntro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h3>Practice Recording / 録音練習</h3>
        <p>Let's practice with an unrelated image. / 関係のない画像で練習しましょう。</p>
        <div style="background:#e3f2fd;padding:15px;border-radius:8px;margin-top:20px;">
          <p><b>Describe in 4 seconds:</b> Objects / Actions / Sounds / Smells</p>
          <p><b>4秒間で説明：</b>物・動作・音・匂い</p>
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
          <p><b>覚えてください：</b>物・動作・音・匂い（4秒間）</p>
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
            <p><b>説明：</b>物・動作・音・匂い</p>
          </div>
          <p>Click when ready (4 seconds). / 準備ができたらクリック（4秒間）。</p>
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

    const shuffledTransferWords = shuffle(transfer_words);

    const trials = shuffledTransferWords.flatMap(item => [
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

  /* ======================================================================
   * v5 FIX: Blind Retell — added preparation step before recording
   * Previously: intro → recording started immediately (confusing)
   * Now:        intro → preparation screen with "Start Recording" → recording
   * ====================================================================== */
  function buildBlindRetell() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Blind Retell / 視覚なしで説明</h2>
        <p>Without any pictures, <b>explain how to make a pancake</b> from memory.</p>
        <p>画像なしで<b>パンケーキの作り方</b>を記憶から説明してください。</p>
        <p>You will have up to <b>45 seconds</b>. Press "Done" when finished.</p>
        <p>最大<b>45秒間</b>です。終わったら「完了」を押してください。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'blind_retell_intro' }
    };

    // v5 FIX: New preparation step — gives participant a clear moment to
    // read what they need to do and press "Start Recording" when ready
    const prepare = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="max-width:600px;margin:0 auto;text-align:center;">
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;background:#f8f9fa;">
          <div>
            <p style="color:#333;font-size:18px;font-weight:bold;margin:0 0 8px 0;">🎤 Explain how to make a pancake</p>
            <p style="color:#333;font-size:16px;margin:0;">パンケーキの作り方を説明してください</p>
          </div>
        </div>
        <div style="margin-top:16px;padding:15px;background:#fff3cd;border-radius:8px;">
          <p style="margin:0;"><b>Include:</b> ingredients, tools, steps, and any sounds or actions you remember.</p>
          <p style="margin:4px 0 0 0;"><b>含めること：</b>材料、道具、手順、覚えている音や動作。</p>
        </div>
        <p style="margin-top:16px;color:#666;">Recording will start when you click the button below (up to 45 seconds).<br>
        下のボタンをクリックすると録音が始まります（最大45秒間）。</p>
      </div>`,
      choices: ['Start Recording / 録音開始'],
      data: { task: 'blind_retell_prepare' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="max-width:600px;margin:0 auto;text-align:center;">
        <div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;background:#fff8f8;">
          <div>
            <p style="color:#333;font-size:16px;margin:0;">Explain how to make a pancake / パンケーキの作り方を説明</p>
            <p style="color:#888;font-size:14px;margin:8px 0 0 0;">Ingredients → Tools → Steps → Sounds</p>
          </div>
        </div>
        <p style="margin-top:12px;color:#d32f2f;font-weight:bold;font-size:18px;">🔴 Recording… up to 45s / 録音中… 最大45秒</p>
      </div>`,
      recording_duration: 45000, show_done_button: true, done_button_label: 'Done / 完了', allow_playback: false, post_trial_gap: 800
    };

    return [intro, prepare, ...micOrTextNodes(
      audioTrial,
      'Explain how to make a pancake step by step.<br>パンケーキの作り方を順を追って説明してください。',
      { task: 'blind_retell', pid: currentPID, condition: testCondition, phase: 'post', needs_audio_scoring: true }
    )];
  }

  /* ---------- Teach Someone ---------- */
  function buildTeachSomeone() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Teach a Friend / 友だちに教える</h2>
        <p>Your friend has never cooked. Teach them how to make a pancake.</p>
        <p>料理をしたことのない友だちにパンケーキの作り方を教えてください。</p>
        <p>Include: tools, ingredients, key actions, safety/timing tips, success checks.</p>
        <p>含めること：道具、材料、主な動作、安全・時間のコツ、成功の確認方法。</p>
        <p>You have up to <b>60 seconds</b>. Press "Done" when finished. / 最大<b>60秒間</b>。終わったら「完了」を押してください。</p>`,
      choices: ['Begin / 開始'],
      data: { task: 'teach_intro' }
    };

    const audioTrial = {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;border-radius:8px;">
        <p style="color:#666;">(No visual cues / 視覚ヒントなし)</p>
      </div><p style="margin-top:10px;color:#d32f2f;font-weight:bold;">🔴 Teaching… up to 60s / 説明中… 最大60秒</p>`,
      recording_duration: 60000, show_done_button: true, done_button_label: 'Done / 完了', allow_playback: false, post_trial_gap: 800
    };

    return [intro, ...micOrTextNodes(
      audioTrial,
      'Teach a beginner how to make a pancake.<br>初心者にパンケーキの作り方を教えてください。',
      { task: 'teach_someone', pid: currentPID, condition: testCondition, phase: 'post', needs_audio_scoring: true }
    )];
  }

  /* ======================================================================
   * v5 FIX: Likert — reworded VR reuse question to work across conditions
   * Old:  "I would like to use VR for learning English vocabulary again."
   * New:  "If I had the chance to use VR for learning English vocabulary,
   *        I would want to try it (again)."
   * This allows comparison between VR participants (who experienced it)
   * and non-VR participants (who can express desire/interest).
   * ====================================================================== */
  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: `<h3>Training Feedback / トレーニングのフィードバック</h3>
        <p>Rate your experience with the training. / トレーニングでの体験を評価してください。</p>
        <p style="color:#888;">(1 = Strongly disagree / 全くそう思わない, 5 = Strongly agree / 強くそう思う)</p>`,
      questions: [
        {
          prompt: 'I can remember the English words for cooking actions (e.g., sizzle, mix, pour).<br>料理の動作を表す英単語（例：sizzle, mix, pour）を覚えている。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'recall_actions'
        },
        {
          prompt: 'I can remember the English words for ingredients and tools (e.g., flour, butter).<br>材料や道具を表す英単語（例：flour, butter）を覚えている。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'recall_objects'
        },
        {
          prompt: 'The sounds in the training environment helped me learn the vocabulary.<br>トレーニング環境の音が語彙の学習に役立った。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'sound_helpfulness'
        },
        {
          prompt: 'Some English words seemed to "sound like" what they mean (e.g., sizzle sounds like the noise).<br>英単語の中には、意味と音が結びついているように感じるものがあった（例：sizzleは実際の音に似ている）。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'iconicity_awareness'
        },
        {
          prompt: 'The training experience felt like a real cooking situation.<br>トレーニング体験は本当の料理の場面のように感じた。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'immersion'
        },
        {
          prompt: 'I could explain the pancake-making procedure to someone else in English.<br>パンケーキの作り方を英語で他の人に説明できる。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'procedural_confidence'
        },
        {
          // v5 FIX: Conditional wording — works for both VR and non-VR conditions
          prompt: 'If I had the chance to use VR for learning English vocabulary, I would want to try it (again).<br>英語の語彙学習にVRを使う機会があれば、（もう一度）試してみたい。',
          labels: ['1', '2', '3', '4', '5'], required: true, name: 'willingness_vr'
        }
      ],
      button_label: 'Submit / 送信',
      data: { task: 'likert_feedback', pid: currentPID, condition: testCondition, phase: 'post' }
    };
  }

  /* ---------- Exit ---------- */
  function buildExit() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Final Comments / 最終コメント</h3>
        <p>Any comments, concerns, or suggestions? / ご意見・ご要望はありますか？</p>`,
      questions: [
        {
          prompt: 'Were there any words you found especially easy or hard to remember? Why?<br>特に覚えやすかった、または覚えにくかった単語はありましたか？その理由は？',
          name: 'word_difficulty', rows: 3, required: false
        },
        {
          prompt: 'Any other comments about the training or this test.<br>トレーニングやテストに関するその他のコメント。',
          name: 'comments', rows: 3, required: false
        }
      ],
      button_label: 'Finish / 完了',
      data: { task: 'exit_comments', pid: currentPID, condition: testCondition, phase: 'post' }
    };
  }
})();