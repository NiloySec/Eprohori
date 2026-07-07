import { useAnalysisStore } from '../../stores/analysisStore';

describe('analysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.getState().clearAnalysis();
  });

  it('should set message', () => {
    useAnalysisStore.getState().setMessage('test message');
    expect(useAnalysisStore.getState().currentMessage).toBe('test message');
  });

  it('should set result', () => {
    const mockResult = {
      threat_type: 'phishing' as const,
      confidence: 0.9,
      message: 'This is a phishing attempt',
      solution_steps: ['Do not click the link'],
      prevention_tips: ['Verify sender'],
    };

    useAnalysisStore.getState().setResult(mockResult);
    expect(useAnalysisStore.getState().currentResult).toEqual(mockResult);
    expect(useAnalysisStore.getState().error).toBeNull();
  });

  it('should set loading state', () => {
    useAnalysisStore.getState().setLoading(true);
    expect(useAnalysisStore.getState().isLoading).toBe(true);

    useAnalysisStore.getState().setLoading(false);
    expect(useAnalysisStore.getState().isLoading).toBe(false);
  });

  it('should set error', () => {
    useAnalysisStore.getState().setError('Network error');
    expect(useAnalysisStore.getState().error).toBe('Network error');
    expect(useAnalysisStore.getState().currentResult).toBeNull();
  });

  it('should clear analysis', () => {
    useAnalysisStore.getState().setMessage('test');
    useAnalysisStore.getState().setError('some error');
    useAnalysisStore.getState().clearAnalysis();

    expect(useAnalysisStore.getState().currentMessage).toBe('');
    expect(useAnalysisStore.getState().currentResult).toBeNull();
    expect(useAnalysisStore.getState().error).toBeNull();
  });
});
