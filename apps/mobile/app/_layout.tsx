import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60, // 1 min
    },
  },
});

import { useRouter, useSegments } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { syncFoodsFromServer } from '../src/services/localFoodsDb';
import { api } from '../src/services/api';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, isHydrated, hydrateAuth, setServerTimezone } = useStore();

  React.useEffect(() => {
    hydrateAuth();
    // Foods are public reference data; sync as soon as we can reach the
    // server so the local cache picks up anything new, offline or not.
    syncFoodsFromServer().catch(() => {});
    // Use the server's timezone for "today"/day-boundary logic instead of
    // the device's own — see apps/mobile/src/utils/date.ts.
    api.checkHealth().then((res) => setServerTimezone(res.timezone)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      // Redirect to auth screen
      router.replace('/auth');
    } else if (token && inAuthGroup) {
      // Already authenticated, redirect to dashboard
      router.replace('/(tabs)');
    }
  }, [token, isHydrated, segments]);

  // Hold off mounting any route until the stored token (if any) has been
  // loaded into src/services/api's in-memory authToken — otherwise a screen
  // that fetches on mount (e.g. the home tab's useFocusEffect) can fire its
  // first request before the Authorization header is set, and the server
  // rejects it as unauthenticated.
  if (!isHydrated) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-[#090d16]">
          <ActivityIndicator color="#ffffff" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090d16' } }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modal/ai-camera"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="modal/ai-prompt"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
