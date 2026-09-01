window.REP_HEALTH_GUIDE = Object.freeze({
  version: "2026.09.1",
  updatedAt: "2026-09-01",
  sources: {
    training: "https://app.notion.com/p/3b6fa9cab09281c9aa03d11732cc200b",
    nutrition: "https://app.notion.com/p/398fa9cab09281ecba7ad4a50cc27f28",
    hygiene: "https://app.notion.com/p/32dfa9cab09281f99ce0f9e1bfdadcdf",
    drive: "https://drive.google.com/drive/u/0/folders/1LKdmJFanrw_hIHgPM91ZaZgxncSWhq9A"
  },
  rules: {
    minimumSleepHours: 7,
    wakeTime: "04:45",
    targetBedtime: "21:45",
    redFlagThreshold: 2,
    reviewWeek: 8,
    stallSessions: 2,
    cardioEasySessions: 3,
    cardioMinimumWeeks: 3
  },
  nutrition: {
    targets: {
      gym: { label: "Gym", calories: 2380, protein: 190, carbs: 278, fat: 70, water: 4.2 },
      cardio: { label: "Cardio", calories: 2042, protein: 178, carbs: 206, fat: 66, water: 3.6 },
      rest: { label: "Rest", calories: 2480, protein: 150, carbs: 0, fat: 70, water: 3.2 }
    },
    meals: {
      gym: [
        ["06:30", "Omelette (no coffee — moved to 11:30 AM)", "530 kcal · P36 C65 F19"],
        ["09:00", "Iced coffee + 3 dates", "137 kcal · P3 C24 F3"],
        ["11:30", "Hot coffee (office)", "~70 kcal · P3 C5 F3"],
        ["12:30", "Overnight oats", "478 kcal · P32 C61 F17"],
        ["14:00", "Balance Protein Crackers", "280 kcal · P16 C38 F8.9"],
        ["17:45", "Banana + 3 dates", "159 kcal · pre-workout"],
        ["20:45", "Chicken + rice", "360 kcal · P56 C17 F7"],
        ["21:00", "Whey shake + creatine", "210 kcal · post-workout"],
        ["21:15", "Cottage cheese + toast", "158 kcal · P14 C17 F4.6"]
      ],
      cardio: [
        ["06:30", "Omelette + hot coffee", "603 kcal · P39 C70 F22"],
        ["09:00", "Iced coffee + 3 dates", "163 kcal · P4 C26 F4"],
        ["12:00", "Overnight oats", "516 kcal · P34 C64 F19"],
        ["15:30", "Whey shake + creatine", "242 kcal · P31 C12 F9"],
        ["19:30", "Chicken + rice", "360 kcal · P56 C17 F7"],
        ["21:30", "Cottage cheese + toast", "158 kcal · P14 C17 F4.6"]
      ],
      rest: [
        ["—", "No strict meal timing", "Eat within the 2,480 kcal ceiling · protein floor 150g"],
        ["—", "Optional structured snack", "10 cashews + 10 almonds"]
      ]
    },
    supplements: ["Multivitamin + Vitamin D with breakfast", "Creatine 5g daily", "Omega-3 + Ashwagandha with dinner", "Magnesium glycinate before sleep"],
    milk: "~450 ml whole milk across coffee, oats, and shake"
  },
  hygiene: {
    nonNegotiables: ["SPF 50 (Bobai Oil Defense) every morning", "Floss every evening", "Beard oil (Jojoba/Argan) AM + PM", "Post-workout shower within 30 min"],
    morning: [
      "Face: Foaming Face Wash, lukewarm water, then Bobai Oil Defense SPF50 on damp skin — last step, non-negotiable even on cloudy days",
      "Dental (pre-workout, before wudu/Fajr): Pardonotx toothbrush, 2 minutes, gentle at the gumline",
      "Body: Rivoli or Mood Vanilla Shower Gel in the shower — hair only washed here Sun/Tue/Thu evenings; skip entirely Mon/Fri to protect Kerella",
      "Beard: 3–4 drops Jojoba or Argan oil into the skin first, then comb",
      "Body moisturizer: Body Lotion Cocooil, or Glysolid on elbows/knees",
      "Lip balm",
      "Deodorant: Nivea, on fully dry underarms",
      "Optional: 2–3 sprays fragrance on wrists/neck; quick nail glance for snags"
    ],
    evening: [
      "Shower: body wash — add hair wash only Sun/Tue/Thu",
      "Floss first (fresh section per tooth), then Pardonotx brush 2 minutes at 45° along the gumline",
      "Tongue scraper 5–6 passes, then Listerine mouthwash 30 sec; spit, don't rinse (move after lunch instead if it stings)",
      "Face: Foaming Face Wash, then a little Gruum Face Oil. Beard: Jojoba or Argan oil into the skin, then comb",
      "Lip balm"
    ],
    afterWork: ["Change into gym/sport clothes", "Quick deodorant check if needed"],
    postWorkout: ["Shower within 30 minutes — Rivoli or Mood Vanilla Shower Gel (hair only washed if it's a wash day)", "Wash heavy-sweat areas and face with Foaming Face Wash", "Condition mid-lengths and ends with Keratin AD Conditioner on wash days", "Body Lotion Cocooil on damp skin", "Fresh Nivea antiperspirant"],
    hair: {
      Sunday: ["Nizapex wash · evening (post-gym)", "Nizapex on scalp, massage, leave 3–5 min, rinse", "Keratin AD Conditioner on mid-lengths and ends"],
      Monday: ["Kerella · morning (dose 1/2, doctor's Rx)", "Scalp dry → thin layer, massage in, leave on, don't rinse", "Non-wash day — no oils otherwise"],
      Tuesday: ["Maintenance wash + mask · evening (post-gym)", "Keratin AD Shampoo on scalp, 30–60 sec, rinse", "Garnier Mask on lengths 5–10 min, rinse (replaces conditioner)"],
      Wednesday: ["Non-wash", "Nothing unless itchy — then Kitadan Spray lightly", "No oils or creams today"],
      Thursday: ["Nizapex wash · evening (post-gym)", "Nizapex on scalp, massage, leave 3–5 min, rinse", "Keratin AD Conditioner on mid-lengths and ends — same as Sunday"],
      Friday: ["Kerella · morning (dose 2/2, doctor's Rx)", "Scalp dry → thin layer, massage in, leave on, don't rinse", "Same as Monday — doctor's Rx"],
      Saturday: ["Non-wash / spa day", "Nothing unless itchy, same as Wednesday", "See spa protocol for the day's care"]
    },
    strictHairRules: ["Wash days: Sunday, Tuesday, Thursday only — the gym evenings", "Nizapex max 2×/week (Sun + Thu)", "Mask once/week, Tuesday only", "Kerella twice weekly (Mon + Fri mornings), only on non-wash days", "Never Kerella and a hair-washing shower on the same day", "Conditioner and mask stay off the scalp", "Exact Kerella frequency is doctor's Rx — don't extend it without checking", "Minimal product, always"],
    weekly: ["Face: Salicylic Acid Soap 2% once/week, evening, instead of the usual face wash", "Beard: neckline and cheek-line trim", "Nails: full trim + file, fingers and toes, post-shower", "Body exfoliation 2–3×/week, loofah or glove, pair with gym days", "Towels: fresh one every 2–3 uses", "Bedsheets/pillowcase: change weekly", "Ears: washcloth on the outer ear only during shower — never insert anything into the canal"],
    monthly: ["Skin self-check — scan for new moles or changes", "Gym gear — air out shoes and bag, check for buildup", "Cross-check the Body Care Products list, reorder what's low", "Every 6 months: professional dental cleaning (mention sensitive gums)", "Annually: dermatologist skin check"]
  }
});
