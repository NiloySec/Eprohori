import { categorizeSms } from '../smsCategories';

describe('categorizeSms', () => {
  it('returns unknown/0-confidence for ordinary conversational text', () => {
    const result = categorizeSms('আজ বিকেলে চা খেতে আসবেন?');
    expect(result.category).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('detects OTP-theft social engineering (asking the user to share an OTP)', () => {
    const result = categorizeSms('Share your OTP with our agent to verify your account');
    expect(result.category).toBe('otp_theft');
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
  });

  it('detects fake bKash PIN-theft messages', () => {
    const result = categorizeSms('Your bKash pin is required immediately or your account will be locked');
    expect(result.category).toBe('mfs_fraud');
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
  });

  it('keeps confidence within the valid 0-1 range for any input', () => {
    const samples = [
      '',
      'a'.repeat(5000), // exercises the 2KB truncation guard
      'বিকাশে ৫০০ টাকা পেয়েছেন',
      'URGENT: verify your account now http://bkash-verify.xyz',
    ];
    for (const s of samples) {
      const result = categorizeSms(s);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
