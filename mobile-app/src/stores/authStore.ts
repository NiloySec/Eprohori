import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'eprohori.auth_token';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  xp: number;
  badge: string;
  reports: number;
  phone?: string;
  district?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;

  setAuth: (user: UserProfile, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: async (user, token) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        set({ user, token, isAuthenticated: true });
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      loadToken: async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          set({ token, isAuthenticated: true });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // C7: exclude actual JWT token from AsyncStorage — lives only in SecureStore
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { token: _t, ...rest } = state;
        return rest;
      },
    }
  )
);
