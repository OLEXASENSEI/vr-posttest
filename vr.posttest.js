/**
 * vr.posttest.js — FINAL CODE FOR ASSET PATHS
 * Assumes:
 * 1. Image files are named like item_01.png (padded).
 * 2. Audio files are named like sound_1.mp3 (NOT padded).
 *    (Requires renaming spread_01.mp3 and spread_02.mp3 to spread_1.mp3 and spread_2.mp3)
 */
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

// Config defaults. Set PAD_AUD to '0' to request *_1.mp3
const CONFIG_DEFAULTS = {
  condition: getParam('cond') || 'VR',
  img_ver: ABto12(getParam('imgver') ?? getParam('iset') ?? 1, 1),
  aud_ver: ABto12(getParam('audver') ?? getParam('atok') ?? 1, 1),
  img_ext: (getParam('imgext') || 'png').replace('.', ''),
  audio_ext: (getParam('audioext') || 'mp3').replace('.', ''),
  pad2img: (getParam('pad2img') ?? '1') === '1',   // Forces _01.png
  pad2audio: (getParam('pad2audio') ?? '0') === '1', // Forces _1.mp3 (assuming '0' is the default for unpadded)
  save_local: (getParam('localsave') || '1') === '1',
};

const PATHS = { img: 'img/', audio: 'sounds/' };
// ... (rest of the constants like TARGETS, FOLEY, PROCEDURE_STEPS are unchanged) ...
const TARGETS = [
  { word: 'bowl', base: 'bowl' }, { word: 'egg', base: 'egg' }, { word: 'flour', base: 'flour' },
  { word: 'milk', base: 'milk' }, { word: 'sugar', base: 'sugar' }, { word: 'whisk', base: 'whisk' },
  { word: 'spatula', base: 'spatula' }, { word: 'pan', base: 'pan' }, { word: 'butter', base: 'butter' },
  { word: 'pancake', base: 'pancake' },
];

const FOLEY = [
  { label: 'sizzle (cooking on pan)', base: 'sizzle' }, { label: 'whisk (mixing in bowl)', base: 'whisk' },
  { label: 'pour (liquid into bowl)', base: 'pour' }, { label: 'crack (egg cracking)', base: 'crack' },
  { label: 'flip (spatula flip)', base: 'flip' }, { label: 'spread (butter on pan)', base: 'spread' },
];

const PROCEDURE_STEPS = [
  'crack egg', 'add flour & milk', 'whisk batter', 'pour on pan', 'flip & serve'
];
// ... (rest of the utility functions are unchanged) ...
function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }
function sample(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function imageSrc(base) {
  const suff = verSuffix(CONFIG_DEFAULTS.img_ver, CONFIG_DEFAULTS.pad2img);
  return `${PATHS.img}${base}_${suff}.${CONFIG_DEFAULTS.img_ext}`;
}
function audioSrc(base) {
  const suff = verSuffix(CONFIG_DEFAULTS.aud_ver, CONFIG_DEFAULTS.pad2audio);
  return `${PATHS.audio}${base}_${suff}.${CONFIG_DEFAULTS.audio_ext}`;
}

function preloadPaths(targets, foley) {
  const images = targets.map(t => imageSrc(t.base));
  const audio = foley.map(f => audioSrc(f.base));
  return { images, audio };
}

const have = (name) => typeof window[name] !== 'undefined';
const T = (name) => window[name];

// ... (runExperiment and wiring functions are unchanged) ...

function runExperiment({ delayed, pid }){
  // ... (unchanged logic: UI Cleanup, Trial Counts, Subsets, jsPsych Init) ...
  const pick = document.getElementById('picker'); if (pick) pick.style.display='none';
  const info = document.getElementById('explain'); if (info) info.style.display='none';
  const COUNTS = delayed ? { afc: 6, naming: 6, foley: 6, procedure: false } : { afc: TARGETS.length, naming: TARGETS.length, foley: FOLEY.length, procedure: true };
  const targetsAFC  = sample(TARGETS, COUNTS.afc);
  const targetsName = sample(TARGETS, COUNTS.naming);
  const foleyItems  = sample(FOLEY,   COUNTS.foley);

  if (!have('initJsPsych')) {
    console.error('jsPsych core (initJsPsych) is not loaded.');
    alert('Sorry—experiment core failed to load. Please refresh or contact the researcher.');
    return;
  }
  const jsPsych = T('initJsPsych')({
    show_progress_bar: true,
    on_finish: () => {
      if (CONFIG_DEFAULTS.save_local) {
        try { jsPsych.data.get().localSave('json', `post_${pid}.json`); } catch (e) {}
      }
    }
  });

  window.addEventListener('pointerdown', () => {
    try {
      const ctx = jsPsych?.pluginAPI?.getAudioContext?.();
      if (ctx && ctx.state !== 'running') ctx.resume();
    } catch {}
  }, { once: true });

  const timeline = [];
  const toPreload = preloadPaths(targetsAFC.concat(targetsName), foleyItems);
  
  // ... (All trial creation logic is unchanged) ...
  // (pre-load, welcome, 4afc, naming, foley, procedure, goodbye)
  
  // [1. Preload]
  if (have('jsPsychPreload')) { timeline.push({ type: T('jsPsychPreload'), images: toPreload.images, audio: toPreload.audio, message: '<p>Loading post-test…</p>' }); }
  
  // [2. Welcome]
  if (have('jsPsychHtmlButtonResponse')) {
    timeline.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="max-width:780px;margin:0 auto;text-align:left"><h2>VR Study — Post-Test ${delayed ? '(Delayed)' : '(Immediate)'}</h2><p>This short test checks your learning of the cooking vocabulary you practiced. Work quickly but accurately.</p><p>Click <b>Begin</b> to start.</p></div>`, choices: ['Begin'] });
  }

  // [3. 4AFC]
  if (have('jsPsychHtmlButtonResponse')) {
    targetsAFC.forEach((t, idx) => {
      const foils = sample(TARGETS.filter(x => x.word !== t.word), 3);
      const choices = shuffle([t, ...foils]).map(x => ({ word: x.word, img: imageSrc(x.base) }));
      const correct_index = choices.findIndex(c => c.word === t.word);
      const imgStrip = choices.map((c) => `<div style="display:inline-block;margin:8px"><img src="${c.img}" alt="${c.word}" style="height:140px;display:block;margin-bottom:6px;border:1px solid #ccc;padding:6px;border-radius:8px"></div>`).join('');
      timeline.push({ type: T('jsPsychHtmlButtonResponse'), stimulus: `<div style="text-align:center"><h3>Which picture matches: <em>${t.word}</em>?</h3><div>${imgStrip}</div></div>`, choices: choices.map(c => c.word), data: { task: '4afc', word: t.word, correct_index, item_index: idx, img_ver: CONFIG_DEFAULTS.img_ver }, on_finish: (data) => { data.correct = (data.response === correct_index); } });
    });
  }

  // [4. Naming]
  if (have('jsPsychSurveyText')) {
    targetsName.forEach((t, idx) => {
      timeline.push({
        type: T('jsPsychSurveyText'),
        preamble: `<div style="text-align:center"><img src="${imageSrc(t.base)}" alt="${t.word}" style="height:160px;border:1px solid #ccc;padding:6px;border-radius:8px"></div>`,
        questions: [{ prompt: 'Type the English word for this item:', placeholder: 'e.g., bowl', required: true }],
        data: { task: 'naming', word: t.word, item_index: idx, img_ver: CONFIG_DEFAULTS.img_ver },
        on_finish: (data) => { try { const resp = JSON.parse(data.responses)['Q0']?.trim().toLowerCase(); data.response_text = resp; data.correct = resp === t.word.toLowerCase(); } catch (e) {} }
      });
    });
  }

  // [5. Foley]
  if (have('jsPsychAudioButtonResponse')) {
    foleyItems.forEach((f, idx) => {
      const foils = sample(FOLEY.filter(x => x.base !== f.base), 3);
      const choices = shuffle([f.label, ...foils.map(x => x.label)]);
      const correct_index = choices.findIndex(label => label === f.label);
      timeline.push({ type: T('jsPsychAudioButtonResponse'), stimulus: audioSrc(f.base), choices: choices, prompt: '<p>Listen, then choose the best meaning.</p>', trial_ends_after_audio: false, response_allowed_while_playing: false, data: { task: 'foley', correct_index, file: audioSrc(f.base), item_index: idx, aud_ver: CONFIG_DEFAULTS.aud_ver }, on_finish: (data) => { data.correct = (data.response === correct_index); } });
    });
  }

  // [6. Procedure]
  if (COUNTS.procedure && have('jsPsychSurveyHtmlForm')) {
    const stepsWithIndex = PROCEDURE_STEPS.map((s, i) => ({ s, original_index: i }));
    const shuffled = shuffle(stepsWithIndex);
    const form = shuffled.map((obj, k) => `<div style="margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:8px"><b>${obj.s}</b><br><label>Step number: <input type="number" name="ord_${k}" min="1" max="${PROCEDURE_STEPS.length}" required style="width: 80px;"></label></div>`).join('');
    timeline.push({
      type: T('jsPsychSurveyHtmlForm'), preamble: '<h3>Put the steps in order</h3><p>Assign a step number (1–5) to each action.</p>', html: `<div style="text-align:left;max-width:720px;margin:0 auto">${form}</div>`, data: { task: 'procedure' },
      on_finish: (data) => {
        const resp = JSON.parse(data.responses || '{}');
        const chosenPositions = shuffled.map((obj, idx) => ({ label: obj.s, chosen_position: parseInt(resp[`ord_${idx}`], 10) })).filter(item => !isNaN(item.chosen_position));
        data.responses_list = chosenPositions;
        let correctCount = 0;
        chosenPositions.forEach(item => { const shouldBe = PROCEDURE_STEPS.indexOf(item.label) + 1; if (item.chosen_position === shouldBe) correctCount++; });
        data.percent_correct = Math.round((correctCount / PROCEDURE_STEPS.length) * 100);
      }
    });
  } else if (COUNTS.procedure) {
    console.warn('Missing @jspsych/plugin-survey-html-form; skipping procedure ordering.');
  }


  // [7. Goodbye]
  if (have('jsPsychHtmlButtonResponse')) {
    timeline.push({
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div style="max-width:720px;margin:0 auto;text-align:left"><h3>All done!</h3><p>Thank you. Your responses have been recorded.</p><p style="font-size:.9em;color:#666">Participant: <code>${pid}</code> · Test: <code>${delayed ? 'Delayed' : 'Immediate'}</code></p>${CONFIG_DEFAULTS.save_local ? '<p>If the data did not auto-download, use the button below.</p>' : ''}</div>`,
      choices: CONFIG_DEFAULTS.save_local ? ['Download data again'] : ['Finish'],
      on_finish: () => { if (CONFIG_DEFAULTS.save_local) jsPsych.data.get().localSave('json', `post_${pid}.json`); }
    });
  }

  // [Start]
  jsPsych.data.addProperties({
    pid: pid, cond: CONFIG_DEFAULTS.condition, phase: delayed ? 'post_delayed' : 'post_immediate',
    img_ver: CONFIG_DEFAULTS.img_ver, aud_ver: CONFIG_DEFAULTS.aud_ver,
  });
  jsPsych.run(timeline);
}

// --------------------------
// DOM Initialization (wire buttons)
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
  const pidInput = document.getElementById('pid');
  const getPid = () => pidInput ? (pidInput.value.trim() || `P_${Date.now()}`) : `P_${Date.now()}`;

  document.getElementById('btn-immediate')?.addEventListener('click', () => {
    runExperiment({ delayed: false, pid: getPid() });
  });

  document.getElementById('btn-delayed')?.addEventListener('click', () => {
    runExperiment({ delayed: true, pid: getPid() });
  });
});
