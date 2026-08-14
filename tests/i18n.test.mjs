import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};
await import("../src/client/i18n.js");
const i18n = window.REP_I18N;

test("English and Arabic ui/session translations cover exactly the same keys", () => {
  // ar.exercises has no English counterpart by design - the exercise names used directly in
  // sessions.* already serve as the English text, only Arabic needs a name -> translation
  // lookup. ui and sessions must match exactly, or a key added to one language silently falls
  // back to English text for the other.
  const uiEn = Object.keys(i18n.en.ui).sort(), uiAr = Object.keys(i18n.ar.ui).sort();
  assert.deepEqual(uiAr, uiEn, "Arabic ui keys must match English ui keys exactly");

  const sessionsEn = Object.keys(i18n.en.sessions).sort(), sessionsAr = Object.keys(i18n.ar.sessions).sort();
  assert.deepEqual(sessionsAr, sessionsEn, "Arabic session keys must match English session keys exactly");
});

test("no ui or session translation is blank in either language", () => {
  for (const lang of ["en", "ar"]) {
    for (const [key, value] of Object.entries(i18n[lang].ui)) {
      assert.ok(String(value ?? "").trim().length > 0, `${lang}.ui.${key} must not be blank`);
    }
    for (const [key, entry] of Object.entries(i18n[lang].sessions)) {
      entry.forEach((value, index) => assert.ok(String(value ?? "").trim().length > 0, `${lang}.sessions.${key}[${index}] must not be blank`));
    }
  }
});

test("every Arabic exercise translation has a non-empty name, cues, and caution", () => {
  for (const [name, entry] of Object.entries(i18n.ar.exercises)) {
    assert.equal(entry.length, 5, `${name} should have [name, setup, move, cue, avoid]`);
    entry.forEach((value, index) => assert.ok(String(value ?? "").trim().length > 0, `ar.exercises["${name}"][${index}] must not be blank`));
  }
});
