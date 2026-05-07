import { generateOtp, generateSecureToken, sha256, hashOtp } from './crypto';

describe('generateOtp', () => {
  it('generates a 6-digit OTP by default', () => {
    const otp = generateOtp(6);
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('generates a 4-digit OTP when length is 4', () => {
    const otp = generateOtp(4);
    expect(otp).toHaveLength(4);
    expect(/^\d{4}$/.test(otp)).toBe(true);
  });

  it('returns a numeric string', () => {
    const otp = generateOtp(6);
    expect(typeof otp).toBe('string');
    expect(isNaN(Number(otp))).toBe(false);
  });

  it('pads with leading zeros when necessary to maintain length', () => {
    // Run multiple times to have confidence the padding works
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp(6);
      expect(otp).toHaveLength(6);
    }
  });
});

describe('generateSecureToken', () => {
  it('returns a 64-character hex string (32 bytes default)', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
  });

  it('generates unique tokens on each call', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it('returns correct length for custom byte count', () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });
});

describe('sha256', () => {
  it('returns consistent output for the same input', () => {
    const hash1 = sha256('hello');
    const hash2 = sha256('hello');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different inputs', () => {
    expect(sha256('hello')).not.toBe(sha256('world'));
  });

  it('returns a 64-character hex string', () => {
    const hash = sha256('test input');
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it('returns the correct SHA-256 hash for known input', () => {
    // SHA-256 of "hello" is well-known
    expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('hashOtp', () => {
  it('produces a hash string', () => {
    const hash = hashOtp('123456', 'some-salt');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('produces different hash for different salt with same OTP', () => {
    const hash1 = hashOtp('123456', 'salt-a');
    const hash2 = hashOtp('123456', 'salt-b');
    expect(hash1).not.toBe(hash2);
  });

  it('produces different hash for different OTP with same salt', () => {
    const hash1 = hashOtp('111111', 'salt');
    const hash2 = hashOtp('999999', 'salt');
    expect(hash1).not.toBe(hash2);
  });

  it('produces consistent hash for same OTP and salt', () => {
    const hash1 = hashOtp('654321', 'my-salt');
    const hash2 = hashOtp('654321', 'my-salt');
    expect(hash1).toBe(hash2);
  });
});
