// VR Post-Test Battery - Complete Fixed Version 2.3
// Fixes: Audio cleanup, error handling, stability improvements

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
  if (!p) return '';
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
  crack:  ['sounds/crack_1.mp3', 'sounds/crack_2.mp3'],
  flip:   ['sounds/flip_1.mp3', 'sounds/flip_2.mp3'],
  pour:   ['sounds/pour_1.mp3', 'sounds/pour_2.mp3'],
  sizzle: ['sounds/sizzle_1.mp3', 'sounds/sizzle_2.mp3'],
  spread: ['sounds/spread_1.mp3', 'sounds/spread_2.mp3'],
  whisk:  ['sounds/whisk_1.mp3', 'sounds/whisk_2.mp3'],
};

const pick = (arr) => {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

function playOne(key) {
  try {
    const opts = SND[key];
    if (!opts || !opts.length) return;
    const chosen = pick(opts);
    if (!chosen) return;
    const a = new Audio(asset(chosen));
    a.play().catch((e) => console.error('Play failed:', e));
  } catch (e) {
    console.error('playOne error:', e);
  }
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
  { word: 'bowl',    type: 'target', trained: true },
  { word: 'egg',     type: 'target', trained: true },
  { word: 'flour',   type: 'target', trained: true },
  { word: 'spatula', type: 'target', trained: true },
  { word: 'spoon',   type: 'foil',   trained: false },
  { word: 'milk',    type: 'foil',   trained: false },
  { word: 'sugar',   type: 'foil',   trained: false },
  { word: 'plate',   type: 'foil',   trained: false },
];

/* ========== CLEANUP MANAGER ========== */
const cleanupManager = {
  items: new Map(),
  
  register(key, cleanupFunc) {
    this.items.set(key, cleanupFunc);
  },
  
  cleanup(key) {
    const func = this.items.get(key);
    if (func && typeof func === 'function') {
      try {
        func();
      } catch (e) {
        console.error(`Cleanup error for ${key}:`, e);
      }
      this.items.delete(key);
    }
  },
  
  cleanupAll() {
    this.items.forEach((func, key) => {
      this.cleanup(key);
    });
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

  // Clean up any previous test artifacts
  cleanupManager.cleanupAll();

  jsPsych = T('initJsPsych')({
    display_element: 'jspsych-target',
    show_progress_bar: true,
    message_progress_bar: 'Progress / 進捗',
    on_trial_finish: () => {
      // Ensure cleanup after each trial
      cleanupManager.cleanupAll();
    },
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

  // Check for required plugins
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
        <p>This will take approximately ${isDelayed ? '15-20' : '20-25'} minutes.</p>
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

  // Task 3: Picture Naming (Objects + Actions)
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

  // Task 5: Post-Training Questionnaire
  timeline.push(buildPostQuestionnaire());

  return timeline;
}

/* ========== TASK BUILDERS ========== */

// Task 1: OPEN-ENDED Procedural Recall with Better Context
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
          <li><strong>Begin with the first step</strong> - What do you do first?<br/>
              <span style="color: #666;">最初のステップから始めてください</span></li>
          <li><strong>End with the final step before eating</strong> - What is the last thing you do before the pancakes are ready to eat?<br/>
              <span style="color: #666;">食べる直前の最後のステップで終わってください</span></li>
          <li><strong>Recall the steps from the VR experience</strong> - Write what you remember from the training.<br/>
              <span style="color: #666;">VR体験で学んだ手順を思い出して書いてください</span></li>
        </ol>
        
        <p style="margin-top: 20px;"><em>Note: Spelling doesn't have to be perfect. Write what you remember.</em><br/>
        <span style="color: #666;">注: スペルは完璧でなくても構いません。覚えていることを書いてください。</span></p>
      </div>
    `,
    questions: [
      { prompt: '<b>Step 1 (First / 最初):</b>', name: 'step_1', placeholder: 'What is the very first thing you do?', required: true, rows: 2 },
      { prompt: '<b>Step 2:</b>', name: 'step_2', placeholder: 'What comes next?', required: true, rows: 2 },
      { prompt: '<b>Step 3:</b>', name: 'step_3', placeholder: 'What do you do after that?', required: true, rows: 2 },
      { prompt: '<b>Step 4:</b>', name: 'step_4', placeholder: 'What is the next step?', required: true, rows: 2 },
      { prompt: '<b>Step 5 (Last / 最後):</b>', name: 'step_5', placeholder: 'What is the final step before eating?', required: true, rows: 2 },
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

// Task 2: Foley Sound Recognition - FIXED VERSION
function buildFoleyTask() {
  const tasks = [];
  
  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Sound Recognition / 音の認識</h3>
        <p>Listen to cooking sounds and identify what they represent.</p>
        <p>料理の音を聞いて、何の音かを選んでください。</p>
        <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
          <b>⚠️ Please ensure your volume is adequate.</b><br/>
          You will hear ONE sound at a time. Please listen carefully before choosing.
        </p>
      </div>
    `,
    choices: ['Begin / 開始']
  });

  foley_stimuli.forEach((stim, idx) => {
    const audioFiles = SND[stim.audio];
    const chosenFile = audioFiles ? pick(audioFiles) : null;
    
    if (!chosenFile) {
      console.error(`No audio file available for ${stim.audio}`);
    }
    
    // Add a break screen before each sound (except first)
    if (idx > 0) {
      tasks.push({
        type: T('jsPsychHtmlKeyboardResponse'),
        stimulus: `
          <div style="text-align:center; padding: 40px;">
            <p style="font-size: 20px; color: #666;">Ready for the next sound?</p>
            <p style="font-size: 16px;">次の音の準備はいいですか？</p>
            <p style="margin-top: 30px; color: #999;">Press SPACE to continue / スペースキーで続行</p>
          </div>
        `,
        choices: [' '],
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
        if (!chosenFile) {
          const btn = document.getElementById(`play-sound-${idx}`);
          const status = document.getElementById(`status-${idx}`);
          if (btn) {
            btn.textContent = '❌ Audio unavailable';
            btn.disabled = true;
          }
          if (status) {
            status.textContent = 'Audio not available - please select an answer';
            status.style.color = '#d32f2f';
          }
          return;
        }
        
        const btnId = `play-sound-${idx}`;
        const statusId = `status-${idx}`;
        const btn = document.getElementById(btnId);
        const status = document.getElementById(statusId);
        
        if (!btn || !status) {
          console.error('Button or status element not found');
          return;
        }
        
        // Create audio element with unique reference
        const audio = new Audio();
        let hasPlayed = false;
        let audioReady = false;
        let playClickHandler = null;
        
        // Store cleanup function
        const cleanup = () => {
          try {
            // Remove event listeners
            if (playClickHandler) {
              btn.removeEventListener('click', playClickHandler);
            }
            
            // Stop and clear audio
            audio.pause();
            audio.src = '';
            audio.load();
          } catch (e) {
            console.error('Cleanup error:', e);
          }
        };
        
        // Define event handlers
        const onCanPlay = () => {
          audioReady = true;
          status.textContent = 'Ready - click to play / 再生準備完了';
          status.style.color = '#4CAF50';
        };
        
        const onError = () => {
          btn.textContent = '❌ Audio unavailable';
          btn.disabled = true;
          status.textContent = 'Audio failed to load - please select an answer';
          status.style.color = '#d32f2f';
        };
        
        const onEnded = () => {
          status.textContent = 'Sound finished - choose your answer / 音声終了 - 答えを選んでください';
          status.style.color = '#2196F3';
          btn.textContent = '🔁 Play Again';
          btn.disabled = false;
        };
        
        playClickHandler = () => {
          if (!audioReady) {
            console.log('Audio not ready yet');
            return;
          }
          
          try {
            audio.currentTime = 0;
            audio.play().then(() => {
              hasPlayed = true;
              status.textContent = '🔊 Playing sound... / 再生中...';
              status.style.color = '#FF9800';
              btn.disabled = true;
              btn.textContent = '⏸ Playing...';
            }).catch(err => {
              console.error('Play failed:', err);
              status.textContent = 'Playback failed / 再生失敗';
              status.style.color = '#d32f2f';
              btn.disabled = false;
              btn.textContent = '▶️ Try Again';
            });
          } catch (e) {
            console.error('Play error:', e);
            status.textContent = 'Playback failed / 再生失敗';
            status.style.color = '#d32f2f';
          }
        };
        
        // Set up audio
        audio.addEventListener('canplaythrough', onCanPlay);
        audio.addEventListener('error', onError);
        audio.addEventListener('ended', onEnded);
        
        // Add click listener
        btn.addEventListener('click', playClickHandler);
        
        // Set audio source last to trigger loading
        audio.preload = 'auto';
        audio.src = asset(chosenFile);
        
        // Register cleanup function
        cleanupManager.register(`foley_${idx}`, cleanup);
      },
      on_finish: (data) => {
        // Clean up this specific trial's audio
        cleanupManager.cleanup(`foley_${idx}`);
        
        // Record whether response was correct
        data.correct = (data.response === data.correct_answer);
      },
      post_trial_gap: 800
    });
  });

  return tasks;
}

// Task 3: Picture Naming (Objects + Actions) - IMPROVED
function buildPictureNamingTask() {
  const tasks = [];

  tasks.push({
    type: T('jsPsychInitializeMicrophone'),
    data: { task: 'mic_init' },
    on_finish: () => { 
      microphoneAvailable = true; 
      console.log('Microphone initialized');
    }
  });

  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Picture Naming / 絵の命名</h3>
        <p>You will see images from the VR experience.</p>
        <p>Say the English name of each item or action.</p>
        <p>VR体験で見た画像が表示されます。英語で名前を言ってください。</p>
        <p style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <b>⏱️ You have 4 seconds per item.</b><br/>
          Speak clearly into your microphone.
        </p>
      </div>
    `,
    choices: ['Start / 開始']
  });

  // Microphone check
  tasks.push({
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: `
      <div style="max-width: 500px; margin: 0 auto; text-align: center;">
        <h3>Microphone Check / マイク確認</h3>
        <p>Say "test" for 2 seconds to check your microphone.</p>
        <p style="margin-top: 20px; color: #666;">
          After recording, you can listen to your recording to ensure quality.
        </p>
      </div>
    `,
    recording_duration: 2000,
    show_done_button: true,
    allow_playback: true,
    accept_button_text: 'Sounds OK / 続行',
    data: { task: 'mic_check' }
  });

  // Create timeline with randomization built-in
  const naming_timeline = {
    timeline: [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: function() {
        const stim = jsPsych.timelineVariable('stim');
        const trialNum = jsPsych.timelineVariable('trial_num');
        const totalTrials = picture_naming_stimuli.length;
        
        // Get image path
        const variants = IMG[stim.target];
        let imgPath = null;
        if (variants && variants.length > 0) {
          imgPath = asset(variants[0]);
        }
        
        const fallbackSVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='20'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
        
        return `
          <div style="text-align:center;">
            <p style="color:#666; font-size: 14px; margin-bottom: 10px;">
              Image ${trialNum} of ${totalTrials}
            </p>
            <div style="position: relative; display: inline-block;">
              <img src="${imgPath || fallbackSVG}" 
                   style="width:350px; height:auto; max-height: 400px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
                   onerror="this.src='${fallbackSVG}'">
            </div>
            <p style="margin-top:20px; font-size: 16px;">
              Look at the image carefully.<br/>
              When ready, click the button to start recording.
            </p>
            <p style="color:#666; font-size: 14px; margin-top: 10px;">
              画像をよく見てください。<br/>
              準備ができたら録音を開始してください。
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
    },
    {
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: function() {
        const stim = jsPsych.timelineVariable('stim');
        const trialNum = jsPsych.timelineVariable('trial_num');
        
        // Get image path
        const variants = IMG[stim.target];
        let imgPath = null;
        if (variants && variants.length > 0) {
          imgPath = asset(variants[0]);
        }
        
        const fallbackSVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='20'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
        
        return `
          <div style="text-align:center;">
            <p style="color:#666; font-size: 14px; margin-bottom: 10px;">
              Recording ${trialNum} of ${picture_naming_stimuli.length}
            </p>
            <div style="position: relative; display: inline-block;">
              <img src="${imgPath || fallbackSVG}" 
                   style="width:350px; height:auto; max-height: 400px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
                   onerror="this.src='${fallbackSVG}'">
            </div>
            <div style="margin-top:20px; padding: 15px; background: #ffebee; border-radius: 8px;">
              <p style="color:#d32f2f; font-weight:bold; font-size:18px; margin: 0;">
                🔴 Recording... Speak now!
              </p>
              <p style="color:#666; font-size: 14px; margin-top: 5px;">
                Say the English name clearly
              </p>
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
        
        // Try to save audio data if available
        try {
          if (d.response && (d.response instanceof Blob || d.response.recording instanceof Blob)) {
            const blob = d.response instanceof Blob ? d.response : d.response.recording;
            d.audio_blob_url = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.error('Audio blob processing error:', e);
        }
      }
    }],
    timeline_variables: picture_naming_stimuli.map((stim, idx) => ({
      stim: stim,
      trial_num: idx + 1
    })),
    randomize_order: true
  };

  tasks.push(naming_timeline);

  return tasks;
}

// Task 4: Transfer/Recognition Test (Immediate only) - IMPROVED
function buildTransferTask() {
  const intro = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h3>Recognition Test / 認識テスト</h3>
        <p>You will see words one at a time.</p>
        <p>Decide if you saw each word in the VR experience.</p>
        <p>VR体験で見た単語かどうかを判断してください。</p>
        <p style="margin-top: 20px; color: #666;">
          Think carefully - some words may be similar to what you saw.
        </p>
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
        
        // Signal detection theory classification
        if (data.correct_answer === true) {
          data.signal_type = said_yes ? 'hit' : 'miss';
        } else {
          data.signal_type = said_yes ? 'false_alarm' : 'correct_rejection';
        }
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
          <p style="margin-top: 30px; font-size: 18px;">
            Did you see this word in the VR experience?
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 10px;">
            VR体験でこの単語を見ましたか？
          </p>
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

// Task 5: Post-Training Questionnaire - IMPROVED
function buildPostQuestionnaire() {
  if (!have('jsPsychSurvey')) {
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<p>Survey plugin not available - skipping questionnaire</p>',
      choices: ['Continue']
    };
  }

  return {
    type: T('jsPsychSurvey'),
    survey_json: {
      title: 'Post-Training Questionnaire / 訓練後アンケート',
      showQuestionNumbers: 'off',
      showCompletedPage: false,
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
            minRateDescription: 'Not confident / 自信なし',
            maxRateDescription: 'Very confident / とても自信あり'
          },
          {
            type: 'rating',
            name: 'confidence_procedure',
            title: 'How confident are you that you could make pancakes following the procedure?',
            description: '手順に従ってパンケーキを作れると思いますか？',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Not confident / 自信なし',
            maxRateDescription: 'Very confident / とても自信あり'
          },
          {
            type: 'rating',
            name: 'training_helpfulness',
            title: 'How helpful was the VR training for learning?',
            description: 'VR訓練は学習に役立ちましたか？',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Not helpful / 役立たない',
            maxRateDescription: 'Very helpful / とても役立つ'
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
          },
          {
            type: 'comment',
            name: 'additional_comments',
            title: 'Any additional comments or feedback?',
            description: '追加のコメントやフィードバックがあればお願いします',
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
  try {
    const data = jsPsych.data.get().values();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `posttest_${testCondition}_${currentPID}_${timestamp}.json`;

    // Save to localStorage
    localStorage.setItem('posttest_latest', JSON.stringify({
      filename: filename,
      condition: testCondition,
      pid: currentPID,
      timestamp: timestamp,
      data: data
    }));

    // Create download
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
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
  
  // Clean up any remaining audio elements
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
                style="padding:12px 24px; font-size:16px; 
                       background:#4CAF50; color:white; border:none; 
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

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupManager.cleanupAll();
});

console.log('Post-test script v2.3 loaded successfully - All fixes applied');