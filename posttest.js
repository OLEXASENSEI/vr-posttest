// VR Post-Test Battery - Version 2.8
// - FIX: Foley spacer now always has a valid plugin type (keyboard OR button fallback)
// - Sound loader: resilient + alias patterns for common alt names
// - Keeps iconic vs arbitrary recognition, confidence, and exit feedback from v2.7

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
  if (typeof x === 'string') { try { return JSON.parse(x); } catch { return {}; } }
  return (typeof x === 'object') ? x : {};
}

function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return Math.abs(h); }
function pickForPID(key, arr){
  if (!arr || !arr.length) return null;
  const idx = hashStr(String(currentPID || 'anon') + '|' + key) % arr.length;
  return arr[idx];
}

/* ========== IMAGES (png set) ========== */
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

/* ========== SOUNDS ========== */
/* Core names per key; the loader will also try aliases below */
const SND = {
  crack:  ['crack_01.mp3',  'crack_02.mp3'],
  flip:   ['flip_01.mp3',   'flip_02.mp3'],
  pour:   ['pour_01.mp3',   'pour_02.mp3'],
  sizzle: ['sizzle_01.mp3', 'sizzle_02.mp3'],
  spread: ['spread_01.mp3', 'spread_02.mp3'],
  whisk:  ['whisk_01.mp3',  'whisk_02.mp3'],
};

/* Optional aliases to match alt filenames you might actually have in /sounds */
const SND_ALIASES = {
  crack:  ['egg_crack.mp3', 'cracking.mp3'],
  whisk:  ['circular_whir.mp3', 'whisk.mp3'],
  pour:   ['granular_pour.mp3', 'liquid_flow.mp3', 'pour.mp3'],
  sizzle: ['frying_sizzle.mp3', 'tss.mp3', 'sizzle.mp3'],
  flip:   ['pan_flip.mp3', 'flip.mp3'],
  spread: ['butter_spread.mp3', 'spread.mp3'],
};

function imageSrcFor(key){
  const variants = IMG[key];
  const chosen   = pickForPID(key, variants);
  return chosen ? asset(chosen) : null;
}

/* Build a list of candidate paths to try for a given base */
function makeSoundCandidates(nameOrPath){
  const base = (nameOrPath.includes('/') ? nameOrPath : ('sounds/' + nameOrPath)).replace(/\\/g,'/');
  const noBust = base.replace(/\?.*$/, '');
  const trySet = new Set();

  // 1) as written
  trySet.add(noBust);

  // 2) _01 -> _1
  trySet.add(noBust.replace(/_0(\d+)\.mp3$/i, '_$1.mp3'));

  // 3) strip suffix entirely: _01 -> none
  trySet.add(noBust.replace(/_[0-9]{1,2}\.mp3$/i, '.mp3'));

  // 4) wav / ogg fallbacks of those
  [...Array.from(trySet)].forEach(p => trySet.add(p.replace(/\.mp3$/i, '.wav')));
  [...Array.from(trySet)].forEach(p => trySet.add(p.replace(/\.(mp3|wav)$/i, '.ogg')));

  return Array.from(trySet);
}

function createResilientAudioLoader(candidates){
  let idx = 0, audio = null;
  function loadNext(onReady, onFail){
    if (idx >= candidates.length) { onFail?.(); return; }
    const src = asset(candidates[idx++]);
    audio = new Audio(); audio.preload='auto';
    const clean = () => {
      audio?.removeEventListener('canplaythrough', ok);
      audio?.removeEventListener('error', bad);
    };
    const ok  = () => { clean(); onReady?.(audio, src); };
    const bad = () => { clean(); loadNext(onReady, onFail); };
    audio.addEventListener('canplaythrough', ok,  { once:true });
    audio.addEventListener('error',          bad, { once:true });
    audio.src = src;
  }
  return { loadNext };
}

function soundCandidatesFor(key){
  const primary = SND[key] || [];
  const aliases = SND_ALIASES[key] || [];
  // Flatten and expand into candidate variants
  const raw = [...primary, ...aliases];
  // Expand each raw into its fallback pattern set
  const expanded = raw.flatMap(r => makeSoundCandidates(r));
  // De-dup while preserving order
  const seen = new Set(); const list = [];
  for (const p of expanded) { if (!seen.has(p)) { seen.add(p); list.push(p); } }
  return list;
}

function playOne(key){
  try {
    const loader = createResilientAudioLoader(soundCandidatesFor(key));
    loader.loadNext((audio)=>{ audio.currentTime=0; audio.play().catch(()=>{}); },
      ()=>{ console.warn('[posttest] All audio candidates failed for', key); });
  } catch { /* noop */ }
}

/* ========== STIMULI DEFINITIONS ========== */
const picture_naming_stimuli = [
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
  { target: 'mixing',   category: 'action'  },
  { target: 'cracking', category: 'action'  },
  { target: 'pouring',  category: 'action'  },
  { target: 'flipping', category: 'action'  },
  { target: 'sizzling', category: 'process' },
];

const foley_stimuli = [
  { audio: 'crack',  options: ['stirring', 'cracking'],               correct: 1 },
  { audio: 'whisk',  options: ['mixing (whisking)', 'pouring'],       correct: 0 },
  { audio: 'pour',   options: ['pouring', 'flipping'],                correct: 0 },
  { audio: 'sizzle', options: ['spreading butter', 'cooking on pan'], correct: 1 },
];

const PROCEDURE_STEPS = [
  'Crack eggs',
  'Mix flour and eggs',
  'Heat the pan',
  'Pour batter on pan',
  'Flip when ready',
];

/* Recognition pool: ICONIC vs ARBITRARY vs FOILS */
const transfer_words = [
  // ICONIC TARGETS (trained)
  { word: 'sizzle', pos: 'verb',  iconic: true,  type: 'target_iconic',   trained: true  },
  { word: 'crack',  pos: 'verb',  iconic: true,  type: 'target_iconic',   trained: true  },

  // ARBITRARY TARGETS (trained)
  { word: 'flip',   pos: 'verb',  iconic: false, type: 'target_arbitrary', trained: true },
  { word: 'pour',   pos: 'verb',  iconic: false, type: 'target_arbitrary', trained: true },
  { word: 'whisk',  pos: 'verb',  iconic: false, type: 'target_arbitrary', trained: true },
  { word: 'bowl',   pos: 'noun',  iconic: false, type: 'target_arbitrary', trained: true },
  { word: 'spatula',pos: 'noun',  iconic: false, type: 'target_arbitrary', trained: true },
  { word: 'flour',  pos: 'noun',  iconic: false, type: 'target_arbitrary', trained: true },

  // ICONIC FOILS (never shown)
  { word: 'glug',   pos: 'verb',  iconic: true,  type: 'foil_iconic',     trained: false },
  { word: 'splash', pos: 'verb',  iconic: true,  type: 'foil_iconic',     trained: false },
  { word: 'tss',    pos: 'interj',iconic: true,  type: 'foil_iconic',     trained: false },

  // TRUE FOILS (never shown)
  { word: 'fork',   pos: 'noun',  iconic: false, type: 'foil_true',       trained: false },
  { word: 'knife',  pos: 'noun',  iconic: false, type: 'foil_true',       trained: false },
  { word: 'salt',   pos: 'noun',  iconic: false, type: 'foil_true',       trained: false },
  { word: 'cup',    pos: 'noun',  iconic: false, type: 'foil_true',       trained: false },
];

/* ========== CLEANUP MANAGER ========== */
const cleanupManager = {
  items: new Map(),
  register(key, fn) { this.items.set(key, fn); },
  cleanup(key) { const fn = this.items.get(key); if (typeof fn === 'function') { try { fn(); } catch(e){ console.error(`Cleanup error [${key}]`, e); } } this.items.delete(key); },
  cleanupAll() { for (const [k] of this.items) this.cleanup(k); }
};

/* ========== MAIN ENTRY POINT ========== */
window.__START_POSTTEST = function(pid, isDelayed) {
  currentPID = pid || 'unknown';
  testCondition = isDelayed ? 'delayed' : 'immediate';
  console.log(`Starting ${testCondition} post-test for participant ${currentPID}`);

  const picker = document.getElementById('picker');
  if (picker) picker.style.display = 'none';

  if (!have('initJsPsych')) { alert('jsPsych not loaded. Please refresh.'); return; }

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
  const tl = [];

  tl.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h2>Post-Test / ポストテスト</h2>
        <p><strong>Participant:</strong> ${currentPID}</p>
        <p><strong>Condition:</strong> ${testCondition}</p>
        <p>Focus on: <b>Recall, Retention, and Pronunciation</b></p>
      </div>`,
    choices: ['Begin / 開始']
  });

  if (have('jsPsychSurveyText')) tl.push(buildProceduralRecallTask());
  tl.push(...buildFoleyTask());

  if (have('jsPsychInitializeMicrophone') && have('jsPsychHtmlAudioResponse')) {
    tl.push(...buildPictureNamingTask());
  } else {
    tl.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: '<p>Picture naming skipped (microphone not available)</p>', choices: ['Continue'] });
  }

  if (!isDelayed) tl.push(buildTransferTask());

  tl.push(buildPostQuestionnaire());
  tl.push(buildExitOpenQuestion());

  return tl;
}

/* ========== TASK BUILDERS ========== */
function buildProceduralRecallTask() {
  return {
    type: T('jsPsychSurveyText'),
    preamble: `
      <div style="max-width: 700px; margin: 0 auto; text-align: left;">
        <h3>Recipe Memory Test / レシピ記憶テスト</h3>
        <p>Begin with the first step and end with the last step before eating.</p>
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
    data: { task: 'procedural_recall_open_ended', condition: testCondition, pid: currentPID, correct_steps: PROCEDURE_STEPS },
    on_finish: (data) => {
      const r = asObject(data.response ?? data.responses);
      data.recalled_steps = [r.step_1||'', r.step_2||'', r.step_3||'', r.step_4||'', r.step_5||''];
      data.needs_manual_scoring = true;
    }
  };
}

function buildFoleyTask() {
  const tasks = [];
  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `<div style="text-align:center;"><h3>Sound Recognition / 音の認識</h3><p>Listen and choose what the sound represents.</p></div>`,
    choices: ['Begin / 開始']
  });

  foley_stimuli.forEach((stim, idx) => {
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
      data: { task:'foley_recognition', audio_key: stim.audio, correct_answer: stim.correct, pid: currentPID, condition: testCondition, trial_number: idx+1 },
      on_load: function(){
        const btn = document.getElementById(`play-sound-${idx}`);
        const status = document.getElementById(`status-${idx}`);
        const candidates = soundCandidatesFor(stim.audio);
        const loader = createResilientAudioLoader(candidates);

        btn.disabled = true;
        status.textContent = 'Loading audio…';

        loader.loadNext((audio)=>{
          status.textContent='Ready - click to play'; btn.disabled=false;
          const click = ()=>{ btn.disabled=true; status.textContent='🔊 Playing…'; audio.currentTime=0; audio.play().then(()=>{ audio.onended=()=>{ btn.disabled=false; status.textContent='Finished - choose your answer'; }; }).catch(()=>{ btn.disabled=false; status.textContent='Playback failed'; }); };
          btn.addEventListener('click', click);
          cleanupManager.register(`foley_${idx}`, ()=>{ btn.removeEventListener('click', click); try{ audio.pause(); audio.src=''; audio.load(); }catch{} });
        }, ()=>{
          console.warn('[posttest] All candidates failed for', stim.audio, candidates);
          btn.textContent='❌ Audio unavailable'; btn.disabled=true; status.textContent='Please answer without audio';
        });
      },
      on_finish: d => { cleanupManager.cleanup(`foley_${idx}`); d.correct = (d.response === d.correct_answer); }
    });
  });
  return tasks;
}

function buildPictureNamingTask() {
  const tasks = [];
  tasks.push({ type: T('jsPsychInitializeMicrophone'), data:{task:'mic_init'}, on_finish:()=>{ microphoneAvailable=true; console.log('Microphone initialized'); } });

  tasks.push({
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `
      <div style="max-width:640px;margin:0 auto;text-align:center">
        <h3>Picture Description / 絵の説明</h3>
        <p>Describe the picture in English with as much detail as you can — <b>objects, actions, sounds, smells</b>.</p>
        <p>できるだけ詳しく（物、動き、音、匂い）英語で説明してください。</p>
        <p style="margin-top:12px;background:#e3f2fd;border-radius:8px;padding:12px;">⏱️ 4 seconds per picture.</p>
      </div>`,
    choices:['Start / 開始']
  });

  tasks.push({
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: `<div style="text-align:center;"><h4>Microphone check</h4><p>Say "test" for 2 seconds.</p></div>`,
    recording_duration: 2000, show_done_button: true, allow_playback: true, accept_button_text: 'OK', data:{task:'mic_check'}
  });

  const naming_timeline = {
    timeline: [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: () => {
        const stim = jsPsych.timelineVariable('stim');
        const img  = imageSrcFor(stim.target);
        const fb   = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='16'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
        return `<div style="text-align:center;"><img src="${img||fb}" style="width:350px;border-radius:8px" onerror="this.src='${fb}'" /><p style="margin-top:12px;">Click to record for 4 seconds.</p></div>`;
      },
      choices:['Start recording / 録音開始'],
      data: () => ({ task:'picture_naming_prepare', target: jsPsych.timelineVariable('stim').target, category: jsPsych.timelineVariable('stim').category })
    },{
      type: T('jsPsychHtmlAudioResponse'),
      stimulus: () => {
        const stim = jsPsych.timelineVariable('stim');
        const img  = imageSrcFor(stim.target);
        const fb   = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='300'%3E%3Crect fill='%23f5f5f5' width='350' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='16'%3EImage not available:%20${stim.target}%3C/text%3E%3C/svg%3E`;
        return `<div style="text-align:center;"><img src="${img||fb}" style="width:350px;border-radius:8px" onerror="this.src='${fb}'" /><div style="margin-top:10px;background:#ffebee;border-radius:8px;padding:10px;"><b>🔴 Recording…</b> Describe the picture (objects, actions, sounds, smells).</div></div>`;
      },
      recording_duration: 4000, show_done_button: false,
      data: () => ({ task:'picture_naming_audio', target: jsPsych.timelineVariable('stim').target, category: jsPsych.timelineVariable('stim').category, pid: currentPID, phase:'post' }),
      on_finish: (d) => {
        const tgt = (d.target||'unknown').toLowerCase();
        const idx = jsPsych.timelineVariable('idx') || 'x';
        d.audio_filename = `post_${currentPID}_${tgt}_${idx}.wav`;
        try {
          const rec = d.response && (d.response instanceof Blob ? d.response : d.response.recording);
          if (rec instanceof Blob) d.audio_blob_url = URL.createObjectURL(rec);
        } catch {}
      }
    }],
    timeline_variables: picture_naming_stimuli.map((s,i)=>({ stim:s, idx:i+1 })),
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

  const trial = {
    timeline: [{
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: jsPsych.timelineVariable('word_display'),
      choices: ['YES - I saw this', 'NO - I did not see this'],
      data: jsPsych.timelineVariable('trial_data'),
      on_finish: (d) => {
        const yes = (d.response === 0);
        d.response_label = yes ? 'yes' : 'no';
        d.correct = (yes === d.correct_answer);
        d.signal_type = d.correct_answer ? (yes ? 'hit' : 'miss')
                                         : (yes ? 'false_alarm' : 'correct_rejection');
      }
    },
    {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="text-align:center;"><p>How confident are you?</p><p>どのくらい自信がありますか？</p></div>`,
      choices: ['1 (Guess)', '2', '3', '4 (Very sure)'],
      data: { task: 'transfer_confidence' },
      on_finish: (d) => { d.confidence = (d.response ?? null) !== null ? (d.response + 1) : null; }
    }],
    timeline_variables: transfer_words.map(item => ({
      word_display: `
        <div style="text-align:center; padding:28px;">
          <div style="padding: 22px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;">
            <p style="font-size:32px; font-weight:bold; margin:10px 0; color:#333">${item.word}</p>
            <p style="font-size:12px; color:#888; margin:0;">${item.pos.toUpperCase()} • ${item.iconic ? 'ICONIC' : 'ARBITRARY'} • ${item.trained ? 'Target' : 'Foil'}</p>
          </div>
        </div>
      `,
      trial_data: {
        task: 'transfer_test',
        word: item.word,
        pos: item.pos,
        iconic: item.iconic,
        word_type_label: item.type,
        correct_answer: item.trained,
        condition: testCondition,
        pid: currentPID
      }
    })),
    randomize_order: true
  };

  return { timeline: [intro, trial] };
}

function buildPostQuestionnaire() {
  if (have('jsPsychSurvey')) {
    return {
      type: T('jsPsychSurvey'),
      survey_json: {
        title: 'Post-Training Questionnaire / 訓練後アンケート',
        showQuestionNumbers: 'off',
        showCompletedPage: false,
        pages: [{
          elements: [
            { type: 'rating', name: 'confidence_vocabulary',  title: 'Vocabulary confidence?', isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'rating', name: 'confidence_procedure',   title: 'Procedure confidence?',  isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'rating', name: 'training_helpfulness',   title: 'Training helpfulness?',  isRequired: true, rateMin: 1, rateMax: 5 },
            { type: 'comment', name: 'learning_strategies',   title: 'Strategies used (optional)', isRequired: false, rows: 3 },
            { type: 'comment', name: 'difficulties',          title: 'Most difficult part (optional)', isRequired: false, rows: 3 },
            { type: 'comment', name: 'additional_comments',   title: 'Anything else? (optional)', isRequired: false, rows: 3 },
          ]
        }]
      },
      data: { task: 'post_questionnaire', condition: testCondition, pid: currentPID }
    };
  }
  return {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: '<p>Survey plugin not available — skipping questionnaire.</p>',
    choices: ['Continue']
  };
}

/* Final open-ended feedback */
function buildExitOpenQuestion(){
  if (!have('jsPsychSurveyText')) {
    return { type: T('jsPsychHtmlButtonResponse'), stimulus: '<p>Feedback form unavailable.</p>', choices: ['Finish'] };
  }
  return {
    type: T('jsPsychSurveyText'),
    preamble: `<div style="text-align:center;"><h3>Final Comments / 最後のコメント</h3><p>Please share any questions, concerns, or issues you had with the test.</p><p>テストについての質問・懸念・問題点があればご記入ください。</p></div>`,
    questions: [
      { prompt: 'Your feedback (optional) / フィードバック（任意）', name: 'exit_feedback', rows: 5, required: false }
    ],
    button_label: 'Submit & Finish / 送信して終了',
    data: { task: 'exit_feedback', condition: testCondition, pid: currentPID }
  };
}

/* ========== DATA & COMPLETION ========== */
function saveData() {
  try {
    const data = jsPsych.data.get().values();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `posttest_${testCondition}_${currentPID}_${timestamp}.json`;

    localStorage.setItem('posttest_latest', JSON.stringify({ filename, condition: testCondition, pid: currentPID, timestamp, data }));

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
    alert('There was an error saving your data.');
  }
}

function showCompletion() {
  const el = document.getElementById('jspsych-target');
  if (!el) return;
  cleanupManager.cleanupAll();
  el.innerHTML = `
    <div style="max-width:600px; margin:50px auto; text-align:center; padding:40px;
                background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2 style="color:#4CAF50;">✅ Post-Test Complete!</h2>
      <p>Your data has been downloaded automatically.</p>
      <p>データは自動的にダウンロードされました。</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;border:none;border-radius:8px;background:#4CAF50;color:#fff;cursor:pointer;">Run Another Test / 別のテストを実行</button>
    </div>`;
}

window.addEventListener('beforeunload', () => cleanupManager.cleanupAll());
console.log('Post-test script v2.8 loaded — spacer type fix + alias-aware audio + iconic recognition + exit feedback');
