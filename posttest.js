// VR Post-Test Battery - Complete Fixed Version 2.5
// Changes from 2.4:
// - Robust sound path resolver: adds "sounds/" if missing; tolerates _01 vs _1 filenames
// - Keeps deterministic per-participant selection for image/sound variants
// - Image filename fixes for *_01.png / *_02.png remain
// - Survey fallback remains

/* ========== GLOBAL STATE ========== */
let jsPsych = null;
let currentPID = 'unknown';
let testCondition = 'immediate';
let microphoneAvailable = false;

/* ========== HELPERS ========== */
const have = (name) => typeof window[name] !== 'undefined';
const T    = (name) => window[name];

const ASSET_BUST = Math.floor(Math.random() * 100000);
const asset = (p) => {
  if (!p) return '';
  const clean = String(p).replace(/^(\.\/|\/)/, '');
  return clean + (clean.includes('?') ? '&' : '?') + 'v=' + ASSET_BUST;
};

function asObject(x) {
  if (!x) return {};
  if (typeof x === 'string') {
    try { return JSON.parse(x); } catch { return {}; }
  }
  return (typeof x === 'object') ? x : {};
}

/* ========== ASSET DEFINITIONS (MATCH YOUR FOLDER) ========== */
// Images: exact filenames from your post-test folder listing
const IMG = {
  // objects / tools / ingredients
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

  // actions / states
  mixing:   ['img/mixing_01.png',   'img/mixing_02.png'],
  cracking: ['img/cracking_01.png', 'img/cracking_02.png'],
  pouring:  ['img/pouring_01.png',  'img/pouring_02.png'],
  flipping: ['img/flipping_01.png', 'img/flipping_02.png'],
  sizzling: ['img/sizzling_01.png', 'img/sizzling_02.png'],

  // If you later add heating_01/02.png, uncomment & provide files:
  // heating:  ['img/heating_01.png',  'img/heating_02.png'],
};

// Sounds: keep whatever you currently have; the resolver below will normalize
const SND = {
  crack:  ['crack_01.mp3',  'crack_02.mp3'],    // with or without "sounds/" is fine
  flip:   ['flip_01.mp3',   'flip_02.mp3'],
  pour:   ['pour_01.mp3',   'pour_02.mp3'],
  sizzle: ['sizzle_01.mp3', 'sizzle_02.mp3'],
  spread: ['spread_01.mp3', 'spread_02.mp3'],
  whisk:  ['whisk_01.mp3',  'whisk_02.mp3'],
};

// Deterministic per-participant variant picker
function hashStr(s){
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function pickForPID(key, arr){
  if (!arr || !arr.length) return null;
  const idx = hashStr(String(currentPID || 'anon') + '|' + key) % arr.length;
  return arr[idx];
}
function imageSrcFor(key){
  const variants = IMG[key];
  const chosen   = pickForPID(key, variants);
  return chosen ? asset(chosen) : null;
}

// Robust sound resolver: adds "sounds/" if missing; tolerates _01 vs _1 filenames
function soundSrcFor(key){
  const variants = SND[key];
  const chosen   = pickForPID(key, variants);
  if (!chosen) return null;

  // Start with whatever was configured
  let base = chosen.trim();

  // If there is no folder component, default to sounds/
  if (!base.includes('/')) base = 'sounds/' + base;

  // Candidates to try: as-is, force zero, strip zero
  const asIs    = base;
  const withZero = base.replace(/(_)(\d)\.mp3$/i, (_, u, d) => `${u}0${d}.mp3`);
  const noZero   = base.replace(/(_0)(\d)\.mp3$/i, (_, u0, d) => `_${d}.mp3`);

  // Deduplicate while preserving order
  const seen = new Set();
  const candidates = [asIs, withZero, noZero].filter(p => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  const chosenPath = candidates[0];
  console.log('[posttest] soundSrcFor', { key, chosen, candidates, chosenPath });

  return asset(chosenPath);
}

/* ========== STIMULI DEFINITIONS ========== */
// Picture naming (objects + actions). Ensure every target exists in IMG.
const picture_naming_stimuli = [
  // Objects / tools
  { target: 'bowl',    category: 'utensil'    },
  { target: 'butter',  category: 'ingredient' },
  { target: 'egg',     category: 'ingredient' },
  { target: 'flour',   category: 'ingredient' },
  { target: 'milk',    category: 'ingredient' },
  { target: 'pan',     category: 'utensil'    },
  { target: 'pancake', category: 'food'       },
  { target: 'spatula', category: 'utensil'    },
  { target: 'sugar',   category: 'ingredient' },
  { target: 'whisk',   category: 'utensil'    },

  // Actions / processes
  { target: 'mixing',   category: 'action'  },
  { target: 'cracking', category: 'action'  },
  { target: 'pouring',  category: 'action'  },
  { target: 'flipping', category: 'action'  },
  { target: 'sizzling', category: 'process' },
];

// Foley sounds
const foley_stimuli = [
  { audio: 'crack',  options: ['stirring', 'cracking'],               correct: 1 },
  { audio: 'whisk',  options: ['mixing (whisking)', 'pouring'],       correct: 0 },
  { audio: 'pour',   options: ['pouring', 'flipping'],                correct: 0 },
  { audio: 'sizzle', options: ['spreading butter', 'cooking on pan'], correct: 1 },
];

// Procedural recall “gold” steps (for later manual scoring)
const PROCEDURE_STEPS = [
  'Crack eggs',
  'Mix flour and eggs',
  'Heat the pan',
  'Pour batter on pan',
  'Flip when ready',
];

// Transfer/recognition words (immediate condition only)
const transfer_words = [
  { word: 'bowl',    type: 'target', trained: true  },
  { word: 'egg',     type: 'target', trained: true  },
  { word: 'flour',   type: 'target', trained: true  },
  { word: 'spatula', type: 'target', trained: true  },
  { word: 'spoon',   type: 'foil',   trained: false },
  { word: 'milk',    type: 'foil',   trained: false },
  { word: 'sugar',   type: 'foil',   trained: false },
  { word: 'plate',   type: 'foil',   trained: false },
];

/* ========== CLEANUP MANAGER ========== */
const cleanupManager = {
  items: new Map(),
  register(key, fn) { this.items.set(key, fn); },
  cleanup(key) {
    const fn = this.items.get(key);
    if (typeof fn === 'function') {
      try { fn(); } catch(e){ console.error(`Cleanup error [${key}]`, e); }
    }
    this.items.delete(key);
  },
  cleanupAll() {
    for (const [k] of this.items) this.cleanup(k);
  }
};

/* ========== MAIN ENTRY POINT ========== */
window.__START_POSTTEST = function(pid, isDelayed) {
  currentPID = pid || 'unknown';
  testCondition = isDelayed ? 'delayed' : 'immediate';

  console.log(`Starting ${testCondition} post-test for participant ${currentPID}`);

  const picker = document.getElementById('picker');
  if (picker) picker.style.display = 'none';

  if (!have('initJsPsych')) {
    alert('jsPsych not loaded. Please refresh the page and try again.');
    return;
  }

  cleanupManager.cleanupAll();

  jsPsych = T('initJsPsych')({
    display_element: 'jspsych-target',
    show_progress_bar: true,
    message_progress_bar: 'Progress / 進捗',
    on_trial_finish: () => cleanupManager.cleanupAll(),
    on_finish: () => { saveData(); showCompletion(); }
  });

  const timeline = buildTimeline(isDelayed);
  jsPsych.run(timeline);
};

/* ========== TIMELINE BUILDER ========== */
function buildTimeline(isDelayed) {
  const timeline = [];

  if (!have('jsPsychHtmlButtonResponse')) {
    console.error('Required plugin jsPsychHtmlButtonResponse not found');
    return timeline;
  }

  // Welcome
  timeline.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h2>Post-Test / ポストテスト</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>This will take approximately ${isDelayed ? '15–20' : '20–25'} minutes.</p>
        <p>Focus on: <b>Recall, Retention, and Pronunciation</b></p>
        <p style="color: #d32f2f; margin-top: 20px;">
          <b>⚠️ Important: Please ensure your audio is working before starting.</b>
        </p>
      </div>
    `,
    choices: ['Begin / 開始']
  });

  // Task 1: Open-Ended Procedural Recall
  if (have('jsPsychSurveyText')) {
    timeline.push(buildProceduralRecallTask());
  }

  // Task 2: Foley Sound Recognition
  timeline.push(...buildFoleyTask());

  // Task 3: Picture Naming (requires mic + audio response)
  if (have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse')) {
    timeline.push(...buildPictureNamingTask());
  } else {
    console.warn('Microphone plugins not available - skipping picture naming');
    timeline.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<p>Picture naming task skipped (microphone plugins not available)</p>',
      choices: ['Continue']
    });
  }

  // Task 4: Transfer/Recognition (Immediate only)
  if (!isDelayed) {
    timeline.push(buildTransferTask());
  }

  // Task 5: Post-Training Questionnaire (with fallback)
  timeline.push(buildPostQuestionnaire());

  return timeline;
}

/* ========== TASK BUILDERS ========== */
// Task 1 — Procedural recall (open-ended)
function buildProceduralRecallTask() {
  return {
    type: T('jsPsychSurveyText'),
    preamble: `
      <div style="max-width: 700px; margin: 0 auto; text-align: left;">
        <h3>Recipe Memory Test / レシピ記憶テスト</h3>
        <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <p><strong>Context / 状況:</strong></p>
          <p>Imagine that you have already purchased the ingredients and they are on the table.</p>
          <p>すべての材料を購入済みで、テーブルの上に置いてあると想像してください。</p>
        </div>
        <p><strong>Instructions / 指示:</strong></p>
        <ol style="line-height: 1.8;">
          <li><strong>Begin with the first step</strong> - What do you do first?<br/><span style="color: #666;">最初のステップから始めてください</span></li>
          <li><strong>End with the final step before eating</strong> - What is the last thing you do?<br/><span style="color: #666;">食べる直前の最後のステップで終わってください</span></li>
          <li><strong>Recall the steps from the VR experience</strong><br/><span style="color: #666;">VR体験で学んだ手順を思い出して書いてください</span></li>
        </ol>
        <p style="margin-top: 20px;"><em>Note: Spelling doesn't have to be perfect. Write what you remember.</em><br/><span style="color: #666;">注: スペルは完璧でなくても構いません。</span></p>
      </div>
    `,
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
      correct_steps: PROCEDURE_STEPS
    },
    on_finish: (data) => {
      const responses = asObject(data.response ?? data.responses);
      data.recalled_steps = [
        responses.step_1 || '',
        responses.step_2 || '',
        responses.step_3 || '',
        responses.step_4 || '',
        responses.step_5 || '',
      ];
      data.needs_manual_scoring = true;
    }
  };
}

// Task 2 — Foley sound recognition
function buildFoleyTask() {
  const tasks = [];

  if (!have('jsPsychHtmlButtonResponse')) return tasks;

  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Sound Recognition / 音の認識</h3>
        <p>Listen to cooking sounds and identify what they represent.</p>
        <p>料理の音を聞いて、何の音かを選んでください。</p>
        <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
          <b>⚠️ Please ensure your volume is adequate.</b>
        </p>
      </div>
    `,
    choices: ['Begin / 開始']
  });

  foley_stimuli.forEach((stim, idx) => {
    const chosenFile = soundSrcFor(stim.audio);

    // spacer before each (except first)
    if (idx > 0) {
      tasks.push({
        type: T(have('jsPsychHtmlKeyboardResponse') ? 'jsPsychHtmlKeyboardResponse' : 'jsPsychHtmlButtonResponse'),
        stimulus: `
          <div style="text-align:center; padding: 40px;">
            <p style="font-size: 20px; color: #666;">Ready for the next sound?</p>
            <p style="font-size: 16px;">次の音の準備はいいですか？</p>
            ${have('jsPsychHtmlKeyboardResponse')
              ? "<p style='margin-top: 30px; color: #999;'>Press SPACE to continue / スペースキーで続行</p>"
              : ""
            }
          </div>
        `,
        choices: have('jsPsychHtmlKeyboardResponse') ? [' '] : ['Continue / 続行'],
        post_trial_gap: 500
      });
    }

    tasks.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="text-align:center;">
          <p style="font-size: 18px; font-weight: bold; color: #2196F3;">Sound ${idx + 1} of ${foley_stimuli.length}</p>
          <div style="padding:30px; background:#f8f9fa; border-radius:10px; margin:20px auto; max-width:400px; border: 2px solid #e0e0e0;">
            <button id="play-sound-${idx}" class="jspsych-btn" style="font-size:20px; padding: 15px 30px;">
              ▶️ Play Sound
            </button>
            <p id="status-${idx}" style="margin-top:15px; color:#666; font-weight: bold;">
              Click the button above to play
            </p>
          </div>
          <p style="font-size: 16px; margin-top: 20px;">What does this sound represent?</p>
          <p style="color:#666; font-size: 14px;">この音は何を表していますか？</p>
        </div>
      `,
      choices: stim.options,
      data: {
        task: 'foley_recognition',
        audio_key: stim.audio,
        audio_file: chosenFile,
        correct_answer: stim.correct,
        condition: testCondition,
        pid: currentPID,
        trial_number: idx + 1
      },
      on_load: function() {
        const btn    = document.getElementById(`play-sound-${idx}`);
        const status = document.getElementById(`status-${idx}`);

        if (!chosenFile) {
          if (btn)   { btn.textContent = '❌ Audio unavailable'; btn.disabled = true; }
          if (status){ status.textContent = 'Audio not available - please select an answer'; status.style.color = '#d32f2f'; }
          return;
        }

        const audio = new Audio();
        let ready = false;
        let clickHandler = null;

        const cleanup = () => {
          try {
            if (clickHandler && btn) btn.removeEventListener('click', clickHandler);
            audio.pause(); audio.src = ''; audio.load();
          } catch (e) { console.error('Cleanup error:', e); }
        };
        cleanupManager.register(`foley_${idx}`, cleanup);

        const onCanPlay = () => {
          ready = true;
          if (status) { status.textContent = 'Ready - click to play / 再生準備完了'; status.style.color = '#4CAF50'; }
        };
        const onError = () => {
          if (btn)   { btn.textContent = '❌ Audio unavailable'; btn.disabled = true; }
          if (status){ status.textContent = 'Audio failed to load - please select an answer'; status.style.color = '#d32f2f'; }
        };
        const onEnded = () => {
          if (status){ status.textContent = 'Sound finished - choose your answer / 音声終了 - 答えを選んでください'; status.style.color = '#2196F3'; }
          if (btn)   { btn.textContent = '🔁 Play Again'; btn.disabled = false; }
        };

        clickHandler = () => {
          if (!ready) return;
          try {
            if (btn) { btn.disabled = true; btn.textContent = '⏸ Playing...'; }
            if (status){ status.textContent = '🔊 Playing sound... / 再生中...'; status.style.color = '#FF9800'; }
            audio.currentTime = 0;
            audio.play().catch(err => {
              console.error('Play failed:', err);
              if (status){ status.textContent = 'Playback failed / 再生失敗'; status.style.color = '#d32f2f'; }
              if (btn){ btn.disabled = false; btn.textContent = '▶️ Try Again'; }
            });
          } catch(e){
            console.error('Play error:', e);
          }
        };

        if (btn) btn.addEventListener('click', clickHandler);
        audio.addEventListener('canplaythrough', onCanPlay);
        audio.addEventListener('error', onError);
        audio.addEventListener('ended', onEnded);
        audio.preload = 'auto';
        audio.src = chosenFile; // already wrapped by asset() in soundSrcFor
      },
      on_finish: (data) => {
        cleanupManager.cleanup(`foley_${idx}`);
        data.correct = (data.response === data.correct_answer);
      },
      post_trial_gap: 800
    });
  });

  return tasks;
}

// Task 3 — Picture naming (mic + audio response)
function buildPictureNamingTask() {
  const tasks = [];

  tasks.push({
    type: T('jsPsychInitializeMicrophone'),
    data: { task: 'mic_init' },
    on_finish: () => { microphoneAvailable = true; console.log('Microphone initialized'); }
  });

  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Picture Naming / 絵の命名</h3>
        <p>You will see images from the VR experience. Say the English name.</p>
        <p>VR体験で見た画像が表示されます。英語で名前を言ってください。</p>
        <p style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <b>⏱️ You have 4 seconds per item.</b> Speak clearly.
        </p>
      </div>
    `,
    choices: ['Start / 開始']
  });

  // optional mic check
  tasks.push({
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: `
      <div style="max-width: 500px; margin: 0 auto; text-align: center;">
        <h3>Microphone Check / マイク確認</h3>
        <p>Say "test" for 2 seconds to check your microphone.</p>
      </div>
    `,
    recording_duration: 2000,
    show_done_button: true,
    allow_playback: true,
    accept_button_text: 'Sounds OK / 続行',
    data: { task: 'mic_check' }
  });

  // Randomized trials (deterministic asset variant per PID)
  const naming_timeline = {
    timeline: [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: function() {
        const stim       = jsPsych.timelineVariable('stim');
        const trialNum   = jsPsych.timelineVariable('trial_num');
        const total      = picture_naming_stimuli.length;
        const imgPath    = imageSrcFor(stim.target);
        const fallback   =
          `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='20'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;

        return `
          <div style="text-align:center;">
            <p style="color:#666; font-size: 14px; margin-bottom: 10px;">
              Image ${trialNum} of ${total}
            </p>
            <div style="position: relative; display: inline-block;">
              <img src="${imgPath || fallback}"
                   style="width:350px; height:auto; max-height: 400px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display:block;"
                   onerror="this.src='${fallback}'">
            </div>
            <p style="margin-top:20px; font-size: 16px;">
              Look at the image. Click when ready to record.
            </p>
          </div>
        `;
      },
      choices: ['Ready to Record / 録音開始'],
      data: function() {
        return {
          task: 'picture_naming_prepare',
          target: jsPsych.timelineVariable('stim').target,
          category: jsPsych.timelineVariable('stim').category,
          trial_num: jsPsych.timelineVariable('trial_num')
        };
      }
    },{
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: function() {
        const stim       = jsPsych.timelineVariable('stim');
        const trialNum   = jsPsych.timelineVariable('trial_num');
        const imgPath    = imageSrcFor(stim.target);
        const fallback   =
          `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='20'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;

        return `
          <div style="text-align:center;">
            <p style="color:#666; font-size: 14px; margin-bottom: 10px;">
              Recording ${trialNum} of ${picture_naming_stimuli.length}
            </p>
            <div style="position: relative; display: inline-block;">
              <img src="${imgPath || fallback}"
                   style="width:350px; height:auto; max-height: 400px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display:block;"
                   onerror="this.src='${fallback}'">
            </div>
            <div style="margin-top:20px; padding: 15px; background: #ffebee; border-radius: 8px;">
              <p style="color:#d32f2f; font-weight:bold; font-size:18px; margin: 0;">
                🔴 Recording... Speak now!
              </p>
              <p style="color:#666; font-size: 14px; margin-top: 5px;">Say the English name clearly</p>
            </div>
          </div>
        `;
      },
      recording_duration: 4000,
      show_done_button: false,
      data: function() {
        return {
          task: 'picture_naming_audio',
          target: jsPsych.timelineVariable('stim').target,
          category: jsPsych.timelineVariable('stim').category,
          condition: testCondition,
          pid: currentPID,
          trial_num: jsPsych.timelineVariable('trial_num'),
          phase: 'post'
        };
      },
      on_finish: (d) => {
        const tgt = (d.target || 'unknown').toLowerCase();
        const idx = d.trial_num || 'x';
        d.audio_filename = `post_${currentPID}_${tgt}_${idx}.wav`;
        try {
          const rec = d.response && (d.response instanceof Blob ? d.response : d.response.recording);
          if (rec instanceof Blob) d.audio_blob_url = URL.createObjectURL(rec);
        } catch (e) { console.error('Audio blob processing error:', e); }
      }
    }],
    timeline_variables: picture_naming_stimuli.map((stim, idx) => ({ stim, trial_num: idx + 1 })),
    randomize_order: true
  };

  tasks.push(naming_timeline);
  return tasks;
}

// Task 4 — Transfer / recognition
function buildTransferTask() {
  const intro = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Recognition Test / 認識テスト</h3>
        <p>You will see words one at a time. Decide if you saw each word in the VR experience.</p>
        <p>VR体験で見た単語かどうかを判断してください。</p>
      </div>
    `,
    choices: ['Begin / 開始']
  };

  const trial = {
    timeline: [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: jsPsych.timelineVariable('word_display'),
      choices: ['YES - I saw this', 'NO - I did not see this'],
      data: jsPsych.timelineVariable('trial_data'),
      on_finish: (data) => {
        const said_yes = (data.response === 0);
        data.response_label = said_yes ? 'yes' : 'no';
        data.correct = (said_yes === data.correct_answer);
        data.signal_type =
          data.correct_answer ? (said_yes ? 'hit' : 'miss')
                              : (said_yes ? 'false_alarm' : 'correct_rejection');
      }
    }],
    timeline_variables: transfer_words.map(item => ({
      word_display: `
        <div style="text-align:center; padding:40px;">
          <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;">
            <p style="font-size:36px; font-weight:bold; margin:20px 0; color: #333;">
              ${item.word}
            </p>
          </div>
          <p style="margin-top: 20px; color: #666;">Did you see this word in the VR experience?</p>
        </div>
      `,
      trial_data: {
        task: 'transfer_test',
        word: item.word,
        correct_answer: item.trained,
        word_type: item.type,
        condition: testCondition,
        pid: currentPID
      }
    })),
    randomize_order: true
  };

  return { timeline: [intro, trial] };
}

// Task 5 — Post-Training Questionnaire with fallback
function buildPostQuestionnaire() {
  // Prefer plugin-survey if available
  if (have('jsPsychSurvey')) {
    return {
      type: T('jsPsychSurvey'),
      survey_json: {
        title: 'Post-Training Questionnaire / 訓練後アンケート',
        showQuestionNumbers: 'off',
        showCompletedPage: false,
        pages: [{
          elements: [
            {
              type: 'rating', name: 'confidence_vocabulary',
              title: 'How confident are you with the pancake-making vocabulary?',
              description: 'パンケーキ作りの語彙にどのくらい自信がありますか？',
              isRequired: true, rateMin: 1, rateMax: 5,
              minRateDescription: 'Not confident / 自信なし',
              maxRateDescription: 'Very confident / とても自信あり'
            },
            {
              type: 'rating', name: 'confidence_procedure',
              title: 'How confident are you that you could make pancakes following the procedure?',
              description: '手順に従ってパンケーキを作れると思いますか？',
              isRequired: true, rateMin: 1, rateMax: 5,
              minRateDescription: 'Not confident / 自信なし',
              maxRateDescription: 'Very confident / とても自信あり'
            },
            {
              type: 'rating', name: 'training_helpfulness',
              title: 'How helpful was the VR training for learning?',
              description: 'VR訓練は学習に役立ちましたか？',
              isRequired: true, rateMin: 1, rateMax: 5,
              minRateDescription: 'Not helpful / 役立たない',
              maxRateDescription: 'Very helpful / とても役立つ'
            },
            { type: 'comment', name: 'learning_strategies', title: 'Strategies used?', isRequired: false, rows: 3 },
            { type: 'comment', name: 'difficulties',        title: 'Most difficult part?', isRequired: false, rows: 3 },
            { type: 'comment', name: 'additional_comments',  title: 'Additional comments?', isRequired: false, rows: 3 },
          ]
        }]
      },
      data: { task: 'post_questionnaire', condition: testCondition, pid: currentPID }
    };
  }

  // Fallback to survey-html-form if present
  if (have('jsPsychSurveyHtmlForm')) {
    return {
      type: T('jsPsychSurveyHtmlForm'),
      preamble: '<h3>Post-Training Questionnaire / 訓練後アンケート</h3>',
      html: `
        <p>How confident are you with the pancake-making vocabulary? / パンケーキ作りの語彙の自信</p>
        <input type="range" name="confidence_vocabulary" min="1" max="5" value="3" />
        <p style="margin-top:12px;">How confident are you that you could make pancakes following the procedure? / 手順で作れる自信</p>
        <input type="range" name="confidence_procedure" min="1" max="5" value="3" />
        <p style="margin-top:12px;">How helpful was the VR training? / VR訓練の有用性</p>
        <input type="range" name="training_helpfulness" min="1" max="5" value="3" />
        <p style="margin-top:12px;">Strategies used? / 戦略</p>
        <textarea name="learning_strategies" rows="3" style="width:100%"></textarea>
        <p style="margin-top:12px;">Most difficult part? / 最も難しかった点</p>
        <textarea name="difficulties" rows="3" style="width:100%"></textarea>
        <p style="margin-top:12px;">Additional comments / 追加コメント</p>
        <textarea name="additional_comments" rows="3" style="width:100%"></textarea>
      `,
      button_label: 'Submit / 送信',
      data: { task: 'post_questionnaire_fallback', condition: testCondition, pid: currentPID }
    };
  }

  // If neither plugin is loaded, skip gracefully
  return {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: '<p>Survey plugin not available — skipping questionnaire.</p>',
    choices: ['Continue']
  };
}

/* ========== DATA SAVING ========== */
function saveData() {
  try {
    const data = jsPsych.data.get().values();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `posttest_${testCondition}_${currentPID}_${timestamp}.json`;

    localStorage.setItem('posttest_latest', JSON.stringify({
      filename, condition: testCondition, pid: currentPID, timestamp, data
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Data saved: ${filename}`);
  } catch (e) {
    console.error('Error saving data:', e);
    alert('There was an error saving your data. Please contact the researcher.');
  }
}

/* ========== COMPLETION SCREEN ========== */
function showCompletion() {
  const target = document.getElementById('jspsych-target');
  if (!target) return;
  cleanupManager.cleanupAll();

  target.innerHTML = `
    <div style="max-width:600px; margin:50px auto; text-align:center; padding:40px;
                background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #4CAF50;">✅ Post-Test Complete!</h2>
      <h2>完了しました！</h2>
      <div style="margin: 30px 0; padding: 20px; background: #f0f8ff; border-radius: 8px;">
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p style="margin-top: 15px;">Your data has been downloaded automatically.</p>
        <p>データは自動的にダウンロードされました。</p>
      </div>
      <p style="margin-top:30px;">
        <button onclick="location.reload()"
                style="padding:12px 24px; font-size:16px; background:#4CAF50; color:white; border:none;
                       border-radius:8px; cursor:pointer; transition: all 0.3s;"
                onmouseover="this.style.background='#45a049'"
                onmouseout="this.style.background='#4CAF50'">
          Run Another Test / 別のテストを実行
        </button>
      </p>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Thank you for your participation! / ご参加ありがとうございました！
      </p>
    </div>
  `;
}

// Cleanup on unload
window.addEventListener('beforeunload', () => cleanupManager.cleanupAll());

console.log('Post-test script v2.5 loaded successfully — robust sound paths enabled');
