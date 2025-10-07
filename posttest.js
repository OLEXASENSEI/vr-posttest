/**
 * posttest.js — jsPsych v7 post-test (FIXED)
 * - Naming/Recording, 4AFC, Foley, Custom Procedure Task
 * - Custom procedure task fixed to capture form inputs via JS/DOM manipulation.
 */

(function(){
  /* ---------- Helpers & config ---------- */
  // Use a random value for asset busting to prevent aggressive caching
  const ASSET_BUST = Math.floor(Math.random() * 100000);
  const asset = (p) => `${p.replace(/^(\.\/|\/)/,'')}${p.includes('?')?'&':'?'}v=${ASSET_BUST}`;

  const have = (name) => typeof window[name] !== 'undefined';
  const T = (name) => window[name];

  const PATHS = { img: 'img/', audio: 'sounds/' };
  const getParam = (k, fallback=null) => new URLSearchParams(location.search).get(k) ?? fallback;

  // Phase defaults to "post" on this page
  function namingPhase(){
    const p = getParam('phase','post');
    return (p === 'pre') ? 'pre' : 'post';
  }
  function currentPID(){
    return window.__POSTTEST_PID || 'unknown';
  }
  function modelPronAudioFor(target){
    // Optional model pronunciations (skip gracefully if missing)
    return `pron/${(target||'').toLowerCase()}.mp3`;
  }

  // From your original: version switches for assets (kept simple here)
  function verSuffix(v, pad2=true){ const n = parseInt(v,10)||1; return pad2? String(n).padStart(2,'0') : String(n); }
  function ABto12(v, def=1){ if(!v) return def; const s=String(v).toUpperCase(); return s==='A'?1:s==='B'?2:(parseInt(s,10)||def); }

  const CONFIG = {
    img_ver: ABto12(getParam('imgver') ?? getParam('iset') ?? 1, 1),
    aud_ver: ABto12(getParam('audver') ?? getParam('atok') ?? 1, 1),
    img_ext: (getParam('imgext') || 'png').replace('.',''),
    audio_ext: (getParam('audioext') || 'mp3').replace('.',''),
    pad2img: (getParam('pad2img') ?? '1') === '1',
    pad2audio: (getParam('pad2audio') ?? '0') === '1',
    save_local: (getParam('localsave') || '1') === '1',
  };

  function imageSrc(base){
    const suff = verSuffix(CONFIG.img_ver, CONFIG.pad2img);
    return `${PATHS.img}${base}_${suff}.${CONFIG.img_ext}`;
  }
  function audioSrc(base){
    const suff = verSuffix(CONFIG.aud_ver, CONFIG.pad2audio);
    return `${PATHS.audio}${base}_${suff}.${CONFIG.audio_ext}`;
  }

  const TARGETS = [
    { word:'bowl', base:'bowl' }, { word:'egg', base:'egg' }, { word:'flour', base:'flour' },
    { word:'milk', base:'milk' }, { word:'sugar', base:'sugar' }, { word:'whisk', base:'whisk' },
    { word:'spatula', base:'spatula' }, { word:'pan', base:'pan' }, { word:'butter', base:'butter' },
    { word:'pancake', base:'pancake' },
  ];

  const FOLEY = [
    { label:'sizzle (cooking on pan)', base:'sizzle' },
    { label:'whisk (mixing in bowl)',  base:'whisk'  },
    { label:'pour (liquid into bowl)', base:'pour'   },
    { label:'crack (egg cracking)',    base:'crack'  },
    { label:'flip (spatula flip)',     base:'flip'   },
    { label:'spread (butter)',         base:'spread' },
  ];

  const PROCEDURE_STEPS = ['crack egg','add flour & milk','whisk batter','pour on pan','flip & serve'];
  const PROC_CONSTRAINTS = [
    ['crack egg','whisk batter'],
    ['add flour & milk','whisk batter'],
    ['whisk batter','pour on pan'],
    ['pour on pan','flip & serve']
  ];

  function shuffle(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }
  function sample(arr,n){ return shuffle(arr).slice(0, Math.min(n, arr.length)); }

  /* ---------- Init jsPsych (Guarded and using provided global functions) ---------- */
  if (!have('initJsPsych')) {
    console.error('jsPsych core (initJsPsych) is not loaded. Cannot initialize experiment.');
    return;
  }
  
  const jsPsych = T('initJsPsych')({
    // Use the div ID for display
    display_element: document.getElementById('jspsych-target'), 
    use_webaudio: true,
    show_progress_bar: true,
    message_progress_bar: 'Progress',
    default_iti: 300,
    on_finish: () => {
      if (CONFIG.save_local) {
        try { jsPsych.data.get().localSave('json', `post_${currentPID()}.json`); } catch(e){}
      }
    }
  });

  // Unlock audio contexts on first user interaction (esp. iOS/Safari)
  window.addEventListener('pointerdown', () => {
    try {
      const ctx = jsPsych?.pluginAPI?.getAudioContext?.();
      if (ctx && ctx.state !== 'running') ctx.resume();
    } catch {}
  }, { once:true });

  /* ---------- Preload ---------- */
  const PRELOAD_AUDIO = [
    ...FOLEY.map(f => asset(audioSrc(f.base))),
    ...TARGETS.map(t => asset(modelPronAudioFor(t.word)))
  ];
  const PRELOAD_IMAGES = TARGETS.map(t => asset(imageSrc(t.base)));

  const preload = {
    type: T('jsPsychPreload'),
    audio: PRELOAD_AUDIO,
    images: PRELOAD_IMAGES,
    max_load_time: 30000,
    message: '<p>Loading post-test…</p>',
    on_finish: d => {
      const failed = (d.failed_audio||[]).concat(d.failed_images||[]);
      if (failed.length) console.warn('Preload failed:', failed);
    }
  };

  /* ---------- Trials ---------- */

  // Welcome
  const welcome = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `<div style="max-width:780px;margin:0 auto;text-align:left">
      <h2>VR Study — Post-Test</h2>
      <p>We’ll run a short test: picture choice, spoken naming, Foley matching, and recipe ordering.</p>
      <p>Click <b>Begin</b> to start.</p>
    </div>`,
    choices: ['Begin']
  };

  // 4AFC
  const afc_button_labels = ['Picture 1','Picture 2','Picture 3','Picture 4'];
  const afc_trials = [];
  const targetsAFC = sample(TARGETS, TARGETS.length);
  if (have('jsPsychHtmlButtonResponse')) {
    targetsAFC.forEach((t, idx) => {
      const foils = sample(TARGETS.filter(x => x.word !== t.word), 3);
      const choices = shuffle([t, ...foils]).map(x => ({ word:x.word, img:imageSrc(x.base) }));
      const correct_index = choices.findIndex(c => c.word === t.word);
      const strip = choices.map(c => `
        <div style="display:inline-block;margin:8px">
          <img src="${asset(c.img)}" alt="${c.word}" style="height:140px;display:block;margin-bottom:6px;border:1px solid #ccc;padding:6px;border-radius:8px">
        </div>`).join('');
      afc_trials.push({
        type: T('jsPsychHtmlButtonResponse'),
        stimulus: `<div style="text-align:center"><h3>Which picture matches: <em>${t.word}</em>?</h3><div>${strip}</div></div>`,
        choices: afc_button_labels,
        data: { task:'4afc', word:t.word, correct_index, item_index:idx, img_ver:CONFIG.img_ver },
        on_finish: (data) => {
          data.correct = (data.response === data.correct_index);
          data.response_label = afc_button_labels[data.response];
        }
      });
    });
  }

  // Spoken naming (model -> record)
  function naming_intro_block(total){
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<h2>Picture Naming / 絵の命名</h2>
        <p>For each picture: (1) optionally hear a model, (2) record your pronunciation (4s).</p>
        <p style="color:#666">Pictures: ${total}</p>`,
      choices: ['Begin']
    };
  }

  // --- Ensure jsPsychInitializeMicrophone is available ---
  const mic_request = have('jsPsychInitializeMicrophone') ? {
    type: T('jsPsychInitializeMicrophone'),
    data: { task:'mic_init' },
  } : null;

  // --- Ensure jsPsychHtmlAudioResponse is available ---
  const naming_mic_check = have('jsPsychHtmlAudioResponse') ? {
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: `<div style="max-width:640px;margin:0 auto;text-align:left">
      <h3>Microphone check / マイク確認</h3>
      <p>Say “test” for ~2 seconds, then play it back.</p>
    </div>`,
    recording_duration: 2000,
    show_done_button: true,
    allow_playback: true,
    accept_button_text: 'Sounds OK / 続行',
    data: { task:'mic_check' }
  } : null;

  const naming_prepare = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: () => {
      const img   = imageSrc(jsPsych.timelineVariable('base'));
      const tgt   = jsPsych.timelineVariable('word') || '';
      const imgHTML = `<img src="${asset(img)}" style="width:350px;border-radius:8px;" />`;
      return `
        <div style="text-align:center;">
          ${imgHTML}
          <div style="margin-top:12px;">
            <button id="play-model" class="jspsych-btn" style="margin-right:8px;">▶️ Model</button>
            <span id="model-status" style="font-size:13px;color:#666">Optional</span>
          </div>
          <p style="margin-top:16px;">When ready, click <b>Start recording</b> and say the English name.</p>
        </div>`;
    },
    choices: ['Start recording / 録音開始'],
    post_trial_gap: 150,
    data: () => ({ task:'picture_naming_prepare', target:jsPsych.timelineVariable('word'), image_base:jsPsych.timelineVariable('base') }),
    on_load: () => {
      const tgt = jsPsych.timelineVariable('word') || '';
      const model = modelPronAudioFor(tgt);
      const btn   = document.getElementById('play-model');
      const stat  = document.getElementById('model-status');
      let a = new Audio(); let ready = false;
      const onCan = () => { ready = true; stat.textContent = 'Ready'; };
      const onErr = () => { ready = false; stat.textContent = 'Not available'; btn.disabled = true; };
      a.preload = 'auto';
      a.addEventListener('canplaythrough', onCan);
      a.addEventListener('error', onErr);
      a.src = asset(model);
      btn?.addEventListener('click', () => { if(!ready) return; try { a.currentTime=0; a.play(); stat.textContent='Playing…'; } catch(e){} });
    }
  };

  const naming_record = {
    type: T('jsPsychHtmlAudioResponse'),
    stimulus: () => {
      const img = imageSrc(jsPsych.timelineVariable('base'));
      return `<div style="text-align:center;">
        <img src="${asset(img)}" style="width:350px;border-radius:8px;" />
        <p style="margin-top:16px; color:#d32f2f; font-weight:bold;">🔴 Recording… speak now!</p>
      </div>`;
    },
    recording_duration: 4000,
    show_done_button: false,
    allow_playback: false,
    data: () => ({
      task:'picture_naming_audio',
      target: jsPsych.timelineVariable('word'),
      image_base: jsPsych.timelineVariable('base'),
      phase: namingPhase(),
      pid_snapshot: currentPID()
    }),
    on_finish: (d) => {
      const pid   = d.pid_snapshot || currentPID();
      const tgt   = (d.target || 'unknown').toLowerCase();
      const idx   = typeof d.trial_index === 'number' ? String(d.trial_index) : 'x';
      const phase = d.phase || namingPhase();
      d.audio_filename = `${phase}_${pid}_${tgt}_${idx}.wav`;

      try {
        const blob = (d.response && d.response instanceof Blob) ? d.response
                  : (d.response?.recording && d.response.recording instanceof Blob) ? d.response.recording
                  : null;
        if (blob) d.audio_blob_url = URL.createObjectURL(blob);
      } catch(e){}
    }
  };

  // Foley (audio multiple-choice)
  const foley_intro = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `<h2>Sound Matching / 音のマッチング</h2>
      <p>Play the sound and choose what it represents.</p>`,
    choices: ['Begin']
  };
  const foley_trials = FOLEY.map((f, idx) => {
    const foils = sample(FOLEY.filter(x => x.base !== f.base), 3);
    const choices = shuffle([f.label, ...foils.map(x => x.label)]);
    const correct_index = choices.findIndex(l => l === f.label);
    return {
      type: T('jsPsychAudioButtonResponse'),
      stimulus: audioSrc(f.base),
      choices,
      prompt: '<p>Listen, then choose the best meaning.</p>',
      trial_ends_after_audio: false,
      response_allowed_while_playing: false,
      data: { task:'foley', file:audioSrc(f.base), correct_index, item_index:idx, aud_ver:CONFIG.aud_ver },
      on_finish: (d) => { d.correct = (d.response === correct_index); }
    };
  });

  // Procedure (partial-order scoring)
  const procedural_instructions = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: `<h3>Recipe Ordering</h3>
      <p>Number the actions 1–5. <b>Multiple valid orders</b> exist, but some steps must precede others (e.g., whisk before pour).</p>`,
    choices: ['OK']
  };

  // --- FIX: Custom procedure task to capture input values correctly ---
  const procedural_test = (() => {
    const stepsWithIndex = PROCEDURE_STEPS.map((s,i)=>({s, original_index:i}));
    const shuffled = shuffle(stepsWithIndex);
    const form = shuffled.map((obj, k) => `
      <div style="margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:8px" data-step-label="${obj.s}">
        <b>${obj.s}</b><br>
        <label>Step number: <input type="number" id="ord_${k}" min="1" max="${PROCEDURE_STEPS.length}" required style="width: 80px;"></label>
      </div>`).join('');
      
    return {
      type: T('jsPsychHtmlButtonResponse'),
      stimulus: `<div id="proc-form" style="text-align:left;max-width:720px;margin:0 auto">
        <h3>Assign a step number (1–5) to each action.</h3>${form}
      </div>`,
      choices: ['Submit / 送信'],
      data: { task:'procedure' },
      on_finish: (data) => {
        // Find the visible form and collect data manually
        const proc_form = document.getElementById('proc-form');
        const pos = {};
        
        // Use the shuffled array to map input values back to step labels
        shuffled.forEach((step_info, i) => {
            const input_element = document.getElementById(`ord_${i}`);
            const v = input_element ? parseInt(input_element.value) : null;
            pos[step_info.s] = Number.isFinite(v) ? v : null;
        });

        // Score constraints
        let tot=0, ok=0, violations=[];
        PROC_CONSTRAINTS.forEach(([a,b]) => {
          if (pos[a] !== null && pos[b] !== null) { 
            tot++; 
            if (pos[a] < pos[b]) ok++; 
            else violations.push(`${a} → ${b}`); 
          }
        });

        data.responses_positions   = pos;
        data.constraints_total     = tot;
        data.constraints_satisfied = ok;
        data.partial_order_score   = (tot>0) ? ok/tot : null;
        data.violations            = violations;
      }
    };
  })();


  // Goodbye
  const goodbye = {
    type: T('jsPsychHtmlButtonResponse'),
    stimulus: () => `<div style="max-width:720px;margin:0 auto;text-align:left">
      <h3>All done!</h3>
      <p>Thank you. Your responses have been recorded.</p>
      <p style="font-size:.9em;color:#666">Participant: <code>${currentPID()}</code> · Phase: <code>${namingPhase()}</code></p>
    </div>`,
    choices: ['Finish']
  };

  /* ---------- Timeline ---------- */
  const timeline = [];
  timeline.push(preload, welcome);

  // 4AFC
  timeline.push(...afc_trials);

  // Naming (mic init + intro + per-item)
  // Only push mic init/check if the plugins are available
  if (mic_request && naming_mic_check) {
      timeline.push(mic_request, naming_intro_block(TARGETS.length), naming_mic_check);
      timeline.push({
        timeline: [naming_prepare, naming_record],
        timeline_variables: TARGETS,
        randomize_order: false
      });
  } else {
      console.error("Microphone plugins not loaded. Skipping naming task.");
  }


  // Foley
  timeline.push(foley_intro, ...foley_trials);

  // Procedure
  timeline.push(procedural_instructions, procedural_test);

  // Goodbye
  timeline.push(goodbye);

  // public launcher called from HTML after PID entry
  window.__START_POSTTEST = () => {
    // Hide the picker UI
    document.getElementById('picker')?.style.display = 'none';
    document.getElementById('explain')?.style.display = 'none';

    // Create the target div if it doesn't exist (assuming you're using the old HTML)
    let target = document.getElementById('jspsych-target');
    if (!target) {
        target = document.createElement('div');
        target.id = 'jspsych-target';
        document.body.appendChild(target);
    }
    
    jsPsych.data.addProperties({ pid: currentPID(), phase:'post' });
    jsPsych.run(timeline);
  };
})();
