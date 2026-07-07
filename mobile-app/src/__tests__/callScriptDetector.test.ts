import { analyzeCallScript } from '../utils/callScriptDetector';

describe('analyzeCallScript', () => {
  it('returns a safe/low score for ordinary conversation text', () => {
    const r = analyzeCallScript('আজকে আবহাওয়া কেমন? সন্ধ্যায় দেখা হবে।');
    expect(r.level).toBe('safe');
    expect(r.matches).toEqual([]);
  });

  it('flags an OTP-request script as a strong match', () => {
    const r = analyzeCallScript('স্যার আপনার OTP কোডটা এখনই বলুন, যাচাই করতে হবে।');
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches.some((m) => m.label_bn.includes('OTP'))).toBe(true);
  });

  it('classifies a multi-pattern fraud script as danger level', () => {
    const r = analyzeCallScript(
      'আমি বিকাশ কাস্টমার কেয়ার থেকে বলছি, আপনার একাউন্ট বন্ধ হয়ে যাবে, এখনই আপনার পিন কোডটা দিন।'
    );
    expect(r.level).toBe('danger');
    expect(r.score).toBeGreaterThan(0);
    expect(r.matches.length).toBeGreaterThanOrEqual(2);
  });

  it('always returns advice text matching the detected level', () => {
    const safe = analyzeCallScript('হ্যালো, কেমন আছেন?');
    const danger = analyzeCallScript('পুলিশ থেকে বলছি, আপনার নামে মামলা হয়েছে, এখনই টাকা পাঠান।');
    expect(safe.advice_bn.length).toBeGreaterThan(0);
    expect(danger.advice_bn.length).toBeGreaterThan(0);
    expect(safe.advice_bn).not.toEqual(danger.advice_bn);
  });
});
