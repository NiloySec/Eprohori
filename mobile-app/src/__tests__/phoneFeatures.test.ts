import { analyzePhoneLocally, extractPhoneNumbers } from '../utils/phoneFeatures';

describe('analyzePhoneLocally', () => {
  it('recognizes a Grameenphone mobile number and formats it', () => {
    const r = analyzePhoneLocally('01712345678');
    expect(r.is_bd_number).toBe(true);
    expect(r.number_type).toBe('mobile');
    expect(r.operator).toBe('Grameenphone');
    expect(r.formatted).toBe('0171-234-5678');
    expect(r.risk_level).toBe('safe');
  });

  it('normalizes a +880-prefixed number the same as a local one', () => {
    const r = analyzePhoneLocally('+8801812345678');
    expect(r.is_bd_number).toBe(true);
    expect(r.operator).toBe('Robi');
    expect(r.number_type).toBe('mobile');
  });

  it('flags a non-BD international number as a warn-level risk', () => {
    const r = analyzePhoneLocally('+919876543210');
    expect(r.is_bd_number).toBe(false);
    expect(r.number_type).toBe('international');
    expect(r.risk_level).toBe('warn');
    expect(r.risk_signals.length).toBeGreaterThan(0);
  });

  it('recognizes a short code as safe', () => {
    const r = analyzePhoneLocally('16247');
    expect(r.number_type).toBe('short_code');
    expect(r.risk_level).toBe('safe');
  });

  it('recognizes a BD landline number', () => {
    const r = analyzePhoneLocally('0223456789');
    expect(r.number_type).toBe('landline');
    expect(r.risk_level).toBe('safe');
  });

  it('flags an unrecognized format as unknown/warn', () => {
    const r = analyzePhoneLocally('123abc');
    expect(r.number_type).toBe('unknown');
    expect(r.risk_level).toBe('warn');
  });
});

describe('extractPhoneNumbers', () => {
  it('extracts a BD mobile number embedded in Bengali SMS text', () => {
    const nums = extractPhoneNumbers('এই নম্বরে যোগাযোগ করুন 01712345678 ধন্যবাদ');
    expect(nums.some((n) => n.includes('01712345678'))).toBe(true);
  });

  it('returns an empty array when no phone number is present', () => {
    const nums = extractPhoneNumbers('কোনো নম্বর নেই এই বার্তায়');
    expect(nums).toEqual([]);
  });
});
