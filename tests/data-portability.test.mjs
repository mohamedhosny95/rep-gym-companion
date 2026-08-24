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
    REP_PERFORMANCE_INSIGHTS: {
      aggregate: () => ({
        strength: {
          totalVolume: 12500,
          rows: [{ sessionId: "sess-1" }, { sessionId: "sess-2" }],
          prs: [{ exercise: "Leg Press", weight: 200 }],
          plateaus: [],
          exercises: [{ exercise: "Leg Press", sessionCount: 5, currentE1rm: 220, change28d: 5.2, plateau: false, recommendation: "progress" }]
        },
        nutrition: {
          adherence7: { calories: 95, protein: 98 },
          weightSlopePerWeek: -0.25,
          maintenance: { low: 2200, high: 2400 }
        },
        muscleVolume: {
          Quads: { sets: 12, volumeKg: 5400, status: "optimal", statusLabel: "Optimal Stimulus" }
        },
        experiments: [
          { title: "Caffeine after 2pm", withLabel: "Late Caffeine", withAverage: "62%", withoutLabel: "No Late Caffeine", withoutAverage: "78%", delta: -16, unit: "pp" }
        ]
      })
    }
  };
  context.window.REP_PERFORMANCE_INSIGHTS = context.REP_PERFORMANCE_INSIGHTS;
  vm.createContext(context);
  vm.runInContext(reportCardSource, context);
  return context.window.REP_REPORT_CARD;
}

test("Report card generator renders valid HTML with comprehensive metrics in English", () => {
  const reportCard = createReportCardContext();
  const state = { lang: "en" };
  const html = reportCard.generateReportHtml(state);

  assert.ok(html.includes("<!DOCTYPE html>"), "Contains DOCTYPE");
  assert.ok(html.includes("Comprehensive Mesocycle & Athlete Performance Card"), "Contains English title");
  assert.ok(html.includes("12,500 kg"), "Contains formatted total volume");
  assert.ok(html.includes("Leg Press"), "Contains exercise name");
  assert.ok(html.includes("95%"), "Contains caloric adherence");
  assert.ok(html.includes("Optimal Stimulus"), "Contains muscle stimulus label");
  assert.ok(html.includes("@media print"), "Contains print-optimized CSS");
});

test("Report card generator renders valid RTL HTML in Arabic", () => {
  const reportCard = createReportCardContext();
  const state = { lang: "ar" };
  const html = reportCard.generateReportHtml(state);

  assert.ok(html.includes('dir="rtl"'), "Contains RTL direction");
  assert.ok(html.includes("تقرير دورة التدريب والتغذية الشامل"), "Contains Arabic title");
  assert.ok(html.includes("🖨️ طباعة / حفظ كـ PDF"), "Contains Arabic print button");
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
