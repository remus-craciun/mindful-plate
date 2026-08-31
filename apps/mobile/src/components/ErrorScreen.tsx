import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';

interface ErrorScreenProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-8">
      <Text className="text-5xl mb-4">🔌💥</Text>
      <Text className="text-white text-lg font-bold text-center mb-2">Something Went Wrong</Text>
      <Text className="text-slate-400 text-sm text-center mb-6">
        {message || "We couldn't reach the Mindful Plate server. Please check your connection and try again."}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        className="bg-emerald-500 active:bg-emerald-600 rounded-2xl px-6 py-3.5 flex-row items-center"
      >
        <RefreshCw size={16} color="#ffffff" />
        <Text className="text-white font-bold text-sm ml-2">Retry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
