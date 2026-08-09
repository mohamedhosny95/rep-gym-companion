const sessions = {
  morning: {
    name: "Morning Activation", short: "AM", meta: "Sun–Thu · Home · 10–15 min", icon: "☀", accent: "#c9ff3d",
    description: "Light mobility and activation. RPE 3 throughout — arrive fresher, never fatigued.",
    exercises: [
      ex("Brisk Marching in Place", "3 min", "RPE 3", 0, "warm-up", "march", "Stand tall, arms relaxed at your sides.", "March in place, lifting knees toward hip height and swinging the arms naturally.", "Torso upright. Land softly on the balls of your feet.", "Leaning backward or stomping heavily."),
      ex("Cat-Cow", "1 × 8", "RPE 3", 0, "mobility", "catcow", "Hands and knees; wrists under shoulders, knees under hips.", "Inhale into Cow; exhale and round into Cat. One full cycle per breath.", "Move slowly with your breath.", "Forcing range or moving from the neck only."),
      ex("Hip Flexor Stretch", "30–45 sec / side", "RPE 3", 0, "mobility", "kneel", "Half-kneeling, back knee cushioned and front foot flat.", "Shift the hips forward until you feel the front of the back hip stretch.", "Stay tall; lightly squeeze the back-leg glute.", "Leaning the torso forward or bouncing."),
      ex("Glute Bridges", "1 × 12–15", "2 sec squeeze", 0, "activation", "floor", "Lie on your back, knees bent, feet flat and hip-width.", "Squeeze the glutes; lift until knees, hips, and shoulders align. Lower with control.", "Drive through heels and keep ribs down.", "Pushing through toes or overextending the low back."),
      ex("Bird-Dog", "1 × 6–8 / side", "RPE 3", 0, "core", "birddog", "Hands and knees, neutral spine, core gently braced.", "Extend one arm and the opposite leg, pause, then return with control.", "Keep hips level — imagine water balanced on your back.", "Arching the lower back or rushing."),
      ex("Plank", "1 × 30–45 sec", "RPE 3", 0, "core", "plank", "Forearms down, elbows under shoulders, body in one line.", "Hold while breathing normally.", "Squeeze glutes, brace abs, and keep neck neutral.", "Hips sagging or piking too high."),
      ex("Stomach Vacuum", "2 × 15–20 sec", "10 sec rest", 10, "core", "breathe", "Stand or use hands and knees.", "Exhale fully, draw belly button toward spine, hold while breathing shallowly.", "Think posture and bracing control.", "Holding your breath entirely. This is not a fat-loss drill.", 2),
      ex("Pelvic Floor (Kegel)", "3 × 10", "3–5 sec hold / release", 0, "pelvic health", "kegel", "Sit or lie in a comfortable position.", "Contract as if stopping urine mid-stream, hold, release fully, and breathe normally.", "Isolate the pelvic floor; nothing else visibly moves.", "Clenching glutes, abs, or thighs. Stop for pain or numbness.", 3),
      ex("Hand Grip", "1 × 10–15", "2 sec close / open", 0, "grip", "grip", "Hold a grip trainer or simply make a fist.", "Close fully, pause, then open fully.", "Use a controlled two-second tempo each way.", "Jerky, rushed reps.")
    ]
  },
  gym: {
    name: "Gym Session", short: "GYM", meta: "Sun / Tue / Thu · 45–50 min", icon: "↗", accent: "#ff8b3d",
    description: "Beginner full-body machines. RPE 7 means finish each set with 2–3 good reps in reserve.",
    exercises: [
      ex("Stationary Bike", "5 min", "Light resistance", 0, "warm-up", "bike", "Set the seat so your knee stays slightly bent at the bottom.", "Pedal easily for five minutes.", "Stay at conversational effort — this is preparation.", "Starting with high resistance or pace."),
      ex("Leg Press", "3 × 10–12", "RPE 7", 90, "squat", "legpress", "Feet shoulder-width on the platform; back flat on the pad.", "Lower under control toward 90° at the knees, then press without hard lockout.", "Drive through the whole foot.", "Knees caving in or bouncing at the bottom.", 3),
      ex("Back Extension", "3 × 10–12", "RPE 7", 90, "hinge", "hinge", "Hips on the pad, feet secured, body straight.", "Lower under control, then raise to a straight line — stop at neutral.", "Hinge from the hips, not the low back. Hip Thrust machine is an approved swap.", "Rounding and snapping up, or hyperextending.", 3),
      ex("Chest Press", "3 × 10–12", "RPE 7", 90, "horizontal push", "chestpress", "Adjust the seat so handles line up with mid-chest.", "Press until arms extend without locking; return with control.", "Keep shoulder blades back and down.", "Shrugging or excessively flaring elbows.", 3),
      ex("Seated Cable Row", "3 × 10–12", "RPE 7", 90, "horizontal pull", "row", "Sit tall, feet supported, knees slightly bent.", "Pull the handle to your torso, squeeze the shoulder blades, then control the return.", "Keep the chest up.", "Rounding or using momentum to yank.", 3),
      ex("Lat Pulldown", "3 × 10–12", "RPE 7", 90, "vertical pull", "pulldown", "Grip wider than shoulders; secure thighs under the pad.", "Pull to the upper chest, squeeze the lats, then return with control.", "Lead with elbows and use only a slight backward lean.", "Pulling behind the neck or swinging.", 3),
      ex("Cooldown Stretches", "4 stretches", "20–30 sec / side", 0, "cooldown", "stretch", "Move to open floor or a stable post.", "Quad stretch · Hamstring/calf stretch · Doorway chest stretch · Overhead lat stretch.", "Static holds, easy breathing, no bouncing.", "Forcing range or turning a stretch into pain.", 4)
    ]
  },
  cardio: {
    name: "Cardio Session", short: "CARDIO", meta: "Mon / Wed · 30–35 min", icon: "⌁", accent: "#7dc9ff",
    description: "Weight-bearing stamina work. Progress pace or incline only after the full main block feels easy.",
    exercises: [
      ex("Easy Warm-up Walk", "3–5 min", "Easy pace", 0, "warm-up", "walk", "Set the treadmill flat or at a very gentle incline.", "Walk easily and let your stride settle.", "Breathe comfortably; prepare, don't test yourself.", "Jumping straight to main pace."),
      ex("Incline Treadmill Walk", "20–25 min", "RPE 5–6 · 4–6% incline", 0, "main", "inclinewalk", "Start around 4–6% incline at a comfortable walking pace.", "Hold RPE 5–6: short sentences are possible, full conversation is not.", "Brace gently, swing arms naturally, and look forward.", "Overstriding or holding the rails. Progress incline or pace, not duration."),
      ex("Easy Cooldown + Stretch", "3–5 min", "Easy pace", 0, "cooldown", "stretch", "Reduce speed and incline gradually.", "Walk easily, then stretch anything that feels tight.", "Let breathing return toward normal.", "Stopping abruptly or forcing stretches.")
    ]
  }
};

function ex(name, prescription, intensity, rest, category, motion, setup, execution, cues, avoid, sets = 1) {
  return { name, prescription, intensity, rest, category, motion, setup, execution, cues, avoid, sets };
}

const anatomy = {
  march:       ["mobility", "500% 200%", "0% 0%", "0% 100%", "Hip flexors · Quads · Calves", "flip"],
  catcow:      ["mobility", "500% 200%", "25% 0%", "25% 100%", "Spinal erectors · Abdominals"],
  kneel:       ["mobility", "500% 200%", "50% 0%", "50% 100%", "Hip flexors"],
  floor:       ["mobility", "500% 200%", "75% 0%", "75% 100%", "Glutes · Hamstrings"],
  birddog:     ["mobility", "500% 200%", "100% 0%", "100% 100%", "Core · Glutes · Back"],
  plank:       ["core", "400% 200%", "0% 0%", "0% 100%", "Core · Glutes"],
  breathe:     ["core", "400% 200%", "33.333% 0%", "33.333% 100%", "Deep abdominal wall"],
  kegel:       ["core", "400% 200%", "66.667% 0%", "66.667% 100%", "Pelvic floor"],
  grip:        ["core", "400% 200%", "100% 0%", "100% 100%", "Forearm flexors · Hand"],
  bike:        ["gym", "400% 300%", "0% 0%", "33.333% 0%", "Quads · Glutes · Calves"],
  legpress:    ["gym", "400% 300%", "66.667% 0%", "100% 0%", "Quads · Glutes"],
  hinge:       ["gym", "400% 300%", "0% 50%", "33.333% 50%", "Spinal erectors · Glutes · Hamstrings"],
  chestpress:  ["gym", "400% 300%", "66.667% 50%", "100% 50%", "Chest · Front delts · Triceps"],
  row:         ["gym", "400% 300%", "0% 100%", "33.333% 100%", "Lats · Rhomboids · Biceps"],
  pulldown:    ["gym", "400% 300%", "66.667% 100%", "100% 100%", "Lats · Biceps"],
  walk:        ["cardio", "300% 200%", "0% 0%", "0% 100%", "Glutes · Quads · Calves"],
  inclinewalk: ["cardio", "300% 200%", "50% 0%", "50% 100%", "Glutes · Quads · Core"],
  stretch:     ["cardio", "300% 200%", "100% 0%", "100% 100%", "Lats · Obliques"]
};

const motionGuide = {
  march:["Lift · Switch","ارفع · بدّل",180], catcow:["Inhale: cow · Exhale: cat","شهيق: بقرة · زفير: قطة",0], kneel:["Ease forward · Hold","تقدم برفق · اثبت",45],
  floor:["Lift 1s · Hold 2s · Lower 2s","ارفع 1ث · اثبت 2ث · انزل 2ث",45], birddog:["Extend · Hold · Return","مد · اثبت · عد",60], plank:["Brace · Breathe normally","شد الجذع · تنفس طبيعياً",45],
  breathe:["Exhale · Draw in · Hold","زفير · اسحب للداخل · اثبت",20], kegel:["Contract 5s · Fully release 5s","شد 5ث · استرخِ 5ث",0], grip:["Close 2s · Open 2s","أغلق 2ث · افتح 2ث",0],
  bike:["Smooth pedal · Easy breath","دوران سلس · تنفس سهل",300], legpress:["Lower 2s · Press 1s","انزل 2ث · ادفع 1ث",0], hinge:["Lower 2s · Neutral 1s","انزل 2ث · محايد 1ث",0],
  chestpress:["Return 2s · Press 1s","عد 2ث · ادفع 1ث",0], row:["Reach 2s · Pull 1s","مد 2ث · اسحب 1ث",0], pulldown:["Rise 2s · Pull 1s","اصعد 2ث · اسحب 1ث",0],
  walk:["Easy stride · Natural arms","خطوة سهلة · ذراعان طبيعيان",300], inclinewalk:["Upright · Short sentences","جسم مستقيم · جمل قصيرة",1500], stretch:["Ease in · Hold · No bounce","ادخل برفق · اثبت · دون ارتداد",30]
};

const motionAtlasRows = { legpress:0, hinge:1, chestpress:2, row:3, pulldown:4, floor:5, birddog:6 };

function anatomyVisual(motion) {
  const [atlas,size,a,b,muscles,flip] = anatomy[motion] || anatomy.march;
  const ratios = { gym:"1 / 1", mobility:"3 / 5", core:"8 / 9", cardio:"1 / 1" };
  const u=REP_I18N[state.lang].ui, guide=motionGuide[motion]||motionGuide.march;
  if(state.viewMode==="side" && motion in motionAtlasRows){
    const row=motionAtlasRows[motion], y=(row/6*100).toFixed(3);
    return `<div class="anatomy-motion sprite-motion motion-${motion} ${state.paused?"is-paused":""} ${state.muscles?"":"muscles-off"}" style="--row:${y}%;--loop-speed:${3.6/state.speed}s">
      <i class="sprite-frame" aria-hidden="true"></i><span class="motion-path" aria-hidden="true"><i></i></span><span class="range-warning" aria-hidden="true"></span>
      <span class="muscle-callout"><b>${u.active}</b>${muscles}</span><span class="phase-pill"><i></i> 6 ${state.lang==="ar"?"إطارات":"KEY FRAMES"}</span>
      <span class="guide-callout">${guide[state.lang==="ar"?1:0]}</span>
    </div>`;
  }
  const atlasFile=`assets/${atlas}-anatomy${state.viewMode==="front"?"-front":""}-atlas.png`;
  return `<div class="anatomy-motion motion-${motion} ${flip?"flip-b":""} ${state.paused?"is-paused":""} ${state.muscles?"":"muscles-off"}" style="--atlas-size:${size};--cell-ratio:${ratios[atlas]};--loop-speed:${4/state.speed}s">
    <i class="anatomy-frame frame-a" style="background-image:url('${atlasFile}');background-position:${a}"></i><i class="anatomy-frame frame-b" style="background-image:url('${atlasFile}');background-position:${b}"></i>
    <span class="motion-path" aria-hidden="true"><i></i></span><span class="range-warning" aria-hidden="true"></span>
    <span class="muscle-callout"><b>${u.active}</b>${muscles}</span><span class="phase-pill"><i></i> ${u.startFinish}</span>
    <span class="guide-callout">${guide[state.lang==="ar"?1:0]}</span>
  </div>`;
}

const storageKey = "rep-gym-companion-v1";
const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
const state = {
  view: "home", session: saved.session || null, index: saved.index || 0,
  completed: saved.completed || {}, muted: saved.muted || false, lang:saved.lang||"en",
  speed:saved.speed||1, paused:saved.paused||false, muscles:saved.muscles!==false, viewMode:saved.viewMode||"side",
  logs:saved.logs||{}, swaps:saved.swaps||{}, history:saved.history||[], sessionStartedAt:saved.sessionStartedAt||null,
  reviews:saved.reviews||{}, fieldTest:saved.fieldTest||{}, voice:saved.voice!==false,
  syncQueue:saved.syncQueue||[], syncState:"idle",
  timer: null, exerciseTimer:null, sessionClock:null, touchX: null, wakeLock:null
};
const syncKeyStorage="rep-notion-pairing-key-v1";
const app = document.querySelector("#app");
const timerDock = document.querySelector("#timerDock");

function persist() {
  localStorage.setItem(storageKey, JSON.stringify({ version:3, session: state.session, index: state.index, completed: state.completed, muted: state.muted, checkin: saved.checkin || {}, lang:state.lang, speed:state.speed, paused:state.paused, muscles:state.muscles, viewMode:state.viewMode, logs:state.logs, swaps:state.swaps, history:state.history, sessionStartedAt:state.sessionStartedAt, reviews:state.reviews, fieldTest:state.fieldTest, voice:state.voice, syncQueue:state.syncQueue }));
}
function U(){return REP_I18N[state.lang].ui;}
function sessionText(id,s){const v=REP_I18N[state.lang].sessions[id];return {name:v?.[0]||s.name,meta:v?.[1]||s.meta,description:v?.[2]||s.description};}
function localizedItem(item){
  if(state.lang!=="ar") return item;
  const a=REP_I18N.ar.exercises[item.name]; if(!a)return item;
  const units=s=>String(s).replaceAll("min","دقيقة").replaceAll("sec","ثانية").replaceAll("side","جهة").replaceAll("rest","راحة").replaceAll("hold","ثبات").replaceAll("release","استرخاء").replace("Light resistance","مقاومة خفيفة").replace("Easy pace","سرعة سهلة").replace("squeeze","ضغط");
  return {...item,name:a[0],prescription:units(item.prescription),intensity:units(item.intensity),setup:a[1],execution:a[2],cues:a[3],avoid:a[4]};
}
function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function currentDay() { return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]; }
function todayPlan(day) {
  if (["Sunday","Tuesday","Thursday"].includes(day)) return state.lang==="ar"?"تنشيط + جيم":"Activation + Gym";
  if (["Monday","Wednesday"].includes(day)) return state.lang==="ar"?"تنشيط + كارديو":"Activation + Cardio";
  if (day === "Friday") return state.lang==="ar"?"استشفاء نشط":"Active recovery";
  return state.lang==="ar"?"استشفاء السبا":"Spa recovery";
}

function renderHome() {
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view = "home";
  const day = currentDay(),u=U();
  document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;
  const resume = state.session && sessions[state.session] && state.index < sessions[state.session].exercises.length;
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">${u.companion}</p>
      <h1>${u.hero1}<br><em>${u.hero2}</em></h1>
      <p>${u.heroSub}</p>
    </section>
    <div class="today-strip"><span>${state.lang==="ar"?({Sunday:"الأحد",Monday:"الاثنين",Tuesday:"الثلاثاء",Wednesday:"الأربعاء",Thursday:"الخميس",Friday:"الجمعة",Saturday:"السبت"}[day]):day}</span><strong>${todayPlan(day)}</strong></div>
    <section class="session-grid" aria-label="Choose a session">
      ${Object.entries(sessions).map(([id,s]) => sessionCard(id,s,resume && state.session===id)).join("")}
      <button class="session-card" data-recovery style="--card-accent:#d9b3ff">
        <span><small>${u.reference}</small><h2>${u.recovery}</h2></span><span class="session-icon">≈</span>
        <p>${u.recoveryDesc}</p><small>${u.openGuide}</small>
      </button>
      <button class="session-card" data-history style="--card-accent:#7dc9ff"><span><small>${u.reference}</small><h2>${u.history}</h2></span><span class="session-icon">↗</span><p>${u.historyDesc}</p><small>${u.openHistory}</small></button>
      <button class="session-card" data-review style="--card-accent:#ef6f55"><span><small>${state.lang==="ar"?"السلامة والجودة":"SAFETY & QUALITY"}</small><h2>${state.lang==="ar"?"المراجعة والاختبار":"Review & field test"}</h2></span><span class="session-icon">✓</span><p>${state.lang==="ar"?"اعتماد مختص، قائمة فحص الحركة، واختبار الاستخدام داخل الجيم.":"Professional sign-off, movement checklist, and real-gym usability test."}</p><small>${state.lang==="ar"?"افتح قائمة الفحص ←":"Open checklist →"}</small></button>
      <button class="session-card install-card" data-install style="--card-accent:#ffffff"><span><small>PWA</small><h2>${u.install}</h2></span><span class="session-icon">↓</span><p>${u.installDesc}</p><small>${u.installNow} →</small></button>
    </section>
    <section class="weekly">
      <div class="section-title"><h2>${u.weekly}</h2><span>${state.lang==="ar"?"الصباح + منتصفه":"AM + mid-morning"}</span></div>
      <div class="week-row">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="day ${day.startsWith(d)?"is-today":""}"><strong>${d}</strong><span>${["Sun","Tue","Thu"].includes(d)?"G":["Mon","Wed"].includes(d)?"C":d==="Fri"?"R":"S"}</span></div>`).join("")}</div>
    </section>`;
  document.querySelectorAll("[data-session]").forEach(button => button.addEventListener("click", () => startSession(button.dataset.session)));
  document.querySelector("[data-recovery]").addEventListener("click", renderRecovery);
  document.querySelector("[data-history]").addEventListener("click", renderHistory);
  document.querySelector("[data-review]").addEventListener("click", renderReview);
  document.querySelector("[data-install]").addEventListener("click", installApp);
}
function sessionCard(id, s, resume) {
  const u=U(),ls=sessionText(id,s);
  return `<button class="session-card ${resume?"resume-card":""}" data-session="${id}" style="--card-accent:${s.accent}">
    <span><small>${resume?`${u.resume} · ${state.index+1}/${s.exercises.length}`:s.short}</small><h2>${ls.name}</h2></span>
    <span class="session-icon">${s.icon}</span><p>${ls.meta}<br>${ls.description}</p><small>${resume?u.continue:`${s.exercises.length} ${u.steps}`}</small></button>`;
}
function startSession(id) {
  const continuing=state.session===id&&state.index>0&&state.index<sessions[id].exercises.length&&state.sessionStartedAt;
  if (state.session !== id || state.index >= sessions[id].exercises.length) state.index = 0;
  state.session = id;if(!continuing)state.sessionStartedAt=Date.now(); state.view = "player";document.body.classList.add("workout-mode");persist(); renderExercise();startSessionClock();
}

function currentItem(base){
  if(base.name!=="Back Extension"||!state.swaps.backExtension)return localizedItem(base);
  const swap={...base,name:"Hip Thrust Machine",motion:"floor",setup:"Shoulders against the machine pad, feet flat and hip-width.",execution:"Drive through the heels, lift the hips, squeeze the glutes, then lower with control.",cues:"Keep ribs down and finish with the glutes, not the lower back.",avoid:"Overarching the back or pushing through the toes."};
  return localizedItem(swap);
}
function isLoadExercise(item){return ["legpress","hinge","floor","chestpress","row","pulldown"].includes(item.motion)&&state.session==="gym";}
function exerciseId(base){return base.name==="Back Extension"?(state.swaps.backExtension?"Hip Thrust Machine":"Back Extension"):base.name;}
function normalizedLog(id,sets=3){
  const old=state.logs[id]||{};
  if(!Array.isArray(old.sets)) old.sets=Array.from({length:sets},(_,i)=>i===0&&old.current?{weight:old.current.weight||"",reps:old.current.reps||"",rpe:"",note:""}:{weight:"",reps:"",rpe:"",note:""});
  while(old.sets.length<sets)old.sets.push({weight:"",reps:"",rpe:"",note:""});
  old.previousSets=old.previousSets||(old.previous?[{weight:old.previous.weight||"",reps:old.previous.reps||"",rpe:"",note:""}]:[]);
  state.logs[id]=old;return old;
}
function setsFromLog(log){
  if(Array.isArray(log?.sets))return log.sets;
  if(log?.current)return [{...log.current,rpe:"",note:""}];
  return [];
}
function progressionAdvice(id){
  const recent=state.history.filter(h=>h.session==="gym"&&h.loads?.[id]).slice(0,3).map(h=>setsFromLog(h.loads[id])).filter(Boolean);
  const current=setsFromLog(state.logs[id]);const sample=current.some(s=>s.reps)?current:(recent[0]||[]);
  if(!sample.length)return state.lang==="ar"?"سجّل التكرارات وRPE للحصول على اقتراح تلقائي.":"Log reps and RPE to unlock an automatic recommendation.";
  const valid=sample.filter(s=>Number(s.reps)>0),avgRpe=valid.reduce((n,s)=>n+(Number(s.rpe)||7),0)/(valid.length||1),minReps=Math.min(...valid.map(s=>Number(s.reps)||0));
  const allTop=valid.length>=2&&valid.every(s=>Number(s.reps)>=12&&(Number(s.rpe)||7)<=7.5);
  const twoWins=allTop&&recent.slice(0,2).length===2&&recent.slice(0,2).every(a=>a.length>=2&&a.every(s=>Number(s.reps)>=12&&(Number(s.rpe)||7)<=7.5));
  if(avgRpe>=9||minReps<8)return state.lang==="ar"?"خفّض 5% أو ثبّت الوزن حتى تعود التقنية والتكرارات.":"Reduce about 5% or hold until form and reps recover.";
  if(allTop){const jump=["Leg Press","Back Extension","Hip Thrust Machine"].includes(id)?5:2.5;return state.lang==="ar"?`${twoWins?"تقدّم مؤكد:":"جاهز للتقدم:"} زد ${jump} كجم في الحصة القادمة.`:`${twoWins?"Progression confirmed:":"Ready to progress:"} add ${jump} kg next session.`;}
  return state.lang==="ar"?"ثبّت الوزن؛ ارفع جودة التكرارات أو أكمل 12 تكراراً عند RPE ≤ 7.5.":"Hold the load; improve rep quality or reach 12 reps at RPE ≤ 7.5.";
}
function progressionCode(id,sets){
  if(!sets?.length)return state.session==="gym"?"Hold":"Recovery";
  const valid=sets.filter(s=>Number(s.reps)>0),avg=valid.reduce((n,s)=>n+(Number(s.rpe)||7),0)/(valid.length||1),min=Math.min(...valid.map(s=>Number(s.reps)||0));
  if(avg>=9||min<8)return "Reduce";
  if(valid.length>=2&&valid.every(s=>Number(s.reps)>=12&&(Number(s.rpe)||7)<=7.5))return "Increase";
  return state.session==="gym"?"Hold":"Recovery";
}
function loadPanel(base,item){
  if(!isLoadExercise(item))return ""; const u=U(),id=exerciseId(base),log=normalizedLog(id,item.sets);
  const prev=log.previousSets?.map((s,i)=>`${i+1}: ${s.weight||"—"} kg × ${s.reps||"—"}`).join(" · ")||u.noPrevious;
  return `<section class="load-panel"><div class="set-log-head"><strong>${state.lang==="ar"?"سجل كل مجموعة":"Log every set"}</strong><span>RPE 1–10</span></div><div class="set-log-grid">
    ${Array.from({length:item.sets},(_,i)=>{const s=log.sets[i]||{};return `<div class="set-log-row"><b>${i+1}</b><label><span>${u.weight}</span><input data-log="weight" data-log-set="${i}" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(s.weight||"")}" placeholder="kg"></label><label><span>${u.reps}</span><input data-log="reps" data-log-set="${i}" type="number" min="0" step="1" inputmode="numeric" value="${esc(s.reps||"")}"></label><label><span>RPE</span><input data-log="rpe" data-log-set="${i}" type="number" min="1" max="10" step="0.5" inputmode="decimal" value="${esc(s.rpe||"")}"></label><label class="set-note"><span>${state.lang==="ar"?"ملاحظة":"Note"}</span><input data-log="note" data-log-set="${i}" value="${esc(s.note||"")}" maxlength="60" placeholder="${state.lang==="ar"?"اختياري":"optional"}"></label></div>`}).join("")}
  </div><p>${u.previousLog}: <strong>${prev}</strong></p><div class="progression-callout">${progressionAdvice(id)}</div></section>`;
}
function motionControls(){const u=U();return `<div class="motion-controls" aria-label="Animation controls"><button data-motion-action="play" aria-pressed="${state.paused}">${state.paused?"▶":"Ⅱ"}<span>${state.paused?u.play:u.pause}</span></button><button data-motion-action="speed"><b>${state.speed}×</b><span>${u.speed}</span></button><button data-motion-action="view"><b>◫</b><span>${state.viewMode==="front"?u.side:u.front}</span></button><button data-motion-action="muscles" aria-pressed="${state.muscles}"><b>◉</b><span>${u.muscles}</span></button></div>`;}

function renderExercise() {
  const session = sessions[state.session];
  if (!session) return renderHome();
  if (state.index >= session.exercises.length) return renderComplete();
  const base = session.exercises[state.index], item=currentItem(base),u=U(),ls=sessionText(state.session,session);
  const key = `${state.session}-${state.index}`;
  const done = state.completed[key] || [];
  app.innerHTML = `<section class="player" data-swipe>
    <div class="player-header">
      <button class="round-button" data-prev aria-label="Previous exercise" ${state.index===0?"disabled":""}>‹</button>
      <div class="player-progress"><strong>${ls.name}</strong><span>${state.index+1} ${u.of} ${session.exercises.length} · <b id="sessionElapsed">0:00</b></span></div>
      <button class="round-button" data-exit aria-label="Exit session">×</button>
    </div>
    <div class="progress-bar"><i style="width:${((state.index+1)/session.exercises.length)*100}%"></i></div>
    <article class="exercise-card">
      <div class="visual-wrap anatomy-wrap" role="img" aria-label="Animated anatomical demonstration of ${esc(item.name)}"><span class="visual-label">${esc(item.category)}</span>${anatomyVisual(item.motion)}<span class="motion-tempo">${u.anatomyLoop}</span></div>
      ${motionControls()}
      <div class="exercise-info"><div class="exercise-title-row"><h1>${esc(item.name)}</h1>${base.name==="Back Extension"?`<button class="swap-button" data-swap>${state.swaps.backExtension?u.swapBack:u.swapHip}</button>`:""}</div><div class="chips"><span class="chip primary">${esc(item.prescription)}</span><span class="chip">${esc(item.intensity)}</span>${item.rest?`<span class="chip">${item.rest}s ${u.rest}</span>`:""}</div></div>
      ${motionGuide[item.motion]?.[2]?`<button class="exercise-timer-button" data-exercise-timer>${u.startTimer} · ${formatClock(motionGuide[item.motion][2])}</button>`:""}
      ${loadPanel(base,item)}
      <div class="set-tracker" aria-label="Set checklist">${Array.from({length:item.sets},(_,i)=>`<button class="set-button ${done.includes(i)?"is-done":""}" data-set="${i}" aria-pressed="${done.includes(i)}">${done.includes(i)?`✓ ${u.done}`:item.sets===1?u.markDone:`${u.set} ${i+1}`}</button>`).join("")}</div>
      <details class="cue-details"><summary>${u.technique}</summary><div class="cue-body"><p><strong>${u.setup}:</strong> ${esc(item.setup)}</p><p><strong>${u.move}:</strong> ${esc(item.execution)}</p><p><strong>${u.cue}:</strong> ${esc(item.cues)}</p><p><strong>${u.avoid}:</strong> ${esc(item.avoid)}</p></div></details>
      <nav class="bottom-nav"><button class="nav-button" data-prev ${state.index===0?"disabled":""}>${state.lang==="ar"?"→":"←"} ${u.previous}</button><button class="nav-button primary" data-next>${state.index===session.exercises.length-1?u.finish:u.next}</button></nav>
    </article></section>`;
  document.querySelectorAll("[data-prev]").forEach(b => b.addEventListener("click", prev));
  document.querySelector("[data-next]").addEventListener("click", next);
  document.querySelector("[data-exit]").addEventListener("click", showExitConfirm);
  document.querySelectorAll("[data-set]").forEach(b => b.addEventListener("click", () => toggleSet(Number(b.dataset.set))));
  document.querySelectorAll("[data-motion-action]").forEach(b=>b.addEventListener("click",()=>motionAction(b.dataset.motionAction)));
  document.querySelector("[data-swap]")?.addEventListener("click",()=>{state.swaps.backExtension=!state.swaps.backExtension;persist();renderExercise();});
  document.querySelector("[data-exercise-timer]")?.addEventListener("click",()=>toggleExerciseTimer(item.motion));
  document.querySelectorAll("[data-log]").forEach(input=>input.addEventListener("input",()=>saveLog(base,item)));
  const swipe = document.querySelector("[data-swipe]");
  swipe.addEventListener("touchstart", e => state.touchX = e.changedTouches[0].clientX, {passive:true});
  swipe.addEventListener("touchend", e => { const dx=e.changedTouches[0].clientX-state.touchX; if(Math.abs(dx)>65) dx<0?next():prev(); }, {passive:true});
}
function motionAction(action){
  if(action==="play")state.paused=!state.paused;
  if(action==="speed")state.speed=state.speed===1?.5:1;
  if(action==="view")state.viewMode=state.viewMode==="side"?"front":"side";
  if(action==="muscles")state.muscles=!state.muscles;
  persist();renderExercise();
}
function formatClock(seconds){const m=Math.floor(seconds/60),s=String(seconds%60).padStart(2,"0");return `${m}:${s}`;}
function toggleExerciseTimer(motion){
  if(state.exerciseTimer){stopExerciseClock();return;}
  const total=motionGuide[motion]?.[2]||30,item=currentItem(sessions[state.session].exercises[state.index]),sided=["kneel","birddog","stretch"].includes(motion);
  state.exerciseTimer={remaining:total,total,paused:false,halfway:false,sided};
  const overlay=document.createElement("div");overlay.className="timed-mode";overlay.innerHTML=`<button class="timed-close" data-timed-close aria-label="Close">×</button><p>${esc(item.name)}</p><strong data-timed-value>${formatClock(total)}</strong><span data-timed-phase>${state.lang==="ar"?"ابدأ الحركة بتحكم":"MOVE WITH CONTROL"}</span><div class="timed-progress"><i data-timed-progress></i></div><div class="timed-actions"><button data-timed-pause>${U().pause}</button><button data-timed-skip>${U().skip}</button></div><label><input type="checkbox" data-voice ${state.voice?"checked":""}> ${state.lang==="ar"?"إرشادات صوتية":"Spoken cues"}</label>`;document.body.appendChild(overlay);
  document.querySelector("[data-timed-close]").onclick=stopExerciseClock;document.querySelector("[data-timed-skip]").onclick=finishExerciseTimer;document.querySelector("[data-timed-pause]").onclick=e=>{state.exerciseTimer.paused=!state.exerciseTimer.paused;e.currentTarget.textContent=state.exerciseTimer.paused?U().resume:U().pause;};document.querySelector("[data-voice]").onchange=e=>{state.voice=e.target.checked;persist();};
  speak(state.lang==="ar"?"ابدأ":"Start");updateExerciseTimer();state.exerciseTimer.interval=setInterval(()=>{const t=state.exerciseTimer;if(!t||t.paused)return;t.remaining--;updateExerciseTimer();if(!t.halfway&&t.remaining<=Math.ceil(t.total/2)){t.halfway=true;speak(t.sided?(state.lang==="ar"?"بدّل الجهة":"Switch sides"):(state.lang==="ar"?"منتصف الوقت":"Halfway"));if(navigator.vibrate)navigator.vibrate(100);}if(t.remaining<=3&&t.remaining>0)speak(String(t.remaining));if(t.remaining<=0)finishExerciseTimer();},1000);
}
function updateExerciseTimer(){const t=state.exerciseTimer;if(!t)return;document.querySelector("[data-timed-value]").textContent=formatClock(t.remaining);document.querySelector("[data-timed-progress]").style.width=`${Math.max(0,t.remaining/t.total*100)}%`;document.querySelector("[data-timed-phase]").textContent=t.halfway?(t.sided?(state.lang==="ar"?"الجهة الثانية":"SECOND SIDE"):(state.lang==="ar"?"النصف الثاني":"SECOND HALF")):(state.lang==="ar"?"ابدأ الحركة بتحكم":"MOVE WITH CONTROL");}
function speak(text){if(!state.voice||state.muted||!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=state.lang==="ar"?"ar-EG":"en-US";utterance.rate=.95;window.speechSynthesis.speak(utterance);}
function finishExerciseTimer(){if(!state.exerciseTimer)return;const key=`${state.session}-${state.index}`,item=sessions[state.session].exercises[state.index],done=state.completed[key]||[],nextSet=Array.from({length:item.sets},(_,i)=>i).find(i=>!done.includes(i));clearInterval(state.exerciseTimer.interval);state.exerciseTimer=null;document.querySelector(".timed-mode")?.remove();signalEnd();speak(state.lang==="ar"?"تم":"Complete");if(nextSet!==undefined)state.completed[key]=[...done,nextSet];persist();renderExercise();if((state.completed[key]||[]).length===item.sets)setTimeout(()=>{if(state.view==="player")next();},900);else if(item.rest)startTimer(item.rest,nextSet);}
function saveLog(base,item){
  const id=exerciseId(base),log=normalizedLog(id,item.sets);
  document.querySelectorAll("[data-log-set]").forEach(input=>{const i=Number(input.dataset.logSet);log.sets[i][input.dataset.log]=input.value;});persist();
}
function signalEnd(){
  if(navigator.vibrate)navigator.vibrate([180,80,180]);
  if(!state.muted){try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=740;g.gain.value=.12;o.start();o.stop(a.currentTime+.25);}catch{}}
}
function toggleSet(setIndex) {
  const key = `${state.session}-${state.index}`;
  const list = state.completed[key] || [];
  const already = list.includes(setIndex);
  state.completed[key] = already ? list.filter(i=>i!==setIndex) : [...list,setIndex];
  persist();
  const item=sessions[state.session].exercises[state.index];
  if (!already && item.rest) startTimer(item.rest, setIndex);
  renderExercise();
  if(!already&&!item.rest&&state.completed[key].length===item.sets)setTimeout(()=>{if(state.view==="player")next();},650);
}
function prev(){ stopExerciseClock();if(state.index>0){state.index--;persist();renderExercise();} }
function next(){ stopExerciseClock();const s=sessions[state.session];if(state.index===s.exercises.length-1){recordSession();if(state.session==="gym")promoteLogs();}state.index++;persist();renderExercise(); }
function stopExerciseClock(){if(state.exerciseTimer?.interval)clearInterval(state.exerciseTimer.interval);state.exerciseTimer=null;document.querySelector(".timed-mode")?.remove();window.speechSynthesis?.cancel();}
function promoteLogs(){Object.values(state.logs).forEach(log=>{if(log.sets?.some(s=>s.weight||s.reps))log.previousSets=log.sets.map(s=>({...s}));});}
function startSessionClock(){stopSessionClock();state.sessionClock=setInterval(updateSessionClock,1000);updateSessionClock();}
function stopSessionClock(){if(state.sessionClock)clearInterval(state.sessionClock);state.sessionClock=null;}
function updateSessionClock(){const el=document.querySelector("#sessionElapsed");if(el&&state.sessionStartedAt)el.textContent=formatClock(Math.floor((Date.now()-state.sessionStartedAt)/1000));}
function showExitConfirm(){
  if(document.querySelector(".exit-confirm"))return;const u=U(),box=document.createElement("div");box.className="exit-confirm";box.innerHTML=`<strong>${u.exitQuestion}</strong><button data-stay>${u.stay}</button><button class="danger" data-leave>${u.exit}</button>`;document.body.appendChild(box);box.querySelector("[data-stay]").onclick=()=>box.remove();box.querySelector("[data-leave]").onclick=()=>{box.remove();renderHome();};
}
function recordSession(){
  const sets=Object.entries(state.completed).filter(([k])=>k.startsWith(`${state.session}-`)).reduce((n,[,v])=>n+v.length,0);
  const record={id:Date.now(),date:new Date().toISOString(),session:state.session,duration:Math.max(0,Math.floor((Date.now()-(state.sessionStartedAt||Date.now()))/1000)),sets,loads:JSON.parse(JSON.stringify(state.logs)),entries:[]};
  const priorBest={};state.history.forEach(h=>Object.entries(h.loads||{}).forEach(([name,log])=>setsFromLog(log).forEach(s=>{priorBest[name]=Math.max(priorBest[name]||0,Number(s.weight)||0);}))); 
  sessions[state.session].exercises.forEach((base,index)=>{const completed=state.completed[`${state.session}-${index}`]||[],id=base.name==="Back Extension"&&state.swaps.backExtension?"Hip Thrust Machine":base.name,logged=setsFromLog(state.logs[id]);completed.forEach(setIndex=>{const set=logged[setIndex]||{},weight=Number(set.weight)||0;record.entries.push({entry:`${id} · Set ${setIndex+1}`,exercise:id,set:setIndex+1,weight:set.weight||"",reps:set.reps||"",rpe:set.rpe||"",note:set.note||"",duration:!set.reps&&!set.weight?(motionGuide[base.motion]?.[2]||""):"",rest:base.rest||"",progression:progressionCode(id,logged),personalBest:Boolean(weight&&weight>(priorBest[id]||0))});});});
  state.history.unshift(record);state.history=state.history.slice(0,60);queueWorkout(record);state.sessionStartedAt=null;
}

function queueWorkout(record){
  if(!record?.entries?.length)return;const typeMap={morning:"Morning Activation",gym:"Gym",cardio:"Cardio"};
  if(!state.syncQueue.some(item=>String(item.workout.id)===String(record.id)))state.syncQueue.push({workout:{id:String(record.id),date:record.date,type:typeMap[record.session]||"Recovery",duration:record.duration,entries:record.entries},attempts:0,error:""});
  persist();if(navigator.onLine&&localStorage.getItem(syncKeyStorage))setTimeout(syncPending,100);
}

async function syncPending(){
  const key=localStorage.getItem(syncKeyStorage);if(!key||state.syncState==="syncing"||!navigator.onLine)return;
  state.syncState="syncing";updateSyncPanel();
  for(const item of [...state.syncQueue]){
    try{const response=await fetch("/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":key},body:JSON.stringify({workout:item.workout})}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Sync failed (${response.status})`);state.syncQueue=state.syncQueue.filter(q=>String(q.workout.id)!==String(item.workout.id));persist();}
    catch(error){item.attempts=(item.attempts||0)+1;item.error=String(error.message||error).slice(0,180);state.syncState="failed";persist();updateSyncPanel();return;}
  }
  state.syncState="synced";persist();updateSyncPanel();
}
function syncStatusText(){const ar=state.lang==="ar",key=localStorage.getItem(syncKeyStorage),pending=state.syncQueue.length;if(!key)return ar?"غير مقترن":"Not paired";if(state.syncState==="syncing")return ar?"جارٍ الإرسال إلى Notion…":"Syncing to Notion…";if(state.syncState==="failed")return ar?`${pending} بانتظار إعادة المحاولة`:`${pending} waiting to retry`;if(pending)return ar?`${pending} حصة بانتظار المزامنة`:`${pending} workout${pending===1?"":"s"} pending`;return ar?"تمت المزامنة مع Notion":"Synced with Notion";}
function updateSyncPanel(){const status=document.querySelector("[data-sync-status]");if(status)status.textContent=syncStatusText();const button=document.querySelector("[data-sync-now]");if(button)button.disabled=state.syncState==="syncing";}
function savePairingKey(){const input=document.querySelector("[data-sync-key]"),key=input?.value.trim();if(!key)return;if(key.length<12){alert(state.lang==="ar"?"استخدم مفتاحاً من 12 حرفاً على الأقل.":"Use a pairing key with at least 12 characters.");return;}localStorage.setItem(syncKeyStorage,key);input.value="";state.syncState="idle";updateSyncPanel();syncPending();}
function forgetPairingKey(){localStorage.removeItem(syncKeyStorage);state.syncState="idle";updateSyncPanel();}

function renderHistory(){
  stopSessionClock();document.body.classList.remove("workout-mode");state.view="history";const u=U(),rows=state.history;
  const best={};rows.forEach(r=>Object.entries(r.loads||{}).forEach(([name,l])=>setsFromLog(l).forEach(s=>{const w=Number(s.weight)||0,reps=Number(s.reps)||0;if(!best[name]||w>best[name].weight||(w===best[name].weight&&reps>best[name].reps))best[name]={weight:w,reps};})));
  app.innerHTML=`<section class="recovery-head"><p class="eyebrow">${u.history}</p><h1>${state.lang==="ar"?"تقدمك، بوضوح.":"Progress, without noise."}</h1><p>${u.historyDesc}</p></section>
  <section class="notion-sync"><div class="notion-sync-head"><span class="notion-mark">N</span><div><strong>Notion</strong><small data-sync-status>${syncStatusText()}</small></div></div><div class="notion-sync-actions"><input data-sync-key type="password" autocomplete="new-password" placeholder="${state.lang==="ar"?"مفتاح الاقتران":"Pairing key"}" aria-label="${state.lang==="ar"?"مفتاح مزامنة Notion":"Notion sync pairing key"}"><button data-save-sync-key>${state.lang==="ar"?"اقتران":"Pair"}</button><button data-sync-now>${state.lang==="ar"?"زامن الآن":"Sync now"}</button><button class="quiet" data-forget-sync>${state.lang==="ar"?"نسيان المفتاح":"Forget key"}</button></div><p>${state.lang==="ar"?"تُحفظ الحصص دون إنترنت وتُرسل تلقائياً عند عودة الاتصال.":"Workouts queue offline and upload automatically when your connection returns."}</p></section>
  <section class="data-tools"><button data-export>${state.lang==="ar"?"تصدير نسخة JSON":"Export JSON backup"}</button><label>${state.lang==="ar"?"استيراد نسخة":"Import backup"}<input data-import type="file" accept="application/json,.json"></label><small>${state.lang==="ar"?"تُحفظ البيانات محلياً على جهازك فقط.":"Your data stays on this device unless you export it."}</small></section>
  ${rows.length?`<section class="history-summary"><div><strong>${rows.length}</strong><span>${state.lang==="ar"?"حصة":"sessions"}</span></div><div><strong>${Math.round(rows.reduce((n,r)=>n+r.duration,0)/60)}</strong><span>${state.lang==="ar"?"دقيقة":"minutes"}</span></div><div><strong>${rows.reduce((n,r)=>n+r.sets,0)}</strong><span>${state.lang==="ar"?"مجموعة":"sets"}</span></div></section><section class="history-list">${Object.entries(best).filter(([,b])=>b.weight).map(([name,b])=>`<article class="pb-card"><small>PERSONAL BEST</small><h2>${esc(state.lang==="ar"?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</h2><strong>${b.weight} kg × ${b.reps||"—"}</strong><span>${progressionAdvice(name)}</span></article>`).join("")}${rows.map(r=>{const details=Object.entries(r.loads||{}).map(([name,l])=>{const setText=setsFromLog(l).filter(s=>s.weight||s.reps).map((s,i)=>`${i+1}: ${s.weight||"—"}kg × ${s.reps||"—"}${s.rpe?` @${s.rpe}`:""}`).join(" · ");return setText?`<small><b>${esc(name)}</b> ${setText}</small>`:""}).join("");return `<article class="history-row"><span>${new Date(r.date).toLocaleDateString(state.lang==="ar"?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</span><div><strong>${sessionText(r.session,sessions[r.session]).name}</strong><small>${formatClock(r.duration)} · ${r.sets} ${state.lang==="ar"?"مجموعات":"sets"}</small>${details}</div></article>`}).join("")}</section>`:`<div class="empty-state">${u.noHistory}</div>`}`;
  document.querySelector("[data-export]").onclick=exportData;document.querySelector("[data-import]").onchange=importData;document.querySelector("[data-save-sync-key]").onclick=savePairingKey;document.querySelector("[data-sync-now]").onclick=syncPending;document.querySelector("[data-forget-sync]").onclick=forgetPairingKey;updateSyncPanel();
}

function exportData(){
  persist();const payload={app:"Rep Gym Companion",schema:2,exportedAt:new Date().toISOString(),data:JSON.parse(localStorage.getItem(storageKey)||"{}")};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`rep-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importData(event){
  try{const payload=JSON.parse(await event.target.files[0].text());if(payload.app!=="Rep Gym Companion"||![1,2].includes(payload.schema)||typeof payload.data!=="object")throw Error("invalid");
    if(!confirm(state.lang==="ar"?"سيستبدل هذا بيانات التطبيق الحالية. متابعة؟":"This will replace the current app data. Continue?"))return;
    localStorage.setItem(storageKey,JSON.stringify(payload.data));location.reload();
  }catch{alert(state.lang==="ar"?"ملف النسخة غير صالح أو تالف.":"That backup file is invalid or damaged.");event.target.value="";}
}

const reviewExercises=["Leg Press","Back Extension","Chest Press","Seated Cable Row","Lat Pulldown","Glute Bridges","Bird-Dog"];
const fieldChecks=[
  ["bright","Readable in bright gym lighting","واضح في إضاءة الجيم القوية"],["dim","Readable in dim lighting","واضح في الإضاءة الخافتة"],["hands","Usable with sweaty hands","سهل مع اليد المتعرقة"],["onehand","Core actions work one-handed","الوظائف الأساسية بيد واحدة"],["airplane","Full workout works in airplane mode","الحصة كاملة تعمل دون إنترنت"],["muted","Visual/haptic cues work while muted","الإشارات المرئية والاهتزاز تعمل مع كتم الصوت"],["resume","Resumes correctly after phone lock","يستأنف بعد قفل الهاتف"],["languages","English and Arabic checked","تم اختبار العربية والإنجليزية"],["small","No clipping on a small phone","لا يوجد قص على هاتف صغير"]
];
function renderReview(){
  state.view="review";document.body.classList.remove("workout-mode");const ar=state.lang==="ar",r=state.reviews,complete=reviewExercises.filter(x=>r[x]?.signed).length;
  app.innerHTML=`<section class="recovery-head"><p class="eyebrow">${ar?"السلامة والجودة":"SAFETY & QUALITY"}</p><h1>${ar?"المراجعة البشرية، موثّقة.":"Human review, documented."}</h1><p>${ar?"الرسومات والتعليمات تعليمية وليست تشخيصاً طبياً. الاعتماد أدناه يجب أن ينجزه مدرب معتمد أو أخصائي علاج طبيعي بعد الفحص.":"The visuals and cues are educational, not medical diagnosis. Sign-off below must be completed by a certified trainer or physiotherapist after inspection."}</p></section>
  <section class="review-status"><strong>${complete}/7</strong><div><b>${ar?"تم اعتماد الحركات":"movements signed off"}</b><span>${complete===7?(ar?"اكتملت المراجعة البشرية":"Human review complete"):(ar?"الاعتماد المهني ما زال معلقاً":"Professional sign-off pending")}</span></div></section>
  <section class="review-list">${reviewExercises.map(name=>{const x=r[name]||{};return `<details class="review-card" ${x.signed?"":"open"}><summary><span>${esc(ar?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</span><b>${x.signed?"✓":"○"}</b></summary><div><label><input type="checkbox" data-review-check="joints" data-review-name="${esc(name)}" ${x.joints?"checked":""}> ${ar?"مسار المفاصل ومدى الحركة صحيحان":"Joint path and range are accurate"}</label><label><input type="checkbox" data-review-check="muscles" data-review-name="${esc(name)}" ${x.muscles?"checked":""}> ${ar?"تظليل العضلات صحيح":"Muscle highlighting is accurate"}</label><label><input type="checkbox" data-review-check="cues" data-review-name="${esc(name)}" ${x.cues?"checked":""}> ${ar?"التعليمات والتحذيرات آمنة":"Cues and warnings are safe"}</label><input data-review-field="reviewer" data-review-name="${esc(name)}" value="${esc(x.reviewer||"")}" placeholder="${ar?"اسم المراجع":"Reviewer name"}"><input data-review-field="credential" data-review-name="${esc(name)}" value="${esc(x.credential||"")}" placeholder="${ar?"الاعتماد / رقم الترخيص":"Credential / licence number"}"><label class="signoff"><input type="checkbox" data-review-check="signed" data-review-name="${esc(name)}" ${x.signed?"checked":""}> ${ar?"أعتمد هذه الحركة بعد مراجعتها":"I sign off this movement after review"}</label></div></details>`}).join("")}</section>
  <section class="field-test"><h2>${ar?"اختبار داخل الجيم":"Real-gym field test"}</h2><p>${ar?"نفّذ هذا على الهاتف الفعلي أثناء حصة واحدة. لا تُعلّم بنداً إلا بعد تجربته.":"Run this on the actual phone during one workout. Check an item only after testing it."}</p>${fieldChecks.map(([id,en,arabic])=>`<label><input type="checkbox" data-field="${id}" ${state.fieldTest[id]?"checked":""}> ${ar?arabic:en}</label>`).join("")}<textarea data-field-notes placeholder="${ar?"المشكلات، الجهاز، الإضاءة، القفازات...":"Issues, phone model, lighting, gloves…"}">${esc(state.fieldTest.notes||"")}</textarea><input data-field-date type="date" value="${esc(state.fieldTest.date||"")}"></section>
  <section class="evidence-note"><strong>${ar?"مصادر السلامة":"Safety references"}</strong><p>${ar?"راجع الإرشادات العامة لدى ACSM وCDC، واطلب تقييماً طبياً عند الألم أو الأعراض غير المعتادة.":"Follow general ACSM and CDC guidance, and seek medical assessment for pain or unusual symptoms."}</p><a href="https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" target="_blank" rel="noopener">ACSM physical activity guidance ↗</a><a href="https://www.cdc.gov/physical-activity/php/about/index.html" target="_blank" rel="noopener">CDC physical activity basics ↗</a></section>
  <button class="nav-button primary review-export" data-review-export>${ar?"تصدير حزمة المراجعة":"Export review package"}</button>`;
  document.querySelectorAll("[data-review-check]").forEach(el=>el.onchange=()=>{const n=el.dataset.reviewName;r[n]=r[n]||{};r[n][el.dataset.reviewCheck]=el.checked;if(el.dataset.reviewCheck==="signed")r[n].date=new Date().toISOString();persist();renderReview();});
  document.querySelectorAll("[data-review-field]").forEach(el=>el.oninput=()=>{const n=el.dataset.reviewName;r[n]=r[n]||{};r[n][el.dataset.reviewField]=el.value;persist();});
  document.querySelectorAll("[data-field]").forEach(el=>el.onchange=()=>{state.fieldTest[el.dataset.field]=el.checked;persist();});
  document.querySelector("[data-field-notes]").oninput=e=>{state.fieldTest.notes=e.target.value;persist();};document.querySelector("[data-field-date]").onchange=e=>{state.fieldTest.date=e.target.value;persist();};document.querySelector("[data-review-export]").onclick=exportData;
}

function renderComplete() {
  stopSessionClock();document.body.classList.remove("workout-mode");
  const session = sessions[state.session],u=U(),ls=sessionText(state.session,session);
  app.innerHTML = `<section class="complete"><div><div class="complete-badge">✓</div><p class="eyebrow">${u.sessionComplete}</p><h1>${u.thatCounts}</h1><p>${ls.name} ${u.completeSub}</p><button class="nav-button primary" data-home>${u.backSessions}</button><button class="nav-button" data-reset>${u.reset}</button></div></section>`;
  document.querySelector("[data-home]").addEventListener("click", renderHome);
  document.querySelector("[data-reset]").addEventListener("click", () => { Object.keys(state.completed).filter(k=>k.startsWith(`${state.session}-`)).forEach(k=>delete state.completed[k]); state.index=0; persist(); renderExercise(); });
}

function renderRecovery() {
  state.view="recovery";
  if(state.lang==="ar")return renderRecoveryArabic();
  const check = saved.checkin || {};
  app.innerHTML = `<section class="recovery-head"><p class="eyebrow">Recovery system</p><h1>Adaptation happens here.</h1><p>Use the basics daily. Check in weekly. Pain is information, not a challenge.</p></section>
    <section class="recovery-grid">
      <article class="recovery-card"><span class="card-kicker">Every day</span><h2>Daily basics</h2><ul><li><strong>Sleep:</strong> 7 hours minimum. For 4:15 AM wake, aim for 9:15 PM bedtime.</li><li><strong>Hydration:</strong> At wake-up and through the morning, especially in Cairo heat.</li><li><strong>Breakfast:</strong> Protein + carbs right after the AM session.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Sun · Tue · Thu</span><h2>After lifting</h2><ul><li>Foam roll lower body + back in the evening, ~8 min.</li><li>Massage gun before sleep, targeted, ~6–8 min.</li><li>Skip routine icing; use ice only for actual joint pain.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Friday</span><h2>Active recovery</h2><ul><li>No gym and no morning circuit.</li><li>Optional light walking and 5–10 min gentle stretching.</li><li><strong>Legs up the wall:</strong> 5 min, breathe slowly.</li><li>Soreness should resolve, not accumulate.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">2-minute check-in</span><h2>Weekly signals</h2><form class="checkin" id="checkin"><label>Soreness<select name="soreness">${ratingOptions(check.soreness)}</select></label><label>Energy<select name="energy">${ratingOptions(check.energy)}</select></label><label class="wide">Average sleep<input name="sleep" type="number" min="0" max="12" step="0.5" value="${check.sleep||7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${check.pain?"checked":""}> Any pain (not soreness)</span></label></form><p class="check-result" id="checkResult"></p></article>
      <article class="recovery-card wide"><span class="card-kicker">Saturday · 45–55 min</span><h2>Steam → Sauna → Jacuzzi</h2><ol class="spa-list"><li><span>Shower — rinse</span><strong>2 min</strong></li><li><span>Steam room</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Sauna</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Jacuzzi</span><strong>15–20</strong></li><li><span>Cool shower + rehydrate</span><strong>2 min</strong></li></ol><p class="check-result">Water before and between every step. Exit immediately if dizzy, nauseous, or unwell. Skip if sick, dehydrated, or hungover.</p></article>
      <article class="recovery-card warning wide"><span class="card-kicker">Stop, don't push</span><h2>Real red flags</h2><ul><li><strong>Sharp or joint pain:</strong> stop that exercise.</li><li><strong>Soreness beyond 72 hours:</strong> back off volume.</li><li><strong>Persistent fatigue or declining sleep:</strong> address it before adding load.</li><li>Pain that persists for days or feels unlike normal soreness needs a doctor, not a training workaround.</li></ul></article>
      <article class="recovery-card wide"><span class="card-kicker">Bad-day fallback</span><h2>Something beats nothing.</h2><ul><li><strong>Non-negotiable:</strong> Kegels 3 × 10 + 3 min marching.</li><li>Cut cardio first, then reduce gym to Leg Press + Chest Press + Row.</li><li>Protect the morning circuit last.</li><li>Review the full program at week 8, or after 2+ lifts stall for 2+ sessions.</li></ul></article>
    </section>`;
  const form=document.querySelector("#checkin"); form.addEventListener("input",updateCheckin); updateCheckin();
}
function renderRecoveryArabic(){
  app.innerHTML=`<section class="recovery-head"><p class="eyebrow">نظام الاستشفاء</p><h1>هنا يحدث التطور.</h1><p>التزم بالأساسيات يومياً، وراجع حالتك أسبوعياً. الألم معلومة وليس تحدياً.</p></section><section class="recovery-grid">
  <article class="recovery-card"><span class="card-kicker">كل يوم</span><h2>الأساسيات</h2><ul><li><strong>النوم:</strong> 7 ساعات على الأقل؛ مع الاستيقاظ 4:15 ص استهدف 9:15 م.</li><li><strong>الماء:</strong> عند الاستيقاظ وطوال الصباح، خصوصاً مع حرارة القاهرة.</li><li><strong>الإفطار:</strong> بروتين وكربوهيدرات بعد تمرين الصباح.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الأحد · الثلاثاء · الخميس</span><h2>بعد الجيم</h2><ul><li>Foam roller للجسم السفلي والظهر مساءً، نحو 8 دقائق.</li><li>مسدس المساج قبل النوم، 6–8 دقائق.</li><li>لا تستخدم الثلج روتينياً؛ فقط لألم مفصل حقيقي.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الجمعة</span><h2>استشفاء نشط</h2><ul><li>لا جيم ولا دائرة صباحية.</li><li>مشي خفيف وإطالة 5–10 دقائق اختياريان.</li><li><strong>الرجلان على الحائط:</strong> 5 دقائق مع تنفس بطيء.</li><li>يجب أن يقل الإجهاد لا أن يتراكم.</li></ul></article>
  <article class="recovery-card warning"><span class="card-kicker">توقف ولا تضغط</span><h2>علامات الخطر</h2><ul><li>ألم حاد أو ألم مفصل: أوقف التمرين.</li><li>إجهاد عضلي أكثر من 72 ساعة: خفّض الحجم.</li><li>إرهاق مستمر أو نوم متراجع: عالجه قبل زيادة الحمل.</li><li>الألم المستمر لأيام يحتاج طبيباً.</li></ul></article>
  <article class="recovery-card wide"><span class="card-kicker">السبت · 45–55 دقيقة</span><h2>بخار ← ساونا ← جاكوزي</h2><ol class="spa-list"><li><span>دش سريع</span><strong>2 د</strong></li><li><span>غرفة البخار</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>ساونا</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>جاكوزي</span><strong>15–20</strong></li><li><span>دش بارد وترطيب</span><strong>2 د</strong></li></ol><p class="check-result">اشرب قبل البداية وبين كل خطوة. اخرج فوراً عند الدوخة أو الغثيان. لا تبدأ إذا كنت مريضاً أو جافاً.</p></article>
  <article class="recovery-card"><span class="card-kicker">مراجعة دقيقتين</span><h2>إشارات الأسبوع</h2><form class="checkin" id="checkin"><label>الإجهاد العضلي<select name="soreness">${ratingOptions(saved.checkin?.soreness)}</select></label><label>الطاقة<select name="energy">${ratingOptions(saved.checkin?.energy)}</select></label><label class="wide">متوسط النوم<input name="sleep" type="number" min="0" max="12" step="0.5" value="${saved.checkin?.sleep||7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${saved.checkin?.pain?"checked":""}> يوجد ألم غير الإجهاد العضلي</span></label></form><p class="check-result" id="checkResult"></p></article>
  <article class="recovery-card wide"><span class="card-kicker">الخطة المصغرة</span><h2>شيء أفضل من لا شيء.</h2><ul><li><strong>الحد الأدنى:</strong> كيجل 3 × 10 + مشي في المكان 3 دقائق.</li><li>اختصر الكارديو أولاً، ثم الجيم إلى Leg Press + Chest Press + Row.</li><li>احمِ دائرة الصباح أخيراً.</li><li>راجع البرنامج في الأسبوع الثامن.</li></ul></article></section>`;
  document.querySelector("#checkin").addEventListener("input",updateCheckin);updateCheckin();
}
function ratingOptions(selected){return [1,2,3,4,5].map(n=>`<option ${Number(selected||3)===n?"selected":""}>${n}</option>`).join("");}
function updateCheckin(){
  const form=new FormData(document.querySelector("#checkin")); const c={soreness:Number(form.get("soreness")),energy:Number(form.get("energy")),sleep:Number(form.get("sleep")),pain:form.get("pain")==="on"};
  const flags=(c.soreness>=4?1:0)+(c.energy<=2?1:0)+(c.sleep<7?1:0)+(c.pain?1:0);
  document.querySelector("#checkResult").textContent=state.lang==="ar"?(flags>=2?`${flags} علامات خطر — خذ يوماً خفيفاً إضافياً أو لا تزد الحمل.`:flags===1?"علامة خطر واحدة — راقبها وركز على الاستشفاء.":"لا توجد علامات خطر — استمر وتقدم كما هو مخطط."):(flags>=2?`${flags} red flags — take an extra light day or hold progression flat.`:flags===1?"1 red flag — keep an eye on it and prioritize recovery.":"No red flags — stay consistent and progress as planned.");
  const all=JSON.parse(localStorage.getItem(storageKey)||"{}"); all.checkin=c; localStorage.setItem(storageKey,JSON.stringify(all)); saved.checkin=c;
}

function startTimer(seconds, setIndex) {
  if (state.timer?.interval) clearInterval(state.timer.interval);
  state.timer={remaining:seconds,total:seconds,paused:false,set:setIndex}; timerDock.classList.remove("is-hidden");
  timerDock.querySelector("strong").textContent=U().restTitle;document.querySelector("#timerSkip").textContent=U().skip;document.querySelector("#timerPause").textContent=U().pause;
  updateTimer(); state.timer.interval=setInterval(()=>{if(!state.timer.paused){state.timer.remaining--;updateTimer();if(state.timer.remaining<=0)finishTimer();}},1000);
}
function updateTimer(){
  const t=state.timer;if(!t)return; const min=Math.floor(t.remaining/60),sec=String(t.remaining%60).padStart(2,"0");
  document.querySelector("#timerValue").textContent=`${min}:${sec}`; document.querySelector("#timerRing").style.setProperty("--progress",`${Math.max(0,t.remaining/t.total*100)}%`);
  document.querySelector("#timerNext").textContent=`${U().set} ${t.set+1} · ${U().breatheReset}`;
}
function finishTimer(){
  if(!state.timer)return;clearInterval(state.timer.interval);signalEnd();timerDock.classList.add("is-hidden");state.timer=null;
  const item=sessions[state.session]?.exercises[state.index],key=`${state.session}-${state.index}`,allDone=item&&(state.completed[key]||[]).length===item.sets;
  if(allDone)setTimeout(()=>{if(state.view==="player")next();},800);else document.querySelector(`.set-button:not(.is-done)`)?.classList.add("is-next");
}
document.querySelector("#timerSkip").addEventListener("click",finishTimer);
document.querySelector("#timerPause").addEventListener("click",()=>{if(!state.timer)return;state.timer.paused=!state.timer.paused;document.querySelector("#timerPause").textContent=state.timer.paused?U().resume:U().pause;});
document.querySelector("#timerAdd").addEventListener("click",()=>{if(!state.timer)return;state.timer.remaining+=15;state.timer.total+=15;updateTimer();});
document.querySelector("#homeButton").addEventListener("click",renderHome);
document.querySelector("#soundButton").addEventListener("click",e=>{state.muted=!state.muted;e.currentTarget.setAttribute("aria-pressed",state.muted);e.currentTarget.textContent=state.muted?"×":"◖";persist();});
document.querySelector("#soundButton").textContent=state.muted?"×":"◖";
document.querySelector("#langButton").addEventListener("click",()=>{state.lang=state.lang==="en"?"ar":"en";document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;document.querySelector("#langButton").textContent=U().language;persist();state.view==="recovery"?renderRecovery():state.view==="player"?renderExercise():state.view==="history"?renderHistory():state.view==="review"?renderReview():renderHome();network();});
document.querySelector("#langButton").textContent=U().language;
document.querySelector("#wakeButton").addEventListener("click",toggleWakeLock);
async function toggleWakeLock(){
  const button=document.querySelector("#wakeButton");
  if(state.wakeLock){await state.wakeLock.release();state.wakeLock=null;button.setAttribute("aria-pressed","false");button.classList.remove("is-active");return;}
  try{state.wakeLock=await navigator.wakeLock.request("screen");button.setAttribute("aria-pressed","true");button.classList.add("is-active");state.wakeLock.addEventListener("release",()=>{state.wakeLock=null;button.classList.remove("is-active");});}catch{button.title=state.lang==="ar"?"يتطلب HTTPS أو تثبيت التطبيق":"Requires HTTPS or installed app";}
}
document.addEventListener("visibilitychange",async()=>{if(document.visibilityState==="visible"&&document.querySelector("#wakeButton").classList.contains("is-active")&&!state.wakeLock)try{state.wakeLock=await navigator.wakeLock.request("screen");}catch{}});
let installPrompt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;});
async function installApp(){
  if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  const msg=state.lang==="ar"?"على iPhone: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية». على Android: افتح قائمة المتصفح ثم «تثبيت التطبيق».":"On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu, then Install app.";
  const box=document.createElement("div");box.className="install-help";box.innerHTML=`<button aria-label="Close">×</button><strong>${U().install}</strong><p>${msg}</p>`;document.body.appendChild(box);box.querySelector("button").onclick=()=>box.remove();
}
function network(){const el=document.querySelector("#networkStatus");el.classList.toggle("is-offline",!navigator.onLine);el.lastChild.textContent=` ${navigator.onLine?U().offlineReady:U().offlineMode}`;}
addEventListener("online",()=>{network();syncPending();});addEventListener("offline",network);network();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load",async()=>{const reg=await navigator.serviceWorker.register("./sw.js");reg.addEventListener("updatefound",()=>{const worker=reg.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller){const bar=document.createElement("div");bar.className="update-bar";bar.innerHTML=`<span>${U().updateReady}</span><button>${U().reload}</button>`;document.body.appendChild(bar);bar.querySelector("button").onclick=()=>location.reload();}});});});
renderHome();
if(navigator.onLine&&state.syncQueue.length&&localStorage.getItem(syncKeyStorage))setTimeout(syncPending,800);
