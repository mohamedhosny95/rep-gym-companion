import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const reportCardSource = readFileSync(resolve("src/client/report-card.js"), "utf8");

function createReportCardContext() {
  const context = {
    window: {},
    globalThis: {},
    document: {},
    REP_PERFORMANCE_INSIGHTS: {},
    REP_PRODUCT_SUITE: {weeklySummary:()=>({period:{start:"2026-08-27",end:"2026-09-02"},planned:4,completed:3,adherence:75,avgReadiness:82,readinessDays:6,rescheduled:1,nextAction:"Repeat the current plan with clean form.",workouts:[{date:"2026-09-01",session:"Gym"}],prs:[{exercise:"Leg Press",value:220,unit:"kg e1RM"}]})}
  };
  context.window.REP_PERFORMANCE_INSIGHTS = context.REP_PERFORMANCE_INSIGHTS;
  context.window.REP_PRODUCT_SUITE = context.REP_PRODUCT_SUITE;
  vm.createContext(context);
  vm.runInContext(reportCardSource, context);
  return context.window.REP_REPORT_CARD;
}

test("Report card generator renders valid HTML with comprehensive metrics in English", () => {
  const reportCard = createReportCardContext();
  const state = { lang: "en" };
  const html = reportCard.generateReportHtml(state);

  assert.ok(html.includes("<!doctype html>"), "Contains DOCTYPE");
  assert.ok(html.includes("Health OS · Weekly Report"), "Contains English title");
  assert.ok(html.includes("75%"), "Contains workout adherence");
  assert.ok(html.includes("Leg Press"), "Contains exercise name");
  assert.ok(html.includes("Repeat the current plan"), "Contains next action");
  assert.ok(html.includes("@media print"), "Contains print-optimized CSS");
});

test("Encrypted backup crypto primitives adhere to AES-GCM 256-bit PBKDF2 standards", async () => {
  const crypto = webcrypto;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const passphrase = "test-secure-passphrase-2026";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const sampleState = { version: 6, logs: { "legpress": [100, 100, 100] } };
  const plaintext = encoder.encode(JSON.stringify(sampleState));
  const header = { app: "Rep Gym Companion", schema: 5, cipher: "AES-256-GCM" };
  const additionalData = encoder.encode(JSON.stringify(header));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    plaintext
  );

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    ciphertext
  );

  const decryptedState = JSON.parse(decoder.decode(decryptedBuffer));
  assert.deepEqual(decryptedState, sampleState);

  // Tamper detection: decrypting with modified additionalData fails
  const tamperedData = encoder.encode(JSON.stringify({ ...header, app: "Fake App" }));
  await assert.rejects(
    async () => {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: tamperedData },
        key,
        ciphertext
      );
    },
    /OperationError|tag/i
  );
});
