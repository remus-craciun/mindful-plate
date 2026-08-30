import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Sparkles, Camera, Flame } from 'lucide-react-native';
import { MacroCard } from '../../src/components/MacroCard';
import { WaterTracker } from '../../src/components/WaterTracker';
import { MealSection } from '../../src/components/MealSection';
import { useStore } from '../../src/store/useStore';
import { api } from '../../src/services/api';
import { MealType } from '@mindful-plate/shared';

interface DailyItem {
  id: string;
  mealLogId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const EMPTY_MEALS: Record<MealType, DailyItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };

export default function DashboardScreen() {
  const router = useRouter();
  const { selectedDate } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<{
    calories: { consumed: number; target: number; remaining: number };
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  } | null>(null);
  const [mealsByType, setMealsByType] = useState<Record<MealType, DailyItem[]>>(EMPTY_MEALS);
  const [waterMl, setWaterMl] = useState(0);
  const [waterTargetMl, setWaterTargetMl] = useState(2500);

  const loadDashboard = useCallback(async () => {
    const [dailyRes, waterRes] = await Promise.all([
      api.getDailySummary(selectedDate),
      api.getWater(selectedDate),
    ]);

    setSummary(dailyRes.summary);

    const grouped: Record<MealType, DailyItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const log of dailyRes.meals) {
      const type = log.mealType as MealType;
      if (!grouped[type]) continue;
      for (const item of log.items) {
        grouped[type].push({ ...item, mealLogId: log.id });
      }
    }
    setMealsByType(grouped);
    setWaterMl(waterRes.totalMl);
    setWaterTargetMl(waterRes.targetMl);
  }, [selectedDate]);

  // Reload every time this tab is focused (initial mount, switching back from
  // another tab, or returning from a modal), not just once on first mount.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDashboard()
        .catch((err: any) => {
          if (active) Alert.alert('Could not load today', err.message || 'Please try again.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [loadDashboard])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (err: any) {
      Alert.alert('Could not refresh', err.message || 'Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddWater = async (amount: number) => {
    const previousMl = waterMl;
    setWaterMl((prev) => prev + amount);
    try {
      await api.logWater(amount, selectedDate);
    } catch (err: any) {
      setWaterMl(previousMl);
      Alert.alert('Could not log water', err.message || 'Please try again.');
    }
  };

  const handleDeleteItem = async (mealLogId: string) => {
    try {
      await api.deleteMeal(mealLogId);
      await loadDashboard();
    } catch (err: any) {
      Alert.alert('Could not delete', err.message || 'Please try again.');
    }
  };

  const goToLog = (mealType: MealType) => {
    router.push({ pathname: '/log', params: { mealType } });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  const calories = summary?.calories ?? { consumed: 0, target: 2000, remaining: 2000 };
  const protein = summary?.protein ?? { consumed: 0, target: 150 };
  const carbs = summary?.carbs ?? { consumed: 0, target: 200 };
  const fat = summary?.fat ?? { consumed: 0, target: 65 };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2 pb-4">
          <View>
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Today's Nutrition</Text>
            <Text className="text-white text-2xl font-black">Mindful Plate</Text>
          </View>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => router.push('/modal/ai-camera')}
              className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 items-center justify-center active:scale-95"
            >
              <Camera size={20} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/modal/ai-prompt')}
              className="w-11 h-11 rounded-2xl bg-violet-500/20 border border-violet-500/30 items-center justify-center ml-2 active:scale-95"
            >
              <Sparkles size={20} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie Card */}
        <View className="bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 mb-5">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center mb-1">
                <Flame size={18} color="#10b981" />
                <Text className="text-emerald-400 font-semibold text-xs ml-1 uppercase tracking-wider">Remaining</Text>
              </View>
              <Text className="text-white text-4xl font-extrabold">{calories.remaining}</Text>
              <Text className="text-slate-400 text-xs mt-1">Calories remaining for today</Text>
            </View>

            <View className="items-end">
              <Text className="text-slate-400 text-xs">Eaten: <Text className="text-white font-semibold">{calories.consumed}</Text></Text>
              <Text className="text-slate-400 text-xs mt-0.5">Target: <Text className="text-white font-semibold">{calories.target}</Text></Text>
            </View>
          </View>

          {/* Calorie progress bar */}
          <View className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden mt-5">
            <View
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round((calories.consumed / (calories.target || 1)) * 100))}%` }}
            />
          </View>
        </View>

        {/* Macros Breakdown */}
        <View className="flex-row justify-between mb-5">
          <MacroCard
            label="Protein"
            consumed={protein.consumed}
            target={protein.target}
            colorClass="text-purple-400"
            barColorClass="bg-purple-500"
          />
          <MacroCard
            label="Carbs"
            consumed={carbs.consumed}
            target={carbs.target}
            colorClass="text-emerald-400"
            barColorClass="bg-emerald-500"
          />
          <MacroCard
            label="Fat"
            consumed={fat.consumed}
            target={fat.target}
            colorClass="text-amber-400"
            barColorClass="bg-amber-500"
          />
        </View>

        {/* Water Tracker */}
        <WaterTracker
          currentMl={waterMl}
          targetMl={waterTargetMl}
          onAddWater={handleAddWater}
        />

        {/* Meals by Type */}
        <Text className="text-white text-lg font-bold mb-3">Logged Meals</Text>
        {MEAL_TYPES.map((type) => (
          <MealSection
            key={type}
            title={MEAL_LABELS[type]}
            items={mealsByType[type]}
            onAddItem={() => goToLog(type)}
            onDeleteItem={handleDeleteItem}
          />
        ))}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
