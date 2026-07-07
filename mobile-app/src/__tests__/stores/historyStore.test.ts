import { useHistoryStore } from '../../stores/historyStore';

const mockResult = {
  threat_type: 'phishing' as const,
  confidence: 0.9,
  message: 'Phishing threat detected',
  solution_steps: ['Do not click the link'],
  prevention_tips: ['Verify sender'],
};

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clearHistory();
  });

  it('should start with empty entries', () => {
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('should add entry to history', () => {
    useHistoryStore.getState().addEntry('test message', mockResult);
    const entries = useHistoryStore.getState().entries;

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('test message');
    expect(entries[0].result).toEqual(mockResult);
    expect(entries[0].id).toBeDefined();
    expect(entries[0].timestamp).toBeDefined();
  });

  it('should add entries in reverse order (newest first)', () => {
    useHistoryStore.getState().addEntry('first', mockResult);
    useHistoryStore.getState().addEntry('second', mockResult);
    const entries = useHistoryStore.getState().entries;

    expect(entries[0].message).toBe('second');
    expect(entries[1].message).toBe('first');
  });

  it('should remove entry from history', () => {
    useHistoryStore.getState().addEntry('test', mockResult);
    const id = useHistoryStore.getState().entries[0].id;

    useHistoryStore.getState().removeEntry(id);
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('should clear all history', () => {
    useHistoryStore.getState().addEntry('test 1', mockResult);
    useHistoryStore.getState().addEntry('test 2', mockResult);
    expect(useHistoryStore.getState().entries).toHaveLength(2);

    useHistoryStore.getState().clearHistory();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('should filter entries by type', () => {
    const safeResult = { ...mockResult, threat_type: 'safe' as const, confidence: 0.1 };
    useHistoryStore.getState().addEntry('phishing msg', mockResult);
    useHistoryStore.getState().addEntry('safe msg', safeResult);

    const phishingOnly = useHistoryStore.getState().getFilteredEntries('phishing');
    expect(phishingOnly).toHaveLength(1);
    expect(phishingOnly[0].message).toBe('phishing msg');
  });

  it('should cap entries at 200', () => {
    for (let i = 0; i < 205; i++) {
      useHistoryStore.getState().addEntry(`message ${i}`, mockResult);
    }
    expect(useHistoryStore.getState().entries).toHaveLength(200);
  });
});
