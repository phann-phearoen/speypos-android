import { scryptSync, timingSafeEqual } from 'crypto';

const SALT = 'spey-pos-salt'; // In a real app, this should come from env variables and be unique
const KEY_LENGTH = 64;

/**
 * Hashes a plain-text password using scrypt.
 * @param {string} password - The plain-text password.
 * @returns {string} The hashed password.
 */
export function hashPassword(password) {
  const hash = scryptSync(password, SALT, KEY_LENGTH);
  return hash.toString('hex');
}

/**
 * Verifies a plain-text password against a hash.
 * @param {string} password - The plain-text password to verify.
 * @param {string} hash - The stored hashed password.
 * @returns {boolean} True if the password is correct, false otherwise.
 */
export function verifyPassword(password, hash) {
  const newHash = scryptSync(password, SALT, KEY_LENGTH);
  const hashBuffer = Buffer.from(hash, 'hex');
  
  // Use timingSafeEqual to prevent timing attacks
  return timingSafeEqual(newHash, hashBuffer);
}
