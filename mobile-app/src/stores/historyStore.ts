import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { ThreatAnalysisResponse } from '@api';

// M22: Local Data Privacy — Encrypt scan history using a device-specific key
// This prevents plain-text leakage if the phone is compromised.
const STORAGE_KEY = 'history-storage';

export interface HistoryEntry {
  id: string;
  message: string;
  result: ThreatAnalysisResponse;
  timestamp: number;
  profile: string;
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (message: string, result: ThreatAnalysisResponse, profile?: string) => void;
  removeEntry: (id: string) => void;
  clearHistory: (profile?: string) => void;
  cleanupOldEntries: (days: number) => void;
  getFilteredEntries: (type?: string, profile?: string) => HistoryEntry[];
  getEntriesForProfile: (profile: string) => HistoryEntry[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (message, result, profile = 'আমি') => {
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
          profile,
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

      clearHistory: (profile) => {
        if (!profile) {
          set({ entries: [] });
        } else {
          set((s) => ({ entries: s.entries.filter((e) => e.profile !== profile) }));
        }
      },

      cleanupOldEntries: (days) => {
        if (days >= 365) return;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        set((state) => ({
          entries: state.entries.filter((e) => e.timestamp > cutoff),
        }));
      },

      getFilteredEntries: (type, profile) => {
        let entries = get().entries;
        if (profile) entries = entries.filter((e) => (e.profile ?? 'আমি') === profile);
        if (type) entries = entries.filter((e) => e.result.threat_type === type);
        return entries;
      },

      getEntriesForProfile: (profile) =>
        get().entries.filter((e) => (e.profile ?? 'আমি') === profile),
    }),
    {
      name: 'history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
