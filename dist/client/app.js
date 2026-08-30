const errorLogKey="rep-error-log-v1";
function logClientError(source,message,stack){try{const log=JSON.parse(localStorage.getItem(errorLogKey)||"[]");log.push({time:new Date().toISOString(),source,message:String(message||"").slice(0,500),stack:String(stack||"").slice(0,1000)});localStorage.setItem(errorLogKey,JSON.stringify(log.slice(-25)));}catch{}}
addEventListener("error",e=>logClientError("error",e.message,e.error?.stack));
addEventListener("unhandledrejection",e=>logClientError("promise",e.reason?.message||String(e.reason),e.reason?.stack));

const ICONS={
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.1" y2="4.9"/></svg>',
  dumbbell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="3" height="6" rx="1"/><rect x="4.5" y="7" width="3" height="10" rx="1"/><line x1="7.5" y1="12" x2="16.5" y2="12"/><rect x="16.5" y="7" width="3" height="10" rx="1"/><rect x="20" y="9" width="3" height="6" rx="1"/></svg>',
  pulse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,12 7,12 9,6 13,18 15,12 22,12"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>',
  waves:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 16,14"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,13 9,18 20,6"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="7,10 12,15 17,10"/><line x1="4" y1="20" x2="20" y2="20"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
  flame:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1.5 3-2 4.5-2 8a2 2 0 0 0 4 0c0-1-.5-2-.5-2.5 2 1.5 3.5 4 3.5 6.5a5 5 0 0 1-10 0c0-4.5 3-6 3-9 .5.5 1.5 1.5 2 3z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  heartbeat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-10-9.5C.5 7.5 3 4 6.5 4c2 0 3.5 1.2 4.5 2.8C12 5.2 13.5 4 15.5 4 19 4 21.5 7.5 20 11.5 17.5 16.4 12 21 12 21z"/><polyline points="6,13 9,13 10.5,10 12.5,16 14,13 18,13"/></svg>'
};
const sessions = {
  morning: {
    name: "Morning Activation", short: "AM", meta: "Sun–Thu · Home · 10–15 min", icon: "sun", accent: "#c9ff3d",
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
    name: "Gym Session", short: "GYM", meta: "Sun / Tue / Thu · 45–50 min", icon: "dumbbell", accent: "#ff8b3d",
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
  football: {
    name: "Football Warm-up & Cooldown", short: "FB", meta: "Monday · Before / after your game", icon: "flame", accent: "#ff5f6d",
    description: "Football already gives strong cardio stimulus, so there's no separate treadmill block today — just warm up before you play and cool down after. Hamstrings and groin get priority; they're the most common football strain sites.",
    exercises: [
      ex("Football Warm-up Jog", "3 min", "General", 0, "warm-up", "walk", "Open space to jog, or the pitch itself.", "Jog at an easy, conversational pace.", "Let the body warm gradually before anything dynamic.", "Sprinting cold or skipping straight to hard running."),
      ex("Football Dynamic Stretches", "10 / leg · 10 steps · 20m", "Leg swings · Walking lunges · High knees · Butt kicks", 0, "dynamic", "march", "Open space, roughly 20m.", "Leg swings front/back and side/side 10 each leg, walking lunges 10 steps, then high knees and butt kicks 20m each.", "Controlled range, not maximal stretch.", "Static holds here — save those for the cooldown."),
      ex("Lateral Shuffles & Carioca", "2 × 20m each", "Activation", 0, "activation", "walk", "Open space, roughly 20m.", "Lateral shuffles 2×20m, then carioca (crossover steps) 2×20m.", "Stay low and light on your feet.", "Standing too tall or crossing the feet stiffly."),
      ex("Football Build-up Strides", "3–4 reps", "60% → 90% speed", 0, "build-up", "walk", "Open space, 30–40m.", "Short accelerations building from 60% up to 90% of top speed.", "Build speed gradually across each stride.", "Going full speed cold — this is a build, not a sprint test."),
      ex("Football Match", "Your game", "Log after", 0, "match", "activity", "Wherever you're playing.", "Play your match at normal intensity — this step just holds your place in the session until you're back.", "Log your Active Calories and duration from your Apple Watch before moving on to the cooldown.", "Skipping the log — your weekly training load needs this number."),
      ex("Football Cooldown Jog", "3–5 min", "Light jog / walk", 0, "cooldown", "walk", "Open space to walk or jog easily.", "Bring the heart rate down gradually after the game.", "Easy pace, relaxed breathing.", "Stopping abruptly right after hard running."),
      ex("Football Static Stretches", "5 stretches", "30 sec / side each", 0, "cooldown", "stretch", "Open floor, right after the game.", "Hamstrings · Quads · Hip flexors · Calves · Groin/adductors.", "Hamstrings and groin first — the two most common football strain sites given repeated sprinting and cutting.", "Bouncing or forcing range.", 5)
    ]
  },
  padel: {
    name: "Padel Warm-up & Cooldown", short: "PDL", meta: "Wednesday · Before / after your game", icon: "heartbeat", accent: "#ffb84d",
    description: "Padel already gives strong cardio stimulus, so there's no separate treadmill block today — just warm up before you play and cool down after. Shoulder and forearm work matter more here than the legs; repeated overhead swings and gripping are padel's real fatigue point.",
    exercises: [
      ex("Padel Warm-up Jog", "2–3 min", "General", 0, "warm-up", "walk", "On court, or open space nearby.", "Jog easily or move around the court.", "Easy, conversational effort.", "Standing still, then jumping straight into hard rallies."),
      ex("Padel Dynamic Stretches", "Leg swings · Lunges · Arm circles", "Both directions", 0, "dynamic", "march", "Open space or the court.", "Leg swings, walking lunges with a torso twist, then arm circles in both directions.", "Controlled range, not maximal stretch.", "Static holds here — save those for the cooldown."),
      ex("Padel Shoulder Prep", "Band or bodyweight", "Rotations", 0, "activation", "stretch", "Standing, band optional.", "Shoulder rotations in both directions, with a band or just bodyweight.", "Smashes load the shoulder hard — this matters.", "Skipping this before overhead play."),
      ex("Padel Sport-Specific Warm-up", "Shadow swings · Light rally", "Timing", 0, "sport-specific", "walk", "Racket in hand, on court.", "Shadow swings with no ball, then light rallying to warm up timing.", "Build up shot pace gradually.", "Going full power on the first rally."),
      ex("Padel Match", "Your game", "Log after", 0, "match", "activity", "On court.", "Play your match at normal intensity — this step just holds your place in the session until you're back.", "Log your Active Calories and duration from your Apple Watch before moving on to the cooldown.", "Skipping the log — your weekly training load needs this number."),
      ex("Padel Cooldown Walk", "2 min", "Light walk", 0, "cooldown", "walk", "On or off court.", "Walk easily to bring the heart rate down.", "Relaxed, easy breathing.", "Sitting down immediately after hard rallies."),
      ex("Padel Static Stretches", "4 stretches", "20–30 sec each", 0, "cooldown", "stretch", "Open floor, right after the game.", "Shoulders/rotator cuff · Forearm/wrist · Hip flexors · Calves.", "Shoulder and forearm stretches matter more here than the legs — repeated overhead and gripping motion is padel's real fatigue point.", "Bouncing or forcing range.", 4)
    ]
  },
  general: {
    name: "Any Activity Warm-up & Cooldown", short: "GEN", meta: "Any day · Before / after any activity", icon: "waves", accent: "#5fe1c9",
    description: "A general-purpose warm-up and cool-down for any sport or activity not already covered — running, basketball, tennis, cycling, hiking, and more.",
    exercises: [
      ex("Easy Jog or Brisk Walk", "3–4 min", "Cardio pulse raiser", 0, "warm-up", "walk", "Open space to walk or jog.", "Gradually raise heart rate and body temperature, building from an easy pace to a light jog over the full duration.", "Ease into it — this is preparation, not a test.", "Jumping straight to hard effort."),
      ex("Full-Body Dynamic Stretch", "2–3 min", "Joint mobility", 0, "dynamic", "march", "Open space to move freely.", "Arm circles, torso twists, and leg swings front-to-back and side-to-side through a full range of motion.", "Controlled range, not maximal stretch.", "Static holds here — save those for the cooldown."),
      ex("Movement-Specific Drills", "2–3 min", "Neuromuscular prep", 0, "activation", "march", "Open space, mimicking the activity ahead.", "Light shuffles, skips, or short strides that mimic the movement patterns of the activity ahead, gradually increasing speed.", "Build toward full intensity gradually.", "Going full speed cold."),
      ex("Log Your Activity", "Your session", "Log after", 0, "match", "activity", "Wherever you're playing.", "Do your activity at normal intensity — this step just holds your place in the session until you're back.", "Log your Active Calories and duration from your Apple Watch before moving on to the cooldown.", "Skipping the log — your weekly training load needs this number."),
      ex("Walk & Breathe Down", "2–3 min", "Heart rate recovery", 0, "cooldown", "walk", "Open space to walk easily.", "Walk at an easy pace until your breathing returns to normal.", "Relaxed, easy breathing.", "Stopping abruptly right after hard effort."),
      ex("Full-Body Static Stretch", "4 stretches", "30 sec each", 0, "cooldown", "stretch", "Open floor, right after the activity.", "Hamstrings · Quads · Calves · Shoulders.", "Hold each stretch gently without bouncing; breathe slowly and let the muscle relax.", "Bouncing or forcing range.", 4),
      ex("Hydrate & Refuel", "—", "Recovery", 0, "cooldown", "walk", "Right after the activity.", "Rehydrate with water or electrolytes and eat a protein-containing snack within the hour.", "Recovery starts the moment you stop moving.", "Skipping fluids or waiting too long to eat.")
    ]
  },
  cardio: {
    name: "Cardio Workout", short: "CARDIO", meta: "Any day without football or padel · 30–35 min", icon: "pulse", accent: "#7dc9ff",
    description: "Choose this treadmill session when you are not playing football or padel. It gives you a complete moderate cardio workout without inventing a replacement game.",
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
  march:       ["mobility", "500% 200%", "0% 0%", "0% 100%", "Hip flexors · Quads · Calves", "flip", "مثنيات الورك · الفخذ الأمامي · السمانة"],
  catcow:      ["mobility", "500% 200%", "25% 0%", "25% 100%", "Spinal erectors · Abdominals", null, "مقيمات العمود الفقري · عضلات البطن"],
  kneel:       ["mobility", "500% 200%", "50% 0%", "50% 100%", "Hip flexors", null, "مثنيات الورك"],
  floor:       ["mobility", "500% 200%", "75% 0%", "75% 100%", "Glutes · Hamstrings", null, "الأرداف · أوتار الركبة"],
  birddog:     ["mobility", "500% 200%", "100% 0%", "100% 100%", "Core · Glutes · Back", null, "الجذع · الأرداف · الظهر"],
  plank:       ["core", "400% 200%", "0% 0%", "0% 100%", "Core · Glutes", null, "الجذع · الأرداف"],
  breathe:     ["core", "400% 200%", "33.333% 0%", "33.333% 100%", "Deep abdominal wall", null, "جدار البطن العميق"],
  kegel:       ["core", "400% 200%", "66.667% 0%", "66.667% 100%", "Pelvic floor", null, "قاع الحوض"],
  grip:        ["core", "400% 200%", "100% 0%", "100% 100%", "Forearm flexors · Hand", null, "عضلات الساعد القابضة · اليد"],
  bike:        ["gym", "400% 300%", "0% 0%", "33.333% 0%", "Quads · Glutes · Calves", null, "الفخذ الأمامي · الأرداف · السمانة"],
  legpress:    ["gym", "400% 300%", "66.667% 0%", "100% 0%", "Quads · Glutes", null, "الفخذ الأمامي · الأرداف"],
  hinge:       ["gym", "400% 300%", "0% 50%", "33.333% 50%", "Spinal erectors · Glutes · Hamstrings", null, "مقيمات العمود الفقري · الأرداف · أوتار الركبة"],
  chestpress:  ["gym", "400% 300%", "66.667% 50%", "100% 50%", "Chest · Front delts · Triceps", null, "الصدر · الدالية الأمامية · الترايسبس"],
  row:         ["gym", "400% 300%", "0% 100%", "33.333% 100%", "Lats · Rhomboids · Biceps", null, "العضلة الظهرية العريضة · المعينية · البايسبس"],
  pulldown:    ["gym", "400% 300%", "66.667% 100%", "100% 100%", "Lats · Biceps", null, "العضلة الظهرية العريضة · البايسبس"],
  walk:        ["cardio", "300% 200%", "0% 0%", "0% 100%", "Glutes · Quads · Calves", null, "الأرداف · الفخذ الأمامي · السمانة"],
  inclinewalk: ["cardio", "300% 200%", "50% 0%", "50% 100%", "Glutes · Quads · Core", null, "الأرداف · الفخذ الأمامي · الجذع"],
  stretch:     ["cardio", "300% 200%", "100% 0%", "100% 100%", "Lats · Obliques", null, "العضلة الظهرية العريضة · المائلة"]
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

const cinematicMedia = {
  "Brisk Marching in Place":"assets/cinematic/home-march.webp",
  "Cat-Cow":"assets/cinematic/home-cat-cow.webp",
  "Hip Flexor Stretch":"assets/cinematic/home-hip-flexor.webp",
  "Glute Bridges":"assets/cinematic/home-glute-bridge.webp",
  "Bird-Dog":"assets/cinematic/home-bird-dog.webp",
  "Plank":"assets/cinematic/home-plank.webp",
  "Stomach Vacuum":"assets/cinematic/home-breathing.webp",
  "Pelvic Floor (Kegel)":"assets/cinematic/home-breathing.webp",
  "Hand Grip":"assets/cinematic/home-hand-grip.webp",
  "Stationary Bike":"assets/cinematic/stationary-bike.webp",
  "Leg Press":"assets/cinematic/leg-press.webp",
  "Back Extension":"assets/cinematic/back-extension.webp",
  "Chest Press":"assets/cinematic/chest-press.webp",
  "Seated Cable Row":"assets/cinematic/seated-cable-row.webp",
  "Lat Pulldown":"assets/cinematic/lat-pulldown.webp",
  "Cooldown Stretches":"assets/cinematic/cooldown-stretches.webp",
  "Football Warm-up Jog":"assets/cinematic/football-jog.webp",
  "Football Dynamic Stretches":"assets/cinematic/football-dynamic.webp",
  "Lateral Shuffles & Carioca":"assets/cinematic/football-agility.webp",
  "Football Build-up Strides":"assets/cinematic/football-stride.webp",
  "Football Match":"assets/cinematic/football-agility.webp",
  "Football Cooldown Jog":"assets/cinematic/football-jog.webp",
  "Football Static Stretches":"assets/cinematic/football-dynamic.webp",
  "Padel Warm-up Jog":"assets/cinematic/padel-jog.webp",
  "Padel Dynamic Stretches":"assets/cinematic/padel-dynamic.webp",
  "Padel Shoulder Prep":"assets/cinematic/padel-shoulder-prep.webp",
  "Padel Sport-Specific Warm-up":"assets/cinematic/padel-shadow-swing.webp",
  "Padel Match":"assets/cinematic/padel-shadow-swing.webp",
  "Padel Cooldown Walk":"assets/cinematic/padel-jog.webp",
  "Padel Static Stretches":"assets/cinematic/padel-dynamic.webp",
  "Easy Jog or Brisk Walk":"assets/cinematic/outdoor-easy-jog.webp",
  "Full-Body Dynamic Stretch":"assets/cinematic/outdoor-dynamic-stretch.webp",
  "Movement-Specific Drills":"assets/cinematic/outdoor-movement-drill.webp",
  "Log Your Activity":"assets/cinematic/outdoor-movement-drill.webp",
  "Walk & Breathe Down":"assets/cinematic/outdoor-easy-jog.webp",
  "Full-Body Static Stretch":"assets/cinematic/outdoor-static-stretch.webp",
  "Hydrate & Refuel":"assets/cinematic/outdoor-hydrate.webp",
  "Easy Warm-up Walk":"assets/cinematic/treadmill-warmup.webp",
  "Incline Treadmill Walk":"assets/cinematic/treadmill-incline.webp",
  "Easy Cooldown + Stretch":"assets/cinematic/treadmill-cooldown.webp"
};

const cinematicMotionMedia = {
  inclinedbpress:"assets/cinematic/chest-press.webp",
  latpulldown:"assets/cinematic/lat-pulldown.webp",
  backextension:"assets/cinematic/back-extension.webp",
  legpress:"assets/cinematic/leg-press.webp"
};

const cinematicMotionFrames = {
  "Brisk Marching in Place":["assets/cinematic/home-march-neutral.webp","assets/cinematic/home-march.webp","assets/cinematic/home-march-opposite.webp"],
  "Plank":["assets/cinematic/home-plank-inhale.webp","assets/cinematic/home-plank.webp","assets/cinematic/home-plank-exhale.webp"],
  "Chest Press":["assets/cinematic/chest-press-start.webp","assets/cinematic/chest-press.webp","assets/cinematic/chest-press-finish.webp"],
  "Leg Press":["assets/cinematic/leg-press-start.webp","assets/cinematic/leg-press.webp","assets/cinematic/leg-press-finish.webp"],
  "Seated Cable Row":["assets/cinematic/seated-cable-row-start.webp","assets/cinematic/seated-cable-row.webp","assets/cinematic/seated-cable-row-finish.webp"],
  "Back Extension":["assets/cinematic/back-extension-lowered.webp","assets/cinematic/back-extension.webp","assets/cinematic/back-extension-neutral.webp"],
  "Lat Pulldown":["assets/cinematic/lat-pulldown-start.webp","assets/cinematic/lat-pulldown-mid.webp","assets/cinematic/lat-pulldown.webp"],
  "Football Dynamic Stretches":["assets/cinematic/football-dynamic.webp","assets/cinematic/football-dynamic-transition.webp","assets/cinematic/football-dynamic-opposite.webp"],
  "Lateral Shuffles & Carioca":["assets/cinematic/football-agility-start.webp","assets/cinematic/football-agility.webp","assets/cinematic/football-agility-opposite.webp"],
  "Football Build-up Strides":["assets/cinematic/football-stride-push.webp","assets/cinematic/football-stride.webp","assets/cinematic/football-stride-switch.webp"],
  "Padel Shoulder Prep":["assets/cinematic/padel-shoulder-prep-start.webp","assets/cinematic/padel-shoulder-prep.webp","assets/cinematic/padel-shoulder-prep-end.webp"],
  "Padel Sport-Specific Warm-up":["assets/cinematic/padel-shadow-swing-backswing.webp","assets/cinematic/padel-shadow-swing.webp","assets/cinematic/padel-shadow-swing-followthrough.webp"],
  "Incline Treadmill Walk":["assets/cinematic/treadmill-incline.webp","assets/cinematic/treadmill-incline-mid.webp","assets/cinematic/treadmill-incline-opposite.webp"]
};

const CATEGORY_LABELS_AR = {
  "warm-up":"إحماء", "squat":"سكوات", "hinge":"ثني الورك", "horizontal push":"دفع أفقي",
  "horizontal pull":"سحب أفقي", "vertical pull":"سحب عمودي", "cooldown":"تهدئة", "mobility":"مرونة",
  "core":"الجذع", "activation":"تنشيط", "pelvic health":"صحة الحوض", "grip":"قبضة",
  "dynamic":"ديناميكي", "build-up":"بناء تدريجي", "match":"مباراة", "sport-specific":"خاص بالرياضة",
  "minimum":"الحد الأدنى", "main":"رئيسي", "push":"دفع", "pull":"سحب"
};

// Exact-string translations for the free-text prescription/intensity fields.
// Keyed by the literal English value from ex() so the same exercise name can
// carry different numbers across sessions (e.g. Leg Press 3x10-12 vs 2x10).
const PRESCRIPTION_AR = {
  "1 × 10–15":"1 × 10–15", "1 × 12–15":"1 × 12–15", "1 × 30–45 sec":"1 × 30–45 ثانية",
  "1 × 6–8 / side":"1 × 6–8 / جهة", "1 × 8":"1 × 8",
  "10 / leg · 10 steps · 20m":"10 / ساق · 10 خطوات · 20م",
  "2 min":"دقيقتان", "2 × 10":"2 × 10", "2 × 15–20 sec":"2 × 15–20 ثانية", "2 × 20m each":"2 × 20م لكل جانب",
  "20–25 min":"20–25 دقيقة", "2–3 min":"2–3 دقائق", "3 min":"3 دقائق", "3 × 10":"3 × 10", "3 × 10–12":"3 × 10–12",
  "30–45 sec / side":"30–45 ثانية / جهة", "3–4 min":"3–4 دقائق", "3–4 reps":"3–4 مرات", "3–5 min":"3–5 دقائق",
  "4 stretches":"4 إطالات", "5 min":"5 دقائق", "5 stretches":"5 إطالات",
  "Band or bodyweight":"رباط مطاطي أو وزن الجسم",
  "Leg swings · Lunges · Arm circles":"أرجحة الساق · اندفاعات · دوائر بالذراعين",
  "Shadow swings · Light rally":"ضربات وهمية · تبادل خفيف",
  "Your game":"مباراتك", "Your session":"نشاطك"
};
const INTENSITY_AR = {
  "10 sec rest":"راحة 10 ثوانٍ", "2 sec close / open":"إغلاق 2ث / فتح 2ث", "2 sec squeeze":"ضغط 2 ثانية",
  "20–30 sec / side":"20–30 ثانية / جهة", "20–30 sec each":"20–30 ثانية لكل جانب",
  "30 sec / side each":"30 ثانية / جهة لكل", "30 sec each":"30 ثانية لكل",
  "3–5 sec hold / release":"ثبات 3–5 ثوانٍ / تحرير",
  "60% → 90% speed":"من 60% إلى 90% من السرعة",
  "Activation":"تنشيط", "Both directions":"الاتجاهين", "Cardio pulse raiser":"رفع نبض القلب",
  "Easy":"سهل", "General":"عام", "Heart rate recovery":"استشفاء معدل ضربات القلب",
  "Joint mobility":"مرونة المفاصل",
  "Leg swings · Walking lunges · High knees · Butt kicks":"أرجحة الساق · اندفاعات المشي · الركبة العالية · ضرب الكعب للمؤخرة",
  "Light jog / walk":"هرولة خفيفة / مشي", "Light walk":"مشي خفيف", "Log after":"سجّل لاحقاً",
  "Neuromuscular prep":"تحضير عصبي عضلي", "RPE 5–6 · 4–6% incline":"RPE 5–6 · ميل 4–6%",
  "Recovery":"استشفاء", "Rotations":"دورانات", "Timing":"التوقيت"
};
function categoryLabel(category){return state.lang==="ar"?(CATEGORY_LABELS_AR[category]||category):category;}

const exerciseMuscleTargets = {
  "Football Dynamic Stretches":["Hips · Hamstrings · Quads","الورك · أوتار الركبة · الفخذ الأمامي"],
  "Lateral Shuffles & Carioca":["Adductors · Glutes · Calves","المقربة · الأرداف · السمانة"],
  "Football Build-up Strides":["Glutes · Hamstrings · Calves","الأرداف · أوتار الركبة · السمانة"],
  "Football Static Stretches":["Hamstrings · Quads · Adductors · Calves","أوتار الركبة · الفخذ الأمامي · المقربة · السمانة"],
  "Football Match":["Match intensity","شدة المباراة"],
  "Padel Dynamic Stretches":["Shoulders · Hips · Calves","الكتفان · الورك · السمانة"],
  "Padel Shoulder Prep":["Rotator cuff · Rear delts · Scapular stabilizers","الكفة المدورة · الدالية الخلفية · مثبتات الكتف"],
  "Padel Sport-Specific Warm-up":["Shoulders · Forearms · Core","الكتفان · الساعدان · الجذع"],
  "Padel Match":["Match intensity","شدة المباراة"],
  "Padel Static Stretches":["Shoulders · Forearms · Hips","الكتفان · الساعدان · الورك"],
  "Log Your Activity":["Your activity","نشاطك"],
  "Hydrate & Refuel":["Full-body recovery","استشفاء كامل الجسم"]
};

function motionPhaseRail(){
  const phaseLabels=state.lang==="ar"?["ابدأ","تحكم","ارجع"]:["START","CONTROL","RETURN"];
  return `<span class="media-phase-rail" aria-hidden="true"><i></i>${phaseLabels.map(label=>`<b>${label}</b>`).join("")}</span>`;
}

function cinematicAssetFor(item){return cinematicMedia[item?.baseName||item?.name]||cinematicMotionMedia[item?.motion]||null;}
function cinematicFramesFor(item){
  const asset=cinematicAssetFor(item);
  return cinematicMotionFrames[item?.baseName||item?.name]||(asset?[asset]:[]);
}
function targetMusclesFor(item){
  const ar=state.lang==="ar",custom=exerciseMuscleTargets[item?.baseName||item?.name];
  if(custom)return ar?(custom[1]||custom[0]):custom[0];
  const entry=anatomy[item?.motion];
  if(entry)return ar?(entry[6]||entry[4]):entry[4];
  return categoryLabel(item?.category);
}

function primeUpcomingCinematicMedia(session,index){
  document.querySelectorAll("link[data-rep-media-preload]").forEach(link=>link.remove());
  const next=session?.exercises?.[index+1];
  if(!next)return;
  const item=currentItem(next),src=cinematicFramesFor(item)[0];
  if(!src)return;
  const link=document.createElement("link"),started=performance.now();
  link.rel="preload";link.as="image";link.href=src;link.fetchPriority="low";link.dataset.repMediaPreload="next";
  link.addEventListener("load",()=>window.REP_TELEMETRY?.recordMedia?.({exercise:item.name,frame:1,stage:"next-preload",loadMs:performance.now()-started,decodeMs:0,ok:true}),{once:true});
  link.addEventListener("error",()=>window.REP_TELEMETRY?.recordMedia?.({exercise:item.name,frame:1,stage:"next-preload",loadMs:performance.now()-started,decodeMs:0,ok:false}),{once:true});
  document.head.appendChild(link);
}

function observeCinematicMedia(root,item){
  root?.querySelectorAll("img[data-cinematic-frame]").forEach((img,index)=>{
    let recorded=false;
    const started=performance.now();
    const finish=async ok=>{
      if(recorded)return;recorded=true;
      const decodeStarted=performance.now();
      if(ok&&typeof img.decode==="function")try{await img.decode();}catch{}
      const decodeMs=performance.now()-decodeStarted;
      const resource=[...performance.getEntriesByName(img.currentSrc||img.src)].pop();
      window.REP_TELEMETRY?.recordMedia?.({exercise:item.name,frame:index+1,stage:"current",loadMs:resource?.duration||performance.now()-started,decodeMs,bytes:resource?.transferSize||0,ok});
    };
    if(img.complete)queueMicrotask(()=>finish(img.naturalWidth>0));
    else{img.addEventListener("load",()=>finish(true),{once:true});img.addEventListener("error",()=>finish(false),{once:true});}
  });
}

function exerciseVisual(item,{preview=false}={}){
  const frames=cinematicFramesFor(item);
  if(!frames.length)return anatomyVisual(item.motion);
  const asset=cinematicAssetFor(item)||frames[0];
  const guide=motionGuide[item.motion]||motionGuide.march,ar=state.lang==="ar";
  const mediaKey=asset.split("/").pop().replace(/\.webp$/,""),scene=mediaKey.split("-")[0];
  const frameMarkup=frames.map((src,index)=>`<img class="cinematic-frame cinematic-frame-${index+1}" data-cinematic-frame="${index+1}" src="${src}" alt="" ${preview?'loading="lazy" fetchpriority="low"':index===0?'fetchpriority="high"':'loading="eager" fetchpriority="low"'} decoding="async">`).join("");
  return `<div class="cinematic-motion motion-${item.motion} scene-${scene} media-${mediaKey} ${frames.length>1?"is-multi-frame":""} ${state.paused?"is-paused":""} ${state.muscles?"":"muscles-off"}" style="--loop-speed:${8/state.speed}s" data-frame-count="${frames.length}">
    ${frameMarkup}
    <span class="cinematic-light" aria-hidden="true"></span>
    <span class="phase-pill"><i></i> ${ar?"عرض حركي":"BIOMECHANICS"}</span>
    <span class="guide-callout">${guide[ar?1:0]}</span>
    ${motionPhaseRail()}
  </div>`;
}

function anatomyVisual(motion) {
  const [atlas,size,a,b,musclesEn,flip,musclesAr] = anatomy[motion] || anatomy.march;
  const muscles = state.lang==="ar"?(musclesAr||musclesEn):musclesEn;
  const ratios = { gym:"1 / 1", mobility:"3 / 5", core:"8 / 9", cardio:"1 / 1" };
  const u=REP_I18N[state.lang].ui, guide=motionGuide[motion]||motionGuide.march;
  const phaseRail=motionPhaseRail();
  if(motion in motionAtlasRows){
    const row=motionAtlasRows[motion], y=(row/6*100).toFixed(3);
    return `<div class="anatomy-motion sprite-motion motion-${motion} ${state.paused?"is-paused":""} ${state.muscles?"":"muscles-off"}" style="--row:${y}%;--loop-speed:${3.6/state.speed}s">
      <span class="media-ambient" aria-hidden="true"><i class="sprite-frame"></i></span><i class="sprite-frame media-focus-frame" aria-hidden="true"></i><span class="motion-path" aria-hidden="true"><i></i></span><span class="range-warning" aria-hidden="true"></span>
      <span class="muscle-callout"><b>${u.active}</b>${muscles}</span><span class="phase-pill"><i></i> 6 ${state.lang==="ar"?"إطارات":"KEY FRAMES"}</span>
      <span class="guide-callout">${guide[state.lang==="ar"?1:0]}</span>${phaseRail}
    </div>`;
  }
  const atlasFile=`assets/${atlas}-anatomy${state.viewMode==="front"?"-front":""}-atlas.webp`;
  return `<div class="anatomy-motion motion-${motion} ${flip?"flip-b":""} ${state.paused?"is-paused":""} ${state.muscles?"":"muscles-off"}" style="--atlas-size:${size};--cell-ratio:${ratios[atlas]};--loop-speed:${4/state.speed}s">
    <span class="media-ambient" aria-hidden="true"><i class="anatomy-frame frame-a" style="background-image:url('${atlasFile}');background-position:${a}"></i><i class="anatomy-frame frame-b" style="background-image:url('${atlasFile}');background-position:${b}"></i></span>
    <i class="anatomy-frame frame-a media-focus-frame" style="background-image:url('${atlasFile}');background-position:${a}"></i><i class="anatomy-frame frame-b media-focus-frame" style="background-image:url('${atlasFile}');background-position:${b}"></i>
    <span class="motion-path" aria-hidden="true"><i></i></span><span class="range-warning" aria-hidden="true"></span>
    <span class="muscle-callout"><b>${u.active}</b>${muscles}</span><span class="phase-pill"><i></i> ${u.startFinish}</span>
    <span class="guide-callout">${guide[state.lang==="ar"?1:0]}</span>${phaseRail}
  </div>`;
}

function localDay(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");}
function shiftLocalDay(days){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+days);return localDay(date);}
function shiftDateKey(key,days){const [year,month,date]=String(key).slice(0,10).split("-").map(Number),value=new Date(year,month-1,date,12);value.setDate(value.getDate()+days);return localDay(value);}
const storageKey = "rep-gym-companion-v1";
const saved = window.REP_HYDRATED_STATE || JSON.parse(localStorage.getItem(storageKey) || "{}");
const state = {
  view: "home", activeTab:saved.activeTab||"home", session: saved.session || null, index: saved.index || 0,
  completed: saved.completed || {}, muted: saved.muted || false, lang:saved.lang||"en",
  speed:saved.speed||1, paused:saved.paused||false, muscles:saved.muscles!==false, viewMode:saved.viewMode||"side",
  logs:saved.logs||{}, swaps:saved.swaps||{}, history:saved.history||[], sessionStartedAt:saved.sessionStartedAt||null,
  reviews:saved.reviews||{}, fieldTest:saved.fieldTest||{}, voice:saved.voice!==false,
  syncQueue:saved.syncQueue||[], syncState:"idle", recoveryCheckins:saved.recoveryCheckins||[],
  daily:saved.daily||{nutrition:{},hygiene:{}}, habitOrder:Array.isArray(saved.habitOrder)?saved.habitOrder:[], cardioDraft:saved.cardioDraft||{}, programStart:saved.programStart||localDay(),
  foodEntries:saved.foodEntries||[], water:saved.water||{}, foodDraft:null, foodNote:saved.foodNote||"", foodMealType:saved.foodMealType||"", foodLogMethod:saved.foodLogMethod||"Ingredients", foodBusy:false, foodPendingPayload:null,
  bodyWeights:saved.bodyWeights||[], mealTemplates:saved.mealTemplates||[], sleepLogs:saved.sleepLogs||[],
  healthMetrics:saved.healthMetrics||{}, vitalsImportRuns:saved.vitalsImportRuns||{},
  pairBusy:false, pairMessage:"", reminderExpanded:{}, newTemplateOpen:false,
  lastBackupAt:saved.lastBackupAt||null, backupSnoozedUntil:saved.backupSnoozedUntil||null,
  pushTime:saved.pushTime||"20:00", pushEndpoint:saved.pushEndpoint||null,
  activeEnergy:saved.activeEnergy||{}, lastVitalsImportDate:saved.lastVitalsImportDate||null, lastVitalsImportAt:saved.lastVitalsImportAt||null,
  vitalsDraft:null, vitalsBusy:false, vitalsStatus:"", vitalsError:false, vitalsImportStatus:"", vitalsImportError:false,
  previewMode: false,
  timer: null, exerciseTimer:null, sessionClock:null, touchX: null, wakeLock:null
};
window.state=state;
window.sessions=sessions;
const syncKeyStorage="rep-notion-pairing-key-v1";
const repAuth=window.REP_AUTH;
const app = document.querySelector("#app");
let enterRaf = null;
new MutationObserver(()=>{
  if(enterRaf) return;
  enterRaf = requestAnimationFrame(()=>{
    enterRaf = null;
    app.classList.remove("view-enter");
    void app.offsetWidth;
    app.classList.add("view-enter");
  });
}).observe(app,{childList:true});
const timerDock = document.querySelector("#timerDock");
const timerNextPreview = document.querySelector("#timerNextPreview");
let exerciseTransitioning = false;

let previewSnapshot = null;
function togglePreviewMode(){
  const ar = state.lang === "ar";
  if(!state.previewMode){
    previewSnapshot = JSON.parse(JSON.stringify({
      completed: state.completed,
      logs: state.logs,
      history: state.history,
      daily: state.daily,
      foodEntries: state.foodEntries,
      water: state.water,
      bodyWeights: state.bodyWeights,
      sleepLogs: state.sleepLogs,
      recoveryCheckins: state.recoveryCheckins,
      sessionStartedAt: state.sessionStartedAt,
      session: state.session,
      index: state.index,
      view: state.view,
      activeTab: state.activeTab,
      swaps: state.swaps,
      reviews: state.reviews,
      fieldTest: state.fieldTest
    }));
    state.previewMode = true;
    updatePreviewUI();
    showToast(ar ? "🔬 تم تفعيل وضع المعاينة: لن يُحسب أو يُحفظ أي شيء تقوم به!" : "🔬 Preview Mode ON: Nothing you do will be saved or calculated.");
  } else {
    if(previewSnapshot){
      Object.assign(state, JSON.parse(JSON.stringify(previewSnapshot)));
    }
    state.previewMode = false;
    previewSnapshot = null;
    updatePreviewUI();
    showToast(ar ? "تم إنهاء وضع المعاينة واستعادة البيانات الأصلية." : "Exited Preview Mode: Original data restored.");
    if(state.view === "player") renderExercise();
    else if(state.view === "nutrition") renderNutrition();
    else if(state.view === "vitals") renderVitals();
    else if(state.view === "settings" && window.renderRepSettings) window.renderRepSettings();
    else renderHome();
  }
}
window.togglePreviewMode = togglePreviewMode;

function updatePreviewUI(){
  const btn = document.querySelector("#previewModeButton");
  const existing = document.querySelector("#previewBanner");
  const ar = state.lang === "ar";
  if(state.previewMode){
    btn?.classList.add("is-active");
    btn?.setAttribute("aria-pressed", "true");
    if(!existing){
      const banner = document.createElement("div");
      banner.className = "preview-mode-banner";
      banner.id = "previewBanner";
      banner.innerHTML = REP_SAFE_DOM.sanitize(`
        <div class="preview-banner-inner" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;">
          <span style="font-size:11px;font-weight:900;letter-spacing:.02em;display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;">🔬</span>
            <span><strong>${ar?"وضع المعاينة (تجريبي)":"PREVIEW MODE"}</strong> · ${ar?"لن يُحفظ أي تمرين أو وجبة أو عادة":"No workouts, meals, or habits will be saved"}</span>
          </span>
          <button type="button" id="exitPreviewBannerBtn" style="background:#0b0d0c;color:var(--acid);border:1px solid var(--acid);padding:4px 10px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap;">${ar?"إنهاء المعاينة ✕":"Exit Preview ✕"}</button>
        </div>
      `);
      document.querySelector(".topbar")?.insertAdjacentElement("afterend", banner);
      document.querySelector("#exitPreviewBannerBtn")?.addEventListener("click", togglePreviewMode);
    }
  } else {
    btn?.classList.remove("is-active");
    btn?.setAttribute("aria-pressed", "false");
    existing?.remove();
  }
}

function persist() {
  if (state.previewMode) return;
  window.REP_STORE?.persist(storageKey,{ version:6, guideVersion:REP_HEALTH_GUIDE.version, activeTab:state.activeTab, session: state.session, index: state.index, completed: state.completed, muted: state.muted, checkin: saved.checkin || {}, lang:state.lang, speed:state.speed, paused:state.paused, muscles:state.muscles, viewMode:state.viewMode, logs:state.logs, swaps:state.swaps, history:state.history, sessionStartedAt:state.sessionStartedAt, reviews:state.reviews, fieldTest:state.fieldTest, voice:state.voice, syncQueue:state.syncQueue, recoveryCheckins:state.recoveryCheckins, daily:state.daily, habitOrder:state.habitOrder, cardioDraft:state.cardioDraft, programStart:state.programStart, foodEntries:state.foodEntries, water:state.water, foodNote:state.foodNote, foodMealType:state.foodMealType, foodLogMethod:state.foodLogMethod, lastBackupAt:state.lastBackupAt, backupSnoozedUntil:state.backupSnoozedUntil, bodyWeights:state.bodyWeights, mealTemplates:state.mealTemplates, sleepLogs:state.sleepLogs, healthMetrics:state.healthMetrics, vitalsImportRuns:state.vitalsImportRuns, pushTime:state.pushTime, pushEndpoint:state.pushEndpoint, activeEnergy:state.activeEnergy, lastVitalsImportDate:state.lastVitalsImportDate, lastVitalsImportAt:state.lastVitalsImportAt });
}
let persistTimer=null;
function persistDebounced(){
  if (state.previewMode) return;
  if(persistTimer)clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{persistTimer=null;persist();},400);
}
function flushPersist(){if(state.previewMode)return;if(persistTimer){clearTimeout(persistTimer);persistTimer=null;persist();}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushPersist();});
addEventListener("beforeunload",flushPersist);
function U(){return REP_I18N[state.lang].ui;}
function sessionText(id,s){const v=REP_I18N[state.lang].sessions[id];return {name:v?.[0]||s.name,meta:v?.[1]||s.meta,description:v?.[2]||s.description};}
function localizedItem(item){
  if(state.lang!=="ar") return item;
  const a=REP_I18N.ar.exercises[item.name]; if(!a)return item;
  const units=s=>String(s).replaceAll("min","دقيقة").replaceAll("sec","ثانية").replaceAll("side","جهة").replaceAll("rest","راحة").replaceAll("hold","ثبات").replaceAll("release","استرخاء").replace("Light resistance","مقاومة خفيفة").replace("Easy pace","سرعة سهلة").replace("squeeze","ضغط");
  const translate=(s,dict)=>dict[s]||units(s);
  return {...item,name:a[0],baseName:item.name,prescription:translate(item.prescription,PRESCRIPTION_AR),intensity:translate(item.intensity,INTENSITY_AR),setup:a[1],execution:a[2],cues:a[3],avoid:a[4]};
}
function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function currentDay() { return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]; }
function todayPlan(day) {
  if (["Sunday","Tuesday","Thursday"].includes(day)) return state.lang==="ar"?"تنشيط + جيم":"Activation + Gym";
  if (day === "Monday") return state.lang==="ar"?"تنشيط + كرة قدم":"Activation + Football";
  if (day === "Wednesday") return state.lang==="ar"?"تنشيط + بادل":"Activation + Padel";
  if (day === "Friday") return state.lang==="ar"?"راحة":"Rest";
  return state.lang==="ar"?"استشفاء نشط + سبا":"Active recovery + Spa";
}
function isoDay(){return localDay();}
function latestRecovery(){return state.recoveryCheckins[0]||null;}
function recoveryFlags(c){return c?(Number(c.soreness)>=4?1:0)+(Number(c.energy)<=2?1:0)+(Number(c.sleep)<REP_HEALTH_GUIDE.rules.minimumSleepHours?1:0)+(c.pain?1:0):0;}
function recoveryGate(){const c=latestRecovery();if(!c)return {flags:0,hold:false,stale:true};const age=(Date.now()-new Date(c.date).getTime())/86400000;const flags=recoveryFlags(c);return {flags,hold:age<=10&&flags>=REP_HEALTH_GUIDE.rules.redFlagThreshold,stale:age>10};}
function programStatus(){
  const week=Math.max(1,Math.floor((Date.now()-new Date(state.programStart).getTime())/604800000)+1),gym=state.history.filter(h=>h.session==="gym").slice(0,2),stalled=[];
  if(gym.length===2){const names=["Leg Press","Back Extension","Hip Thrust Machine","Chest Press","Seated Cable Row","Lat Pulldown"];for(const name of names){const score=h=>Math.max(0,...setsFromLog(h.loads?.[name]).map(s=>(Number(s.weight)||0)*(Number(s.reps)||0)));if(score(gym[0])&&score(gym[0])<=score(gym[1]))stalled.push(name);}}
  return {week,stalled,review:week>=REP_HEALTH_GUIDE.rules.reviewWeek||stalled.length>=2};
}
function healthStatusStrip(){const gate=recoveryGate(),program=programStatus(),ar=state.lang==="ar";let label=ar?"جاهز للتقدم":"Progress available",tone="good";if(gate.hold){label=ar?`${gate.flags} علامات خطر · ثبّت الحمل`:`${gate.flags} red flags · hold load`;tone="hold";}else if(program.review){label=ar?"موعد مراجعة البرنامج":"Program review due";tone="review";}return `<section class="health-status ${tone}"><div><small>${ar?"قرار اليوم":"TODAY'S GATE"}</small><strong>${label}</strong></div><span>${ar?`الأسبوع ${program.week}`:`Week ${program.week}`} · v${REP_HEALTH_GUIDE.version}</span></section>`;}

function hasMeaningfulData(){return state.history.length>0||state.foodEntries.length>0||state.recoveryCheckins.length>0||state.bodyWeights.length>0||state.mealTemplates.length>0||state.sleepLogs.length>0||Object.keys(state.logs||{}).length>0||Object.keys(state.daily?.hygiene||{}).length>0||Object.keys(state.daily?.habits||{}).length>0;}
function notionProtected(){return Boolean(localStorage.getItem(syncKeyStorage))&&!["failed","auth"].includes(state.syncState);}
function needsBackupReminder(){
  if(!hasMeaningfulData())return false;
  if(state.backupSnoozedUntil&&new Date(state.backupSnoozedUntil)>new Date())return false;
  const thresholdDays=notionProtected()?30:7;
  if(!state.lastBackupAt)return true;
  return (Date.now()-new Date(state.lastBackupAt).getTime())/86400000>=thresholdDays;
}
function backupReminderStrip(){
  if(!needsBackupReminder())return "";
  const ar=state.lang==="ar",neverBacked=!state.lastBackupAt;
  const sub=notionProtected()?(ar?"متصل بـNotion، لكن الإعدادات والملاحظات المحلية لا تُنسخ إلا بالتصدير.":"Notion is connected, but local settings and drafts are only saved by exporting."):(ar?"بياناتك محفوظة على هذا الجهاز فقط. نسخة ضائعة تعني بداية من الصفر.":"Your data lives only on this device. Losing it means starting from zero.");
  return `<section class="backup-reminder"><div><small>${ar?"نسخة احتياطية":"BACKUP"}</small><strong>${neverBacked?(ar?"لم تُصدَّر نسخة احتياطية بعد":"You've never exported a backup"):(ar?"حان وقت نسخة احتياطية جديدة":"Time for a fresh backup")}</strong><p>${sub}</p></div><div class="backup-reminder-actions"><button data-backup-export>${ar?"تصدير الآن":"Export now"}</button><button data-backup-snooze>${ar?"ذكّرني لاحقاً":"Remind me later"}</button></div></section>`;
}
window.backupReminderStrip=backupReminderStrip;
function snoozeBackupReminder(){state.backupSnoozedUntil=new Date(Date.now()+7*86400000).toISOString();persist();renderHome();}

// --- Daily reminders -------------------------------------------------------
// Each entry decides for itself whether it is still outstanding today. Time
// gates keep the list quiet early in the day so it only nags once an item is
// genuinely late.
function openReminders(){
  const ar=state.lang==="ar",hour=new Date().getHours(),list=[];
  const profile=foodProfile(),meals=todayFoodEntries();
  if(hour>=11&&meals.length===0)list.push({id:"food",tab:"food",label:ar?"لم تسجّل أي وجبة اليوم":"No meals logged today"});
  else if(hour>=20&&meals.length<2)list.push({id:"food",tab:"food",label:ar?"سجّل بقية وجبات اليوم":"Log the rest of today's meals"});
  const suppTotal=supplementList().length,suppDone=supplementsDone();
  if(hour>=12&&suppTotal&&suppDone<suppTotal)list.push({id:"supplements",tab:"food",label:ar?`المكملات ${suppDone}/${suppTotal}`:`Supplements ${suppDone}/${suppTotal} taken`});
  const water=Number(state.water[isoDay()])||0,waterGoal=profile.water;
  if(hour>=14&&waterGoal&&water<waterGoal*.5)list.push({id:"water",tab:"food",label:ar?`الماء ${Math.round(water/1000*10)/10} من ${waterGoal/1000} لتر`:`Water ${Math.round(water/1000*10)/10} of ${waterGoal/1000} L`});
  if(!currentWeekWeight()&&[5,6,0].includes(new Date().getDay()))list.push({id:"weight",tab:"food",label:ar?"وزن هذا الأسبوع غير مسجل":"This week's weigh-in is missing"});
  const bucket=dailyBucket("hygiene"),careDone=Object.values(bucket.checked||{}).filter(Boolean).length;
  if(hour>=21&&careDone===0)list.push({id:"care",tab:"care",label:ar?"روتين العناية لم يبدأ بعد":"Daily care not started"});
  return list;
}
function remindersForTab(tab){return openReminders().filter(item=>item.tab===tab);}
function reminderStrip(tab){
  const items=remindersForTab(tab);if(!items.length)return "";
  const ar=state.lang==="ar",collapseAt=2,expanded=state.reminderExpanded[tab]||items.length<=collapseAt,visible=expanded?items:items.slice(0,collapseAt),hidden=items.length-visible.length;
  const toggle=hidden>0?`<button class="reminder-toggle" data-reminder-toggle="${tab}">${ar?`+${hidden} أخرى ↓`:`+${hidden} more ↓`}</button>`:items.length>collapseAt?`<button class="reminder-toggle" data-reminder-toggle="${tab}">${ar?"عرض أقل ↑":"Show less ↑"}</button>`:"";
  return `<section class="reminder-strip"><div class="reminder-head"><small>${ar?"متبقٍ اليوم":"STILL OPEN TODAY"}</small><b>${items.length}</b></div><div class="reminder-items">${visible.map(item=>`<button data-reminder-tab="${item.tab}"><span>${esc(item.label)}</span><i>→</i></button>`).join("")}</div>${toggle}</section>`;
}

// --- Cross-module insights -------------------------------------------------
// Reads across weight, recovery, training and nutrition so patterns that span
// modules get stated out loud instead of living in four separate screens.
function buildInsights(){
  const ar=state.lang==="ar",out=[];
  const weights=[...state.bodyWeights].sort((a,b)=>b.week.localeCompare(a.week));
  if(weights.length>=3){
    const recent=weights.slice(0,3),change=Math.round((recent[0].kg-recent[2].kg)*10)/10;
    if(Math.abs(change)<.3)out.push({tone:"flat",text:ar?`الوزن ثابت خلال 3 أسابيع (${recent[0].kg} كجم). إن كان الهدف تغييره، عدّل السعرات أو الحجم التدريبي.`:`Weight has been flat for 3 weeks (${recent[0].kg} kg). If you want it to move, adjust calories or training volume.`});
    else out.push({tone:change<0?"down":"up",text:ar?`الوزن ${change<0?"انخفض":"ارتفع"} ${Math.abs(change)} كجم خلال 3 أسابيع.`:`Weight is ${change<0?"down":"up"} ${Math.abs(change)} kg over 3 weeks.`});
  }
  const recent=state.recoveryCheckins.slice(0,3),flagged=recent.filter(c=>recoveryFlags(c)>=2).length;
  if(recent.length>=2&&flagged>=2)out.push({tone:"warn",text:ar?"آخر مراجعتين للاستشفاء تحملان علامات خطر. خفّف الحمل قبل زيادة الأوزان.":"Two of your recent recovery check-ins carried red flags. Ease the load before adding weight."});
  const weekAgoStr=shiftDateKey(isoDay(),-7);
  const sessions7=state.history.filter(h=>String(h.date||"").slice(0,10)>=weekAgoStr).length;
  if(state.history.length)out.push({tone:sessions7>=3?"good":"flat",text:ar?`${sessions7} حصص خلال 7 أيام.`:`${sessions7} session${sessions7===1?"":"s"} in the last 7 days.`});
  const days=new Set(state.foodEntries.slice(0,100).filter(e=>String(e.date||"").slice(0,10)>=weekAgoStr).map(e=>String(e.date).slice(0,10))).size;
  if(days)out.push({tone:days>=5?"good":"flat",text:ar?`سجّلت الطعام في ${days} من آخر 7 أيام.`:`Food logged on ${days} of the last 7 days.`});
  if(weights.length>=3&&sessions7>=3&&state.history.length){
    const change=Math.round((weights[0].kg-weights[2].kg)*10)/10;
    if(Math.abs(change)<.3&&days<4)out.push({tone:"warn",text:ar?"الوزن ثابت مع تدريب منتظم، لكن تسجيل الطعام متقطع — البيانات الغذائية غير كافية لتفسير السبب.":"Weight is flat while training is consistent, but food logging is patchy — there isn't enough nutrition data to explain why."});
  }
  const sleepAvg=recentSleepAvg(7),minSleep=REP_HEALTH_GUIDE.rules.minimumSleepHours;
  if(sleepAvg!==null)out.push({tone:sleepAvg<minSleep?"warn":"good",text:sleepAvg<minSleep?(ar?`متوسط النوم ${sleepAvg} ساعة خلال 7 أيام — أقل من الحد الأدنى ${minSleep} ساعات.`:`Sleep has averaged ${sleepAvg}h over 7 days — below your ${minSleep}h minimum.`):(ar?`متوسط النوم ${sleepAvg} ساعة خلال 7 أيام — عند الهدف أو أعلى.`:`Sleep has averaged ${sleepAvg}h over 7 days — at or above target.`)});
  const todayRecovery=computeRecoveryScore(),yesterdayStrain=computeStrainScore(shiftLocalDay(-1));
  if(todayRecovery?.band==="red"&&yesterdayStrain>=14)out.push({tone:"warn",text:ar?`استشفاء منخفض (${todayRecovery.score}%) بعد يوم إجهاد عالٍ أمس (${yesterdayStrain}). خذ يوماً أخف اليوم.`:`Low recovery (${todayRecovery.score}%) after a high-strain day yesterday (${yesterdayStrain}). Take it lighter today.`});
  const last7=Array.from({length:7},(_,i)=>{const d=shiftLocalDay(-(6-i));return {strain:computeStrainScore(d),recovery:computeRecoveryScore(d)};});
  const strainedDays=last7.filter(d=>d.strain>=14),strainedNotGreen=strainedDays.filter(d=>d.recovery&&d.recovery.band!=="green").length;
  if(strainedNotGreen>=3)out.push({tone:"warn",text:ar?`${strainedNotGreen} أيام من آخر 7 جمعت بين إجهاد مرتفع واستشفاء غير جاهز (أصفر أو أحمر). هذا النمط الأسبوعي هو ما يؤدي للإرهاق فعلياً — فكّر في أسبوع أخف أو يوم راحة إضافي قريباً.`:`${strainedNotGreen} of the last 7 days combined high strain with recovery that wasn't green. That weekly pattern — not any single hard day — is what actually compounds into burnout. Consider a lighter week or an extra rest day soon.`});
  else if(strainedDays.length>=3&&strainedNotGreen===0)out.push({tone:"good",text:ar?"عدة أيام إجهاد مرتفع هذا الأسبوع والاستشفاء ظل جاهزاً (أخضر) — التوازن بين الحمل والراحة جيد الآن.":"Several high-strain days this week and recovery has stayed green — load and recovery are well balanced right now."});
  return out;
}
function sparklineSvg(points,{width=280,height=64,color="var(--acid)"}={}){
  if(points.length<2)return "";
  const min=Math.min(...points),max=Math.max(...points),range=max-min||1,stepX=width/(points.length-1);
  const coords=points.map((v,i)=>`${Math.round(i*stepX*10)/10},${Math.round((height-(v-min)/range*height)*10)/10}`);
  const last=coords.at(-1).split(",");
  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-hidden="true"><polyline points="${coords.join(" ")}" fill="none" style="stroke:${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" style="fill:${color}"/></svg>`;
}
function barChartSvg(bars,{width=280,height=64,color="var(--acid)",gap=6}={}){
  if(!bars.length)return "";
  const max=Math.max(...bars,1),barWidth=(width-gap*(bars.length-1))/bars.length;
  const rects=bars.map((v,i)=>{const h=Math.max(2,Math.round(v/max*height)),x=Math.round(i*(barWidth+gap)*10)/10,y=height-h;return `<rect x="${x}" y="${y}" width="${Math.round(barWidth*10)/10}" height="${h}" rx="2" style="fill:${color}"/>`;}).join("");
  return `<svg class="trend-chart trend-bars" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-hidden="true">${rects}</svg>`;
}
function trendCard(ar,{kicker,title,points,unit,color,emptyText}){
  if(points.length<2)return `<article class="trend-card"><span class="card-kicker">${kicker}</span><h2>${title}</h2><p class="trend-empty">${emptyText}</p></article>`;
  const first=points[0],last=points.at(-1),delta=Math.round((last-first)*10)/10,deltaText=delta>0?`+${delta}`:delta===0?"±0":`${delta}`;
  return `<article class="trend-card"><span class="card-kicker">${kicker}</span><h2>${title}</h2><div class="trend-head"><strong>${last}${unit}</strong><small class="${delta>0?"up":delta<0?"down":""}">${deltaText}${unit} · ${ar?"منذ أول تسجيل":"since first entry"}</small></div>${sparklineSvg(points,{color})}</article>`;
}
function weeklyTrainingVolume(weeks=6){
  const now=Date.now(),buckets=[];
  for(let i=weeks-1;i>=0;i--){
    const end=now-i*7*86400000,start=end-7*86400000;
    buckets.push(state.history.filter(h=>{const t=new Date(h.date).getTime();return t>start&&t<=end;}).reduce((n,h)=>n+(h.calories||0),0));
  }
  return buckets;
}
function metricGuideCard(ar){
  const items=[
    {color:"#7dc9ff",title:ar?"النوم":"Sleep performance",text:ar?"نسبة ما نمته الليلة الماضية مقابل حاجتك الشخصية من النوم — 100% تعني أنك استوفيت الحاجة. الحاجة نفسها ليست رقماً ثابتاً: تُبنى من متوسط نومك المتجدد على 14 يوماً، وتزيد مع إجهاد الأمس ودَين النوم المتراكم من ليالٍ قصيرة.":"How much of your personal sleep need you actually got last night. 100% means you met it — the need itself isn't a fixed number, it's your rolling 14-day average, adjusted up by yesterday's training strain and any sleep debt from recent short nights."},
    {color:"var(--acid)",title:ar?"الاستشفاء":"Recovery",text:ar?"مدى جاهزية جسمك اليوم، مبني من أداء النوم وتقلب معدل ضربات القلب ونبض الراحة ومعدل التنفس — كل واحد يُقارَن بخط أساسك الشخصي، لا بمعيار عام. أخضر يعني جاهز للدفع، أصفر يعني خفف الحمل قليلاً، أحمر يعني أعطِ الجسم وقتاً. في الأيام الأولى ستظهر كلمة «لا يزال يُعاير»: خطوط الأساس لتقلب القلب والنبض تحتاج 3 ليالٍ سابقة على الأقل، وحتى ذلك الحين تُبنى النتيجة من النوم وحده.":"How ready your body is today, blended from sleep performance plus HRV, resting heart rate, and respiratory rate — each compared against your own recent baseline, not a generic norm. Green means push, yellow means ease off, red means prioritize rest. In your first days it will read \"Still calibrating\": the HRV and heart-rate baselines need at least 3 prior nights, so until then the score rests on sleep alone and shouldn't be read as settled."},
    {color:"var(--blue)",title:ar?"الإجهاد":"Strain",text:ar?"مقياس من 0 إلى 21 لمقدار الحمل القلبي الذي تحمّله جسمك اليوم، من جهد التمارين المسجلة بالإضافة إلى النشاط العرضي من ساعتك. ليس جيداً أو سيئاً في حد ذاته — القراءة المفيدة هي مقارنته بالاستشفاء: إجهاد مرتفع بعد استشفاء منخفض هو ما يسبب الإرهاق فعلياً.":"A 0–21 scale of how much cardiovascular load today has put on your body — from logged training effort plus incidental activity from your Watch. It isn't good or bad by itself; the useful read is against Recovery. High strain stacked on low recovery, repeatedly, is what actually drives burnout — not a single hard day."}
  ];
  return `<details class="insights-card metric-guide"><summary>${ar?"ماذا تعني هذه الأرقام":"What these numbers mean"}</summary><div class="metric-guide-grid">${items.map(i=>`<div class="metric-guide-item"><span class="metric-guide-dot" style="background:${i.color}"></span><div><strong>${i.title}</strong><p>${i.text}</p></div></div>`).join("")}</div></details>`;
}
function journalInsightsCard(ar){
  const results=journalCorrelations();
  return `<section class="insights-card journal-insights"><div class="insights-head"><small>${ar?"دفتر اليومية":"JOURNAL"}</small></div>
    ${results.length?`<div class="journal-correlations">${results.map(f=>{
      const bad=f.diff>0,label=ar?f.ar:f.en,impact=bad?-f.diff:Math.abs(f.diff);
      const text=bad
        ?(ar?`الاستشفاء أقل بمعدل ${f.diff} نقطة في الليالي التي تضمنت: ${label}.`:`Recovery averages ${f.diff}pp lower on nights with ${label.toLowerCase()}.`)
        :(ar?`الاستشفاء أعلى بمعدل ${Math.abs(f.diff)} نقطة في الليالي التي تضمنت: ${label}.`:`Recovery averages ${Math.abs(f.diff)}pp higher on nights with ${label.toLowerCase()}.`);
      return `<div class="journal-correlation"><strong class="${bad?"up":"down"}">${impact>0?"+":""}${impact}pp</strong><p>${esc(text)}</p></div>`;
    }).join("")}</div>`
    :`<p class="journal-empty">${ar?"سجّل دفتر اليومية من تبويب الحيوية لبضعة أيام لتظهر هنا أنماط مرتبطة بالاستشفاء.":"Log the Journal from the Vitals tab for a few days, and any patterns tied to Recovery will show up here."}</p>`}</section>`;
}
function renderInsights(){
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="insights";state.activeTab="insights";persistDebounced();updatePrimaryTabs();
  const ar=state.lang==="ar",weekAgo=Date.now()-7*86400000;
  const history7=state.history.filter(h=>new Date(h.date).getTime()>=weekAgo),sessions7=history7.length;
  const appleDays7=Object.entries(state.activeEnergy||{}).filter(([day,value])=>new Date(day).getTime()>=weekAgo&&Number(value)>0),appleDates7=new Set(appleDays7.map(([day])=>day));
  const calories7=Math.round(appleDays7.reduce((sum,[,value])=>sum+Number(value),0)+history7.filter(item=>!appleDates7.has(String(item.date).slice(0,10))).reduce((sum,item)=>sum+(Number(item.calories)||0),0)),usesAppleEnergy=appleDays7.length>0;
  const foodDays7=[...new Set(state.foodEntries.map(e=>String(e.date).slice(0,10)))].filter(d=>new Date(d).getTime()>=weekAgo).length;
  const weights=[...state.bodyWeights].sort((a,b)=>b.week.localeCompare(a.week));
  const weightDelta=weights.length>=2?Math.round((weights[0].kg-weights[weights.length-1].kg)*10)/10:null;
  const weightText=weightDelta===null?(ar?"—":"—"):`${weightDelta>0?"+":""}${weightDelta} kg`;
  const horizon=state.trendHorizon||"7d";
  const horizonDays=horizon==="90d"?90:horizon==="28d"?28:7;
  const gate=recoveryGate(),items=buildInsights(),sleepAvg=recentSleepAvg(7),minSleep=REP_HEALTH_GUIDE.rules.minimumSleepHours;
  const weightPoints=[...state.bodyWeights].sort((a,b)=>a.week.localeCompare(b.week)).slice(horizon==="90d"?-24:horizon==="28d"?-12:-6).map(w=>w.kg);
  const sleepCutoff=Date.now()-horizonDays*86400000,sleepPoints=[...state.sleepLogs].filter(s=>new Date(s.date).getTime()>=sleepCutoff).sort((a,b)=>a.date.localeCompare(b.date)).map(s=>s.hours);
  const volumeBuckets=weeklyTrainingVolume(horizon==="90d"?12:horizon==="28d"?8:6);
  const todayRecovery=computeRecoveryScore(),streak=computeStreak();
  const strainCount=horizonDays>14?14:horizonDays;
  const strainBuckets=Array.from({length:strainCount},(_,i)=>computeStrainScore(shiftLocalDay(-(strainCount-1-i))));
  const recoveryPoints=[];for(let i=horizonDays-1;i>=0;i--){const r=computeRecoveryScore(shiftLocalDay(-i));if(r)recoveryPoints.push(r.score);}
  app.innerHTML=REP_SAFE_DOM.sanitize(`${moduleHeader(ar?"التحليلات":"INSIGHTS",ar?"ما تقوله بياناتك.":"What your data says.",ar?"نظرة تجمع التدريب والتغذية والاستشفاء والوزن في مكان واحد.":"One view that reads training, nutrition, recovery, and weight together.")}
  <section class="progress-overview" aria-label="${ar?"ملخص التقدم":"Progress summary"}">
    <article class="progress-feature"><span class="progress-feature-icon">${ICONS.flame}</span><div><small>${ar?"تدريب آخر 7 أيام":"LAST 7 DAYS"}</small><strong>${sessions7} <em>${ar?"حصة":"sessions"}</em></strong><p>${ar?`${streak} يوم متتالٍ`:`${streak} day streak`}</p></div></article>
    <div class="insight-stats">
      <article><small>${usesAppleEnergy?(ar?"الطاقة النشطة من أبل":"APPLE ACTIVE ENERGY"):(ar?"سعرات محروقة (تقدير)":"KCAL BURNED (EST.)")}</small><strong>${calories7}</strong></article>
      <article><small>${ar?"أيام تسجيل الطعام":"FOOD LOGGED"}</small><strong>${foodDays7}/7</strong></article>
      <article><small>${ar?"اتجاه الوزن":"WEIGHT TREND"}</small><strong>${weightText}</strong></article>
      <article><small>${ar?"متوسط النوم (7 أيام)":"SLEEP AVG (7D)"}</small><strong class="${sleepAvg!==null&&sleepAvg<minSleep?"warn":""}">${sleepAvg!==null?`${sleepAvg}h`:"—"}</strong></article>
      <article><small>${ar?"الاستشفاء اليوم":"RECOVERY TODAY"}</small><strong class="${todayRecovery?(todayRecovery.band==="red"?"warn":""):(gate.hold?"warn":"")}">${todayRecovery?`${todayRecovery.score}%`:(gate.hold?(ar?"ثبّت":"Hold"):"—")}</strong></article>
    </div>
  </section>
  <div class="section-title progress-section-title">
    <h2>${ar?"الاتجاهات":"Trends"}</h2>
    <div class="time-horizon-selector" role="group" aria-label="${ar?"المدى الزمني":"Time horizon"}">
      <button data-trend-horizon="7d" class="${horizon==="7d"?"is-active":""}">7D</button>
      <button data-trend-horizon="28d" class="${horizon==="28d"?"is-active":""}">28D</button>
      <button data-trend-horizon="90d" class="${horizon==="90d"?"is-active":""}">90D</button>
    </div>
  </div>
  <section class="trends-grid">
    ${trendCard(ar,{kicker:ar?`كجم · آخر ${weightPoints.length} أسابيع`:`KG · LAST ${weightPoints.length} WEEKS`,title:ar?"اتجاه الوزن":"Weight trend",points:weightPoints,unit:" kg",color:"var(--blue)",emptyText:ar?"سجّل وزنك لبضعة أسابيع لرؤية الاتجاه.":"Log your weight for a few weeks to see a trend."})}
    ${trendCard(ar,{kicker:ar?`ساعات · آخر ${horizonDays} يوماً`:`HOURS · LAST ${horizonDays} DAYS`,title:ar?"اتجاه النوم":"Sleep trend",points:sleepPoints,unit:"h",color:"#7dc9ff",emptyText:ar?"سجّل نومك لبضع ليالٍ لرؤية الاتجاه.":"Log a few nights of sleep to see a trend."})}
    ${trendCard(ar,{kicker:ar?`% · آخر ${horizonDays} يوماً`:`% · LAST ${horizonDays} DAYS`,title:ar?"اتجاه الاستشفاء":"Recovery trend",points:recoveryPoints,unit:"%",color:"var(--acid)",emptyText:ar?"سجّل نومك ومراجعتك لرؤية الاتجاه.":"Log sleep and check-ins to see a trend."})}
    <article class="trend-card"><span class="card-kicker">${ar?`مقياس 0–21 · آخر ${strainCount} أيام`:`0–21 SCALE · LAST ${strainCount} DAYS`}</span><h2>${ar?"الإجهاد اليومي":"Daily strain"}</h2>${strainBuckets.some(v=>v>0)?barChartSvg(strainBuckets,{color:"var(--blue)"}):`<p class="trend-empty">${ar?"سجّل حصة لرؤية الإجهاد اليومي.":"Log a session to see daily strain."}</p>`}</article>
    <article class="trend-card"><span class="card-kicker">${ar?"سعرات محروقة أسبوعياً · تقدير":"KCAL BURNED PER WEEK · EST."}</span><h2>${ar?"حجم التدريب":"Training volume"}</h2>${volumeBuckets.some(v=>v>0)?barChartSvg(volumeBuckets,{color:"#ffd36a"}):`<p class="trend-empty">${ar?"أكمل بضع حصص لرؤية النمط الأسبوعي.":"Complete a few sessions to see the weekly pattern."}</p>`}</article>
  </section>
  ${window.REP_MUSCLE_HEATMAP ? window.REP_MUSCLE_HEATMAP.renderHeatmapCard(state, ar) : ""}
  ${metricGuideCard(ar)}
  ${journalInsightsCard(ar)}
  <section class="insights-card"><div class="insights-head"><small>${ar?"ملخص عام":"WHAT THE DATA SAYS"}</small></div>${items.length?items.map(i=>`<p class="insight insight-${i.tone}">${esc(i.text)}</p>`).join(""):`<p class="insight-empty">${ar?"سجّل تمارين وطعاماً ووزناً لبضعة أيام لتظهر هنا ملاحظات تلقائية.":"Log a few more days of training, food, and weight, and automatic observations will show up here."}</p>`}</section>`);
  document.querySelectorAll("[data-trend-horizon]").forEach(btn=>{btn.onclick=()=>{state.trendHorizon=btn.dataset.trendHorizon;persist();renderInsights();};});
}
function updatePrimaryTabs(){document.querySelectorAll("[data-app-tab]").forEach(button=>{const active=button.dataset.appTab===state.activeTab;button.setAttribute("aria-current",active?"page":"false");const labels={home:state.lang==="ar"?"اليوم":"Today",train:state.lang==="ar"?"التدريب":"Training",food:state.lang==="ar"?"التغذية":"Nutrition",care:state.lang==="ar"?"العناية":"Wellness",insights:state.lang==="ar"?"التحليلات":"Insights",vitals:state.lang==="ar"?"الحيوية":"Vitals"};button.querySelector("span").textContent=labels[button.dataset.appTab];});}
function focusViewHeading(){
  requestAnimationFrame(()=>{const heading=app.querySelector("h1");if(!heading)return;heading.tabIndex=-1;heading.focus({preventScroll:true});scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});
}
function vibrateGym(type="set"){
  if(!navigator.vibrate)return;
  const patterns={
    set:[40,50,40],
    timer:[100,60,100,60,200],
    pr:[150,50,150,50,350],
    habit:[35,45,35]
  };
  navigator.vibrate(patterns[type]||patterns.set);
}

function triggerConfetti({subtle=false}={}){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=document.createElement("canvas");
  canvas.className="confetti-canvas";
  canvas.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext("2d");
  if(!ctx){canvas.remove();return;}
  const colors=["#c9ff3d","#38bdf8","#f43f5e","#fbbf24","#a855f7","#34d399"];
  const duration=subtle?700:2200;
  const pieces=Array.from({length:subtle?18:70},()=>({
    x:canvas.width/2+(Math.random()-0.5)*(subtle?90:200),
    y:canvas.height/2-50+(Math.random()-0.5)*100,
    vx:(Math.random()-0.5)*12,
    vy:-Math.random()*14-4,
    size:Math.random()*8+5,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360,
    vrot:(Math.random()-0.5)*10,
    alpha:1
  }));
  let start=performance.now();
  function animate(now){
    const elapsed=now-start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of pieces){
      p.x+=p.vx;p.y+=p.vy;p.vy+=0.35;p.rot+=p.vrot;
      p.alpha=Math.max(0,1-elapsed/duration);
      ctx.save();
      ctx.globalAlpha=p.alpha;
      ctx.translate(p.x,p.y);
      ctx.rotate((p.rot*Math.PI)/180);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*1.6);
      ctx.restore();
    }
    if(elapsed<duration)requestAnimationFrame(animate);else canvas.remove();
  }
  requestAnimationFrame(animate);
}

function showPlateCalculator(initialWeight=60,onApply=null){
  if(window.REP_PLATE_CALCULATOR?.openPlateCalculator){
    window.REP_PLATE_CALCULATOR.openPlateCalculator({
      initialWeight,
      onApply: onApply || (weight => {
        const input=document.querySelector('input[data-log="weight"]:focus')||document.querySelector('input[data-log="weight"]');
        if(input){input.value=weight;input.dispatchEvent(new Event("input",{bubbles:true}));}
      })
    });
    return;
  }
  const ar=state.lang==="ar";
  const overlay=document.createElement("div");
  overlay.className="timed-mode";
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`
    <div class="workout-preflight-panel" style="max-width:420px;margin:auto;">
      <button class="dialog-close" data-plate-close aria-label="Close">×</button>
      <small style="color:var(--acid);font-weight:900;">${ar?"حاسبة الأوزان والبار":"BARBELL PLATE CALCULATOR"}</small>
      <h2 style="margin:4px 0 12px;">${ar?"حساب الأوزان لكل جهة":"Plate Math"}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px;">
        <label><span>${ar?"الوزن الإجمالي (كجم)":"Total Target (kg)"}</span><input data-plate-total type="number" step="0.5" min="10" max="400" value="${initialWeight}"></label>
        <label><span>${ar?"وزن البار":"Barbell"}</span><select data-plate-bar><option value="20" selected>20 kg (Olympic)</option><option value="15">15 kg (Women's)</option><option value="10">10 kg (EZ Bar)</option><option value="0">0 kg (Machine/DB)</option></select></label>
      </div>
      <div data-plate-result style="background:#0c100d;border:1px solid var(--line);border-radius:14px;padding:14px;text-align:center;"></div>
    </div>
  `);
  document.body.appendChild(overlay);
  overlay.querySelector("[data-plate-close]").onclick=()=>overlay.remove();

  function updateMath(){
    const total=Number(overlay.querySelector("[data-plate-total]").value)||0;
    const bar=Number(overlay.querySelector("[data-plate-bar]").value)||0;
    const sideWeight=Math.max(0,(total-bar)/2);
    let rem=sideWeight;
    const available=[25,20,15,10,5,2.5,1.25];
    const plateCounts={};
    for(const p of available){
      const count=Math.floor(rem/p);
      if(count>0){plateCounts[p]=count;rem=Math.round((rem-count*p)*100)/100;}
    }
    const colorMap={25:"#ef4444",20:"#3b82f6",15:"#eab308",10:"#22c55e",5:"#f8fafc",2.5:"#64748b",1.25:"#94a3b8"};
    const plateItems=Object.entries(plateCounts);
    overlay.querySelector("[data-plate-result]").innerHTML=REP_SAFE_DOM.sanitize(`
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <small style="color:var(--muted);">${ar?"لكل جهة من البار":"Per side"}: <b>${sideWeight} kg</b></small>
        ${rem>0?`<span style="color:#ff8b3d;font-size:10px;">(${rem} kg unallocated)</span>`:""}
      </div>
      <div class="plate-visual-sleeve" style="display:flex;align-items:center;justify-content:center;gap:3px;min-height:75px;background:rgba(255,255,255,.03);border-radius:10px;padding:8px 12px;margin-bottom:10px;overflow-x:auto;">
        <div style="width:20px;height:12px;background:#475569;border-radius:2px;"></div>
        <div style="width:14px;height:45px;background:#94a3b8;border-radius:2px;"></div>
        ${plateItems.length?plateItems.map(([weight,count])=>Array.from({length:count},()=>`<div style="width:14px;height:${Math.max(26,Math.min(70,weight*2.6))}px;background:${colorMap[weight]};border-radius:3px;border:1px solid rgba(0,0,0,.4);box-shadow:0 2px 4px rgba(0,0,0,.4);" title="${weight} kg"></div>`).join("")).join(""):`<span style="color:var(--muted);font-size:12px;">${ar?"لا حاجة لأوزان إضافية":"Empty bar only"}</span>`}
        <div style="width:30px;height:8px;background:#64748b;border-radius:2px;"></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
        ${plateItems.map(([weight,count])=>`<span style="padding:4px 9px;border-radius:999px;font-size:11px;font-weight:850;background:${colorMap[weight]};color:#000;">${count}× ${weight}kg</span>`).join("")}
      </div>
    `);
  }
  overlay.querySelector("[data-plate-total]").oninput=updateMath;
  overlay.querySelector("[data-plate-bar]").onchange=updateMath;
  updateMath();
}

function setPrimaryTab(tab){
  state.activeTab=tab;
  persistDebounced();
  updatePrimaryTabs();
  if(tab==="home")renderOverview();
  else if(tab==="food")renderNutrition();
  else if(tab==="care")renderHygiene();
  else if(tab==="insights")renderInsights();
  else if(tab==="vitals")renderVitals();
  else renderHome();
  focusViewHeading();
}
function renderCareHub(){renderHygiene();}
// The one screen you land on every time you open the app - a single Recovery/
// Sleep/Strain glance plus today's plan, instead of the Training tab's full
// session picker. Deliberately thin: it reuses the same components Vitals and
// Training already render, rather than building parallel versions of them.
function greetingLine(ar){
  const hour=new Date().getHours();
  const key=hour<5?"night":hour<12?"morning":hour<17?"afternoon":hour<21?"evening":"night";
  return {morning:ar?"صباح الخير.":"Good morning.",afternoon:ar?"مساء الخير.":"Good afternoon.",evening:ar?"مساء الخير.":"Good evening.",night:ar?"طابت ليلتك.":"Good night."}[key];
}
function todayFuelSnippet(ar){
  const p=foodProfile(), entries=todayFoodEntries(), totals=foodTotals(entries), water=Number(state.water[isoDay()])||0;
  const cal=Math.round(totals.calories||0), calTarget=p.calories||2200, calPct=Math.min(100, Math.round(cal/calTarget*100));
  const pro=Math.round(totals.protein_g||0), proTarget=p.protein||160, proPct=Math.min(100, Math.round(pro/proTarget*100));
  const watGoal=p.water||3000, watPct=Math.min(100, Math.round(water/watGoal*100));
  return `<section class="today-fuel-card" style="margin-bottom:14px;padding:14px 16px;border:1px solid var(--line);border-radius:18px;background:var(--panel);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <small style="color:var(--muted);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">${ar?"تغذية وترطيب اليوم":"TODAY'S FUEL & HYDRATION"}</small>
        <h2 style="font-size:15px;margin:2px 0 0;">${cal} / ${calTarget} kcal <span style="font-size:12px;font-weight:700;color:var(--muted);">(${calPct}%)</span></h2>
      </div>
      <button type="button" data-goto-fuel style="padding:6px 12px;border:1px solid rgba(201,255,61,.3);border-radius:999px;background:rgba(201,255,61,.08);color:var(--acid);font-size:11px;font-weight:850;cursor:pointer;">${ar?"+ تسجيل طعام / ماء":"+ Log Meal / Water"}</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div style="padding:8px 10px;border-radius:12px;background:var(--panel-2);">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-bottom:4px;">
          <span>${ar?"البروتين":"Protein"}</span>
          <strong style="color:var(--acid);">${pro} / ${proTarget}g</strong>
        </div>
        <div style="height:5px;width:100%;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;">
          <div style="height:100%;width:${proPct}%;background:var(--acid);border-radius:99px;"></div>
        </div>
      </div>
      <div style="padding:8px 10px;border-radius:12px;background:var(--panel-2);">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-bottom:4px;">
          <span>${ar?"الماء":"Water"}</span>
          <strong style="color:var(--blue);">${window.waterDisplay ? window.waterDisplay(water) : `${water} ml`}</strong>
        </div>
        <div style="height:5px;width:100%;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;">
          <div style="height:100%;width:${watPct}%;background:var(--blue);border-radius:99px;"></div>
        </div>
      </div>
    </div>
  </section>`;
}
function renderOverview(){
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="home-overview";state.activeTab="home";persistDebounced();updatePrimaryTabs();
  const ar=state.lang==="ar",day=currentDay(),streak=computeStreak(),recovery=computeRecoveryScore(),bedtime=computeBedtimeSuggestion();
  const items=buildInsights(),note=items[0];
  const resume=REP_TRAINING_SESSION.isResumableWorkout(state,sessions);
  document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="hero home-hero"><p class="eyebrow">${ar?"اليوم":"TODAY"}${day==="Friday"?(ar?" · يوم سورة الكهف":" · Surat Al-Kahf Day"):""}</p><h1>${greetingLine(ar)}</h1><p>${recovery?(recovery.calibrating?(ar?"الاستشفاء لا يزال يُعاير — استمر بالتسجيل يومياً.":"Recovery is still calibrating — keep logging daily."):recovery.band==="green"?(ar?"استشفاؤك جيد. اليوم يوم دفع.":"Recovery looks good. Today's a day to push."):recovery.band==="yellow"?(ar?"استشفاء متوسط — اضبط الحمل وفقاً لذلك.":"Recovery is moderate — adjust load accordingly."):(ar?"استشفاء منخفض — أعطِ الجسم وقتاً اليوم.":"Recovery is low — prioritize rest today.")):(ar?"سجّل نومك لرؤية استعدادك اليوم.":"Log sleep to see today's readiness.")}</p></section>
    ${streak>=1?`<div class="streak-badge"><i>${ICONS.flame}</i><strong>${streak}</strong><span>${ar?"يوم متتالٍ":"day streak"}</span></div>`:""}
    ${strainRecoveryCard(ar)}
    <div class="today-vitals-sync-bar" style="display:flex;align-items:center;justify-content:space-between;margin:-6px 0 12px;padding:6px 12px;border-radius:12px;background:rgba(255,255,255,.03);font-size:11px;">
      <span style="color:var(--muted);">${state.vitalsImportStatus?esc(state.vitalsImportStatus):(ar?"ساعة أبل: مزامنة تلقائية جاهزة":"Apple Watch sync ready")}</span>
      <button data-check-watch-vitals type="button" style="border:0;background:transparent;color:var(--acid);font-size:11px;font-weight:850;cursor:pointer;">↻ ${ar?"فحص المزامنة":"Check sync"}</button>
    </div>
    <section class="bedtime-card"><div class="bedtime-row"><span>${ar?"موعد النوم الليلة":"BEDTIME TONIGHT"}</span><strong>${bedtime.time}</strong></div><small>${ar?`لاستيقاظ ${bedtime.wakeTime} · ${bedtime.need}h مطلوبة`:`For your ${bedtime.wakeTime} wake-up · ${bedtime.need}h needed`}</small></section>
    <section class="today-strip home-today-card"><div><span>${ar?({Sunday:"الأحد",Monday:"الاثنين",Tuesday:"الثلاثاء",Wednesday:"الأربعاء",Thursday:"الخميس",Friday:"الجمعة",Saturday:"السبت"}[day]):day}</span><strong>${todayPlan(day)}</strong></div><button data-goto-train type="button">${resume?(ar?"متابعة الحصة ←":"Resume session →"):(ar?"ابدأ خطة اليوم ←":"Start today's plan →")}</button></section>
    <div class="today-secondary-actions" style="display:flex;gap:8px;margin:-4px 0 14px;">
      <button data-today-bad-day type="button" style="flex:1;min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(217,179,255,.08);color:#d9b3ff;font-size:11px;font-weight:850;cursor:pointer;">⚡ ${ar?"يوم مرهق؟ خطة بديلة (15 د)":"Low Energy? Fallback (15m)"}</button>
      <button data-today-log-act type="button" style="min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);font-size:11px;font-weight:850;cursor:pointer;">+ ${ar?"نشاط رياضي":"Log Activity"}</button>
    </div>
    ${todayFuelSnippet(ar)}
    ${note?`<section class="insights-card home-note"><div class="insights-head"><small>${ar?"ملاحظة اليوم":"TODAY'S NOTE"}</small></div><p class="insight insight-${note.tone}">${esc(note.text)}</p></section>`:""}`);
  document.querySelector("[data-check-watch-vitals]")?.addEventListener("click",()=>fetchPendingVitals(true));
  document.querySelector("[data-goto-train]")?.addEventListener("click",()=>setPrimaryTab("train"));
  document.querySelector("[data-goto-fuel]")?.addEventListener("click",()=>setPrimaryTab("food"));
  document.querySelector("[data-today-bad-day]")?.addEventListener("click",()=>renderBadDay());
  document.querySelector("[data-today-log-act]")?.addEventListener("click",()=>showLogActivity());
}

function renderHome() {
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view = "home";state.activeTab="train";persistDebounced();updatePrimaryTabs();
  const day = currentDay(),u=U();
  document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;
  const resume = REP_TRAINING_SESSION.isResumableWorkout(state,sessions);
  const streak=computeStreak();
  app.innerHTML = REP_SAFE_DOM.sanitize(`
    <section class="hero">
      <p class="eyebrow">${u.companion}</p>
      <h1>${u.hero1}<br><em>${u.hero2}</em></h1>
      <p>${u.heroSub}</p>
    </section>
    ${streak>=1?`<div class="streak-badge"><i>${ICONS.flame}</i><strong>${streak}</strong><span>${state.lang==="ar"?"يوم متتالٍ":"day streak"}</span></div>`:""}
    ${vitalsTeaserStrip(state.lang==="ar")}
    <div class="today-strip"><span>${state.lang==="ar"?({Sunday:"الأحد",Monday:"الاثنين",Tuesday:"الثلاثاء",Wednesday:"الأربعاء",Thursday:"الخميس",Friday:"الجمعة",Saturday:"السبت"}[day]):day}</span><strong>${todayPlan(day)}</strong></div>
    ${healthStatusStrip()}
    ${reminderStrip("train")}
    <section class="session-grid" aria-label="Choose a session">
      ${Object.entries(sessions).filter(([id])=>!["bad","gymLite"].includes(id)).map(([id,s]) => sessionCard(id,s,REP_TRAINING_SESSION.isResumableWorkout(state,sessions,id))).join("")}
      <button class="session-card" data-log-activity style="--card-accent:#ffd36a"><span><small>${state.lang==="ar"?"بادل · كرة قدم · المزيد":"PADEL · FOOTBALL · MORE"}</small><h2>${state.lang==="ar"?"تسجيل نشاط":"Log an activity"}</h2></span><span class="session-icon">${ICONS.plus}</span><p>${state.lang==="ar"?"رياضات غير منظمة: المدة والسعرات المحروقة من ساعة أبل.":"Unstructured sports — duration and calories burned from your Apple Watch."}</p><small>${state.lang==="ar"?"سجّل الآن ←":"Log now →"}</small></button>
    </section>
    ${window.REP_CUSTOM_WORKOUTS ? window.REP_CUSTOM_WORKOUTS.renderRoutinesSection(state.lang==="ar") : ""}
    <div class="section-title training-tools-title"><h2>${state.lang==="ar"?"أدوات التمرين":"Training tools"}</h2><span>${state.lang==="ar"?"الاستعداد · السجل · السلامة":"Readiness · history · safety"}</span></div>
    <section class="session-grid training-tools" aria-label="${state.lang==="ar"?"أدوات التمرين":"Training tools"}">
      <button class="session-card" data-recovery style="--card-accent:#d9b3ff"><span><small>${state.lang==="ar"?"الاستعداد والتقدم":"READINESS & PROGRESSION"}</small><h2>${state.lang==="ar"?"الاستشفاء":"Recovery"}</h2></span><span class="session-icon">${ICONS.waves}</span><p>${state.lang==="ar"?"مراجعة أسبوعية، بوابة التقدم، مؤقتات الاستشفاء، وإشارات الخطر.":"Weekly check-in, progression gate, recovery timers, and red-flag guidance."}</p><small>${state.lang==="ar"?"افتح نظام الاستشفاء ←":"Open recovery system →"}</small></button>
      <button class="session-card" data-history style="--card-accent:#7dc9ff"><span><small>${u.reference}</small><h2>${u.history}</h2></span><span class="session-icon">${ICONS.clock}</span><p>${u.historyDesc}</p><small>${u.openHistory}</small></button>
      <button class="session-card bad-day-card" data-bad-day style="--card-accent:#d9b3ff"><span><small>${state.lang==="ar"?"خطة اليوم الصعب":"BAD DAY MODE"}</small><h2>${state.lang==="ar"?"شيء أفضل من لا شيء":"Something beats nothing"}</h2></span><span class="session-icon">${ICONS.shield}</span><p>${state.lang==="ar"?"الحد الأدنى أو جيم مختصر، دون تغيير خطتك الأصلية.":"Run the minimum or a reduced gym without changing the normal plan."}</p><small>${state.lang==="ar"?"اختر الخطة ←":"Choose fallback →"}</small></button>
      <button class="session-card" data-review style="--card-accent:#ef6f55"><span><small>${state.lang==="ar"?"السلامة والجودة":"SAFETY & QUALITY"}</small><h2>${state.lang==="ar"?"المراجعة والاختبار":"Review & field test"}</h2></span><span class="session-icon">${ICONS.check}</span><p>${state.lang==="ar"?"اعتماد مختص، قائمة فحص الحركة، واختبار الاستخدام داخل الجيم.":"Professional sign-off, movement checklist, and real-gym usability test."}</p><small>${state.lang==="ar"?"افتح قائمة الفحص ←":"Open checklist →"}</small></button>
      <button class="session-card install-card" data-install style="--card-accent:#ffffff"><span><small>PWA</small><h2>${u.install}</h2></span><span class="session-icon">${ICONS.download}</span><p>${u.installDesc}</p><small>${u.installNow} →</small></button>
    </section>
    <section class="weekly">
      <div class="section-title"><h2>${u.weekly}</h2><span>${state.lang==="ar"?"الصباح + منتصفه":"AM + mid-morning"}</span></div>
      <div class="week-row">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="day ${day.startsWith(d)?"is-today":""}"><strong>${d}</strong><span>${["Sun","Tue","Thu"].includes(d)?"G":d==="Mon"?"FB":d==="Wed"?"PDL":d==="Fri"?"R":"S"}</span></div>`).join("")}</div>
    </section>`);
  document.querySelectorAll("[data-session]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.session;
    const continuing = REP_TRAINING_SESSION.isResumableWorkout(state,sessions,id);
    continuing ? startSession(id) : showSessionPreview(id);
  }));
  document.querySelector("[data-create-new-routine]")?.addEventListener("click", () => window.REP_CUSTOM_WORKOUTS?.openRoutineBuilderModal());
  document.querySelectorAll("[data-edit-custom]").forEach(btn => {
    btn.onclick = () => window.REP_CUSTOM_WORKOUTS?.openRoutineBuilderModal(btn.dataset.editCustom);
  });
  document.querySelectorAll("[data-launch-custom]").forEach(btn => {
    btn.onclick = () => window.REP_CUSTOM_WORKOUTS?.launchRoutine(btn.dataset.launchCustom);
  });
  document.querySelector("[data-goto-vitals]")?.addEventListener("click", ()=>setPrimaryTab("vitals"));
  document.querySelector("[data-recovery]").addEventListener("click", renderRecovery);
  document.querySelector("[data-log-activity]").addEventListener("click", ()=>showLogActivity());
  document.querySelector("[data-history]").addEventListener("click", renderHistory);
  document.querySelector("[data-bad-day]").addEventListener("click", renderBadDay);
  document.querySelector("[data-review]").addEventListener("click", renderReview);
  document.querySelector("[data-install]").addEventListener("click", installApp);
  document.querySelectorAll("[data-reminder-tab]").forEach(button=>button.addEventListener("click",()=>setPrimaryTab(button.dataset.reminderTab)));
  document.querySelector("[data-reminder-toggle]")?.addEventListener("click",e=>{const t=e.currentTarget.dataset.reminderToggle;state.reminderExpanded[t]=!state.reminderExpanded[t];renderHome();});
  document.querySelector("[data-backup-export]")?.addEventListener("click", exportData);
  document.querySelector("[data-backup-snooze]")?.addEventListener("click", snoozeBackupReminder);
}
function programCategoryFor(id){return id==="gym"?"gym":id==="morning"?"home":["football","padel","general"].includes(id)?"sport":id==="cardio"?"cardio":"all";}
function sessionCard(id, s, resume) {
  const u=U(),ls=sessionText(id,s),media=cinematicAssetFor(s.exercises[0]);
  return `<button class="session-card program-session-card ${resume?"resume-card":""} ${media?"has-session-media":""}" data-session="${id}" data-program-category="${programCategoryFor(id)}" style="--card-accent:${s.accent}">
    ${media?`<span class="session-card-media" aria-hidden="true"><img src="${media}" alt="" loading="lazy" decoding="async" fetchpriority="low"></span>`:""}
    <span class="session-card-heading"><small>${resume?`${u.resume} · ${state.index+1}/${s.exercises.length}`:s.short}</small><h2>${ls.name}</h2></span>
    <span class="session-icon">${ICONS[s.icon]||s.icon}</span><p>${ls.meta}<br>${ls.description}</p><small>${resume?u.continue:`${s.exercises.length} ${u.steps}`}</small></button>`;
}
// Read-only walkthrough: shows the exact same animated form demonstration
// and technique cues as the real player, but never touches state.session,
// state.index, state.sessionStartedAt, state.completed, or history - opening
// or expanding rows here has zero effect on what counts as an active session.
function showSessionPreview(id,openIndices=new Set()){
  const s=sessions[id],ar=state.lang==="ar",ls=sessionText(id,s),u=U();
  REP_TRAINING_SESSION.previewWorkout(state,id);document.body.classList.remove("workout-mode");persist();updatePrimaryTabs();
  const rows=s.exercises.map((base,i)=>{
    const item=currentItem(base);
    return `<details class="preview-row" ${openIndices.has(i)?"open":""}><summary><span>${i+1}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.prescription)}${item.intensity?` · ${esc(item.intensity)}`:""}</small></div></summary>
      <div class="preview-row-body">
        <div class="visual-wrap anatomy-wrap" role="img" aria-label="Exercise demonstration of ${esc(item.name)}"><span class="visual-label">${esc(categoryLabel(item.category))}</span>${exerciseVisual(item,{preview:true})}<span class="motion-tempo">${u.anatomyLoop}</span></div>
        ${motionControls()}
        <div class="cue-body"><p><strong>${u.setup}:</strong> ${esc(item.setup)}</p><p><strong>${u.move}:</strong> ${esc(item.execution)}</p><p><strong>${u.cue}:</strong> ${esc(item.cues)}</p><p><strong>${u.avoid}:</strong> ${esc(item.avoid)}</p></div>
      </div>
    </details>`;
  }).join("");
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="preview-container">${moduleHeader(ls.name,ar?"استعرض الخطة وتقنية كل حركة قبل البدء.":"Preview the plan and each move's technique before you start.",ls.description)}
    <section class="preview-meta"><span>${ls.meta}</span><span>${s.exercises.length} ${u.steps}</span></section>
    <section class="preview-list">${rows}</section>
    <nav class="bottom-nav preview-actions"><button class="nav-button" data-cancel-preview type="button">${ar?"رجوع →":"← Back"}</button><button class="nav-button primary" data-start-session type="button">${ar?"← ابدأ التمرين":"Start workout →"}</button></nav></section>`);
  document.querySelector("[data-start-session]").onclick=()=>startSession(id);
  document.querySelector("[data-cancel-preview]").onclick=renderHome;
  document.querySelectorAll("[data-motion-action]").forEach(b=>b.addEventListener("click",()=>motionAction(b.dataset.motionAction)));
}
function startSession(id) {
  REP_TRAINING_SESSION.startWorkout(state,id,sessions);
  updatePrimaryTabs();document.body.classList.add("workout-mode");persist();resetWorkoutScroll();renderExercise();startSessionClock();
}

function resetWorkoutScroll(){
  window.scrollTo({top:0,left:0,behavior:"auto"});
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
}

function currentItem(base){
  if(base.name!=="Back Extension"||!state.swaps.backExtension)return localizedItem(base);
  const swap={...base,name:"Hip Thrust Machine",motion:"floor",setup:"Shoulders against the machine pad, feet flat and hip-width.",execution:"Drive through the heels, lift the hips, squeeze the glutes, then lower with control.",cues:"Keep ribs down and finish with the glutes, not the lower back.",avoid:"Overarching the back or pushing through the toes."};
  return localizedItem(swap);
}
function isLoadExercise(item){return ["legpress","hinge","floor","chestpress","row","pulldown"].includes(item.motion)&&["gym","gymLite"].includes(state.session);}
function exerciseId(base){return base.name==="Back Extension"?(state.swaps.backExtension?"Hip Thrust Machine":"Back Extension"):base.name;}
function normalizedLog(id,sets=3){return REP_TRAINING_SESSION.normalizedLog(state.logs,id,sets);}
function setsFromLog(log){return REP_TRAINING_SESSION.setsFromLog(log);}
function progressionAdvice(id){return REP_TRAINING_SESSION.progressionAdvice({logs:state.logs,history:state.history,id,lang:state.lang,recoveryGate:recoveryGate()});}
function loadPanel(base,item){
  if(!isLoadExercise(item))return "";
  const u=U(), ar=state.lang==="ar", id=exerciseId(base), log=normalizedLog(id,item.sets);
  const isLb = state.preferences?.weightUnit === "lb";
  const unitLabel = isLb ? "lb" : "kg";
  const prev=log.previousSets?.map((s,i)=>`${i+1}: ${isLb?(window.weightLabel?weightLabel(s.weight):`${s.weight||"—"} lb`):`${s.weight||"—"} kg`} × ${s.reps||"—"}`).join(" · ")||u.noPrevious;
  const advice=window.REP_PERFORMANCE_INSIGHTS?.progressionAdvice(id,state);
  const curWeight=Number(log.sets[0]?.weight||60)||60;
  const key = `${state.session}-${state.index}`;
  const done = state.completed[key] || [];

  return `<section class="load-panel">
    <div class="set-log-head">
      <div>
        <span class="set-log-kicker">${ar?"تسجيل القوة":"STRENGTH LOG"}</span>
        <h2>${ar?"سجل المجموعات":"Log Every Set"}</h2>
      </div>
      <div class="set-log-actions">
        <button class="voice-set-btn" data-tempo-coach type="button">⏱️ ${ar?"الإيقاع":"Tempo"}</button>
        <button class="voice-set-btn" data-plate-math="${curWeight}" type="button">🏋️ ${ar?"الأوزان":"Plates"}</button>
        <button class="voice-set-btn" data-voice-set-log type="button">🎙️ ${ar?"صوتي":"Voice"}</button>
      </div>
    </div>

    <div class="set-table-header">
      <span class="col-set">${ar?"مجموعة":"SET"}</span>
      <span class="col-prev">${ar?"السابق":"PREV"}</span>
      <span class="col-weight">${u.weight} (${unitLabel})</span>
      <span class="col-reps">${u.reps}</span>
      <span class="col-rpe">RPE</span>
      <span class="col-check">✓</span>
    </div>

    <div class="set-log-grid">
      ${Array.from({length:item.sets},(_,i)=>{
        const s=log.sets[i]||{};
        const prevSet=log.previousSets?.[i];
        const prevText=prevSet?(prevSet.weight?`${isLb?(window.weightLabel?weightLabel(prevSet.weight):prevSet.weight):prevSet.weight}×${prevSet.reps}`:`${prevSet.reps}r`):"—";
        const isDone=done.includes(i);
        const wVal=isLb?(window.weightInput?weightInput(s.weight):esc(s.weight||"")):esc(s.weight||"");
        return `<div class="set-card-row ${isDone?"is-completed":""}">
          <div class="set-main-fields">
            <span class="set-badge ${isDone?"is-done":""}">${i+1}</span>
            <div class="set-prev-cell"><small>${prevText}</small></div>
            <div class="set-input-wrap">
              <input data-log="weight" data-log-set="${i}" type="number" min="0" step="${isLb?"1":"0.5"}" inputmode="decimal" value="${wVal}" placeholder="${unitLabel}" aria-label="${u.weight} ${i+1}">
            </div>
            <div class="set-input-wrap">
              <input data-log="reps" data-log-set="${i}" type="number" min="0" step="1" inputmode="numeric" value="${esc(s.reps||"")}" placeholder="0" aria-label="${u.reps} ${i+1}">
            </div>
            <div class="set-input-wrap">
              <input data-log="rpe" data-log-set="${i}" type="number" min="1" max="10" step="0.5" inputmode="decimal" value="${esc(s.rpe||"")}" placeholder="7.5" aria-label="RPE ${i+1}">
            </div>
            <button class="set-check-btn ${isDone?"is-done":""}" type="button" data-set="${i}" aria-label="${ar?`تحديد مجموعة ${i+1}`:`Mark set ${i+1}`}">
              ${isDone?"✓":"○"}
            </button>
          </div>
          <div class="set-sub-bar">
            <div class="set-steppers">
              <button class="step-btn" type="button" data-step-set="${i}" data-step-val="${isLb?-5:-2.5}">${isLb?"-5":"-2.5"}</button>
              <button class="step-btn" type="button" data-step-set="${i}" data-step-val="${isLb?5:2.5}">${isLb?"+5":"+2.5"}</button>
              <button class="step-btn" type="button" data-step-set="${i}" data-step-val="${isLb?10:5}">${isLb?"+10":"+5"}</button>
              ${i>0?`<button class="clone-set-btn" data-clone-set="${i}" type="button">⎘ ${ar?`مثل ${i}`:`Match S${i}`}</button>`:""}
            </div>
            <div class="set-note-wrap">
              <input data-log="note" data-log-set="${i}" value="${esc(s.note||"")}" maxlength="60" placeholder="${ar?"+ ملاحظة (اختياري)":"+ Note (optional)"}" aria-label="Note ${i+1}">
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>

    <p style="margin:10px 0 0;color:var(--muted);font-size:11px;">${u.previousLog}: <strong>${prev}</strong></p>
    <div class="progression-callout">${advice?`<span class="progression-badge status-${advice.status}">${esc(advice.badge)}</span> `:""}${progressionAdvice(id)}</div>
  </section>`;
}
function cardioPanel(item){
  if(state.session!=="cardio"||item.motion!=="inclinewalk")return "";const d=state.cardioDraft,advice=cardioAdvice();
  return `<section class="load-panel cardio-panel"><div class="set-log-head"><strong>${state.lang==="ar"?"سجل الكارديو":"Cardio log"}</strong><span>${state.lang==="ar"?"التقدم بعد 3–4 أسابيع":"3–4 week gate"}</span></div><div class="metric-grid"><label><span>${state.lang==="ar"?"الدقائق":"Minutes"}</span><input data-cardio="minutes" type="number" min="0" max="60" value="${esc(d.minutes||25)}"></label><label><span>RPE</span><input data-cardio="rpe" type="number" min="1" max="10" step="0.5" value="${esc(d.rpe||6)}"></label><label><span>${state.lang==="ar"?"الميل %":"Incline %"}</span><input data-cardio="incline" type="number" min="0" max="20" step="0.5" value="${esc(d.incline||5)}"></label><label><span>${state.lang==="ar"?"السرعة":"Pace km/h"}</span><input data-cardio="pace" type="number" min="0" max="15" step="0.1" value="${esc(d.pace||"")}"></label></div><div class="progression-callout">${advice}</div></section>`;
}
function cardioAdvice(){return REP_TRAINING_SESSION.cardioAdvice(state.history,state.lang);}
function motionControls(){const u=U(),ar=state.lang==="ar";return `<div class="motion-controls" aria-label="${ar?"عناصر تحكم الحركة":"Animation controls"}"><button data-motion-action="play" aria-pressed="${!state.paused}"><b>${state.paused?"▶":"Ⅱ"}</b><span>${ar?"تكرار":state.paused?"Loop":"Looping"}</span></button><button data-motion-action="speed"><b>${state.speed}×</b><span>${u.speed}</span></button><button data-motion-action="view"><b>◫</b><span>${state.viewMode==="front"?u.front:u.side}</span></button><button data-motion-action="muscles" aria-pressed="${state.muscles}"><b>◉</b><span>${u.muscles}</span></button></div>`;}

function quickSetEntry(base,item,setIndex){
  if(!isLoadExercise(item)||setIndex===undefined)return "";
  const ar=state.lang==="ar",log=normalizedLog(exerciseId(base),item.sets),set=log.sets[setIndex]||{};
  const isLb=state.preferences?.weightUnit==="lb",unit=isLb?"lb":"kg";
  const weight=isLb?(window.weightInput?window.weightInput(set.weight):set.weight):set.weight;
  const target=String(item.prescription||"").split("×").pop().trim();
  return `<div class="live-set-entry" aria-label="${ar?"إدخال سريع للمجموعة الحالية":"Quick entry for current set"}">
    <label class="live-set-field"><small>${ar?"الوزن":"WEIGHT"}</small><span><input data-live-log data-log="weight" data-log-set="${setIndex}" type="number" min="0" step="${isLb?"1":"0.5"}" inputmode="decimal" value="${esc(weight||"")}" placeholder="—" aria-label="${ar?"وزن المجموعة الحالية":"Current set weight"}"><em>${unit}</em></span></label>
    <div class="live-rep-counter"><small>${ar?"التكرارات · يدوي":"REPS · MANUAL"}</small><div><button type="button" data-live-reps-step="-1" aria-label="${ar?"إنقاص تكرار":"Decrease reps"}">−</button><input data-live-log data-log="reps" data-log-set="${setIndex}" type="number" min="0" max="99" step="1" inputmode="numeric" value="${esc(set.reps||"")}" placeholder="0" aria-label="${ar?"تكرارات المجموعة الحالية":"Current set reps"}"><span>/ ${esc(target)}</span><button type="button" data-live-reps-step="1" aria-label="${ar?"إضافة تكرار":"Add rep"}">+</button></div></div>
    <label class="live-set-field"><small>RPE</small><span><input data-live-log data-log="rpe" data-log-set="${setIndex}" type="number" min="1" max="10" step="0.5" inputmode="decimal" value="${esc(set.rpe||"")}" placeholder="—" aria-label="${ar?"معدل الجهد للمجموعة الحالية":"Current set RPE"}"></span></label>
  </div>`;
}

function openWorkoutChoiceSheet(kind){
  document.querySelector(".workout-choice-backdrop")?.remove();
  const ar=state.lang==="ar",isSpeed=kind==="speed";
  const options=isSpeed
    ? [.5,.75,1,1.25,1.5].map(value=>({value:String(value),label:`${value}×`,active:Number(state.speed)===value}))
    : [{value:"side",label:ar?"جانبي":"Side",active:state.viewMode==="side"},{value:"front",label:ar?"أمامي":"Front",active:state.viewMode==="front"}];
  const overlay=document.createElement("div");
  overlay.className="rep-modal-backdrop workout-choice-backdrop";
  overlay.setAttribute("aria-labelledby","workoutChoiceTitle");
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<section class="rep-modal-sheet workout-choice-sheet"><div class="sheet-grabber" aria-hidden="true"></div><div class="sheet-header"><div><small>${ar?"عرض الحركة":"MOTION DISPLAY"}</small><h2 id="workoutChoiceTitle">${isSpeed?(ar?"سرعة التكرار":"Playback speed"):(ar?"زاوية العرض":"View angle")}</h2></div><button class="sheet-close" data-choice-close aria-label="${ar?"إغلاق":"Close"}">×</button></div><div class="workout-choice-grid">${options.map(option=>`<button type="button" data-choice="${option.value}" class="${option.active?"is-active":""}" aria-pressed="${option.active}"><span>${option.label}</span>${option.active?"<b>✓</b>":""}</button>`).join("")}</div></section>`);
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector("[data-choice-close]").onclick=close;
  overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
  overlay.querySelectorAll("[data-choice]").forEach(button=>button.onclick=()=>{
    if(isSpeed)state.speed=Number(button.dataset.choice);else state.viewMode=button.dataset.choice;
    persist();close();
    if(state.view==="preview"){
      const open=new Set([...document.querySelectorAll(".preview-row")].map((el,i)=>el.open?i:-1).filter(i=>i>=0));
      showSessionPreview(state.previewSession,open);
    }else renderExercise();
  });
  overlay.querySelector("[data-choice-close]").focus();
}

function openWorkoutUtilitySheet(){
  document.querySelector(".workout-choice-backdrop")?.remove();
  const ar=state.lang==="ar",wakeSupported="wakeLock" in navigator;
  const overlay=document.createElement("div");
  overlay.className="rep-modal-backdrop workout-choice-backdrop";
  overlay.setAttribute("aria-labelledby","workoutUtilityTitle");
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<section class="rep-modal-sheet workout-choice-sheet"><div class="sheet-grabber" aria-hidden="true"></div><div class="sheet-header"><div><small>${ar?"الحصة النشطة":"ACTIVE SESSION"}</small><h2 id="workoutUtilityTitle">${ar?"خيارات التمرين":"Workout options"}</h2></div><button class="sheet-close" data-choice-close aria-label="${ar?"إغلاق":"Close"}">×</button></div><div class="workout-utility-list"><button type="button" data-workout-utility="wake" ${wakeSupported?"":"disabled"}><span>☼</span><div><strong>${ar?"إبقاء الشاشة مضاءة":"Keep screen awake"}</strong><small>${state.wakeLock?(ar?"مفعّل":"On"):(ar?"متوقف":"Off")}</small></div></button><button type="button" data-workout-utility="sound"><span>${state.muted?"×":"◖"}</span><div><strong>${ar?"صوت المؤقت":"Timer sound"}</strong><small>${state.muted?(ar?"مكتوم":"Muted"):(ar?"مفعّل":"On")}</small></div></button>${window.REP_HEART_RATE?`<button type="button" data-workout-utility="heart"><span>♥</span><div><strong>${ar?"معدل ضربات القلب":"Heart rate"}</strong><small>${ar?"توصيل أو عرض المستشعر":"Connect or view sensor"}</small></div></button>`:""}<button type="button" class="is-danger" data-workout-utility="exit"><span>×</span><div><strong>${ar?"إنهاء الحصة":"Exit workout"}</strong><small>${ar?"سيُطلب منك التأكيد":"Confirmation required"}</small></div></button></div></section>`);
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector("[data-choice-close]").onclick=close;
  overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
  overlay.querySelectorAll("[data-workout-utility]").forEach(button=>button.onclick=()=>{
    const action=button.dataset.workoutUtility;close();
    if(action==="wake")document.querySelector("#wakeButton")?.click();
    if(action==="sound")document.querySelector("#soundButton")?.click();
    if(action==="heart")window.REP_HEART_RATE?.openHrModal();
    if(action==="exit")showExitConfirm();
  });
  overlay.querySelector("[data-choice-close]").focus();
}

function showSwapModal(exerciseName){
  const subs=window.REP_PERFORMANCE_INSIGHTS?.EXERCISE_SUBSTITUTIONS?.[exerciseName]||[];
  if(!subs.length)return;
  const ar=state.lang==="ar",overlay=document.createElement("div");
  overlay.className="timed-mode";
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<div class="workout-preflight-panel" style="max-width:400px;margin:auto;"><button class="dialog-close" data-swap-close aria-label="Close">×</button><small style="color:var(--acid);font-weight:900;">${ar?"بدائل التمرين البيوميكانيكية":"BIOMECHANICAL SUBSTITUTIONS"}</small><h2 style="margin:6px 0 14px;">${esc(exerciseName)}</h2><p style="color:var(--muted);font-size:13px;margin-bottom:14px;">${ar?"اختر بديلاً مناسباً للمعدات المتاحة مع الحفاظ على نفس المحفز العضلي:":"Choose an alternative matching available equipment with equivalent muscle stimulus:"}</p><div style="display:grid;gap:8px;">${subs.map(sub=>`<button class="settings-primary" data-select-swap="${esc(sub)}" style="text-align:left;padding:12px 14px;border-radius:12px;font-size:14px;">${esc(sub)}</button>`).join("")}</div></div>`);
  document.body.appendChild(overlay);
  overlay.querySelector("[data-swap-close]").onclick=()=>overlay.remove();
  overlay.querySelectorAll("[data-select-swap]").forEach(btn=>{btn.onclick=()=>{const chosen=btn.dataset.selectSwap,session=sessions[state.session];if(session&&session.exercises[state.index]){session.exercises[state.index]={...session.exercises[state.index],name:chosen};persist();overlay.remove();renderExercise();showToast(ar?`تم التبديل إلى ${chosen}`:`Swapped to ${chosen}`);}};});
}

function startTempoCoach(base, item){
  const ar=state.lang==="ar",u=U();
  let currentRep=1, phaseIdx=0, secondsInPhase=0, paused=false;
  const targetReps=10;
  const phases = [
    { name: ar ? "نزول بتحكم" : "ECCENTRIC (DOWN)", duration: 3, speak: ar ? "نزول" : "Down", color: "var(--blue)" },
    { name: ar ? "ثبات في الأسفل" : "ISOMETRIC (HOLD)", duration: 1, speak: ar ? "ثبات" : "Hold", color: "var(--acid)" },
    { name: ar ? "دفع انفجاري" : "CONCENTRIC (EXPLODE)", duration: 1, speak: ar ? "دفع" : "Up", color: "#f43f5e" },
    { name: ar ? "إعادة تهيئة" : "RESET (TOP)", duration: 1, speak: "", color: "var(--muted)" }
  ];
  
  const overlay=document.createElement("div");
  overlay.className="timed-mode";
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<div class="timed-mode-card">
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div style="text-align:start;"><span style="color:var(--acid);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;">⏱️ ${ar?"مدرب الإيقاع":"TEMPO COACH"}</span><h2 style="margin:2px 0 0;font-size:18px;">${esc(item.name)}</h2></div>
      <button class="round-button" data-tempo-close aria-label="${ar?"إغلاق":"Close"}" style="width:40px;height:40px;font-size:20px;">×</button>
    </div>
    <div class="visual-wrap anatomy-wrap" role="img" aria-label="Demonstration of ${esc(item.name)}" style="width:100%;height:180px;min-height:180px;margin-bottom:6px;border-radius:18px;">
      ${exerciseVisual(item,{preview:true})}
    </div>
    <div style="margin:6px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div class="tempo-ring" style="width:100px;height:100px;border-radius:50%;border:4px solid var(--acid);display:flex;align-items:center;justify-content:center;transition:all 0.3s ease;transform:scale(1);">
        <strong data-tempo-rep style="font-size:32px;font-weight:900;">${currentRep}</strong>
      </div>
      <span data-tempo-phase style="margin-top:8px;font-weight:800;font-size:13px;letter-spacing:.06em;color:var(--acid);">${phases[0].name}</span>
    </div>
    <div class="timed-actions" style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <button data-tempo-pause style="min-height:48px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:#181d1a;color:#fff;font-weight:900;">${u.pause}</button>
      <button data-tempo-finish style="min-height:48px;border:0;border-radius:12px;background:var(--acid);color:var(--acid-ink);font-weight:900;">${u.finish}</button>
    </div>
    <div style="margin-top:6px;padding:8px 12px;background:rgba(255,255,255,.04);border-radius:12px;font-size:11px;color:var(--muted);text-align:start;width:100%;">
      <strong style="color:var(--text);">${u.cue}:</strong> ${esc(item.cues)}
    </div>
  </div>`);
  document.body.appendChild(overlay);
  
  const close=()=>{clearInterval(tick);overlay.remove();window.speechSynthesis?.cancel();};
  overlay.querySelector("[data-tempo-close]").onclick=close;
  overlay.querySelector("[data-tempo-finish]").onclick=()=>{vibrateGym("pr");triggerConfetti();close();};
  overlay.querySelector("[data-tempo-pause]").onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?u.resume:u.pause;};

  const ring=overlay.querySelector(".tempo-ring"),repEl=overlay.querySelector("[data-tempo-rep]"),phaseEl=overlay.querySelector("[data-tempo-phase]");
  speak(phases[0].speak);
  const tick=setInterval(()=>{
    if(paused)return;
    secondsInPhase++;
    const curPhase=phases[phaseIdx];
    playChime();
    if(navigator.vibrate)navigator.vibrate(20);
    if(secondsInPhase>=curPhase.duration){
      secondsInPhase=0;
      phaseIdx=(phaseIdx+1)%phases.length;
      const nextPhase=phases[phaseIdx];
      phaseEl.textContent=nextPhase.name;
      phaseEl.style.color=nextPhase.color;
      ring.style.borderColor=nextPhase.color;
      if(phaseIdx===0){
        currentRep++;
        if(currentRep>targetReps){vibrateGym("pr");triggerConfetti();speak(ar?"مجموعة مكتملة!":"Set Complete!");close();return;}
        repEl.textContent=currentRep;
        ring.style.transform="scale(1.2)";
        setTimeout(()=>ring.style.transform="scale(1)",200);
      }
      if(nextPhase.speak)speak(nextPhase.speak);
    }
  },1000);
}

function startVoiceSetLogger(base,item){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){showToast(state.lang==="ar"?"الإملاء الصوتي غير مدعوم في متصفحك.":"Voice input is not supported in this browser.");return;}
  const rec=new SpeechRecognition();
  rec.lang=state.lang==="ar"?"ar-EG":"en-US";
  rec.interimResults=false;
  const btn=document.querySelector("[data-voice-set-log]");
  btn?.classList.add("is-listening");
  showToast(state.lang==="ar"?"استمع الآن: قل مثلاً «8 عدات 100 كيلو RPE 8»":"Listening: say e.g. '8 reps 100 kg RPE 8'");
  rec.onresult=e=>{
    btn?.classList.remove("is-listening");
    const text=String(e.results[0][0].transcript||"").toLowerCase();
    const clean=text.replace(/[٠-٩]/g,d=>["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"].indexOf(d));
    const repsMatch=clean.match(/(\d+)\s*(?:reps?|عدات?|تكرار)/i)||clean.match(/^(\d+)/);
    const weightMatch=clean.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|كيلو|كجم)/i)||clean.match(/(?:at|وزن)\s*(\d+(?:\.\d+)?)/i);
    const rpeMatch=clean.match(/rpe\s*(\d+(?:\.\d+)?)/i)||clean.match(/جهد\s*(\d+(?:\.\d+)?)/i);
    const key=`${state.session}-${state.index}`,done=state.completed[key]||[],nextSetIndex=Array.from({length:item.sets},(_,i)=>i).find(i=>!done.includes(i))??0;
    const id=exerciseId(base),log=normalizedLog(id,item.sets);
    if(weightMatch&&weightMatch[1])log.sets[nextSetIndex].weight=weightMatch[1];
    if(repsMatch&&repsMatch[1])log.sets[nextSetIndex].reps=repsMatch[1];
    if(rpeMatch&&rpeMatch[1])log.sets[nextSetIndex].rpe=rpeMatch[1];
    if(!done.includes(nextSetIndex))toggleSet(nextSetIndex);else{persist();renderExercise();}
    showToast(state.lang==="ar"?`تم تسجيل المجموعة ${nextSetIndex+1}: ${log.sets[nextSetIndex].weight||""} كجم × ${log.sets[nextSetIndex].reps||""} تكرار`:`Logged set ${nextSetIndex+1}: ${log.sets[nextSetIndex].weight||""}kg × ${log.sets[nextSetIndex].reps||""} reps`);
  };
  rec.onerror=()=>{btn?.classList.remove("is-listening");};
  rec.onend=()=>{btn?.classList.remove("is-listening");};
  rec.start();
}

function renderExercise() {
  const session = sessions[state.session];
  if (!session) return renderHome();
  if (state.index >= session.exercises.length) { updateMediaSession("idle"); return renderComplete(); }
  const prevProgressWidth=document.querySelector(".workout-progress i")?.style.width||null;
  const base = session.exercises[state.index], item=currentItem(base),u=U(),ls=sessionText(state.session,session);
  primeUpcomingCinematicMedia(session,state.index);
  const key = `${state.session}-${state.index}`;
  const done = state.completed[key] || [];
  const subs = window.REP_PERFORMANCE_INSIGHTS?.EXERCISE_SUBSTITUTIONS?.[base.name] || [];
  const swapBtn = subs.length ? `<button class="exercise-swap-btn" data-swap-modal="${esc(base.name)}">${state.lang==="ar"?"🔄 بدائل":"🔄 Swap"}</button>` : (base.name==="Back Extension"?`<button class="swap-button" data-swap>${state.swaps.backExtension?u.swapBack:u.swapHip}</button>`:"");
  const nextSetIndex = Array.from({length:item.sets},(_,i)=>i).find(i=>!done.includes(i));
  const isAllDone = nextSetIndex === undefined;
  const ar=state.lang==="ar",targetMuscles=targetMusclesFor(item);
  const focusSet=isAllDone?item.sets:(nextSetIndex+1);
  const focusLabel=isAllDone?(state.index===session.exercises.length-1?(ar?"جاهز للإنهاء":"Ready to finish"):(ar?"جاهز للحركة التالية":"Ready for next move")):(ar?`المجموعة ${focusSet} من ${item.sets}`:`Set ${focusSet} of ${item.sets}`);
  const progressDots=Array.from({length:item.sets},(_,i)=>`<i class="${done.includes(i)?"is-done":i===nextSetIndex?"is-current":""}" aria-hidden="true"></i>`).join("");
  const hasCinematicMedia=Boolean(cinematicAssetFor(item));
  const identityHtml=`<div class="exercise-info workout-identity"><div class="exercise-title-row"><h1>${esc(item.name)}</h1>${swapBtn}</div><p>${ar?"الهدف":"Target"}: <strong>${esc(targetMuscles)}</strong></p><div class="chips"><span class="chip primary">${esc(item.prescription)}</span><span class="chip">${esc(item.intensity)}</span>${item.rest?`<span class="chip">${item.rest}s ${u.rest}</span>`:""}</div></div>`;
  const exerciseTransitionClass=exerciseTransitioning?" is-exercise-entering":"";
  exerciseTransitioning=false;
  const primaryButtonLabel = isAllDone ? (state.index===session.exercises.length-1?u.finish:u.next) : (item.sets===1?u.markDone:(state.lang==="ar"?`✓ تسجيل مجموعة ${nextSetIndex+1} (راحة ${item.rest||90}ث)`:`✓ Log Set ${nextSetIndex+1} (Rest ${item.rest||90}s)`));
  app.innerHTML = REP_SAFE_DOM.sanitize(`<section class="player workout-player${exerciseTransitionClass}${hasCinematicMedia?" has-cinematic-media":""}" data-swipe>
    <div class="player-header workout-header">
      <button class="round-button workout-back" data-prev aria-label="${ar?"التمرين السابق":"Previous exercise"}" ${state.index===0?"disabled":""}>‹</button>
      <div class="player-progress"><small>${ar?"الحصة النشطة":"ACTIVE WORKOUT"}</small><strong>${ls.name}</strong><span>${ar?"الحركة":"Exercise"} ${state.index+1} ${u.of} ${session.exercises.length} · <b id="sessionElapsed">0:00</b></span></div>
      <button class="round-button workout-more" data-workout-more aria-label="${ar?"خيارات التمرين":"Workout options"}">•••</button>
    </div>
    <div class="progress-bar workout-progress"><i style="width:${((state.index+1)/session.exercises.length)*100}%"></i></div>
    <article class="exercise-card">
      <div class="exercise-hero ${hasCinematicMedia?"is-cinematic":""}">
        <div class="visual-wrap anatomy-wrap exercise-hero-stage" role="img" aria-label="${hasCinematicMedia?(ar?"عرض سينمائي":"Cinematic demonstration"):(ar?"عرض تشريحي متحرك":"Animated anatomical demonstration")} ${esc(item.name)}"><span class="visual-label">${esc(categoryLabel(item.category))} · ${esc(item.intensity)}</span>${exerciseVisual(item)}<span class="motion-tempo">${u.anatomyLoop}</span></div>
        <div class="hero-muscle-label"><small>${ar?"العضلات المستهدفة":"TARGET MUSCLES"}</small><strong>${esc(targetMuscles)}</strong></div>
        ${hasCinematicMedia?identityHtml:""}
      </div>
      ${hasCinematicMedia?"":identityHtml}
      <section class="current-set-card" aria-label="${ar?"المجموعة الحالية":"Current set"}">
        <div class="current-set-copy"><small>${ar?"الحالي":"CURRENT"}</small><strong>${focusLabel}</strong><span>${isAllDone?(ar?"تم تسجيل جميع المجموعات":"All sets logged"):esc(item.prescription)}</span></div>
        <div class="set-progress-dots">${progressDots}</div>
        ${quickSetEntry(base,item,nextSetIndex)}
        ${nextSetIndex!==undefined&&motionGuide[item.motion]?.[2]?`<button class="exercise-timer-button" data-exercise-timer><span>${u.startTimer}</span><strong>${formatClock(motionGuide[item.motion][2])}</strong></button>`:""}
        ${item.motion==="activity"?`<button type="button" class="exercise-timer-button" data-open-activity-log><span>${ar?"سجّل نشاطك الآن":"Log your activity now"}</span><strong aria-hidden="true">📋</strong></button>`:""}
      </section>
      <div class="workout-action-band"><button class="workout-primary-action" data-next><span>${primaryButtonLabel}</span><b aria-hidden="true">→</b></button></div>
      ${motionControls()}
      <div class="superset-bar">
        <span><small>${ar?"التنقل السريع":"QUICK MOVE"}</small><strong>${ar?"تغيير ترتيب الحركة":"Change exercise order"}</strong></span>
        ${state.index < session.exercises.length - 1 ? `<button type="button" data-jump-exercise="${state.index+1}">${ar?"التالي ↻":"Next move ↻"}</button>` : (state.index > 0 ? `<button type="button" data-jump-exercise="${state.index-1}">${ar?"السابق ↺":"Previous ↺"}</button>` : "")}
      </div>
      ${loadPanel(base,item)}
      ${cardioPanel(item)}
      <section class="set-checklist-panel"><div class="set-checklist-head"><small>${ar?"تقدم التمرين":"SET PROGRESS"}</small><strong>${done.length}/${item.sets} ${ar?"مكتملة":"complete"}</strong></div><div class="set-tracker" aria-label="${ar?"قائمة المجموعات":"Set checklist"}">${Array.from({length:item.sets},(_,i)=>`<button class="set-button ${done.includes(i)?"is-done":""}" data-set="${i}" aria-pressed="${done.includes(i)}">${done.includes(i)?`✓ ${u.done}`:item.sets===1?u.markDone:`${u.set} ${i+1}`}</button>`).join("")}</div></section>
      <details class="cue-details"><summary>${u.technique}</summary><div class="cue-body"><p><strong>${u.setup}:</strong> ${esc(item.setup)}</p><p><strong>${u.move}:</strong> ${esc(item.execution)}</p><p><strong>${u.cue}:</strong> ${esc(item.cues)}</p><p><strong>${u.avoid}:</strong> ${esc(item.avoid)}</p></div></details>
    </article></section>`);
  const progressBar=document.querySelector(".workout-progress i");
  if(progressBar&&prevProgressWidth&&prevProgressWidth!==progressBar.style.width){
    const targetWidth=progressBar.style.width;
    progressBar.style.width=prevProgressWidth;
    void progressBar.offsetWidth;
    requestAnimationFrame(()=>{progressBar.style.width=targetWidth;});
  }
  observeCinematicMedia(document.querySelector(".exercise-hero-stage"),item);
  document.querySelectorAll("[data-prev]").forEach(b => b.addEventListener("click", prev));
  document.querySelector("[data-next]").addEventListener("click", ()=>{if(nextSetIndex!==undefined&&!done.includes(nextSetIndex))toggleSet(nextSetIndex);else next();});
  document.querySelector("[data-workout-more]")?.addEventListener("click",openWorkoutUtilitySheet);
  document.querySelector("[data-open-hr-modal]")?.addEventListener("click", ()=>window.REP_HEART_RATE?.openHrModal());
  document.querySelectorAll("[data-jump-exercise]").forEach(btn=>{btn.onclick=()=>{cancelRestTimer();state.index=Number(btn.dataset.jumpExercise);exerciseTransitioning=true;persist();resetWorkoutScroll();renderExercise();};});
  document.querySelectorAll("[data-set]").forEach(b => b.addEventListener("click", () => toggleSet(Number(b.dataset.set))));
  document.querySelectorAll("[data-motion-action]").forEach(b=>b.addEventListener("click",()=>motionAction(b.dataset.motionAction)));
  document.querySelector("[data-swap]")?.addEventListener("click",()=>{state.swaps.backExtension=!state.swaps.backExtension;persist();renderExercise();});
  document.querySelectorAll("[data-swap-modal]").forEach(b=>b.addEventListener("click",()=>showSwapModal(b.dataset.swapModal)));
  document.querySelector("[data-tempo-coach]")?.addEventListener("click",()=>startTempoCoach(base,item));
  document.querySelector("[data-plate-math]")?.addEventListener("click",e=>showPlateCalculator(Number(e.currentTarget.dataset.plateMath)||60));
  document.querySelector("[data-voice-set-log]")?.addEventListener("click",()=>startVoiceSetLogger(base,item));
  document.querySelector("[data-exercise-timer]")?.addEventListener("click",()=>toggleExerciseTimer(item.motion));
  document.querySelector("[data-open-activity-log]")?.addEventListener("click",()=>showLogActivity(state.session==="football"||state.session==="padel"?state.session:undefined));
  document.querySelectorAll("[data-clone-set]").forEach(btn=>{
    btn.onclick=()=>{
      const i=Number(btn.dataset.cloneSet), id=exerciseId(base), log=normalizedLog(id,item.sets);
      if(i>0&&log.sets[i-1]){
        log.sets[i].weight=log.sets[i-1].weight;
        log.sets[i].reps=log.sets[i-1].reps;
        log.sets[i].rpe=log.sets[i-1].rpe;
        persistDebounced();
        const isLb=state.preferences?.weightUnit==="lb";
        const displayWeight=isLb?(window.weightInput?window.weightInput(log.sets[i].weight):log.sets[i].weight):log.sets[i].weight;
        document.querySelectorAll(`input[data-log="weight"][data-log-set="${i}"]`).forEach(input=>input.value=String(displayWeight||""));
        document.querySelectorAll(`input[data-log="reps"][data-log-set="${i}"]`).forEach(input=>input.value=log.sets[i].reps);
        document.querySelectorAll(`input[data-log="rpe"][data-log-set="${i}"]`).forEach(input=>input.value=log.sets[i].rpe);
        if(window.vibrateGym) window.vibrateGym("set");
      }
    };
  });
  document.querySelectorAll("[data-step-set]").forEach(btn=>{
    btn.onclick=()=>{
      const i=Number(btn.dataset.stepSet), delta=Number(btn.dataset.stepVal), id=exerciseId(base), log=normalizedLog(id,item.sets);
      const isLb=state.preferences?.weightUnit==="lb";
      const rawStoredKg=Number(log.sets[i].weight||(i>0?log.sets[i-1]?.weight:60))||60;
      const curDisplay=isLb?Math.round(rawStoredKg*22.046226)/10:rawStoredKg;
      const nextDisplay=Math.max(0, Math.round((curDisplay+delta)*10)/10);
      const nextStoredKg=isLb?Math.round((nextDisplay/2.2046226)*100)/100:nextDisplay;
      log.sets[i].weight=String(nextStoredKg);
      persistDebounced();
      document.querySelectorAll(`input[data-log="weight"][data-log-set="${i}"]`).forEach(input=>input.value=String(nextDisplay));
      if(window.vibrateGym) window.vibrateGym("set");
    };
  });
  document.querySelectorAll("[data-log]").forEach(input=>input.addEventListener("input",()=>{
    const field=input.dataset.log,setIndex=input.dataset.logSet;
    document.querySelectorAll(`input[data-log="${field}"][data-log-set="${setIndex}"]`).forEach(peer=>{if(peer!==input)peer.value=input.value;});
    saveLog(base,item);
  }));
  document.querySelectorAll("[data-live-reps-step]").forEach(button=>button.onclick=()=>{
    const input=document.querySelector("[data-live-log][data-log='reps']");
    if(!input)return;
    input.value=String(Math.max(0,Math.min(99,(Number(input.value)||0)+Number(button.dataset.liveRepsStep))));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    const counter=button.closest(".live-rep-counter");counter?.classList.remove("is-counting");void counter?.offsetWidth;counter?.classList.add("is-counting");
    if(navigator.vibrate)navigator.vibrate(12);
  });
  document.querySelectorAll("[data-cardio]").forEach(input=>input.addEventListener("input",()=>{state.cardioDraft[input.dataset.cardio]=input.value;persistDebounced();document.querySelector(".cardio-panel .progression-callout").textContent=cardioAdvice();}));
  const swipe = document.querySelector("[data-swipe]");
  let touchStartX = 0, touchStartY = 0;
  swipe?.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, {passive:true});
  swipe?.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4){
      if(state.lang === "ar"){
        dx > 0 ? next() : prev();
      } else {
        dx < 0 ? next() : prev();
      }
    }
  }, {passive:true});
  updateMediaSession("exercise", {exercise: item.name, set: (done.length || 0)});
}
function motionAction(action){
  if(action==="play")state.paused=!state.paused;
  if(action==="speed")return openWorkoutChoiceSheet("speed");
  if(action==="view")return openWorkoutChoiceSheet("view");
  if(action==="muscles")state.muscles=!state.muscles;
  persist();
  if(state.view==="preview"){
    const open=new Set([...document.querySelectorAll(".preview-row")].map((el,i)=>el.open?i:-1).filter(i=>i>=0));
    showSessionPreview(state.previewSession,open);
  }else renderExercise();
}
function formatClock(seconds){const m=Math.floor(seconds/60),s=String(seconds%60).padStart(2,"0");return `${m}:${s}`;}
function toggleExerciseTimer(motion){
  if(state.exerciseTimer){stopExerciseClock();return;}
  const total=motionGuide[motion]?.[2]||30,item=currentItem(sessions[state.session].exercises[state.index]),sided=["kneel","birddog","stretch"].includes(motion),u=U(),ar=state.lang==="ar";
  const key=`${state.session}-${state.index}`,done=state.completed[key]||[],nextSet=Array.from({length:item.sets},(_,i)=>i).find(i=>!done.includes(i));
  const targetMuscles=targetMusclesFor(item);
  state.exerciseTimer={remaining:total,total,paused:false,halfway:false,sided,targetEndTime:Date.now()+total*1000,lastSpokenSecond:null};
  const overlay=document.createElement("div");
  overlay.className="timed-mode workout-timed-mode";
  overlay.setAttribute("aria-labelledby","timedExerciseTitle");
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<section class="timed-workout-card">
    <header class="timed-workout-head"><div><small>${esc(categoryLabel(item.category))} · ${ar?"تمرين موقّت":"TIMED EXERCISE"}</small><h2 id="timedExerciseTitle">${esc(item.name)}</h2></div><button class="round-button" data-timed-close aria-label="${ar?"إغلاق":"Close"}">×</button></header>
    <div class="timed-workout-visual visual-wrap anatomy-wrap" role="img" aria-label="Demonstration of ${esc(item.name)}">${exerciseVisual(item,{preview:true})}<span>${esc(targetMuscles)}</span></div>
    <div class="timed-workout-focus">
      <div class="timed-ring" data-timed-ring style="--progress:100%"><div><strong data-timed-value>${formatClock(total)}</strong><small data-timed-total>/ ${formatClock(total)}</small></div></div>
      <div class="timed-workout-status"><small>${ar?`المجموعة ${(nextSet??0)+1} من ${item.sets}`:`SET ${(nextSet??0)+1} OF ${item.sets}`}</small><strong data-timed-phase>${ar?"ابدأ الحركة بتحكم":"MOVE WITH CONTROL"}</strong><span>${sided?(ar?"سيتم تنبيهك لتبديل الجهة":"A cue will signal the side change"):(ar?"حافظ على إيقاع هادئ":"Keep a controlled rhythm")}</span></div>
    </div>
    <div class="timed-primary-actions"><button data-timed-pause type="button">${u.pause}</button><button class="is-primary" data-timed-skip type="button">${ar?"إكمال المجموعة":"Complete set"}</button></div>
    <div class="timed-secondary-actions"><button data-timed-add type="button">+15s</button><label><input type="checkbox" data-voice ${state.voice?"checked":""}> ${ar?"إرشادات صوتية":"Spoken cues"}</label></div>
    <div class="timed-cue"><small>${u.cue}</small><p>${esc(item.cues)}</p></div>
  </section>`);
  document.body.appendChild(overlay);
  overlay.querySelector("[data-timed-close]").onclick=stopExerciseClock;
  overlay.querySelector("[data-timed-skip]").onclick=finishExerciseTimer;
  overlay.querySelector("[data-timed-add]").onclick=()=>{const t=state.exerciseTimer;if(!t)return;t.remaining+=15;t.total+=15;if(!t.paused)t.targetEndTime=Date.now()+t.remaining*1000;updateExerciseTimer();};
  overlay.querySelector("[data-timed-pause]").onclick=e=>{const t=state.exerciseTimer;if(!t)return;if(!t.paused)t.remaining=Math.max(0,Math.ceil((t.targetEndTime-Date.now())/1000));t.paused=!t.paused;if(!t.paused)t.targetEndTime=Date.now()+t.remaining*1000;e.currentTarget.textContent=t.paused?u.resume:u.pause;overlay.classList.toggle("is-paused",t.paused);updateExerciseTimer();};
  overlay.querySelector("[data-voice]").onchange=e=>{state.voice=e.target.checked;persist();};
  speak(ar?"ابدأ":"Start");
  updateExerciseTimer();
  state.exerciseTimer.interval=setInterval(()=>{
    const t=state.exerciseTimer;if(!t||t.paused)return;
    t.remaining=Math.max(0,Math.ceil((t.targetEndTime-Date.now())/1000));
    updateExerciseTimer();
    if(!t.halfway&&t.remaining<=Math.ceil(t.total/2)){
      t.halfway=true;
      speak(t.sided?(ar?"بدّل الجهة":"Switch sides"):(ar?"منتصف الوقت":"Halfway"));
      if(navigator.vibrate)navigator.vibrate(100);
    }
    if(t.remaining<=3&&t.remaining>0&&t.lastSpokenSecond!==t.remaining){t.lastSpokenSecond=t.remaining;speak(String(t.remaining));}
    if(t.remaining<=0)finishExerciseTimer();
  },250);
}
function updateExerciseTimer(){const t=state.exerciseTimer;if(!t)return;const progress=Math.max(0,t.remaining/t.total*100);document.querySelector("[data-timed-value]").textContent=formatClock(t.remaining);document.querySelector("[data-timed-total]").textContent=`/ ${formatClock(t.total)}`;document.querySelector("[data-timed-ring]")?.style.setProperty("--progress",`${progress}%`);document.querySelector("[data-timed-phase]").textContent=t.paused?(state.lang==="ar"?"متوقف مؤقتاً":"PAUSED"):t.halfway?(t.sided?(state.lang==="ar"?"الجهة الثانية":"SECOND SIDE"):(state.lang==="ar"?"النصف الثاني":"SECOND HALF")):(state.lang==="ar"?"ابدأ الحركة بتحكم":"MOVE WITH CONTROL");}
function speak(text){if(!state.voice||state.muted||!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=state.lang==="ar"?"ar-EG":"en-US";utterance.rate=.95;window.speechSynthesis.speak(utterance);}
function finishExerciseTimer(){if(!state.exerciseTimer)return;const key=`${state.session}-${state.index}`,item=sessions[state.session].exercises[state.index],done=state.completed[key]||[],nextSet=Array.from({length:item.sets},(_,i)=>i).find(i=>!done.includes(i));clearInterval(state.exerciseTimer.interval);state.exerciseTimer=null;document.querySelector(".workout-timed-mode")?.remove();signalEnd();speak(state.lang==="ar"?"تم":"Complete");if(nextSet!==undefined)toggleSet(nextSet);else renderExercise();}
function saveLog(base,item){
  const id=exerciseId(base),log=normalizedLog(id,item.sets);
  document.querySelectorAll("[data-log-set]").forEach(input=>{const i=Number(input.dataset.logSet);log.sets[i][input.dataset.log]=input.value;});persistDebounced();
}
let audioCtx=null;
function ensureAudioContext(){
  if(!audioCtx){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch{return null;}}
  if(audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});
  return audioCtx;
}
document.addEventListener("pointerdown",()=>ensureAudioContext(),{once:true});
function playChime(kind="end"){
  const ctx=ensureAudioContext();if(!ctx||state.muted)return;
  const pack=state.preferences?.soundPack||"digital";
  try{
    const now=ctx.currentTime;
    if(pack==="click"){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="sine";o.frequency.setValueAtTime(1200,now);
      o.frequency.exponentialRampToValueAtTime(300,now+0.04);
      g.gain.setValueAtTime(0.2,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.04);
      o.connect(g);g.connect(ctx.destination);
      o.start(now);o.stop(now+0.04);
    } else if(pack==="bell"){
      [440, 880, 1320].forEach((freq, idx)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type="sine";o.frequency.value=freq;
        const gainVal=0.15/(idx+1);
        g.gain.setValueAtTime(gainVal,now);
        g.gain.exponentialRampToValueAtTime(0.0001,now+0.7);
        o.connect(g);g.connect(ctx.destination);
        o.start(now);o.stop(now+0.7);
      });
    } else {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="square";o.frequency.setValueAtTime(kind==="pr"?980:740,now);
      o.frequency.setValueAtTime(kind==="pr"?1320:880,now+0.08);
      g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.25);
      o.connect(g);g.connect(ctx.destination);
      o.start(now);o.stop(now+0.25);
    }
  }catch{}
}
function playCountdownBeep(freq=520,duration=0.08){
  if(state.muted)return;
  const ctx=ensureAudioContext();if(!ctx)return;
  try{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=freq;
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);
    o.start();
    o.stop(ctx.currentTime+duration);
  }catch{}
}
function signalEnd(){
  vibrateGym("timer");
  if(!state.muted){
    playChime("end");
    if(state.voice) speak(state.lang==="ar"?"انتهى وقت الراحة":"Rest over, time to lift!");
  }
}
function updateMediaSession(action="idle",detail={}){
  if(!("mediaSession" in navigator))return;
  try{
    if(action==="idle"){
      navigator.mediaSession.metadata=null;
      navigator.mediaSession.playbackState="none";
      return;
    }
    const isRest=action==="rest",session=sessions[state.session],exercise=detail.exercise||session?.exercises[state.index]?.name||"Training";
    const setInfo=detail.set!==undefined?`Set ${detail.set+1}`:"";
    navigator.mediaSession.metadata=new MediaMetadata({
      title:isRest?`Rest: ${detail.time||"Next Set"}`:exercise,
      artist:"Health OS",
      album:isRest?`${exercise} · ${setInfo}`:(session?.title||"Workout"),
      artwork:[
        {src:"icon-192.png",sizes:"192x192",type:"image/png"},
        {src:"icon-512.png",sizes:"512x512",type:"image/png"}
      ]
    });
    navigator.mediaSession.playbackState=isRest&&state.timer?.paused?"paused":"playing";
    navigator.mediaSession.setActionHandler("nexttrack",()=>{if(state.view==="player")next();});
    navigator.mediaSession.setActionHandler("previoustrack",()=>{if(state.view==="player")prev();});
  }catch{}
}
function toggleSet(setIndex) {
  const key = `${state.session}-${state.index}`;
  const list = state.completed[key] || [];
  const already = list.includes(setIndex);
  const item=sessions[state.session].exercises[state.index];
  if(!already){
    vibrateGym("set");
    const id = exerciseId(item), log = normalizedLog(id, item.sets);
    const s = log.sets[setIndex] || {};
    const advice = window.REP_PERFORMANCE_INSIGHTS?.progressionAdvice(id, state);
    if(window.REP_AUDIO_COACH?.announceSetComplete) {
      window.REP_AUDIO_COACH.announceSetComplete(setIndex, s.weight, s.reps, s.rpe, advice?.badge);
    }
  }
  state.completed[key] = already ? list.filter(i=>i!==setIndex) : [...list,setIndex];
  persist();
  const allSetsDone=!already && state.completed[key].length===item.sets;
  if(allSetsDone){
    triggerConfetti({subtle:true});
  }
  if (!already && item.rest) startTimer(item.rest, setIndex);
  renderExercise();
  if(!already){
    const btn=document.querySelector(`[data-set="${setIndex}"]`);
    if(btn){btn.classList.add("is-just-checked");setTimeout(()=>btn.classList.remove("is-just-checked"),400);}
  }
  if(!already&&!item.rest&&allSetsDone){
    const completedSession=state.session,completedIndex=state.index;
    setTimeout(()=>{
      if(state.view==="player"&&state.session===completedSession&&state.index===completedIndex)next();
    },650);
  }
}
function prev(){ stopExerciseClock();cancelRestTimer();if(REP_TRAINING_SESSION.previousExercise(state).moved){exerciseTransitioning=true;persist();resetWorkoutScroll();renderExercise();} }
function next(){
  stopExerciseClock();cancelRestTimer();
  const res=REP_TRAINING_SESSION.advanceExercise(state,sessions,{weightKg:latestWeightKg(),motionDurations:Object.fromEntries(Object.entries(motionGuide).map(([k,v])=>[k,v[2]]))});
  if(res.completed&&res.record)queueWorkout(res.record);
  exerciseTransitioning=!res.completed;persist();resetWorkoutScroll();renderExercise();
}
function stopExerciseClock(){if(state.exerciseTimer?.interval)clearInterval(state.exerciseTimer.interval);state.exerciseTimer=null;document.querySelector(".timed-mode")?.remove();window.speechSynthesis?.cancel();}
function startSessionClock(){stopSessionClock();state.sessionClock=setInterval(updateSessionClock,1000);updateSessionClock();}
function stopSessionClock(){if(state.sessionClock)clearInterval(state.sessionClock);state.sessionClock=null;}
function updateSessionClock(){const el=document.querySelector("#sessionElapsed");if(el&&state.sessionStartedAt)el.textContent=formatClock(Math.floor((Date.now()-state.sessionStartedAt)/1000));}
// Exiting mid-session abandons it rather than leaving it "in progress"
// forever - otherwise Home keeps offering to resume a session the user
// explicitly left, even after just opening an exercise to look around.
function abandonSession(){
  REP_TRAINING_SESSION.abandonWorkout(state);
}
function showExitConfirm(){
  if(document.querySelector(".exit-confirm"))return;const u=U(),box=document.createElement("div");box.className="exit-confirm";box.innerHTML=REP_SAFE_DOM.sanitize(`<strong>${u.exitQuestion}</strong><button data-stay>${u.stay}</button><button class="danger" data-leave>${u.exit}</button>`);document.body.appendChild(box);box.querySelector("[data-stay]").onclick=()=>box.remove();box.querySelector("[data-leave]").onclick=()=>{box.remove();cancelRestTimer();abandonSession();persist();renderHome();};
}
// MET (metabolic equivalent) per session type, used only for a rough estimate -
// there's no heart-rate or wearable data source here, so this is duration x
// intensity x bodyweight, not a measured burn.
const SESSION_MET={morning:2.8,gym:5,cardio:4.3,bad:2.5,gymLite:4.5,padel:6,football:7,basketball:6.5,swimming:6,cycling:7.5,tennis:7,other:5};
const ACTIVITY_TYPES=[["padel",{en:"Padel",ar:"بادل"}],["football",{en:"Football",ar:"كرة القدم"}],["basketball",{en:"Basketball",ar:"كرة السلة"}],["swimming",{en:"Swimming",ar:"سباحة"}],["cycling",{en:"Cycling",ar:"دراجة"}],["tennis",{en:"Tennis",ar:"تنس"}],["other",{en:"Other",ar:"أخرى"}]];
function latestWeightKg(){const w=[...state.bodyWeights].sort((a,b)=>b.week.localeCompare(a.week))[0];return w?w.kg:75;}
function estimateCalories(sessionId,durationSeconds){return Math.round((SESSION_MET[sessionId]||4)*latestWeightKg()*(durationSeconds/3600));}
function logActivity(type,customName,minutes,calories,notes){
  const mins=Math.max(1,Math.min(300,Math.round(Number(minutes)||0)));
  if(!mins)return false;
  const duration=mins*60,label=type==="other"?String(customName||"Activity").trim().slice(0,60)||"Activity":(ACTIVITY_TYPES.find(([id])=>id===type)?.[1].en||"Activity");
  const rawCalories=Number(calories),kcal=Number.isFinite(rawCalories)&&String(calories).trim()!==""?Math.max(0,Math.round(rawCalories)):estimateCalories(type,duration),note=String(notes||"").trim().slice(0,200);
  const record={id:Date.now(),date:new Date().toISOString(),session:"activity",activityType:type,activityLabel:label,duration,calories:kcal,sets:0,loads:{},entries:[{entry:`${label} · ${mins} min`,exercise:label,set:1,weight:"",reps:"",rpe:"",note,duration,rest:"",progression:"",personalBest:false}],cardio:null};
  state.history.unshift(record);state.history=state.history.slice(0,60);
  queueWorkout(record);persist();return true;
}
function queueWorkout(record){
  if(!record?.entries?.length)return;persist();window.REP_SYNC_RUNTIME?.syncRecord?.({id:`workout-${record.id}`,kind:"workout",workout:{id:String(record.id),date:record.date,type:record.activityLabel||"Recovery",duration:record.duration,entries:record.entries}});
}
function queueHealth(kind,payload){persist();window.REP_SYNC_RUNTIME?.syncRecord?.({id:`${kind}-${kind==="food"?(payload.id||Date.now()):kind==="habit"?`${payload.date}-${payload.id}`:payload.date}`,kind,payload});}

async function syncPending(){
  return window.REP_SYNC_RUNTIME?.syncEverything?.();
}
function syncStatusText(){const ar=state.lang==="ar",key=localStorage.getItem(syncKeyStorage),queued=window.REP_SYNC_OUTBOX?.summary(state.syncQueue).total||0;if(state.pairBusy)return ar?"جارٍ التحقق من المفتاح…":"Checking pairing key…";if(!key)return state.syncState==="auth"?(ar?"أعد اقتران هذا الجهاز":"Pair this device again"):(ar?"يلزم الاتصال مرة واحدة":"One-time connection needed");if(state.syncState==="syncing")return ar?"جارٍ التحقق في Notion…":"Verifying in Notion…";if(queued)return ar?`${queued} سجل قيد الانتظار`:`${queued} record${queued===1?"":"s"} pending`;return ar?"الجهاز مقترن · تمت المزامنة":"Device paired · verified sync";}
function updateSyncPanel(){document.querySelectorAll("[data-sync-status]").forEach(status=>status.textContent=state.pairMessage||syncStatusText());document.querySelectorAll("[data-sync-all]").forEach(button=>button.disabled=state.syncState==="syncing"||!localStorage.getItem(syncKeyStorage));document.querySelectorAll("[data-save-sync-key],[data-food-pair-submit]").forEach(button=>button.disabled=state.pairBusy);}
// validatePairingKey and connectPairingKey are defined in enhancements.js,
// which always loads after this file and is the single source of truth for
// pairing-key validation (32-char minimum). Declaring them here too would
// just be dead code the enhanced versions immediately overwrite.
async function savePairingKey(){const input=document.querySelector("[data-sync-key]");if(await connectPairingKey(input,false))syncPending();}
async function pairFromFood(){const input=document.querySelector("[data-food-pair-key]"),pending=state.foodPendingPayload;if(!await connectPairingKey(input,true))return;syncPending();if(pending){state.foodPendingPayload=null;await analyzeFood(pending);}}
async function forgetPairingKey(){await repAuth.fetch("/api/pair/disconnect",{method:"POST"}).catch(()=>{});repAuth.clear();state.syncState="idle";state.pairMessage="";if(state.view==="nutrition")renderNutrition();else updateSyncPanel();}
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/"),raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
function pushStatusText(){
  const ar=state.lang==="ar";
  if(!("serviceWorker" in navigator)||!("PushManager" in window))return ar?"غير مدعوم في هذا المتصفح":"Not supported in this browser";
  if(typeof Notification!=="undefined"&&Notification.permission==="denied")return ar?"الإشعارات محظورة في إعدادات المتصفح":"Notifications blocked in browser settings";
  return state.pushEndpoint?(ar?`مفعّل · يومياً الساعة ${state.pushTime}`:`Enabled · daily at ${state.pushTime}`):(ar?"غير مفعّل":"Not enabled");
}
async function togglePushReminders(){
  const ar=state.lang==="ar";
  if(state.pushEndpoint){await disablePushReminders();return;}
  if(!("serviceWorker" in navigator)||!("PushManager" in window)){showToast(ar?"الإشعارات غير مدعومة في هذا المتصفح.":"Push notifications aren't supported in this browser.");return;}
  const time=document.querySelector("[data-push-time]")?.value||state.pushTime;
  try{
    const keyRes=await fetch("/api/push/public-key"),keyData=await keyRes.json().catch(()=>({}));
    if(!keyRes.ok||!keyData.key){showToast(ar?"الإشعارات غير مُعدّة على الخادم بعد.":"Push notifications aren't set up on the server yet.");return;}
    const permission=await Notification.requestPermission();
    if(permission!=="granted"){showToast(ar?"تم رفض إذن الإشعارات.":"Notification permission was denied.");return;}
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(keyData.key)});
    const res=await repAuth.fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({subscription:sub.toJSON(),time,timezoneOffsetMinutes:new Date().getTimezoneOffset(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",lang:state.lang})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw Error(data.error||"subscribe failed");
    state.pushEndpoint=sub.endpoint;state.pushTime=time;persist();
    if(state.view==="history")renderHistory();
  }catch{showToast(ar?"تعذّر تفعيل الإشعارات.":"Couldn't enable push notifications.");}
}
async function disablePushReminders(){
  try{
    const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(sub){await repAuth.fetch("/api/push/unsubscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})}).catch(()=>{});await sub.unsubscribe();}
  }catch{}
  state.pushEndpoint=null;persist();
  if(state.view==="history")renderHistory();
}

function renderHistory(){
  stopSessionClock();document.body.classList.remove("workout-mode");state.view="history";state.activeTab="train";persist();updatePrimaryTabs();const u=U(),rows=state.history,ar=state.lang==="ar";
  const best={};rows.forEach(r=>Object.entries(r.loads||{}).forEach(([name,l])=>setsFromLog(l).forEach(s=>{const w=Number(s.weight)||0,reps=Number(s.reps)||0;if(!best[name]||w>best[name].weight||(w===best[name].weight&&reps>best[name].reps))best[name]={weight:w,reps};})));
  const streak=computeStreak();
  const weekAgo=Date.now()-7*86400000,sessions7=rows.filter(r=>new Date(r.date).getTime()>=weekAgo).length;
  const totalMinutes=Math.round(rows.reduce((n,r)=>n+(Number(r.duration)||0),0)/60),totalSets=rows.reduce((n,r)=>n+(Number(r.sets)||0),0),totalCalories=rows.reduce((n,r)=>n+(Number(r.calories)||0),0);
  const bestEntries=Object.entries(best).filter(([,b])=>b.weight);
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="recovery-head activity-history-head"><p class="eyebrow">${u.history}</p><h1>${state.lang==="ar"?"تقدمك، بوضوح.":"Progress, without noise."}</h1><p>${u.historyDesc}</p></section>
  <section class="activity-overview" aria-label="${ar?"ملخص النشاط":"Activity summary"}">
    <div class="activity-consistency"><span class="activity-consistency-icon">${ICONS.flame}</span><div><small>${ar?"الاستمرارية":"CONSISTENCY"}</small><strong>${streak} <em>${ar?"يوم":"day streak"}</em></strong><p>${ar?`${sessions7} حصة خلال آخر 7 أيام`:`${sessions7} session${sessions7===1?"":"s"} in the last 7 days`}</p></div></div>
    <div class="history-summary"><div><strong>${rows.length}</strong><span>${ar?"حصة":"sessions"}</span></div><div><strong>${totalMinutes}</strong><span>${ar?"دقيقة":"minutes"}</span></div><div><strong>${totalSets}</strong><span>${ar?"مجموعة":"sets"}</span></div><div><strong>${totalCalories}</strong><span>${ar?"سعرة (تقدير)":"kcal (est.)"}</span></div></div>
  </section>
  <details class="history-utilities"><summary><span><small>${ar?"البيانات والاتصالات":"DATA & CONNECTIONS"}</small><strong>${ar?"المزامنة، التذكير، والنسخ الاحتياطي":"Sync, reminders, and backup"}</strong></span><b>${ar?"إدارة":"Manage"}</b></summary><div class="history-utilities-body">
  <section class="notion-sync"><div class="notion-sync-head"><span class="notion-mark">N</span><div><strong>Notion</strong><small data-sync-status>${syncStatusText()}</small></div></div><form class="notion-sync-actions" autocomplete="off"><input data-sync-key type="password" autocomplete="new-password" placeholder="${state.lang==="ar"?"مفتاح الاقتران":"Pairing key"}" aria-label="${state.lang==="ar"?"مفتاح مزامنة Notion":"Notion sync pairing key"}"><button type="button" data-save-sync-key>${state.lang==="ar"?"اقتران":"Pair"}</button><button type="button" class="quiet" data-forget-sync>${state.lang==="ar"?"إلغاء اقتران الجهاز":"Unpair device"}</button></form><p>${state.lang==="ar"?"أدخل المفتاح مرة واحدة لكل جهاز. استخدم زر مزامنة كل شيء في مركز المزامنة لإرسال كل البيانات مباشرةً.":"Enter the key once per device. Use Sync everything in the Sync Center to send all data directly."}</p></section>
  <section class="push-card"><div class="push-head"><span class="push-icon">${ICONS.bell}</span><div><strong>${state.lang==="ar"?"تذكير يومي":"Daily reminder"}</strong><small data-push-status>${pushStatusText()}</small></div></div><div class="push-actions"><input type="time" data-push-time value="${state.pushTime}" aria-label="${state.lang==="ar"?"وقت التذكير اليومي":"Daily reminder time"}" ${state.pushEndpoint?"disabled":""}><button data-push-toggle>${state.pushEndpoint?(state.lang==="ar"?"إيقاف":"Disable"):(state.lang==="ar"?"تفعيل":"Enable")}</button></div><p>${state.lang==="ar"?"إشعار واحد يومياً في الوقت الذي تختاره — حتى عندما يكون التطبيق مغلقاً.":"One notification a day at the time you choose — even when the app is closed."}</p></section>
  <section class="data-tools"><button data-export>${state.lang==="ar"?"تصدير نسخة JSON":"Export JSON backup"}</button><label>${state.lang==="ar"?"استيراد نسخة":"Import backup"}<input data-import type="file" accept="application/json,.json"></label><small>${state.lang==="ar"?"تبقى سجلاتك على هذا الجهاز حتى تفعّل اتصالاً أو تصدّر نسخة أو ترسل صورة للتحليل بالذكاء الاصطناعي.":"Your logs stay on this device until you enable a connection, export a backup, or send an image for AI analysis."}</small><small>${state.lastBackupAt?(state.lang==="ar"?`آخر نسخة احتياطية: ${new Date(state.lastBackupAt).toLocaleDateString("ar-EG",{day:"numeric",month:"short"})}`:`Last backup: ${new Date(state.lastBackupAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`):(state.lang==="ar"?"لم تُصدَّر نسخة احتياطية بعد":"No backup exported yet")}</small>${clientErrorCount()?`<button class="quiet" data-diagnostics>${state.lang==="ar"?`سجل الأخطاء (${clientErrorCount()})`:`Error log (${clientErrorCount()})`}</button>`:""}</section>
  </div></details>
  ${rows.length?`
    ${bestEntries.length?`<div class="history-section-head"><div><small>${ar?"أفضل النتائج":"PERSONAL BESTS"}</small><h2>${ar?"معاييرك الحالية":"Current benchmarks"}</h2></div><span>${bestEntries.length}</span></div><section class="personal-best-grid">${bestEntries.map(([name,b])=>`<article class="pb-card"><small>${ar?"أفضل رقم شخصي":"PERSONAL BEST"}</small><h2>${esc(ar?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</h2><strong>${b.weight} kg × ${b.reps||"—"}</strong><span>${progressionAdvice(name)}</span></article>`).join("")}</section>`:""}
    <div class="history-section-head"><div><small>${ar?"السجل":"ACTIVITY"}</small><h2>${ar?"الحصص الأخيرة":"Recent sessions"}</h2></div><span>${rows.length}</span></div>
    <section class="history-list">${rows.map((r,rowIndex)=>{const isActivity=r.session==="activity";const hasPr=!isActivity&&(r.entries||[]).some(e=>e.personalBest);const icon=isActivity?ICONS.plus:(ICONS[sessions[r.session]?.icon]||ICONS.dumbbell);const accent=isActivity?"#ffd36a":(sessions[r.session]?.accent||"var(--acid)");const details=isActivity?(r.entries?.[0]?.note?`<small>${esc(r.entries[0].note)}</small>`:""):Object.entries(r.loads||{}).map(([name,l])=>{const setText=setsFromLog(l).filter(s=>s.weight||s.reps).map((s,i)=>`${i+1}: ${s.weight||"—"}kg × ${s.reps||"—"}${s.rpe?` @${s.rpe}`:""}`).join(" · ");return setText?`<small><b>${esc(name)}</b> ${setText}</small>`:""}).join("");const name=isActivity?esc(r.activityLabel||"Activity"):sessionText(r.session,sessions[r.session]).name;const meta=isActivity?`${formatClock(r.duration)}${r.calories?` · ${r.calories} kcal`:""}`:`${formatClock(r.duration)} · ${r.sets} ${ar?"مجموعات":"sets"}${r.calories?` · ~${r.calories} kcal`:""}`;return `<article class="history-row ${rowIndex===0?"is-latest":""}"><div class="history-row-lead"><span class="history-icon" style="--card-accent:${accent}">${icon}</span><span class="history-date">${new Date(r.date).toLocaleDateString(ar?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</span></div><div class="history-row-copy"><strong>${name}${hasPr?`<i class="pr-tag">${ar?"قياسي":"PR"}</i>`:""}</strong><small class="history-row-meta">${meta}</small>${details}</div></article>`}).join("")}</section>
  `:`<div class="empty-state">${u.noHistory}</div>`}`);
  document.querySelector("[data-export]").onclick=exportData;document.querySelector("[data-import]").onchange=importData;document.querySelector("[data-save-sync-key]").onclick=savePairingKey;document.querySelector("[data-forget-sync]").onclick=forgetPairingKey;document.querySelector("[data-diagnostics]")?.addEventListener("click",showDiagnostics);document.querySelector("[data-push-toggle]").onclick=togglePushReminders;updateSyncPanel();
}

function clientErrorCount(){try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]").length;}catch{return 0;}}
function showDiagnostics(){
  if(document.querySelector(".diagnostics-panel"))return;
  const ar=state.lang==="ar",log=(()=>{try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]");}catch{return [];}})();
  const box=document.createElement("div");box.className="exit-confirm diagnostics-panel";
  box.innerHTML=REP_SAFE_DOM.sanitize(`<strong>${ar?"سجل الأخطاء الأخيرة":"Recent errors"}</strong>${log.length?`<ul class="diagnostics-list">${log.slice().reverse().map(e=>`<li><small>${esc(e.time)} · ${esc(e.source)}</small><span>${esc(e.message)}</span></li>`).join("")}</ul>`:`<p>${ar?"لا توجد أخطاء مسجلة.":"No errors recorded."}</p>`}<button data-clear-log>${ar?"مسح السجل":"Clear log"}</button><button data-close-diagnostics>${ar?"إغلاق":"Close"}</button>`);
  document.body.appendChild(box);
  box.querySelector("[data-close-diagnostics]").onclick=()=>box.remove();
  box.querySelector("[data-clear-log]").onclick=()=>{localStorage.removeItem(errorLogKey);box.remove();if(state.view==="history")renderHistory();};
}

function exportData(){
  state.lastBackupAt=new Date().toISOString();state.backupSnoozedUntil=null;persist();
  const errorLog=(()=>{try{return JSON.parse(localStorage.getItem(errorLogKey)||"[]");}catch{return [];}})();
  const payload={app:"Rep Gym Companion",schema:3,guideVersion:REP_HEALTH_GUIDE.version,exportedAt:new Date().toISOString(),data:JSON.parse(localStorage.getItem(storageKey)||"{}"),diagnostics:errorLog};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`rep-backup-${isoDay()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  if(state.view==="home")renderHome();
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
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="recovery-head"><p class="eyebrow">${ar?"السلامة والجودة":"SAFETY & QUALITY"}</p><h1>${ar?"المراجعة البشرية، موثّقة.":"Human review, documented."}</h1><p>${ar?"الرسومات والتعليمات تعليمية وليست تشخيصاً طبياً. الاعتماد أدناه يجب أن ينجزه مدرب معتمد أو أخصائي علاج طبيعي بعد الفحص.":"The visuals and cues are educational, not medical diagnosis. Sign-off below must be completed by a certified trainer or physiotherapist after inspection."}</p></section>
  <section class="review-status"><strong>${complete}/7</strong><div><b>${ar?"تم اعتماد الحركات":"movements signed off"}</b><span>${complete===7?(ar?"اكتملت المراجعة البشرية":"Human review complete"):(ar?"الاعتماد المهني ما زال معلقاً":"Professional sign-off pending")}</span></div></section>
  <section class="review-list">${reviewExercises.map(name=>{const x=r[name]||{};return `<details class="review-card" ${x.signed?"":"open"}><summary><span>${esc(ar?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</span><b>${x.signed?"✓":"○"}</b></summary><div><label><input type="checkbox" data-review-check="joints" data-review-name="${esc(name)}" ${x.joints?"checked":""}> ${ar?"مسار المفاصل ومدى الحركة صحيحان":"Joint path and range are accurate"}</label><label><input type="checkbox" data-review-check="muscles" data-review-name="${esc(name)}" ${x.muscles?"checked":""}> ${ar?"تظليل العضلات صحيح":"Muscle highlighting is accurate"}</label><label><input type="checkbox" data-review-check="cues" data-review-name="${esc(name)}" ${x.cues?"checked":""}> ${ar?"التعليمات والتحذيرات آمنة":"Cues and warnings are safe"}</label><input data-review-field="reviewer" data-review-name="${esc(name)}" value="${esc(x.reviewer||"")}" placeholder="${ar?"اسم المراجع":"Reviewer name"}"><input data-review-field="credential" data-review-name="${esc(name)}" value="${esc(x.credential||"")}" placeholder="${ar?"الاعتماد / رقم الترخيص":"Credential / licence number"}"><label class="signoff"><input type="checkbox" data-review-check="signed" data-review-name="${esc(name)}" ${x.signed?"checked":""}> ${ar?"أعتمد هذه الحركة بعد مراجعتها":"I sign off this movement after review"}</label></div></details>`}).join("")}</section>
  <section class="field-test"><h2>${ar?"اختبار داخل الجيم":"Real-gym field test"}</h2><p>${ar?"نفّذ هذا على الهاتف الفعلي أثناء حصة واحدة. لا تُعلّم بنداً إلا بعد تجربته.":"Run this on the actual phone during one workout. Check an item only after testing it."}</p>${fieldChecks.map(([id,en,arabic])=>`<label><input type="checkbox" data-field="${id}" ${state.fieldTest[id]?"checked":""}> ${ar?arabic:en}</label>`).join("")}<textarea data-field-notes placeholder="${ar?"المشكلات، الجهاز، الإضاءة، القفازات...":"Issues, phone model, lighting, gloves…"}">${esc(state.fieldTest.notes||"")}</textarea><input data-field-date type="date" value="${esc(state.fieldTest.date||"")}"></section>
  <section class="evidence-note"><strong>${ar?"مصادر السلامة":"Safety references"}</strong><p>${ar?"راجع الإرشادات العامة لدى ACSM وCDC، واطلب تقييماً طبياً عند الألم أو الأعراض غير المعتادة.":"Follow general ACSM and CDC guidance, and seek medical assessment for pain or unusual symptoms."}</p><a href="https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" target="_blank" rel="noopener">ACSM physical activity guidance ↗</a><a href="https://www.cdc.gov/physical-activity/php/about/index.html" target="_blank" rel="noopener">CDC physical activity basics ↗</a></section>
  <button class="nav-button primary review-export" data-review-export>${ar?"تصدير حزمة المراجعة":"Export review package"}</button>`);
  document.querySelectorAll("[data-review-check]").forEach(el=>el.onchange=()=>{const n=el.dataset.reviewName;r[n]=r[n]||{};r[n][el.dataset.reviewCheck]=el.checked;if(el.dataset.reviewCheck==="signed")r[n].date=new Date().toISOString();persist();renderReview();});
  document.querySelectorAll("[data-review-field]").forEach(el=>el.oninput=()=>{const n=el.dataset.reviewName;r[n]=r[n]||{};r[n][el.dataset.reviewField]=el.value;persistDebounced();});
  document.querySelectorAll("[data-field]").forEach(el=>el.onchange=()=>{state.fieldTest[el.dataset.field]=el.checked;persist();});
  document.querySelector("[data-field-notes]").oninput=e=>{state.fieldTest.notes=e.target.value;persistDebounced();};document.querySelector("[data-field-date]").onchange=e=>{state.fieldTest.date=e.target.value;persist();};document.querySelector("[data-review-export]").onclick=exportData;
}

function renderComplete() {
  stopSessionClock();cancelRestTimer();document.body.classList.remove("workout-mode");document.body.classList.add("workout-complete-mode");
  const session = sessions[state.session],u=U(),ls=sessionText(state.session,session),last=state.history[0],ar=state.lang==="ar";
  const stats=[
    [formatClock(last?.duration||0),ar?"المدة":"DURATION"],
    [String(last?.sets||0),ar?"المجموعات":"SETS"],
    [String(last?.entries?.length||session.exercises.length),ar?"الحركات":"MOVES"],
    ...(last?.calories?[[`~${last.calories}`,ar?"سعرة تقديرية":"KCAL EST."]]:[])
  ];
  const prByExercise={};
  (last?.entries||[]).filter(e=>e.personalBest).forEach(e=>{const w=Number(e.weight)||0;if(!prByExercise[e.exercise]||w>prByExercise[e.exercise].weight)prByExercise[e.exercise]={weight:w,reps:e.reps};});
  const prs=Object.entries(prByExercise);
  const prSection=prs.length?`<div class="complete-pr-list"><small><i>${ICONS.flame}</i>${ar?"رقم قياسي جديد":"NEW PERSONAL BEST"}</small>${prs.map(([name,p])=>`<div><strong>${esc(ar?(REP_I18N.ar.exercises[name]?.[0]||name):name)}</strong><span>${p.weight} kg${p.reps?` × ${esc(String(p.reps))}`:""}</span></div>`).join("")}</div>`:"";
  app.innerHTML = REP_SAFE_DOM.sanitize(`<section class="complete workout-complete"><div class="workout-complete-card"><div class="complete-badge"><span>✓</span></div><p class="eyebrow">${u.sessionComplete}</p><h1>${u.thatCounts}</h1><p class="complete-session-name">${ls.name}</p><p class="complete-copy">${u.completeSub}</p><div class="complete-stat-grid">${stats.map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${label}</span></div>`).join("")}</div>${prSection}<div class="complete-actions"><button class="complete-primary" data-history-after>${ar?"عرض سجل الحصة":"View session history"} <b>→</b></button><button data-home>${u.backSessions}</button></div><button class="complete-reset" data-reset>${ar?"إعادة هذه الحصة":"Repeat this workout"}</button></div></section>`);
  if(prs.length){vibrateGym("pr");triggerConfetti();}
  document.querySelector("[data-history-after]").addEventListener("click",()=>{document.body.classList.remove("workout-complete-mode");renderHistory();});
  document.querySelector("[data-home]").addEventListener("click",()=>{document.body.classList.remove("workout-complete-mode");renderHome();});
  document.querySelector("[data-reset]").addEventListener("click", () => {
    document.body.classList.remove("workout-complete-mode");document.body.classList.add("workout-mode");
    REP_TRAINING_SESSION.resetWorkout(state);
    state.sessionStartedAt = Date.now();
    startSessionClock();
    persist();
    renderExercise();
  });
}

function renderRecovery() {
  state.view="recovery";state.activeTab="train";persist();updatePrimaryTabs();
  if(state.lang==="ar")return renderRecoveryArabic();
  const check = saved.checkin || {};
  app.innerHTML = REP_SAFE_DOM.sanitize(`<section class="recovery-head"><p class="eyebrow">Recovery system</p><h1>Adaptation happens here.</h1><p>Use the basics daily. Check in weekly. Pain is information, not a challenge.</p></section>${recoveryDecisionCard()}
    <section class="recovery-grid">
      ${sleepSummaryCard(false)}
      <article class="recovery-card"><span class="card-kicker">Every day</span><h2>Daily basics</h2><ul><li><strong>Sleep:</strong> 7 hours minimum. For 4:15 AM wake, aim for 9:15 PM bedtime.</li><li><strong>Hydration:</strong> At wake-up and through the morning, especially in Cairo heat.</li><li><strong>Breakfast:</strong> Protein + carbs right after the AM session.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Sun · Tue · Thu</span><h2>After lifting</h2><ul><li>Foam roll lower body + back in the evening, ~8 min.</li><li>Massage gun before sleep, targeted, ~6–8 min.</li><li>Skip routine icing; use ice only for actual joint pain.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">Friday</span><h2>Full rest</h2><ul><li>No gym, no morning circuit, no structured recovery work.</li><li>Skip planned stretching or mobility too — let it be a true day off.</li><li>Normal daily basics still apply: sleep, hydration, protein.</li></ul></article>
      <article class="recovery-card"><span class="card-kicker">2-minute check-in</span><h2>Weekly signals</h2><form class="checkin" id="checkin"><label>Soreness<select name="soreness">${ratingOptions(check.soreness)}</select></label><label>Energy<select name="energy">${ratingOptions(check.energy)}</select></label><label class="wide">Average sleep<input name="sleep" type="number" min="0" max="12" step="0.5" value="${recentSleepAvg(7)??check.sleep??7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${check.pain?"checked":""}> Any pain (not soreness)</span></label><label class="wide">Notes<input name="notes" maxlength="180" value="${esc(check.notes||"")}" placeholder="Optional context"></label></form><p class="check-result" id="checkResult"></p><button class="module-save" data-save-checkin>Save & sync check-in</button></article>
      <article class="recovery-card wide"><span class="card-kicker">Guided recovery</span><h2>Start a timer</h2><div class="timer-presets"><button data-guide-timer="480" data-guide-label="Foam roll">Foam roll <b>8:00</b></button><button data-guide-timer="420" data-guide-label="Massage gun">Massage gun <b>7:00</b></button><button data-guide-timer="300" data-guide-label="Legs up the wall">Legs up wall <b>5:00</b></button><button data-guide-timer="600" data-guide-label="Gentle stretch">Gentle stretch <b>10:00</b></button></div></article>
      <article class="recovery-card"><span class="card-kicker">Saturday</span><h2>Active recovery</h2><ul><li>No gym and no morning circuit.</li><li>Optional light walking and 5–10 min gentle stretching.</li><li><strong>Legs up the wall:</strong> 5 min, breathe slowly.</li><li>Soreness should resolve, not accumulate.</li></ul></article>
      <article class="recovery-card wide"><span class="card-kicker">Saturday · 45–55 min</span><h2>Steam → Sauna → Jacuzzi</h2><ol class="spa-list"><li><span>Shower — rinse</span><strong>2 min</strong></li><li><span>Steam room</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Sauna</span><strong>10–12</strong></li><li><span>Cool shower + water</span><strong>3–5</strong></li><li><span>Jacuzzi</span><strong>15–20</strong></li><li><span>Cool shower + rehydrate</span><strong>2 min</strong></li></ol><p class="check-result">Water before and between every step. Exit immediately if dizzy, nauseous, or unwell. Skip if sick, dehydrated, or hungover.</p></article>
      <article class="recovery-card warning wide"><span class="card-kicker">Stop, don't push</span><h2>Real red flags</h2><ul><li><strong>Sharp or joint pain:</strong> stop that exercise.</li><li><strong>Soreness beyond 72 hours:</strong> back off volume.</li><li><strong>Persistent fatigue or declining sleep:</strong> address it before adding load.</li><li>Pain that persists for days or feels unlike normal soreness needs a doctor, not a training workaround.</li></ul></article>
      <article class="recovery-card wide"><span class="card-kicker">Bad-day fallback</span><h2>Something beats nothing.</h2><ul><li><strong>Non-negotiable:</strong> Kegels 3 × 10 + 3 min marching.</li><li>Cut cardio first, then reduce gym to Leg Press + Chest Press + Row.</li><li>Protect the morning circuit last.</li><li>Review the full program at week 8, or after 2+ lifts stall for 2+ sessions.</li></ul></article>
    </section>`);
  bindRecoveryTools();
}
function renderRecoveryArabic(){
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="recovery-head"><p class="eyebrow">نظام الاستشفاء</p><h1>هنا يحدث التطور.</h1><p>التزم بالأساسيات يومياً، وراجع حالتك أسبوعياً. الألم معلومة وليس تحدياً.</p></section>${recoveryDecisionCard()}<section class="recovery-grid">
  ${sleepSummaryCard(true)}
  <article class="recovery-card"><span class="card-kicker">كل يوم</span><h2>الأساسيات</h2><ul><li><strong>النوم:</strong> 7 ساعات على الأقل؛ مع الاستيقاظ 4:15 ص استهدف 9:15 م.</li><li><strong>الماء:</strong> عند الاستيقاظ وطوال الصباح، خصوصاً مع حرارة القاهرة.</li><li><strong>الإفطار:</strong> بروتين وكربوهيدرات بعد تمرين الصباح.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الأحد · الثلاثاء · الخميس</span><h2>بعد الجيم</h2><ul><li>Foam roller للجسم السفلي والظهر مساءً، نحو 8 دقائق.</li><li>مسدس المساج قبل النوم، 6–8 دقائق.</li><li>لا تستخدم الثلج روتينياً؛ فقط لألم مفصل حقيقي.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">الجمعة</span><h2>راحة تامة</h2><ul><li>لا جيم ولا دائرة صباحية ولا جلسة استشفاء منظمة.</li><li>تجاهل الإطالة أو تمارين الحركة المخطط لها أيضاً؛ اجعله يوم راحة كامل.</li><li>الأساسيات اليومية تستمر كالمعتاد: النوم، الماء، البروتين.</li></ul></article>
  <article class="recovery-card warning"><span class="card-kicker">توقف ولا تضغط</span><h2>علامات الخطر</h2><ul><li>ألم حاد أو ألم مفصل: أوقف التمرين.</li><li>إجهاد عضلي أكثر من 72 ساعة: خفّض الحجم.</li><li>إرهاق مستمر أو نوم متراجع: عالجه قبل زيادة الحمل.</li><li>الألم المستمر لأيام يحتاج طبيباً.</li></ul></article>
  <article class="recovery-card"><span class="card-kicker">السبت</span><h2>استشفاء نشط</h2><ul><li>لا جيم ولا دائرة صباحية.</li><li>مشي خفيف وإطالة 5–10 دقائق اختياريان.</li><li><strong>الرجلان على الحائط:</strong> 5 دقائق مع تنفس بطيء.</li><li>يجب أن يقل الإجهاد لا أن يتراكم.</li></ul></article>
  <article class="recovery-card wide"><span class="card-kicker">السبت · 45–55 دقيقة</span><h2>بخار ← ساونا ← جاكوزي</h2><ol class="spa-list"><li><span>دش سريع</span><strong>2 د</strong></li><li><span>غرفة البخار</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>ساونا</span><strong>10–12</strong></li><li><span>دش بارد + ماء</span><strong>3–5</strong></li><li><span>جاكوزي</span><strong>15–20</strong></li><li><span>دش بارد وترطيب</span><strong>2 د</strong></li></ol><p class="check-result">اشرب قبل البداية وبين كل خطوة. اخرج فوراً عند الدوخة أو الغثيان. لا تبدأ إذا كنت مريضاً أو جافاً.</p></article>
  <article class="recovery-card"><span class="card-kicker">مراجعة دقيقتين</span><h2>إشارات الأسبوع</h2><form class="checkin" id="checkin"><label>الإجهاد العضلي<select name="soreness">${ratingOptions(saved.checkin?.soreness)}</select></label><label>الطاقة<select name="energy">${ratingOptions(saved.checkin?.energy)}</select></label><label class="wide">متوسط النوم<input name="sleep" type="number" min="0" max="12" step="0.5" value="${recentSleepAvg(7)??saved.checkin?.sleep??7}" inputmode="decimal"></label><label class="wide"><span><input name="pain" type="checkbox" ${saved.checkin?.pain?"checked":""}> يوجد ألم غير الإجهاد العضلي</span></label><label class="wide">ملاحظات<input name="notes" maxlength="180" value="${esc(saved.checkin?.notes||"")}" placeholder="اختياري"></label></form><p class="check-result" id="checkResult"></p><button class="module-save" data-save-checkin>حفظ ومزامنة</button></article>
  <article class="recovery-card wide"><span class="card-kicker">استشفاء موجه</span><h2>ابدأ مؤقتاً</h2><div class="timer-presets"><button data-guide-timer="480" data-guide-label="Foam roll">Foam roller <b>8:00</b></button><button data-guide-timer="420" data-guide-label="Massage gun">مسدس المساج <b>7:00</b></button><button data-guide-timer="300" data-guide-label="Legs up the wall">الرجلان على الحائط <b>5:00</b></button><button data-guide-timer="600" data-guide-label="Gentle stretch">إطالة خفيفة <b>10:00</b></button></div></article>
  <article class="recovery-card wide"><span class="card-kicker">الخطة المصغرة</span><h2>شيء أفضل من لا شيء.</h2><ul><li><strong>الحد الأدنى:</strong> كيجل 3 × 10 + مشي في المكان 3 دقائق.</li><li>اختصر الكارديو أولاً، ثم الجيم إلى Leg Press + Chest Press + Row.</li><li>احمِ دائرة الصباح أخيراً.</li><li>راجع البرنامج في الأسبوع الثامن.</li></ul></article></section>`);
  bindRecoveryTools();
}
function ratingOptions(selected){return [1,2,3,4,5].map(n=>`<option ${Number(selected||3)===n?"selected":""}>${n}</option>`).join("");}
function updateCheckin(){
  const form=new FormData(document.querySelector("#checkin")); const c={soreness:Number(form.get("soreness")),energy:Number(form.get("energy")),sleep:Number(form.get("sleep")),pain:form.get("pain")==="on",notes:String(form.get("notes")||"")};
  const flags=(c.soreness>=4?1:0)+(c.energy<=2?1:0)+(c.sleep<7?1:0)+(c.pain?1:0);
  document.querySelector("#checkResult").textContent=state.lang==="ar"?(flags>=2?`${flags} علامات خطر — خذ يوماً خفيفاً إضافياً أو لا تزد الحمل.`:flags===1?"علامة خطر واحدة — راقبها وركز على الاستشفاء.":"لا توجد علامات خطر — استمر وتقدم كما هو مخطط."):(flags>=2?`${flags} red flags — take an extra light day or hold progression flat.`:flags===1?"1 red flag — keep an eye on it and prioritize recovery.":"No red flags — stay consistent and progress as planned.");
  saved.checkin=c; persistDebounced();
}
function recoveryDecisionCard(){const gate=recoveryGate(),p=programStatus(),ar=state.lang==="ar",decision=gate.hold?(ar?"يوم خفيف إضافي · لا تزيد الحمل":"Extra light day · hold progression"):(ar?"استمر حسب الخطة":"Proceed as planned");return `<section class="decision-card ${gate.hold?"hold":""}"><div><small>${ar?"قرار الاستشفاء":"RECOVERY DECISION"}</small><h2>${decision}</h2><p>${gate.stale?(ar?"سجّل مراجعة حديثة لتفعيل بوابة التقدم.":"Log a fresh check-in to activate progression gating."):(ar?`${gate.flags} علامات خطر في آخر مراجعة.`:`${gate.flags} red flags in the latest check-in.`)}</p></div><div><strong>${ar?`الأسبوع ${p.week}`:`WEEK ${p.week}`}</strong><span>${p.review?(ar?"المراجعة مستحقة":"Review due"):(ar?"المراجعة في الأسبوع 8":"Review at week 8")}</span>${p.stalled.length>=2?`<em>${ar?`${p.stalled.length} تمارين متوقفة`:`${p.stalled.length} lifts stalled`}</em>`:""}</div></section>`;}
function bindRecoveryTools(){const form=document.querySelector("#checkin");form.addEventListener("input",updateCheckin);updateCheckin();document.querySelector("[data-save-checkin]").onclick=saveRecoveryCheckin;document.querySelectorAll("[data-guide-timer]").forEach(b=>b.onclick=()=>startGuideTimer(b.dataset.guideLabel,Number(b.dataset.guideTimer)));const gotoVitals=document.querySelector("[data-goto-vitals]");gotoVitals?.addEventListener("click",()=>setPrimaryTab("vitals"));gotoVitals?.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setPrimaryTab("vitals");}});}
function saveRecoveryCheckin(){updateCheckin();const c={...saved.checkin,date:new Date().toISOString()},flags=recoveryFlags(c);c.flags=flags;c.recommendation=c.pain?"Stop and assess":flags>=2?"Extra light day":flags===1?"Hold":"Progress";state.recoveryCheckins=state.recoveryCheckins.filter(x=>x.date.slice(0,10)!==isoDay());state.recoveryCheckins.unshift(c);state.recoveryCheckins=state.recoveryCheckins.slice(0,24);queueHealth("recovery",c);persist();renderRecovery();}

function nutritionPlanKey(){const d=currentDay();return ["Sunday","Tuesday","Thursday"].includes(d)?"gym":["Monday","Wednesday"].includes(d)?"cardio":"rest";}
function dailyBucket(kind){state.daily[kind]=state.daily[kind]||{};state.daily[kind][isoDay()]=state.daily[kind][isoDay()]||{checked:{},notes:""};return state.daily[kind][isoDay()];}
function checklist(items,prefix,bucket){return `<div class="module-checklist">${items.map((item,i)=>{const parts=Array.isArray(item)?item:["",item,""];return `<label><input type="checkbox" data-daily-key="${prefix}-${i}" ${bucket.checked[`${prefix}-${i}`]?"checked":""}><span>${parts[0]?`<time>${esc(parts[0])}</time>`:""}<strong>${esc(parts[1])}</strong>${parts[2]?`<small>${esc(parts[2])}</small>`:""}</span></label>`}).join("")}</div>`;}
function bindDaily(kind,render){document.querySelectorAll("[data-daily-key]").forEach(el=>el.onchange=()=>{if(el.checked&&navigator.vibrate)navigator.vibrate(30);const b=dailyBucket(kind);b.checked[el.dataset.dailyKey]=el.checked;persist();render();});const notes=document.querySelector("[data-daily-notes]");if(notes)notes.oninput=e=>{dailyBucket(kind).notes=e.target.value;persistDebounced();};}
function moduleHeader(kicker,title,copy){return `<section class="recovery-head module-head"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${copy}</p><span class="guide-version">${state.lang==="ar"?"الدليل":"Guide"} v${REP_HEALTH_GUIDE.version} · ${REP_HEALTH_GUIDE.updatedAt}</span></section>`;}
const FOOD_PROFILES={gym:{label:"Gym Day",calories:2162,protein:176,carbs:248,fat:70,fiber:30,water:3500},active:{label:"Active Day",calories:1990,protein:173,carbs:202,fat:70,fiber:30,water:3200},flex:{label:"Flex Day",calories:2480,protein:150,carbs:0,fat:70,fiber:30,water:3000,calorieCeiling:true,proteinFloor:true}};
function foodProfile(){
  const dayName=currentDay();
  const focus=state.preferences?.schedule?.[dayName]?.focus||([0,2,4].includes(new Date().getDay())?"gym":"flex");
  const type=(focus==="gym"||focus==="gymLite")?"gym":(focus==="cardio"?"active":"flex");
  const base=FOOD_PROFILES[type]||FOOD_PROFILES.gym;
  const customTargets=state.preferences?.targets?.[type];
  const carbCycleBadge=type==="gym"?(state.lang==="ar"?"⚡ تدوير الكارب: عالي (يوم تدريب)":"⚡ CARB CYCLING: HIGH (TRAINING DAY)"):(type==="active"?(state.lang==="ar"?"⚡ تدوير الكارب: معتدل (كارديو)":"⚡ CARB CYCLING: MODERATE (CARDIO)"):(state.lang==="ar"?"⚡ تدوير الكارب: استشفاء (دهون صحية أعلى)":"⚡ CARB CYCLING: RECOVERY / REST"));
  return {
    ...base,
    ...(customTargets||{}),
    label: base.label,
    cycleType: type
  };
}
function autoMealType(){const h=new Date().getHours();return h>=18?"Dinner":h>=15?"Snack":h>=11?"Lunch":"Breakfast";}
function todayFoodEntries(){const today=isoDay(),res=[];for(const entry of (state.foodEntries||[])){const k=String(entry.date||"").slice(0,10);if(k===today)res.push(entry);else if(k<today)break;}return res.sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
function foodTotals(entries=todayFoodEntries()){return entries.reduce((t,e)=>{for(const key of ["calories","protein_g","carbs_g","fat_g","fiber_g","sugar_g","sodium_mg"])t[key]+=Number(e[key])||0;return t;},{calories:0,protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sugar_g:0,sodium_mg:0});}
function meter(label,value,goal,unit,color="var(--acid)"){const pct=goal?Math.round(value/goal*100):0;return `<article class="macro-meter" style="--meter:${Math.min(pct,100)}%;--meter-color:${color}"><span>${label}</span><strong>${Math.round(value)}</strong><small>${goal?`${pct}% · ${Math.max(Math.round(goal-value),0)} ${unit} left`:`${unit} · flexible`}</small><i></i></article>`;}
function nutritionPlanNote(){const ar=state.lang==="ar",guide=REP_HEALTH_GUIDE.nutrition,key=nutritionPlanKey(),target=guide.targets[key],meals=guide.meals[key];return `<details class="nutrition-plan-note"><summary><span class="plan-note-icon">≡</span><span><small>${ar?"ملاحظة مرجعية":"REFERENCE NOTE"}</small><strong>${ar?"خطة التغذية اليوم":"Today's nutrition plan"}</strong><em>${target.label} · ${target.calories} kcal · P${target.protein} C${target.carbs} F${target.fat}</em></span><b>${ar?"اضغط للعرض":"Tap to view"}</b></summary><div class="plan-note-body"><p>${ar?"هذه الخطة للرجوع فقط. الوجبات لا تُسجل حتى تكتبها وتؤكد تقدير الذكاء الاصطناعي أدناه.":"This plan is a reference only. Nothing is logged until you enter a meal and confirm the AI estimate below."}</p><ol>${meals.map(([time,name,macros])=>`<li><time>${esc(time)}</time><span><strong>${esc(name)}</strong><small>${esc(macros)}</small></span></li>`).join("")}</ol><div class="plan-note-extras"><strong>${ar?"المكملات":"Supplements"}</strong><ul>${guide.supplements.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><small>${esc(guide.milk)}</small></div></div></details>`;}
function foodDraftCard(){const d=state.foodDraft,ar=state.lang==="ar";if(!d)return "";return `<section class="analysis-card"><div class="analysis-head"><div><small>${ar?"راجع قبل الحفظ":"REVIEW ESTIMATE"}</small><strong>${esc(d.food_name||d.rawNote||"Meal note")}</strong></div><span>${esc(d.confidence||"Low")} · ${Number(d.confidence_pct)||0}%<br>${ar?"لن يُسجل حتى تؤكد":"Not logged until confirmed"}</span></div><div class="analysis-text"><label>${ar?"اسم الوجبة":"Meal name"}<input data-food-text="food_name" value="${esc(d.food_name||d.rawNote||"Meal note")}"></label><label>${ar?"حجم الحصة":"Portion size"}<input data-food-text="portion_size" value="${esc(d.portion_size||"")}"></label></div><div class="macro-editor">${[["calories",ar?"سعرات":"Calories"],["protein_g",ar?"بروتين":"Protein"],["carbs_g",ar?"كربوهيدرات":"Carbs"],["fat_g",ar?"دهون":"Fat"],["fiber_g",ar?"ألياف":"Fiber"],["sugar_g",ar?"سكر":"Sugar"],["sodium_mg",ar?"صوديوم":"Sodium"],["estimated_weight_g",ar?"الوزن جم":"Weight g"]].map(([key,label])=>`<label>${label}<input data-food-macro="${key}" type="number" min="0" step="0.1" inputmode="decimal" value="${Number(d[key])||0}"></label>`).join("")}</div><p class="analysis-notes">${esc(d.notes||"AI nutrition values are estimates. Adjust anything that looks wrong before saving.")}</p><div class="analysis-actions"><button data-cancel-food>${ar?"إلغاء":"Cancel"}</button><button class="primary" data-save-food>${ar?"تأكيد وتسجيل الوجبة":"Confirm & log meal"}</button></div></section>`;}
function foodEntryCard(entry){const ar=state.lang==="ar",time=new Date(entry.date).toLocaleTimeString(state.lang==="ar"?"ar-EG":"en-US",{hour:"numeric",minute:"2-digit"});return `<article class="food-entry"><div><small>${esc(entry.mealType||"Meal")} · ${time} · ${esc(entry.logMethod||"Note")}</small><strong>${esc(entry.food_name||entry.rawNote||"Meal note")}</strong><span>${esc(entry.rawNote||entry.portion_size||"")}</span></div><div class="food-entry-macros"><b>${Math.round(Number(entry.calories)||0)} kcal</b><em>P ${Math.round(Number(entry.protein_g)||0)} · C ${Math.round(Number(entry.carbs_g)||0)} · F ${Math.round(Number(entry.fat_g)||0)}</em></div><div class="food-entry-actions"><button data-save-template="${esc(entry.id)}">${ar?"☆ احفظ كقالب":"☆ Save as template"}</button><button class="danger" data-delete-food="${esc(entry.id)}">${ar?"حذف":"Delete"}</button></div></article>`;}
function foodConnectionCard(ar){const connected=Boolean(localStorage.getItem(syncKeyStorage)),status=state.pairMessage||syncStatusText();return `<section class="food-connect ${connected?"is-connected":"is-needed"}" aria-live="polite"><div class="food-connect-head"><span class="food-connect-icon">${connected?"✓":"N"}</span><div><small>${connected?(ar?"الجهاز مقترن":"DEVICE PAIRED"):(ar?"اتصال لمرة واحدة":"ONE-TIME SETUP")}</small><strong>${connected?(ar?"الذكاء الاصطناعي وNotion جاهزان":"AI + Notion are ready"):(ar?"اتصل من تبويب الطعام":"Connect right here in Food")}</strong><span data-sync-status>${esc(status)}</span></div></div>${connected?`<div class="food-connect-actions"><button class="quiet" data-food-disconnect>${ar?"إلغاء اقتران الجهاز":"Unpair device"}</button></div>`:`<p>${ar?"أدخل مفتاح Cloudflare مرة واحدة. يبقى هذا الجهاز مقترناً حتى تلغيه أو تمسح بيانات الموقع.":"Enter the Cloudflare pairing key once. This device stays paired until revoked or its site data is cleared."}</p><form class="food-pair-form" data-food-pair-form autocomplete="off"><input data-food-pair-key type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${ar?"ألصق REP_SYNC_KEY":"Paste REP_SYNC_KEY"}" aria-label="${ar?"مفتاح اقتران التطبيق":"App pairing key"}"><button data-food-pair-submit ${state.pairBusy?"disabled":""}>${state.pairBusy?(ar?"جارٍ التحقق…":"Checking…"):(ar?"اتصل واستمر":"Connect & continue")}</button></form>${state.pairMessage?`<p class="food-pair-error">${esc(state.pairMessage)}</p>`:""}`}</section>`;}
function foodRetryControl(ar){return state.foodPendingPayload&&localStorage.getItem(syncKeyStorage)?`<button class="food-retry" data-retry-food>${ar?"إعادة محاولة التحليل":"Retry analysis"}</button>`:"";}
// Meal templates. Saving one is explicit, and choosing one loads the review
// draft rather than logging straight away, so every entry still gets confirmed.
function saveMealTemplate(entryId){
  const entry=state.foodEntries.find(e=>e.id===entryId);if(!entry)return;
  const name=String(entry.food_name||entry.rawNote||"Meal").slice(0,80);
  if(state.mealTemplates.some(t=>t.food_name===entry.food_name&&Math.round(t.calories)===Math.round(entry.calories)))return;
  const {id,date,mealType,logMethod,...macros}=entry;
  state.mealTemplates.unshift({...macros,id:`tmpl-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,food_name:name});
  state.mealTemplates=state.mealTemplates.slice(0,40);persist();renderNutrition();
}
function deleteMealTemplate(id){state.mealTemplates=state.mealTemplates.filter(t=>t.id!==id);persist();renderNutrition();}
function useMealTemplate(id){
  const t=state.mealTemplates.find(x=>x.id===id);if(!t)return;
  const {id:_ignored,...rest}=t;
  state.foodDraft={...rest,rawNote:t.rawNote||t.food_name,mealType:state.foodMealType||autoMealType(),logMethod:"Template",source:"Saved template"};
  state.foodStatus=state.lang==="ar"?"من قالب محفوظ — راجع القيم ثم أكّد.":"Loaded from a saved template — review the values, then confirm.";
  state.foodError=false;renderNutrition();
  document.querySelector(".analysis-card")?.scrollIntoView({behavior:"smooth",block:"center"});
}
function createMealTemplateManual(){
  const nameInput=document.querySelector('[data-template-field="food_name"]'),name=String(nameInput?.value||"").trim();
  if(!name){nameInput?.setCustomValidity(state.lang==="ar"?"اكتب اسم الوجبة.":"Enter a meal name.");nameInput?.reportValidity();return;}
  const get=key=>Math.max(0,Number(document.querySelector(`[data-template-field="${key}"]`)?.value)||0);
  state.mealTemplates.unshift({id:`tmpl-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,food_name:name.slice(0,80),calories:get("calories"),protein_g:get("protein_g"),carbs_g:get("carbs_g"),fat_g:get("fat_g"),fiber_g:0,sugar_g:0,sodium_mg:0,estimated_weight_g:0,portion_size:"",confidence:"Manual",confidence_pct:100,notes:"Created manually as a template.",recognizable:true,source:"Manual template"});
  state.mealTemplates=state.mealTemplates.slice(0,40);state.newTemplateOpen=false;persist();renderNutrition();
}
function mealTemplatesSection(ar){
  const items=state.mealTemplates;
  const form=state.newTemplateOpen?`<form class="template-form" data-template-form><input data-template-field="food_name" placeholder="${ar?"اسم الوجبة":"Meal name"}" maxlength="80" required><div class="template-form-grid"><input data-template-field="calories" type="number" min="0" step="1" inputmode="numeric" placeholder="${ar?"سعرات":"kcal"}"><input data-template-field="protein_g" type="number" min="0" step="0.1" inputmode="decimal" placeholder="${ar?"بروتين جم":"Protein g"}"><input data-template-field="carbs_g" type="number" min="0" step="0.1" inputmode="decimal" placeholder="${ar?"كارب جم":"Carbs g"}"><input data-template-field="fat_g" type="number" min="0" step="0.1" inputmode="decimal" placeholder="${ar?"دهون جم":"Fat g"}"></div><div class="template-form-actions"><button type="button" data-cancel-template>${ar?"إلغاء":"Cancel"}</button><button type="submit">${ar?"حفظ القالب":"Save template"}</button></div></form>`:"";
  return `<div class="food-section-head"><h2>${ar?"قوالب الوجبات":"Meal templates"}</h2><button class="quiet" data-new-template>${state.newTemplateOpen?(ar?"إغلاق":"Close"):(ar?"+ قالب جديد":"+ New template")}</button></div>${form}${items.length?`<section class="meal-templates">${items.map(t=>`<div class="meal-template"><button data-use-template="${esc(t.id)}"><strong>${esc(t.food_name)}</strong><span>${Math.round(Number(t.calories)||0)} kcal · P ${Math.round(Number(t.protein_g)||0)}g</span></button><button class="template-remove" data-delete-template="${esc(t.id)}" aria-label="${ar?"حذف القالب":"Delete template"}">×</button></div>`).join("")}</section>`:state.newTemplateOpen?"":`<p class="template-empty">${ar?"لا توجد قوالب بعد. احفظ وجبة مسجلة كقالب من أسفل، أو أنشئ واحداً يدوياً.":"No templates yet. Save a logged meal as a template below, or create one manually."}</p>`}`;
}
function supplementList(){return REP_HEALTH_GUIDE.nutrition.supplements||[];}
function supplementsDone(){const b=dailyBucket("nutrition");return supplementList().filter((_,i)=>b.checked[`supp-${i}`]).length;}
function supplementsAllComplete(){const total=supplementList().length;return total>0&&supplementsDone()===total;}
function supplementsCard(ar){
  const items=supplementList(),b=dailyBucket("nutrition"),done=supplementsDone(),percent=items.length?Math.round(done/items.length*100):0;
  return `<section class="supplement-card"><div class="supplement-head"><div><small>${ar?"المكملات اليوم":"SUPPLEMENTS TODAY"}</small><strong>${done} / ${items.length} ${ar?"مكتملة":"taken"}</strong></div>${miniRing(percent,"var(--blue)")}</div>
    <div class="module-checklist supplement-list">${items.map((item,i)=>`<label><input type="checkbox" data-daily-key="supp-${i}" ${b.checked[`supp-${i}`]?"checked":""}><span><strong>${esc(item)}</strong></span></label>`).join("")}</div>
    <small class="supplement-note">${esc(REP_HEALTH_GUIDE.nutrition.milk||"")}</small></section>`;
}
function weekKey(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-x.getDay());return localDay(x);}
function currentWeekWeight(){return state.bodyWeights.find(w=>w.week===weekKey())||null;}
function todayWeighIn(){return state.bodyWeights.find(w=>w.date===isoDay())||null;}
function saveBodyWeight(kg){const value=Math.round(Number(kg)*10)/10;if(!Number.isFinite(value)||value<30||value>300)return false;const week=weekKey();state.bodyWeights=state.bodyWeights.filter(w=>w.week!==week);state.bodyWeights.unshift({week,date:isoDay(),kg:value});state.bodyWeights=state.bodyWeights.slice(0,104);queueNutritionSummary();persist();return true;}
function deleteBodyWeight(week){state.bodyWeights=state.bodyWeights.filter(w=>w.week!==week);queueNutritionSummary();persist();}
// Daily sleep log. No HealthKit access from a PWA, so this is always manual
// entry - the user reads bedtime/wake time off the Apple Watch and logs it here.
function computeSleepHours(bedtime,wake){
  const [bh,bm]=String(bedtime||"").split(":").map(Number),[wh,wm]=String(wake||"").split(":").map(Number);
  if(![bh,bm,wh,wm].every(Number.isFinite))return null;
  let start=bh*60+bm,end=wh*60+wm;if(end<=start)end+=24*60;
  return Math.round((end-start)/60*10)/10;
}
function saveSleepLog(bedtime,wake,hrv,rhr,resp){
  const hours=computeSleepHours(bedtime,wake);
  if(!hours||hours<=0||hours>16)return false;
  const date=isoDay();
  const hrvValue=Number(hrv),rhrValue=Number(rhr),respValue=Number(resp);
  state.sleepLogs=state.sleepLogs.filter(s=>s.date!==date);
  state.sleepLogs.unshift({date,bedtime,wake,hours,hrv:Number.isFinite(hrvValue)&&hrvValue>0?hrvValue:null,rhr:Number.isFinite(rhrValue)&&rhrValue>0?rhrValue:null,resp:Number.isFinite(respValue)&&respValue>0?respValue:null});
  state.sleepLogs=state.sleepLogs.slice(0,120);
  queueHealth("sleep",{date,sleep:hours});
  persist();return true;
}
function deleteSleepLog(date){state.sleepLogs=state.sleepLogs.filter(s=>s.date!==date);persist();}
function recentSleepAvg(days=7,beforeDate=null){
  const endStr=beforeDate?String(beforeDate).slice(0,10):isoDay(),startStr=shiftDateKey(endStr,-days);
  const recent=state.sleepLogs.filter(s=>{const d=String(s.date||"").slice(0,10);return d>=startStr&&d<endStr&&Number.isFinite(s.hours)&&s.hours>0;});
  return recent.length?Math.round(recent.reduce((n,s)=>n+s.hours,0)/recent.length*10)/10:null;
}
function computeStreak(){
  const activeDates=new Set();
  for(const h of state.history||[])if(h.date)activeDates.add(String(h.date).slice(0,10));
  for(const e of state.foodEntries||[])if(e.date)activeDates.add(String(e.date).slice(0,10));
  for(const s of state.sleepLogs||[])if(s.date)activeDates.add(String(s.date).slice(0,10));
  for(const c of state.recoveryCheckins||[])if(c.date)activeDates.add(String(c.date).slice(0,10));
  if(state.daily){
    for(const k of ["hygiene","nutrition","journal"]){
      for(const [dateStr,item] of Object.entries(state.daily[k]||{})){
        if(Object.values(item.checked||{}).some(Boolean))activeDates.add(dateStr);
      }
    }
  }
  const todayStr=isoDay();
  let streak=0,offset=activeDates.has(todayStr)?0:1;
  while(streak<3650){
    const d=shiftLocalDay(-(offset+streak));
    if(!activeDates.has(d))break;
    streak++;
  }
  return streak;
}
// Strain/Recovery are proxies built from data this app already has (sleep,
// optional manually-logged HRV/resting HR, the weekly check-in, and logged
// training load) - there's no HealthKit access from a PWA, so this can't
// match a real wearable's continuous sensor data. It's directionally useful,
// not clinically precise.
function metricBaseline(field,days=30,beforeDate=null){
  const endStr=beforeDate?String(beforeDate).slice(0,10):isoDay(),startStr=shiftDateKey(endStr,-days);
  const recent=state.sleepLogs.filter(s=>{const d=String(s.date||"").slice(0,10);return d>=startStr&&d<endStr&&Number.isFinite(s[field])&&s[field]>0;});
  return recent.length>=3?Math.round(recent.reduce((n,s)=>n+s[field],0)/recent.length*10)/10:null;
}
function computeSleepNeed(dateStr=isoDay()){
  const rollingAvg=recentSleepAvg(14,dateStr),baseline=rollingAvg??REP_HEALTH_GUIDE.rules.minimumSleepHours;
  const prevDate=shiftDateKey(dateStr,-1);
  const strainDebt=Math.round((computeStrainScore(prevDate)/21)*10)/10;
  const endStr=String(dateStr).slice(0,10),startStr=shiftDateKey(endStr,-7);
  const recentNights=state.sleepLogs.filter(s=>{const d=String(s.date||"").slice(0,10);return d<endStr&&d>=startStr;});
  const shortfall=recentNights.reduce((sum,s)=>sum+Math.max(0,baseline-(s.hours||0)),0);
  const sleepDebt=Math.min(Math.round(shortfall*10)/10,3);
  return {baseline:Math.round(baseline*10)/10,strainDebt,sleepDebt,need:Math.round((baseline+strainDebt+sleepDebt)*10)/10,estimatedBaseline:rollingAvg===null};
}
function computeSleepPerformance(dateStr=isoDay()){
  const entry=state.sleepLogs.find(s=>s.date===dateStr);
  if(!entry?.hours)return null;
  const need=computeSleepNeed(dateStr);
  return {...need,actual:entry.hours,performance:Math.max(0,Math.round(entry.hours/need.need*100))};
}
function computeBedtimeSuggestion(){
  const tomorrow=shiftLocalDay(1);
  const need=computeSleepNeed(tomorrow),wakeTime=REP_HEALTH_GUIDE.rules.wakeTime;
  const [wh,wm]=wakeTime.split(":").map(Number);
  const minutes=(((wh*60+wm)-Math.round(need.need*60))%1440+1440)%1440;
  const time=`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
  return {time,wakeTime,need:need.need};
}
const JOURNAL_FACTORS=[
  {key:"caffeineLate",en:"Caffeine after 2pm",ar:"كافيين بعد الساعة 2 ظهراً"},
  {key:"screenLate",en:"Screen right before bed",ar:"شاشة قبل النوم مباشرة"},
  {key:"heavyMeal",en:"A heavy or late meal",ar:"وجبة ثقيلة أو متأخرة"},
  {key:"relaxed",en:"Stretched or relaxed before bed",ar:"تمدد أو استرخاء قبل النوم"}
];
function journalCorrelations(){
  const byFactor=JOURNAL_FACTORS.map(f=>({...f,with:[],without:[]}));
  const entries=Object.entries(state.daily?.journal||{}).slice(-60);
  const cache=new Map();
  const getRec=(d)=>{if(cache.has(d))return cache.get(d);const r=computeRecoveryScore(d);cache.set(d,r);return r;};
  for(const [date,day] of entries){
    const rec=getRec(date);
    if(!rec||rec.calibrating)continue;
    for(const f of byFactor)(day.checked?.[f.key]?f.with:f.without).push(rec.score);
  }
  const avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
  return byFactor.filter(f=>f.with.length>=3&&f.without.length>=3).map(f=>{
    const withAvg=avg(f.with),withoutAvg=avg(f.without),diff=Math.round(withoutAvg-withAvg);
    return {...f,diff,withAvg:Math.round(withAvg),withoutAvg:Math.round(withoutAvg),days:f.with.length+f.without.length};
  }).filter(f=>Math.abs(f.diff)>=5).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
}
function computeRecoveryScore(dateStr=isoDay()){
  const sleepEntry=state.sleepLogs.find(s=>s.date===dateStr);
  const components=[];
  const sleepPerf=computeSleepPerformance(dateStr);
  if(sleepPerf)components.push({weight:30,value:Math.min(100,sleepPerf.performance)});
  const hrvBase=metricBaseline("hrv",30,dateStr);
  if(sleepEntry?.hrv&&hrvBase)components.push({weight:25,value:Math.max(0,Math.min(100,Math.round(50+(sleepEntry.hrv-hrvBase)/hrvBase*250)))});
  const rhrBase=metricBaseline("rhr",30,dateStr);
  if(sleepEntry?.rhr&&rhrBase)components.push({weight:20,value:Math.max(0,Math.min(100,Math.round(50-(sleepEntry.rhr-rhrBase)/rhrBase*250)))});
  const respBase=metricBaseline("resp",30,dateStr);
  if(sleepEntry?.resp&&respBase)components.push({weight:10,value:Math.max(0,Math.min(100,Math.round(50-(sleepEntry.resp-respBase)/respBase*250)))});
  const checkin=state.recoveryCheckins.find(c=>String(c.date).slice(0,10)===dateStr);
  if(checkin)components.push({weight:15,value:Math.max(0,100-recoveryFlags(checkin)*25-(checkin.pain?25:0))});
  if(!components.length)return null;
  const totalWeight=components.reduce((n,c)=>n+c.weight,0),score=Math.round(components.reduce((n,c)=>n+c.value*c.weight,0)/totalWeight);
  // Sleep performance alone can carry the score before HRV/RHR baselines exist
  // (those need 3+ prior nights). Flag that so an early score isn't read as a
  // settled one - it's directionally right but built from one signal, not four.
  const calibrating=totalWeight<=45;
  return {score,band:score>=67?"green":score>=34?"yellow":"red",calibrating};
}
// Whoop scores cardiovascular load for the whole day, not just structured
// workouts. We have no continuous heart-rate feed to do that from a PWA, so
// logged sessions remain the base load, and an optional "active energy
// today" (read off the Watch's Activity rings) adds the rest of the day's
// incidental load at a lower per-calorie weight than a structured workout.
function computeStrainScore(dateStr=isoDay()){
  const sessions=state.history.filter(h=>String(h.date).slice(0,10)===dateStr);
  const sessionCalories=sessions.reduce((n,s)=>n+(s.calories||0),0);
  let totalLoad=sessions.reduce((n,s)=>{
    const rpes=(s.entries||[]).map(e=>Number(e.rpe)).filter(Number.isFinite);
    const rpe=rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:6;
    return n+(s.calories||0)*(rpe/10);
  },0);
  const activeEnergy=Number(state.activeEnergy?.[dateStr]);
  if(Number.isFinite(activeEnergy)&&activeEnergy>0)totalLoad+=Math.max(0,activeEnergy-sessionCalories)*.4;
  if(!totalLoad)return 0;
  return Math.round(21*(1-Math.exp(-totalLoad/220))*10)/10;
}
function ringGaugeSvg(percent,color,size=112,strokeWidth=10,isEmpty=false){
  const radius=(size-strokeWidth)/2,circumference=2*Math.PI*radius,offset=circumference*(1-Math.max(0,Math.min(100,percent))/100);
  if(isEmpty)return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="1 ${Math.max(6,strokeWidth)}"/></svg>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="${strokeWidth}"/><circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;
}
function miniRing(percent,color,size=56,strokeWidth=6,isEmpty=false){
  return `<div class="mini-ring" style="width:${size}px;height:${size}px">${ringGaugeSvg(percent,color,size,strokeWidth,isEmpty)}<span>${isEmpty?"—":`${Math.round(percent)}%`}</span></div>`;
}
function strainRecoveryCard(ar){
  const recovery=computeRecoveryScore(),strain=computeStrainScore(),sleepPerf=computeSleepPerformance();
  const recColor=recovery?{green:"var(--acid)",yellow:"var(--orange)",red:"#ff6b6b"}[recovery.band]:"var(--muted)";
  const recNote=!recovery?(ar?"سجّل نومك لرؤية النتيجة":"Log sleep to see a score"):recovery.calibrating?(ar?"لا يزال يُعاير":"Still calibrating"):recovery.band==="green"?(ar?"جاهز للدفع":"Ready to push"):recovery.band==="yellow"?(ar?"متوسط، خفف الحمل قليلاً":"Moderate, ease off a little"):(ar?"منخفض، أعطِ الجسم وقتاً":"Low, prioritize rest");
  const sleepColor=!sleepPerf?"var(--muted)":sleepPerf.performance>=90?"var(--acid)":sleepPerf.performance>=70?"var(--orange)":"#ff6b6b";
  const sleepNote=!sleepPerf?(ar?"سجّل نومك لرؤية النتيجة":"Log sleep to see a score"):sleepPerf.estimatedBaseline?(ar?`يُبنى خط الأساس — مقابل تقدير ${sleepPerf.need}h مؤقت`:`Building baseline — vs a temporary ${sleepPerf.need}h estimate`):`${sleepPerf.actual}h ${ar?"من":"of"} ${sleepPerf.need}h`;
  const strainNote=strain>=14?(ar?"إجهاد مرتفع اليوم":"High load today"):strain>=7?(ar?"إجهاد معتدل":"Moderate load"):(ar?"من التمارين المسجلة اليوم":"From today's logged training");
  return `<section class="vitals-trio">
    <article class="vital-ring-card"><div class="vital-ring">${ringGaugeSvg(sleepPerf?sleepPerf.performance:0,sleepColor,82,8,!sleepPerf)}<div class="vital-ring-label"><strong>${sleepPerf?`${sleepPerf.performance}%`:"—"}</strong><span>${ar?"النوم":"SLEEP"}</span></div></div><small>${sleepNote}</small></article>
    <article class="vital-ring-card"><div class="vital-ring">${ringGaugeSvg(recovery?recovery.score:0,recColor,82,8,!recovery)}<div class="vital-ring-label"><strong>${recovery?`${recovery.score}%`:"—"}</strong><span>${ar?"الاستشفاء":"RECOVERY"}</span></div></div><small>${recNote}</small></article>
    <article class="vital-ring-card"><div class="vital-ring">${ringGaugeSvg(strain/21*100,"var(--blue)",82,8)}<div class="vital-ring-label"><strong>${strain}</strong><span>${ar?"الإجهاد":"STRAIN"}</span></div></div><small>${strainNote}</small></article>
  </section>`;
}
function vitalsTeaserStrip(ar){
  const recovery=computeRecoveryScore(),strain=computeStrainScore();
  const recColor=recovery?{green:"var(--acid)",yellow:"var(--orange)",red:"#ff6b6b"}[recovery.band]:"var(--muted)";
  return `<button class="vitals-teaser" data-goto-vitals type="button">
    ${miniRing(recovery?recovery.score:0,recColor,44,5,!recovery)}
    <span class="vitals-teaser-copy"><small>${ar?"الاستشفاء اليوم":"RECOVERY TODAY"}</small><strong>${recovery?`${recovery.score}%`:"—"} · ${ar?"إجهاد":"Strain"} ${strain}</strong></span>
    <span class="vitals-teaser-arrow" aria-hidden="true">${ICONS.heartbeat}</span>
  </button>`;
}
function sleepTrackerCard(ar){
  const today=state.sleepLogs.find(s=>s.date===isoDay()),sorted=[...state.sleepLogs].sort((a,b)=>b.date.localeCompare(a.date)),avg=recentSleepAvg(7),minHours=REP_HEALTH_GUIDE.rules.minimumSleepHours;
  const perf=computeSleepPerformance();
  const sleepRow=s=>`<div class="sleep-row"><span>${new Date(s.date).toLocaleDateString(ar?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</span><strong>${esc(s.bedtime)} → ${esc(s.wake)}</strong><small class="${s.hours<minHours?"low":""}">${s.hours}h</small><button class="quiet" data-delete-sleep="${s.date}" aria-label="${ar?"حذف":"Delete"}">×</button></div>`;
  const visibleRows=sorted.slice(0,3).map(sleepRow).join(""),restEntries=sorted.slice(3,7),restRows=restEntries.map(sleepRow).join("");
  return `<article class="recovery-card wide sleep-card"><span class="card-kicker">${ar?"من ساعة أبل ووتش":"FROM APPLE WATCH"}</span><h2>${ar?"سجل النوم اليومي":"Daily sleep log"}</h2>
    <div class="sleep-summary"><div><small>${ar?"الليلة الماضية":"LAST NIGHT"}</small><strong>${today?`${today.hours}h`:(ar?"لم يُسجَّل بعد":"Not logged yet")}</strong></div>${avg!==null?`<div><small>${ar?"متوسط 7 أيام":"7-DAY AVERAGE"}</small><strong class="${avg<minHours?"warn":""}">${avg}h</strong></div>`:""}${perf?`<div><small>${ar?"أداء النوم":"SLEEP PERFORMANCE"}</small><strong class="${perf.performance<85?"warn":""}">${perf.performance}%</strong></div>`:""}</div>
    ${perf?`<p class="sleep-need-breakdown">${ar?`الحاجة الليلة: ${perf.need}h (أساس ${perf.baseline}h${perf.estimatedBaseline?" تقديري":""}${perf.strainDebt?` + ${perf.strainDebt}h إجهاد أمس`:""}${perf.sleepDebt?` + ${perf.sleepDebt}h دين نوم`:""})`:`Tonight's need: ${perf.need}h (${perf.baseline}h ${perf.estimatedBaseline?"estimated ":""}baseline${perf.strainDebt?` + ${perf.strainDebt}h from yesterday's strain`:""}${perf.sleepDebt?` + ${perf.sleepDebt}h sleep debt`:""})`}</p>`:""}
    <form class="sleep-form" data-sleep-form><label>${ar?"وقت النوم":"Bedtime"}<input type="time" data-sleep-bedtime value="${today?.bedtime||REP_HEALTH_GUIDE.rules.targetBedtime}" required></label><label>${ar?"وقت الاستيقاظ":"Wake time"}<input type="time" data-sleep-wake value="${today?.wake||REP_HEALTH_GUIDE.rules.wakeTime}" required></label><button type="submit">${today?(ar?"تحديث":"Update"):(ar?"حفظ":"Save")}</button></form>
    <div class="sleep-form-optional"><label>${ar?"تقلب معدل ضربات القلب (اختياري)":"HRV ms (optional)"}<input type="number" min="0" max="300" step="1" inputmode="numeric" data-sleep-hrv value="${today?.hrv||""}" placeholder="${ar?"مثال 55":"e.g. 55"}"></label><label>${ar?"نبض الراحة (اختياري)":"Resting HR (optional)"}<input type="number" min="0" max="200" step="1" inputmode="numeric" data-sleep-rhr value="${today?.rhr||""}" placeholder="${ar?"مثال 58":"e.g. 58"}"></label><label>${ar?"معدل التنفس (اختياري)":"Respiratory rate (optional)"}<input type="number" min="0" max="60" step="0.1" inputmode="decimal" data-sleep-resp value="${today?.resp||""}" placeholder="${ar?"مثال 15":"e.g. 15"}"></label></div>
    <p class="sleep-hint">${ar?"اقرأ الوقتين من تطبيق الصحة على أبل ووتش، ثم سجّلهما هنا يدوياً. الحقول الاختيارية تحسّن دقة نتيجة الاستشفاء.":"Read both times off the Apple Watch Health app, then log them here manually. The optional fields improve the Recovery score's accuracy."}</p>
    ${visibleRows?`<div class="sleep-history">${visibleRows}</div>`:""}
    ${restRows?`<details class="sleep-history-more"><summary>${ar?`عرض ${restEntries.length} ليالٍ إضافية`:`Show ${restEntries.length} more night${restEntries.length===1?"":"s"}`}</summary><div class="sleep-history">${restRows}</div></details>`:""}</article>`;
}
// Logs against last night specifically (not "today"), since these factors
// describe the evening that led into the sleep just recorded above.
function journalCard(ar){
  const b=dailyBucket("journal");
  return `<section class="recovery-card wide journal-card"><span class="card-kicker">${ar?"عن الليلة الماضية":"ABOUT LAST NIGHT"}</span><h2>${ar?"دفتر اليومية":"Journal"}</h2>
    <div class="module-checklist journal-list">${JOURNAL_FACTORS.map(f=>`<label><input type="checkbox" data-daily-key="${f.key}" ${b.checked[f.key]?"checked":""}><span><strong>${esc(ar?f.ar:f.en)}</strong></span></label>`).join("")}</div>
    <p class="sleep-hint">${ar?"سجّل ما ينطبق، وستظهر أنماط الاستشفاء المرتبطة بها في التحليلات بعد بضعة أيام.":"Log what applied, and any Recovery patterns tied to them will show up in Insights after a few days."}</p></section>`;
}
function sleepSummaryCard(ar){
  const today=state.sleepLogs.find(s=>s.date===isoDay()),avg=recentSleepAvg(7),minHours=REP_HEALTH_GUIDE.rules.minimumSleepHours;
  return `<article class="recovery-card wide sleep-card sleep-summary-card" data-goto-vitals role="button" tabindex="0"><span class="card-kicker">${ar?"من ساعة أبل ووتش":"FROM APPLE WATCH"}</span><h2>${ar?"سجل النوم اليومي":"Daily sleep log"}</h2>
    <div class="sleep-summary"><div><small>${ar?"الليلة الماضية":"LAST NIGHT"}</small><strong>${today?`${today.hours}h`:(ar?"لم يُسجَّل بعد":"Not logged yet")}</strong></div>${avg!==null?`<div><small>${ar?"متوسط 7 أيام":"7-DAY AVERAGE"}</small><strong class="${avg<minHours?"warn":""}">${avg}h</strong></div>`:""}</div>
    <p class="sleep-hint">${ar?"سجّل النوم وتقلب القلب ونبض الراحة من تبويب الحيوية، مع خيار الاستيراد من لقطة شاشة.":"Log sleep, HRV, and resting heart rate from the Vitals tab, with the option to import from a screenshot."}</p>
    <span class="sleep-goto-link">${ar?"افتح الحيوية للتسجيل ←":"Open Vitals to log →"}</span></article>`;
}
function vitalsScreenshotCard(ar){
  const connected=Boolean(localStorage.getItem(syncKeyStorage)),d=state.vitalsDraft;
  if(!d)return "";
  return `<section class="vitals-import-card is-review"><div class="supplement-head"><div><small>${ar?"راجع القيم المستخرجة":"REVIEW EXTRACTED VALUES"}</small><strong>${ar?"من لقطة صحة أبل":"From Apple Health screenshot"}</strong></div></div>
    <div class="vitals-review-grid">
      <label><span>${ar?"ساعات النوم":"Sleep hours"}</span><input type="number" min="0" max="16" step="0.1" inputmode="decimal" data-vitals-field="sleep_hours" value="${d.sleep_hours??""}"></label>
      <label><span>${ar?"وقت النوم":"Bedtime"}</span><input type="time" data-vitals-field="bedtime" value="${d.bedtime||""}"></label>
      <label><span>${ar?"وقت الاستيقاظ":"Wake time"}</span><input type="time" data-vitals-field="wake_time" value="${d.wake_time||""}"></label>
      <label><span>${ar?"تقلب القلب (ms)":"HRV (ms)"}</span><input type="number" min="0" max="300" step="1" inputmode="numeric" data-vitals-field="hrv_ms" value="${d.hrv_ms??""}"></label>
      <label><span>${ar?"نبض الراحة (bpm)":"Resting HR (bpm)"}</span><input type="number" min="0" max="200" step="1" inputmode="numeric" data-vitals-field="resting_hr_bpm" value="${d.resting_hr_bpm??""}"></label>
      <label><span>${ar?"معدل التنفس (نفس/د)":"Respiratory rate (bpm)"}</span><input type="number" min="0" max="60" step="0.1" inputmode="decimal" data-vitals-field="respiratory_rate_bpm" value="${d.respiratory_rate_bpm??""}"></label>
      <label><span>${ar?"طاقة نشطة (kcal)":"Active energy (kcal)"}</span><input type="number" min="0" max="10000" step="1" inputmode="numeric" data-vitals-field="active_energy_kcal" value="${d.active_energy_kcal??""}"></label>
    </div>
    ${d.notes?`<p class="vitals-note">${esc(d.notes)}</p>`:""}
    <div class="vitals-review-actions"><button class="quiet" data-vitals-discard type="button">${ar?"تجاهل":"Discard"}</button><button data-vitals-save type="button">${ar?"حفظ في سجل اليوم":"Save to today's log"}</button></div>
    ${state.vitalsStatus?`<p class="vitals-status ${state.vitalsError?"is-error":""}">${esc(state.vitalsStatus)}</p>`:""}</section>`;
}
// Screenshot upload + Shortcuts automation are setup tools you touch once,
// not daily content - tucked behind a disclosure so the daily-use sleep/
// energy forms below get the visual weight instead. The sync-health line and
// any stale-sync warning stay outside it since those need to stay visible.
function importRunStatus(ar){
  const runs=state.vitalsImportRuns[isoDay()]||[],hours=runs.map(value=>new Date(value).getHours()).filter(Number.isFinite);
  const slots=[{label:'06:00',done:hours.some(h=>h>=4&&h<9)},{label:'12:00',done:hours.some(h=>h>=10&&h<15)},{label:'18:00',done:hours.some(h=>h>=16&&h<21)},{label:'23:45',done:hours.some(h=>h>=21)}];
  const last=state.lastVitalsImportAt?new Date(state.lastVitalsImportAt):null,lastText=last&&!Number.isNaN(last.getTime())?last.toLocaleString(ar?'ar-EG':'en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):null;
  return `<div class='vitals-review-grid import-run-grid'>${slots.map(slot=>`<div><small>${slot.label}</small><strong>${slot.done?(ar?'وصل':'Received'):(ar?'بانتظار':'Pending')}</strong></div>`).join('')}</div>${lastText?`<p class='vitals-import-copy'>${ar?'آخر استلام ناجح':'Last successful import'}: ${esc(lastText)}</p>`:''}`;
}
function healthMetricsCard(ar){
  const dates=Object.keys(state.healthMetrics||{}).sort().reverse(),metric=state.healthMetrics[isoDay()]||state.healthMetrics[dates[0]];
  if(!metric)return '';
  const values=[[ar?'الخطوات':'Steps',metric.steps,''],[ar?'دقائق التمرين':'Exercise',metric.exerciseMinutes,' min'],[ar?'دقائق الوقوف':'Stand',metric.standMinutes,' min'],['VO₂ max',metric.vo2Max,''],['SpO₂',metric.oxygenSaturation,'%'],[ar?'حرارة المعصم':'Wrist temp',metric.wristTemperature,'°C'],[ar?'النوم العميق':'Deep sleep',metric.deepSleepHours,'h'],['REM',metric.remSleepHours,'h']].filter(([,value])=>value!==null&&value!==undefined);
  if(!values.length)return '';
  return `<section class='recovery-card wide'><span class='card-kicker'>${ar?'مقاييس صحة أبل':'APPLE HEALTH METRICS'}</span><h2>${ar?'آخر قراءة يومية':'Latest daily reading'}</h2><div class='sleep-summary'>${values.map(([label,value,unit])=>`<div><small>${label}</small><strong>${Math.round(Number(value)*10)/10}${unit}</strong></div>`).join('')}</div><p class='sleep-hint'>${ar?'تُعرض للاتجاه والسياق، ولا تُستخدم للتشخيص.':'Used for trends and context, not diagnosis.'}</p></section>`;
}
function importCard(ar){
  const connected=Boolean(localStorage.getItem(syncKeyStorage));
  const last=state.lastVitalsImportDate,stale=daysSinceVitalsImport(),runStatus=importRunStatus(ar);
  const staleWarning=stale!==null&&stale>=2?`<p class="vitals-status is-error">${ar?`لم تصل بيانات جديدة منذ ${stale} أيام. تحقق من أن أتمتة الاختصار ما زالت تعمل في تطبيق الاختصارات ← تبويب الأتمتة.`:`No new data for ${stale} days. Check that the Shortcuts automation is still enabled under Shortcuts → Automation.`}</p>`:"";
  return `<section class="vitals-import-card import-card"><div class="supplement-head"><div><small>${ar?"استيراد":"IMPORT"}</small><strong>${last?(ar?`آخر مزامنة: ${last}`:`Last synced: ${last}`):(ar?"لم يُعدّ بعد":"Not set up yet")}</strong></div></div>
    ${staleWarning}
    ${runStatus}
    <details class="import-details">
      <summary>${ar?"لقطة شاشة أو أتمتة كاملة ←":"Screenshot import or full automation →"}</summary>
      <div class="import-details-body">
        <div class="import-option">
          <p class="vitals-import-copy">${ar?"التقط شاشة من تطبيق الصحة أو ساعة أبل وسنقرأ الأرقام تلقائياً لمراجعتها قبل الحفظ.":"Screenshot the Health app or your Apple Watch face and we'll read the numbers for you to review before saving."}</p>
          ${connected?`<label class="vitals-upload-button">${state.vitalsBusy?(ar?"جارٍ التحليل…":"Analyzing…"):(ar?"⬆ اختر لقطة الشاشة":"⬆ Choose screenshot")}<input type="file" accept="image/*" data-vitals-screenshot ${state.vitalsBusy?"disabled":""}></label><p class="integration-disclosure">${ar?"تُرسل الصورة إلى Google Gemini لاستخراج القيم، ولا تُحفظ في سجل التطبيق.":"The image is sent to Google Gemini to extract values and is not stored in the app history."}</p>`
            :`<button class="quiet vitals-connect-button" data-vitals-connect type="button">${ar?"اتصل من تبويب التغذية لتفعيل الاستيراد ←":"Connect in the Nutrition tab to enable import →"}</button>`}
        </div>
        <div class="import-option">
          <p class="vitals-import-copy">${ar?"أعدّ اختصار أبل (Shortcuts) ليرسل بيانات صحتك تلقائياً كل صباح دون الحاجة لفتح التطبيق — راجع ملف README لخطوات الإعداد الكاملة.":"Use four daily Apple Shortcuts automations (06:00, 12:00, 18:00, and 23:45) to refresh Health data without opening the app — see the README for setup."}</p>
          <button class="quiet vitals-connect-button" data-vitals-check-now type="button">${ar?"تحقق الآن":"Check now"}</button>
        </div>
      </div>
    </details>
    ${state.vitalsStatus?`<p class="vitals-status ${state.vitalsError?"is-error":""}">${esc(state.vitalsStatus)}</p>`:""}</section>`;
}
async function analyzeVitalsImage(file){
  if(!file)return;
  const key=localStorage.getItem(syncKeyStorage);
  if(!key){state.vitalsStatus=state.lang==="ar"?"اتصل أولاً من تبويب التغذية.":"Connect in the Nutrition tab first.";state.vitalsError=true;renderVitals();return;}
  try{
    const image=await prepareFoodImage(file);
    state.vitalsBusy=true;state.vitalsError=false;state.vitalsStatus=state.lang==="ar"?"جارٍ قراءة اللقطة…":"Reading screenshot…";renderVitals();
    const response=await repAuth.fetch("/api/vitals/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(image)}),data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok){const error=Error(data.error||`Analysis failed (${response.status})`);error.auth=response.status===401;throw error;}
    if(data.vitals?.recognizable===false)throw Error(data.vitals.notes||(state.lang==="ar"?"تعذّرت قراءة أي بيانات من هذه الصورة.":"Couldn't read any vitals from this image."));
    state.vitalsDraft=data.vitals;state.vitalsStatus="";
  }catch(error){
    state.vitalsError=true;
    if(error.auth){repAuth.clear();state.syncState="auth";state.vitalsStatus=state.lang==="ar"?"انتهى اقتران الجهاز. أعد الاتصال من تبويب التغذية.":"Device pairing expired. Reconnect from the Nutrition tab.";}
    else state.vitalsStatus=String(error.message||error);
  }finally{
    state.vitalsBusy=false;persist();renderVitals();
  }
}
function saveVitalsFromDraft(){
  const d=state.vitalsDraft;if(!d)return;
  document.querySelectorAll("[data-vitals-field]").forEach(input=>{const f=input.dataset.vitalsField,v=input.value;d[f]=v===""?null:(input.type==="number"?Number(v):v);});
  const date=isoDay(),existing=state.sleepLogs.find(s=>s.date===date);
  const bedtime=d.bedtime||existing?.bedtime||"",wake=d.wake_time||existing?.wake||"";
  let hours=computeSleepHours(bedtime,wake);
  if((!hours||hours<=0)&&Number.isFinite(Number(d.sleep_hours))&&Number(d.sleep_hours)>0)hours=Math.round(Number(d.sleep_hours)*10)/10;
  if((!hours||hours<=0)&&existing?.hours)hours=existing.hours;
  if(!hours||hours<=0){state.vitalsStatus=state.lang==="ar"?"لم يتم العثور على مدة نوم صالحة. أضف وقت النوم/الاستيقاظ أعلاه ثم احفظ مرة أخرى.":"No valid sleep duration found. Fill in bedtime/wake above, then save again.";state.vitalsError=true;renderVitals();return;}
  const hrvValue=Number(d.hrv_ms),rhrValue=Number(d.resting_hr_bpm),respValue=Number(d.respiratory_rate_bpm);
  const hrv=Number.isFinite(hrvValue)&&hrvValue>0?hrvValue:(existing?.hrv||null),rhr=Number.isFinite(rhrValue)&&rhrValue>0?rhrValue:(existing?.rhr||null),resp=Number.isFinite(respValue)&&respValue>0?respValue:(existing?.resp||null);
  state.sleepLogs=state.sleepLogs.filter(s=>s.date!==date);
  state.sleepLogs.unshift({date,bedtime,wake,hours,hrv,rhr,resp});
  state.sleepLogs=state.sleepLogs.slice(0,120);
  queueHealth("sleep",{date,sleep:hours});
  const activeEnergyValue=Number(d.active_energy_kcal);
  if(Number.isFinite(activeEnergyValue)&&activeEnergyValue>0)state.activeEnergy[date]=Math.round(activeEnergyValue);
  state.vitalsDraft=null;state.vitalsStatus=state.lang==="ar"?"تم الحفظ في سجل اليوم.":"Saved to today's log.";state.vitalsError=false;
  persist();renderVitals();
}
function discardVitalsDraft(){state.vitalsDraft=null;state.vitalsStatus="";state.vitalsError=false;renderVitals();}
// Applies one day of data pushed by an automated Apple Shortcuts export (no
// review step, unlike the screenshot flow - this is direct sensor data, not
// an AI guess). Keeps the same "a sleepLogs entry always has valid hours"
// invariant as manual/screenshot entry: skips the sleep side if no duration
// can be determined, but still applies active energy independently.
// Physiologically plausible ranges for an adult at rest. A value outside these
// means the import pipeline broke (a missing field, a mis-mapped Shortcut
// variable), not that something remarkable happened - so drop it rather than
// letting it silently skew a Recovery baseline for the next 30 days.
const VITALS_SANE_RANGES={hrv:[5,300],rhr:[30,120],resp:[5,40]};
function saneVital(raw,key){
  const value=Number(raw),[min,max]=VITALS_SANE_RANGES[key];
  return Number.isFinite(value)&&value>=min&&value<=max?value:null;
}
function applyVitalsEntry(entry){
  const existing=state.sleepLogs.find(s=>s.date===entry.date);
  const bedtime=entry.bedtime||existing?.bedtime||'',wake=entry.wake_time||existing?.wake||'';
  const measuredHours=Number(entry.sleep_hours);
  let hours=Number.isFinite(measuredHours)&&measuredHours>0&&measuredHours<=16?Math.round(measuredHours*10)/10:computeSleepHours(bedtime,wake);
  if((!hours||hours<=0)&&existing?.hours)hours=existing.hours;
  if(hours>16)hours=existing?.hours||null;
  const dropped=[];
  const readVital=(raw,key,label,fallback)=>{
    const value=saneVital(raw,key);
    if(value===null&&raw!==null&&raw!==undefined&&raw!=='')dropped.push(label);
    return value??fallback??null;
  };
  const hrv=readVital(entry.hrv_ms,'hrv','HRV',existing?.hrv);
  const rhr=readVital(entry.resting_hr_bpm,'rhr','resting HR',existing?.rhr);
  const resp=readVital(entry.respiratory_rate_bpm,'resp','respiratory rate',existing?.resp);
  if(hours&&hours>0){
    state.sleepLogs=state.sleepLogs.filter(s=>s.date!==entry.date);
    state.sleepLogs.unshift({date:entry.date,bedtime,wake,hours,hrv,rhr,resp});
    state.sleepLogs=state.sleepLogs.slice(0,120);
  }
  const activeEnergyValue=Number(entry.active_energy_kcal);
  if(Number.isFinite(activeEnergyValue)&&activeEnergyValue>0&&activeEnergyValue<=10000)state.activeEnergy[entry.date]=Math.round(activeEnergyValue);
  const prior=state.healthMetrics[entry.date]||{},number=(value,min,max)=>{const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;};
  state.healthMetrics[entry.date]={...prior,date:entry.date,source:entry.source||prior.source||'Apple Health',importedAt:entry.imported_at||prior.importedAt||null,steps:number(entry.steps,0,200000)??prior.steps??null,exerciseMinutes:number(entry.exercise_minutes,0,1440)??prior.exerciseMinutes??null,standMinutes:number(entry.stand_minutes,0,1440)??prior.standMinutes??null,vo2Max:number(entry.vo2_max,5,100)??prior.vo2Max??null,oxygenSaturation:number(entry.oxygen_saturation_pct,50,100)??prior.oxygenSaturation??null,wristTemperature:number(entry.wrist_temperature_c,20,45)??prior.wristTemperature??null,deepSleepHours:number(entry.sleep_deep_hours,0,10)??prior.deepSleepHours??null,remSleepHours:number(entry.sleep_rem_hours,0,10)??prior.remSleepHours??null};
  const runs=[...(state.vitalsImportRuns[entry.date]||[]),...(Array.isArray(entry.import_runs)?entry.import_runs:entry.imported_at?[entry.imported_at]:[])];
  state.vitalsImportRuns[entry.date]=[...new Set(runs.filter(Boolean))].sort().slice(-24);
  if(entry.imported_at)state.lastVitalsImportAt=entry.imported_at;
  return {date:entry.date,dropped,noSleep:!(hours&&hours>0)};
}
async function fetchPendingVitals(showStatus=false){
  const key=localStorage.getItem(syncKeyStorage);
  if(!key||!navigator.onLine){
    if(showStatus){state.vitalsImportStatus=state.lang==="ar"?"اتصل من تبويب التغذية أولاً.":"Connect in the Nutrition tab first.";state.vitalsImportError=true;if(state.view==="vitals")renderVitals();}
    return;
  }
  try{
    const since=shiftLocalDay(-7);
    const response=await repAuth.fetch(`/api/vitals/pending?since=${encodeURIComponent(since)}`);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw Error(data.error||`Check failed (${response.status})`);
    if(data.entries&&data.entries.length){
      const reports=data.entries.map(applyVitalsEntry);
      state.lastVitalsImportDate=data.entries[data.entries.length-1].date;
      const ar=state.lang==="ar";
      const problems=reports.filter(r=>r.dropped.length||r.noSleep);
      if(problems.length){
        const dropped=[...new Set(problems.flatMap(r=>r.dropped))];
        const parts=[];
        if(dropped.length)parts.push(ar?`قيم خارج النطاق: ${dropped.join("، ")}`:`Ignored: ${dropped.join(", ")}`);
        if(problems.some(r=>r.noSleep))parts.push(ar?"لم تصل مدة نوم صالحة":"no valid sleep duration");
        state.vitalsImportStatus=(ar?"تم الاستيراد مع تنبيهات — ":"Imported with warnings — ")+parts.join(ar?" · ":" · ");
        state.vitalsImportError=true;
      }else{
        state.vitalsImportStatus=ar?`تم استيراد ${data.entries.length} سجل من ساعة أبل.`:`Imported ${data.entries.length} Apple Watch record${data.entries.length===1?"":"s"}.`;
        state.vitalsImportError=false;
      }
      persist();
      if(state.view==="home-overview"||state.activeTab==="home")renderOverview();
      else if(state.view==="vitals"||state.activeTab==="health")renderVitals();
      else if(state.view==="insights"||state.activeTab==="insights")renderInsights();
    }else if(showStatus){
      state.vitalsImportStatus=state.lang==="ar"?"لا توجد بيانات جديدة بعد.":"No new data yet.";
      state.vitalsImportError=false;
      persist();
      if(state.view==="vitals")renderVitals();
    }
  }catch(error){
    if(showStatus){state.vitalsImportStatus=String(error.message||error);state.vitalsImportError=true;if(state.view==="vitals")renderVitals();}
  }
}
// Days since the last automated import landed. Returns null when nothing has
// ever synced (a different, non-alarming state than "your automation broke").
function daysSinceVitalsImport(){
  const last=state.lastVitalsImportDate;
  if(!last)return null;
  const diff=Math.floor((new Date(isoDay()).getTime()-new Date(last).getTime())/86400000);
  return Number.isFinite(diff)&&diff>=0?diff:null;
}
function saveActiveEnergy(kcal){const value=Math.max(0,Math.round(Number(kcal)||0));if(!value)return;state.activeEnergy[isoDay()]=value;persist();renderVitals();}
function activeEnergyCard(ar){
  const value=state.activeEnergy?.[isoDay()];
  return `<section class="active-energy-card"><div class="supplement-head"><div><small>${ar?"طاقة اليوم النشطة":"ACTIVE ENERGY TODAY"}</small><strong>${value?`${value} kcal`:(ar?"لم تُسجَّل بعد":"Not logged yet")}</strong></div></div>
    <p class="vitals-import-copy">${ar?"من حلقات النشاط في ساعتك أو «الطاقة النشطة» في تطبيق الصحة. يضيف حِمل اليوم كله — وليس التمارين المسجلة فقط — إلى نتيجة الإجهاد.":"From your Watch's Activity rings or the Health app's Active Energy total. Adds your whole day's load — not just logged workouts — to the Strain score."}</p>
    <form class="active-energy-form" data-active-energy-form><input type="number" min="0" max="10000" step="1" inputmode="numeric" value="${value||""}" placeholder="${ar?"مثال 620":"e.g. 620"}" data-active-energy-input aria-label="${ar?"الطاقة النشطة اليوم بالكيلوكالوري":"Today's active energy in kilocalories"}"><button type="submit">${ar?"حفظ":"Save"}</button></form></section>`;
}
function bindVitalsTools(){
  document.querySelector("[data-vitals-screenshot]")?.addEventListener("change",e=>analyzeVitalsImage(e.target.files?.[0]));
  document.querySelector("[data-vitals-connect]")?.addEventListener("click",()=>setPrimaryTab("food"));
  document.querySelector("[data-vitals-save]")?.addEventListener("click",saveVitalsFromDraft);
  document.querySelector("[data-vitals-discard]")?.addEventListener("click",discardVitalsDraft);
  document.querySelector("[data-active-energy-form]")?.addEventListener("submit",e=>{e.preventDefault();saveActiveEnergy(document.querySelector("[data-active-energy-input]").value);});
  document.querySelector("[data-vitals-check-now]")?.addEventListener("click",()=>fetchPendingVitals(true));
  document.querySelector("[data-sleep-form]")?.addEventListener("submit",e=>{e.preventDefault();const bedtime=document.querySelector("[data-sleep-bedtime]").value,wake=document.querySelector("[data-sleep-wake]").value,hrv=document.querySelector("[data-sleep-hrv]")?.value,rhr=document.querySelector("[data-sleep-rhr]")?.value,resp=document.querySelector("[data-sleep-resp]")?.value;if(saveSleepLog(bedtime,wake,hrv,rhr,resp)){if(navigator.vibrate)navigator.vibrate(30);renderVitals();}});
  document.querySelectorAll("[data-delete-sleep]").forEach(b=>b.onclick=()=>{deleteSleepLog(b.dataset.deleteSleep);renderVitals();});
  document.querySelectorAll(".journal-list [data-daily-key]").forEach(el=>el.onchange=()=>{if(el.checked&&navigator.vibrate)navigator.vibrate(30);const b=dailyBucket("journal");b.checked[el.dataset.dailyKey]=el.checked;persist();renderVitals();});
}
function renderVitals(){
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="vitals";state.activeTab="vitals";persistDebounced();updatePrimaryTabs();
  const ar=state.lang==="ar";
  app.innerHTML=REP_SAFE_DOM.sanitize(`${moduleHeader(ar?"الحيوية":"VITALS",ar?"استعدادك اليوم.":"Your readiness today.",ar?"مؤشرات الاستشفاء والإجهاد المبنية على بياناتك، مع إمكانية استيراد الأرقام من لقطات شاشة صحة أبل.":"Recovery and strain built from your own data, plus the option to import numbers straight from Apple Health screenshots.")}
  ${strainRecoveryCard(ar)}
  ${vitalsScreenshotCard(ar)}
  ${sleepTrackerCard(ar)}
  ${journalCard(ar)}
  ${activeEnergyCard(ar)}
  ${healthMetricsCard(ar)}
  ${importCard(ar)}`);
  bindVitalsTools();
}
function weightTrackerCard(ar){
  const current=currentWeekWeight(),sorted=[...state.bodyWeights].sort((a,b)=>b.week.localeCompare(a.week));
  const rows=sorted.slice(0,8).map((w,i)=>{const prev=sorted[i+1],delta=prev?Math.round((w.kg-prev.kg)*10)/10:null;const deltaText=delta===null?"":(delta>0?`+${delta}`:delta===0?"±0":`${delta}`)+" kg";return `<div class="weight-row"><span>${new Date(w.date).toLocaleDateString(ar?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</span><strong>${w.kg} kg</strong><small class="${delta>0?"up":delta<0?"down":""}">${deltaText}</small><button class="quiet" data-delete-weight="${w.week}" aria-label="${ar?"حذف":"Delete"}">×</button></div>`;}).join("");
  const trend=sorted.length>1?Math.round((sorted[0].kg-sorted[sorted.length-1].kg)*10)/10:null;
  return `<section class="weight-card"><div class="weight-summary"><div><small>${ar?"وزن الجسم · أسبوعي":"BODY WEIGHT · WEEKLY"}</small><strong>${current?`${current.kg} kg`:(ar?"لم يُسجَّل هذا الأسبوع":"Not logged this week")}</strong>${trend!==null?`<span>${ar?"منذ أول تسجيل":"since first entry"}: ${trend>0?`+${trend}`:trend} kg · ${sorted.length} ${ar?"أسابيع":"weeks"}</span>`:""}</div></div>
    <form class="weight-form" data-weight-form><input data-weight-input type="number" min="30" max="300" step="0.1" inputmode="decimal" placeholder="${ar?"كجم":"kg"}" value="${current?current.kg:""}" aria-label="${ar?"وزن الجسم بالكيلوجرام":"Body weight in kilograms"}"><button type="submit">${current?(ar?"تحديث":"Update"):(ar?"حفظ":"Save")}</button></form>
    ${rows?`<div class="weight-history">${rows}</div>`:`<p class="weight-empty">${ar?"سجّل وزنك مرة أسبوعياً لمتابعة الاتجاه بمرور الوقت.":"Log your weight once a week to track the trend over time."}</p>`}</section>`;
}
function waterTrackerCard(water,goal,ar){const remaining=Math.max(goal-water,0),progress=Math.min(Math.round(water/goal*100),100);return `<section class="water-card"><div class="water-summary"><div><small>${ar?"الترطيب":"HYDRATION"}</small><strong>${water} / ${goal} ml</strong><span>${remaining} ml ${ar?"متبقي اليوم":"remaining today"}</span></div><div aria-label="${ar?"تقدم شرب المياه":"Water goal progress"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" role="progressbar">${miniRing(progress,"var(--blue)")}</div></div><div class="water-actions"><button data-water-delta="-250" aria-label="${ar?"اطرح 250 مل":"Subtract 250 milliliters"}">−250</button><button data-water-delta="250">+250</button><button data-water-delta="500">+500</button><button data-water-delta="1000">+1L</button></div><form class="water-custom" data-water-form><label><span>${ar?"كمية مخصصة":"Custom amount"}</span><input data-water-custom type="number" min="1" max="20000" step="1" inputmode="numeric" placeholder="${ar?"مثال 330":"e.g. 330"}" aria-label="${ar?"كمية المياه بالملليلتر":"Water amount in milliliters"}"></label><button type="submit" data-water-custom-action="add">${ar?"أضف":"Add"}</button><button type="button" data-water-custom-action="set">${ar?"حدد الإجمالي":"Set total"}</button></form><button class="water-reset" data-water-reset>${ar?"إعادة ضبط مياه اليوم":"Reset today's water"}</button></section>`;}
function macroDonutRing(totals, profile, ar){
  const pCal=(totals.protein_g||0)*4, cCal=(totals.carbs_g||0)*4, fCal=(totals.fat_g||0)*9;
  const tot=pCal+cCal+fCal||1;
  const pPct=Math.round((pCal/tot)*100), cPct=Math.round((cCal/tot)*100), fPct=Math.round((fCal/tot)*100);
  const calPct=Math.min(100, Math.round(((totals.calories||0)/(profile?.calories||2200))*100));
  const proPct=Math.min(100, Math.round(((totals.protein_g||0)/(profile?.protein||160))*100));
  return `<article class="macro-donut-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--panel);grid-column:1/-1;">
    <div style="flex:1;">
      <small style="color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">${ar?"توزيع السعرات ونسبة الأهداف":"CALORIC DISTRIBUTION & TARGETS"}</small>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:13px;font-weight:850;">
        <span style="color:var(--acid);">P ${pPct}%</span>
        <span style="color:var(--blue);">C ${cPct}%</span>
        <span style="color:var(--orange);">F ${fPct}%</span>
      </div>
      <div style="display:flex;gap:4px;align-items:center;margin-top:8px;">
        <div style="height:6px;width:${tot > 1 ? Math.max(8, pPct*1.4) : 0}px;background:var(--acid);border-radius:3px;" title="Protein ${pPct}%"></div>
        <div style="height:6px;width:${tot > 1 ? Math.max(8, cPct*1.4) : 0}px;background:var(--blue);border-radius:3px;" title="Carbs ${cPct}%"></div>
        <div style="height:6px;width:${tot > 1 ? Math.max(8, fPct*1.4) : 0}px;background:var(--orange);border-radius:3px;" title="Fat ${fPct}%"></div>
      </div>
    </div>
    <div style="position:relative;width:60px;height:60px;flex:none;display:grid;place-items:center;">
      <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg);">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2.5"></circle>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#ffd36a" stroke-width="2.5" stroke-dasharray="94.2" stroke-dashoffset="${94.2 - (calPct/100)*94.2}" stroke-linecap="round"></circle>
        <circle cx="18" cy="18" r="11" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2.5"></circle>
        <circle cx="18" cy="18" r="11" fill="none" stroke="var(--acid)" stroke-width="2.5" stroke-dasharray="69.1" stroke-dashoffset="${69.1 - (proPct/100)*69.1}" stroke-linecap="round"></circle>
      </svg>
      <span style="position:absolute;font-size:11px;font-weight:900;color:var(--text);">${calPct}%</span>
    </div>
  </article>`;
}

function frequentMealsTray(ar){
  const allEntries = (Array.isArray(state.foodEntries)?state.foodEntries:Object.values(state.foodEntries||{}).flat()).slice(0, 100);
  const freqMap = {};
  allEntries.forEach(e => {
    const text = String(e.food_name||e.text||e.description||"").trim();
    if(text.length >= 3 && text.length <= 70) {
      freqMap[text] = (freqMap[text] || 0) + 1;
    }
  });
  const topMeals = Object.entries(freqMap).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([text])=>text);
  if(!topMeals.length) return "";
  return `<div class="frequent-meals-tray" style="margin-bottom:8px;">
    <small style="display:block;color:var(--muted);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">${ar?"وجبات سابقة سريعة":"QUICK RECENT MEALS"}</small>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;">
      ${topMeals.map(meal=>`<button class="quick-chip-btn" type="button" data-quick-meal="${esc(meal)}" style="padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(201,255,61,.06);color:var(--text);font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer;">+ ${esc(meal)}</button>`).join("")}
    </div>
  </div>`;
}

function renderNutrition(){
  stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="nutrition";state.activeTab="food";state.foodMealType=state.foodMealType||autoMealType();persistDebounced();updatePrimaryTabs();const ar=state.lang==="ar",profile=foodProfile(),entries=todayFoodEntries(),totals=foodTotals(entries),water=Number(state.water[isoDay()])||0,note=state.foodNote||"";
  app.innerHTML=REP_SAFE_DOM.sanitize(`<section class="recovery-head module-head food-head"><p class="eyebrow">${ar?"متتبع الطعام":"FOOD TRACKER"}</p><h1>${ar?"اكتب ما أكلت.":"Write what you ate."}</h1><p>${ar?"بنفس طريقة بوت تتبع الطعام: اكتب ملاحظة أو أضف صورة أو امسح باركود، راجع التقدير ثم احفظه.":"Just like your Food Tracking bot: add a note, photo, voice description, or barcode; review the estimate; then save."}</p><span class="guide-version">${ar?"تقديرات التغذية ليست نصيحة طبية":"Nutrition values are estimates, not medical advice"}</span><p class="integration-disclosure">${ar?"عند استخدام التحليل، يُرسل الوصف أو الصورة إلى Google Gemini. ولا تُرسل الوجبة إلى Notion حتى تضغط حفظ.":"When analysis is used, the description or image is sent to Google Gemini. The meal is not sent to Notion until you save it."}</p></section><section class="food-profile"><div><small>${ar?"ملف اليوم":"TODAY'S PROFILE"}</small><strong>${ar?({gym:"يوم تدريب",active:"يوم نشاط",flex:"يوم مرن"}[profile.cycleType]||profile.label):profile.label}</strong><span style="display:inline-block;margin-top:4px;font-size:10px;font-weight:900;color:var(--orange);background:rgba(255,139,61,.12);padding:2px 7px;border-radius:6px;border:1px solid rgba(255,139,61,.25);">${profile.carbCycleBadge}</span></div><span>${entries.length} ${ar?"إدخالات":"entries"}<br>${syncStatusText()}</span></section>${reminderStrip("food")}${foodConnectionCard(ar)}<section class="macro-dashboard">${meter(ar?"السعرات":"Calories",totals.calories,profile.calories,"kcal","#ffd36a")}${meter(ar?"البروتين":"Protein",totals.protein_g,profile.protein,"g")}${meter(ar?"الكربوهيدرات":"Carbs",totals.carbs_g,profile.carbs,"g","var(--blue)")}${meter(ar?"الدهون":"Fat",totals.fat_g,profile.fat,"g","var(--orange)")}${macroDonutRing(totals,profile,ar)}</section><section class="meal-composer"><div class="meal-composer-head"><div><small>${ar?"وجبة جديدة":"NEW MEAL NOTE"}</small><h2>${ar?"ماذا أكلت؟":"What did you eat?"}</h2></div><span class="estimate-pill">AI ESTIMATE</span></div>${frequentMealsTray(ar)}<div class="quick-meal-chips" style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;">${(ar?[["🍳 4 بيضات + توست","4 بيضات وشريحتا توست بالزبدة"],["🥤 واي بروتين + كرياتين","سكوب واي بروتين و5 جم كرياتين في الماء"],["🍗 200 جم دجاج + أرز","200 جم صدر دجاج مشوي مع كوب ونصف أرز أبيض"],["🥣 شوفان + زبدة فول سوداني + موز","كوب شوفان، ملعقتا زبدة فول سوداني، وموزة"],["🥩 200 جم ستيك + بطاطس","200 جم ستيك لحم وبطاطس مشوية"]]:[["🍳 4 Eggs + 2 Toast","4 eggs and 2 toast slices with butter"],["🥤 Whey + Creatine","1 scoop whey protein and 5g creatine in water"],["🍗 200g Chicken + Rice","200g grilled chicken breast with 1.5 cup white rice"],["🥣 Oatmeal + PB + Banana","1 cup oatmeal, 2 tbsp peanut butter, 1 banana"],["🥩 200g Steak + Potatoes","200g beef steak and roasted potatoes"]]).map(([chip,desc])=>`<button class="quick-chip-btn" type="button" data-quick-meal="${esc(desc)}" style="padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.05);color:var(--text);font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer;">${esc(chip)}</button>`).join("")}</div><div class="meal-type-row">${[["Breakfast",ar?"فطور":"Breakfast"],["Lunch",ar?"غداء":"Lunch"],["Dinner",ar?"عشاء":"Dinner"],["Snack",ar?"سناك":"Snack"]].map(([type,label])=>`<button data-meal-type="${type}" class="${state.foodMealType===type?"is-active":""}">${label}</button>`).join("")}</div><textarea class="meal-note" data-food-note maxlength="1200" placeholder="${ar?"مثال: 180 جم دجاج مشوي، كوب أرز وسلطة...":"Example: 180g grilled chicken, one cup of rice, and salad…"}">${esc(note)}</textarea><div class="log-method-row">${[["Ingredients",ar?"مكونات":"Ingredients"],["Restaurant",ar?"مطعم":"Restaurant"]].map(([method,label])=>`<button data-log-method="${method}" class="${state.foodLogMethod===method?"is-active":""}">${label}</button>`).join("")}</div><div class="meal-tools"><label>▣ ${ar?"صورة":"Photo"}<input data-food-photo type="file" accept="image/*" capture="environment"></label><label>▤ ${ar?"معرض الصور":"Gallery"}<input data-food-gallery type="file" accept="image/*"></label><button data-food-voice>◉ ${ar?"صوت":"Voice"}</button><label>▥ ${ar?"باركود":"Barcode"}<input data-food-barcode type="file" accept="image/*" capture="environment"></label><button data-live-barcode type="button">🔍 ${ar?"مسح مباشر":"Live Scan"}</button></div><button class="analyze-meal" data-analyze-food ${state.foodBusy?"disabled":""}>${state.foodBusy?(ar?"جارٍ التحليل…":"Analyzing…"):(ar?"تحليل الملاحظة":"Analyze note")}</button><button class="analyze-meal" data-manual-food style="margin-top:7px;background:transparent;color:var(--muted);border:1px solid var(--line)">${ar?"حفظ كملاحظة بدون تحليل":"Save as note without AI"}</button><p class="composer-status ${state.foodError?"is-error":""}" data-food-status>${esc(state.foodStatus||"")}</p>${foodRetryControl(ar)}</section>${foodDraftCard()}${mealTemplatesSection(ar)}<div class="food-section-head"><h2>${ar?"متتبعات اليوم":"Today's trackers"}</h2></div>${supplementsCard(ar)}${weightTrackerCard(ar)}${waterTrackerCard(water,profile.water,ar)}<div class="food-section-head"><h2>${ar?"ملاحظات اليوم":"Today's notes"}</h2><span>${entries.length} ${ar?"وجبات":"meals"}</span></div><section class="food-log">${entries.length?entries.map(foodEntryCard).join(""):`<div class="food-empty">${ar?"لا توجد وجبات مسجلة اليوم. اكتب أول ملاحظة طعام في الأعلى.":"No meals logged today. Write your first food note above."}</div>`}</section>`);
  document.querySelector(".food-connect")?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(nutritionPlanNote()));const foodHeadings=[...document.querySelectorAll(".food-section-head h2")];if(foodHeadings.length)foodHeadings.at(-1).textContent=ar?"وجبات اليوم":"Food entries today";
  bindFoodTracker();
}
function bindFoodTracker(){const note=document.querySelector("[data-food-note]");note.oninput=e=>{state.foodNote=e.target.value;if(state.foodPendingPayload){state.foodPendingPayload=null;document.querySelector("[data-retry-food]")?.remove();}persistDebounced();};document.querySelectorAll("[data-quick-meal]").forEach(button=>button.onclick=()=>{state.foodNote=button.dataset.quickMeal;analyzeFood({mode:"text",description:button.dataset.quickMeal});});document.querySelectorAll("[data-meal-type]").forEach(button=>button.onclick=()=>{state.foodMealType=button.dataset.mealType;persist();renderNutrition();});document.querySelectorAll("[data-log-method]").forEach(button=>button.onclick=()=>{state.foodLogMethod=button.dataset.logMethod;persist();renderNutrition();});document.querySelector("[data-analyze-food]").onclick=()=>analyzeFood({mode:state.foodLogMethod==="Restaurant"?"restaurant":"text",description:String(state.foodNote||"").trim()});document.querySelector("[data-manual-food]").onclick=()=>manualFoodDraft();document.querySelector("[data-food-photo]").onchange=e=>analyzeFoodImage(e.target.files?.[0],"photo");document.querySelector("[data-food-gallery]").onchange=e=>analyzeFoodImage(e.target.files?.[0],"photo");document.querySelector("[data-food-barcode]").onchange=e=>analyzeFoodImage(e.target.files?.[0],"barcode-image");document.querySelector("[data-live-barcode]")?.addEventListener("click",startLiveBarcodeScanner);document.querySelector("[data-food-voice]").onclick=startFoodVoice;document.querySelector("[data-food-pair-form]")?.addEventListener("submit",e=>{e.preventDefault();pairFromFood();});document.querySelector("[data-food-disconnect]")?.addEventListener("click",forgetPairingKey);document.querySelector("[data-retry-food]")?.addEventListener("click",()=>{const pending=state.foodPendingPayload;state.foodPendingPayload=null;if(pending)analyzeFood(pending);});document.querySelectorAll("[data-water-delta]").forEach(button=>button.onclick=()=>changeFoodWater(Number(button.dataset.waterDelta)));document.querySelector("[data-water-form]").onsubmit=e=>{e.preventDefault();applyCustomWater("add");};document.querySelector('[data-water-custom-action="set"]').onclick=()=>applyCustomWater("set");document.querySelector("[data-water-reset]").onclick=()=>setFoodWater(0);document.querySelector("[data-cancel-food]")?.addEventListener("click",()=>{state.foodDraft=null;renderNutrition();});document.querySelector("[data-save-food]")?.addEventListener("click",saveFoodDraft);document.querySelectorAll("[data-delete-food]").forEach(button=>button.onclick=()=>deleteFoodEntry(button.dataset.deleteFood));document.querySelectorAll("[data-save-template]").forEach(button=>button.onclick=()=>saveMealTemplate(button.dataset.saveTemplate));document.querySelectorAll("[data-use-template]").forEach(button=>button.onclick=()=>useMealTemplate(button.dataset.useTemplate));document.querySelectorAll("[data-delete-template]").forEach(button=>button.onclick=()=>deleteMealTemplate(button.dataset.deleteTemplate));document.querySelector("[data-new-template]")?.addEventListener("click",()=>{state.newTemplateOpen=!state.newTemplateOpen;renderNutrition();});document.querySelector("[data-cancel-template]")?.addEventListener("click",()=>{state.newTemplateOpen=false;renderNutrition();});document.querySelector("[data-template-form]")?.addEventListener("submit",e=>{e.preventDefault();createMealTemplateManual();});document.querySelectorAll("[data-daily-key]").forEach(el=>el.onchange=()=>{if(el.checked&&navigator.vibrate)navigator.vibrate(30);const b=dailyBucket("nutrition");b.checked[el.dataset.dailyKey]=el.checked;queueNutritionSummary();persist();renderNutrition();});document.querySelector("[data-weight-form]").onsubmit=e=>{e.preventDefault();const input=document.querySelector("[data-weight-input]"),value=Number(input.value);if(!Number.isFinite(value)||value<30||value>300){input.setCustomValidity(state.lang==="ar"?"أدخل وزناً بين 30 و300 كجم.":"Enter a weight from 30 to 300 kg.");input.reportValidity();return;}input.setCustomValidity("");saveBodyWeight(value);renderNutrition();};document.querySelectorAll("[data-delete-weight]").forEach(button=>button.onclick=()=>{deleteBodyWeight(button.dataset.deleteWeight);renderNutrition();});document.querySelectorAll("[data-reminder-tab]").forEach(button=>button.onclick=()=>setPrimaryTab(button.dataset.reminderTab));document.querySelector("[data-reminder-toggle]")?.addEventListener("click",e=>{const t=e.currentTarget.dataset.reminderToggle;state.reminderExpanded[t]=!state.reminderExpanded[t];renderNutrition();});updateSyncPanel();}

async function startLiveBarcodeScanner(){
  if(window.REP_BARCODE_SCANNER?.openScannerModal){
    window.REP_BARCODE_SCANNER.openScannerModal(item => {
      state.foodDraft = {
        ...item,
        mealType: state.foodMealType || "Snack",
        logMethod: "Barcode"
      };
      state.foodStatus = state.lang==="ar" ? "تم جلب بيانات المنتج بالباركود. راجع ثم احفظ." : "Product nutrition loaded via barcode. Confirm portions.";
      persist();
      renderNutrition();
    });
    return;
  }
  const ar=state.lang==="ar";
  if(!navigator.mediaDevices?.getUserMedia){showToast(ar?"الكاميرا غير متاحة في هذا المتصفح.":"Camera is not available.");return;}
  const overlay=document.createElement("div");
  overlay.className="barcode-scanner-overlay";
  overlay.innerHTML=REP_SAFE_DOM.sanitize(`<div class="barcode-video-box"><video autoplay playsinline muted></video><div class="barcode-reticle"></div></div><p style="color:#fff;margin-top:14px;font-size:13px;">${ar?"وجّه الكاميرا نحو الباركود":"Point camera at food barcode"}</p><button class="quiet" data-close-barcode style="margin-top:10px;color:#fff;padding:8px 16px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">${ar?"إلغاء":"Cancel"}</button>`);
  document.body.appendChild(overlay);
  let stream=null,scanInterval=null;
  const video=overlay.querySelector("video");
  const close=()=>{if(stream)stream.getTracks().forEach(t=>t.stop());if(scanInterval)clearInterval(scanInterval);overlay.remove();};
  overlay.querySelector("[data-close-barcode]").onclick=close;
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject=stream;await video.play();
  }catch{showToast(ar?"تعذر فتح الكاميرا.":"Could not access camera.");close();return;}
  let barcodeDetector=null;
  if("BarcodeDetector" in window){try{barcodeDetector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","qr_code"]});}catch{}}
  scanInterval=setInterval(async()=>{
    try{
      let barcodeValue=null;
      if(barcodeDetector){const barcodes=await barcodeDetector.detect(video);if(barcodes&&barcodes.length>0)barcodeValue=barcodes[0].rawValue;}
      if(barcodeValue){
        close();
        showToast(ar?`تم العثور على باركود: ${barcodeValue}`:`Barcode detected: ${barcodeValue}`);
        state.foodNote=`Barcode: ${barcodeValue}`;
        state.foodLogMethod="Barcode";
        analyzeFood({mode:"text",description:`Barcode ${barcodeValue}`});
      }
    }catch{}
  },250);
}
function manualFoodDraft(){const rawNote=String(state.foodNote||"").trim();if(!rawNote){state.foodStatus=state.lang==="ar"?"اكتب ملاحظة الوجبة أولاً.":"Write a meal note first.";state.foodError=true;renderNutrition();return;}state.foodPendingPayload=null;state.foodDraft={food_name:rawNote,portion_size:"Not specified",calories:0,protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sugar_g:0,sodium_mg:0,estimated_weight_g:0,confidence:"Manual",confidence_pct:100,notes:"Saved without AI analysis.",recognizable:true,source:"Manual note",rawNote,mealType:state.foodMealType,logMethod:"Ingredients"};state.foodStatus="";state.foodError=false;renderNutrition();}
async function analyzeFood(payload){const rawNote=String(payload.description||state.foodNote||"").trim();if(payload.mode!=="photo"&&payload.mode!=="barcode-image"&&!rawNote){state.foodStatus=state.lang==="ar"?"اكتب وصف الوجبة أولاً.":"Describe the meal first.";state.foodError=true;renderNutrition();return;}if((!navigator.onLine||!repAuth?.isPaired?.())&&payload.mode!=="photo"&&payload.mode!=="barcode-image"&&window.REP_OFFLINE_NUTRITION){const offlineEst=window.REP_OFFLINE_NUTRITION.estimate(rawNote);state.foodDraft={...offlineEst,rawNote:rawNote||offlineEst.food_name,mealType:state.foodMealType,logMethod:payload.mode==="text"&&state.foodLogMethod==="Voice"?"Voice":(state.foodLogMethod||"Ingredients")};state.foodStatus=state.lang==="ar"?"تم التقدير محلياً (بدون إنترنت). راجع الحصص ثم احفظ.":"Estimated locally offline. Review portions, then confirm.";state.foodError=false;state.foodBusy=false;persist();renderNutrition();return;}const key=localStorage.getItem(syncKeyStorage);if(!key){state.foodPendingPayload=payload;state.foodStatus=state.lang==="ar"?"اتصل مرة واحدة أدناه وسيستمر التحليل تلقائياً.":"Connect once below and this analysis will continue automatically.";state.foodError=false;renderNutrition();setTimeout(()=>document.querySelector("[data-food-pair-key]")?.focus(),0);return;}state.foodPendingPayload=null;state.pairMessage="";state.foodBusy=true;state.foodError=false;state.foodStatus=state.lang==="ar"?"جارٍ تقدير القيم الغذائية…":"Estimating nutrition…";renderNutrition();try{const response=await repAuth.fetch("/api/food/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=Error(data.error||`Analysis failed (${response.status})`);error.auth=response.status===401;throw error;}if(data.nutrition?.recognizable===false)throw Error(data.nutrition.notes||"Food was not recognizable.");state.foodDraft={...data.nutrition,rawNote:rawNote||data.nutrition.food_name,mealType:state.foodMealType,logMethod:payload.mode==="text"&&state.foodLogMethod==="Voice"?"Voice":(data.logMethod||state.foodLogMethod)};state.foodStatus="";}catch(error){if(payload.mode!=="photo"&&payload.mode!=="barcode-image"&&window.REP_OFFLINE_NUTRITION){const offlineEst=window.REP_OFFLINE_NUTRITION.estimate(rawNote);state.foodDraft={...offlineEst,rawNote:rawNote||offlineEst.food_name,mealType:state.foodMealType,logMethod:payload.mode==="text"&&state.foodLogMethod==="Voice"?"Voice":(state.foodLogMethod||"Ingredients")};state.foodStatus=state.lang==="ar"?"تعذر الاتصال بالسيرفر. تم التقدير محلياً على جهازك.":"Server unreachable. Estimated locally on your device.";state.foodError=false;}else{state.foodPendingPayload=payload;state.foodError=true;if(error.auth){repAuth.clear();state.syncState="auth";state.pairMessage=state.lang==="ar"?"انتهى اقتران الجهاز. أعد الاتصال.":"Device pairing expired. Reconnect.";state.foodStatus=state.lang==="ar"?"أعد الاتصال أدناه وسيستمر التحليل.":"Reconnect below and the analysis will continue.";}else state.foodStatus=!navigator.onLine?(state.lang==="ar"?"أنت غير متصل. تم حفظ الملاحظة؛ أعد المحاولة بعد الاتصال.":"You're offline. Your note is saved; reconnect and tap Retry."):String(error.message||error);}}finally{state.foodBusy=false;persist();renderNutrition();}}
async function prepareFoodImage(file){if(!file)throw Error("No image selected.");if(file.size>20*1024*1024)throw Error("Choose an image under 20 MB.");const source=window.createImageBitmap?await createImageBitmap(file):await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("This image could not be opened."));};img.src=url;}),width=source.width||source.naturalWidth,height=source.height||source.naturalHeight,scale=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);source.close?.();return {image:canvas.toDataURL("image/jpeg",.82).split(",")[1],mimeType:"image/jpeg"};}
async function analyzeFoodImage(file,mode){try{const image=await prepareFoodImage(file);state.foodLogMethod=mode==="photo"?"Photo":"Barcode";await analyzeFood({mode,...image,description:String(state.foodNote||"").trim()});}catch(error){state.foodError=true;state.foodStatus=String(error.message||error);renderNutrition();}}
function startFoodVoice(){const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){state.foodStatus=state.lang==="ar"?"الإملاء الصوتي غير متاح في هذا المتصفح. استخدم ميكروفون لوحة المفاتيح.":"Voice dictation is unavailable here. Use the microphone on your keyboard.";state.foodError=true;renderNutrition();return;}const recognition=new SpeechRecognition();recognition.lang=state.lang==="ar"?"ar-EG":"en-US";recognition.interimResults=false;recognition.maxAlternatives=1;state.foodStatus=state.lang==="ar"?"أتحدث الآن…":"Listening…";state.foodError=false;document.querySelector("[data-food-voice]")?.classList.add("is-listening");recognition.onresult=e=>{const text=e.results[0][0].transcript;state.foodNote=text;state.foodLogMethod="Voice";state.foodStatus=state.lang==="ar"?"تم الاستماع. جارٍ التحليل…":"Transcribed. Analyzing…";renderNutrition();analyzeFood({mode:"text",description:text});};recognition.onerror=e=>{state.foodStatus=`Voice: ${e.error}`;state.foodError=true;renderNutrition();};recognition.onend=()=>document.querySelector("[data-food-voice]")?.classList.remove("is-listening");recognition.start();}
function saveFoodDraft(){const d=state.foodDraft;if(!d)return;document.querySelectorAll("[data-food-text]").forEach(input=>d[input.dataset.foodText]=String(input.value||"").trim());document.querySelectorAll("[data-food-macro]").forEach(input=>d[input.dataset.foodMacro]=Math.max(0,Number(input.value)||0));const entry={...d,id:`food-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:new Date().toISOString(),mealType:d.mealType||state.foodMealType,logMethod:d.logMethod||state.foodLogMethod,rawNote:d.rawNote||state.foodNote||d.food_name};state.foodEntries.unshift(entry);state.foodEntries=state.foodEntries.slice(0,400);state.foodDraft=null;state.foodPendingPayload=null;state.foodNote="";state.foodStatus=state.lang==="ar"?"تم حفظ الوجبة وإضافتها إلى قائمة مزامنة Notion.":"Meal saved and queued for Notion.";queueHealth("food",entry);queueNutritionSummary();persist();renderNutrition();}
function queueNutritionSummary(){const p=foodProfile(),entries=todayFoodEntries(),totals=foodTotals(entries),water=Number(state.water[isoDay()])||0,completion=Math.round((Math.min(totals.calories/p.calories,1)+Math.min(totals.protein_g/p.protein,1)+Math.min(water/p.water,1))/3*100);queueHealth("nutrition",{date:isoDay(),plan:p.label,caloriesTarget:p.calories,proteinTarget:p.protein,waterTarget:p.water/1000,mealsComplete:entries.length,mealsTotal:entries.length,hydrationComplete:water>=p.water,supplementsComplete:supplementsAllComplete(),weightKg:todayWeighIn()?.kg,completion,notes:`Logged ${Math.round(totals.calories)} kcal · P ${Math.round(totals.protein_g)}g · C ${Math.round(totals.carbs_g)}g · F ${Math.round(totals.fat_g)}g · Water ${water}ml`});}
function setFoodWater(amount){const next=Math.max(0,Math.min(Math.round(Number(amount)||0),20000));state.water[isoDay()]=next;queueNutritionSummary();persist();renderNutrition();}
function changeFoodWater(delta){setFoodWater((Number(state.water[isoDay()])||0)+(Number(delta)||0));}
function applyCustomWater(mode){const input=document.querySelector("[data-water-custom]"),amount=Number(input?.value);if(!input||!Number.isFinite(amount)||amount<=0||amount>20000){input?.setCustomValidity(state.lang==="ar"?"أدخل كمية بين 1 و20000 مل.":"Enter an amount from 1 to 20,000 ml.");input?.reportValidity();return;}input.setCustomValidity("");setFoodWater(mode==="set"?amount:(Number(state.water[isoDay()])||0)+amount);}
function deleteFoodEntry(id){state.foodEntries=state.foodEntries.filter(entry=>entry.id!==id);queueNutritionSummary();persist();renderNutrition();}
function renderHygiene(){
  stopSessionClock();document.body.classList.remove("workout-mode");state.view="hygiene";state.activeTab="care";persistDebounced();updatePrimaryTabs();const ar=state.lang==="ar",g=REP_HEALTH_GUIDE.hygiene,b=dailyBucket("hygiene"),day=currentDay(),hair=g.hair[day],training=["Sunday","Monday","Tuesday","Wednesday","Thursday"].includes(day),sections=[...g.morning.map((x,i)=>["morning",i,x]),...g.evening.map((x,i)=>["evening",i,x]),...hair.map((x,i)=>["hair",i,x]),...(training?g.postWorkout.map((x,i)=>["post",i,x]):[]),...(training?g.afterWork.map((x,i)=>["after",i,x]):[])],done=sections.filter(([p,i])=>b.checked[`${p}-${i}`]).length,percent=Math.round(done/sections.length*100);
  const complete=p=>{const group=sections.filter(x=>x[0]===p);return group.length>0&&group.every(([,i])=>b.checked[`${p}-${i}`]);};
  app.innerHTML=REP_SAFE_DOM.sanitize(`${moduleHeader(ar?"العناية اليومية":"DAILY CARE",ar?"امسح. نفّذ. أكمل.":"Scan. Do. Done.",ar?"روتين الصباح والمساء وما بعد التمرين مع تعليمات الشعر حسب اليوم.":"Morning, evening, post-workout, and the correct hair routine for today.")}
  ${reminderStrip("care")}
  <button class="care-plan-button" data-view-care-plan>${ar?"☰ عرض خطة العناية الكاملة":"☰ View full care plan"}</button>
  <section class="nonneg-grid">${g.nonNegotiables.map((x,i)=>`<div class="${(i===0&&b.checked["morning-0"])||(i===1&&b.checked["evening-1"])||(i===2&&b.checked["morning-3"]&&b.checked["evening-3"])||(i===3&&b.checked["post-0"])?"done":""}"><span>${i+1}</span><strong>${esc(x)}</strong></div>`).join("")}</section>
  <section class="module-progress">${miniRing(percent,"var(--acid)",40,5)}<strong>${percent}% ${ar?"اليوم":"today"}</strong></section>
  <section class="module-card"><div class="module-card-head"><div><small>${ar?"كل يوم":"EVERY DAY"}</small><h2>${ar?"الصباح":"Morning"}</h2></div><span>${complete("morning")?"✓":""}</span></div>${checklist(g.morning,"morning",b)}</section>
  <section class="module-card"><div class="module-card-head"><div><small>${ar?"الأهم":"MOST IMPORTANT"}</small><h2>${ar?"المساء":"Evening"}</h2></div><span>${complete("evening")?"✓":""}</span></div>${checklist(g.evening,"evening",b)}</section>
  ${training?`<section class="module-card accent-card"><div class="module-card-head"><div><small>30-MINUTE RULE</small><h2>${ar?"بعد التمرين":"Post-workout"}</h2></div><span>${complete("post")?"✓":""}</span></div>${checklist(g.postWorkout,"post",b)}</section>`:""}
  ${training?`<section class="module-card"><div class="module-card-head"><div><small>~7:15 PM</small><h2>${ar?"بعد العمل":"After work"}</h2></div><span>${complete("after")?"✓":""}</span></div>${checklist(g.afterWork,"after",b)}</section>`:""}
  <section class="module-card"><div class="module-card-head"><div><small>${esc(day.toUpperCase())}</small><h2>${ar?"روتين الشعر":"Hair routine"}</h2></div><span>${complete("hair")?"✓":""}</span></div>${checklist(hair,"hair",b)}<details class="cue-details"><summary>${ar?"قواعد الشعر الصارمة":"Strict hair rules"}</summary><div class="cue-body"><ul>${g.strictHairRules.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></details></section>
  <section class="module-card"><label class="notes-label">${ar?"ملاحظات اليوم":"Today's notes"}<textarea data-daily-notes maxlength="300">${esc(b.notes||"")}</textarea></label><button class="module-save" data-save-daily>${ar?"حفظ ومزامنة اليوم":"Save & sync today"}</button></section>`);
  bindDaily("hygiene",renderHygiene);document.querySelector("[data-save-daily]").onclick=()=>{queueHealth("hygiene",{date:isoDay(),morningComplete:complete("morning"),eveningComplete:complete("evening"),postWorkoutComplete:training?complete("post"):false,hairRoutineComplete:complete("hair"),spf:Boolean(b.checked["morning-0"]),floss:Boolean(b.checked["evening-1"]),beardOil:Boolean(b.checked["morning-3"]&&b.checked["evening-3"]),showerWithin30m:Boolean(b.checked["post-0"]),completion:percent,notes:b.notes||""});state.syncState="idle";renderHygiene();};
  document.querySelector("[data-view-care-plan]").onclick=showCarePlan;
  document.querySelectorAll("[data-reminder-tab]").forEach(button=>button.onclick=()=>setPrimaryTab(button.dataset.reminderTab));
  document.querySelector("[data-reminder-toggle]")?.addEventListener("click",e=>{const t=e.currentTarget.dataset.reminderToggle;state.reminderExpanded[t]=!state.reminderExpanded[t];renderHygiene();});
}

function showCarePlan(){
  if(document.querySelector(".care-plan-panel"))return;
  const ar=state.lang==="ar",g=REP_HEALTH_GUIDE.hygiene,today=currentDay();
  const list=items=>`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  const box=document.createElement("div");box.className="exit-confirm care-plan-panel";
  box.innerHTML=REP_SAFE_DOM.sanitize(`<strong>${ar?"خطة العناية الكاملة":"Full care plan"}</strong>
    <div class="care-plan-section"><h3>${ar?"غير قابل للتفاوض":"Non-negotiables"}</h3>${list(g.nonNegotiables)}</div>
    <div class="care-plan-section"><h3>${ar?"الصباح":"Morning"}</h3>${list(g.morning)}</div>
    <div class="care-plan-section"><h3>${ar?"المساء":"Evening"}</h3>${list(g.evening)}</div>
    <div class="care-plan-section"><h3>${ar?"بعد التمرين":"Post-workout"}</h3>${list(g.postWorkout)}</div>
    <div class="care-plan-section"><h3>${ar?"بعد العمل":"After work"}</h3>${list(g.afterWork)}</div>
    <div class="care-plan-section"><h3>${ar?"روتين الشعر الأسبوعي":"Weekly hair routine"}</h3>${Object.entries(g.hair).map(([day,items])=>`<div class="care-plan-day${day===today?" is-today":""}"><small>${esc(day)}${day===today?(ar?" · اليوم":" · today"):""}</small>${list(items)}</div>`).join("")}</div>
    <div class="care-plan-section"><h3>${ar?"قواعد الشعر الصارمة":"Strict hair rules"}</h3>${list(g.strictHairRules)}</div>
    <div class="care-plan-section"><h3>${ar?"أسبوعياً":"Weekly"}</h3>${list(g.weekly)}</div>
    <div class="care-plan-section"><h3>${ar?"شهرياً / مستمر":"Monthly / ongoing"}</h3>${list(g.monthly)}</div>
    <button data-close-care-plan>${ar?"إغلاق":"Close"}</button>`);
  document.body.appendChild(box);
  box.querySelector("[data-close-care-plan]").onclick=()=>box.remove();
}
function showLogActivity(presetType){
  if(document.querySelector(".activity-panel"))return;
  const ar=state.lang==="ar",defaultMinutes=60,defaultType=ACTIVITY_TYPES.some(([id])=>id===presetType)?presetType:ACTIVITY_TYPES[0][0];
  const box=document.createElement("div");box.className="exit-confirm activity-panel";
  box.innerHTML=REP_SAFE_DOM.sanitize(`<strong>${ar?"تسجيل نشاط":"Log an activity"}</strong>
    <p class="activity-hint">${ar?"للرياضات غير المنظمة مثل البادل وكرة القدم — مدة وسعرات محروقة من ساعة أبل، لا قائمة تمارين موجهة.":"For unstructured sports like padel and football — duration and calories burned from your Apple Watch, not a guided exercise list."}</p>
    <div class="activity-types">${ACTIVITY_TYPES.map(([id,label])=>`<button data-activity-type="${id}" class="${id===defaultType?"is-active":""}">${ar?label.ar:label.en}</button>`).join("")}</div>
    <input class="activity-custom" data-activity-custom type="text" maxlength="40" placeholder="${ar?"اسم النشاط":"Activity name"}" style="display:none">
    <div class="activity-form-grid"><label>${ar?"المدة (دقيقة)":"Duration (min)"}<input type="number" data-activity-minutes min="1" max="300" step="5" value="${defaultMinutes}" inputmode="numeric"></label><label>${ar?"السعرات النشطة من ساعة أبل":"Apple Watch Active Calories"}<input type="number" data-activity-calories min="0" max="2000" step="5" value="${estimateCalories(defaultType,defaultMinutes*60)}" inputmode="numeric"></label></div>
    <p class="activity-hint">${ar?"استخدم السعرات النشطة، وليس إجمالي السعرات، من ملخص تمرين ساعة أبل.":"Use Active Calories—not Total Calories—from the Apple Watch workout summary."}</p>
    <textarea class="activity-notes" data-activity-notes maxlength="200" placeholder="${ar?"ملاحظات اختيارية":"Optional notes"}"></textarea>
    <button data-save-activity>${ar?"حفظ النشاط":"Save activity"}</button>
    <button class="quiet" data-close-activity>${ar?"إلغاء":"Cancel"}</button>`);
  document.body.appendChild(box);
  let selected=defaultType;
  const minutesInput=box.querySelector("[data-activity-minutes]"),caloriesInput=box.querySelector("[data-activity-calories]");
  box.querySelectorAll("[data-activity-type]").forEach(button=>button.onclick=()=>{
    selected=button.dataset.activityType;
    box.querySelectorAll("[data-activity-type]").forEach(b=>b.classList.toggle("is-active",b===button));
    box.querySelector("[data-activity-custom]").style.display=selected==="other"?"block":"none";
    caloriesInput.value=estimateCalories(selected,Math.max(1,Number(minutesInput.value)||defaultMinutes)*60);
  });
  box.querySelector("[data-close-activity]").onclick=()=>box.remove();
  box.querySelector("[data-save-activity]").onclick=()=>{
    const minutes=minutesInput.value,calories=caloriesInput.value,notes=box.querySelector("[data-activity-notes]").value,custom=box.querySelector("[data-activity-custom]").value;
    if(logActivity(selected,custom,minutes,calories,notes)){
      if(navigator.vibrate)navigator.vibrate(30);
      box.remove();
      if(state.view==="player")renderExercise();else if(state.view==="history")renderHistory();else renderHome();
    }
  };
}
function renderBadDay(){const ar=state.lang==="ar",gate=recoveryGate();state.view="badDay";state.activeTab="train";persist();updatePrimaryTabs();app.innerHTML=REP_SAFE_DOM.sanitize(`${moduleHeader(ar?"خطة اليوم الصعب":"BAD DAY MODE",ar?"احمِ الاستمرارية.":"Protect the streak.",ar?"اختر أصغر نسخة تستطيع تنفيذها بأمان. خطتك الأصلية لن تتغير.":"Choose the smallest version you can do safely. Your normal program stays untouched.")}${gate.hold?`<section class="decision-card hold"><div><small>${ar?"بوابة الاستشفاء":"RECOVERY GATE"}</small><h2>${ar?"اليوم الخفيف هو الاختيار الصحيح":"Light is the correct call today"}</h2><p>${gate.flags} ${ar?"علامات خطر":"red flags"}</p></div></section>`:""}<section class="fallback-grid"><button data-fallback="bad"><span>01</span><small>5–7 MIN</small><h2>${ar?"الحد الأدنى":"The floor"}</h2><p>${ar?"3 دقائق مشي في المكان + كيجل 3 × 10.":"3 minutes marching + Kegels 3 × 10."}</p><strong>${ar?"ابدأ الآن ←":"Start now →"}</strong></button><button data-fallback="gymLite"><span>02</span><small>25–30 MIN</small><h2>${ar?"جيم مختصر":"Reduced gym"}</h2><p>Leg Press · Chest Press · Seated Row</p><strong>${ar?"ابدأ الآن ←":"Start now →"}</strong></button><button data-active-recovery><span>03</span><small>5 MIN</small><h2>${ar?"استشفاء فقط":"Recovery only"}</h2><p>${ar?"الرجلان على الحائط وتنفس بطيء.":"Legs up the wall with slow breathing."}</p><strong>${ar?"ابدأ المؤقت ←":"Start timer →"}</strong></button></section>`);document.querySelectorAll("[data-fallback]").forEach(b=>b.onclick=()=>startSession(b.dataset.fallback));document.querySelector("[data-active-recovery]").onclick=()=>startGuideTimer(ar?"الرجلان على الحائط":"Legs up the wall",300);}
function startGuideTimer(label,seconds){let remaining=seconds,paused=false;const overlay=document.createElement("div");overlay.className="timed-mode";overlay.innerHTML=REP_SAFE_DOM.sanitize(`<button class="timed-close" aria-label="${state.lang==="ar"?"إغلاق":"Close"}">×</button><p>${esc(label)}</p><strong data-guide-value>${formatClock(remaining)}</strong><span>${state.lang==="ar"?"تنفس ببطء وحافظ على الراحة":"BREATHE SLOWLY · STAY COMFORTABLE"}</span><div class="timed-progress"><i data-guide-progress></i></div><div class="timed-actions"><button data-guide-pause>${U().pause}</button><button data-guide-finish>${U().skip}</button></div>`);document.body.appendChild(overlay);const close=()=>{clearInterval(tick);overlay.remove();};overlay.querySelector(".timed-close").onclick=close;overlay.querySelector("[data-guide-finish]").onclick=()=>{signalEnd();close();};overlay.querySelector("[data-guide-pause]").onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?U().resume:U().pause;};const tick=setInterval(()=>{if(paused)return;remaining--;overlay.querySelector("[data-guide-value]").textContent=formatClock(Math.max(0,remaining));overlay.querySelector("[data-guide-progress]").style.width=`${Math.max(0,remaining/seconds*100)}%`;if(remaining<=0){signalEnd();close();}},1000);}

function clearRestPreview(){
  timerDock.classList.remove("has-next-preview");
  timerNextPreview.classList.add("is-hidden");
  timerNextPreview.setAttribute("aria-hidden","true");
  document.querySelector("#timerPreviewVisual").replaceChildren();
}

function renderRestPreview(){
  const session=sessions[state.session],item=session?.exercises[state.index],t=state.timer;
  const nextBase=item&&t&&t.set>=item.sets-1?session.exercises[state.index+1]:null;
  if(!nextBase){clearRestPreview();return;}
  const nextItem=currentItem(nextBase),ar=state.lang==="ar";
  document.querySelector("#timerPreviewVisual").innerHTML=REP_SAFE_DOM.sanitize(exerciseVisual(nextItem,{preview:true}));
  document.querySelector("#timerPreviewLabel").textContent=ar?"التالي":"UP NEXT";
  document.querySelector("#timerPreviewName").textContent=nextItem.name;
  document.querySelector("#timerPreviewMeta").textContent=`${nextItem.prescription} · ${nextItem.intensity}`;
  const nextNow=document.querySelector("#timerNextNow");
  nextNow.querySelector("span").textContent=ar?"ابدأ الآن":"Start now";
  nextNow.setAttribute("aria-label",ar?`ابدأ ${nextItem.name} الآن`:`Start ${nextItem.name} now`);
  timerNextPreview.classList.remove("is-hidden");
  timerNextPreview.setAttribute("aria-hidden","false");
  timerDock.classList.add("has-next-preview");
}

function cancelRestTimer({notify=false}={}){
  if(state.timer?.interval)clearInterval(state.timer.interval);
  state.timer=null;
  clearRestPreview();
  timerDock.classList.add("is-hidden");timerDock.setAttribute("inert","");
  document.body.classList.remove("rest-mode-active");
  if(notify)signalEnd();
  updateMediaSession("exercise");
}

function startTimer(seconds, setIndex) {
  cancelRestTimer();
  const now = Date.now();
  state.timer = { remaining: seconds, total: seconds, paused: false, set: setIndex, targetEndTime: now + seconds * 1000 };
  document.body.classList.add("rest-mode-active");
  timerDock.classList.remove("is-hidden"); timerDock.removeAttribute("inert");
  timerDock.querySelector(".timer-copy small").textContent = U().recovery; timerDock.querySelector(".timer-copy strong").textContent = U().restTitle; document.querySelector("#timerSkip").textContent = U().skip; document.querySelector("#timerPause").textContent = U().pause;
  document.querySelector("#timerAdd").setAttribute("aria-label", U().add15Seconds);
  renderRestPreview();
  updateMediaSession("rest", { set: setIndex, time: formatClock(seconds) });
  updateTimer();
  state.timer.interval = setInterval(() => {
    if (!state.timer) return;
    if (!state.timer.paused) {
      state.timer.remaining = Math.max(0, Math.ceil((state.timer.targetEndTime - Date.now()) / 1000));
      updateTimer();
      if (state.timer.remaining <= 0) finishTimer();
    } else {
      state.timer.targetEndTime = Date.now() + state.timer.remaining * 1000;
    }
  }, 500);
}
function updateTimer(){
  const t=state.timer;if(!t)return; const min=Math.floor(t.remaining/60),sec=String(t.remaining%60).padStart(2,"0");
  document.querySelector("#timerValue").textContent=`${min}:${sec}`; document.querySelector("#timerRing").style.setProperty("--progress",`${Math.max(0,t.remaining/t.total*100)}%`);
  const session=sessions[state.session],item=session?.exercises[state.index],hasAnotherSet=item&&t.set+1<item.sets;
  const nextItem=session?.exercises[state.index+1];
  document.querySelector("#timerNext").textContent=hasAnotherSet
    ? `${U().set} ${t.set+2} · ${currentItem(item).name}`
    : nextItem?`${state.lang==="ar"?"التالي":"Next"} · ${currentItem(nextItem).name}`:U().breatheReset;
  updateMediaSession("rest", {set: t.set, time: `${min}:${sec}`});
  if(!t.paused && (t.remaining === 3 || t.remaining === 2 || t.remaining === 1)){
    playCountdownBeep(520, 0.08);
    if(navigator.vibrate)navigator.vibrate(40);
  }
  if(window.REP_AUDIO_COACH?.announceRestCountdown) {
    window.REP_AUDIO_COACH.announceRestCountdown(t.remaining);
  }
}
function finishTimer(){
  if(!state.timer)return;const item=sessions[state.session]?.exercises[state.index],key=`${state.session}-${state.index}`,allDone=item&&(state.completed[key]||[]).length===item.sets,completedSession=state.session,completedIndex=state.index;
  cancelRestTimer({notify:true});
  if(allDone)setTimeout(()=>{
    if(state.view==="player"&&state.session===completedSession&&state.index===completedIndex)next();
  },800);else document.querySelector(`.set-button:not(.is-done)`)?.classList.add("is-next");
}
document.querySelector("#timerSkip").addEventListener("click",finishTimer);
document.querySelector("#timerNextNow").addEventListener("click",()=>{
  if(!state.timer||!timerDock.classList.contains("has-next-preview"))return;
  cancelRestTimer();
  next();
});
document.querySelector("#timerPause").addEventListener("click",()=>{
  if(!state.timer)return;
  state.timer.paused=!state.timer.paused;
  if(!state.timer.paused){state.timer.targetEndTime=Date.now()+state.timer.remaining*1000;}
  document.querySelector("#timerPause").textContent=state.timer.paused?U().resume:U().pause;
  updateTimer();
});
document.querySelector("#timerAdd").addEventListener("click",()=>{
  if(!state.timer)return;
  state.timer.remaining+=15;
  state.timer.total+=15;
  state.timer.targetEndTime=Date.now()+state.timer.remaining*1000;
  updateTimer();
});
document.querySelector("#homeButton").addEventListener("click",()=>setPrimaryTab("home"));
function closeTopMore(){
  const btn=document.querySelector("#topMoreButton"),menu=document.querySelector("#topMoreMenu");
  if(!btn||!menu||menu.hidden)return;
  menu.hidden=true;btn.setAttribute("aria-expanded","false");
}
document.querySelector("#topMoreButton")?.addEventListener("click",()=>{
  const btn=document.querySelector("#topMoreButton"),menu=document.querySelector("#topMoreMenu");
  const opening=menu.hidden;
  menu.hidden=!opening;btn.setAttribute("aria-expanded",String(opening));
});
document.querySelector("#topMoreMenu")?.addEventListener("click",e=>{if(e.target.closest("button"))closeTopMore();});
document.addEventListener("click",e=>{if(!e.target.closest("#topMoreButton")&&!e.target.closest("#topMoreMenu"))closeTopMore();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeTopMore();});
document.querySelector("#previewModeButton")?.addEventListener("click",togglePreviewMode);
document.querySelectorAll("[data-app-tab]").forEach(button=>button.addEventListener("click",()=>setPrimaryTab(button.dataset.appTab)));
document.querySelector("#soundButton").addEventListener("click",e=>{state.muted=!state.muted;e.currentTarget.setAttribute("aria-pressed",state.muted);e.currentTarget.textContent=state.muted?"×":"◖";persist();});
document.querySelector("#soundButton").textContent=state.muted?"×":"◖";
document.querySelector("#langButton").addEventListener("click",()=>{state.lang=state.lang==="en"?"ar":"en";document.documentElement.lang=state.lang;document.documentElement.dir=REP_I18N[state.lang].dir;document.querySelector("#langButton").textContent=U().language;persist();state.view==="recovery"?renderRecovery():state.view==="player"?renderExercise():state.view==="history"?renderHistory():state.view==="review"?renderReview():state.view==="nutrition"?renderNutrition():state.view==="hygiene"?renderHygiene():state.view==="care"?renderCareHub():state.view==="badDay"?renderBadDay():state.view==="preview"?showSessionPreview(state.previewSession):state.view==="insights"?renderInsights():state.view==="vitals"?renderVitals():state.view==="settings"&&window.renderRepSettings?window.renderRepSettings():state.view==="home-overview"?renderOverview():renderHome();renderQuickLog();network();});
document.querySelector("#langButton").textContent=U().language;
function showToast(message){
  document.querySelector(".toast")?.remove();
  const t=document.createElement("div");t.className="toast";t.textContent=message;
  document.body.appendChild(t);
  setTimeout(()=>{t.classList.add("is-leaving");setTimeout(()=>t.remove(),180);},2600);
}
document.querySelector("#wakeButton").addEventListener("click",toggleWakeLock);
if(!("wakeLock" in navigator)){
  const wb=document.querySelector("#wakeButton");
  wb.disabled=true;wb.style.opacity=".4";
  wb.title=state.lang==="ar"?"غير مدعوم في هذا المتصفح":"Not supported in this browser";
}
async function toggleWakeLock(){
  const button=document.querySelector("#wakeButton");
  if(state.wakeLock){await state.wakeLock.release();state.wakeLock=null;button.setAttribute("aria-pressed","false");button.classList.remove("is-active");return;}
  try{state.wakeLock=await navigator.wakeLock.request("screen");button.setAttribute("aria-pressed","true");button.classList.add("is-active");state.wakeLock.addEventListener("release",()=>{state.wakeLock=null;button.classList.remove("is-active");});}catch{showToast(state.lang==="ar"?"تعذّر إبقاء الشاشة مضاءة على هذا المتصفح.":"Couldn't keep the screen awake on this browser.");}
}
document.addEventListener("visibilitychange",async()=>{if(("wakeLock" in navigator) && document.visibilityState==="visible" && document.querySelector("#wakeButton")?.classList.contains("is-active") && !state.wakeLock)try{state.wakeLock=await navigator.wakeLock.request("screen");}catch{}});
let installPrompt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;});
async function installApp(){
  if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  const msg=state.lang==="ar"?"على iPhone: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية». على Android: افتح قائمة المتصفح ثم «تثبيت التطبيق».":"On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu, then Install app.";
  const box=document.createElement("div");box.className="install-help";box.innerHTML=REP_SAFE_DOM.sanitize(`<button aria-label="${state.lang==="ar"?"إغلاق":"Close"}">×</button><strong>${U().install}</strong><p>${msg}</p>`);document.body.appendChild(box);box.querySelector("button").onclick=()=>box.remove();
}
function network(){const el=document.querySelector("#networkStatus");el.classList.toggle("is-offline",!navigator.onLine);el.lastChild.textContent=` ${navigator.onLine?U().offlineReady:U().offlineMode}`;}
addEventListener("online",()=>{network();fetchPendingVitals();});addEventListener("offline",network);network();
// iOS home-screen PWAs check for a new service worker lazily (often only on a
// full relaunch), so shipping a fix and reopening the app the normal way
// frequently never surfaces the update banner below. Forcing an active
// registration.update() whenever the app is actually opened/foregrounded
// makes that check happen every time, not just on the browser's own schedule.
async function registerServiceWorker(){
  if(!("serviceWorker" in navigator)||!location.protocol.startsWith("http"))return;
  const reg=await navigator.serviceWorker.register(`./sw.js?v=${window.REP_BUILD_VERSION||"dev"}`);
  reg.addEventListener("updatefound",()=>{const worker=reg.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller){const bar=document.createElement("div");bar.className="update-bar";bar.innerHTML=REP_SAFE_DOM.sanitize(`<span>${U().updateReady}</span><button>${U().reload}</button>`);document.body.appendChild(bar);bar.querySelector("button").onclick=()=>location.reload();}});});
  reg.update().catch(()=>{});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")reg.update().catch(()=>{});});
  addEventListener("pageshow",()=>reg.update().catch(()=>{}));
}
if(document.readyState==="complete")registerServiceWorker().catch(()=>{});else addEventListener("load",()=>registerServiceWorker().catch(()=>{}),{once:true});
// One floating action reachable from any tab (except mid-workout, where it's
// hidden) for the three things that otherwise require navigating to a
// specific tab first. Each action reuses the exact same handlers a manual
// tap would hit - no parallel logging path.
function continuingSession(){return REP_TRAINING_SESSION.isResumableWorkout(state,sessions);}
function renderQuickLog(){
  const container=document.querySelector("#quickLog");if(!container)return;
  const ar=state.lang==="ar";
  container.innerHTML=REP_SAFE_DOM.sanitize(`<div class="quick-log-menu" id="quickLogMenu" hidden>
      <button type="button" data-quick-action="workout">${ICONS.dumbbell}<span>${continuingSession()?(ar?"متابعة التمرين":"Resume workout"):(ar?"ابدأ التمرين":"Start workout")}</span></button>
      <button type="button" data-quick-action="food"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg><span>${ar?"تسجيل وجبة":"Log a meal"}</span></button>
      <button type="button" data-quick-action="activity">${ICONS.pulse}<span>${ar?"تسجيل نشاط":"Log an activity"}</span></button>
    </div>
    <button type="button" class="quick-log-fab" id="quickLogFab" aria-haspopup="true" aria-expanded="false" aria-label="${ar?"إجراء سريع":"Quick log"}">${ICONS.plus}</button>`);
  const fab=container.querySelector("#quickLogFab"),menu=container.querySelector("#quickLogMenu");
  fab.addEventListener("click",()=>{
    const opening=menu.hidden;
    if(opening){
      menu.querySelector('[data-quick-action="workout"] span').textContent=continuingSession()?(ar?"متابعة التمرين":"Resume workout"):(ar?"ابدأ التمرين":"Start workout");
      menu.hidden=false;
      requestAnimationFrame(()=>menu.classList.add("is-open"));
    }else{
      closeQuickLog();
    }
    fab.setAttribute("aria-expanded",String(opening));fab.classList.toggle("is-open",opening);
  });
  menu.querySelectorAll("[data-quick-action]").forEach(button=>button.addEventListener("click",()=>{closeQuickLog();runQuickAction(button.dataset.quickAction);}));
  updateQuickLogVisibility();
}
function closeQuickLog(){
  const fab=document.querySelector("#quickLogFab"),menu=document.querySelector("#quickLogMenu");
  if(!fab||!menu||menu.hidden)return;
  menu.classList.remove("is-open");fab.setAttribute("aria-expanded","false");fab.classList.remove("is-open");
  setTimeout(()=>{menu.hidden=true;},180);
}
document.addEventListener("click",e=>{if(!e.target.closest("#quickLog"))closeQuickLog();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeQuickLog();});
// Collapsed at rest on a freshly-opened screen so it never sits on top of that
// screen's own primary CTA; the moment the user scrolls it's no longer at that
// fixed on-screen spot, so the FAB eases back in as a persistent quick action.
let quickLogTicking=false;
function updateQuickLogVisibility(){
  quickLogTicking=false;
  const container=document.querySelector("#quickLog");if(!container)return;
  const menu=container.querySelector("#quickLogMenu");
  if(menu&&!menu.hidden)return;
  container.classList.toggle("is-collapsed",window.scrollY<40);
}
window.addEventListener("scroll",()=>{if(!quickLogTicking){quickLogTicking=true;requestAnimationFrame(updateQuickLogVisibility);}},{passive:true});
function runQuickAction(action){
  if(action==="workout"){
    if(continuingSession()){startSession(state.session);return;}
    state.trainingView="today";
    setPrimaryTab("train");
    document.querySelector("[data-start-today]")?.click();
  }else if(action==="food"||action==="meal"){
    state.nutritionView="log";
    setPrimaryTab("food");
    document.querySelector("[data-food-note]")?.focus();
  }else if(action==="activity"){
    showLogActivity();
  }else if(action==="home"||action==="habits"){
    setPrimaryTab("home");
  }else if(action==="health"||action==="sleep"){
    setPrimaryTab("health");
    showLogActivity();
  }
}
function consumeQuickLaunch(){
  const action=new URLSearchParams(location.search).get("quick");
  if(!action)return;
  history.replaceState(null,"",location.pathname);
  runQuickAction(action);
}
// Always land on Home on a fresh app open, regardless of which tab was last
// active - that's the whole point of a dedicated landing screen. Mid-session
// tab switches (setPrimaryTab) still work normally and aren't affected. A
// manifest-shortcut launch (?quick=...) still lands here first, then
// immediately layers its action on top, same as a manual tap would.
renderOverview();
renderQuickLog();
consumeQuickLaunch();
if(navigator.onLine&&localStorage.getItem(syncKeyStorage))setTimeout(fetchPendingVitals,1200);
