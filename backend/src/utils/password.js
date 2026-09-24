import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);

  return `scrypt:${salt.toString('hex')}:${Buffer.from(derivedKey).toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, saltHex, hashHex] = storedHash.split(':');

  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;

  const expectedHash = Buffer.from(hashHex, 'hex');
  const actualHash = Buffer.from(
    await scryptAsync(password, Buffer.from(saltHex, 'hex'), expectedHash.length),
  );

  return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
}
