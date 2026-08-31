import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';
import { getDateKey, DEFAULT_TIMEZONE } from '../utils/date';

const TOKEN_STORAGE_KEY = '@mindful_plate_jwt_token';
const USER_STORAGE_KEY = '@mindful_plate_user_data';
const TIMEZONE_STORAGE_KEY = '@mindful_plate_server_timezone';

interface AppState {
  token: string | null;
  user: any | null;
  profile: any | null;
  selectedDate: string;
  serverTimezone: string;
  isHydrated: boolean;
  hydrateAuth: () => Promise<void>;
  setAuth: (token: string, user: any) => Promise<void>;
  setProfile: (profile: any) => void;
  logout: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setServerTimezone: (timezone: string) => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  token: null,
  user: null,
  profile: null,
  isHydrated: false,
  serverTimezone: DEFAULT_TIMEZONE,
  selectedDate: getDateKey(DEFAULT_TIMEZONE),

  hydrateAuth: async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const storedTimezone = await AsyncStorage.getItem(TIMEZONE_STORAGE_KEY);
      if (storedTimezone) {
        // Last known server timezone, available immediately on cold start
        // (before the /health round trip that setServerTimezone refreshes).
        set({ serverTimezone: storedTimezone, selectedDate: getDateKey(storedTimezone) });
      }
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

  // Called once at app boot with the server's real timezone (from /health).
  // Snaps selectedDate to "today" in that timezone — safe because this only
  // ever runs before the user has had a chance to navigate to another day.
  setServerTimezone: async (timezone) => {
    set({ serverTimezone: timezone, selectedDate: getDateKey(timezone) });
    try {
      await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
    } catch {}
  },
}));
