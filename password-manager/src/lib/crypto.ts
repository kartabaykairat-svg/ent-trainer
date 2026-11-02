// Шифрование на стороне клиента: AES-256-GCM + PBKDF2-SHA-256.
// Ключ создаётся как non-extractable CryptoKey и живёт только в памяти.

export const KDF_ITERATIONS = 600_000;
const VERIFIER_PLAINTEXT = 'pm-vault-verifier-v1';
const PREFIX = 'v1:';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function newSalt(): string {
  return toB64(randomBytes(16));
}

export async function deriveKey(
  password: string,
  saltB64: string,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  if (iterations < KDF_ITERATIONS) throw new Error('Слишком мало итераций PBKDF2');
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Шифрует строку. aad привязывает шифртекст к записи (id пользователя + id записи). */
export async function encryptString(key: CryptoKey, plaintext: string, aad: string): Promise<string> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: enc.encode(aad) },
      key,
      enc.encode(plaintext),
    ),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return PREFIX + toB64(packed);
}

export async function decryptString(key: CryptoKey, payload: string, aad: string): Promise<string> {
  if (!payload.startsWith(PREFIX)) throw new Error('Неизвестный формат данных');
  const packed = fromB64(payload.slice(PREFIX.length));
  const iv = packed.subarray(0, 12);
  const ct = packed.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, ct);
  return dec.decode(pt);
}

export async function encryptJson(key: CryptoKey, value: unknown, aad: string): Promise<string> {
  return encryptString(key, JSON.stringify(value), aad);
}

export async function decryptJson<T>(key: CryptoKey, payload: string, aad: string): Promise<T> {
  return JSON.parse(await decryptString(key, payload, aad)) as T;
}

export function makeVerifier(key: CryptoKey, userId: string): Promise<string> {
  return encryptString(key, VERIFIER_PLAINTEXT, `${userId}:verifier`);
}

/** true, если ключ подходит (AES-GCM проверяет тег целостности). */
export async function checkVerifier(key: CryptoKey, verifier: string, userId: string): Promise<boolean> {
  try {
    return (await decryptString(key, verifier, `${userId}:verifier`)) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', enc.encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Равномерное случайное целое в [0, max) без смещения (rejection sampling). */
export function randomInt(max: number): number {
  if (max <= 0 || max > 2 ** 32) throw new Error('bad range');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}
