/* Rep Offline Nutrition Intelligence v1.
   Deterministic on-device parser and macronutrient database for offline meal logging. */
globalThis.REP_OFFLINE_NUTRITION = (() => {
  const FOOD_DATABASE = [
    // --- Proteins ---
    {
      id: "chicken_breast",
      en: "Chicken breast",
      ar: "صدور دجاج",
      aliases: ["chicken breast", "chicken breasts", "chicken", "cooked chicken", "grilled chicken", "صدور دجاج", "صدر دجاج", "فراخ", "دجاج", "دجاج مشوي", "شيش طاووق"],
      unitWeightG: 150,
      per100g: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 }
    },
    {
      id: "chicken_thigh",
      en: "Chicken thigh",
      ar: "أوراك دجاج",
      aliases: ["chicken thigh", "chicken thighs", "أوراك دجاج", "ورك دجاج", "وراك"],
      unitWeightG: 150,
      per100g: { calories: 209, protein_g: 26, carbs_g: 0, fat_g: 10.9, fiber_g: 0, sugar_g: 0, sodium_mg: 84 }
    },
    {
      id: "egg",
      en: "Whole egg",
      ar: "بيض",
      aliases: ["egg", "eggs", "boiled egg", "fried egg", "scrambled egg", "omelette", "omelet", "بيض", "بيضة", "بيض مسلوق", "بيض مقلي", "أومليت"],
      unitWeightG: 50,
      per100g: { calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5, fiber_g: 0, sugar_g: 0.4, sodium_mg: 142 }
    },
    {
      id: "egg_white",
      en: "Egg white",
      ar: "بياض بيض",
      aliases: ["egg white", "egg whites", "بياض بيض", "بياض البيض"],
      unitWeightG: 33,
      per100g: { calories: 52, protein_g: 10.9, carbs_g: 0.7, fat_g: 0.2, fiber_g: 0, sugar_g: 0.7, sodium_mg: 166 }
    },
    {
      id: "beef_steak",
      en: "Beef steak",
      ar: "لحم بقري / ستيك",
      aliases: ["beef", "steak", "sirloin", "tenderloin", "beef steak", "لحم", "لحمة", "ستيك", "لحم بقري", "لحم مشوي"],
      unitWeightG: 180,
      per100g: { calories: 250, protein_g: 26, carbs_g: 0, fat_g: 15, fiber_g: 0, sugar_g: 0, sodium_mg: 60 }
    },
    {
      id: "ground_beef",
      en: "Ground beef (lean)",
      ar: "لحم مفروم قليل الدسم",
      aliases: ["ground beef", "minced beef", "beef mince", "minced meat", "لحم مفروم", "مفروم", "كفتة"],
      unitWeightG: 150,
      per100g: { calories: 215, protein_g: 26, carbs_g: 0, fat_g: 12, fiber_g: 0, sugar_g: 0, sodium_mg: 70 }
    },
    {
      id: "tuna",
      en: "Canned tuna (in water)",
      ar: "تونة بالماء",
      aliases: ["tuna", "canned tuna", "tuna in water", "تونة", "تونه", "علبة تونة"],
      unitWeightG: 140,
      per100g: { calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1, fiber_g: 0, sugar_g: 0, sodium_mg: 330 }
    },
    {
      id: "salmon",
      en: "Salmon fillet",
      ar: "سلمون",
      aliases: ["salmon", "salmon fillet", "سلمون", "سمك سلمون"],
      unitWeightG: 170,
      per100g: { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 59 }
    },
    {
      id: "white_fish",
      en: "White fish (Tilapia / Cod)",
      ar: "سمك فيليه أبيض",
      aliases: ["fish", "white fish", "tilapia", "cod", "سمك", "فيليه", "سمك بلطي", "سمك أبيض"],
      unitWeightG: 150,
      per100g: { calories: 96, protein_g: 20, carbs_g: 0, fat_g: 1.7, fiber_g: 0, sugar_g: 0, sodium_mg: 52 }
    },
    {
      id: "shrimp",
      en: "Shrimp / Prawns",
      ar: "جمبري",
      aliases: ["shrimp", "shrimps", "prawn", "prawns", "جمبري", "روبيان"],
      unitWeightG: 120,
      per100g: { calories: 99, protein_g: 24, carbs_g: 0.2, fat_g: 0.3, fiber_g: 0, sugar_g: 0, sodium_mg: 111 }
    },
    {
      id: "whey_protein",
      en: "Whey protein powder",
      ar: "واي بروتين",
      aliases: ["whey", "protein powder", "whey protein", "protein shake", "scoop whey", "واي", "واي بروتين", "بروتين بودرة", "شيك بروتين", "سكوب بروتين", "سكوب واي"],
      unitWeightG: 30, // 1 scoop
      per100g: { calories: 400, protein_g: 80, carbs_g: 6.7, fat_g: 5, fiber_g: 0, sugar_g: 4, sodium_mg: 160 }
    },
    {
      id: "cottage_cheese",
      en: "Cottage cheese",
      ar: "جبن قريش",
      aliases: ["cottage cheese", "جبن قريش", "جبنة قريش", "قريش"],
      unitWeightG: 150,
      per100g: { calories: 98, protein_g: 11, carbs_g: 3.4, fat_g: 4.3, fiber_g: 0, sugar_g: 2.7, sodium_mg: 364 }
    },
    {
      id: "greek_yogurt",
      en: "Greek yogurt (plain)",
      ar: "زبادي يوناني",
      aliases: ["greek yogurt", "greek yoghurt", "زبادي يوناني", "لبن يوناني"],
      unitWeightG: 170,
      per100g: { calories: 73, protein_g: 10, carbs_g: 3.6, fat_g: 2, fiber_g: 0, sugar_g: 3.2, sodium_mg: 45 }
    },

    // --- Carbohydrates ---
    {
      id: "white_rice",
      en: "Cooked white rice",
      ar: "أرز أبيض مطبوخ",
      aliases: ["rice", "white rice", "cooked rice", "basmati rice", "jasmine rice", "أرز", "رز", "أرز أبيض", "رز أبيض", "أرز بسمتي"],
      unitWeightG: 150,
      per100g: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0.1, sodium_mg: 1 }
    },
    {
      id: "oats",
      en: "Rolled oats / Oatmeal",
      ar: "شوفان",
      aliases: ["oats", "oatmeal", "rolled oats", "overnight oats", "شوفان", "دقيق الشوفان"],
      unitWeightG: 50,
      per100g: { calories: 389, protein_g: 16.9, carbs_g: 66.3, fat_g: 6.9, fiber_g: 10.6, sugar_g: 0.9, sodium_mg: 2 }
    },
    {
      id: "potato",
      en: "Boiled / Baked potato",
      ar: "بطاطس مسلوقة / مشوية",
      aliases: ["potato", "potatoes", "boiled potato", "baked potato", "بطاطس", "بطاطا", "بطاطس مسلوقة", "بطاطس مشوية"],
      unitWeightG: 180,
      per100g: { calories: 87, protein_g: 1.9, carbs_g: 20.1, fat_g: 0.1, fiber_g: 1.8, sugar_g: 0.9, sodium_mg: 6 }
    },
    {
      id: "sweet_potato",
      en: "Sweet potato",
      ar: "بطاطا حلوة",
      aliases: ["sweet potato", "sweet potatoes", "بطاطا حلوة", "بطاطا مشوية"],
      unitWeightG: 180,
      per100g: { calories: 86, protein_g: 1.6, carbs_g: 20.1, fat_g: 0.1, fiber_g: 3, sugar_g: 4.2, sodium_mg: 55 }
    },
    {
      id: "banana",
      en: "Banana",
      ar: "موز",
      aliases: ["banana", "bananas", "موز", "موزة"],
      unitWeightG: 118,
      per100g: { calories: 89, protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3, fiber_g: 2.6, sugar_g: 12.2, sodium_mg: 1 }
    },
    {
      id: "apple",
      en: "Apple",
      ar: "تفاح",
      aliases: ["apple", "apples", "تفاح", "تفاحة"],
      unitWeightG: 150,
      per100g: { calories: 52, protein_g: 0.3, carbs_g: 13.8, fat_g: 0.2, fiber_g: 2.4, sugar_g: 10.4, sodium_mg: 1 }
    },
    {
      id: "dates",
      en: "Dates",
      ar: "تمر",
      aliases: ["dates", "date", "medjool dates", "تمر", "تمرات", "بلح", "تمر مجدول"],
      unitWeightG: 20, // per single date
      per100g: { calories: 277, protein_g: 1.8, carbs_g: 75, fat_g: 0.2, fiber_g: 6.7, sugar_g: 66.5, sodium_mg: 1 }
    },
    {
      id: "pasta",
      en: "Cooked pasta",
      ar: "مكرونة مطبوخة",
      aliases: ["pasta", "cooked pasta", "spaghetti", "macaroni", "مكرونة", "معكرونة", "سباغيتي"],
      unitWeightG: 150,
      per100g: { calories: 158, protein_g: 5.8, carbs_g: 30.9, fat_g: 0.9, fiber_g: 1.8, sugar_g: 0.6, sodium_mg: 1 }
    },
    {
      id: "bread_toast",
      en: "Bread / Toast (1 slice)",
      ar: "خبز توست",
      aliases: ["bread", "toast", "whole wheat bread", "slice bread", "slices toast", "خبز", "توست", "عيش توست", "خبز أسمر", "عيش أسمر"],
      unitWeightG: 30, // 1 slice
      per100g: { calories: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2, fiber_g: 4, sugar_g: 5, sodium_mg: 490 }
    },
    {
      id: "pita_bread",
      en: "Pita / Baladi bread (1 loaf)",
      ar: "خبز بلدي / بيتا",
      aliases: ["pita", "pita bread", "flatbread", "baladi bread", "خبز بلدي", "عيش بلدي", "خبز بيتا", "رغيف"],
      unitWeightG: 90,
      per100g: { calories: 275, protein_g: 9.1, carbs_g: 55.7, fat_g: 1.2, fiber_g: 2.2, sugar_g: 2, sodium_mg: 520 }
    },

    // --- Fats & Nuts ---
    {
      id: "olive_oil",
      en: "Olive oil",
      ar: "زيت زيتون",
      aliases: ["olive oil", "oil", "extra virgin olive oil", "زيت زيتون", "زيت الزيتون", "زيت"],
      unitWeightG: 14, // 1 tbsp
      per100g: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100, fiber_g: 0, sugar_g: 0, sodium_mg: 2 }
    },
    {
      id: "peanut_butter",
      en: "Peanut butter",
      ar: "زبدة فول سوداني",
      aliases: ["peanut butter", "pb", "زبدة فول سوداني", "فول سوداني"],
      unitWeightG: 20, // 1 tbsp
      per100g: { calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50, fiber_g: 6, sugar_g: 9, sodium_mg: 420 }
    },
    {
      id: "almonds",
      en: "Almonds",
      ar: "لوز",
      aliases: ["almonds", "almond", "nuts", "mixed nuts", "لوز", "مكسرات"],
      unitWeightG: 30,
      per100g: { calories: 579, protein_g: 21.2, carbs_g: 21.6, fat_g: 49.9, fiber_g: 12.5, sugar_g: 4.4, sodium_mg: 1 }
    },
    {
      id: "avocado",
      en: "Avocado",
      ar: "أفوكادو",
      aliases: ["avocado", "avocados", "أفوكادو", "افوكادو"],
      unitWeightG: 150,
      per100g: { calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 14.7, fiber_g: 6.7, sugar_g: 0.7, sodium_mg: 7 }
    },
    {
      id: "butter",
      en: "Butter",
      ar: "زبدة",
      aliases: ["butter", "زبدة", "سمنة", "زبد"],
      unitWeightG: 10,
      per100g: { calories: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81.1, fiber_g: 0, sugar_g: 0.1, sodium_mg: 11 }
    },

    // --- Dairy & Drinks ---
    {
      id: "milk",
      en: "Whole / Low-fat milk",
      ar: "حليب",
      aliases: ["milk", "whole milk", "low fat milk", "skim milk", "cup milk", "حليب", "لبن", "كوب حليب", "حليب كامل الدسم", "حليب خالي الدسم"],
      unitWeightG: 240, // 1 cup
      per100g: { calories: 60, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.2, fiber_g: 0, sugar_g: 5.1, sodium_mg: 44 }
    },
    {
      id: "honey",
      en: "Honey",
      ar: "عسل",
      aliases: ["honey", "raw honey", "عسل", "عسل نحل", "عسل طبيعي"],
      unitWeightG: 20, // 1 tbsp
      per100g: { calories: 304, protein_g: 0.3, carbs_g: 82.4, fat_g: 0, fiber_g: 0.2, sugar_g: 82.1, sodium_mg: 4 }
    },
    {
      id: "salad",
      en: "Mixed salad (cucumber, tomato, lettuce)",
      ar: "سلطة خضراء مشكلة",
      aliases: ["salad", "mixed salad", "green salad", "cucumber", "tomato", "سلطة", "سلطه", "سلطة خضراء", "خيار", "طماطم", "خس"],
      unitWeightG: 150,
      per100g: { calories: 20, protein_g: 1, carbs_g: 3.8, fat_g: 0.2, fiber_g: 1.5, sugar_g: 2.2, sodium_mg: 15 }
    }
  ];

  // Map Arabic digits to Latin digits
  function normalizeDigits(str) {
    const arabicDigits = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(str || "").replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));
  }

  // Parse quantities like "200g", "2 scoops", "3", "1.5 cups", "1 tbsp"
  function parseItemMatch(text, food) {
    let clean = normalizeDigits(text.toLowerCase()).trim();
    // Strip leading Arabic 'و' or 'مع' if attached (e.g. 'وموزة', 'و٢ توست')
    clean = clean.replace(/^(?:و|مع)\s*/, "");
    for (const alias of food.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Pattern 1: Number + Unit + Food (e.g. "200 g chicken", "2 scoops whey", "3 eggs")
      const prefixPattern = new RegExp(`(?:(\\d+(?:\\.\\d+)?)\\s*(g|grams?|kg|kilos?|oz|ml|scoops?|tbsp|tablespoons?|tsp|teaspoons?|slices?|cups?|pieces?|جرام|غم|كيلو|سكوب|ملعقة|ملاعق|شريحة|شرائح|كوب|أكواب|حبة|حبات|بيضات|تمرات)?\\s*)?${escaped}`, "i");
      // Pattern 2: Food + Number + Unit (e.g. "chicken 200g", "eggs 3")
      const postfixPattern = new RegExp(`${escaped}\\s*(?:(\\d+(?:\\.\\d+)?)\\s*(g|grams?|kg|kilos?|oz|ml|scoops?|tbsp|tablespoons?|tsp|teaspoons?|slices?|cups?|pieces?|جرام|غم|كيلو|سكوب|ملعقة|ملاعق|شريحة|شرائح|كوب|أكواب|حبة|حبات)?)?`, "i");

      let match = clean.match(prefixPattern) || clean.match(postfixPattern);
      if (match && match[0].trim()) {
        const rawAmount = match[1] ? Number(match[1]) : 1;
        const unit = (match[2] || "").toLowerCase();
        let grams = food.unitWeightG;

        if (unit.startsWith("g") || unit === "جرام" || unit === "غم") {
          grams = rawAmount;
        } else if (unit.startsWith("kg") || unit.startsWith("kilo") || unit === "كيلو") {
          grams = rawAmount * 1000;
        } else if (unit === "oz") {
          grams = rawAmount * 28.35;
        } else if (unit === "ml") {
          grams = rawAmount; // approx 1ml ~ 1g
        } else if (unit.includes("tbsp") || unit.includes("ملعقة")) {
          grams = rawAmount * (food.id === "olive_oil" ? 14 : food.id === "peanut_butter" || food.id === "honey" ? 20 : 15);
        } else if (unit.includes("tsp")) {
          grams = rawAmount * 5;
        } else if (unit.includes("cup") || unit.includes("كوب")) {
          grams = rawAmount * (food.id === "milk" ? 240 : food.id === "oats" ? 80 : 150);
        } else if (unit.includes("scoop") || unit.includes("سكوب")) {
          grams = rawAmount * (food.id === "whey_protein" ? 30 : 30);
        } else if (unit.includes("slice") || unit.includes("شريحة")) {
          grams = rawAmount * (food.id === "bread_toast" ? 30 : 30);
        } else if (match[1]) {
          // Plain count without unit (e.g. "3 eggs", "1 banana", "5 dates")
          grams = rawAmount * food.unitWeightG;
        }

        return { food, grams: Math.max(5, Math.round(grams)), matchedAlias: alias, matchedText: match[0] };
      }
    }
    return null;
  }

  function estimate(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      return {
        food_name: "Unknown meal",
        portion_size: "0g",
        estimated_weight_g: 0,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
        confidence: "Low",
        confidence_pct: 0,
        notes: "No meal description provided.",
        recognizable: false,
        source: "Local estimate (offline)"
      };
    }

    // Split items by delimiters +, ,, ،, and, with, مع, و
    const segments = raw.split(/[,،+\n]|\band\b|\bwith\b|\bمع\b|\s+و\s+/i).map(s => s.trim()).filter(Boolean);
    const matchedItems = [];
    const usedFoodIds = new Set();

    for (const segment of segments) {
      let foundInSegment = null;
      for (const food of FOOD_DATABASE) {
        if (usedFoodIds.has(food.id)) continue;
        const match = parseItemMatch(segment, food);
        if (match) {
          foundInSegment = match;
          break;
        }
      }
      if (foundInSegment) {
        matchedItems.push(foundInSegment);
        usedFoodIds.add(foundInSegment.food.id);
      }
    }

    // If segments didn't match cleanly, try matching whole text against database
    if (!matchedItems.length) {
      for (const food of FOOD_DATABASE) {
        if (usedFoodIds.has(food.id)) continue;
        const match = parseItemMatch(raw, food);
        if (match) {
          matchedItems.push(match);
          usedFoodIds.add(food.id);
        }
      }
    }

    if (!matchedItems.length) {
      return {
        food_name: raw.slice(0, 120),
        portion_size: "Standard portion",
        estimated_weight_g: 150,
        calories: 250,
        protein_g: 15,
        carbs_g: 25,
        fat_g: 10,
        fiber_g: 2,
        sugar_g: 3,
        sodium_mg: 300,
        confidence: "Low",
        confidence_pct: 35,
        notes: "Unmatched meal offline estimate. Please review and adjust macros before saving.",
        recognizable: true,
        source: "Local estimate (offline)"
      };
    }

    let totalWeight = 0;
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sugar = 0;
    let sodium = 0;
    const names = [];

    for (const item of matchedItems) {
      const factor = item.grams / 100;
      totalWeight += item.grams;
      calories += item.food.per100g.calories * factor;
      protein += item.food.per100g.protein_g * factor;
      carbs += item.food.per100g.carbs_g * factor;
      fat += item.food.per100g.fat_g * factor;
      fiber += item.food.per100g.fiber_g * factor;
      sugar += item.food.per100g.sugar_g * factor;
      sodium += item.food.per100g.sodium_mg * factor;
      names.push(`${item.food.en} (${item.grams}g)`);
    }

    const hasSpecificGrams = /\d+\s*(?:g|grams?|kg|oz|ml|جرام|غم)/i.test(raw);
    const confidence = hasSpecificGrams ? "High" : matchedItems.length > 1 ? "Medium" : "Medium";
    const confidence_pct = hasSpecificGrams ? 88 : 72;

    return {
      food_name: names.join(" + "),
      portion_size: `${Math.round(totalWeight)}g total`,
      estimated_weight_g: Math.round(totalWeight),
      calories: Math.round(calories),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      fiber_g: Math.round(fiber * 10) / 10,
      sugar_g: Math.round(sugar * 10) / 10,
      sodium_mg: Math.round(sodium),
      confidence,
      confidence_pct,
      notes: `Offline estimate from ${matchedItems.length} matched ingredient${matchedItems.length === 1 ? "" : "s"}. You can adjust portions directly.`,
      recognizable: true,
      source: "Local estimate (offline)"
    };
  }

  return Object.freeze({
    estimate,
    database: FOOD_DATABASE
  });
})();
