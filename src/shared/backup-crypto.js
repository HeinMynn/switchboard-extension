const iterations = 600000;
const maxBytes = 32 * 1024 * 1024;
const encode = bytes => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
};
function decode(value) {
  if (typeof value !== 'string' || value.length > maxBytes * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid backup file.');
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
async function key(password, salt) {
  if (typeof password !== 'string' || !password.length) throw new Error('Enter a password.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptBackup(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  if (plain.length > maxBytes) throw new Error('Backup exceeds the 32 MB limit.');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(password, salt), plain);
  return JSON.stringify({ version: 1, iterations, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) });
}
export async function decryptBackup(text, password) {
  if (typeof text !== 'string' || text.length > maxBytes * 2) throw new Error('Backup file is too large.');
  let envelope;
  try { envelope = JSON.parse(text); } catch { throw new Error('Invalid backup file.'); }
  if (!envelope || envelope.version !== 1 || envelope.iterations !== iterations) throw new Error('Unsupported backup format.');
  const salt = decode(envelope.salt), iv = decode(envelope.iv), ciphertext = decode(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > maxBytes + 16) throw new Error('Invalid backup file.');
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await key(password, salt), ciphertext); }
  catch (error) {
    if (error.name === 'OperationError') throw new Error('Incorrect password, or the backup file has been damaged.');
    throw error;
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)); }
  catch { throw new Error('Invalid backup contents.'); }
}
