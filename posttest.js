// VR Post-Test Battery - Complete Version 2.1
// Focuses on: Recall, Retention, Intelligibility

/* ========== GLOBAL STATE ========== */
let jsPsych = null;
let currentPID = 'unknown';
let testCondition = 'immediate';
let microphoneAvailable = false;

/* ========== HELPERS ========== */
const have = (name) => typeof window[name] !== 'undefined';
const T = (name) => window[name];

const ASSET_BUST = Math.floor(Math.random() * 100000);
const asset = (p) => {
  const clean = p.replace(/^(\.\/|\/)/, "");
  return clean + (clean.includes("?") ? "&" : "?") + "v=" + ASSET_BUST;
};

function asObject(x) {
  if (!x) return {};
  if (typeof x === 'string') {
    try { return JSON.parse(x); } catch { return {}; }
  }
  return (typeof x === 'object') ? x : {};
}

/* ========== ASSET DEFINITIONS ========== */
const IMG = {
  // Objects - using your actual filenames
  bowl:    ['img/bowl.jpg'],
  egg:     ['img/egg.jpg'],
  flour:   ['img/flour.jpg'],
  spatula: ['img/spatula.jpg'],
  pan:     ['img/pan.jpg'],
  milk:    ['img/milk.jpg'],
  
  // Actions - using your actual filenames with correct extensions
  mixing:   ['img/mixing.jpeg'],
  cracking: ['img/cracking.jpeg'],
  pouring:  ['img/pouring.jpeg'],
  flipping: ['img/flipping.jpg'],
  heating:  ['img/heating.jpeg'],
  sizzling: ['img/sizzling.jpeg'],
};

const SND = {
  crack:  ['sounds/crack_1.mp3','sounds/crack_2.mp3'],
  flip:   ['sounds/flip_1.mp3','sounds/flip_2.mp3'],
  pour:   ['sounds/pour_1.mp3','sounds/pour_2.mp3'],
  sizzle: ['sounds/sizzle_1.mp3','sounds/sizzle_2.mp3'],
  spread: ['sounds/spread_1.mp3','sounds/spread_2.mp3'],
  whisk:  ['sounds/whisk_1.mp3','sounds/whisk_2.mp3'],
};

const pick = (arr) => arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : arr[0];

function playOne(key){
  try {
    const opts = SND[key];
    if (!opts) return;
    const a = new Audio(asset(pick(opts)));
    a.play().catch(()=>{});
  } catch {}
}

/* ========== STIMULI DEFINITIONS ========== */
// Picture naming - Objects AND Actions (matching your actual files)
const picture_naming_stimuli = [
  // Objects
  { target: 'bowl',    category: 'utensil'    },
  { target: 'egg',     category: 'ingredient' },
  { target: 'flour',   category: 'ingredient' },
  { target: 'spatula', category: 'utensil'    },
  { target: 'pan',     category: 'utensil'    },
  { target: 'milk',    category: 'ingredient' },
  
  // Actions/Verbs
  { target: 'mixing',   category: 'action' },
  { target: 'cracking', category: 'action' },
  { target: 'pouring',  category: 'action' },
  { target: 'flipping', category: 'action' },
  { target: 'heating',  category: 'action' },
  { target: 'sizzling', category: 'process' },
];

// Foley sounds for post-test
const foley_stimuli = [
  { audio: 'crack',  options: ['stirring', 'cracking'], correct: 1 },
  { audio: 'whisk',  options: ['mixing', 'pouring'],    correct: 0 },
  { audio: 'pour',   options: ['pouring', 'flipping'],  correct: 0 },
  { audio: 'sizzle', options: ['cold batter', 'cooking on pan'], correct: 1 },
];

// Procedure steps
const PROCEDURE_STEPS = [
  'Crack eggs',
  'Mix flour and eggs',
  'Heat the pan',
  'Pour batter on pan',
  'Flip when ready'
];

// Transfer test (immediate only)
const transfer_words = [
  { word: 'bowl', type: 'target', trained: true },
  { word: 'egg', type: 'target', trained: true },
  { word: 'flour', type: 'target', trained: true },
  { word: 'spatula', type: 'target', trained: true },
  { word: 'spoon', type: 'foil', trained: false },
  { word: 'milk', type: 'foil', trained: false },
  { word: 'sugar', type: 'foil', trained: false },
  { word: 'plate', type: 'foil', trained: false },
];

/* ========== MAIN ENTRY POINT ========== */
window.__START_POSTTEST = function(pid, isDelayed) {
  currentPID = pid || 'unknown';
  testCondition = isDelayed ? 'delayed' : 'immediate';

  console.log(`Starting ${testCondition} post-test for participant ${currentPID}`);

  const picker = document.getElementById('picker');
  if (picker) picker.style.display = 'none';

  if (!have('initJsPsych')) {
    alert('jsPsych not loaded. Please refresh.');
    return;
  }

  jsPsych = T('initJsPsych')({
    display_element: 'jspsych-target',
    show_progress_bar: true,
    message_progress_bar: 'Progress / 進捗',
    on_finish: () => {
      saveData();
      showCompletion();
    }
  });

  const timeline = buildTimeline(isDelayed);
  jsPsych.run(timeline);
};

/* ========== TIMELINE BUILDER ========== */
function buildTimeline(isDelayed) {
  const timeline = [];

  // Welcome
  timeline.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h2>Post-Test / ポストテスト</h2>
      <p><strong>Participant:</strong> ${currentPID}</p>
      <p><strong>Condition:</strong> ${testCondition}</p>
      <p>This will take approximately ${isDelayed ? '15-20' : '20-25'} minutes.</p>
      <p>Focus on: <b>Recall, Retention, and Pronunciation</b></p>
    `,
    choices: ['Begin / 開始']
  });

  // Task 1: Open-Ended Procedural Recall
  timeline.push(buildProceduralRecallTask());

  // Task 2: Foley Sound Recognition
  timeline.push(...buildFoleyTask()); // SPREAD the array

  // Task 3: Picture Naming (Objects + Actions)
  if (have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse')) {
    timeline.push(...buildPictureNamingTask()); // SPREAD the array
  } else {
    console.warn('Microphone plugins not available');
  }

  // Task 4: Transfer/Recognition (Immediate only)
  if (!isDelayed) {
    timeline.push(buildTransferTask());
  }

  // Task 5: Post-Training Questionnaire
  timeline.push(buildPostQuestionnaire());

  return timeline;
}

/* ========== TASK BUILDERS ========== */

// Task 1: OPEN-ENDED Procedural Recall
function buildProceduralRecallTask() {
  return {
    type: T('jsPsychSurveyText'),
    preamble: `
      <h3>Recipe Memory Test / レシピ記憶テスト</h3>
      <p>Write the pancake-making steps in the correct order (1–5).</p>
      <p>Write what you remember - spelling doesn't have to be perfect.</p>
      <p>パンケーキの作り方を順番に書いてください（1–5）。</p>
    `,
    questions: [
      { prompt: '<b>Step 1 (First / 最初):</b>', name: 'step_1', placeholder: 'What happens first?', required: true },
      { prompt: '<b>Step 2:</b>', name: 'step_2', placeholder: '', required: true },
      { prompt: '<b>Step 3:</b>', name: 'step_3', placeholder: '', required: true },
      { prompt: '<b>Step 4:</b>', name: 'step_4', placeholder: '', required: true },
      { prompt: '<b>Step 5 (Last / 最後):</b>', name: 'step_5', placeholder: 'What happens last?', required: true },
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
        responses.step_5 || ''
      ];
      data.needs_manual_scoring = true;
    }
  };
}

// Task 2: Foley Sound Recognition
function buildFoleyTask() {
  const tasks = [];
  
  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h3>Sound Recognition / 音の認識</h3>
      <p>Listen to cooking sounds and identify what they represent.</p>
      <p>料理の音を聞いて、何の音かを選んでください。</p>
      <p><b>Please ensure your volume is adequate.</b></p>
    `,
    choices: ['Begin / 開始']
  });

  foley_stimuli.forEach((stim, idx) => {
    const audioFiles = SND[stim.audio];
    const chosenFile = audioFiles ? pick(audioFiles) : null;
    
    tasks.push({
      type: T('jsPsychHtmlButtonResponse'), // EXPLICITLY ADD TYPE
      stimulus: `
        <div style="text-align:center;">
          <p>Sound ${idx + 1} of ${foley_stimuli.length}</p>
          <div style="padding:20px; background:#f8f9fa; border-radius:10px; margin:20px auto; max-width:400px;">
            <button id="play-sound" class="jspsych-btn" style="font-size:18px;">▶️ Play Sound</button>
            <p id="status" style="margin-top:10px; color:#666;">Click to play</p>
          </div>
          <p>What does this sound represent?</p>
          <p style="color:#666;">この音は何を表していますか？</p>
        </div>
      `,
      choices: stim.options,
      data: {
        task: 'foley_recognition',
        audio_key: stim.audio,
        correct_answer: stim.correct,
        condition: testCondition,
        pid: currentPID
      },
      on_load: function() {
        if (!chosenFile) return;
        
        const btn = document.getElementById('play-sound');
        const status = document.getElementById('status');
        const audio = new Audio(asset(chosenFile));
        
        audio.addEventListener('canplaythrough', () => {
          status.textContent = 'Ready to play';
        });
        
        audio.addEventListener('error', () => {
          btn.textContent = '❌ Audio unavailable';
          btn.disabled = true;
        });
        
        btn.addEventListener('click', () => {
          try {
            audio.currentTime = 0;
            audio.play();
            status.textContent = 'Playing...';
          } catch (e) {
            status.textContent = 'Playback failed';
          }
        });
      },
      on_finish: (data) => {
        data.correct = (data.response === data.correct_answer);
      }
    });
  });

  return tasks;
}

// Task 3: Picture Naming (Objects + Actions)
function buildPictureNamingTask() {
  const tasks = [];

  tasks.push({
    type: T('jsPsychInitializeMicrophone'),
    data: { task: 'mic_init' },
    on_finish: () => { microphoneAvailable = true; }
  });

  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h3>Picture Naming / 絵の命名</h3>
      <p>You will see images from the VR experience.</p>
      <p>Say the English name of each item or action.</p>
      <p>VR体験で見た画像が表示されます。英語で名前を言ってください。</p>
      <p><b>You have 4 seconds per item.</b></p>
    `,
    choices: ['Start / 開始']
  });

  // Microphone check
  tasks.push({
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: '<h3>Microphone Check / マイク確認</h3><p>Say "test" for 2 seconds.</p>',
    recording_duration: 2000,
    show_done_button: true,
    allow_playback: true,
    accept_button_text: 'Sounds OK / 続行',
    data: { task: 'mic_check' }
  });

  // Randomize picture order
  const randomizedStimuli = jsPsych.randomization.shuffle([...picture_naming_stimuli]);

  randomizedStimuli.forEach((stim, idx) => {
    const variants = IMG[stim.target] || [];
    const chosen = variants.length ? pick(variants) : null;
    const imgPath = chosen ? asset(chosen) : null;
    const fallbackSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23ddd' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle'%3EImage not found%3C/text%3E%3C/svg%3E";

    // Prepare screen
    tasks.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="text-align:center;">
          <p style="color:#666;">Image ${idx + 1} of ${randomizedStimuli.length}</p>
          <img src="${imgPath || fallbackSVG}" style="width:350px; height:auto; border-radius:8px;"
               onerror="this.src='${fallbackSVG}'">
          <p style="margin-top:16px;">When ready, click the button to start recording.</p>
          <p style="color:#666;">準備ができたら録音を開始してください。</p>
        </div>
      `,
      choices: ['Ready to Record / 録音開始'],
      data: {
        task: 'picture_naming_prepare',
        target: stim.target,
        category: stim.category,
        trial_num: idx + 1
      }
    });

    // Record screen
    tasks.push({
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `
        <div style="text-align:center;">
          <img src="${imgPath || fallbackSVG}" style="width:350px; height:auto; border-radius:8px;"
               onerror="this.src='${fallbackSVG}'">
          <p style="margin-top:16px; color:#d32f2f; font-weight:bold; font-size:18px;">
            🔴 Recording... Speak now!
          </p>
        </div>
      `,
      recording_duration: 4000,
      show_done_button: false,
      data: {
        task: 'picture_naming_audio',
        target: stim.target,
        category: stim.category,
        condition: testCondition,
        pid: currentPID,
        trial_num: idx + 1,
        phase: 'post'
      },
      on_finish: (d) => {
        const tgt = (d.target || 'unknown').toLowerCase();
        const idx = d.trial_num || 'x';
        d.audio_filename = `post_${currentPID}_${tgt}_${idx}.wav`;
      }
    });
  });

  return tasks;
}

// Task 4: Transfer/Recognition Test (Immediate only) - FIXED
function buildTransferTask() {
  const intro = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h3>Recognition Test / 認識テスト</h3>
      <p>You will see words one at a time.</p>
      <p>Decide if you saw each word in the VR experience.</p>
      <p>VR体験で見た単語かどうかを判断してください。</p>
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
        data.signal_type = (data.correct_answer === true)
          ? (said_yes ? 'hit' : 'miss')
          : (said_yes ? 'false_alarm' : 'correct_rejection');
      }
    }],
    timeline_variables: transfer_words.map(item => ({
      word_display: `
        <div style="text-align:center; padding:40px;">
          <p style="font-size:36px; font-weight:bold; margin:30px 0;">${item.word}</p>
          <p>Did you see this word in the VR experience?</p>
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

// Task 5: Post-Training Questionnaire
function buildPostQuestionnaire() {
  if (!have('jsPsychSurvey')) {
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<p>Survey plugin not available</p>',
      choices: ['Continue']
    };
  }

  return {
    type: T('jsPsychSurvey'),
    survey_json: {
      title: 'Post-Training Questionnaire / 訓練後アンケート',
      showQuestionNumbers: 'off',
      pages: [{
        elements: [
          {
            type: 'rating',
            name: 'confidence_vocabulary',
            title: 'How confident are you with the pancake-making vocabulary?',
            description: 'パンケーキ作りの語彙にどのくらい自信がありますか？',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Not confident',
            maxRateDescription: 'Very confident'
          },
          {
            type: 'rating',
            name: 'confidence_procedure',
            title: 'How confident are you that you could make pancakes following the procedure?',
            description: '手順に従ってパンケーキを作れると思いますか？',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Not confident',
            maxRateDescription: 'Very confident'
          },
          {
            type: 'rating',
            name: 'training_helpfulness',
            title: 'How helpful was the VR training for learning?',
            description: 'VR訓練は学習に役立ちましたか？',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Not helpful',
            maxRateDescription: 'Very helpful'
          },
          {
            type: 'comment',
            name: 'learning_strategies',
            title: 'What strategies did you use to remember the vocabulary and procedures?',
            description: '語彙や手順を覚えるためにどのような戦略を使いましたか？',
            isRequired: false,
            rows: 3
          },
          {
            type: 'comment',
            name: 'difficulties',
            title: 'What was most difficult about the learning experience?',
            description: '学習体験で最も難しかったことは何ですか？',
            isRequired: false,
            rows: 3
          }
        ]
      }]
    },
    data: {
      task: 'post_questionnaire',
      condition: testCondition,
      pid: currentPID
    }
  };
}

/* ========== DATA SAVING ========== */
function saveData() {
  const data = jsPsych.data.get().values();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `posttest_${testCondition}_${currentPID}_${timestamp}.json`;

  localStorage.setItem('posttest_latest', JSON.stringify({
    filename: filename,
    condition: testCondition,
    pid: currentPID,
    timestamp: timestamp,
    data: data
  }));

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`Data saved: ${filename}`);
}

/* ========== COMPLETION SCREEN ========== */
function showCompletion() {
  const target = document.getElementById('jspsych-target');
  if (!target) return;
  target.innerHTML = `
    <div style="max-width:600px; margin:50px auto; text-align:center; padding:40px; 
                background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2>✅ Post-Test Complete! / 完了！</h2>
      <p><strong>Participant:</strong> ${currentPID}</p>
      <p><strong>Condition:</strong> ${testCondition}</p>
      <p>Your data has been downloaded automatically.</p>
      <p>データは自動的にダウンロードされました。</p>
      <p style="margin-top:30px;">
        <button onclick="location.reload()" style="padding:10px 20px; font-size:16px; 
                background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">
          Run Another Test / 別のテストを実行
        </button>
      </p>
    </div>
  `;
}

console.log('Post-test script v2.2 loaded successfully');