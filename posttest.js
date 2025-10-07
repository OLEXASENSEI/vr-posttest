// VR Post-Test Battery
// Version 1.0

/* ========== GLOBAL STATE ========== */
let jsPsych = null;
let currentPID = 'unknown';
let testCondition = 'immediate'; // or 'delayed'

/* ========== HELPER FUNCTIONS ========== */
const have = (name) => typeof window[name] !== 'undefined';
const T = (name) => window[name];

// Asset helper with cache busting
const ASSET_BUST = Math.floor(Math.random() * 100000);
const asset = (p) => {
  const clean = p.replace(/^(\.\/|\/)/, "");
  return clean + (clean.includes("?") ? "&" : "?") + "v=" + ASSET_BUST;
};

/* ========== STIMULI DEFINITIONS ========== */
// Picture naming stimuli (same as pre-test)
const picture_naming_stimuli = [
  { image: 'img/bowl.jpg',    target: 'bowl',    category: 'utensil'    },
  { image: 'img/egg.jpg',     target: 'egg',     category: 'ingredient' },
  { image: 'img/flour.jpg',   target: 'flour',   category: 'ingredient' },
  { image: 'img/spatula.jpg', target: 'spatula', category: 'utensil'    },
];

// Procedure steps for testing
const PROCEDURE_STEPS = [
  'Crack eggs',
  'Add flour', 
  'Whisk mixture',
  'Heat pan',
  'Pour batter'
];

// Transfer test words (recognition)
const transfer_words = [
  // Target words (from training)
  { word: 'bowl', type: 'target', trained: true },
  { word: 'egg', type: 'target', trained: true },
  { word: 'flour', type: 'target', trained: true },
  { word: 'spatula', type: 'target', trained: true },
  // Related foils
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
  
  // Hide picker UI
  document.getElementById('picker').style.display = 'none';
  
  // Initialize jsPsych
  if (!have('initJsPsych')) {
    alert('jsPsych not loaded. Please refresh and try again.');
    return;
  }
  
  jsPsych = T('initJsPsych')({
    display_element: 'jspsych-target',
    show_progress_bar: true,
    message_progress_bar: 'Progress',
    on_finish: () => {
      saveData();
      showCompletion();
    }
  });
  
  // Build and run timeline
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
      <h2>Post-Test (${testCondition})</h2>
      <p>Participant: ${currentPID}</p>
      <p>You will complete ${isDelayed ? '3' : '4'} tasks.</p>
    `,
    choices: ['Begin']
  });
  
  // Task 1: Procedural Knowledge Test
  timeline.push(buildProceduralTask());
  
  // Task 2: Picture Naming (with microphone)
  if (have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse')) {
    timeline.push(...buildPictureNamingTask());
  } else {
    console.warn('Microphone plugins not available, skipping picture naming');
    timeline.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: '<p>Picture naming task skipped (microphone plugins not available)</p>',
      choices: ['Continue']
    });
  }
  
  // Task 3: Transfer/Recognition Test (IMMEDIATE ONLY)
  if (!isDelayed) {
    timeline.push(buildTransferTask());
  }
  
  // Task 4: Vocabulary Size Test  
  timeline.push(buildVocabularyTask());
  
  // End screen
  timeline.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h2>Complete!</h2>
      <p>Thank you for completing the post-test.</p>
      <p>Your data has been saved.</p>
    `,
    choices: ['Finish']
  });
  
  return timeline;
}

/* ========== TASK BUILDERS ========== */

// Task 1: Procedural Knowledge
function buildProceduralTask() {
  return {
    type: T('jsPsychSurveyText'),
    preamble: `
      <h3>Recipe Order Task</h3>
      <p>Number these pancake-making steps from 1 to 5 in the correct order:</p>
    `,
    questions: PROCEDURE_STEPS.map((step, i) => ({
      prompt: `<b>${step}</b>`,
      name: `step_${i}`,
      placeholder: 'Enter 1-5',
      required: true
    })),
    button_label: 'Submit',
    data: { 
      task: 'procedural_knowledge_post',
      condition: testCondition,
      pid: currentPID
    },
    on_finish: (data) => {
      // Parse responses and calculate score
      const responses = JSON.parse(data.response || '{}');
      const positions = {};
      let score = 0;
      
      PROCEDURE_STEPS.forEach((step, i) => {
        const val = parseInt(responses[`step_${i}`], 10);
        positions[step] = val;
      });
      
      // Simple scoring: check key constraints
      if (positions['Crack eggs'] < positions['Whisk mixture']) score++;
      if (positions['Add flour'] < positions['Whisk mixture']) score++;
      if (positions['Whisk mixture'] < positions['Pour batter']) score++;
      if (positions['Heat pan'] < positions['Pour batter']) score++;
      
      data.procedure_score = score / 4; // Normalize to 0-1
      data.step_positions = positions;
    }
  };
}

// Task 2: Picture Naming
function buildPictureNamingTask() {
  const tasks = [];
  
  // Initialize microphone
  tasks.push({
    type: T('jsPsychInitializeMicrophone'),
    data: { task: 'mic_init' }
  });
  
  // Instructions
  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <h3>Picture Naming</h3>
      <p>You will see pictures from the VR experience.</p>
      <p>Say the English name of each object.</p>
      <p>You have 4 seconds to respond.</p>
    `,
    choices: ['Start']
  });
  
  // Naming trials
  picture_naming_stimuli.forEach((stim, idx) => {
    // Show picture
    tasks.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `
        <div style="text-align:center;">
          <img src="${asset(stim.image)}" style="width:300px; height:auto;" 
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23ddd%22 width=%22300%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>Image not found</text></svg>'">
          <p>Name this object in English</p>
        </div>
      `,
      choices: ['Ready to record'],
      data: {
        task: 'picture_naming_prepare',
        target: stim.target,
        trial_num: idx + 1
      }
    });
    
    // Record response
    tasks.push({
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: `
        <div style="text-align:center;">
          <img src="${asset(stim.image)}" style="width:300px; height:auto;"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23ddd%22 width=%22300%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>Image not found</text></svg>'">
          <p style="color:red; font-weight:bold;">🔴 Recording... Speak now!</p>
        </div>
      `,
      recording_duration: 4000,
      show_done_button: false,
      data: {
        task: 'picture_naming_response',
        target: stim.target,
        category: stim.category,
        condition: testCondition,
        pid: currentPID,
        trial_num: idx + 1
      }
    });
  });
  
  return tasks;
}

// Task 3: Transfer/Recognition Test (Immediate only)
function buildTransferTask() {
  return {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: () => {
      const word = jsPsych.timelineVariable('word');
      return `
        <div style="text-align:center; padding:40px;">
          <h3>Recognition Test</h3>
          <p style="font-size:32px; font-weight:bold; margin:30px 0;">${word}</p>
          <p>Did you see this word in the VR experience?</p>
        </div>
      `;
    },
    choices: ['YES', 'NO'],
    timeline_variables: transfer_words,
    randomize_order: true,
    data: {
      task: 'transfer_test',
      word: jsPsych.timelineVariable('word'),
      correct_answer: jsPsych.timelineVariable('trained'),
      word_type: jsPsych.timelineVariable('type'),
      condition: testCondition,
      pid: currentPID
    },
    on_finish: (data) => {
      // Score the response
      const said_yes = (data.response === 0); // YES button
      data.response_label = said_yes ? 'yes' : 'no';
      data.correct = (said_yes === data.correct_answer);
      
      // Signal detection metrics
      if (data.correct_answer === true) {
        data.signal_type = said_yes ? 'hit' : 'miss';
      } else {
        data.signal_type = said_yes ? 'false_alarm' : 'correct_rejection';
      }
    }
  };
}

// Task 4: Vocabulary Size Estimate
function buildVocabularyTask() {
  // Simple vocabulary test with real and fake words
  const vocab_items = [
    { word: 'BOOK', real: true },
    { word: 'FLORP', real: false },
    { word: 'ENIGMA', real: true },
    { word: 'BRASTICATE', real: false },
    { word: 'UBIQUITOUS', real: true },
    { word: 'MOXILATE', real: false },
  ];
  
  return {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: () => {
      const word = jsPsych.timelineVariable('word');
      return `
        <div style="text-align:center; padding:40px;">
          <h3>Vocabulary Check</h3>
          <p style="font-size:28px; font-weight:bold; margin:30px 0;">${word}</p>
          <p>Is this a real English word?</p>
        </div>
      `;
    },
    choices: ['Real Word', 'Not a Word'],
    timeline_variables: vocab_items,
    randomize_order: true,
    data: {
      task: 'vocabulary_test',
      word: jsPsych.timelineVariable('word'),
      correct_answer: jsPsych.timelineVariable('real'),
      condition: testCondition,
      pid: currentPID
    },
    on_finish: (data) => {
      const said_real = (data.response === 0);
      data.response_label = said_real ? 'real' : 'fake';
      data.correct = (said_real === data.correct_answer);
    }
  };
}

/* ========== DATA SAVING ========== */
function saveData() {
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
  
  // Download as file
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
  target.innerHTML = `
    <div style="max-width:600px; margin:50px auto; text-align:center; padding:40px; 
                background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2>✅ Post-Test Complete!</h2>
      <p><strong>Participant:</strong> ${currentPID}</p>
      <p><strong>Condition:</strong> ${testCondition}</p>
      <p>Your data has been downloaded automatically.</p>
      <p style="margin-top:30px;">
        <button onclick="location.reload()" style="padding:10px 20px; font-size:16px; 
                background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">
          Run Another Test
        </button>
      </p>
    </div>
  `;
}

// Log that script loaded successfully
console.log('Post-test script loaded successfully');