/**
 * posttest.js — companion battery for OLEXASENSEI/vr-pretest
 *
 * Goals (immediate post):
 *  - Receptive form–meaning (4AFC) with alternate images
 *  - Productive naming (text input by default; optional mic hook)
 *  - Iconicity mapping with *novel* audio tokens (foley → meaning)
 *  - Procedural transfer (order-of-operations) — simple scoring
 *
 * Optional delayed (D+7): pass ?delayed=1 in the URL for the short version.
 *
 * Versioning & counterbalance:
 *  - Image set via ?iset=A|B (defaults to A)
 *  - Audio token set via ?atok=A|B (defaults to A)
 *  - Participant ID via ?pid=...
 *
 * jsPsych compatibility: v7 UMD globals (initJsPsych, jsPsychHtmlButtonResponse, etc.).
 * If you use v6, replace plugin class names with string keys (e.g., type: 'html-button-response').
 */

// --------------------------
// URL helpers & experiment cfg
// --------------------------
function getParam(k, fallback = null) {
  const u = new URLSearchParams(window.location.search);
  return u.get(k) ?? fallback;
}

const CONFIG = {
  participant_id: getParam('pid') || `P_${Date.now()}`,
  condition: getParam('cond') || 'VR',
  is_delayed: getParam('delayed') === '1',
  image_set: (getParam('iset') || 'A').toUpperCase(), // A|B
  audio_set: (getParam('atok') || 'A').toUpperCase(), // A|B
  save_local: (getParam('localsave') || '1') === '1',
};

// If you keep the same repo layout, these folders will exist already.
// Put alternate *post* assets in subfolders so you never reuse pretest tokens.
const PATHS = {
  img: `img/post_${CONFIG.image_set}/`, // e.g., img/post_A/bowl.png
  audio: `sounds/post_${CONFIG.audio_set}/`, // e.g., sounds/post_A/pour_01.mp3
};

// --------------------------
// Stimulus manifests (EDIT ME)
// --------------------------
// Target vocabulary (trained in VR). File names below are placeholders—
// replace them with the actual alternate images you add under img/post_A|B
const TARGETS = [
  { word: 'bowl', img: 'bowl.png' },
  { word: 'egg', img: 'egg.png' },
  { word: 'flour', img: 'flour.png' },
  { word: 'milk', img: 'milk.png' },
  { word: 'sugar', img: 'sugar.png' },
  { word: 'whisk', img: 'whisk.png' },
  { word: 'spatula', img: 'spatula.png' },
  { word: 'pan', img: 'pan.png' },
  { word: 'butter', img: 'butter.png' },
  { word: 'pancake', img: 'pancake.png' },
];

// Foley→meaning mapping with *novel* tokens per set.
// "label" is the meaning participants choose; audio files are placeholders.
const FOLEY = [
  { label: 'sizzle (cooking on pan)', file: 'sizzle_01.mp3' },
  { label: 'whisk (mixing in bowl)', file: 'whisk_01.mp3' },
  { label: 'pour (liquid into bowl)', file: 'pour_01.mp3' },
  { label: 'crack (egg cracking)', file: 'crack_01.mp3' },
  { label: 'flip (spatula flip)', file: 'flip_01.mp3' },
  { label: 'spread (butter on pan)', file: 'spread_01.mp3' },
];

// Order-of-operations steps. We evaluate percent-in-correct-position.
const PROCEDURE_STEPS = [
  'crack egg',
  'add flour & milk',
  'whisk batter',
  'pour on pan',
  'flip & serve',
];

// --------------------------
// Utility helpers
// --------------------------
function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }
function sample(arr, n) { return shuffle(arr).slice(0, n); }
function preloadPaths() {
  const images = TARGETS.map(t => PATHS.img + t.img);
  const audio = FOLEY.map(f => PATHS.audio + f.file);
  return { images, audio };
}

// Build 4AFC items: each target’s correct image + three foil images from other items
function build4AFC() {
  const items = [];
  TARGETS.forEach((t) => {
    const foils = sample(TARGETS.filter(x => x.word !== t.word), 3);
    const choices = shuffle([t, ...foils]).map(x => ({ word: x.word, img: PATHS.img + x.img }));
    const correct_index = choices.findIndex(c => c.word === t.word);
    items.push({
      word: t.word,
      choices,
      correct_index,
    });
  });
  return shuffle(items);
}

// Build Foley mapping trials: each audio token with 4 labels (correct + 3 foils)
function buildFoley() {
  const items = [];
  FOLEY.forEach((f) => {
    const foils = sample(FOLEY.filter(x => x.label !== f.label), 3);
    const labels = shuffle([f.label, ...foils.map(x => x.label)]);
    const correct_index = labels.findIndex(l => l === f.label);
    items.push({
      file: PATHS.audio + f.file,
      labels,
      correct_index,
    });
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
// Welcome / consent
// --------------------------
if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="max-width:780px;margin:0 auto;text-align:left">
        <h2>VR Study — Post-Test ${CONFIG.is_delayed ? '(Delayed)' : ''}</h2>
        <p>This short test checks your learning of the cooking vocabulary you practiced.
        Use your best guess—work quickly but accurately.</p>
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
  const btnHTML = it.choices.map((c,i) => `
    <div style="display:inline-block;margin:8px">
      <img src="${c.img}" alt="${c.word}" style="height:140px;display:block;margin-bottom:6px;border:1px solid #ccc;padding:6px;border-radius:8px">
    </div>`);
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="text-align:center">
      <h3>Which picture matches: <em>${it.word}</em>?</h3>
      <div>${btnHTML.join('')}</div>
    </div>`,
    choices: it.choices.map(c => c.word),
    data: {
      task: '4afc',
      word: it.word,
      correct_index: it.correct_index,
      item_index: idx,
      image_set: CONFIG.image_set,
    },
    on_finish: (data) => {
      data.correct = (data.response === data.correct_index);
    }
  });
});

// --------------------------
// Productive naming (type response; mic hook optional)
// --------------------------
// Default = text input (robust everywhere). If you have a mic plugin, set USE_MIC = true and
// replace the trial below with your recorder plugin of choice.
const USE_MIC = false; // set to true only if you have a working recorder plugin loaded

TARGETS.forEach((t, idx) => {
  if (!CONFIG.is_delayed) { // include in immediate; keep in delayed too if you want
    if (!USE_MIC && typeof jsPsychSurveyText !== 'undefined') {
      timeline.push({
        type: jsPsychSurveyText,
        preamble: `<div style="text-align:center"><img src="${PATHS.img + t.img}" alt="${t.word}" style="height:160px;border:1px solid #ccc;padding:6px;border-radius:8px"></div>`,
        questions: [{ prompt: 'Type the English word for this item:', placeholder: 'e.g., bowl', required: true }],
        data: { task: 'naming', word: t.word, item_index: idx, image_set: CONFIG.image_set },
        on_finish: (data) => {
          try {
            const resp = JSON.parse(data.responses)['Q0']?.trim().toLowerCase();
            data.response_text = resp;
            data.correct = resp === t.word.toLowerCase();
          } catch (e) {}
        }
      });
    } else {
      // Placeholder for a microphone-based item (implement with your recorder plugin)
      if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
        timeline.push({
          type: jsPsychHtmlButtonResponse,
          stimulus: `<div style="text-align:center">
            <img src="${PATHS.img + t.img}" alt="${t.word}" style="height:160px;border:1px solid #ccc;padding:6px;border-radius:8px"><br>
            <p><b>Speak the word</b> for this item, then click <i>Next</i>.</p>
            <p style="font-size:0.9em;color:#666">(Audio not recorded in this fallback demo.)</p>
          </div>`,
          choices: ['Next'],
          data: { task: 'naming_mic_fallback', word: t.word, item_index: idx, image_set: CONFIG.image_set }
        });
      }
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
    data: { task: 'foley', correct_index: it.correct_index, file: it.file, item_index: idx, audio_set: CONFIG.audio_set },
    on_finish: (data) => { data.correct = (data.response === data.correct_index); }
  });
});

// --------------------------
// Order-of-operations (simple numeric assignment)
// --------------------------
if (!CONFIG.is_delayed) {
  const shuffled = shuffle(PROCEDURE_STEPS.map((s, i) => ({ s, i })));
  const form = shuffled.map((obj, k) => `
    <div style="margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:8px">
      <b>${obj.s}</b><br>
      <label>Step number: <input type="number" name="ord_${k}" min="1" max="${PROCEDURE_STEPS.length}" required></label>
    </div>
  `).join('');
  timeline.push({
    type: jsPsychSurveyHtmlForm,
    preamble: '<h3>Put the steps in order</h3><p>Assign a step number (1–5) to each action.</p>',
    html: `<div style="text-align:left;max-width:720px;margin:0 auto">${form}</div>`,
    data: { task: 'procedure' },
    on_finish: (data) => {
      const resp = JSON.parse(data.responses || '{}');
      // Convert back to an array of chosen positions aligned to the shuffled list
      const chosenPositions = Object.keys(resp)
        .filter(k => k.startsWith('ord_'))
        .sort((a,b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(k => parseInt(resp[k], 10));
      data.positions = chosenPositions;
      // Score: percent of items placed in the exact canonical position
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
// Goodbye & save
// --------------------------
if (typeof jsPsychHtmlButtonResponse !== 'undefined') {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="max-width:720px;margin:0 auto;text-align:left">
      <h3>All done!</h3>
      <p>Thank you. Your responses have been recorded.</p>
      <p style="font-size:0.9em;color:#666">Participant: <code>${CONFIG.participant_id}</code> · Set: <code>${CONFIG.image_set}/${CONFIG.audio_set}</code></p>
      ${CONFIG.save_local ? '<p>A JSON file has been prepared for download. If it did not auto-download, use the button below.</p>' : ''}
    </div>`,
    choices: CONFIG.save_local ? ['Download data again'] : ['Finish'],
    on_finish: () => {
      if (CONFIG.save_local) {
        jsPsych.data.get().localSave('json', `post_${CONFIG.participant_id}.json`);
      }
    }
  });
}

// --------------------------
// Start
// --------------------------
jsPsych.data.addProperties({
  pid: CONFIG.participant_id,
  cond: CONFIG.condition,
  phase: CONFIG.is_delayed ? 'post_delayed' : 'post_immediate',
  iset: CONFIG.image_set,
  atok: CONFIG.audio_set,
});

jsPsych.run(timeline);
