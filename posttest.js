<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>VR Post‑Test</title>
  <meta name="description" content="Immediate vs Delayed post-test"/>
  <link rel="icon" href="data:,">

  <!-- jsPsych CSS -->
  <link href="https://unpkg.com/jspsych@7.3.4/css/jspsych.css" rel="stylesheet">

  <!-- 1) jsPsych core (unpkg base package + defer) -->
  <script src="https://unpkg.com/jspsych@7.3.4" defer></script>

  <!-- 2) jsPsych plugins (unpkg base package + defer) -->
  <script src="https://unpkg.com/@jspsych/plugin-preload@1.1.3" defer></script>
  <script src="https://unpkg.com/@jspsych/plugin-html-button-response@1.1.3" defer></script>
  <script src="https://unpkg.com/@jspsych/plugin-survey-text@1.1.3" defer></script>
  
  <!-- **REMOVED** The problematic survey-html-form link is now GONE. -->
  
  <script src="https://unpkg.com/@jspsych/plugin-audio-button-response@1.1.3" defer></script>
  
  <!-- NEW PLUGINS REQUIRED FOR MIC/AUDIO TASKS -->
  <script src="https://unpkg.com/@jspsych/plugin-initialize-microphone@1.0.3" defer></script>
  <script src="https://unpkg.com/@jspsych/plugin-html-audio-response@1.0.3" defer></script>

  <style>
    /* ... (CSS is unchanged) ... */
    :root { --bg:#fafafa; --card:#fff; --line:#e5e5e5; --muted:#666; }
    body { background:var(--bg); font:16px/1.5 system-ui, sans-serif; margin:0; padding:0; }
    .wrap { max-width:760px; margin:10vh auto; background:var(--card); border:1px solid var(--line); border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.06); padding:24px; }
    h1 { margin:0 0 6px; font-size:24px; }
    .hint { color:var(--muted); font-size:13px; }
    .btn { display:inline-block; padding:12px 16px; margin:8px 8px 0 0; border:1px solid var(--line); border-radius:10px; background:#fff; cursor:pointer; font-size:14px; }
    .btn:hover { background:#f5f5f5; }
    .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin:10px 0 16px; }
    input[type=text] { padding:8px 10px; border:1px solid var(--line); border-radius:8px; width:160px; font-size:14px; }
    #jspsych-target { min-height: 50vh; }
  </style>
</head>
<body>
  <!-- Picker UI -->
  <div class="wrap" id="picker">
    <h1>VR Post‑Test</h1>
    <p class="hint">Pick <b>Immediate</b> or <b>Delayed</b>.</p>
    <div class="row">
      <label for="pid">Participant ID:</label>
      <input id="pid" type="text" value="S01"/>
    </div>
    <p>
      <button class="btn" id="btn-immediate">Start: Immediate</button>
      <button class="btn" id="btn-delayed">Start: Delayed</button>
    </p>
    <p class="hint">(Immediate: 4 tasks · Delayed: 3 tasks)</p>
  </div>

  <!-- Hidden div where jsPsych content will be rendered -->
  <div id="jspsych-target"></div>

  <!-- Explanation (optional) -->
  <div class="wrap" id="explain" style="display:none">
    <p>Study details…</p>
  </div>

  <noscript>
    <div class="wrap"><p>Please enable JavaScript to run this study.</p></div>
  </noscript>

  <!-- 3) Your post-test logic -->
  <script src="posttest.js" defer></script>

  <!-- 4) Wire the buttons last -->
  <script defer>
    document.addEventListener('DOMContentLoaded', () => {
        const getPid = () => document.getElementById('pid')?.value.trim() || `S_${Date.now()}`;

        document.getElementById('btn-immediate')?.addEventListener('click', () => {
            window.__START_POSTTEST(getPid(), false); 
        });
        document.getElementById('btn-delayed')?.addEventListener('click', () => {
            window.__START_POSTTEST(getPid(), true); 
        });
    });
  </script>
</body>
</html>
