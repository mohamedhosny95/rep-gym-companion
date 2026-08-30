# Premium Mobile Redesign Plan and Handoff

Status: Phase 1 complete; Phase 2 polished through the expanded cinematic motion pass; Phase 3 discovery complete. Staging is deployed. Physical-device certification remains the merge gate.

This document preserves the product direction, implementation rules, completed work, validation evidence, and remaining roadmap agreed during the redesign conversation. It is the handoff source of truth for continuing this work without losing the original constraints.

## Product direction

Rep Gym Companion is an existing, functional application. The objective is to retain its working architecture and real data flows while transforming its mobile UI, workout presentation, and motion quality into a premium fitness experience.

The visual direction is a practical blend of Apple Fitness+, Nike Training Club, WHOOP, and high-end biomechanics software:

- premium dark appearance;
- cinematic, exercise-specific movement media;
- strong typography and clear information hierarchy;
- anatomical muscle highlighting;
- polished timers, set logging, rest states, and transitions;
- restrained, smooth motion;
- a native-feeling phone experience instead of a generic dashboard or wrapped website.

The supplied lat-pulldown and padel screenshots are visual references, not layouts to copy blindly. Mobile usability, legibility, touch reach, state integrity, and performance take priority over pixel imitation.

## Non-negotiable implementation rules

- Do not rebuild the application from scratch.
- Preserve working backend, API, authentication, database, persistence, navigation, integrations, calculations, and business logic.
- Do not remove an existing feature because it is absent from a reference image. Re-present it when necessary.
- Reuse existing state and components where sensible.
- Do not use fake or hard-coded workout data to make the redesign appear complete.
- Keep every redesigned control connected to real workout state.
- Do not modify unrelated files or overwrite unrelated user work.
- Inspect git status and diff regularly to keep scope controlled.
- Build and test after meaningful changes; fix introduced compile or runtime errors before continuing.
- Prefer simple, maintainable UI composition over new frameworks or over-engineered abstraction.
- Keep motion smooth and restrained, with reduced-motion support.
- Use male subjects only for exercise cinematic media.
- Use the real exercise context: football movements on a football pitch, padel movements on a padel court, gym movements in a gym, treadmill movements on a treadmill, and home movements in a home training space.
- Optimize for 100% mobile use, especially widths around 375, 390, and 430 pixels, while remaining usable at 320 pixels.
- Respect safe areas, Dynamic Island/cutouts, the home indicator, system gestures, keyboard behavior, and touch targets.

## Information architecture principles

Every screen should clearly communicate:

1. the current task;
2. the current status;
3. the next action;
4. secondary controls;
5. optional details.

Browse mode retains normal application navigation. Workout mode becomes immersive and suppresses generic app utilities while preserving access to workout-specific navigation and options.

The active workout hierarchy is fixed:

1. workout progress and header;
2. large cinematic exercise animation;
3. muscle visualization;
4. exercise name and target muscles;
5. current set;
6. rep counter or timer;
7. primary action;
8. Speed, Loop, View, and Muscles controls;
9. set logging;
10. rest and next-exercise experience.

## Phased roadmap

### Phase 0 — Audit

- Inspect framework, navigation, state, design system, data models, timers, persistence, caching, safe areas, assets, tests, build scripts, and git state.
- Identify existing reusable components and performance-sensitive paths.
- Preserve unrelated work.

### Phase 1 — Foundation — complete

- Establish premium dark workout tokens, accent colors, spacing, radii, shadows, and motion timings.
- Establish focused workout mode and safe-area-aware mobile structure.
- Improve mobile hierarchy, typography, touch targets, and responsive behavior.
- Preserve the existing five-tab browse experience and real application state.

### Phase 2 — Active Workout — first polished implementation complete

- Build the immersive workout header and progress treatment.
- Make exercise media full-bleed and cinematic.
- Keep category, biomechanics, movement cue, phase rail, exercise identity, target muscles, and prescription connected to the current exercise.
- Add a focused current-set card.
- Add quick weight/reps/RPE entry synchronized with the existing detailed set log.
- Add a large thumb-reachable primary action.
- Retain and redesign Loop, Speed, View, and Muscles controls.
- Add workout option and playback bottom sheets.
- Add a focused timed-exercise experience with pause, extension, halfway/side state, and completion.
- Redesign the rest dock and provide a real next-exercise preview with Start now.
- Add exercise-entry transitions and a premium completion handoff using actual session metrics.
- Preserve swapping, superset handling, cues, previous/next navigation, rest timing, history, and completion logic.
- Add exercise-specific male cinematic media for home, gym, football, padel, outdoor, and treadmill contexts.
- Add three-frame male movement cycles for:
  - Brisk Marching in Place;
  - Plank;
  - Lat Pulldown;
  - Lateral Shuffles & Carioca;
  - Padel Shoulder Prep;
  - Incline Treadmill Walk.
- Expand three-frame male movement cycles to:
  - Chest Press;
  - Leg Press;
  - Seated Cable Row;
  - Back Extension;
  - Football Dynamic Stretches;
  - Football Build-up Strides;
  - Padel Sport-Specific Warm-up.
- Make the three-frame cycle respond to the existing speed, loop/pause, muscle, view, and reduced-motion states.
- Lazy-load preview media and keep every frame below the mobile asset budget.
- Load the active exercise at the correct priority, preload only the real next exercise, and record aggregate image load/decode telemetry without adding health data to telemetry.
- Correct preview overlay styling so cinematic badges and cues remain legible on a phone.

### Phase 3 — Discovery — complete

- Refined workout discovery without changing routes, session data, or start/resume behavior.
- Added real-session cinematic cards, Today’s Plan emphasis, and All/Gym/Home/Sport/Cardio filters.
- Reused first-exercise media from each real session and retained the activity logger, custom routines, weekly plan, safety tools, and program export.
- Moved program export below the workout library and made it progressively disclosed so it no longer blocks session selection on a phone.

### Phase 4 — Activity and Progress — not started

- Improve activity history, training trends, strength progress, recovery context, and goal visibility.
- Preserve current analytics definitions and data provenance.
- Avoid decorative charts that do not support a real decision.

### Phase 5 — Final polish — not started

- Extend refined transitions, loading states, preloading, haptics where supported, keyboard treatment, accessibility, and performance tuning.
- Complete device certification on modern iPhone and Android hardware.
- Continue replacing single-frame drift with consistent multi-frame motion for the remaining high-use exercises.

## Current implementation architecture

The redesign intentionally remains within the existing client architecture:

- `src/client/app.js` owns exercise-to-media mapping, workout rendering, timed mode, live set entry, rest previews, and completion UI.
- `src/client/styles.css` owns workout tokens, responsive layout, cinematic layering, keyframe cycles, safe areas, reduced motion, and component presentation.
- `src/client/index.html` contains the existing shell and rest-preview structure.
- `src/client/assets/cinematic/` contains optimized exercise-specific WebP media.
- `scripts/sync-static.mjs` continues to produce deterministic deployable assets in `dist/`.
- No new client framework, state store, animation library, or backend endpoint was introduced.

The multi-frame renderer uses three stacked optimized WebP frames and CSS opacity/transform cycles. It does not add a JavaScript animation loop. The first active frame receives high fetch priority; additional active frames load eagerly at low priority; preview frames remain lazy. Reduced-motion mode shows a stable first frame.

## Functionality explicitly preserved

- real sessions and exercise order;
- workout preview before starting;
- resume and active-session state;
- set completion and detailed set logs;
- weight, reps, RPE, notes, cloning, and progression guidance;
- exercise timer and rest timer;
- previous, next, swap, superset, and utility actions;
- technique, setup, execution, cue, and avoid content;
- workout completion, history, activity logging, and offline behavior;
- English/Arabic behavior and RTL support;
- accessibility semantics and reduced-motion behavior;
- deterministic source-to-`dist` build process.

## Intentional behavior changes

- Active workout now hides generic app chrome and opens at the workout progress header.
- Exercise media is full-bleed and exercise/context specific in side view.
- Front view continues to use the existing anatomical atlas.
- Thirteen priority exercises now animate through real pose keyframes instead of drifting a single image.
- The Program view now leads with filterable contextual workout cards backed by the existing sessions.
- Program export remains available below the session library in a compact disclosure.
- Ordinary exercise completion uses restrained micro-celebration; full celebration behavior remains available for larger milestones.
- Timed exercises use a dedicated focused timer surface.
- The primary action is larger, sticky, and thumb reachable.
- Final rest exposes the real upcoming exercise and can advance immediately.
- Completion provides a focused summary and links back to real history.

## Validation completed

- JavaScript syntax checks pass.
- Runtime configuration check passes.
- TypeScript typecheck passes.
- Server lint passes.
- 112 Node tests pass.
- 9 Cloudflare runtime tests pass.
- 178 end-to-end checks pass.
- End-to-end coverage includes discovery filters, preview-before-start, active workout hierarchy, current/next-only media loading, decode telemetry, set logging synchronization, timers, rest/next flow, completion/history, offline reload, accessibility, console errors, and reduced motion.
- Full real-player sessions pass for Gym, Morning Activation including Plank, Football including Build-up Strides, Padel including Sport-Specific Warm-up, and Treadmill Cardio including Incline Treadmill Walk.
- Active workout has no horizontal overflow at 320, 360, 375, 390, 414, 430 pixels.
- Primary navigation retains 44-pixel touch targets at all tested widths.
- Mobile performance during the final run: LCP 248 ms, CLS 0.000, longest application long task 0 ms.
- Headed visual QA was completed at 320 × 700, 390 × 844, and 430 × 932, plus active Gym, Football, and Padel captures at 390 × 844.
- Staging deploy completed at `https://rep-gym-companion-staging.mohamedahmedhosny95.workers.dev` (version `f1cf4ddc-64fd-4011-9b59-d81c865dd338`).
- Staging phone smoke passed with six real plans, decoded active media, one real next-exercise preload, zero media failures, and zero console errors.

## Known visual differences and limitations

- The references imply video-quality continuous movement. The current priority implementation uses optimized three-frame crossfades to keep the offline mobile experience lightweight.
- Thirteen priority exercises have true multi-frame cycles; lower-priority cinematic exercises still use a restrained single-frame drift.
- Muscle highlights are embedded in the generated media for the cinematic side view. The existing front anatomical atlas remains the interactive alternate view.
- Browser validation covers mobile viewport behavior, but physical-device checks are still recommended for safe-area nuances, thermal behavior, memory pressure, and haptic feel.

## Recommended next work

1. Certify the staging build on one recent iPhone and one recent Android flagship, including safe areas, memory pressure, thermal behavior, haptics, timers, offline recovery, and a complete workout.
2. Run the authenticated staging Notion contract when `REP_STAGING_SYNC_KEY` and `NOTION_TEST_TOKEN` are available locally; the deploy secrets are configured, but their values are intentionally not exported into the development shell.
3. Merge only after physical-device evidence is recorded and the staging contract passes.
4. Begin Phase 4 activity/progress refinement after that gate.
5. Continue to preserve the original architecture and all real state/data constraints above.
