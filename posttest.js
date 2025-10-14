/**
 * posttest.js — jsPsych-only, aligned with VR post-test requirements.
 * - 4AFC: image cards above buttons, category-matched foils (with fallback).
 * - Media preload with fallbacks.
 * - Picture naming: mic check -> auto-record 4 s per picture.
 * - Feedback wording updated; final comments prompt refined.
 * - Automatic JSON download on completion.
 */
(function () {
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';

  const T = (name) => window[name];

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

    jsPsych.run(buildTimeline(delayed));
  };

  window.addEventListener('beforeunload', () => {
    try { jsPsych?.terminate?.(); } catch {}
  });

  /* ---------- Timeline ---------- */
  function buildTimeline(delayed) {
    const tl = [];

    // preload all assets
    const preloadImages = [...new Set(PICTURES.flatMap(p => p.variants))];
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
      </div>`,
      choices: ['Begin / 開始']
    });

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
    tl.push(buildLikert());
    tl.push(buildExit());
    return tl;
  }

  /* ----- 4AFC ----- */
  function build4AFC(delayed) {
    const pool = delayed ? PICTURES.slice(0, 6) : PICTURES;
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
        on_finish: data => { data.correct = (data.response === data.correct); }
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Vocabulary Check</h2><p>Select the picture that matches the word.</p>',
      choices: ['Start']
    }, ...trials];
  }

  /* ----- Speeded match ----- */
  function buildSpeededMatch() {
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

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Word → Picture (Speeded)</h2><p>Press <strong>F</strong> if the picture matches the word, <strong>J</strong> if it does not.</p>',
      choices: ['Begin']
    }, ...shuffle(combos).slice(0, Math.min(combos.length, 2 * shuffled.length)).map(stim => ({
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: `<div style="text-align:center;">
        <h3>${stim.word.toUpperCase()}</h3>
        <div style="display:flex;justify-content:center;margin:18px 0;">
          <img src="${stim.src}" alt="${stim.word}"
            style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;"
            onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
        </div>
        <p style="margin-top:12px;color:#666;">F = match, J = not match</p>
      </div>`,
      choices: ['f', 'j'],
      trial_duration: 3500,
      data: { task: 'word_picture_speeded', word: stim.word, match: stim.match, correct_response: stim.match ? 'f' : 'j', pid: currentPID, condition: testCondition },
      on_finish: data => { data.correct = (data.response === data.correct_response); }
    }))];
  }

  /* ----- Procedural recall ----- */
  function buildProceduralRecall() {
    return [{
      type: T('jsPsychSurveyText'),
      preamble: '<h3>Recipe Recall</h3><p>List the steps (in your own words) from first to last.</p>',
      questions: sequence_steps.map((label, i) => ({
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

  /* ----- Foley recognition ----- */
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
        on_load: () => {
          const audio = new Audio(audioSrc);
          const play = document.getElementById(`play-${idx}`);
          const status = document.getElementById(`status-${idx}`);
          play.addEventListener('click', () => {
            status.textContent = 'Playing…';
            audio.currentTime = 0;
            audio.play().then(() => {
              setTimeout(() => status.textContent = 'Choose the best option.', 500);
            }).catch(() => status.textContent = 'Audio failed (placeholder).');
          });
        },
        on_finish: data => { data.correct = (data.response === data.correct); },
        post_trial_gap: 300
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sound Recognition</h2><p>Play the sound, then choose what it represents.</p>',
      choices: ['Begin']
    }, ...trials];
  }

  /* ----- Picture naming (auto recording) ----- */
function buildNaming(delayed) {
  const pool = delayed ? PICTURES.slice(0, 6) : PICTURES;
  const items = shuffle(pool).map(pic => ({
    target: pic.word,
    category: pic.category,
    image: pickImageSrc(pic.word)
  }));

  const prepTrial = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: () => {
      const img = jsPsych.timelineVariable('image');
      const word = jsPsych.timelineVariable('target');
      return `<div style="max-width:520px;margin:0 auto;text-align:center;">
        <img src="${img}" alt="${word}"
            style="width:260px;height:170px;object-fit:cover;border-radius:12px;border:1px solid #ccc;margin-bottom:12px;"
            onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
        <p>Click “Start recording” when you are ready (4 seconds).</p>
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
          Recording… describe the object, action, sounds, smells in English.<br/>
          録音中：物・動作・音・匂いを英語で説明してください。（4秒）
        </p>
      </div>`;
    },
    recording_duration: 4000,
    show_done_button: false,
    allow_playback: false,
    post_trial_gap: 800,   // short pause before the next picture
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

  return [
    {
      type: T('jsPsychInitializeMicrophone'),
      data: { task: 'mic_init' }
    },
    {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <h2>Picture Naming</h2>
        <p>Describe the object, action, sounds, smells in English.<br>
           英語で物・動作・音・匂いを説明してください。</p>
      </div>`,
      choices: ['Begin']
    },
    {
      timeline: [prepTrial, recordTrial],
      timeline_variables: items,
      randomize_order: true
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
