import { describe, expect, it } from 'vitest';
import { hashCredential, verifyCredential } from '../../utils/credentialHash';

describe('credential hashing', () => {
  it('hashes and verifies a credential without storing it in the encoded hash', async () => {
    const credential = '1234567890';
    const hash = await hashCredential(credential);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(credential);
    await expect(verifyCredential(hash, credential)).resolves.toBe(true);
    await expect(verifyCredential(hash, 'wrong-credential')).resolves.toBe(false);
  });

  it('fails closed for missing or malformed hashes', async () => {
    await expect(verifyCredential('', '1234567890')).resolves.toBe(false);
    await expect(verifyCredential('not-an-argon2-hash', '1234567890')).resolves.toBe(false);
  });
});
