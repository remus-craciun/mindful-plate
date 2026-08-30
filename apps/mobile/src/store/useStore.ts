import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

const TOKEN_STORAGE_KEY = '@mindful_plate_jwt_token';
const USER_STORAGE_KEY = '@mindful_plate_user_data';

interface AppState {
  token: string | null;
  user: any | null;
  profile: any | null;
  selectedDate: string;
  isHydrated: boolean;
  hydrateAuth: () => Promise<void>;
  setAuth: (token: string, user: any) => Promise<void>;
  setProfile: (profile: any) => void;
  logout: () => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export const useStore = create<AppState>((set) => ({
  token: null,
  user: null,
  profile: null,
  isHydrated: false,
  selectedDate: new Date().toISOString().split('T')[0],

  hydrateAuth: async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedToken) {
        setAuthToken(storedToken);
        set({
          token: storedToken,
          user: storedUser ? JSON.parse(storedUser) : null,
          isHydrated: true,
        });
        return;
      }
    } catch {
      // ignore storage read failures
    }
    set({ isHydrated: true });
  },

  setAuth: async (token, user) => {
    setAuthToken(token);
    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (user) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } catch {}
    set({ token, user });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  logout: async () => {
    setAuthToken(null);
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
    set({ token: null, user: null, profile: null });
  },

  setSelectedDate: (selectedDate) => set({ selectedDate }),
}));
