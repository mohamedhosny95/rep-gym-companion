/* Universal Historical Data Importer for Rep Gym Companion.
   Supports Apple Health XML, Strong CSV, Hevy CSV, and MyFitnessPal exports.
   Completely local, private, and deterministic. */

(function(){
  function parseCsvRows(text){
    const lines = String(text||"").split(/\r?\n/).filter(line => line.trim().length > 0);
    if(lines.length < 2) return [];
    const parseLine = line => {
      const result = [];
      let cur = "", inQuotes = false;
      for(let i=0; i<line.length; i++){
        const char = line[i];
        if(char === '"'){
          if(inQuotes && line[i+1] === '"'){ cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if(char === ',' && !inQuotes){
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };
    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_()]+/g, ""));
    const rows = [];
    for(let i=1; i<lines.length; i++){
      const values = parseLine(lines[i]);
      if(values.length >= headers.length){
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
        rows.push(row);
      }
    }
    return rows;
  }

  function parseStrongCsv(text){
    const rows = parseCsvRows(text);
    if(!rows.length) return { workouts: [], totalSets: 0 };
    const byDateAndWorkout = new Map();
    for(const r of rows){
      const dateStr = r.date || r.createdat || "";
      const date = dateStr.includes("T") ? dateStr.split("T")[0] : (dateStr.split(" ")[0] || "");
      if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const workoutName = r.workoutname || "Workout";
      const exercise = r.exercisename || r.exercise || "Exercise";
      const set = Number(r.setorder || r.set || 1);
      let weight = Number(r.weight || r.weightkg || r.weightlbs || 0);
      const isLb = (r.weightunit || "").toLowerCase().includes("lb") || (r.weightlbs && !r.weightkg);
      if(isLb) weight = Math.round((weight / 2.2046226) * 10) / 10;
      const reps = Number(r.reps || 0);
      const rpe = Number(r.rpe || r.intensity || 0) || null;

      const key = `${date}|${workoutName}`;
      if(!byDateAndWorkout.has(key)){
        byDateAndWorkout.set(key, {
          id: `strong-${date}-${Math.random().toString(36).slice(2,7)}`,
          date: `${date}T10:00:00Z`,
          session: workoutName.toLowerCase().includes("cardio") ? "cardio" : "gym",
          entries: [],
          loads: {}
        });
      }
      const session = byDateAndWorkout.get(key);
      session.entries.push({ exercise, set, weight, reps, rpe });
    }
    const workouts = Array.from(byDateAndWorkout.values());
    return { workouts, totalSets: rows.length };
  }

  function parseHevyCsv(text){
    const rows = parseCsvRows(text);
    if(!rows.length) return { workouts: [], totalSets: 0 };
    const byDateAndWorkout = new Map();
    for(const r of rows){
      const dateStr = r.starttime || r.start_time || r.date || "";
      const date = dateStr.includes("T") ? dateStr.split("T")[0] : (dateStr.split(" ")[0] || "");
      if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const workoutName = r.title || r.workoutname || r.workout_name || "Gym Session";
      const exercise = r.exercisetitle || r.exercise_title || r.exercise || "Exercise";
      const set = Number(r.setindex || r.set_index || r.set || 1);
      let weight = Number(r.weightkg || r.weight_kg || r.weightlbs || r.weight_lbs || r.weight || 0);
      if((r.weightlbs || r.weight_lbs) && (!r.weightkg && !r.weight_kg)) weight = Math.round((weight / 2.2046226) * 10) / 10;
      const reps = Number(r.reps || 0);
      const rpe = Number(r.rpe || 0) || null;

      const key = `${date}|${workoutName}`;
      if(!byDateAndWorkout.has(key)){
        byDateAndWorkout.set(key, {
          id: `hevy-${date}-${Math.random().toString(36).slice(2,7)}`,
          date: `${date}T10:00:00Z`,
          session: "gym",
          entries: [],
          loads: {}
        });
      }
      byDateAndWorkout.get(key).entries.push({ exercise, set, weight, reps, rpe });
    }
    const workouts = Array.from(byDateAndWorkout.values());
    return { workouts, totalSets: rows.length };
  }

  function parseMfpCsv(text){
    const rows = parseCsvRows(text);
    if(!rows.length) return { foodEntries: [] };
    const foodEntries = [];
    for(const r of rows){
      const date = r.date || "";
      if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const meal = r.meal || "Meal";
      const name = r.foodname || r.food || `${meal} Entry`;
      const calories = Number(r.calories || 0);
      const protein_g = Number(r.proteing || r.protein || 0);
      const carbs_g = Number(r.carbohydratesg || r.carbohydrates || r.carbs || r.carbsg || 0);
      const fat_g = Number(r.fatg || r.fat || 0);
      const fiber_g = Number(r.fiberg || r.fiber || 0);

      foodEntries.push({
        id: `mfp-${date}-${Math.random().toString(36).slice(2,7)}`,
        date: `${date}T13:00:00Z`,
        food_name: name,
        portion_size: "1 serving",
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        sugar_g: 0,
        sodium_mg: 0,
        confidence: "Imported",
        confidence_pct: 100,
        source: "MyFitnessPal Import",
        mealType: meal,
        logMethod: "Import"
      });
    }
    return { foodEntries };
  }

  function parseAppleHealthXml(xmlText){
    const weights = [];
    const sleepLogs = [];
    const healthMetrics = {};
    const text = String(xmlText||"");

    const recordRegex = /<Record\s+([^>]+)\/?>/g;
    let match;
    while((match = recordRegex.exec(text)) !== null){
      const attrsStr = match[1];
      const getAttr = name => {
        const m = attrsStr.match(new RegExp(`${name}="([^"]+)"`));
        return m ? m[1] : null;
      };
      const type = getAttr("type");
      const value = getAttr("value");
      const startDate = getAttr("startDate") || "";
      const date = startDate.split(" ")[0] || startDate.split("T")[0];
      if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      if(type === "HKQuantityTypeIdentifierBodyMass" && value){
        const unit = getAttr("unit") || "kg";
        let kg = Number(value);
        if(unit.includes("lb")) kg = Math.round((kg / 2.2046226) * 10) / 10;
        weights.push({ week: date, date, kg: Math.round(kg*10)/10 });
      } else if(type === "HKCategoryTypeIdentifierSleepAnalysis"){
        const endDate = getAttr("endDate") || "";
        if(startDate && endDate){
          const t1 = new Date(startDate).getTime(), t2 = new Date(endDate).getTime();
          const hours = Math.round(((t2 - t1) / (1000 * 60 * 60)) * 10) / 10;
          if(hours >= 3 && hours <= 16){
            sleepLogs.push({ date, hours, bedtime: startDate, wake: endDate });
          }
        }
      } else if(type === "HKQuantityTypeIdentifierHeartRateVariabilitySDNN" && value){
        healthMetrics[date] = healthMetrics[date] || { date };
        healthMetrics[date].hrvSdnn = Math.round(Number(value));
      } else if(type === "HKQuantityTypeIdentifierRestingHeartRate" && value){
        healthMetrics[date] = healthMetrics[date] || { date };
        healthMetrics[date].restingHeartRate = Math.round(Number(value));
      }
    }
    return { weights, sleepLogs, healthMetrics };
  }

  function detectAndImport(content, state){
    const text = String(content||"").trim();
    if(text.startsWith("<?xml") || text.includes("<HealthData")){
      const result = parseAppleHealthXml(text);
      let count = 0;
      if(result.weights.length){
        state.bodyWeights = [...result.weights, ...(state.bodyWeights||[])].slice(0, 400);
        count += result.weights.length;
      }
      if(result.sleepLogs.length){
        state.sleepLogs = [...result.sleepLogs, ...(state.sleepLogs||[])].slice(0, 400);
        count += result.sleepLogs.length;
      }
      if(Object.keys(result.healthMetrics).length){
        state.healthMetrics = { ...(state.healthMetrics||{}), ...result.healthMetrics };
        count += Object.keys(result.healthMetrics).length;
      }
      return { format: "Apple Health XML", imported: count, message: `Imported ${count} health records from Apple Health.` };
    }

    const firstLine = text.split("\n")[0].toLowerCase();
    if(firstLine.includes("strong") || (firstLine.includes("workout name") && firstLine.includes("exercise name"))){
      const result = parseStrongCsv(text);
      if(result.workouts.length){
        state.history = [...result.workouts, ...(state.history||[])].slice(0, 400);
        return { format: "Strong CSV", imported: result.workouts.length, message: `Imported ${result.workouts.length} workouts (${result.totalSets} sets) from Strong.` };
      }
    }

    if(firstLine.includes("hevy") || (firstLine.includes("exercise") && (firstLine.includes("set") || firstLine.includes("weight")))){
      const result = parseHevyCsv(text);
      if(result.workouts.length){
        state.history = [...result.workouts, ...(state.history||[])].slice(0, 400);
        return { format: "Hevy CSV", imported: result.workouts.length, message: `Imported ${result.workouts.length} workouts (${result.totalSets} sets) from Hevy.` };
      }
    }

    if(firstLine.includes("calories") && (firstLine.includes("meal") || firstLine.includes("food"))){
      const result = parseMfpCsv(text);
      if(result.foodEntries.length){
        state.foodEntries = [...result.foodEntries, ...(state.foodEntries||[])].slice(0, 400);
        return { format: "MyFitnessPal CSV", imported: result.foodEntries.length, message: `Imported ${result.foodEntries.length} food logs from MyFitnessPal.` };
      }
    }

    return { format: "unknown", imported: 0, message: "Unrecognized file format. Please upload Apple Health XML, Strong CSV, Hevy CSV, or MyFitnessPal CSV." };
  }

  const importer = {
    parseStrongCsv,
    parseHevyCsv,
    parseMfpCsv,
    parseAppleHealthXml,
    detectAndImport
  };

  if(typeof window !== "undefined"){
    window.REP_DATA_IMPORTER = importer;
  }
  if(typeof globalThis !== "undefined"){
    globalThis.REP_DATA_IMPORTER = importer;
  }
})();
