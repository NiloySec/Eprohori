import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThreatAnalysisResponse } from '@api';
import { encryptData, decryptData } from '../utils/encryption';

// M22: Local Data Privacy — Encrypted storage engine
const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(name);
    if (!value) return null;
    try {
      return await decryptData(value);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encryptData(value);
    await AsyncStorage.setItem(name, encrypted);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

export interface HistoryEntry {
  id: string;
  message: string;
  result: ThreatAnalysisResponse;
  timestamp: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (message: string, result: ThreatAnalysisResponse) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  cleanupOldEntries: (days: number) => void;
  getFilteredEntries: (type?: string) => HistoryEntry[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (message, result) => {
        // M13: cap entry size to prevent AsyncStorage bloat
        const safeMessage = message.slice(0, 2000);
        const safeResult: typeof result = {
          ...result,
          message:         (result.message ?? '').slice(0, 500),
          solution_steps:  (result.solution_steps ?? []).slice(0, 10),
          prevention_tips: (result.prevention_tips ?? []).slice(0, 10),
        };
        // L9: collision-resistant ID — two randoms give ~48 bits of entropy
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
        const entry: HistoryEntry = {
          id:        uid,
          message:   safeMessage,
          result:    safeResult,
          timestamp: Date.now(),
        };
        set((state) => ({
          entries: [entry, ...state.entries].slice(0, 200),
        }));
      },

      removeEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      clearHistory: () => {
        set({ entries: [] });
      },

      cleanupOldEntries: (days) => {
        if (days >= 365) return;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        set((state) => ({
          entries: state.entries.filter((e) => e.timestamp > cutoff),
        }));
      },

      getFilteredEntries: (type) => {
        let entries = get().entries;
        if (type) entries = entries.filter((e) => e.result.threat_type === type);
        return entries;
      },
    }),
    {
      name: 'history-storage',
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
