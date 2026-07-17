import { analyzeUrlLocally } from '../urlFeatures';

describe('analyzeUrlLocally', () => {
  it('treats non-URL text as not a URL', () => {
    const result = analyzeUrlLocally('আপনার bKash পিন দিন');
    expect(result.is_url).toBe(false);
  });

  it('flags a direct-IP URL as a risk signal', () => {
    const result = analyzeUrlLocally('http://192.168.1.5/login');
    expect(result.is_url).toBe(true);
    expect(result.is_direct_ip).toBe(true);
    expect(result.risk_signals.some((s) => s.includes('IP address'))).toBe(true);
  });

  it('flags non-HTTPS URLs as a risk signal', () => {
    const result = analyzeUrlLocally('http://bkash-verify.xyz');
    expect(result.has_ssl).toBe(false);
    expect(result.risk_signals.some((s) => s.includes('HTTPS নেই'))).toBe(true);
  });

  it('does not flag a normal HTTPS domain', () => {
    const result = analyzeUrlLocally('https://www.bkash.com');
    expect(result.has_ssl).toBe(true);
    expect(result.is_direct_ip).toBe(false);
    expect(result.risk_signals).toHaveLength(0);
  });

  it('counts country-code second-level domains correctly (bkash.com.bd has 0 subdomains)', () => {
    const result = analyzeUrlLocally('https://www.bkash.com.bd');
    // www + bkash.com.bd (3-part registrable domain) → 1 subdomain, not 2
    expect(result.subdomain_count).toBe(1);
  });

  it('flags deeply nested subdomains as a phishing pattern', () => {
    const result = analyzeUrlLocally('https://secure.login.verify.bkash-support.xyz');
    expect(result.subdomain_count).toBeGreaterThanOrEqual(3);
    expect(result.risk_signals.some((s) => s.includes('ফিশিং প্যাটার্ন'))).toBe(true);
  });

  it('returns a safe empty-features object for malformed input', () => {
    const result = analyzeUrlLocally('https://');
    expect(result.is_url).toBe(true);
    expect(result.risk_signals).toEqual([]);
  });
});
