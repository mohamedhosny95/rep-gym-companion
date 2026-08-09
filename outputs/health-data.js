window.REP_HEALTH_GUIDE = Object.freeze({
  version: "2026.08.1",
  updatedAt: "2026-08-09",
  sources: {
    training: "https://app.notion.com/p/3b6fa9cab09281c9aa03d11732cc200b",
    nutrition: "https://app.notion.com/p/398fa9cab09281ecba7ad4a50cc27f28",
    hygiene: "https://app.notion.com/p/32dfa9cab09281f99ce0f9e1bfdadcdf",
    drive: "https://drive.google.com/drive/u/0/folders/1LKdmJFanrw_hIHgPM91ZaZgxncSWhq9A"
  },
  rules: {
    minimumSleepHours: 7,
    wakeTime: "04:15",
    targetBedtime: "21:15",
    redFlagThreshold: 2,
    reviewWeek: 8,
    stallSessions: 2,
    cardioEasySessions: 3,
    cardioMinimumWeeks: 3
  },
  nutrition: {
    targets: {
      gym: { label: "Gym", calories: 2251, protein: 182, carbs: 254, fat: 71, water: 3.5 },
      cardio: { label: "Cardio", calories: 2294, protein: 182, carbs: 254, fat: 71, water: 3.5 },
      rest: { label: "Rest", calories: 2211, protein: 182, carbs: 254, fat: 71, water: 3.0 }
    },
    meals: {
      gym: [
        ["06:30", "Omelette + hot coffee", "577 kcal · P38 C68 F21"],
        ["09:00", "Iced coffee + 3 dates", "137 kcal · pre-workout"],
        ["09:30", "Banana", "89 kcal · final fuel"],
        ["11:45", "Whey shake + creatine", "302 kcal · post-workout"],
        ["14:00", "Overnight oats", "518 kcal · P34"],
        ["15:00", "Mixed salad", "70 kcal"],
        ["19:00", "Chicken + rice", "360 kcal · P56"],
        ["21:30", "Cottage cheese + toast", "158 kcal · P14"]
      ],
      cardio: [
        ["06:30", "Omelette + hot coffee", "577 kcal · P38 C68 F21"],
        ["09:00", "Iced coffee + 3 dates", "137 kcal"],
        ["12:00", "Overnight oats", "518 kcal · P34"],
        ["13:30", "Mixed salad", "70 kcal"],
        ["16:00", "Banana", "89 kcal"],
        ["19:00", "Chicken + rice", "360 kcal · P56"],
        ["21:30", "Whey shake + creatine", "302 kcal · P32"],
        ["22:00", "Cottage cheese + toast", "158 kcal · P14"]
      ],
      rest: [
        ["06:30", "Omelette + hot coffee", "577 kcal · P38 C68 F21"],
        ["09:00", "Iced coffee + 3 dates", "137 kcal"],
        ["12:00", "Overnight oats", "518 kcal · P34"],
        ["14:00", "Banana", "89 kcal"],
        ["15:00", "Mixed salad", "70 kcal"],
        ["15:30", "Whey shake + creatine", "302 kcal · P32"],
        ["19:00", "Chicken + rice", "360 kcal · P56"],
        ["21:30", "Cottage cheese + toast", "158 kcal · P14"]
      ]
    },
    supplements: ["Multivitamin + Vitamin D with breakfast", "Creatine 5g daily", "Omega-3 + Ashwagandha with dinner", "Magnesium glycinate before sleep"],
    milk: "410 ml whole milk across coffee, oats, and shake"
  },
  hygiene: {
    nonNegotiables: ["SPF every morning", "Floss every evening", "Beard oil AM + PM", "Post-workout shower within 30 min"],
    morning: [
      "Face: gentle wash, pat dry, SPF 50 on face, neck, and ears",
      "Dental: soft-bristle brush for 2 minutes; spit, do not rinse",
      "Eyes: clean-water rinse; preservative-free drops on heavy screen days",
      "Beard: 3–4 drops oil into skin first, then comb",
      "Body: antiperspirant on dry underarms + SPF lip balm"
    ],
    evening: [
      "Face: micellar water, gentle wash, moisturiser on damp skin",
      "Dental: floss first, brush 2 minutes, scrape tongue; spit, do not rinse",
      "Eyes: one preservative-free drop per eye",
      "Beard: oil into skin, then comb",
      "Body: lotion within 3 minutes of shower; repair dry areas as needed"
    ],
    postWorkout: ["Shower within 30 minutes", "Wash heavy-sweat areas and face", "Condition mid-lengths and ends when washing hair", "Lotion on damp skin", "Fresh antiperspirant"],
    hair: {
      Monday: ["Treatment wash · evening", "Nizapex on scalp 3–5 min", "Conditioner on mid-lengths and ends"],
      Tuesday: ["Non-wash scalp care · morning", "Kerella thin layer on dry scalp; leave on"],
      Wednesday: ["Maintenance wash · evening", "Keratin AD shampoo on scalp", "Conditioner on lengths"],
      Thursday: ["Non-wash relief · morning", "Do nothing unless itchy; Kitadan lightly if needed", "No oils or creams"],
      Friday: ["Treatment wash · evening", "Nizapex on scalp 3–5 min", "Conditioner on mid-lengths and ends"],
      Saturday: ["Hydration wash · evening", "Weekly mask, then rinse", "Shampoo as directed; no extra treatment"],
      Sunday: ["Recovery · evening", "No wash", "If dry: 1–2 drops jojoba OR argan oil"]
    },
    strictHairRules: ["Nizapex max 2×/week", "Mask once/week", "Kerella only on non-wash days", "Never Kerella and Nizapex on the same day", "Conditioner stays off the scalp", "Oil only Sunday if dry"]
  }
});
