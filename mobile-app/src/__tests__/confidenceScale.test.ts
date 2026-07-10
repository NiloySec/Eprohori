/**
 * Regression tests for the confidence-scale contract.
 *
 * EProhori has two unrelated "confidence" conventions that look similar but
 * are NOT interchangeable:
 *   - ThreatAnalysisResponse.confidence  → 0-100
 *   - SmsCategoryInfo.confidence (categorizeSms) and spam score (calcSpamScore) → 0-1
 *
 * A real bug shipped because a screen treated the 0-100 value as 0-1 and
 * multiplied by 100 again (87% displayed as 8700%). These tests pin the
 * scale of each so a future change that breaks the contract fails CI
 * instead of silently shipping a wrong percentage.
 */
import { threatAnalysisAPI } from '../api/threatAnalysis';
import { categorizeSms } from '../utils/smsCategories';
import { calcSpamScore } from '../stores/spamNumberStore';
import type { SpamReport } from '../stores/spamNumberStore';

describe('confidence scale contract', () => {
  it('ThreatAnalysisResponse.confidence (local fallback) is 0-100, not 0-1', () => {
    const threatResult = threatAnalysisAPI.localAnalysisFallback(
      'আপনার বিকাশ পিন কোড শেয়ার করুন OTP: 123456',
      'bn'
    );
    expect(threatResult.confidence).toBeGreaterThan(1); // would be <=1 if scale were 0-1
    expect(threatResult.confidence).toBeLessThanOrEqual(100);

    const safeResult = threatAnalysisAPI.localAnalysisFallback('ডাক্তার সাহেব আসছেন', 'bn');
    expect(safeResult.confidence).toBeGreaterThanOrEqual(0);
    expect(safeResult.confidence).toBeLessThanOrEqual(100);
  });

  it('categorizeSms confidence is 0-1, not 0-100', () => {
    const { confidence } = categorizeSms('অভিনন্দন! আপনি ৫ লক্ষ টাকা লটারি জিতেছেন।');
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('calcSpamScore is 0-1, not 0-100', () => {
    const reports: SpamReport[] = Array.from({ length: 10 }, () => ({
      category: 'threat', note: '', reported_at: Date.now(),
    }));
    const score = calcSpamScore(reports);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('a synthetic blocklist-match ThreatAnalysisResponse must use 100, not 1.0', () => {
    // Documents the exact bug that shipped: screens built a fake
    // ThreatAnalysisResponse for blocklist hits. Using confidence: 1.0
    // (correct for the 0-1 convention) instead of 100 (correct for this
    // type) made Math.round(1.0 * 100) coincidentally show 100%, hiding
    // the scale bug for every OTHER (real API) result on the same screen.
    const blocklistMatch = { threat_type: 'scam' as const, confidence: 100 };
    expect(Math.round(blocklistMatch.confidence)).toBe(100);
    // The bug pattern: treating it as 0-1 and re-multiplying would give 10000%
    expect(Math.round(blocklistMatch.confidence * 100)).not.toBe(100);
  });
});
