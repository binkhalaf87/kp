// Single shared-password auth, no user accounts and no database:
// - The password lives only in the DASHBOARD_PASSWORD env var on Vercel.
// - A signed, expiring session token is stored in an httpOnly cookie.
// - The signature key is derived from the password itself (namespaced),
//   so no separate secret needs to be configured.
// Uses Web Crypto (available in both the Edge middleware runtime and
// Node 18+) rather than Node's `crypto` module, so it works in either.

const SESSION_COOKIE_NAME = "kp_dashboard_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function getSigningKey(): Promise<CryptoKey> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) throw new Error("DASHBOARD_PASSWORD is not set");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`kp-dashboard-session:${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  return candidate === expected;
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = encoder.encode(String(expiresAt));
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return `${toBase64Url(payload.buffer as ArrayBuffer)}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return false;
  try {
    const key = await getSigningKey();
    const payloadBytes = fromBase64Url(payloadPart);
    const sigBytes = fromBase64Url(sigPart);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      payloadBytes.buffer as ArrayBuffer
    );
    if (!valid) return false;
    const expiresAt = Number(decoder.decode(payloadBytes));
    return Number.isFinite(expiresAt) && Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export { SESSION_COOKIE_NAME };
