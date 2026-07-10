import { analyzeQrContent } from '../utils/qrAnalyzer';

describe('analyzeQrContent', () => {
  it('classifies an official bKash URL as safe', () => {
    const r = analyzeQrContent('https://bkash.com/pay/12345');
    expect(r.kind).toBe('url');
    expect(r.risk).toBe('safe');
    expect(r.signals.some((s) => s.includes('অফিসিয়াল'))).toBe(true);
  });

  it('flags a fake bKash-lookalike domain as dangerous phishing', () => {
    const r = analyzeQrContent('https://bkash-secure-verify.xyz/login');
    expect(r.kind).toBe('url');
    expect(r.risk).toBe('danger');
    expect(r.signals.some((s) => s.includes('ভুয়া ডোমেইন'))).toBe(true);
  });

  it('flags an APK download link as dangerous', () => {
    const r = analyzeQrContent('https://example.com/app.apk');
    expect(r.risk).toBe('danger');
    expect(r.signals.some((s) => s.includes('ম্যালওয়্যার'))).toBe(true);
  });

  it('flags a shortened link as at least suspicious', () => {
    const r = analyzeQrContent('https://bit.ly/abc123');
    expect(r.risk).not.toBe('safe');
    expect(r.signals.some((s) => s.includes('শর্ট লিংক'))).toBe(true);
  });

  it('recognizes an EMVCo bKash merchant payment QR as safe', () => {
    const r = analyzeQrContent('000201010212bkash.com.bd merchant payload');
    expect(r.kind).toBe('payment');
    expect(r.risk).toBe('safe');
    expect(r.signals.some((s) => s.includes('bKash মার্চেন্ট'))).toBe(true);
  });

  it('classifies a tel: URI as a phone kind', () => {
    const r = analyzeQrContent('tel:+8801712345678');
    expect(r.kind).toBe('phone');
  });

  it('classifies a WIFI: QR as suspicious', () => {
    const r = analyzeQrContent('WIFI:S:SomeNetwork;T:WPA;P:password123;;');
    expect(r.kind).toBe('wifi');
    expect(r.risk).toBe('suspicious');
  });

  it('falls back to plain text for unrecognized content', () => {
    const r = analyzeQrContent('just some random text');
    expect(r.kind).toBe('text');
    expect(r.risk).toBe('safe');
  });
});
