/**
 * posttest.js — single-folder, CDN-friendly version (no bundler)
 *
 * Asset scheme (no subfolders):
 *   img/:   bowl_01.png, bowl_02.png, pan_01.png, pan_02.png, ...
 *   sounds/: crack_1.mp3, crack_2.mp3, pour_1.mp3, ...
 *
 * URL params (examples):
 *   ?pid=S01&imgver=1&audver=1           // pick image set 1 (01) and audio set 1
 *   ?delayed=1                            // use the short delayed battery
 *   ?imgext=png&audioext=mp3              // change extensions
 *   ?pad2img=1&pad2audio=0                // control zero-padding for suffixes
 *   (compat) ?iset=A|B, ?atok=A|B         // A→1, B→2
 *
 * Requires jsPsych v7 UMD globals loaded first via CDN in post.html:
 *   - jspsych@7.3.4
 *   - @jspsych/plugin-preload@1.1.3
 *   - @jspsych/plugin-html-button-response@1.1.3
 *   - @jspsych/plugin-survey-text@1.1.3
 *   - @jspsych/plugin-survey-html-form@1.1.3
 *   - @jspsych/plugin-audio-button-response@1.1.3
 */

// --------------------------
// URL helpers & config
// --------------------------
function getParam(k, fallback = null) {
  const u = new URLSearchParams(window.location.search);
  return u.get(k) ?? fallback;
}
function ABto12(v, def = 1) {
  if (!v) return def; const s = String(v).toUpperCase();
  return s === 'A' ? 1 : s === 'B' ? 2 : (parseInt(s, 10) || def);
}
function verSuffix(v, pad2 = true) {
  const n = parseInt(v, 10) || 1; return pad2 ? String(n).padStart(2, '0') : String(n);
}

const CONFIG = {
  participant_id: getParam('pid') || `P_${Date.now()}`,
  condition: getParam('cond') || 'VR',
  is_delayed: getParam('delayed') === '1',
  img_ver: ABto12(getParam('imgver') ?? getParam('iset') ?? 1, 1),
  aud_ver: ABto12(getParam('audver') ?? getParam('atok') ?? 1, 1),
  img_ext: (getParam('imgext') || 'png').replace('.', ''),
  audio_ext: (getParam('audioext') || 'mp3').replace('.', ''),
  pad2img: (getParam('pad2img') ?? '1') === '1',  // images default to 01/02
  pad2audio: (getParam('pad2audio') ?? '0') === '1', // audio default to 1/2
  save_local: (getParam('localsave') || '1') === '1',
};

const PATHS = { img: 'img/', audio: 'sounds/' };

// --------------------------
// Stim manifests (edit bases if you change labels)
// --------------------------
const TARGETS = [
  { word: 'bowl', base: 'bowl' },
  { word: 'egg', base: 'egg' },
  { word: 'flour', base: 'flour' },
  { word: 'milk', base: 'milk' },
  { word: 'sugar', base: 'sugar' },
  { word: 'whisk', base: 'whisk' },
  { word: 'spatula', base: 'spatula' },
  { word: 'pan', base: 'pan' },
  { word: 'butter', base: 'butter' },
  { word: 'pancake', base: 'pancake' },
];

const FOLEY = [
  { label: 'sizzle (cooking on pan)', base: 'sizzle' },
  { label: 'whisk (mixing in bowl)', base: 'whisk' },
  { label: 'pour (liquid into bowl)', base: 'pour' },
  { label: 'crack (egg cracking)', base: 'crack' },
  { label: 'flip (spatula flip)', base: 'flip' },
  { label: 'spread (butter on pan)', base: 'spread' },
];

const PROCEDURE_STEPS = [
  'crack egg', 'add flour & milk', 'whisk batter', 'pour on pan', 'flip & serve'
];

// --------------------------
// Utilities
// --------------------------
function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }
function sample(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function imageSrc(base) {
  const suff = verSuffix(CONFIG.img_ver, CONFIG.pad2img);
  return `${PATHS.img}${base}_${suff}.${CONFIG.img_ext}`;
}
function audioSrc(base) {
  const suff = verSuffix(CONFIG.aud_ver, CONFIG.pad2audio);
  return `${PATHS.audio}${base}_${suff}.${CONFIG.audio_ext}`;
}

function preloadPaths() {
  const images = TARGETS.map(t => imageSrc(t.base));
  const audio = FOLEY.map(f => audioSrc(f.base));
  return { images, audio };
}

function build4AFC() {
  const items = [];
  TARGETS.forEach((t) => {
    const foils = sample(TARGETS.filter(x => x.word !== t.word), 3);
    const choices = shuffle([t, ...foils]).map(x => ({ word: x.word, img: imageSrc(x.base) }));
    const correct_index = choices.findIndex(c => c.word === t.word);
    items.push({ word: t.word, choices, correct_index });
  });
  return shuffle(items);
}

function buildFoley() {
  const items = [];
  FOLEY.forEach((f) => {
    const foils = sample(FOLEY.filter(x => x.label !== f.label), 3);
    const labels = shuffle([f.label, ...foils.map(x => x.label)]);
    const correct_index = labels.findIndex(l => l === f.label);
    items.push({ file: audioSrc(f.base), labels, correct_index });
  });
  return shuffle(items);
}

// --------------------------
// jsPsych init
// --------------------------
const jsPsych = initJsPsych({
  show_progress_bar: true,
  on_finish: () => {
    if (CONFIG.save_local) {
      jsPsych.data.get().localSave('json', `post_${CONFIG.participant_id}.json`);
    }
  }
});

const timeline = [];

// --------------------------
// Preload
// --------------------------
const toPreload = preloadPaths();
if (typeof jsPsychPreload !== 'undefined') {
  timeline.push({
    type: jsPsychPreload,
    images: toPreload.images,
    audio: toPreload.audio,
    message: '<p>Loading post-test…</p>'
  });
}

// --------------------------
// Welcome
// --------------------------
if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="max-width:780px;margin:0 auto;text-align:left">
        <h2>VR Study — Post-Test ${CONFIG.is_delayed ? '(Delayed)' : ''}</h2>
        <p>This short test checks your learning of the cooking vocabulary you practiced. Work quickly but accurately.</p>
        <ul>
          <li><b>4-choice picture match</b> (word → picture)</li>
          <li><b>Naming</b> (type the English word)</li>
          <li><b>Sound mapping</b> (listen and choose the meaning)</li>
          <li><b>Order of operations</b> (arrange the steps)</li>
        </ul>
        <p>Click <b>Begin</b> to start.</p>
      </div>
    `,
    choices: ['Begin']
  });
}

// --------------------------
// 4AFC receptive (word → picture)
// --------------------------
const AFC_ITEMS = build4AFC();
AFC_ITEMS.forEach((it, idx) => {
  const imgStrip = it.choices.map((c) => `
    <div style="display:inline-block;margin:8px">
      <img src="${c.img}" alt="${c.word}" style="height:140px;display:block;margin-bottom:6px;border:1px solid #ccc;padding:6px;border-radius:8px">
    </div>`).join('');
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style=\"text-align:center\"><h3>Which picture matches: <em>${it.word}</em>?</h3><div>${imgStrip}</div></div>`,
    choices: it.choices.map(c => c.word),
    data: { task: '4afc', word: it.word, correct_index: it.correct_index, item_index: idx, img_ver: CONFIG.img_ver },
    on_finish: (data) => { data.correct = (data.response === data.correct_index); }
  });
});

// --------------------------
// Productive naming (text input; swap in mic plugin if desired)
// --------------------------
const USE_MIC = false; // flip to true when you wire a recorder plugin
TARGETS.forEach((t, idx) => {
  if (!CONFIG.is_delayed) {
    if (!USE_MIC && typeof jsPsychSurveyText !== 'undefined') {
      timeline.push({
        type: jsPsychSurveyText,
        preamble: `<div style=\"text-align:center\"><img src=\"${imageSrc(t.base)}\" alt=\"${t.word}\" style=\"height:160px;border:1px solid #ccc;padding:6px;border-radius:8px\"></div>`,
        questions: [{ prompt: 'Type the English word for this item:', placeholder: 'e.g., bowl', required: true }],
        data: { task: 'naming', word: t.word, item_index: idx, img_ver: CONFIG.img_ver },
        on_finish: (data) => {
          try {
            const resp = JSON.parse(data.responses)['Q0']?.trim().toLowerCase();
            data.response_text = resp; data.correct = resp === t.word.toLowerCase();
          } catch (e) {}
        }
      });
    } else if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
      timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `<div style=\"text-align:center\"><img src=\"${imageSrc(t.base)}\" alt=\"${t.word}\" style=\"height:160px;border:1px solid #ccc;padding:6px;border-radius:8px\"><p><b>Speak the word</b>, then click Next.</p><p style=\"font-size:.9em;color:#666\">(Audio capture not wired in this demo.)</p></div>`,
        choices: ['Next'],
        data: { task: 'naming_mic_fallback', word: t.word, item_index: idx, img_ver: CONFIG.img_ver }
      });
    }
  }
});

// --------------------------
// Foley → meaning (novel tokens)
// --------------------------
const FOLEY_ITEMS = buildFoley();
FOLEY_ITEMS.forEach((it, idx) => {
  timeline.push({
    type: jsPsychAudioButtonResponse,
    stimulus: it.file,
    choices: it.labels,
    prompt: '<p>Listen, then choose the best meaning.</p>',
    trial_ends_after_audio: false,
    response_allowed_while_playing: false,
    data: { task: 'foley', correct_index: it.correct_index, file: it.file, item_index: idx, aud_ver: CONFIG.aud_ver },
    on_finish: (data) => { data.correct = (data.response === data.correct_index); }
  });
});

// --------------------------
// Order-of-operations
// --------------------------
if (!CONFIG.is_delayed) {
  const shuffled = shuffle(PROCEDURE_STEPS.map((s, i) => ({ s, i })));
  const form = shuffled.map((obj, k) => `
    <div style=\"margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:8px\">\n      <b>${obj.s}</b><br>\n      <label>Step number: <input type=\"number\" name=\"ord_${k}\" min=\"1\" max=\"${PROCEDURE_STEPS.length}\" required></label>\n    </div>`).join('');
  timeline.push({
    type: jsPsychSurveyHtmlForm,
    preamble: '<h3>Put the steps in order</h3><p>Assign a step number (1–5) to each action.</p>',
    html: `<div style=\"text-align:left;max-width:720px;margin:0 auto\">${form}</div>`,
    data: { task: 'procedure' },
    on_finish: (data) => {
      const resp = JSON.parse(data.responses || '{}');
      const chosenPositions = Object.keys(resp)
        .filter(k => k.startsWith('ord_'))
        .sort((a,b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(k => parseInt(resp[k], 10));
      data.positions = chosenPositions;
      const reordered = shuffled.map(o => o.s);
      const canonical = PROCEDURE_STEPS;
      let correctCount = 0;
      chosenPositions.forEach((pos, idx) => {
        const stepLabel = reordered[idx];
        const shouldBe = canonical.indexOf(stepLabel) + 1; // 1-based
        if (pos === shouldBe) correctCount++;
      });
      data.percent_correct = Math.round((correctCount / PROCEDURE_STEPS.length) * 100);
    }
  });
}

// --------------------------
// Goodbye
// --------------------------
if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style=\"max-width:720px;margin:0 auto;text-align:left\"><h3>All done!</h3><p>Thank you. Your responses have been recorded.</p><p style=\"font-size:.9em;color:#666\">Participant: <code>${CONFIG.participant_id}</code> · IMG set: <code>${CONFIG.img_ver}</code> · AUD set: <code>${CONFIG.aud_ver}</code></p>${CONFIG.save_local ? '<p>A JSON file has been prepared for download. If it did not auto-download, use the button below.</p>' : ''}</div>`,
    choices: CONFIG.save_local ? ['Download data again'] : ['Finish'],
    on_finish: () => { if (CONFIG.save_local) jsPsych.data.get().localSave('json', `post_${CONFIG.participant_id}.json`); }
  });
}

// --------------------------
// Start
// --------------------------
jsPsych.data.addProperties({
  pid: CONFIG.participant_id,
  cond: CONFIG.condition,
  phase: CONFIG.is_delayed ? 'post_delayed' : 'post_immediate',
  img_ver: CONFIG.img_ver,
  aud_ver: CONFIG.aud_ver,
  img_ext: CONFIG.img_ext,
  audio_ext: CONFIG.audio_ext,
});

jsPsych.run(timeline);

>>>>>>> 73b111e3f8e104138df942cd32089f31820d5300