# AWJ performance redesign

The performance design system lives in `src/client/awj-theme.css`. It supplies the shared charcoal and light palettes, semantic health colors, cards, controls and navigation selection. The legacy structural stylesheet no longer owns a competing palette or a translated navigation indicator.

## Appearance and navigation

`AWJ_APPEARANCE.normalize()` performs an idempotent appearance migration to version 1. Existing stored theme identifiers remain compatible: `oled` means Dark and `default` means Light. Migration selects Dark once; subsequent Light choices persist. Language, units, accent, schedules, targets and other preferences survive the migration. Storage keys, backup formats and backend contracts remain unchanged.

Home presents Sleep, Recovery and Strain before core vitals, a compact recommendation, the workout and logged nutrition/water. Daily habits expand from a compact summary. Health detail routes are `/wellbeing/sleep`, `/wellbeing/recovery` and `/wellbeing/strain`; existing aliases remain supported. Every health detail selects Wellbeing in both the desktop rail and mobile navigation.

The selected navigation background and marker belong to the selected button. They do not depend on a fixed button height or translation distance. Page/exercise/sheet motion remains cancellable. Ring entrance motion runs on route entry, never on data logging. Reduced motion disables CSS motion and cancels active browser animations when the preference changes. Deferred heading focus yields to an open modal.

## Health-summary contract

`AWJ_HEALTH_SUMMARY.daily(state, date, profile, now)` provides the same values to Home and health details. `measurement()` provides nullable values with unit, measurement date, source, import timestamp, freshness and confidence. The public shape is documented by `HealthMetric` in `src/client/screens/contracts.ts`. `series()` returns calendar-day observations including null gaps; `average()` excludes those gaps and retains explicit zeros.

- Sleep and Recovery use the existing sleep-need/readiness calculations. Sleep arcs cap at 100% even if recorded sleep exceeds the calculated target.
- Strain uses the existing 0–21 calculation. It requires usable energy or logged-workout inputs. Steps alone cannot produce strain. Workout-only estimates are marked partial.
- Numeric zero is valid for activity, but null, empty strings, invalid values and absent inputs are unavailable. Heart/sleep values use their existing supported ranges.
- Today's rings never borrow an older reading. Core vitals can show a previous reading only with its date, source and previous-reading label.
- Health freshness uses health import metadata, not general record-sync timestamps. Manual readings retain their source even when other measurements were imported on the same day.
- Data completeness is shown separately from recovery confidence and baseline calibration.

The health detail screen exposes trends, baselines and completeness directly. Imports, connection tools, charging configuration and the optional encrypted photo vault remain available in the secondary setup area. Existing sleep, energy, measurement and recovery forms retain their domain persistence/sync handlers.

## Verification

Run the normal source build and checks:

```sh
npm run sync
npm run verify
npm run test:e2e
npm run test:layout
npm run test:recovery
```

Older Node 22 installations may require `NODE_OPTIONS=--experimental-strip-types` for this repository's existing TypeScript imports.

Set `AWJ_E2E_THEME=light` to exercise the complete browser regression in the optional light theme.

`npm run test:redesign` also runs the dedicated synthetic-data certification independently. It checks five viewport sizes, both navigation directions, both themes, linked metric consistency, visible health information, missing/zero activity, repeat logging, modal focus, reduced motion, offline reload and WCAG accessibility. `test:layout` includes this certification after the existing cold phone-orientation audit. Set `AWJ_REDESIGN_CAPTURE_DIR` to choose the screenshot/report output directory. Screenshots from that suite contain synthetic demonstration data.

This change is prepared for local review. Deployment and remote Git operations are separate release actions.
