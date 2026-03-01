// Shared AES-GCM encryption utilities for API key storage

const CRYPTO_KEY_STORAGE = 'sm-llm-ck';

/** Get or create a per-browser encryption key (stored in localStorage as JWK) */
export async function getCryptoKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(CRYPTO_KEY_STORAGE);
  if (stored) {
    const jwk = JSON.parse(stored);
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(CRYPTO_KEY_STORAGE, JSON.stringify(jwk));
  return key;
}

export async function encryptString(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptString(encrypted: string): Promise<string | null> {
  try {
    const key = await getCryptoKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
