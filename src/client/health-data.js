window.REP_HEALTH_GUIDE = Object.freeze({
  version: "2026.09.15",
  updatedAt: "2026-09-15",
  sources: {
    training: "https://drive.google.com/file/d/1D7pQ9zzGMUhNw9zjiQlrmA2MKger5som/view",
    nutrition: "https://drive.google.com/file/d/1HWj_WppodDMUbExjRLgAO_-qZusC1ZcI/view",
    hygiene: "https://drive.google.com/file/d/1dXEa1PvY-Mf8pddRYX3V8EUPIjrskqRm/view",
    master: "https://docs.google.com/document/d/19ViOoXhAkcGV5SeAmf7WP89TVyPGcv6NxB2TxNsqzbM/edit",
    drive: "https://drive.google.com/drive/u/0/folders/1LKdmJFanrw_hIHgPM91ZaZgxncSWhq9A"
  },
  rules: {
    minimumSleepHours: 7,
    wakeTime: "05:00",
    targetBedtime: "22:00",
    redFlagThreshold: 2,
    reviewWeek: 8,
    stallSessions: 2,
    cardioEasySessions: 3,
    cardioMinimumWeeks: 3
  },
  nutrition: {
    targets: {
      gym: { label: "Gym Day", calories: 2250, protein: 185, carbs: 248, fat: 68, fiber: 33, water: 4.2 },
      cardio: { label: "Active Day", calories: 2075, protein: 175, carbs: 0, fat: 63, fiber: 33, water: 3.6 },
      rest: { label: "Flex Day", calories: 2150, protein: 175, carbs: 0, fat: 65, fiber: 33, water: 3.2, calorieCeiling: 2480 },
      fasting: { label: "Fasting Day", calories: 2000, protein: 170, carbs: 0, fat: 63, fiber: 33, water: 0 }
    },
    meals: {
      gym: [
        ["06:30", "Omelette, toast, and vegetables", "~530 kcal · P36 C65 F19"],
        ["09:00", "Iced coffee + 3 dates", "~137 kcal · P3 C24 F3 · pre-workout"],
        ["11:15", "Whey shake + creatine + 250 ml whole milk", "~274 kcal · P32 C15 F10 · post-workout"],
        ["12:00", "Office coffee", "~70 kcal · P3 C5 F3"],
        ["13:00", "Overnight oats + ground flaxseed", "~478 kcal · P32 C61 F17"],
        ["14:00", "Balance Protein Crackers · half pack", "~140 kcal · P8 C19 F4-5"],
        ["17:00", "Banana", "~105 kcal · no extra dates"],
        ["19:30", "Chicken, rice, and a large vegetable serving", "~360+ kcal · P56 plus sides"],
        ["21:30", "Cottage cheese + toast", "~158 kcal · P14 C17 F5"]
      ],
      cardio: [
        ["06:30", "Omelette, toast, vegetables, and coffee", "Keep the current portions"],
        ["09:00", "Iced coffee + 3 dates", "Ordinary snack"],
        ["12:00", "Overnight oats + 1 tbsp ground flaxseed", "Fiber-focused"],
        ["15:30", "Whey shake + creatine + 250 ml whole milk", "Protein anchor"],
        ["19:30", "Chicken, rice, and a substantial salad", "Main meal"],
        ["21:30", "Cottage cheese + toast", "Before bed"]
      ],
      rest: [
        ["—", "No rigid meal schedule", "Typical target ~2,150 kcal"],
        ["—", "Anchor meals around lean halal protein", "Protein target ~175 g · practical floor 160 g"],
        ["—", "Social or preferred foods can fit", "Occasional ceiling ~2,480 kcal, not the normal target"],
        ["—", "Keep fruit, vegetables, and whole grains or legumes present", "Fiber target 30-35 g"]
      ],
      fasting: [
        ["Suhoor", "Protein, carbohydrate, fluids, and some fat", "Use Fajr rather than a fixed clock time"],
        ["Iftar", "Dates and water", "Use Maghrib rather than a fixed clock time"],
        ["Main meal", "Protein, carbohydrate, vegetables, and fluids", "After iftar"],
        ["Later", "Whey, yogurt, cottage cheese, or equivalent", "Distribute fluids through the eating window"]
      ]
    },
    rules: [
      "Target about 0.25-0.40 kg weight loss per week and judge the 7-day trend, not a single weigh-in.",
      "Use about 175 g protein daily with a practical floor around 160 g.",
      "Keep fat at least around 60-65 g daily and fiber around 30-35 g daily.",
      "Hydration numbers are working guides; adjust for thirst, urine colour, heat, and sweat loss.",
      "Prefer fasting on a non-gym day. Otherwise move lifting until after iftar or skip the gym; do not perform the normal 10:00 AM session deep into a dry fast.",
      "Review calories after 2-3 consistent weeks, then around every 5 kg lost or 8 weeks, whichever comes first."
    ],
    supplements: ["Creatine monohydrate · 5 g daily"],
    milk: "Vitamin D, omega-3, magnesium, multivitamin, and ashwagandha require product, dose, need, and interaction review before routine use."
  },
  hygiene: {
    nonNegotiables: [
      "Brush with fluoride toothpaste twice daily",
      "Floss or clean interdentally every day",
      "Apply broad-spectrum SPF50 before daylight exposure and reapply after sweating or showering",
      "Shower or rinse after sport or heavy sweating; avoid unnecessary extra full cleansing showers"
    ],
    morning: [
      "Dental: brush with fluoride toothpaste for 2 minutes using a soft brush and gentle gumline pressure",
      "Face: use a gentle cleanser when needed, then broad-spectrum SPF50 before daylight exposure",
      "Body: take one normal shower before work when needed; on gym days the post-gym shower is the normal cleansing shower",
      "Beard/skin: use beard oil or a fragrance-free non-comedogenic moisturiser once daily or as needed on slightly damp skin",
      "Moisturise only dry areas; use lip balm as needed",
      "Apply deodorant to dry underarms",
      "Kerella is Monday and Friday morning only, on a dry scalp, exactly as prescribed"
    ],
    evening: [
      "Shower or rinse after sport or heavy sweating; do not add another full cleansing shower only because it is evening",
      "Floss daily using a fresh section for each tooth",
      "Brush with fluoride toothpaste for 2 minutes, then spit and do not rinse",
      "Use the tongue scraper gently from back to front",
      "Use mouthwash after lunch or at another separate time, never immediately after brushing",
      "Use the gentle face cleanser when needed; face oil is optional only if it causes no acne, redness, or stinging",
      "Do not repeat beard oil automatically; use oil or moisturiser once daily or as needed",
      "Use lip balm as needed"
    ],
    afterWork: ["Change into clean gym or sport clothes when training", "Use deodorant again only if needed"],
    postWorkout: [
      "Shower or rinse after significant sweating; use body wash where needed without aggressive full-body scrubbing",
      "Use a gentle face cleanser after significant sweating",
      "Reapply SPF50 after showering when daylight exposure remains",
      "Use beard oil or fragrance-free non-comedogenic moisturiser only if it has not already been used and is needed",
      "Moisturise dry areas, use lip balm, and reapply deodorant as needed"
    ],
    hair: {
      Sunday: ["Nizapex wash", "Apply to scalp, massage, leave 3-5 min, then rinse", "Conditioner only on lengths and ends"],
      Monday: ["Kerella · morning · prescribed dose 1/2", "Dry scalp, thin layer, massage, leave on", "No hair wash"],
      Tuesday: ["Regular anti-dandruff shampoo + weekly hair mask", "Shampoo the scalp", "Mask on lengths for 5-10 min, not on the scalp"],
      Wednesday: ["No wash", "Use Kitadan lightly only if itchy and tolerated"],
      Thursday: ["Nizapex wash", "Apply to scalp, massage, leave 3-5 min, then rinse", "Conditioner only on lengths and ends"],
      Friday: ["Kerella · morning · prescribed dose 2/2", "Dry scalp, thin layer, massage, leave on", "No hair wash"],
      Saturday: ["No wash", "Nothing unless needed", "After optional spa, rinse and moisturise dry skin"]
    },
    strictHairRules: [
      "Wash days are Sunday, Tuesday, and Thursday",
      "Nizapex twice weekly during the prescribed or active treatment schedule; clinician instructions take priority",
      "Kerella Monday and Friday only as prescribed; do not add doses or extend the course",
      "Conditioner and mask stay on the hair lengths and ends, not the scalp",
      "Use minimal product and stop or review anything that causes irritation"
    ],
    weekly: [
      "Use 2% salicylic-acid soap only for acne or clogging when needed and tolerated, up to once weekly",
      "Trim the beard neckline and cheek line about weekly according to preference",
      "Trim or file nails about weekly or as needed",
      "Mechanical exfoliation 0-1 time weekly as needed and tolerated; keep it gentle",
      "Wash towels regularly and let them dry fully between uses",
      "Change bedding and pillowcase weekly",
      "Clean only the outer ear with a washcloth; never insert anything into the ear canal",
      "Remove gym clothes from the bag after training, let shoes dry, and clean the bag and gear as needed"
    ],
    monthly: [
      "Follow the dental review and professional-cleaning interval recommended for your gum and cavity risk",
      "Seek clinical assessment for new or changing skin lesions, persistent scalp inflammation, severe gum bleeding or pain, eye symptoms, or treatment reactions",
      "Prescribed instructions take priority over this routine"
    ]
  }
});
