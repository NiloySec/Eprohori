import { analyzeUrlLocally } from '../utils/urlFeatures';

describe('analyzeUrlLocally', () => {
  it('flags non-URL input as is_url: false with no signals', () => {
    const r = analyzeUrlLocally('এইটা একটা সাধারণ বার্তা, লিংক না');
    expect(r.is_url).toBe(false);
    expect(r.domain).toBe('');
    expect(r.risk_signals).toEqual([]);
  });

  it('recognizes a clean HTTPS domain with no subdomains as low risk', () => {
    const r = analyzeUrlLocally('https://bkash.com/login');
    expect(r.is_url).toBe(true);
    expect(r.domain).toBe('bkash.com');
    expect(r.has_ssl).toBe(true);
    expect(r.is_direct_ip).toBe(false);
    expect(r.subdomain_count).toBe(0);
    expect(r.risk_signals).toEqual([]);
  });

  it('flags missing HTTPS', () => {
    const r = analyzeUrlLocally('http://example.com');
    expect(r.has_ssl).toBe(false);
    expect(r.risk_signals.some((s) => s.includes('HTTPS'))).toBe(true);
  });

  it('flags a direct IP address as a strong risk signal', () => {
    const r = analyzeUrlLocally('http://192.168.1.1/login');
    expect(r.is_direct_ip).toBe(true);
    expect(r.risk_signals.some((s) => s.includes('IP address'))).toBe(true);
  });

  it('does not count country-code SLDs (.com.bd) as an extra subdomain', () => {
    const r = analyzeUrlLocally('https://bkash.com.bd/login');
    expect(r.subdomain_count).toBe(0);
  });

  it('flags 3+ subdomains as a phishing pattern', () => {
    const r = analyzeUrlLocally('https://secure.login.verify.bkash-fake.com/');
    expect(r.subdomain_count).toBeGreaterThanOrEqual(3);
    expect(r.risk_signals.some((s) => s.includes('ফিশিং'))).toBe(true);
  });

  it('returns a safe empty-ish result for a malformed URL rather than throwing', () => {
    const r = analyzeUrlLocally('https://');
    expect(r.is_url).toBe(true);
    expect(r.domain).toBe('');
    expect(r.risk_signals).toEqual([]);
  });
});
