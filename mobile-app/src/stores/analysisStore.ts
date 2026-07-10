import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThreatAnalysisResponse } from '@api';

interface AnalysisState {
  currentMessage: string;
  currentResult: ThreatAnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  sharedText: string;      // text received via share intent / deep link
  pendingSmsText: string;  // incoming SMS from RECEIVE_SMS BroadcastReceiver

  setMessage: (message: string) => void;
  setResult: (result: ThreatAnalysisResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAnalysis: () => void;
  setSharedText: (text: string) => void;
  consumeSharedText: () => string;
  setPendingSmsText: (text: string) => void;
  consumePendingSmsText: () => string;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      currentMessage: '',
      currentResult: null,
      isLoading: false,
      error: null,
      sharedText: '',
      pendingSmsText: '',

      setMessage: (message) => set({ currentMessage: message }),
      setResult: (result) => set({ currentResult: result, error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, currentResult: null }),
      clearAnalysis: () => set({ currentMessage: '', currentResult: null, error: null }),
      setSharedText: (text) => set({ sharedText: text }),
      consumeSharedText: (): string => {
        const text = get().sharedText;
        set({ sharedText: '' });
        return text;
      },
      setPendingSmsText: (text) => set({ pendingSmsText: text }),
      consumePendingSmsText: (): string => {
        const text = get().pendingSmsText;
        set({ pendingSmsText: '' });
        return text;
      },
    }),
    {
      name: 'analysis-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentMessage: state.currentMessage,
        currentResult: state.currentResult,
      }),
    }
  )
);
