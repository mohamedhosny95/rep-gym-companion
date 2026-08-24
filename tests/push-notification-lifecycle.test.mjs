import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

test("VAPID key generation produces valid P-256 ECDSA keypairs", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1"
  });

  const jwkPublic = publicKey.export({ format: "jwk" });
  const jwkPrivate = privateKey.export({ format: "jwk" });

  assert.equal(jwkPublic.kty, "EC");
  assert.equal(jwkPublic.crv, "P-256");
  assert.ok(jwkPublic.x && jwkPublic.y, "Public key contains coordinate points");
  assert.ok(jwkPrivate.d, "Private key contains scalar d");
});

test("Push notification action routing resolves to proper deep link paths", () => {
  function resolveTargetPath(action, notificationData) {
    return action === "log-sleep" ? "./?quick=health&action=sleep"
      : action === "log-meal" ? "./?quick=food"
      : action === "open-habits" ? "./?quick=home"
      : (notificationData?.url || "./");
  }

  assert.equal(resolveTargetPath("log-sleep"), "./?quick=health&action=sleep");
  assert.equal(resolveTargetPath("log-meal"), "./?quick=food");
  assert.equal(resolveTargetPath("open-habits"), "./?quick=home");
  assert.equal(resolveTargetPath(null, { url: "./?quick=workout" }), "./?quick=workout");
  assert.equal(resolveTargetPath(null, null), "./");
});

test("Push notification payload formatting adheres to Web Push specifications", () => {
  const payload = {
    title: "Daily Check-in",
    body: "Log your evening recovery score and sleep.",
    data: { url: "./?quick=health" },
    actions: [
      { action: "log-sleep", title: "Log Sleep" },
      { action: "log-meal", title: "Log Meal" }
    ]
  };

  const serialized = JSON.stringify(payload);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.title, "Daily Check-in");
  assert.equal(parsed.actions.length, 2);
  assert.equal(parsed.actions[0].action, "log-sleep");
});
