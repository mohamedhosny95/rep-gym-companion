window.REP_HEALTH_GUIDE = Object.freeze({
  version: "2026.08.4",
  updatedAt: "2026-08-26",
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
    nonNegotiables: ["SPF 50 (Bobai Oil Defense) every morning", "Floss every evening", "Beard oil (Jojoba/Argan) AM + PM", "Post-workout shower within 30 min"],
    morning: [
      "Face: Foaming Face Wash, pat dry, then Bobai Oil Defense SPF50 on face, neck, and ears — last step, non-negotiable even on cloudy days",
      "Dental (pre-workout, before wudu): Pardonotx toothbrush, 2 minutes, gentle at the gumline",
      "Body: Rivoli or Mood Vanilla Shower Gel in the shower, then Body Lotion Cocooil (or Glysolid on elbows/knees)",
      "Beard: 3–4 drops Jojoba or Argan oil into the skin first, then comb",
      "Eyes: clean-water rinse; preservative-free drops on heavy screen days",
      "Deodorant: Nivea on fully dry underarms, then lip balm",
      "Optional: 2–3 sprays fragrance on wrists/neck; quick nail glance for snags"
    ],
    evening: [
      "Face: Foaming Face Wash, then a little Gruum Face Oil",
      "Dental: floss first (fresh section per tooth), Pardonotx brush 2 minutes at 45° along the gumline",
      "Tongue scraper 5–6 passes, then Listerine mouthwash 30 sec; spit, don't rinse (move after lunch instead if it stings)",
      "Beard: Jojoba or Argan oil into the skin, then comb",
      "Eyes: one preservative-free drop per eye",
      "Lip balm"
    ],
    afterWork: ["Wash hands and face", "Fresh undershirt if it's the same one since the 5 AM workout", "Reapply Nivea deodorant if needed"],
    postWorkout: ["Shower within 30 minutes — Rivoli or Mood Vanilla Shower Gel (hair only washed if it's a wash day)", "Wash heavy-sweat areas and face with Foaming Face Wash", "Condition mid-lengths and ends with Keratin AD Conditioner on wash days", "Body Lotion Cocooil on damp skin", "Fresh Nivea antiperspirant"],
    hair: {
      Sunday: ["Kerella dose · evening (1 of 2)", "Thin layer on dry scalp, massage in, leave on", "Doctor's Rx — don't change frequency without checking"],
      Monday: ["Treatment wash · evening", "Nizapex on scalp, massage, leave 3–5 min, rinse", "Keratin AD Conditioner on mid-lengths and ends"],
      Tuesday: ["Kerella dose · morning (2 of 2)", "Thin layer on dry scalp, massage in, leave on", "Same as Sunday — doctor's Rx"],
      Wednesday: ["Maintenance wash + mask · evening", "Keratin AD Shampoo on scalp, 30–60 sec, rinse", "Garnier Mask on lengths 5–10 min, rinse (replaces conditioner)"],
      Thursday: ["Non-wash · morning", "Nothing unless itchy — then Kitadan Spray lightly", "No oils or creams today"],
      Friday: ["Treatment wash · evening", "Nizapex on scalp, massage, leave 3–5 min, rinse", "Keratin AD Conditioner on mid-lengths and ends"],
      Saturday: ["Non-wash / rest", "Nothing unless itchy, same as Thursday", "Let the scalp recover before Sunday's Kerella dose"]
    },
    strictHairRules: ["Wash days: Monday, Wednesday, Friday only", "Nizapex max 2×/week", "Mask once/week, Wednesday only", "Kerella twice weekly (Sun + Tue), only on non-wash days", "Never Kerella and Nizapex on the same day", "Conditioner and mask stay off the scalp", "No oils on Kerella days", "Exact Kerella frequency is doctor's Rx — don't extend it without checking"],
    weekly: ["Face: Salicylic Acid Soap 2% once/week, evening, instead of the usual face wash", "Beard: neckline and cheek-line trim", "Nails: full trim + file, fingers and toes, post-shower", "Body exfoliation 2–3×/week, loofah or glove, pair with gym days", "Towels: fresh one every 2–3 uses", "Bedsheets/pillowcase: change weekly", "Ears: washcloth on the outer ear only during shower — never insert anything into the canal"],
    monthly: ["Skin self-check — scan for new moles or changes", "Gym gear — air out shoes and bag, check for buildup", "Cross-check the Body Care Products list, reorder what's low", "Every 6 months: professional dental cleaning (mention sensitive gums)", "Annually: dermatologist skin check"]
  }
});
