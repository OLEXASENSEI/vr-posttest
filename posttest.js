/**
 * posttest.js — VERSION 4.0.1
 * - Blueprint-aligned tasks with safe fallbacks for missing alt assets
 * - Restored createResilientAudioLoader
 * - Survey render bug fixed (KO expects ID string)
 */

(function(){
  /* ========== GLOBAL STATE & HELPERS ========== */
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  let imageSetVersion = 'A';
  let foleyTokenVersion = 'A';

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];
  const mic_plugins_available = () =>
    have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse');

  const ASSET_BUST = Math.floor(Math.random() * 100000);
  const asset = (p) => {
    if (!p) return '';
    const clean = String(p).replace(/^(\.\/|\/)/, '');
    const sep = clean.includes('?') ? '&' : '?';
    return clean + sep + 'v=' + ASSET_BUST;
  };

  function pidHash(str){
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i);
    }
    return h >>> 0;
  }
  function versionForPID(pid, key, choices) {
    const idx = pidHash(`${pid}::${key}`) % choices.length;
    return choices[idx];
  }

  function hashStr(s){
    let h=0; for(let i=0; i<s.length; i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
    return Math.abs(h);
  }

  function pickForPID(key, arr){
    if (!arr || !arr.length) return null;
    const idx = hashStr(String(currentPID || 'anon') + '|' + key) % arr.length;
    return arr[idx];
  }

  const cleanupManager = {
    items: new Map(),
    register(key, fn) { this.cleanup(key); this.items.set(key, fn); },
    cleanup(key) {
      const fn = this.items.get(key);
      if (typeof fn === 'function') { try { fn(); } catch(e) { console.error(`Cleanup error [${key}]`, e); } }
      this.items.delete(key);
    },
    cleanupAll() {
      const keys = Array.from(this.items.keys());
      for (const k of keys) { this.cleanup(k); }
    }
  };

  /* ========== OPTIONAL ALT ASSET MAPS ==========
     Provide real alternate paths if you have them. Leaving these empty
     simply falls back to the base stimuli in picture_naming_stimuli. */
  const ALT_IMAGE_SETS = {
    // Example: bowl: { A: 'img/bowl_altA.jpg', B: 'img/bowl_altB.jpg' }
  };
  const ALT_FOLEY_TOKENS = {
    // Example: crack: { A: ['sounds/crack_A1.mp3'], B: ['sounds/crack_B1.mp3'] }
  };

  /* ========== BASE ASSET LISTS ========== */
  const IMG = {
    bowl:     ['img/bowl_01.png', 'img/bowl_02.png'],
    butter:   ['img/butter_01.png', 'img/butter_02.png'],
    egg:      ['img/egg_01.png', 'img/egg_02.png'],
    flour:    ['img/flour_01.png', 'img/flour_02.png'],
    milk:     ['img/milk_01.png', 'img/milk_02.png'],
    pan:      ['img/pan_01.png', 'img/pan_02.png'],
    pancake:  ['img/pancake_01.png', 'img/pancake_02.png'],
    spatula:  ['img/spatula_01.png', 'img/spatula_02.png'],
    sugar:    ['img/sugar_01.png', 'img/sugar_02.png'],
    whisk:    ['img/whisk_01.png', 'img/whisk_02.png'],
    mixing:   ['img/mixing_01.png',   'img/mixing_02.png'],
    cracking: ['img/cracking_01.png', 'img/cracking_02.png'],
    pouring:  ['img/pouring_01.png',  'img/pouring_02.png'],
    flipping: ['img/flipping_01.png', 'img/flipping_02.png'],
    sizzling: ['img/sizzling_01.png', 'img/sizzling_02.png'],
  };

  const SND = {
    crack:  ['crack_1.mp3',  'crack_2.mp3'],
    flip:   ['flip_1.mp3',   'flip_2.mp3'],
    pour:   ['pour_1.mp3',   'pour_2.mp3'],
    sizzle: ['sizzle_1.mp3', 'sizzle_2.mp3'],
    spread: ['spread_1.mp3', 'spread_2.mp3'],
    whisk:  ['whisk_1.mp3',  'whisk_2.mp3'],
  };

  const SND_ALIASES = {
    crack:  ['egg_crack.mp3', 'cracking.mp3'],
    whisk:  ['circular_whir.mp3', 'whisk.mp3'],
    pour:   ['granular_pour.mp3', 'liquid_flow.mp3', 'pour.mp3'],
    sizzle: ['frying_sizzle.mp3', 'tss.mp3', 'sizzle.mp3'],
    flip:   ['pan_flip.mp3', 'flip.mp3'],
    spread: ['butter_spread.mp3', 'spread.mp3'],
  };

  /* ========== STIMULI BASE LISTS ========== */
  const picture_naming_stimuli = [
    { target: 'bowl',    category: 'utensil',    image: 'img/bowl.jpg' },
    { target: 'butter',  category: 'ingredient', image: 'img/butter.jpg' },
    { target: 'egg',     category: 'ingredient', image: 'img/egg.jpg' },
    { target: 'flour',   category: 'ingredient', image: 'img/flour.jpg' },
    { target: 'milk',    category: 'ingredient', image: 'img/milk.jpg' },
    { target: 'pan',     category: 'utensil',    image: 'img/pan.jpg' },
    { target: 'pancake', category: 'food',       image: 'img/pancake.jpg' },
    { target: 'spatula', category: 'utensil',    image: 'img/spatula.jpg' },
    { target: 'sugar',   category: 'ingredient', image: 'img/sugar.jpg' },
    { target: 'whisk',   category: 'utensil',    image: 'img/whisk.jpg' },
    { target: 'mixing',   category: 'action',    image: 'img/mixing.jpeg' },
    { target: 'cracking', category: 'action',    image: 'img/cracking.jpeg' },
    { target: 'pouring',  category: 'action',    image: 'img/pouring.jpeg' },
    { target: 'flipping', category: 'action',    image: 'img/flipping.jpg' },
    { target: 'sizzling', category: 'process',   image: 'img/sizzling.jpeg' },
  ];

  const foley_stimuli = [
    { audio: 'crack',  options: ['stirring', 'cracking'],               correct: 1, mapping_type: 'action' },
    { audio: 'whisk',  options: ['mixing (whisking)', 'pouring'],       correct: 0, mapping_type: 'texture' },
    { audio: 'pour',   options: ['pouring', 'flipping'],                correct: 0, mapping_type: 'texture' },
    { audio: 'sizzle', options: ['spreading butter', 'cooking on pan'], correct: 1, mapping_type: 'process' },
    { audio: 'flip',   options: ['turning pancake', 'cracking egg'],    correct: 0, mapping_type: 'action' },
    { audio: 'spread', options: ['spreading butter', 'cracking egg'],   correct: 0, mapping_type: 'texture' },
  ];

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


  /* ========== RANDOMIZATION HELPERS ========== */
  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function sampleWithoutReplacement(array, size) {
    const shuffled = shuffle(array);
    return shuffled.slice(0, Math.min(size, array.length)).filter(Boolean);
  }

  /* ========== RESILIENT AUDIO LOADER ========== */
  function createResilientAudioLoader(candidates){
    let idx = 0, audio = null;
    function loadNext(onReady, onFail){
      if (idx >= candidates.length) { onFail?.(); return; }
      const src = asset(candidates[idx++]);

      audio = new Audio();
      audio.preload = 'auto';

      const clean = () => {
        if (audio) {
          audio.removeEventListener('canplaythrough', ok);
          audio.removeEventListener('error', bad);
        }
      };
      const ok  = () => { clean(); onReady?.(audio, src); };
      const bad = () => { clean(); loadNext(onReady, onFail); };
      audio.addEventListener('canplaythrough', ok,  { once:true });
      audio.addEventListener('error', bad, { once:true });
      audio.src = src;
      audio.load?.();
    }
    return { loadNext };
  }

  /* ========== ASSET PICKERS WITH SAFE FALLBACKS ========== */
  function imageSrcFor(key){
    const altPath = ALT_IMAGE_SETS[key]?.[imageSetVersion];
    if (altPath) return asset(altPath);

    const baseStim = picture_naming_stimuli.find(s => s.target === key);
    if (baseStim?.image) return asset(baseStim.image);

    const variants = IMG[key];
    const chosen = pickForPID(key + imageSetVersion, variants);
    return chosen ? asset(chosen) : '';
  }

  function soundCandidatesFor(key){
    const alt = ALT_FOLEY_TOKENS[key]?.[foleyTokenVersion] ?? [];
    const raw = [...alt, ...(SND[key] || []), ...(SND_ALIASES[key] || [])];
    const expanded = raw.flatMap(r => {
      const basePath = (r.includes('/') ? r : ('sounds/' + r)).replace(/\\/g,'/');
      const noBust = basePath.replace(/\?.*$/, '');
      const set = new Set([
        noBust,
        noBust.replace(/_0(\d+)\.mp3$/i, '_$1.mp3'),
        noBust.replace(/_[0-9]{1,2}\.mp3$/i, '.mp3')
      ]);
      [...Array.from(set)].forEach(p => set.add(p.replace(/\.mp3$/i, '.wav')));
      [...Array.from(set)].forEach(p => set.add(p.replace(/\.(mp3|wav)$/i, '.ogg')));
      return Array.from(set);
    });
    return Array.from(new Set(expanded));
  }

  /* ========== KENDALL'S TAU ========== */
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

  /* ========== MAIN ENTRY ========== */
  window.__START_POSTTEST = function(pid, isDelayed) {
    currentPID = pid || 'unknown';
    testCondition = isDelayed ? 'delayed' : 'immediate';

    imageSetVersion  = versionForPID(currentPID, 'image', ['A', 'B']);
    foleyTokenVersion = versionForPID(currentPID, 'foley', ['A', 'B']);
    console.log('[posttest] Versions:', { imageSetVersion, foleyTokenVersion });

    const picker = document.getElementById('picker');
    if (picker) picker.style.display = 'none';

    if (!have('initJsPsych')) {
      alert('jsPsych not loaded. Please refresh.');
      return;
    }

    cleanupManager.cleanupAll();

    jsPsych = T('initJsPsych')({
      display_element: 'jspsych-target',
      show_progress_bar: true,
      message_progress_bar: 'Progress / 進捗',
      on_trial_finish: (data) => {
        if (data.cleanup_key) {
          cleanupManager.cleanup(data.cleanup_key);
        }
      },
      on_finish: () => {
        saveData();
      }
    });

    const timeline = buildTimeline(isDelayed);
    jsPsych.run(timeline);
  };

  /* ========== TIMELINE BUILDER ========== */
  function buildTimeline(isDelayed) {
    const tl = [];
    const delayed = Boolean(isDelayed);

    const selectItems = (arr, count) => arr.slice(0, Math.min(count, arr.length));
    const vocabItems  = delayed ? selectItems(picture_naming_stimuli, 6) : picture_naming_stimuli;
    const namingItems = delayed ? selectItems(picture_naming_stimuli, 6) : picture_naming_stimuli;
    const foleyItems  = delayed ? selectItems(foley_stimuli, 6)              : foley_stimuli;

    if (!have('jsPsychHtmlButtonResponse')) {
      console.error('Required plugin jsPsychHtmlButtonResponse not found');
      return tl;
    }

    tl.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="max-width: 600px; margin: 0 auto; text-align: center;"><h2>Post-Test / ポストテスト</h2><p><strong>Participant:</strong> ${currentPID}</p><p><strong>Condition:</strong> ${testCondition}</p><p><b>Focus:</b> Recall, Retention, Pronunciation</p></div>`,
      choices: ['Begin / 開始']
    });

    tl.push(...build4AFCVocabularyTask(vocabItems));

    if (!delayed) {
      tl.push(...buildWordPictureMatchTask(vocabItems));
    }

    if (have('jsPsychSurveyText')) {
      tl.push(buildProceduralRecallTask());
    }

    if (!delayed) {
      tl.push(...buildSequencingTask());
    }

    tl.push(...buildFoleyTask(foleyItems));

    if (mic_plugins_available()) {
      tl.push(...buildPictureNamingTask(namingItems));
    } else {
      tl.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<p>Picture naming skipped (microphone not available)</p>',
        choices: ['Continue']
      });
    }

    if (!delayed) {
      const transfer = buildTransferTask();
      tl.push(transfer.intro);
      tl.push(...transfer.trials);
    }

    tl.push(buildPostQuestionnaire());
    tl.push(buildExitOpenQuestion());

    return tl;
  }

  /* ========== TASK BUILDERS ========== */

  function build4AFCVocabularyTask(items) {
    const filtered = items.filter(s => s.target !== 'mixing' && s.target !== 'cracking');
    const trials = [];

    filtered.forEach((targetStim) => {
      const pool = filtered.filter(s => s.target !== targetStim.target);
      const foils = sampleWithoutReplacement(pool, Math.min(3, pool.length));
      const choicesArr = shuffle([targetStim, ...foils]).filter(Boolean);
      const correctIndex = choicesArr.findIndex(c => c && c.target === targetStim.target);
      const buttonLabels = ['1', '2', '3', '4'];

      const imgStrip = choicesArr.map((c) => {
        const img = imageSrcFor(c.target);
        const fb = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' font-size='12'%3E${c.target}%3C/text%3E%3C/svg%3E`;
        return `<div style="display:inline-block;margin:6px;"><img src="${img || fb}" style="width:140px;height:140px;border:1px solid #ccc;border-radius:4px;" onerror="this.src='${fb}'"></div>`;
      }).join('');

      trials.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `
          <div style="text-align:center;">
            <h3>Which picture is: <em>${targetStim.target}</em>?</h3>
            <div style="margin:12px 0;">${imgStrip}</div>
          </div>`,
        choices: buttonLabels,
        data: {
          task: '4afc_vocabulary',
          word: targetStim.target,
          correct_index: correctIndex,
          all_choices: choicesArr.map(c => c.target),
          pid: currentPID,
          condition: testCondition,
          image_set_version: imageSetVersion
        },
        on_finish: (d) => { d.correct = (d.response === d.correct_index); }
      });
    });

    return [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h2>Vocabulary Check</h2><p>Choose the picture that matches the word shown.</p>',
        choices: ['Begin']
      },
      ...trials
    ];
  }

  function buildWordPictureMatchTask(items) {
    const baseStimuli = shuffle(items).map((item) => {
      const image = imageSrcFor(item.target);
      return { word: item.target, image };
    });

    const combos = [];
    baseStimuli.forEach((stim, idx) => {
      combos.push({ ...stim, match: true });

      const others = baseStimuli.filter((s, i) => i !== idx && s.image);
      if (others.length) {
        const foil = others[pidHash(stim.word) % others.length];
        combos.push({ word: stim.word, image: foil.image, match: false });
      }
    });

    const trials = shuffle(combos).map((stim) => ({
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: `<div style="text-align:center;">
                   <h3>${stim.word.toUpperCase()}</h3>
                   <img src="${stim.image}" style="max-width:260px;border-radius:8px;" />
                   <p style="color:#666;">F = Match, J = Not a match</p>
                 </div>`,
      choices: ['f', 'j'],
      trial_duration: 4000,
      data: {
        task: 'word_picture_match',
        word: stim.word,
        is_match: stim.match,
        correct_response: stim.match ? 'f' : 'j',
        pid: currentPID,
        condition: testCondition,
        image_set_version: imageSetVersion
      },
      on_finish: (d) => {
        d.correct = (d.response === d.correct_response);
      }
    }));

    return [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h2>Word → Picture Match</h2><p>Decide quickly if the picture matches the word. F = match, J = mismatch.</p>',
        choices: ['Begin']
      },
      ...trials
    ];
  }

  function buildSequencingTask() {
    const canonicalOrder = [
      'Crack eggs', 'Mix flour and eggs', 'Heat the pan', 'Pour batter on pan', 'Flip when ready'
    ];
    const shuffledSteps = shuffle([...canonicalOrder]);

    const seqKey = `seq_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
    window.__seq_map = window.__seq_map || new Map();

    return [
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h2>Sequencing Test</h2><p>Click the steps in the correct order to make pancakes.</p>',
        choices: ['Begin']
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          let html = '<div style="max-width: 600px; margin: 0 auto; text-align: center;"><h3>Select the Steps in Order (1–5)</h3>';
          html += '<div id="step-pool" style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom:20px;">';
          shuffledSteps.forEach((step, index) => {
            html += `<button class="jspsych-btn step-pool-btn" data-step="${step}" data-index="${index}" style="width: 180px; height: 60px; background:#f0f0f0; color:#333; border: 1px solid #ccc; font-size: 13px;">${step}</button>`;
          });
          html += '</div>';
          html += '<div style="margin:10px 0;"><button id="undo-btn" class="jspsych-btn" disabled style="opacity:0.5;">↶ Undo Last</button></div>';
          html += '<div id="selected-order" style="border: 2px dashed #999; padding: 15px; min-height: 50px; margin-top:20px;">' +
                  '<p style="margin:0;color:#666;">Click the steps above in the correct sequence.</p>' +
                  '</div>';
          return html + '</div>';
        },
        choices: ['Submit Sequence / 送信'],
        button_html: '<button class="jspsych-btn" id="submit-btn" disabled style="opacity:0.5;">%choice%</button>',
        data: {
          task: 'procedural_sequencing',
          correct_order: canonicalOrder,
          pid: currentPID,
          condition: testCondition,
          seq_key: seqKey
        },
        on_load: function() {
          const poolBtns = document.querySelectorAll('.step-pool-btn');
          const orderDiv = document.getElementById('selected-order');
          const submitBtn = document.getElementById('submit-btn');
          const undoBtn = document.getElementById('undo-btn');
          let sequence = [];

          const updateDisplay = () => {
            if (sequence.length === 0) {
              orderDiv.innerHTML = '<p style="margin:0;color:#666;">Click the steps above in the correct sequence.</p>';
            } else {
              orderDiv.innerHTML = sequence.map((step, i) =>
                `<span style="background:#2196F3; color:white; padding: 5px 10px; border-radius:4px; margin:0 5px; display:inline-block;">${i + 1}. ${step}</span>`
              ).join('');
            }

            if (sequence.length === canonicalOrder.length) {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '1';
            } else {
              submitBtn.disabled = true;
              submitBtn.style.opacity = '0.5';
            }

            if (sequence.length > 0) {
              undoBtn.disabled = false;
              undoBtn.style.opacity = '1';
            } else {
              undoBtn.disabled = true;
              undoBtn.style.opacity = '0.5';
            }

            window.__seq_map.set(seqKey, sequence.slice());
          };

          poolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const step = btn.getAttribute('data-step');
              if (sequence.length < canonicalOrder.length && !btn.disabled) {
                sequence.push(step);
                btn.disabled = true;
                btn.style.background = '#ccc';
                btn.style.opacity = '0.5';
                updateDisplay();
              }
            });
          });

          undoBtn.addEventListener('click', () => {
            if (sequence.length > 0) {
              const lastStep = sequence.pop();
              poolBtns.forEach(btn => {
                if (btn.getAttribute('data-step') === lastStep) {
                  btn.disabled = false;
                  btn.style.background = '#f0f0f0';
                  btn.style.opacity = '1';
                }
              });
              updateDisplay();
            }
          });

          updateDisplay();
        },
        on_finish: function(data) {
          const seq = (window.__seq_map && window.__seq_map.get(seqKey)) || [];
          data.entered_sequence = seq.slice();
          data.correct_score = seq.filter((step, i) => step === data.correct_order[i]).length;
          data.kendall_tau = kendallTau(data.correct_order, seq);
          if (window.__seq_map) window.__seq_map.delete(seqKey);
        }
      }
    ];
  }

  function buildProceduralRecallTask() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Recipe Memory Test / レシピ記憶テスト</h3><p>Begin with the first step and end with the last step before eating.</p>`,
      questions: [
        { prompt: '<b>Step 1 (First / 最初):</b>', name: 'step_1', required: true, rows: 2 },
        { prompt: '<b>Step 2:</b>',              name: 'step_2', required: true, rows: 2 },
        { prompt: '<b>Step 3:</b>',              name: 'step_3', required: true, rows: 2 },
        { prompt: '<b>Step 4:</b>',              name: 'step_4', required: true, rows: 2 },
        { prompt: '<b>Step 5 (Last / 最後):</b>', name: 'step_5', required: true, rows: 2 },
      ],
      button_label: 'Submit / 送信',
      data: {
        task: 'procedural_recall_open_ended',
        condition: testCondition,
        pid: currentPID,
        image_set_version: imageSetVersion,
        foley_token_version: foleyTokenVersion
      },
      on_finish: (data) => {
        const r = asObject(data.response ?? data.responses);
        data.recalled_steps = [
          r.step_1 || '',
          r.step_2 || '',
          r.step_3 || '',
          r.step_4 || '',
          r.step_5 || ''
        ];
        data.needs_manual_scoring = true;
      }
    };
  }

  function buildFoleyTask(items) {
    const tasks = [];
    tasks.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;"><h3>Sound Recognition / 音の認識</h3><p>Listen and choose what the sound represents.</p></div>`,
      choices: ['Begin / 開始']
    });

    items.forEach((stim, idx) => {
      if (idx > 0) {
        if (have('jsPsychHtmlKeyboardResponse')) {
          tasks.push({
            type: T('jsPsychHtmlKeyboardResponse'),
            stimulus: `<div style="text-align:center;padding:20px;">Press SPACE for next sound</div>`,
            choices: [' ']
          });
        } else {
          tasks.push({
            type: T('jsPsychHtmlButtonResponse'),
            stimulus: `<div style="text-align:center;padding:20px;">Ready for the next sound?</div>`,
            choices: ['Continue / 続行']
          });
        }
      }

      const cleanupKey = `foley_${idx}`;

      tasks.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `
          <div style="text-align:center;">
            <div style="padding:20px;">
              <button id="play-sound-${idx}" class="jspsych-btn">▶️ Play Sound</button>
              <div id="status-${idx}" style="font-size:13px;color:#666;margin-top:8px;">Loading…</div>
            </div>
            <p>What does this sound represent?</p>
            <p style="color:#666;margin-top:4px;">この音は何を表していますか？</p>
          </div>`,
        choices: stim.options,
        data: {
          task: 'foley_recognition',
          audio_key: stim.audio,
          correct_answer: stim.correct,
          pid: currentPID,
          condition: testCondition,
          trial_number: idx + 1,
          mapping_type: stim.mapping_type,
          cleanup_key: cleanupKey,
          foley_token_version: foleyTokenVersion
        },
        on_load: function() {
          const btn = document.getElementById(`play-sound-${idx}`);
          const status = document.getElementById(`status-${idx}`);
          const allBtns = Array.from(document.querySelectorAll('.jspsych-btn'));
          const answerBtns = allBtns.filter(b => b !== btn);
          const candidates = soundCandidatesFor(stim.audio);
          const loader = createResilientAudioLoader(candidates);

          answerBtns.forEach(ab => {
            ab.disabled = true;
            ab.style.opacity = '0.5';
          });
          btn.disabled = true;
          status.textContent = 'Loading audio…';

          loader.loadNext(
            (audio) => {
              status.textContent = 'Ready - click to play';
              btn.disabled = false;
              let clickHandler = null;
              let endHandler = null;
              const enableAnswerButtons = () => {
                answerBtns.forEach(ab => {
                  ab.disabled = false;
                  ab.style.opacity = '1';
                });
              };

              clickHandler = () => {
                btn_disabled_state(true);
                status.textContent = '🔊 Playing…';
                audio.currentTime = 0;
                audio.play().then(() => {
                  endHandler = () => {
                    btn_disabled_state(false, '🔁 Play Again');
                    status.textContent = 'Finished - choose your answer';
                    enableAnswerButtons();
                  };
                  audio.addEventListener('ended', endHandler, { once: true });
                }).catch((e) => {
                  console.warn('[posttest] Audio playback error:', e);
                  btn_disabled_state(false);
                  status.textContent = 'Playback failed - please try again';
                });
              };

              const btn_disabled_state = (flag, text) => {
                btn.disabled = flag;
                if (text) btn.textContent = text;
              };

              btn.addEventListener('click', clickHandler);
              cleanupManager.register(cleanupKey, () => {
                btn.removeEventListener('click', clickHandler);
                if (endHandler) { audio.removeEventListener('ended', endHandler); }
                try { audio.pause(); audio.src = ''; audio.load(); } catch(e) {}
              });
            },
            () => {
              console.warn('[posttest] All candidates failed for', stim.audio);
              btn.textContent = '❌ Audio unavailable';
              btn.disabled = true;
              status.textContent = 'Audio failed. Please select an answer now.';
              answerBtns.forEach(ab => {
                ab.disabled = false;
                ab.style.opacity = '1';
              });
            }
          );
        },
        on_finish: (d) => {
          cleanupManager.cleanup(d.cleanup_key);
          d.correct = (d.response === d.correct_answer);
        },
        post_trial_gap: 800
      });
    });

    return tasks;
  }

  function buildPictureNamingTask(items) {
    const tasks = [];
    tasks.push({
      type: T('jsPsychInitializeMicrophone'),
      data: { task: 'mic_init' },
      on_finish: () => { microphoneAvailable = true; }
    });
    tasks.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="max-width:640px;margin:0 auto;text-align:center"><h3>Picture Description / 絵の説明</h3><p>Describe the picture in English with as much detail as you can — <b>objects, actions, sounds, smells</b>.</p></div>`,
      choices: ['Start / 開始']
    });
    tasks.push({
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `<div style="text-align:center;"><h4>Microphone check</h4><p>Say "test" for 2 seconds.</p></div>`,
      recording_duration: 2000,
      show_done_button: true,
      allow_playback: true,
      accept_button_text: 'OK',
      data: { task: 'mic_check' }
    });

    const naming_timeline = {
      timeline: [{
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: () => {
          const stim = jsPsych.timelineVariable('stim');
          const img = imageSrcFor(stim.target);
          const fb = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='16'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
          return `<div style="text-align:center;"><img src="${img||fb}" style="width:350px;border-radius:8px" onerror="this.src='${fb}'" /><p style="margin-top:12px;">Click to record for 4 seconds.</p></div>`;
        },
        choices: ['Start recording / 録音開始'],
        data: () => ({
          task: 'picture_naming_prepare',
          target: jsPsych.timelineVariable('stim').target,
          category: jsPsych.timelineVariable('stim').category,
          trial_index: jsPsych.timelineVariable('idx'),
          pid: currentPID,
          condition: testCondition,
          image_set_version: imageSetVersion
        })
      }, {
        type: T('jsPsychHtmlAudioResponse'),
        stimulus: () => {
          const stim = jsPsych.timelineVariable('stim');
          const img = imageSrcFor(stim.target);
          const fb = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='16'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
          return `<div style="text-align:center;"><img src="${img||fb}" style="width:350px;border-radius:8px" onerror="this.src='${fb}'" /><div style="margin-top:10px;background:#ffebee;border-radius:8px;padding:10px;"><b>🔴 Recording…</b> Describe the picture (objects, actions, sounds, smells).</div></div>`;
        },
        recording_duration: 4000,
        show_done_button: false,
        data: () => {
          const stim = jsPsych.timelineVariable('stim');
          const idx = jsPsych.timelineVariable('idx');
          return {
            task: 'picture_naming_audio',
            target: stim.target,
            category: stim.category,
            pid: currentPID,
            condition: testCondition,
            phase: 'post',
            trial_index: idx,
            cleanup_key: `blob_${currentPID}_${idx}`,
            image_set_version: imageSetVersion
          };
        },
        on_finish: (d) => {
          const tgt = (d.target || 'unknown').toLowerCase();
          const idx = d.trial_index || 'x';
          d.audio_filename = `post_${currentPID}_${tgt}_${idx}.wav`;
          d.needs_audio_scoring = true;
          d.rubric_score = null;
          try {
            const rec = d.response && (d.response instanceof Blob ? d.response : d.response.recording);
            if (rec instanceof Blob) {
              d.audio_blob_url = URL.createObjectURL(rec);
              cleanupManager.register(d.cleanup_key, () => {
                if (d.audio_blob_url) { URL.revokeObjectURL(d.audio_blob_url); }
              });
            }
          } catch(e) {
            console.error('[posttest] Error processing audio blob:', e);
          }
        }
      }],
      timeline_variables: items.map((s, i) => ({ stim: s, idx: i + 1 })),
      randomize_order: true
    };
    tasks.push(naming_timeline);

    return tasks;
  }

  function buildTransferTask() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;"><h3>Recognition Test / 認識テスト</h3><p>Did this word appear in the VR training?</p></div>`,
      choices: ['Begin / 開始']
    };

    const flatTrials = transfer_words.flatMap(item => ([
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center; padding:28px;"><div style="padding: 22px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;"><p style="font-size:32px; font-weight:bold; margin:10px 0; color:#333">${item.word}</p></div><p style="font-size:14px; color:#666; margin-top:16px;">Did you see this word in the VR training?</p></div>`,
        choices: ['YES - I saw this', 'NO - I did not see this'],
        data: {
          task: 'transfer_test',
          word: item.word,
          pos: item.pos,
          iconic: item.iconic,
          word_type_label: item.type,
          correct_answer: item.trained,
          condition: testCondition,
          pid: currentPID,
          image_set_version: imageSetVersion
        },
        on_finish: (d) => {
          const yes = (d.response === 0);
          d.response_label = yes ? 'yes' : 'no';
          d.correct = (yes === d.correct_answer);
          d.signal_type = d.correct_answer ? (yes ? 'hit' : 'miss') : (yes ? 'false_alarm' : 'correct_rejection');
        }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;"><p>How confident are you?</p><p>どのくらい自信がありますか？</p></div>`,
        choices: ['1 (Guess)', '2', '3', '4 (Very sure)'],
        data: { task: 'transfer_confidence', pid: currentPID, condition: testCondition },
        on_finish: (d) => { d.confidence = (d.response ?? null) !== null ? (d.response + 1) : null; }
      }
    ]));

    return { intro, trials: flatTrials };
  }

  function buildPostQuestionnaire() {
    if (!have('jsPsychSurvey')) {
      console.warn('[posttest] jsPsychSurvey not available, using SurveyLikert fallback');
      if (have('jsPsychSurveyLikert')) {
        return {
          type: T('jsPsychSurveyLikert'),
          preamble: '<h3>Post-Training Questionnaire / 訓練後アンケート</h3>',
          questions: [
            { prompt: 'How confident are you with the vocabulary?', labels: ['1 (Not at all)', '2', '3', '4', '5 (Very confident)'], required: true, name: 'confidence_vocabulary' },
            { prompt: 'How confident are you with the procedure?', labels: ['1 (Not at all)', '2', '3', '4', '5 (Very confident)'], required: true, name: 'confidence_procedure' },
            { prompt: 'How helpful was the training?', labels: ['1 (Not helpful)', '2', '3', '4', '5 (Very helpful)'], required: true, name: 'training_helpfulness' }
          ],
          button_label: 'Submit / 送信',
          data: { task: 'post_questionnaire', condition: testCondition, pid: currentPID }
        };
      }
      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<p>Questionnaire unavailable (Survey plugin not loaded)</p>',
        choices: ['Continue']
      };
    }

    return {
      type: T('jsPsychSurvey'),
      survey_json: {
        title: 'Post-Training Questionnaire / 訓練後アンケート',
        showQuestionNumbers: 'off',
        showCompletedPage: false,
        completeText: 'Submit / 送信',
        pages: [{
          elements: [
            { type: 'rating', name: 'confidence_vocabulary', title: 'How confident are you with the vocabulary?', isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'rating', name: 'confidence_procedure', title: 'How confident are you with the procedure?', isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'rating', name: 'training_helpfulness', title: 'How helpful was the training?', isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'comment', name: 'learning_strategies', title: 'What strategies did you use to learn? (optional)', isRequired: false, rows: 3 },
            { type: 'comment', name: 'difficulties', title: 'What was most difficult? (optional)', isRequired: false, rows: 3 },
            { type: 'comment', name: 'additional_comments', title: 'Any other comments? (optional)', isRequired: false, rows: 3 },
          ]
        }]
      },
      data: { task: 'post_questionnaire', condition: testCondition, pid: currentPID }
    };
  }

  function buildExitOpenQuestion() {
    if (!have('jsPsychSurveyText')) {
      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<p>Feedback form unavailable.</p>',
        choices: ['Finish']
      };
    }

    return {
      type: T('jsPsychSurveyText'),
      preamble: `<div style="text-align:center;"><h3>Final Comments / 最後のコメント</h3><p>Please share any questions, concerns, or issues you had with the test.</p><p>テストについての質問・懸念・問題点があればご記入ください。</p></div>`,
      questions: [{
        prompt: 'Your feedback (optional) / フィードバック（任意）',
        name: 'exit_feedback',
        rows: 5,
        required: false
      }],
      button_label: 'Submit & Finish / 送信して終了',
      data: { task: 'exit_feedback', condition: testCondition, pid: currentPID }
    };
  }

  /* ========== DATA SAVING ========== */
  function saveData() {
    console.log('[posttest] Saving data for participant:', currentPID);
    const allData = jsPsych.data.get().values();
    console.log('[posttest] Total trials collected:', allData.length);

    const dataToSave = {
      participant_id: currentPID,
      condition: testCondition,
      image_set_version: imageSetVersion,
      foley_token_version: foleyTokenVersion,
      timestamp: new Date().toISOString(),
      trial_count: allData.length,
      trials: allData
    };

    console.log('[posttest] Data package:', dataToSave);
    console.log('[posttest] JSON length:', JSON.stringify(dataToSave).length, 'characters');

    showCompletion(true);
  }

  function showCompletion(saveSuccess = true) {
    const target = document.getElementById('jspsych-target');
    if (target) {
      const statusIcon = saveSuccess ? '✓' : '⚠️';
      const statusColor = saveSuccess ? '#4CAF50' : '#ff9800';
      const statusText = saveSuccess 
        ? 'Data saved successfully! / データは正常に保存されました！'
        : 'Warning: Data may not have been saved. Check console. / データが保存されていない可能性があります。';

      target.innerHTML = `
        <div style="max-width:600px; margin:60px auto; text-align:center; padding:40px; background:#f5f5f5; border-radius:12px;">
          <h2 style="color:${statusColor};">${statusIcon} Test Complete!</h2>
          <p><strong>Participant:</strong> ${currentPID}</p>
          <p><strong>Condition:</strong> ${testCondition}</p>
          <p style="margin-top:20px; padding:15px; background:${saveSuccess ? '#e8f5e9' : '#fff3e0'}; border-radius:8px; border:2px solid ${statusColor};">
            ${statusText}
          </p>
          <p style="margin-top:20px;">Thank you for participating!</p>
          <p>ご参加ありがとうございました！</p>
          <button onclick="location.reload()" style="margin-top:20px; padding:10px 24px; font-size:16px;">
            Start New Session / 新しいセッションを開始
          </button>
        </div>`;
    }
  }

  window.addEventListener('beforeunload', () => {
    cleanupManager.cleanupAll();
  });
})();
