import argon2 from 'argon2';

const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
});

export function hashCredential(value) {
  return argon2.hash(String(value), ARGON2_OPTIONS);
}

export async function verifyCredential(hash, value) {
  if (!hash || !value) return false;
  try {
    return await argon2.verify(String(hash), String(value), {
      type: argon2.argon2id,
    });
  } catch {
    return false;
  }
}
