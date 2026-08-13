import { logEvent } from "../observability";

export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

type PushEnvironment = {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY_JWK?: string;
  VAPID_SUBJECT?: string;
};

type CachedJwt = { jwt: string; exp: number };
const jwtCache = new Map<string, CachedJwt>();
const encoder = new TextEncoder();

function cryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function b64urlEncode(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(arrays.reduce((total, value) => total + value.length, 0));
  let offset = 0;
  for (const value of arrays) { result.set(value, offset); offset += value.length; }
  return result;
}

async function hmacSha256(keyBytes: Uint8Array, dataBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", cryptoBytes(keyBytes), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, cryptoBytes(dataBytes)));
}

async function vapidAuthorization(env: PushEnvironment, audience: string): Promise<string> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY_JWK) throw new Error("Web Push is not configured.");
  const cacheKey = `${audience}\n${env.VAPID_PUBLIC_KEY}`;
  const cached = jwtCache.get(cacheKey);
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.jwt;
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_KEY_JWK) as JsonWebKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(encoder.encode(JSON.stringify({ aud: audience, exp, sub: env.VAPID_SUBJECT || "mailto:admin@example.com" })));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned)));
  const jwt = `vapid t=${unsigned}.${b64urlEncode(signature)}, k=${env.VAPID_PUBLIC_KEY}`;
  jwtCache.set(cacheKey, { jwt, exp });
  if (jwtCache.size > 8) jwtCache.delete(jwtCache.keys().next().value as string);
  return jwt;
}

async function encryptPayload(subscription: StoredPushSubscription, payload: Record<string, unknown>): Promise<Uint8Array> {
  const userPublicRaw = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);
  if (userPublicRaw.length !== 65 || userPublicRaw[0] !== 4 || authSecret.length < 16) throw new Error("Invalid Web Push key material.");

  const applicationKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const applicationPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", applicationKeys.publicKey) as ArrayBuffer);
  const userPublicKey = await crypto.subtle.importKey("raw", cryptoBytes(userPublicRaw), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const deriveAlgorithm = { name: "ECDH", public: userPublicKey } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(deriveAlgorithm, applicationKeys.privateKey, 256));
  const pseudoRandomKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(encoder.encode("WebPush: info\0"), userPublicRaw, applicationPublicRaw);
  const inputKeyMaterial = await hmacSha256(pseudoRandomKey, concatBytes(keyInfo, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pseudoRandom = await hmacSha256(salt, inputKeyMaterial);
  const contentKey = (await hmacSha256(pseudoRandom, concatBytes(encoder.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmacSha256(pseudoRandom, concatBytes(encoder.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const plaintext = concatBytes(encoder.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const key = await crypto.subtle.importKey("raw", cryptoBytes(contentKey), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: cryptoBytes(nonce) }, key, cryptoBytes(plaintext)));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  return concatBytes(salt, recordSize, new Uint8Array([65]), applicationPublicRaw, ciphertext);
}

export async function sendWebPush(env: PushEnvironment, subscription: StoredPushSubscription, payload: Record<string, unknown>): Promise<Response> {
  const startedAt = Date.now();
  const body = await encryptPayload(subscription, payload);
  const origin = new URL(subscription.endpoint).origin;
  const authorization = await vapidAuthorization(env, origin);
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: { authorization, "content-type": "application/octet-stream", "content-encoding": "aes128gcm", ttl: "86400" },
      body: body.buffer as ArrayBuffer,
      signal: AbortSignal.timeout(10_000)
    });
    logEvent(response.ok ? "info" : "warn", "push_delivery_completed", { providerOrigin: origin, status: response.status, durationMs: Date.now() - startedAt });
    return response;
  } catch (error) {
    logEvent("error", "push_delivery_failed", { providerOrigin: origin, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message.slice(0, 160) : "Unknown error" });
    throw error;
  }
}
