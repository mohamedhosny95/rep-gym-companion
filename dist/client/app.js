const errorLogKey="rep-error-log-v1";
function logClientError(source,message,stack){try{const log=JSON.parse(localStorage.getItem(errorLogKey)||"[]");log.push({time:new Date().toISOString(),source,message:String(message||"").slice(0,500),stack:String(stack||"").slice(0,1000)});localStorage.setItem(errorLogKey,JSON.stringify(log.slice(-25)));}catch{}}
addEventListener("error",e=>logClientError("error",e.message,e.error?.stack));
addEventListener("unhandledrejection",e=>logClientError("promise",e.reason?.message||String(e.reason),e.reason?.stack));

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
  },
  bad: {
    name: "Bad Day Floor", short: "MIN", meta: "Any day · Home · 5–7 min", icon: "↘", accent: "#d9b3ff",
    description: "The non-negotiable minimum. It protects consistency without pretending a hard day is a normal session.",
    exercises: [
      ex("Brisk Marching in Place", "3 min", "Easy", 0, "minimum", "march", "Stand tall and give yourself permission to keep this easy.", "March smoothly for three minutes.", "Finish feeling better than you started.", "Turning the minimum into a test."),
      ex("Pelvic Floor (Kegel)", "3 × 10", "3–5 sec hold / release", 0, "minimum", "kegel", "Sit or lie comfortably.", "Contract, hold, release fully, and breathe normally.", "Keep glutes, abs, and thighs relaxed.", "Pushing through pain or numbness.", 3)
    ]
  },
  gymLite: {
    name: "Reduced Gym", short: "LITE", meta: "Bad day · Gym · 25–30 min", icon: "↘", accent: "#ffb27a",
    description: "The guide-approved reduced session: one squat, one push, and one pull.",
    exercises: [
      ex("Stationary Bike", "5 min", "Light resistance", 0, "warm-up", "bike", "Set the seat so the knee stays slightly bent.", "Pedal easily.", "Conversational effort.", "Testing your fitness."),
      ex("Leg Press", "2 × 10", "RPE 6–7", 90, "squat", "legpress", "Feet shoulder-width; back supported.", "Lower under control, then press without locking.", "Leave at least 3 good reps in reserve.", "Grinding reps or knee collapse.", 2),
      ex("Chest Press", "2 × 10", "RPE 6–7", 90, "push", "chestpress", "Handles at mid-chest.", "Press and return under control.", "Shoulder blades stay back and down.", "Shrugging or grinding.", 2),
      ex("Seated Cable Row", "2 × 10", "RPE 6–7", 90, "pull", "row", "Sit tall with feet supported.", "Pull to the torso and control the return.", "Keep chest up.", "Using momentum.", 2)
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
  view: "home", activeTab:saved.activeTab||"train", session: saved.session || null, index: saved.index || 0,
  completed: saved.completed || {}, muted: saved.muted || false, lang:saved.lang||"en",
  speed:saved.speed||1, paused:saved.paused||false, muscles:saved.muscles!==false, viewMode:saved.viewMode||"side",
  logs:saved.logs||{}, swaps:saved.swaps||{}, history:saved.history||[], sessionStartedAt:saved.sessionStartedAt||null,
  reviews:saved.reviews||{}, fieldTest:saved.fieldTest||{}, voice:saved.voice!==false,
  syncQueue:saved.syncQueue||[], syncState:"idle", recoveryCheckins:saved.recoveryCheckins||[],
  daily:saved.daily||{nutrition:{},hygiene:{}}, cardioDraft:saved.cardioDraft||{}, programStart:saved.programStart||new Date().toISOString().slice(0,10),
  foodEntries:saved.foodEntries||[], savedMeals:saved.savedMeals||[], water:saved.water||{}, foodDraft:null, foodNote:saved.foodNote||"", foodMealType:saved.foodMealType||"", foodLogMethod:saved.foodLogMethod||"Ingredients", foodBusy:false, foodPendingPayload:null,
  pairBusy:false, pairMessage:"",
  timer: null, exerciseTimer:null, sessionClock:null, touchX: null, wakeLock:null
};
const syncKeyStorage="rep-notion-pairing-key-v1";
const app = document.querySelector("#app");
const timerDock = document.querySelector("#timerDock");

function persist() {
  localStorage.setItem(storageKey, JSON.stringify({ version:6, guideVersion:REP_HEALTH_GUIDE.version, activeTab:state.activeTab, session: state.session, index: state.index, completed: state.completed, muted: state.muted, checkin: saved.checkin || {}, lang:state.lang, speed:state.speed, paused:state.paused, muscles:state.muscles, viewMode:state.viewMode, logs:state.logs, swaps:state.swaps, history:state.history, sessionStartedAt:state.sessionStartedAt, reviews:state.reviews, fieldTest:state.fieldTest, voice:state.voice, syncQueue:state.syncQueue, recoveryCheckins:state.recoveryCheckins, daily:state.daily, cardioDraft:state.cardioDraft, programStart:state.programStart, foodEntries:state.foodEntries, savedMeals:state.savedMeals, water:state.water, foodNote:state.foodNote, foodMealType:state.foodMealType, foodLogMethod:state.foodLogMethod }));
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
function isoDay(){return new Date().toISOString().slice(0,10);}
function latestRecovery(){return state.recoveryCheckins[0]||null;}
function recoveryFlags(c){return c?(Number(c.soreness)>=4?1:0)+(Number(c.energy)<=2?1:0)+(Number(c.sleep)<REP_HEALTH_GUIDE.rules.minimumSleepHours?1:0)+(c.pain?1:0):0;}
function recoveryGate(){const c=latestRecovery();if(!c)return {flags:0,hold:false,stale:true};const age=(Date.now()-new Date(c.date).getTime())/86400000;const flags=recoveryFlags(c);return {flags,hold:age<=10&&flags>=REP_HEALTH_GUIDE.rules.redFlagThreshold,stale:age>10};}
function programStatus(){
  const week=Math.max(1,Math.floor((Date.now()-new Date(state.programStart).getTime())/604800000)+1),gym=state.history.filter(h=>h.session==="gym").slice(0,2),stalled=[];
  if(gym.length===2){const names=["Leg Press","Back Extension","Hip Thrust Machine","Chest Press","Seated Cable Row","Lat Pulldown"];for(const name of names){const score=h=>Math.max(0,...setsFromLog(h.loads?.[name]).map(s=>(Number(s.weight)||0)*(Number(s.reps)||0)));if(score(gym[0])&&score(gym[0])<=score(gym[1]))stalled.push(name);}}
  return {week,stalled,review:week>=REP_HEALTH_GUIDE.rules.reviewWeek||stalled.length>=2};
}
function healthStatusStrip(){const gate=recoveryGate(),program=programStatus(),ar=state.lang==="ar";let label=ar?"جاهز للتقدم":"Progress available",tone="good";if(gate.hold){label=ar?`${gate.flags} علامات خطر · ثبّت الحمل`:`${gate.flags} red flags · hold load`;tone="hold";}else if(program.review){label=ar?"موعد مراجعة البرنامج":"Program review due";tone="review";}return `<section class="health-status ${tone}"><div><small>${ar?"قرار اليوم":"TODAY'S GATE"}</small><strong>${label}</strong></div><span>${ar?`الأسبوع ${program.week}`:`Week ${program.week}`} · v${REP_HEALTH_GUIDE.version}</span></section>`;}
function updatePrimaryTabs(){document.querySelectorAll("[data-app-tab]").forEach(button=>{const active=button.dataset.appTab===state.activeTab;button.setAttribute("aria-current",active?"page":"false");const labels={train:state.lang==="ar"?"تمرين":"Train",food:state.lang==="ar"?"طعام":"Food",care:state.lang==="ar"?"عناية":"Care"};button.querySelector("span").textContent=labels[button.dataset.appTab];});}
function setPrimaryTab(tab){state.activeTab=tab;persist();updatePrimaryTabs();if(tab==="food")renderNutrition();else if(tab==="care")renderHygiene();else renderHome();}
function renderCareHub(){renderHygiene();}

function renderHome() {
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view = "home";state.activeTab="train";persist();updatePrimaryTabs();
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
    ${healthStatusStrip()}
    <section class="session-grid" aria-label="Choose a session">
      ${Object.entries(sessions).filter(([id])=>!["bad","gymLite"].includes(id)).map(([id,s]) => sessionCard(id,s,resume && state.session===id)).join("")}
    </section>
    <div class="section-title training-tools-title"><h2>${state.lang==="ar"?"أدوات التمرين":"Training tools"}</h2><span>${state.lang==="ar"?"الاستعداد · السجل · السلامة":"Readiness · history · safety"}</span></div>
    <section class="session-grid training-tools" aria-label="${state.lang==="ar"?"أدوات التمرين":"Training tools"}">
      <button class="session-card" data-recovery style="--card-accent:#d9b3ff"><span><small>${state.lang==="ar"?"الاستعداد والتقدم":"READINESS & PROGRESSION"}</small><h2>${state.lang==="ar"?"الاستشفاء":"Recovery"}</h2></span><span class="session-icon">≈</span><p>${state.lang==="ar"?"مراجعة أسبوعية، بوابة التقدم، مؤقتات الاستشفاء، وإشارات الخطر.":"Weekly check-in, progression gate, recovery timers, and red-flag guidance."}</p><small>${state.lang==="ar"?"افتح نظام الاستشفاء ←":"Open recovery system →"}</small></button>
      <button class="session-card" data-history style="--card-accent:#7dc9ff"><span><small>${u.reference}</small><h2>${u.history}</h2></span><span class="session-icon">↗</span><p>${u.historyDesc}</p><small>${u.openHistory}</small></button>
      <button class="session-card bad-day-card" data-bad-day style="--card-accent:#d9b3ff"><span><small>${state.lang==="ar"?"خطة اليوم الصعب":"BAD DAY MODE"}</small><h2>${state.lang==="ar"?"شيء أفضل من لا شيء":"Something beats nothing"}</h2></span><span class="session-icon">↘</span><p>${state.lang==="ar"?"الحد الأدنى أو جيم مختصر، دون تغيير خطتك الأصلية.":"Run the minimum or a reduced gym without changing the normal plan."}</p><small>${state.lang==="ar"?"اختر الخطة ←":"Choose fallback →"}</small></button>
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
  document.querySelector("[data-bad-day]").addEventListener("click", renderBadDay);
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
  state.activeTab="train";updatePrimaryTabs();
  const continuing=state.session===id&&state.index>0&&state.index<sessions[id].exercises.length&&state.sessionStartedAt;
  if (state.session !== id || state.index >= sessions[id].exercises.length) state.index = 0;
  state.session = id;if(!continuing)state.sessionStartedAt=Date.now(); state.view = "player";document.body.classList.add("workout-mode");persist(); renderExercise();startSessionClock();
}

function currentItem(base){
  if(base.name!=="Back Extension"||!state.swaps.backExtension)return localizedItem(base);
  const swap={...base,name:"Hip Thrust Machine",motion:"floor",setup:"Shoulders against the machine pad, feet flat and hip-width.",execution:"Drive through the heels, lift the hips, squeeze the glutes, then lower with control.",cues:"Keep ribs down and finish with the glutes, not the lower back.",avoid:"Overarching the back or pushing through the toes."};
  return localizedItem(swap);
}
function isLoadExercise(item){return ["legpress","hinge","floor","chestpress","row","pulldown"].includes(item.motion)&&["gym","gymLite"].includes(state.session);}
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
  const gate=recoveryGate();if(gate.hold)return state.lang==="ar"?`${gate.flags} علامات استشفاء حمراء: ثبّت الحمل وخذ يوماً خفيفاً إضافياً.`:`${gate.flags} recovery red flags: hold the load and take an extra light day.`;
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
function cardioPanel(item){
  if(state.session!=="cardio"||item.motion!=="inclinewalk")return "";const d=state.cardioDraft,advice=cardioAdvice();
  return `<section class="load-panel cardio-panel"><div class="set-log-head"><strong>${state.lang==="ar"?"سجل الكارديو":"Cardio log"}</strong><span>${state.lang==="ar"?"التقدم بعد 3–4 أسابيع":"3–4 week gate"}</span></div><div class="metric-grid"><label><span>${state.lang==="ar"?"الدقائق":"Minutes"}</span><input data-cardio="minutes" type="number" min="0" max="60" value="${esc(d.minutes||25)}"></label><label><span>RPE</span><input data-cardio="rpe" type="number" min="1" max="10" step="0.5" value="${esc(d.rpe||6)}"></label><label><span>${state.lang==="ar"?"الميل %":"Incline %"}</span><input data-cardio="incline" type="number" min="0" max="20" step="0.5" value="${esc(d.incline||5)}"></label><label><span>${state.lang==="ar"?"السرعة":"Pace km/h"}</span><input data-cardio="pace" type="number" min="0" max="15" step="0.1" value="${esc(d.pace||"")}"></label></div><div class="progression-callout">${advice}</div></section>`;
}
function cardioAdvice(){const recent=state.history.filter(h=>h.session==="cardio"&&h.cardio).slice(0,6),easy=recent.filter(h=>Number(h.cardio.minutes)>=25&&Number(h.cardio.rpe)<=6);if(easy.length<3)return state.lang==="ar"?`ثبّت الإعدادات: ${easy.length}/3 حصص كاملة وسهلة.`:`Hold settings: ${easy.length}/3 full, easy sessions.`;const span=(new Date(easy[0].date)-new Date(easy[easy.length-1].date))/86400000;if(span<21)return state.lang==="ar"?"الأداء جيد، لكن أكمل 3 أسابيع قبل زيادة الميل أو السرعة.":"Performance is good; complete three weeks before raising incline or pace.";return state.lang==="ar"?"جاهز: زد الميل أو السرعة قليلاً، وليس المدة.":"Ready: raise incline or pace slightly, not duration.";}
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
      ${cardioPanel(item)}
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
  document.querySelectorAll("[data-cardio]").forEach(input=>input.addEventListener("input",()=>{state.cardioDraft[input.dataset.cardio]=input.value;persist();document.querySelector(".cardio-panel .progression-callout").textContent=cardioAdvice();}));
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
  const record={id:Date.now(),date:new Date().toISOString(),session:state.session,duration:Math.max(0,Math.floor((Date.now()-(state.sessionStartedAt||Date.now()))/1000)),sets,loads:JSON.parse(JSON.stringify(state.logs)),entries:[],cardio:state.session==="cardio"?JSON.parse(JSON.stringify(state.cardioDraft)):null};
  const priorBest={};state.history.forEach(h=>Object.entries(h.loads||{}).forEach(([name,log])=>setsFromLog(log).forEach(s=>{priorBest[name]=Math.max(priorBest[name]||0,Number(s.weight)||0);}))); 
  sessions[state.session].exercises.forEach((base,index)=>{const completed=state.completed[`${state.session}-${index}`]||[],id=base.name==="Back Extension"&&state.swaps.backExtension?"Hip Thrust Machine":base.name,logged=setsFromLog(state.logs[id]);completed.forEach(setIndex=>{const set=logged[setIndex]||{},weight=Number(set.weight)||0;record.entries.push({entry:`${id} · Set ${setIndex+1}`,exercise:id,set:setIndex+1,weight:set.weight||"",reps:set.reps||"",rpe:set.rpe||"",note:set.note||"",duration:!set.reps&&!set.weight?(motionGuide[base.motion]?.[2]||""):"",rest:base.rest||"",progression:progressionCode(id,logged),personalBest:Boolean(weight&&weight>(priorBest[id]||0))});});});
  if(record.cardio){const main=record.entries.find(e=>e.exercise==="Incline Treadmill Walk");if(main){main.duration=Number(record.cardio.minutes||0)*60;main.rpe=record.cardio.rpe||"";main.note=`Incline ${record.cardio.incline||"—"}% · Pace ${record.cardio.pace||"—"} km/h`;main.progression=cardioAdvice().startsWith("Ready")?"Increase":"Hold";}}
  state.history.unshift(record);state.history=state.history.slice(0,60);queueWorkout(record);state.sessionStartedAt=null;
}

function queueWorkout(record){
  if(!record?.entries?.length)return;const typeMap={morning:"Morning Activation",gym:"Gym",cardio:"Cardio",bad:"Bad Day Floor",gymLite:"Reduced Gym"};
  const id=`workout-${record.id}`;if(!state.syncQueue.some(item=>String(item.id||`workout-${item.workout?.id}`)===id))state.syncQueue.push({id,kind:"workout",workout:{id:String(record.id),date:record.date,type:typeMap[record.session]||"Recovery",duration:record.duration,entries:record.entries},attempts:0,error:""});
  persist();if(navigator.onLine&&localStorage.getItem(syncKeyStorage))setTimeout(syncPending,100);
}
function queueHealth(kind,payload){const id=`${kind}-${kind==="food"?(payload.id||Date.now()):payload.date}`;state.syncQueue=state.syncQueue.filter(item=>String(item.id)!==id);state.syncQueue.push({id,kind,payload,attempts:0,error:""});persist();if(navigator.onLine&&localStorage.getItem(syncKeyStorage))setTimeout(syncPending,100);}

async function syncPending(){
  const key=localStorage.getItem(syncKeyStorage);if(!key||state.syncState==="syncing"||!navigator.onLine)return;
  state.syncState="syncing";updateSyncPanel();
  for(const item of [...state.syncQueue]){
    try{const legacy=item.workout&&!item.kind,body=(legacy||item.kind==="workout")?{workout:item.workout}:{kind:item.kind,payload:item.payload};const response=await fetch("/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":key},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=Error(data.error||`Sync failed (${response.status})`);error.auth=response.status===401;throw error;}const id=item.id||`workout-${item.workout?.id}`;state.syncQueue=state.syncQueue.filter(q=>(q.id||`workout-${q.workout?.id}`)!==id);persist();}
    catch(error){item.attempts=(item.attempts||0)+1;item.error=String(error.message||error).slice(0,180);if(error.auth){localStorage.removeItem(syncKeyStorage);state.syncState="auth";state.pairMessage=state.lang==="ar"?"انتهى الاقتران. أدخل مفتاح REP_SYNC_KEY الحالي مرة أخرى.":"Connection expired. Enter the current REP_SYNC_KEY again.";}else state.syncState="failed";persist();if(state.view==="nutrition")renderNutrition();else updateSyncPanel();return;}
  }
  state.syncState="synced";persist();updateSyncPanel();
}
function syncStatusText(){const ar=state.lang==="ar",key=localStorage.getItem(syncKeyStorage),pending=state.syncQueue.length;if(state.pairBusy)return ar?"جارٍ التحقق من المفتاح…":"Checking pairing key…";if(!key)return state.syncState==="auth"?(ar?"يلزم إعادة الاتصال":"Reconnect required"):(ar?"يلزم الاتصال مرة واحدة":"One-time connection needed");if(state.syncState==="syncing")return ar?"جارٍ الإرسال إلى Notion…":"Syncing to Notion…";if(state.syncState==="failed")return ar?`${pending} بانتظار إعادة المحاولة`:`${pending} waiting to retry`;if(pending)return ar?`${pending} سجل بانتظار المزامنة`:`${pending} health log${pending===1?"":"s"} pending`;return ar?"الذكاء الاصطناعي وNotion متصلان":"AI + Notion connected";}
function updateSyncPanel(){document.querySelectorAll("[data-sync-status]").forEach(status=>status.textContent=state.pairMessage||syncStatusText());document.querySelectorAll("[data-sync-now],[data-food-sync-now]").forEach(button=>button.disabled=state.syncState==="syncing"||!localStorage.getItem(syncKeyStorage));document.querySelectorAll("[data-save-sync-key],[data-food-pair-submit]").forEach(button=>button.disabled=state.pairBusy);}
function refreshConnectionUI(){if(state.view==="nutrition")renderNutrition();else updateSyncPanel();}
async function validatePairingKey(key){const response=await fetch("/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":key}}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Connection check failed (${response.status})`);return data;}
async function connectPairingKey(input,requireFoodAi=false){const key=input?.value.trim();if(!key){state.pairMessage=state.lang==="ar"?"أدخل مفتاح الاقتران أولاً.":"Enter the pairing key first.";refreshConnectionUI();return false;}if(key.length<12){state.pairMessage=state.lang==="ar"?"استخدم مفتاحاً من 12 حرفاً على الأقل.":"Use a pairing key with at least 12 characters.";refreshConnectionUI();return false;}state.pairBusy=true;state.pairMessage="";refreshConnectionUI();try{const capabilities=await validatePairingKey(key);if(requireFoodAi&&!capabilities.foodAi)throw Error(state.lang==="ar"?"تحليل الطعام غير مفعّل في Cloudflare.":"Food AI is not enabled in Cloudflare.");localStorage.setItem(syncKeyStorage,key);state.syncState="idle";state.pairMessage="";input.value="";persist();return true;}catch(error){state.syncState="auth";state.pairMessage=String(error.message||error);return false;}finally{state.pairBusy=false;refreshConnectionUI();}}
async function savePairingKey(){const input=document.querySelector("[data-sync-key]");if(await connectPairingKey(input,false))syncPending();}
async function pairFromFood(){const input=document.querySelector("[data-food-pair-key]"),pending=state.foodPendingPayload;if(!await connectPairingKey(input,true))return;syncPending();if(pending){state.foodPendingPayload=null;await analyzeFood(pending);}}
function forgetPairingKey(){localStorage.removeItem(syncKeyStorage);state.syncState="idle";state.pairMessage="";if(state.view==="nutrition")renderNutrition();else updateSyncPanel();}

function renderHistory(){
  stopSessionClock();document.body.classList.remove("workout-mode");state.view="history";state.activeTab="train";persist();updatePrimaryTabs();const u=U(),rows=state.history;
  const best={};rows.forEach(r=>Object.entries(r.loads||{}).forEach(([name,l])=>setsFromLog(l).forEach(s=>{const w=Number(s.weight)||0,reps=Number(s.reps)||0;if(!best[name]||w>best[name].weight||(w===best[name].weight&&reps>best[name].reps))best[name]={weight:w,reps};})));
  app.innerHTML=`<section class="recovery-head"><p class="eyebrow">${u.history}</p><h1>${state.lang==="ar"?"تقدمك، بوضوح.":"Progress, without noise."}</h1><p>${u.historyDesc}</p></section>
  <section class="notion-sync"><div class="notion-sync-head"><span class="notion-mark">N</span><div><strong>Notion</strong><small data-sync-status>${syncStatusText()}</small></div></div><div class="notion-sync-actions"><input data-sync-key type="password" autocomplete="new-password" placeholder="${state.lang==="ar"?"مفتاح الاقتران":"Pairing key"}" aria-label="${state.lang==="ar"?"مفتاح مزامنة Notion":"Notion sync pairing key"}"><button data-save-sync-key>${state.lang==="ar"?"اقتران":"Pair"}</button><button data-sync-now>${state.lang==="ar"?"زامن الآن":"Sync now"}</button><button class="quiet" data-forget-sync>${state.lang==="ar"?"نسيان المفتاح":"Forget key"}</button></div><p>${state.lang==="ar"?"تُحفظ الحصص دون إنترنت وتُرسل تلقائياً عند عودة الاتصال.":"Workouts queue offline and upload automatically when your connection returns."}</p></section>
  <section class="data-tools"><button data-export>${state.lang==="ar"?"تصدير نسخة JSON":"Export JSON backup"}</button><label>${state.lang==="ar"?"استيراد نسخة":"Import backup"}<input data-import type="file" accept="application/json,.json"></label><small>${state.lang==="ar"?"تُحفظ البيانات محلياً على جهازك فقط.":"Your data stays on this device unless you export it."}</small>${clientErrorCount()?`<button class="quiet" data-diagnostics>${state.lang==="ar"?`سجل الأخطاء (${clientErrorCount()})`:`Error log (${clientErrorCount()})`}</button>`:""}</section>
  ${rows.length?`<section class="history-summary"><div><strong>${rows.length}</strong><span>${state.lang==="ar"?"حصة":"sessions"}</span></div><div><strong>${Math.round(rows.reduce((n,r)=>n+r.duration,0)/60)}</strong><span>${state.lang==="ar"?"دقيقة":"minutes"}</span></div><div><strong>${rows.reduce((n,r)=>n+r.sets,0)}</strong><span>${state.lang==="ar"?"مجموعة":"sets"}</span></div></section><section class="history-list">${Object.entries(best).filter(([,b])=>b.weight).map(([name,b])=>`<article class="pb-card"><small>PERSONAL BEST</small><h2>${esc(state.lang==="ar"?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</h2><strong>${b.weight} kg × ${b.reps||"—"}</strong><span>${progressionAdvice(name)}</span></article>`).join("")}${rows.map(r=>{const details=Object.entries(r.loads||{}).map(([name,l])=>{const setText=setsFromLog(l).filter(s=>s.weight||s.reps).map((s,i)=>`${i+1}: ${s.weight||"—"}kg × ${s.reps||"—"}${s.rpe?` @${s.rpe}`:""}`).join(" · ");return setText?`<small><b>${esc(name)}</b> ${setText}</small>`:""}).join("");return `<article class="history-row"><span>${new Date(r.date).toLocaleDateString(state.lang==="ar"?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</span><div><strong>${sessionText(r.session,sessions[r.session]).name}</strong><small>${formatClock(r.duration)} · ${r.sets} ${state.lang==="ar"?"مجموعات":"sets"}</small>${details}</div></article>`}).join("")}</section>`:`<div class="empty-state">${u.noHistory}</div>`}`;
  document.querySelector("[data-export]").onclick=exportData;document.querySelector("[data-import]").onchange=importData;document.querySelector("[data-save-sync-key]").onclick=savePairingKey;document.querySelector("[data-sync-now]").onclick=syncPending;document.querySelector("[data-forget-sync]").onclick=forgetPairingKey;document.querySelector("[data-diagnostics]")?.addEventListener("click",showDiagnostics);updateSyncPanel();
}

function clientErrorCount(){try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]").length;}catch{return 0;}}
function showDiagnostics(){
  if(document.querySelector(".diagnostics-panel"))return;
  const ar=state.lang==="ar",log=(()=>{try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]");}catch{return [];}})();
  const box=document.createElement("div");box.className="exit-confirm diagnostics-panel";
  box.innerHTML=`<strong>${ar?"سجل الأخطاء الأخيرة":"Recent errors"}</strong>${log.length?`<ul class="diagnostics-list">${log.slice().reverse().map(e=>`<li><small>${esc(e.time)} · ${esc(e.source)}</small><span>${esc(e.message)}</span></li>`).join("")}</ul>`:`<p>${ar?"لا توجد أخطاء مسجلة.":"No errors recorded."}</p>`}<button data-clear-log>${ar?"مسح السجل":"Clear log"}</button><button data-close-diagnostics>${ar?"إغلاق":"Close"}</button>`;
  document.body.appendChild(box);
  box.querySelector("[data-close-diagnostics]").onclick=()=>box.remove();
  box.querySelector("[data-clear-log]").onclick=()=>{localStorage.removeItem(errorLogKey);box.remove();if(state.view==="history")renderHistory();};
}

function exportData(){
  persist();const errorLog=(()=>{try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]");}catch{return [];}})();
  const payload={app:"Rep Gym Companion",schema:3,guideVersion:REP_HEALTH_GUIDE.version,exportedAt:new Date().toISOString(),data:JSON.parse(localStorage.getItem(storageKey)||"{}"),diagnostics:errorLog};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`rep-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importData(event){
  try{const payload=JSON.parse(await event.target.files[0].text());if(payload.app!=="Rep Gym Companion"||![1,2,3].includes(payload.schema)||typeof payload.data!=="object")throw Error("invalid");
    if(!confirm(state.lang==="ar"?"سيستبدل هذا بيانات التطبيق الحالية. متابعة؟":"This will replace the current app data. Continue?"))return;
    localStorage.setItem(storageKey,JSON.stringify(payload.data));location.reload();
  }catch{alert(state.lang==="ar"?"ملف النسخة غير صالح أو تالف.":"That backup file is invalid or damaged.");event.target.value="";}
}

const reviewExercises=["Leg Press","Back Extension","Chest Press","Seated Cable Row","Lat Pulldown","Glute Bridges","Bird-Dog"];
const fieldChecks=[
  ["bright","Readable in bright gym lighting","واضح في إضاءة الجيم القوية"],["dim","Readable in dim lighting","واضح في الإضاءة الخافتة"],["hands","Usable with sweaty hands","سهل مع اليد المتعرقة"],["onehand","Core actions work one-handed","الوظائف الأساسية بيد واحدة"],["airplane","Full workout works in airplane mode","الحصة كاملة تعمل دون إنترنت"],["muted","Visual/haptic cues work while muted","الإشارات المرئية والاهتزاز تعمل مع كتم الصوت"],["resume","Resumes correctly after phone lock","يستأنف بعد قفل الهاتف"],["languages","English and Arabic checked","تم اختبار العربية والإنجليزية"],["small","No clipping on a small phone","لا يوجد قص على هاتف صغير"]
];
function renderReview(){
  state.view="review";state.activeTab="train";persist();updatePrimaryTabs();document.body.classList.remove("workout-mode");const ar=state.lang==="ar",r=state.reviews,complete=reviewExercises.filter(x=>r[x]?.signed).length;
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
  state.view="recovery";state.activeTab="train";persist();updatePrimaryTabs();
  if(state.lang==="ar")return renderRecoveryArabic();
  const check = saved.checkin || {};
  app.innerHTML = `<section class="recovery-head"><p class="eyebrow">Recovery system</p><h1>Adaptation happens here.</h1><p>Use the basics daily. Check in weekly. Pain is information, not a challenge.</p></section>${recoveryDecisionCard()}
    <section class="recovery-grid">
      <article class="recovery-card"><span class="card-kicker">Every day</span><h2>Daily basics</h2><ul><li><strong>Sleep:</strong> 7 hours minimum. For 4:15 AM wake, aim for 9:15 PM bedtime.</li><li><strong>Hydration:</strong> At wake-up and through the morning, especially in Cairo heat.</li><li><strong>Breakfast:</strong> Protein + carbs right after the AM session.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Sun · Tue · Thu</span><h2>After lifting</h2><ul><li>Foam roll lower body + back in the evening, ~8 min.</li><li>Massage gun before sleep, targeted, ~6–8 min.</li><li>Skip routine icing; use ice only for actual joint pain.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Friday</span><h2>Active recovery</h2><ul><li>No gym and no morning circuit.</li><li>Optional light walking and 5–10 min gentle stretching.</li><li><strong>Legs up the wall:</strong> 5 min, breathe slowly.</li><li>Soreness should resolve, not accumulate.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">2-minute check-in</span><h2>Weekly signals</h2><form class="checkin" id="checkin"><label>Soreness<select name="soreness">${ratingOptions(check.soreness)}</select></label><label>Energy<select name="energy">${ratingOptions(check.energy)}</select></label><label class="wide">Average sleep<input name="sleep" type="number" min="0" max="12" step="0.5" value="${check.sleep||7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${check.pain?"checked":""}> Any pain (not soreness)</span></label><label class="wide">Notes<input name="notes" maxlength="180" value="${esc(check.notes||"")}" placeholder="Optional context"></label></form><p class="check-result" id="checkResult"></p><button class="module-save" data-save-checkin>Save & sync check-in</button></article>
      <article class="recovery-card wide"><span class="card-kicker">Guided recovery</span><h2>Start a timer</h2><div class="timer-presets"><button data-guide-timer="480" data-guide-label="Foam roll">Foam roll <b>8:00</b></button><button data-guide-timer="420" data-guide-label="Massage gun">Massage gun <b>7:00</b></button><button data-guide-timer="300" data-guide-label="Legs up the wall">Legs up wall <b>5:00</b></button><button data-guide-timer="600" data-guide-label="Gentle stretch">Gentle stretch <b>10:00</b></button></div></article>
      <article class="recovery-card wide"><span class="card-kicker">Saturday · 45–55 min</span><h2>Steam → Sauna → Jacuzzi</h2><ol class="spa-list"><li><span>Shower — rinse</span><strong>2 min</strong></li><li><span>Steam room</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Sauna</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Jacuzzi</span><strong>15–20</strong></li><li><span>Cool shower + rehydrate</span><strong>2 min</strong></li></ol><p class="check-result">Water before and between every step. Exit immediately if dizzy, nauseous, or unwell. Skip if sick, dehydrated, or hungover.</p></article>
      <article class="recovery-card warning wide"><span class="card-kicker">Stop, don't push</span><h2>Real red flags</h2><ul><li><strong>Sharp or joint pain:</strong> stop that exercise.</li><li><strong>Soreness beyond 72 hours:</strong> back off volume.</li><li><strong>Persistent fatigue or declining sleep:</strong> address it before adding load.</li><li>Pain that persists for days or feels unlike normal soreness needs a doctor, not a training workaround.</li></ul></article>
      <article class="recovery-card wide"><span class="card-kicker">Bad-day fallback</span><h2>Something beats nothing.</h2><ul><li><strong>Non-negotiable:</strong> Kegels 3 × 10 + 3 min marching.</li><li>Cut cardio first, then reduce gym to Leg Press + Chest Press + Row.</li><li>Protect the morning circuit last.</li><li>Review the full program at week 8, or after 2+ lifts stall for 2+ sessions.</li></ul></article>
    </section>`;
  bindRecoveryTools();
}
function renderRecoveryArabic(){
  app.innerHTML=`<section class="recovery-head"><p class="eyebrow">نظام الاستشفاء</p><h1>هنا يحدث التطور.</h1><p>التزم بالأساسيات يومياً، وراجع حالتك أسبوعياً. الألم معلومة وليس تحدياً.</p></section>${recoveryDecisionCard()}<section class="recovery-grid">
  <article class="recovery-card"><span class="card-kicker">كل يوم</span><h2>الأساسيات</h2><ul><li><strong>النوم:</strong> 7 ساعات على الأقل؛ مع الاستيقاظ 4:15 ص استهدف 9:15 م.</li><li><strong>الماء:</strong> عند الاستيقاظ وطوال الصباح، خصوصاً مع حرارة القاهرة.</li><li><strong>الإفطار:</strong> بروتين وكربوهيدرات بعد تمرين الصباح.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الأحد · الثلاثاء · الخميس</span><h2>بعد الجيم</h2><ul><li>Foam roller للجسم السفلي والظهر مساءً، نحو 8 دقائق.</li><li>مسدس المساج قبل النوم، 6–8 دقائق.</li><li>لا تستخدم الثلج روتينياً؛ فقط لألم مفصل حقيقي.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الجمعة</span><h2>استشفاء نشط</h2><ul><li>لا جيم ولا دائرة صباحية.</li><li>مشي خفيف وإطالة 5–10 دقائق اختياريان.</li><li><strong>الرجلان على الحائط:</strong> 5 دقائق مع تنفس بطيء.</li><li>يجب أن يقل الإجهاد لا أن يتراكم.</li></ul></article>
  <article class="recovery-card warning"><span class="card-kicker">توقف ولا تضغط</span><h2>علامات الخطر</h2><ul><li>ألم حاد أو ألم مفصل: أوقف التمرين.</li><li>إجهاد عضلي أكثر من 72 ساعة: خفّض الحجم.</li><li>إرهاق مستمر أو نوم متراجع: عالجه قبل زيادة الحمل.</li><li>الألم المستمر لأيام يحتاج طبيباً.</li></ul></article>
  <article class="recovery-card wide"><span class="card-kicker">السبت · 45–55 دقيقة</span><h2>بخار ← ساونا ← جاكوزي</h2><ol class="spa-list"><li><span>دش سريع</span><strong>2 د</strong></li><li><span>غرفة البخار</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>ساونا</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>جاكوزي</span><strong>15–20</strong></li><li><span>دش بارد وترطيب</span><strong>2 د</strong></li></ol><p class="check-result">اشرب قبل البداية وبين كل خطوة. اخرج فوراً عند الدوخة أو الغثيان. لا تبدأ إذا كنت مريضاً أو جافاً.</p></article>
  <article class="recovery-card"><span class="card-kicker">مراجعة دقيقتين</span><h2>إشارات الأسبوع</h2><form class="checkin" id="checkin"><label>الإجهاد العضلي<select name="soreness">${ratingOptions(saved.checkin?.soreness)}</select></label><label>الطاقة<select name="energy">${ratingOptions(saved.checkin?.energy)}</select></label><label class="wide">متوسط النوم<input name="sleep" type="number" min="0" max="12" step="0.5" value="${saved.checkin?.sleep||7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${saved.checkin?.pain?"checked":""}> يوجد ألم غير الإجهاد العضلي</span></label><label class="wide">ملاحظات<input name="notes" maxlength="180" value="${esc(saved.checkin?.notes||"")}" placeholder="اختياري"></label></form><p class="check-result" id="checkResult"></p><button class="module-save" data-save-checkin>حفظ ومزامنة</button></article>
  <article class="recovery-card wide"><span class="card-kicker">استشفاء موجه</span><h2>ابدأ مؤقتاً</h2><div class="timer-presets"><button data-guide-timer="480" data-guide-label="Foam roll">Foam roller <b>8:00</b></button><button data-guide-timer="420" data-guide-label="Massage gun">مسدس المساج <b>7:00</b></button><button data-guide-timer="300" data-guide-label="Legs up the wall">الرجلان على الحائط <b>5:00</b></button><button data-guide-timer="600" data-guide-label="Gentle stretch">إطالة خفيفة <b>10:00</b></button></div></article>
  <article class="recovery-card wide"><span class="card-kicker">الخطة المصغرة</span><h2>شيء أفضل من لا شيء.</h2><ul><li><strong>الحد الأدنى:</strong> كيجل 3 × 10 + مشي في المكان 3 دقائق.</li><li>اختصر الكارديو أولاً، ثم الجيم إلى Leg Press + Chest Press + Row.</li><li>احمِ دائرة الصباح أخيراً.</li><li>راجع البرنامج في الأسبوع الثامن.</li></ul></article></section>`;
  bindRecoveryTools();
}
function ratingOptions(selected){return [1,2,3,4,5].map(n=>`<option ${Number(selected||3)===n?"selected":""}>${n}</option>`).join("");}
function updateCheckin(){
  const form=new FormData(document.querySelector("#checkin")); const c={soreness:Number(form.get("soreness")),energy:Number(form.get("energy")),sleep:Number(form.get("sleep")),pain:form.get("pain")==="on",notes:String(form.get("notes")||"")};
  const flags=(c.soreness>=4?1:0)+(c.energy<=2?1:0)+(c.sleep<7?1:0)+(c.pain?1:0);
  document.querySelector("#checkResult").textContent=state.lang==="ar"?(flags>=2?`${flags} علامات خطر — خذ يوماً خفيفاً إضافياً أو لا تزد الحمل.`:flags===1?"علامة خطر واحدة — راقبها وركز على الاستشفاء.":"لا توجد علامات خطر — استمر وتقدم كما هو مخطط."):(flags>=2?`${flags} red flags — take an extra light day or hold progression flat.`:flags===1?"1 red flag — keep an eye on it and prioritize recovery.":"No red flags — stay consistent and progress as planned.");
  const all=JSON.parse(localStorage.getItem(storageKey)||"{}"); all.checkin=c; localStorage.setItem(storageKey,JSON.stringify(all)); saved.checkin=c;
}
function recoveryDecisionCard(){const gate=recoveryGate(),p=programStatus(),ar=state.lang==="ar",decision=gate.hold?(ar?"يوم خفيف إضافي · لا تزيد الحمل":"Extra light day · hold progression"):(ar?"استمر حسب الخطة":"Proceed as planned");return `<section class="decision-card ${gate.hold?"hold":""}"><div><small>${ar?"قرار الاستشفاء":"RECOVERY DECISION"}</small><h2>${decision}</h2><p>${gate.stale?(ar?"سجّل مراجعة حديثة لتفعيل بوابة التقدم.":"Log a fresh check-in to activate progression gating."):(ar?`${gate.flags} علامات خطر في آخر مراجعة.`:`${gate.flags} red flags in the latest check-in.`)}</p></div><div><strong>${ar?`الأسبوع ${p.week}`:`WEEK ${p.week}`}</strong><span>${p.review?(ar?"المراجعة مستحقة":"Review due"):(ar?"المراجعة في الأسبوع 8":"Review at week 8")}</span>${p.stalled.length>=2?`<em>${ar?`${p.stalled.length} تمارين متوقفة`:`${p.stalled.length} lifts stalled`}</em>`:""}</div></section>`;}
function bindRecoveryTools(){const form=document.querySelector("#checkin");form.addEventListener("input",updateCheckin);updateCheckin();document.querySelector("[data-save-checkin]").onclick=saveRecoveryCheckin;document.querySelectorAll("[data-guide-timer]").forEach(b=>b.onclick=()=>startGuideTimer(b.dataset.guideLabel,Number(b.dataset.guideTimer)));}
function saveRecoveryCheckin(){updateCheckin();const c={...saved.checkin,date:new Date().toISOString()},flags=recoveryFlags(c);c.flags=flags;c.recommendation=c.pain?"Stop and assess":flags>=2?"Extra light day":flags===1?"Hold":"Progress";state.recoveryCheckins=state.recoveryCheckins.filter(x=>x.date.slice(0,10)!==isoDay());state.recoveryCheckins.unshift(c);state.recoveryCheckins=state.recoveryCheckins.slice(0,24);queueHealth("recovery",c);persist();renderRecovery();}

function nutritionPlanKey(){const d=currentDay();return ["Sunday","Tuesday","Thursday"].includes(d)?"gym":["Monday","Wednesday"].includes(d)?"cardio":"rest";}
function dailyBucket(kind){state.daily[kind]=state.daily[kind]||{};state.daily[kind][isoDay()]=state.daily[kind][isoDay()]||{checked:{},notes:""};return state.daily[kind][isoDay()];}
function checkedCount(bucket,prefix,total){let n=0;for(let i=0;i<total;i++)if(bucket.checked[`${prefix}-${i}`])n++;return n;}
function checklist(items,prefix,bucket){return `<div class="module-checklist">${items.map((item,i)=>{const parts=Array.isArray(item)?item:["",item,""];return `<label><input type="checkbox" data-daily-key="${prefix}-${i}" ${bucket.checked[`${prefix}-${i}`]?"checked":""}><span>${parts[0]?`<time>${esc(parts[0])}</time>`:""}<strong>${esc(parts[1])}</strong>${parts[2]?`<small>${esc(parts[2])}</small>`:""}</span></label>`}).join("")}</div>`;}
function bindDaily(kind,render){document.querySelectorAll("[data-daily-key]").forEach(el=>el.onchange=()=>{const b=dailyBucket(kind);b.checked[el.dataset.dailyKey]=el.checked;persist();render();});document.querySelector("[data-daily-notes]").oninput=e=>{dailyBucket(kind).notes=e.target.value;persist();};}
function moduleHeader(kicker,title,copy){return `<section class="recovery-head module-head"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${copy}</p><span class="guide-version">Guide v${REP_HEALTH_GUIDE.version} · ${REP_HEALTH_GUIDE.updatedAt}</span></section>`;}
const FOOD_PROFILES={gym:{label:"Gym Day",calories:2162,protein:176,carbs:248,fat:70,fiber:30,water:3500},active:{label:"Active Day",calories:1990,protein:173,carbs:202,fat:70,fiber:30,water:3200},flex:{label:"Flex Day",calories:2480,protein:150,carbs:0,fat:70,fiber:30,water:3000,calorieCeiling:true,proteinFloor:true}};
function foodProfile(){const day=new Date().getDay();return FOOD_PROFILES[[0,2,4].includes(day)?"gym":[1,3].includes(day)?"active":"flex"];}
function autoMealType(){const h=new Date().getHours();return h>=18?"Dinner":h>=15?"Snack":h>=11?"Lunch":"Breakfast";}
function todayFoodEntries(){return state.foodEntries.filter(entry=>String(entry.date||"").slice(0,10)===isoDay()).sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
function foodTotals(entries=todayFoodEntries()){return entries.reduce((t,e)=>{for(const key of ["calories","protein_g","carbs_g","fat_g","fiber_g","sugar_g","sodium_mg"])t[key]+=Number(e[key])||0;return t;},{calories:0,protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sugar_g:0,sodium_mg:0});}
function meter(label,value,goal,unit,color="var(--acid)"){const pct=goal?Math.round(value/goal*100):0;return `<article class="macro-meter" style="--meter:${Math.min(pct,100)}%;--meter-color:${color}"><span>${label}</span><strong>${Math.round(value)}</strong><small>${goal?`${pct}% · ${Math.max(Math.round(goal-value),0)} ${unit} left`:`${unit} · flexible`}</small><i></i></article>`;}
function nutritionPlanNote(){const ar=state.lang==="ar",guide=REP_HEALTH_GUIDE.nutrition,key=nutritionPlanKey(),target=guide.targets[key],meals=guide.meals[key];return `<details class="nutrition-plan-note"><summary><span class="plan-note-icon">≡</span><span><small>${ar?"ملاحظة مرجعية":"REFERENCE NOTE"}</small><strong>${ar?"خطة التغذية اليوم":"Today's nutrition plan"}</strong><em>${target.label} · ${target.calories} kcal · P${target.protein} C${target.carbs} F${target.fat}</em></span><b>${ar?"اضغط للعرض":"Tap to view"}</b></summary><div class="plan-note-body"><p>${ar?"هذه الخطة للرجوع فقط. الوجبات لا تُسجل حتى تكتبها وتؤكد تقدير الذكاء الاصطناعي أدناه.":"This plan is a reference only. Nothing is logged until you enter a meal and confirm the AI estimate below."}</p><ol>${meals.map(([time,name,macros])=>`<li><time>${esc(time)}</time><span><strong>${esc(name)}</strong><small>${esc(macros)}</small></span></li>`).join("")}</ol><div class="plan-note-extras"><strong>${ar?"المكملات":"Supplements"}</strong><ul>${guide.supplements.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><small>${esc(guide.milk)}</small></div></div></details>`;}
function foodDraftCard(){const d=state.foodDraft,ar=state.lang==="ar";if(!d)return "";return `<section class="analysis-card"><div class="analysis-head"><div><small>${ar?"راجع قبل الحفظ":"REVIEW ESTIMATE"}</small><strong>${esc(d.food_name||d.rawNote||"Meal note")}</strong></div><span>${esc(d.confidence||"Low")} · ${Number(d.confidence_pct)||0}%<br>${ar?"لن يُسجل حتى تؤكد":"Not logged until confirmed"}</span></div><div class="analysis-text"><label>${ar?"اسم الوجبة":"Meal name"}<input data-food-text="food_name" value="${esc(d.food_name||d.rawNote||"Meal note")}"></label><label>${ar?"حجم الحصة":"Portion size"}<input data-food-text="portion_size" value="${esc(d.portion_size||"")}"></label></div><div class="macro-editor">${[["calories",ar?"سعرات":"Calories"],["protein_g",ar?"بروتين":"Protein"],["carbs_g",ar?"كربوهيدرات":"Carbs"],["fat_g",ar?"دهون":"Fat"],["fiber_g",ar?"ألياف":"Fiber"],["sugar_g",ar?"سكر":"Sugar"],["sodium_mg",ar?"صوديوم":"Sodium"],["estimated_weight_g",ar?"الوزن جم":"Weight g"]].map(([key,label])=>`<label>${label}<input data-food-macro="${key}" type="number" min="0" step="0.1" inputmode="decimal" value="${Number(d[key])||0}"></label>`).join("")}</div><p class="analysis-notes">${esc(d.notes||"AI nutrition values are estimates. Adjust anything that looks wrong before saving.")}</p><div class="analysis-actions"><button data-cancel-food>${ar?"إلغاء":"Cancel"}</button><button class="primary" data-save-food>${ar?"تأكيد وتسجيل الوجبة":"Confirm & log meal"}</button></div></section>`;}
function foodEntryCard(entry){const ar=state.lang==="ar",time=new Date(entry.date).toLocaleTimeString(state.lang==="ar"?"ar-EG":"en-US",{hour:"numeric",minute:"2-digit"});return `<article class="food-entry"><div><small>${esc(entry.mealType||"Meal")} · ${time} · ${esc(entry.logMethod||"Note")}</small><strong>${esc(entry.food_name||entry.rawNote||"Meal note")}</strong><span>${esc(entry.rawNote||entry.portion_size||"")}</span></div><div class="food-entry-macros"><b>${Math.round(Number(entry.calories)||0)} kcal</b><em>P ${Math.round(Number(entry.protein_g)||0)} · C ${Math.round(Number(entry.carbs_g)||0)} · F ${Math.round(Number(entry.fat_g)||0)}</em></div><div class="food-entry-actions"><button data-save-template="${esc(entry.id)}">${ar?"☆ وجبة متكررة":"☆ Save frequent"}</button><button data-relog-entry="${esc(entry.id)}">${ar?"↻ سجل مرة أخرى":"↻ Log again"}</button><button class="danger" data-delete-food="${esc(entry.id)}">${ar?"حذف":"Delete"}</button></div></article>`;}
function foodConnectionCard(ar){const connected=Boolean(localStorage.getItem(syncKeyStorage)),status=state.pairMessage||syncStatusText();return `<section class="food-connect ${connected?"is-connected":"is-needed"}" aria-live="polite"><div class="food-connect-head"><span class="food-connect-icon">${connected?"✓":"N"}</span><div><small>${connected?(ar?"جاهز":"CONNECTED"):(ar?"اتصال لمرة واحدة":"ONE-TIME SETUP")}</small><strong>${connected?(ar?"الذكاء الاصطناعي وNotion جاهزان":"AI + Notion are ready"):(ar?"اتصل من تبويب الطعام":"Connect right here in Food")}</strong><span data-sync-status>${esc(status)}</span></div></div>${connected?`<div class="food-connect-actions"><button data-food-sync-now>${ar?"مزامنة الآن":"Sync now"}</button><button class="quiet" data-food-disconnect>${ar?"قطع الاتصال":"Disconnect"}</button></div>`:`<p>${ar?"استخدم نفس REP_SYNC_KEY الموجود في Cloudflare. يُحفظ المفتاح على هذا الجهاز فقط، ثم سيستمر التحليل تلقائياً.":"Use the same REP_SYNC_KEY you set in Cloudflare. It stays only on this device, then your analysis continues automatically."}</p><form class="food-pair-form" data-food-pair-form autocomplete="off"><input data-food-pair-key type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${ar?"ألصق REP_SYNC_KEY":"Paste REP_SYNC_KEY"}" aria-label="${ar?"مفتاح اقتران التطبيق":"App pairing key"}"><button data-food-pair-submit ${state.pairBusy?"disabled":""}>${state.pairBusy?(ar?"جارٍ التحقق…":"Checking…"):(ar?"اتصل واستمر":"Connect & continue")}</button></form>${state.pairMessage?`<p class="food-pair-error">${esc(state.pairMessage)}</p>`:""}`}</section>`;}
function foodRetryControl(ar){return state.foodPendingPayload&&localStorage.getItem(syncKeyStorage)?`<button class="food-retry" data-retry-food>${ar?"إعادة محاولة التحليل":"Retry analysis"}</button>`:"";}
function waterTrackerCard(water,goal,ar){const remaining=Math.max(goal-water,0),progress=Math.min(Math.round(water/goal*100),100);return `<section class="water-card"><div class="water-summary"><div><small>${ar?"الترطيب":"HYDRATION"}</small><strong>${water} / ${goal} ml</strong><span>${remaining} ml ${ar?"متبقي اليوم":"remaining today"}</span></div><b>${progress}%</b></div><div class="water-progress" aria-label="${ar?"تقدم شرب المياه":"Water goal progress"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" role="progressbar"><i style="width:${progress}%"></i></div><div class="water-actions"><button data-water-delta="-250" aria-label="${ar?"اطرح 250 مل":"Subtract 250 milliliters"}">−250</button><button data-water-delta="250">+250</button><button data-water-delta="500">+500</button><button data-water-delta="1000">+1L</button></div><form class="water-custom" data-water-form><label><span>${ar?"كمية مخصصة":"Custom amount"}</span><input data-water-custom type="number" min="1" max="20000" step="1" inputmode="numeric" placeholder="${ar?"مثال 330":"e.g. 330"}" aria-label="${ar?"كمية المياه بالملليلتر":"Water amount in milliliters"}"></label><button type="submit" data-water-custom-action="add">${ar?"أضف":"Add"}</button><button type="button" data-water-custom-action="set">${ar?"حدد الإجمالي":"Set total"}</button></form><button class="water-reset" data-water-reset>${ar?"إعادة ضبط مياه اليوم":"Reset today's water"}</button></section>`;}
function renderNutrition(){
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="nutrition";state.activeTab="food";state.foodMealType=state.foodMealType||autoMealType();persist();updatePrimaryTabs();const ar=state.lang==="ar",profile=foodProfile(),entries=todayFoodEntries(),totals=foodTotals(entries),water=Number(state.water[isoDay()])||0,note=state.foodNote||"";
  app.innerHTML=`<section class="recovery-head module-head food-head"><p class="eyebrow">${ar?"متتبع الطعام":"FOOD TRACKER"}</p><h1>${ar?"اكتب ما أكلت.":"Write what you ate."}</h1><p>${ar?"بنفس طريقة بوت تتبع الطعام: اكتب ملاحظة أو أضف صورة أو امسح باركود، راجع التقدير ثم احفظه.":"Just like your Food Tracking bot: add a note, photo, voice description, or barcode; review the estimate; then save."}</p><span class="guide-version">${ar?"تقديرات التغذية ليست نصيحة طبية":"Nutrition values are estimates, not medical advice"}</span></section><section class="food-profile"><div><small>${ar?"ملف اليوم":"TODAY'S PROFILE"}</small><strong>${profile.label}</strong></div><span>${entries.length} ${ar?"إدخالات":"entries"}<br>${syncStatusText()}</span></section>${foodConnectionCard(ar)}<section class="macro-dashboard">${meter(ar?"السعرات":"Calories",totals.calories,profile.calories,"kcal","#ffd36a")}${meter(ar?"البروتين":"Protein",totals.protein_g,profile.protein,"g")}${meter(ar?"الكربوهيدرات":"Carbs",totals.carbs_g,profile.carbs,"g","var(--blue)")}${meter(ar?"الدهون":"Fat",totals.fat_g,profile.fat,"g","var(--orange)")}</section><section class="meal-composer"><div class="meal-composer-head"><div><small>${ar?"وجبة جديدة":"NEW MEAL NOTE"}</small><h2>${ar?"ماذا أكلت؟":"What did you eat?"}</h2></div><span class="estimate-pill">AI ESTIMATE</span></div><div class="meal-type-row">${["Breakfast","Lunch","Dinner","Snack"].map(type=>`<button data-meal-type="${type}" class="${state.foodMealType===type?"is-active":""}">${type}</button>`).join("")}</div><textarea class="meal-note" data-food-note maxlength="1200" placeholder="${ar?"مثال: 180 جم دجاج مشوي، كوب أرز وسلطة...":"Example: 180g grilled chicken, one cup of rice, and salad…"}">${esc(note)}</textarea><div class="log-method-row">${[["Ingredients",ar?"مكونات":"Ingredients"],["Restaurant",ar?"مطعم":"Restaurant"]].map(([method,label])=>`<button data-log-method="${method}" class="${state.foodLogMethod===method?"is-active":""}">${label}</button>`).join("")}</div><div class="meal-tools"><label>▣ ${ar?"صورة":"Photo"}<input data-food-photo type="file" accept="image/*" capture="environment"></label><button data-food-voice>◉ ${ar?"صوت":"Voice"}</button><label>▥ ${ar?"باركود":"Barcode"}<input data-food-barcode type="file" accept="image/*" capture="environment"></label></div><button class="analyze-meal" data-analyze-food ${state.foodBusy?"disabled":""}>${state.foodBusy?(ar?"جارٍ التحليل…":"Analyzing…"):(ar?"تحليل الملاحظة":"Analyze note")}</button><button class="analyze-meal" data-manual-food style="margin-top:7px;background:transparent;color:var(--muted);border:1px solid var(--line)">${ar?"حفظ كملاحظة بدون تحليل":"Save as note without AI"}</button><p class="composer-status ${state.foodError?"is-error":""}" data-food-status>${esc(state.foodStatus||"")}</p>${foodRetryControl(ar)}</section>${foodDraftCard()}${waterTrackerCard(water,profile.water,ar)}${state.savedMeals.length?`<div class="food-section-head"><h2>${ar?"الوجبات المتكررة":"Frequent meals"}</h2><span>${ar?"اضغط للتسجيل":"Tap to re-log"}</span></div><section class="saved-meals">${state.savedMeals.map(meal=>`<button class="saved-meal" data-saved-meal="${esc(meal.id)}"><strong>${esc(meal.food_name)}</strong><span>${Math.round(meal.calories)} kcal · P ${Math.round(meal.protein_g)}g</span></button>`).join("")}</section>`:""}<div class="food-section-head"><h2>${ar?"ملاحظات اليوم":"Today's notes"}</h2><span>${entries.length} ${ar?"وجبات":"meals"}</span></div><section class="food-log">${entries.length?entries.map(foodEntryCard).join(""):`<div class="food-empty">${ar?"لا توجد وجبات مسجلة اليوم. اكتب أول ملاحظة طعام في الأعلى.":"No meals logged today. Write your first food note above."}</div>`}</section>`;
  document.querySelector(".food-connect")?.insertAdjacentHTML("afterend",nutritionPlanNote());const foodHeadings=[...document.querySelectorAll(".food-section-head h2")];if(foodHeadings.length)foodHeadings.at(-1).textContent=ar?"وجبات اليوم":"Food entries today";
  bindFoodTracker();
}
function bindFoodTracker(){const note=document.querySelector("[data-food-note]");note.oninput=e=>{state.foodNote=e.target.value;if(state.foodPendingPayload){state.foodPendingPayload=null;document.querySelector("[data-retry-food]")?.remove();}persist();};document.querySelectorAll("[data-meal-type]").forEach(button=>button.onclick=()=>{state.foodMealType=button.dataset.mealType;persist();renderNutrition();});document.querySelectorAll("[data-log-method]").forEach(button=>button.onclick=()=>{state.foodLogMethod=button.dataset.logMethod;persist();renderNutrition();});document.querySelector("[data-analyze-food]").onclick=()=>analyzeFood({mode:state.foodLogMethod==="Restaurant"?"restaurant":"text",description:String(state.foodNote||"").trim()});document.querySelector("[data-manual-food]").onclick=()=>manualFoodDraft();document.querySelector("[data-food-photo]").onchange=e=>analyzeFoodImage(e.target.files?.[0],"photo");document.querySelector("[data-food-barcode]").onchange=e=>analyzeFoodImage(e.target.files?.[0],"barcode-image");document.querySelector("[data-food-voice]").onclick=startFoodVoice;document.querySelector("[data-food-pair-form]")?.addEventListener("submit",e=>{e.preventDefault();pairFromFood();});document.querySelector("[data-food-sync-now]")?.addEventListener("click",syncPending);document.querySelector("[data-food-disconnect]")?.addEventListener("click",forgetPairingKey);document.querySelector("[data-retry-food]")?.addEventListener("click",()=>{const pending=state.foodPendingPayload;state.foodPendingPayload=null;if(pending)analyzeFood(pending);});document.querySelectorAll("[data-water-delta]").forEach(button=>button.onclick=()=>changeFoodWater(Number(button.dataset.waterDelta)));document.querySelector("[data-water-form]").onsubmit=e=>{e.preventDefault();applyCustomWater("add");};document.querySelector('[data-water-custom-action="set"]').onclick=()=>applyCustomWater("set");document.querySelector("[data-water-reset]").onclick=()=>setFoodWater(0);document.querySelector("[data-cancel-food]")?.addEventListener("click",()=>{state.foodDraft=null;renderNutrition();});document.querySelector("[data-save-food]")?.addEventListener("click",saveFoodDraft);document.querySelectorAll("[data-save-template]").forEach(button=>button.onclick=()=>saveFrequentMeal(button.dataset.saveTemplate));document.querySelectorAll("[data-relog-entry]").forEach(button=>button.onclick=()=>relogFood(state.foodEntries.find(e=>e.id===button.dataset.relogEntry)));document.querySelectorAll("[data-delete-food]").forEach(button=>button.onclick=()=>deleteFoodEntry(button.dataset.deleteFood));document.querySelectorAll("[data-saved-meal]").forEach(button=>button.onclick=()=>relogFood(state.savedMeals.find(e=>e.id===button.dataset.savedMeal)));updateSyncPanel();}
function manualFoodDraft(){const rawNote=String(state.foodNote||"").trim();if(!rawNote){state.foodStatus=state.lang==="ar"?"اكتب ملاحظة الوجبة أولاً.":"Write a meal note first.";state.foodError=true;renderNutrition();return;}state.foodPendingPayload=null;state.foodDraft={food_name:rawNote,portion_size:"Not specified",calories:0,protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sugar_g:0,sodium_mg:0,estimated_weight_g:0,confidence:"Manual",confidence_pct:100,notes:"Saved without AI analysis.",recognizable:true,source:"Manual note",rawNote,mealType:state.foodMealType,logMethod:"Ingredients"};state.foodStatus="";state.foodError=false;renderNutrition();}
async function analyzeFood(payload){const rawNote=String(payload.description||state.foodNote||"").trim();if(payload.mode!=="photo"&&payload.mode!=="barcode-image"&&!rawNote){state.foodStatus=state.lang==="ar"?"اكتب وصف الوجبة أولاً.":"Describe the meal first.";state.foodError=true;renderNutrition();return;}const key=localStorage.getItem(syncKeyStorage);if(!key){state.foodPendingPayload=payload;state.foodStatus=state.lang==="ar"?"اتصل مرة واحدة أدناه وسيستمر التحليل تلقائياً.":"Connect once below and this analysis will continue automatically.";state.foodError=false;renderNutrition();setTimeout(()=>document.querySelector("[data-food-pair-key]")?.focus(),0);return;}state.foodPendingPayload=null;state.pairMessage="";state.foodBusy=true;state.foodError=false;state.foodStatus=state.lang==="ar"?"جارٍ تقدير القيم الغذائية…":"Estimating nutrition…";renderNutrition();try{const response=await fetch("/api/food/analyze",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":key},body:JSON.stringify(payload)}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=Error(data.error||`Analysis failed (${response.status})`);error.auth=response.status===401;throw error;}if(data.nutrition?.recognizable===false)throw Error(data.nutrition.notes||"Food was not recognizable.");state.foodDraft={...data.nutrition,rawNote:rawNote||data.nutrition.food_name,mealType:state.foodMealType,logMethod:payload.mode==="text"&&state.foodLogMethod==="Voice"?"Voice":(data.logMethod||state.foodLogMethod)};state.foodStatus="";}catch(error){state.foodPendingPayload=payload;state.foodError=true;if(error.auth){localStorage.removeItem(syncKeyStorage);state.syncState="auth";state.pairMessage=state.lang==="ar"?"مفتاح الاقتران غير صحيح أو تغيّر. أدخل REP_SYNC_KEY الحالي.":"The pairing key is incorrect or changed. Enter the current REP_SYNC_KEY.";state.foodStatus=state.lang==="ar"?"أعد الاتصال أدناه وسيستمر التحليل.":"Reconnect below and the analysis will continue.";}else state.foodStatus=!navigator.onLine?(state.lang==="ar"?"أنت غير متصل. تم حفظ الملاحظة؛ أعد المحاولة بعد الاتصال.":"You're offline. Your note is saved; reconnect and tap Retry."):String(error.message||error);}finally{state.foodBusy=false;persist();renderNutrition();}}
async function prepareFoodImage(file){if(!file)throw Error("No image selected.");if(file.size>20*1024*1024)throw Error("Choose an image under 20 MB.");const source=window.createImageBitmap?await createImageBitmap(file):await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("This image could not be opened."));};img.src=url;}),width=source.width||source.naturalWidth,height=source.height||source.naturalHeight,scale=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);source.close?.();return {image:canvas.toDataURL("image/jpeg",.82).split(",")[1],mimeType:"image/jpeg"};}
async function analyzeFoodImage(file,mode){try{const image=await prepareFoodImage(file);state.foodLogMethod=mode==="photo"?"Photo":"Barcode";await analyzeFood({mode,...image,description:String(state.foodNote||"").trim()});}catch(error){state.foodError=true;state.foodStatus=String(error.message||error);renderNutrition();}}
function startFoodVoice(){const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){state.foodStatus=state.lang==="ar"?"الإملاء الصوتي غير متاح في هذا المتصفح. استخدم ميكروفون لوحة المفاتيح.":"Voice dictation is unavailable here. Use the microphone on your keyboard.";state.foodError=true;renderNutrition();return;}const recognition=new SpeechRecognition();recognition.lang=state.lang==="ar"?"ar-EG":"en-US";recognition.interimResults=false;recognition.maxAlternatives=1;state.foodStatus=state.lang==="ar"?"أتحدث الآن…":"Listening…";state.foodError=false;document.querySelector("[data-food-voice]")?.classList.add("is-listening");recognition.onresult=e=>{state.foodNote=e.results[0][0].transcript;state.foodLogMethod="Voice";state.foodStatus=state.lang==="ar"?"تمت كتابة الوصف. راجعه ثم حلله.":"Voice note transcribed. Review it, then analyze.";renderNutrition();};recognition.onerror=e=>{state.foodStatus=`Voice: ${e.error}`;state.foodError=true;renderNutrition();};recognition.onend=()=>document.querySelector("[data-food-voice]")?.classList.remove("is-listening");recognition.start();}
function saveFoodDraft(){const d=state.foodDraft;if(!d)return;document.querySelectorAll("[data-food-text]").forEach(input=>d[input.dataset.foodText]=String(input.value||"").trim());document.querySelectorAll("[data-food-macro]").forEach(input=>d[input.dataset.foodMacro]=Math.max(0,Number(input.value)||0));const entry={...d,id:`food-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:new Date().toISOString(),mealType:d.mealType||state.foodMealType,logMethod:d.logMethod||state.foodLogMethod,rawNote:d.rawNote||state.foodNote||d.food_name};state.foodEntries.unshift(entry);state.foodEntries=state.foodEntries.slice(0,400);state.foodDraft=null;state.foodPendingPayload=null;state.foodNote="";state.foodStatus=state.lang==="ar"?"تم حفظ الوجبة وإضافتها إلى قائمة مزامنة Notion.":"Meal saved and queued for Notion.";queueHealth("food",entry);queueNutritionSummary();persist();renderNutrition();}
function queueNutritionSummary(){const p=foodProfile(),entries=todayFoodEntries(),totals=foodTotals(entries),water=Number(state.water[isoDay()])||0,completion=Math.round((Math.min(totals.calories/p.calories,1)+Math.min(totals.protein_g/p.protein,1)+Math.min(water/p.water,1))/3*100);queueHealth("nutrition",{date:isoDay(),plan:p.label,caloriesTarget:p.calories,proteinTarget:p.protein,waterTarget:p.water/1000,mealsComplete:entries.length,mealsTotal:entries.length,hydrationComplete:water>=p.water,supplementsComplete:false,completion,notes:`Logged ${Math.round(totals.calories)} kcal · P ${Math.round(totals.protein_g)}g · C ${Math.round(totals.carbs_g)}g · F ${Math.round(totals.fat_g)}g · Water ${water}ml`});}
function setFoodWater(amount){const next=Math.max(0,Math.min(Math.round(Number(amount)||0),20000));state.water[isoDay()]=next;queueNutritionSummary();persist();renderNutrition();}
function changeFoodWater(delta){setFoodWater((Number(state.water[isoDay()])||0)+(Number(delta)||0));}
function applyCustomWater(mode){const input=document.querySelector("[data-water-custom]"),amount=Number(input?.value);if(!input||!Number.isFinite(amount)||amount<=0||amount>20000){input?.setCustomValidity(state.lang==="ar"?"أدخل كمية بين 1 و20000 مل.":"Enter an amount from 1 to 20,000 ml.");input?.reportValidity();return;}input.setCustomValidity("");setFoodWater(mode==="set"?amount:(Number(state.water[isoDay()])||0)+amount);}
function saveFrequentMeal(id){const entry=state.foodEntries.find(e=>e.id===id);if(!entry)return;const exists=state.savedMeals.find(e=>e.food_name===entry.food_name&&Math.round(e.calories)===Math.round(entry.calories));if(!exists)state.savedMeals.unshift({...entry,id:`saved-${Date.now()}`,timesLogged:1});state.savedMeals=state.savedMeals.slice(0,30);persist();renderNutrition();}
function relogFood(source){if(!source)return;const entry={...source,id:`food-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:new Date().toISOString(),mealType:state.foodMealType||autoMealType(),logMethod:"Re-log",rawNote:source.rawNote||source.food_name};state.foodEntries.unshift(entry);queueHealth("food",entry);queueNutritionSummary();persist();renderNutrition();}
function deleteFoodEntry(id){state.foodEntries=state.foodEntries.filter(entry=>entry.id!==id);state.syncQueue=state.syncQueue.filter(item=>item.id!==`food-${id}`);queueNutritionSummary();persist();renderNutrition();}
function renderHygiene(){
  stopSessionClock();document.body.classList.remove("workout-mode");state.view="hygiene";state.activeTab="care";persist();updatePrimaryTabs();const ar=state.lang==="ar",g=REP_HEALTH_GUIDE.hygiene,b=dailyBucket("hygiene"),day=currentDay(),hair=g.hair[day],training=["Sunday","Monday","Tuesday","Wednesday","Thursday"].includes(day),sections=[...g.morning.map((x,i)=>["morning",i,x]),...g.evening.map((x,i)=>["evening",i,x]),...hair.map((x,i)=>["hair",i,x]),...(training?g.postWorkout.map((x,i)=>["post",i,x]):[])],done=sections.filter(([p,i])=>b.checked[`${p}-${i}`]).length,percent=Math.round(done/sections.length*100);
  const complete=p=>{const group=sections.filter(x=>x[0]===p);return group.length>0&&group.every(([,i])=>b.checked[`${p}-${i}`]);};
  app.innerHTML=`${moduleHeader(ar?"العناية اليومية":"DAILY CARE",ar?"امسح. نفّذ. أكمل.":"Scan. Do. Done.",ar?"روتين الصباح والمساء وما بعد التمرين مع تعليمات الشعر حسب اليوم.":"Morning, evening, post-workout, and the correct hair routine for today.")}
  <section class="nonneg-grid">${g.nonNegotiables.map((x,i)=>`<div class="${(i===0&&b.checked["morning-0"])||(i===1&&b.checked["evening-1"])||(i===2&&b.checked["morning-3"]&&b.checked["evening-3"])||(i===3&&b.checked["post-0"])?"done":""}"><span>${i+1}</span><strong>${esc(x)}</strong></div>`).join("")}</section>
  <section class="module-progress"><span style="width:${percent}%"></span><strong>${percent}% ${ar?"اليوم":"today"}</strong></section>
  <section class="module-card"><div class="module-card-head"><div><small>${ar?"كل يوم":"EVERY DAY"}</small><h2>${ar?"الصباح":"Morning"}</h2></div><span>${complete("morning")?"✓":""}</span></div>${checklist(g.morning,"morning",b)}</section>
  <section class="module-card"><div class="module-card-head"><div><small>${ar?"الأهم":"MOST IMPORTANT"}</small><h2>${ar?"المساء":"Evening"}</h2></div><span>${complete("evening")?"✓":""}</span></div>${checklist(g.evening,"evening",b)}</section>
  ${training?`<section class="module-card accent-card"><div class="module-card-head"><div><small>30-MINUTE RULE</small><h2>${ar?"بعد التمرين":"Post-workout"}</h2></div><span>${complete("post")?"✓":""}</span></div>${checklist(g.postWorkout,"post",b)}</section>`:""}
  <section class="module-card"><div class="module-card-head"><div><small>${esc(day.toUpperCase())}</small><h2>${ar?"روتين الشعر":"Hair routine"}</h2></div><span>${complete("hair")?"✓":""}</span></div>${checklist(hair,"hair",b)}<details class="cue-details"><summary>${ar?"قواعد الشعر الصارمة":"Strict hair rules"}</summary><div class="cue-body"><ul>${g.strictHairRules.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></details></section>
  <section class="module-card"><label class="notes-label">${ar?"ملاحظات اليوم":"Today's notes"}<textarea data-daily-notes maxlength="300">${esc(b.notes||"")}</textarea></label><button class="module-save" data-save-daily>${ar?"حفظ ومزامنة اليوم":"Save & sync today"}</button></section>`;
  bindDaily("hygiene",renderHygiene);document.querySelector("[data-save-daily]").onclick=()=>{queueHealth("hygiene",{date:isoDay(),morningComplete:complete("morning"),eveningComplete:complete("evening"),postWorkoutComplete:training?complete("post"):false,hairRoutineComplete:complete("hair"),spf:Boolean(b.checked["morning-0"]),floss:Boolean(b.checked["evening-1"]),beardOil:Boolean(b.checked["morning-3"]&&b.checked["evening-3"]),showerWithin30m:Boolean(b.checked["post-0"]),completion:percent,notes:b.notes||""});state.syncState="idle";renderHygiene();};
}
function renderBadDay(){const ar=state.lang==="ar",gate=recoveryGate();state.view="badDay";state.activeTab="train";persist();updatePrimaryTabs();app.innerHTML=`${moduleHeader(ar?"خطة اليوم الصعب":"BAD DAY MODE",ar?"احمِ الاستمرارية.":"Protect the streak.",ar?"اختر أصغر نسخة تستطيع تنفيذها بأمان. خطتك الأصلية لن تتغير.":"Choose the smallest version you can do safely. Your normal program stays untouched.")}${gate.hold?`<section class="decision-card hold"><div><small>${ar?"بوابة الاستشفاء":"RECOVERY GATE"}</small><h2>${ar?"اليوم الخفيف هو الاختيار الصحيح":"Light is the correct call today"}</h2><p>${gate.flags} ${ar?"علامات خطر":"red flags"}</p></div></section>`:""}<section class="fallback-grid"><button data-fallback="bad"><span>01</span><small>5–7 MIN</small><h2>${ar?"الحد الأدنى":"The floor"}</h2><p>${ar?"3 دقائق مشي في المكان + كيجل 3 × 10.":"3 minutes marching + Kegels 3 × 10."}</p><strong>${ar?"ابدأ الآن ←":"Start now →"}</strong></button><button data-fallback="gymLite"><span>02</span><small>25–30 MIN</small><h2>${ar?"جيم مختصر":"Reduced gym"}</h2><p>Leg Press · Chest Press · Seated Row</p><strong>${ar?"ابدأ الآن ←":"Start now →"}</strong></button><button data-active-recovery><span>03</span><small>5 MIN</small><h2>${ar?"استشفاء فقط":"Recovery only"}</h2><p>${ar?"الرجلان على الحائط وتنفس بطيء.":"Legs up the wall with slow breathing."}</p><strong>${ar?"ابدأ المؤقت ←":"Start timer →"}</strong></button></section>`;document.querySelectorAll("[data-fallback]").forEach(b=>b.onclick=()=>startSession(b.dataset.fallback));document.querySelector("[data-active-recovery]").onclick=()=>startGuideTimer(ar?"الرجلان على الحائط":"Legs up the wall",300);}
function startGuideTimer(label,seconds){let remaining=seconds,paused=false;const overlay=document.createElement("div");overlay.className="timed-mode";overlay.innerHTML=`<button class="timed-close" aria-label="Close">×</button><p>${esc(label)}</p><strong data-guide-value>${formatClock(remaining)}</strong><span>${state.lang==="ar"?"تنفس ببطء وحافظ على الراحة":"BREATHE SLOWLY · STAY COMFORTABLE"}</span><div class="timed-progress"><i data-guide-progress></i></div><div class="timed-actions"><button data-guide-pause>${U().pause}</button><button data-guide-finish>${U().skip}</button></div>`;document.body.appendChild(overlay);const close=()=>{clearInterval(tick);overlay.remove();};overlay.querySelector(".timed-close").onclick=close;overlay.querySelector("[data-guide-finish]").onclick=()=>{signalEnd();close();};overlay.querySelector("[data-guide-pause]").onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?U().resume:U().pause;};const tick=setInterval(()=>{if(paused)return;remaining--;overlay.querySelector("[data-guide-value]").textContent=formatClock(Math.max(0,remaining));overlay.querySelector("[data-guide-progress]").style.width=`${Math.max(0,remaining/seconds*100)}%`;if(remaining<=0){signalEnd();close();}},1000);}

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
document.querySelectorAll("[data-app-tab]").forEach(button=>button.addEventListener("click",()=>setPrimaryTab(button.dataset.appTab)));
document.querySelector("#soundButton").addEventListener("click",e=>{state.muted=!state.muted;e.currentTarget.setAttribute("aria-pressed",state.muted);e.currentTarget.textContent=state.muted?"×":"◖";persist();});
document.querySelector("#soundButton").textContent=state.muted?"×":"◖";
document.querySelector("#langButton").addEventListener("click",()=>{state.lang=state.lang==="en"?"ar":"en";document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;document.querySelector("#langButton").textContent=U().language;persist();state.view==="recovery"?renderRecovery():state.view==="player"?renderExercise():state.view==="history"?renderHistory():state.view==="review"?renderReview():state.view==="nutrition"?renderNutrition():state.view==="hygiene"?renderHygiene():state.view==="care"?renderCareHub():state.view==="badDay"?renderBadDay():renderHome();network();});
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
updatePrimaryTabs();state.activeTab==="food"?renderNutrition():state.activeTab==="care"?renderHygiene():renderHome();
if(navigator.onLine&&state.syncQueue.length&&localStorage.getItem(syncKeyStorage))setTimeout(syncPending,800);
