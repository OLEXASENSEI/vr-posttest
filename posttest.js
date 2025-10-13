/**
 * posttest.js — jsPsych-only version using your actual asset names.
 * No SurveyJS. Picture naming prompt includes English + Japanese guidance.
 */

(function () {
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];

  /* ========= Asset manifests ========= */
  const IMAGE_VARIANTS = {
    bowl:     ['img/bowl_01.png',     'img/bowl_02.png'],
    butter:   ['img/butter_01.png',   'img/butter_02.png'],
    cracking: ['img/cracking_01.png', 'img/cracking_02.png'],
    egg:      ['img/egg_01.png',      'img/egg_02.png'],
    flipping: ['img/flipping_01.png', 'img/flipping_02.png'],
    flour:    ['img/flour_01.png',    'img/flour_02.png'],
    milk:     ['img/milk_01.png',     'img/milk_02.png'],
    mixing:   ['img/mixing_01.png',   'img/mixing_02.png'],
    pan:      ['img/pan_01.png',      'img/pan_02.png'],
    pancake:  ['img/pancake_01.png',  'img/pancake_02.png'],
    pouring:  ['img/pouring_01.png',  'img/pouring_02.png'],
    sizzling: ['img/sizzling_01.png', 'img/sizzling_02.png'],
    spatula:  ['img/spatula_01.png',  'img/spatula_02.png'],
    sugar:    ['img/sugar_01.png',    'img/sugar_02.png'],
    whisk:    ['img/whisk_01.png',    'img/whisk_02.png'],
  };

  const AUDIO_VARIANTS = {
    crack:  ['sounds/crack_1.mp3',  'sounds/crack_2.mp3'],
    whisk:  ['sounds/whisk_1.mp3',  'sounds/whisk_2.mp3'],
    pour:   ['sounds/pour_1.mp3',   'sounds/pour_2.mp3'],
    sizzle: ['sounds/sizzle_1.mp3', 'sounds/sizzle_2.mp3'],
    flip:   ['sounds/flip_1.mp3',   'sounds/flip_2.mp3'],
    spread: ['sounds/spread_1.mp3', 'sounds/spread_2.mp3'],
  };

  const PLACEHOLDER_IMG = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
      <rect width="320" height="240" fill="#e3f2fd"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="26" fill="#1565c0">No image</text>
    </svg>`);

  const PLACEHOLDER_AUDIO =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

  const shuffle = (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));

  const randomVariant = (mapping, key) => {
    const list = mapping[key];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  };

  const picture_words = Object.keys(IMAGE_VARIANTS);

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

  const asObject = (x) => {
    if (!x) return {};
    if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } }
    return (typeof x === 'object') ? x : {};
  };

  const makeImageCard = (word) => {
    const src = randomVariant(IMAGE_VARIANTS, word);
    if (!src) {
      return `<div style="width:180px;height:140px;border-radius:10px;border:1px dashed #90caf9;background:#e3f2fd;display:flex;align-items:center;justify-content:center;font-weight:600;color:#1565c0;">${word}</div>`;
    }
    return `<div style="width:180px;text-align:center;">
      <img src="${src}" alt="${word}"
         onerror="this.onerror=null;this.src='data:image/svg+xml,${PLACEHOLDER_IMG}';"
         style="width:180px;height:130px;object-fit:cover;border-radius:10px;border:1px solid #ccc;" />
      <div style="margin-top:6px;color:#1565c0;font-size:13px;">${word}</div>
    </div>`;
  };

  const getAudio = (key) =>
    randomVariant(AUDIO_VARIANTS, key) || PLACEHOLDER_AUDIO;

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

  /* ========= ENTRY ========= */
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
      on_finish: () => { saveData(); }
    });

    const timeline = buildTimeline(delayed);
    jsPsych.run(timeline);
  };

  window.addEventListener('beforeunload', () => {
    try { jsPsych?.terminate?.(); } catch {}
  });

  /* ========= TIMELINE BUILDER ========= */
  function buildTimeline(delayed) {
    const tl = [];

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

  function build4AFC(delayed) {
    const pool = delayed ? picture_words.slice(0, 6) : picture_words;
    const trials = pool.map(target => {
      const foils = sample(pool.filter(w => w !== target), 3);
      const choices = shuffle([target, ...foils]);
      const correctIndex = choices.indexOf(target);
      return {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <h3>Which picture is <em>${target}</em>?</h3>
          <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:18px;">
            ${choices.map(makeImageCard).join('')}
          </div>
        </div>`,
        choices: choices.map((_, i) => `Choice ${i + 1}`),
        data: { task: '4afc', word: target, choices, correct: correctIndex, pid: currentPID, condition: testCondition },
        on_finish: data => { data.correct = (data.response === data.correct); }
      };
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Vocabulary Check</h2><p>Select the card that matches the word.</p>',
      choices: ['Start']
    }, ...trials];
  }

  function buildSpeededMatch() {
    const combos = [];
    const base = shuffle(picture_words);
    base.forEach(word => {
      combos.push({ word, match: true, card: makeImageCard(word) });
      const foil = base.find(w => w !== word);
      if (foil) combos.push({ word, match: false, card: makeImageCard(foil) });
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Word → Picture (Speeded)</h2><p>Press <strong>F</strong> if the picture matches the word, <strong>J</strong> if it does not.</p>',
      choices: ['Begin']
    }, ...shuffle(combos).slice(0, base.length * 2).map(stim => ({
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: `<div style="text-align:center;">
        <h3>${stim.word.toUpperCase()}</h3>
        ${stim.card}
        <p style="margin-top:12px;color:#666;">F = match, J = not match</p>
      </div>`,
      choices: ['f', 'j'],
      trial_duration: 3500,
      data: { task: 'word_picture_speeded', word: stim.word, match: stim.match, correct_response: stim.match ? 'f' : 'j', pid: currentPID, condition: testCondition },
      on_finish: data => { data.correct = (data.response === data.correct_response); }
    }))];
  }

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
      on_finish: data => {
        data.steps = Object.values(asObject(data.response));
      }
    }];
  }

  function buildSequencing() {
    const shuffled = shuffle(sequence_steps);

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sequencing</h2><p>Click each step in the correct order.</p>',
      choices: ['Start']
    }, {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        let html = '<div style="text-align:center;"><h3>Select the steps in order</h3>';
        html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
        shuffled.forEach(step => {
          html += `<button class="jspsych-btn seq-btn" data-step="${step}" style="width:200px;">${step}</button>`;
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

  function buildFoley(delayed) {
    const pool = delayed ? foley_stimuli.slice(0, 3) : foley_stimuli;
    const trials = pool.map((stim, idx) => ({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <button class="jspsych-btn" id="play-${idx}">▶️ Play sound</button>
        <p id="status-${idx}" style="margin-top:10px;color:#666;">Listen before answering.</p>
      </div>`,
      choices: stim.options,
      data: { task: 'foley', audio_key: stim.audio, correct: stim.correct, options: stim.options, pid: currentPID, condition: testCondition },
      on_load: () => {
        const audio = new Audio(getAudio(stim.audio));
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
    }));

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sound Recognition</h2><p>Play the sound, then choose what it represents.</p>',
      choices: ['Begin']
    }, ...trials];
  }

  function buildNaming(delayed) {
    const pool = delayed ? picture_words.slice(0, 6) : picture_words;
    return [
      {
        type: T('jsPsychInitializeMicrophone'),
        data: { task: 'mic_init' },
        on_finish: () => { microphoneAvailable = true; }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h2>Picture Naming</h2><p>Describe the object, action, sounds, and smells in English and Japanese. / 英語で物・動作・音・匂いを説明してください。</p>',
        choices: ['Begin']
      },
      {
        timeline: pool.map((word, i) => ({
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: `<div style="text-align:center;">
            ${makeImageCard(word)}
            <p style="margin-top:12px;">Click to start recording (4 seconds).</p>
          </div>`,
          choices: ['Start recording'],
          data: { task: 'naming_prepare', target: word, trial_index: i + 1, pid: currentPID, condition: testCondition }
        }))
      },
      {
        timeline: pool.map((word, i) => ({
          type: T('jsPsychHtmlAudioResponse'),
          stimulus: `<div style="text-align:center;">
            ${makeImageCard(word)}
            <p style="margin-top:12px;color:#d32f2f;font-weight:bold;">
              Recording… describe the object, action, sounds, smells in English.<br/>
              録音中：物・動作・音・匂いを英語で説明してください。
            </p>
          </div>`,
          recording_duration: 4000,
          show_done_button: false,
          data: { task: 'naming_audio', target: word, trial_index: i + 1, pid: currentPID, condition: testCondition },
          on_finish: data => { data.needs_audio_scoring = true; data.rubric_score = null; }
        }))
      }
    ];
  }

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

  function buildLikert() {
    return {
      type: T('jsPsychSurveyLikert'),
      preamble: '<h3>Training Feedback</h3>',
      questions: [
        { prompt: 'Confidence with vocabulary', labels: ['1', '2', '3', '4', '5'], required: true, name: 'confidence_vocab' },
        { prompt: 'Confidence with procedure', labels: ['1', '2', '3', '4', '5'], required: true, name: 'confidence_proc' },
        { prompt: 'Training helpfulness', labels: ['1', '2', '3', '4', '5'], required: true, name: 'helpfulness' }
      ],
      button_label: 'Submit',
      data: { task: 'likert_feedback', pid: currentPID, condition: testCondition }
    };
  }

  function buildExit() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: '<h3>Final Comments</h3><p>Any questions, concerns, or issues to share?</p>',
      questions: [{ prompt: 'Your comments (optional)', name: 'comments', rows: 4, required: false }],
      button_label: 'Finish',
      data: { task: 'exit_comments', pid: currentPID, condition: testCondition }
    };
  }

  /* ========= Save & completion ========= */
  function saveData() {
    const allData = jsPsych.data.get().values();
    console.log('[posttest] Trials collected:', allData.length);
    console.log('[posttest] Sample:', allData.slice(0, 5));

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <h2>✓ Post-test complete</h2>
          <p><strong>Participant:</strong> ${currentPID}</p>
          <p><strong>Condition:</strong> ${testCondition}</p>
          <p style="margin-top:20px;">Thank you for participating! ご参加ありがとうございました。</p>
          <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
        </div>
      `;
    }
  }
})();
