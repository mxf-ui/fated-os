import assert from 'node:assert/strict';
import { hashPassword, isValidEmail, normalizeEmail, randomBase64, validatePassword } from '../functions/api/_lib/auth.js';

assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com');
assert.equal(isValidEmail('user@example.com'), true);
assert.equal(isValidEmail('bad-email'), false);
assert.equal(validatePassword('1234567'), false);
assert.equal(validatePassword('12345678'), true);
const salt = randomBase64(16);
const hash1 = await hashPassword('correct horse battery staple', salt);
const hash2 = await hashPassword('correct horse battery staple', salt);
const hash3 = await hashPassword('correct horse battery staple', randomBase64(16));
assert.equal(hash1, hash2);
assert.notEqual(hash1, hash3);
console.log('Cloud auth behavior verified.');

