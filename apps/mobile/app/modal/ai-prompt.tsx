import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, X, Check } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { ParsedMealItem, MealType } from '@mindful-plate/shared';
import { KeyboardAvoidingScreen } from '../../src/components/KeyboardAvoidingScreen';
import { useStore } from '../../src/store/useStore';

export default function AiPromptModal() {
  const router = useRouter();
  const { selectedDate } = useStore();
  const [prompt, setPrompt] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<{
    items: ParsedMealItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const data = await api.parseMealText(prompt);
      setResult(data);
    } catch (err: any) {
      Alert.alert('Analysis failed', err.message || 'Could not analyze this meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLog = async () => {
    if (!result) return;
    setLogging(true);
    try {
      await api.logMeal({
        mealType,
        date: selectedDate,
        items: result.items,
      });
      Alert.alert('Meal Logged', 'Your AI analyzed meal has been added to your daily diary!');
      router.back();
    } catch (err: any) {
      Alert.alert('Logging failed', err.message || 'Could not save this meal. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <KeyboardAvoidingScreen>
      <View className="flex-row items-center justify-between pt-2 pb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-violet-500/20 items-center justify-center mr-2">
            <Sparkles size={16} color="#a78bfa" />
          </View>
          <Text className="text-white text-xl font-bold">Describe Meal (AI)</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
        >
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-4">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setMealType(type)}
            className={`flex-1 py-2 rounded-xl items-center ${
              mealType === type ? 'bg-emerald-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                mealType === type ? 'text-white font-bold' : 'text-slate-400'
              }`}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-slate-400 text-xs mb-2">
          Tell Gemini what you ate in plain natural language (e.g. "I had 2 fried eggs, a bowl of oatmeal with blueberries, and a cup of tea with honey"):
        </Text>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={4}
          placeholder="Type or paste your meal description..."
          placeholderTextColor="#64748b"
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-white text-sm mb-4 min-h-[100px]"
        />

        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={loading}
          className="bg-violet-600 active:bg-violet-700 rounded-2xl py-3.5 items-center flex-row justify-center mb-6"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Sparkles size={18} color="#ffffff" />
              <Text className="text-white font-bold text-sm ml-2">Analyze with Gemini AI</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (
          <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-base">Detected Items</Text>
              <View className="bg-emerald-500/20 px-3 py-1 rounded-full">
                <Text className="text-emerald-400 font-bold text-xs">{result.totalCalories} kcal</Text>
              </View>
            </View>

            {result.items.map((item, idx) => (
              <View key={idx} className="py-2.5 border-b border-slate-800/80 last:border-b-0">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-medium text-sm">{item.name}</Text>
                  <Text className="text-slate-300 font-bold text-xs">{item.calories} kcal</Text>
                </View>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {item.quantity} {item.unit} • P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleConfirmLog}
              disabled={logging}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-3.5 items-center flex-row justify-center mt-5"
            >
              {logging ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-sm ml-2">Confirm & Log to Diary</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
    </KeyboardAvoidingScreen>
  );
}
