/**
 * posttest.js — SIMPLE RESET (jsPsych-only)
 * - No SurveyJS dependency
 * - Inline placeholders to avoid missing asset errors
 * - Sequence: intro → 4AFC → mic naming → foley → sequencing → transfer → Likert → exit
 */

(function () {

  /* ------------ GLOBALS ------------ */
  let jsPsych = null;
  let currentPID = 'unknown';
  let testCondition = 'immediate';
  let microphoneAvailable = false;

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];

  /* ------------ PLACEHOLDERS / MEDIA ------------ */
  const PLACEHOLDER_IMG = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
      <rect width="320" height="240" fill="#e3f2fd"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="26" fill="#1565c0">No image</text>
    </svg>`);

  const PLACEHOLDER_AUDIO_DATAURI =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='; // silent ping

  // Supply real paths here when you have assets
  const IMAGE_PATHS = {
    bowl:     '',
    butter:   '',
    egg:      '',
    flour:    '',
    milk:     '',
    pan:      '',
    pancake:  '',
    spatula:  '',
    sugar:    '',
    whisk:    '',
    mixing:   '',
    cracking: '',
    pouring:  '',
    flipping: '',
    sizzling: '',
  };

  const AUDIO_PATHS = {
    crack: '',
    whisk: '',
    pour:  '',
    sizzle:'',
  };

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

  const picture_stimuli = Object.keys(IMAGE_PATHS);

  const foley_stimuli = [
    { audio: 'crack',  options: ['cracking', 'whisking'],           correct: 0 },
    { audio: 'whisk',  options: ['whisking', 'pouring'],            correct: 0 },
    { audio: 'pour',   options: ['pouring', 'flipping'],            correct: 0 },
    { audio: 'sizzle', options: ['sizzling', 'stirring'],           correct: 0 },
  ];

  const sequence_steps = [
    'Crack eggs', 'Mix flour and eggs', 'Heat the pan', 'Pour batter', 'Flip when ready'
  ];

  const asObject = (x) => {
    if (!x) return {};
    if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } }
    return (typeof x === 'object') ? x : {};
  };

  const shuffle = (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pickFoils = (arr, count) => shuffle(arr).slice(0, count);

  const makeImageCard = (target) => {
    const path = IMAGE_PATHS[target];
    if (path && path.length) {
      return `<div class="img-card">
        <img src="${path}" alt="${target}"
          onerror="this.onerror=null;this.src='data:image/svg+xml,${PLACEHOLDER_IMG}';"
          style="width:160px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ccc;" />
        <div style="font-size:13px;margin-top:6px;color:#1565c0;">${target}</div>
      </div>`;
    }
    return `<div class="img-card" style="width:160px;height:120px;border-radius:8px;border:1px dashed #90caf9;background:#e3f2fd;display:flex;align-items:center;justify-content:center;font-weight:600;color:#1565c0;">
      ${target}
    </div>`;
  };

  const getAudioSource = (key) => AUDIO_PATHS[key] || PLACEHOLDER_AUDIO_DATAURI;

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

  /* ------------ ENTRY ------------ */
  window.__START_POSTTEST = (pid, delayed) => {
    currentPID = pid || 'unknown';
    testCondition = delayed ? 'delayed' : 'immediate';
    console.log('[posttest] Starting condition:', testCondition, 'PID:', currentPID);

    const picker = document.getElementById('picker');
    if (picker) picker.style.display = 'none';

    cleanup();

    jsPsych = T('initJsPsych')({
      display_element: 'jspsych-target',
      show_progress_bar: true,
      message_progress_bar: 'Progress / 進捗',
      on_finish: () => {
        saveData();
      }
    });

    const timeline = buildTimeline(delayed);
    jsPsych.run(timeline);
  };

  function cleanup() {
    try { jsPsych?.terminate(); } catch {}
  }

  /* ------------ TIMELINE ------------ */
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
    if (!delayed) {
      tl.push(...buildSpeededWordPicture());
    }
    tl.push(...buildProceduralRecall());
    if (!delayed) {
      tl.push(...buildSequencing());
    }
    tl.push(...buildFoley(delayed));
    tl.push(...buildNaming(delayed));

    if (!delayed) {
      const transfer = buildTransferBlock();
      tl.push(transfer.intro);
      tl.push(...transfer.trials);
    }

    tl.push(buildLikert());
    tl.push(buildExitText());

    return tl;
  }

  function build4AFC(delayed) {
    const pool = delayed ? picture_stimuli.slice(0, 6) : picture_stimuli;
    const trials = [];
    pool.forEach(target => {
      const foils = pickFoils(pool.filter(w => w !== target), 3);
      const choices = shuffle([target, ...foils]);
      const targetIdx = choices.indexOf(target);
      trials.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center;">
          <h3>Which picture is <em>${target}</em>?</h3>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:16px auto;max-width:700px;">
            ${choices.map(makeImageCard).join('')}
          </div>
        </div>`,
        choices: choices.map((_, i) => `Choice ${i + 1}`),
        data: {
          task: '4afc',
          word: target,
          choices,
          correct: targetIdx,
          pid: currentPID,
          condition: testCondition
        },
        on_finish: data => {
          data.correct_choice = data.correct;
          data.correct = (data.response === data.correct_choice);
        }
      });
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Vocabulary Check</h2><p>Select the card that matches the word on each trial.</p>`,
      choices: ['Start']
    }, ...trials];
  }

  function buildSpeededWordPicture() {
    const combos = [];
    const base = shuffle(picture_stimuli);
    base.forEach(target => {
      combos.push({ word: target, card: makeImageCard(target), match: true });
      const foil = base.find(w => w !== target);
      if (foil) combos.push({ word: target, card: makeImageCard(foil), match: false });
    });

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Word → Picture (Speeded)</h2><p>Press <strong>F</strong> if the picture matches the word, <strong>J</strong> if it does not.</p>`,
      choices: ['Begin']
    },
    ...shuffle(combos).slice(0, base.length * 2).map(stim => ({
      type: T('jsPsychHtmlKeyboardResponse'),
      stimulus: `<div style="text-align:center;">
        <h3>${stim.word.toUpperCase()}</h3>
        ${stim.card}
        <p style="margin-top:14px;color:#666;">F = match, J = not</p>
      </div>`,
      choices: ['f', 'j'],
      trial_duration: 3500,
      data: {
        task: 'word_picture_speeded',
        word: stim.word,
        is_match: stim.match,
        correct_response: stim.match ? 'f' : 'j',
        pid: currentPID,
        condition: testCondition
      },
      on_finish: data => {
        data.correct = (data.response === data.correct_response);
      }
    }))];
  }

  function buildProceduralRecall() {
    return [{
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Recipe Recall</h3><p>List the steps (in your own words) from first to last.</p>`,
      questions: sequence_steps.map((label, i) => ({
        prompt: `Step ${i + 1}:`,
        name: `step_${i + 1}`,
        rows: 2,
        required: (i < sequence_steps.length - 1)
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
      stimulus: '<h2>Sequencing</h2><p>Click the steps in the correct order (1–5).</p>',
      choices: ['Start']
    }, {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        let html = '<div style="text-align:center;"><h3>Select the steps in order</h3>';
        html += '<div id="seq-container" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">';
        shuffled.forEach(step => {
          html += `<button class="jspsych-btn seq-btn" data-step="${step}" style="width:190px;">${step}</button>`;
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
        const chosen = [];
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const step = btn.dataset.step;
            if (!chosen.includes(step)) {
              chosen.push(step);
              btn.disabled = true;
              btn.style.opacity = '0.5';
              output.textContent = chosen.map((s, i) => `${i + 1}. ${s}`).join('  |  ');
              if (chosen.length === sequence_steps.length) {
                submit.disabled = false;
                submit.style.opacity = '1';
              }
            }
          });
        });
      },
      on_finish: data => {
        const output = document.getElementById('seq-output')?.textContent || '';
        const entered = output.split('|').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        data.entered_sequence = entered;
        data.correct_positions = entered.filter((step, i) => step === data.correct_order[i]).length;
        data.kendall_tau = kendallTau(data.correct_order, entered);
      }
    }];
  }

  function buildFoley(delayed) {
    const pool = delayed ? foley_stimuli.slice(0, 2) : foley_stimuli;
    const trials = pool.map((stim, idx) => ({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <button class="jspsych-btn" id="play-${idx}">▶️ Play sound</button>
        <p id="status-${idx}" style="margin-top:10px;color:#666;">Listen to the sound, then choose.</p>
      </div>`,
      choices: stim.options,
      data: {
        task: 'foley',
        audio_key: stim.audio,
        correct: stim.correct,
        options: stim.options,
        pid: currentPID,
        condition: testCondition
      },
      on_load: () => {
        const audio = new Audio(getAudioSource(stim.audio));
        const play = document.getElementById(`play-${idx}`);
        const status = document.getElementById(`status-${idx}`);
        play.addEventListener('click', () => {
          status.textContent = 'Playing…';
          audio.currentTime = 0;
          audio.play().then(() => {
            setTimeout(() => status.textContent = 'Choose the option that fits.', 500);
          }).catch(() => {
            status.textContent = 'Audio failed (placeholder used).';
          });
        });
      },
      on_finish: data => {
        data.correct = (data.response === data.correct);
      },
      post_trial_gap: 400
    }));

    return [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Sound Recognition</h2><p>Click the sound, then choose what it represents.</p>',
      choices: ['Begin']
    }, ...trials];
  }

  function buildNaming(delayed) {
    const pool = delayed ? picture_stimuli.slice(0, 6) : picture_stimuli;
    return [
      {
        type: T('jsPsychInitializeMicrophone'),
        data: { task: 'mic_init' },
        on_finish: () => { microphoneAvailable = true; }
      },
      {
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: '<h2>Picture Naming</h2><p>Describe each picture in English (4 seconds each).</p>',
        choices: ['Begin']
      },
      {
        timeline: pool.map((target, index) => ({
          type: T('jsPsychHtmlButtonResponse'),
          stimulus: `<div style="text-align:center;">
            ${makeImageCard(target)}
            <p style="margin-top:12px;">Click to start recording (4 seconds).</p>
          </div>`,
          choices: ['Start recording'],
          data: { task: 'naming_prepare', target, pid: currentPID, condition: testCondition, trial_index: index + 1 }
        }))
      },
      {
        timeline: pool.map((target, index) => ({
          type: T('jsPsychHtmlAudioResponse'),
          stimulus: `<div style="text-align:center;">
            ${makeImageCard(target)}
            <p style="margin-top:12px;color:#d32f2f;font-weight:bold;">Recording… speak now.</p>
          </div>`,
          recording_duration: 4000,
          show_done_button: false,
          trial_duration: 4500,
          data: {
            task: 'naming_audio',
            target,
            pid: currentPID,
            condition: testCondition,
            trial_index: index + 1
          },
          on_finish: data => {
            data.needs_audio_scoring = true;
          }
        }))
      }
    ];
  }

  function buildTransferBlock() {
    const intro = {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<h2>Recognition Test</h2><p>Did this word appear in the VR training? (Yes / No)</p>',
      choices: ['Begin']
    };

    const trials = transfer_words.map(item => ({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;">
        <div style="padding: 30px; background:#f8f9fa;border-radius:12px;border:1px solid #ddd;">
          <h2 style="margin:0;">${item.word}</h2>
        </div>
        <p style="margin-top:18px;">Did you encounter this word in the training?</p>
      </div>`,
      choices: ['YES', 'NO'],
      data: {
        task: 'transfer_recognition',
        word: item.word,
        trained: item.trained,
        pos: item.pos,
        iconic: item.iconic,
        word_type: item.type,
        pid: currentPID,
        condition: testCondition
      },
      on_finish: data => {
        const yes = (data.response === 0);
        data.response_label = yes ? 'yes' : 'no';
        data.correct = (yes === data.trained);
      }
    }, {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<p>How confident are you?</p>',
      choices: ['1 (Guess)', '2', '3', '4 (Sure)'],
      data: { task: 'transfer_confidence', word: item.word },
      on_finish: data => {
        data.confidence = (data.response ?? null) !== null ? (data.response + 1) : null;
      }
    }));

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

  function buildExitText() {
    return {
      type: T('jsPsychSurveyText'),
      preamble: `<h3>Final Comments</h3><p>Any questions, concerns, or issues to share?</p>`,
      questions: [{ prompt: 'Your comments (optional)', name: 'comments', rows: 4, required: false }],
      button_label: 'Finish',
      data: { task: 'exit_comments', pid: currentPID, condition: testCondition }
    };
  }

  /* ------------ SAVE & COMPLETE ------------ */
  function saveData() {
    const allData = jsPsych.data.get().values();
    console.log('[posttest] Trials:', allData.length);
    console.log('[posttest] Sample:', allData.slice(0, 5));

    const target = document.getElementById('jspsych-target');
    if (target) {
      target.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <h2>✓ Post-test complete</h2>
          <p><strong>Participant:</strong> ${currentPID}</p>
          <p><strong>Condition:</strong> ${testCondition}</p>
          <p style="margin-top:20px;">Thank you for participating!</p>
          <button class="jspsych-btn" onclick="location.reload()" style="margin-top:25px;">Run again</button>
        </div>
      `;
    }
  }

  window.addEventListener('beforeunload', cleanup);
})();
