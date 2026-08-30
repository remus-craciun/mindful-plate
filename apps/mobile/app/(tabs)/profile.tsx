import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Activity, Target, Droplet } from 'lucide-react-native';
import { calculateNutritionTargets, ActivityLevel } from '@mindful-plate/shared';
import { useStore } from '../../src/store/useStore';
import { api } from '../../src/services/api';

export default function ProfileScreen() {
  const { logout, user, setProfile } = useStore();
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('29');
  const [heightCm, setHeightCm] = useState('180');
  const [weightKg, setWeightKg] = useState('80');
  const [activity, setActivity] = useState<ActivityLevel>('moderately_active');
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('cut');
  const [saving, setSaving] = useState(false);

  const activityLevels: { value: ActivityLevel; label: string; hint: string }[] = [
    { value: 'sedentary', label: 'Sedentary', hint: 'Little or no exercise' },
    { value: 'lightly_active', label: 'Lightly Active', hint: 'Light exercise 1-3 days/week' },
    { value: 'moderately_active', label: 'Moderately Active', hint: 'Moderate exercise 3-5 days/week' },
    { value: 'very_active', label: 'Very Active', hint: 'Hard exercise 6-7 days/week' },
    { value: 'extra_active', label: 'Extra Active', hint: 'Very hard exercise or physical job' },
  ];

  // Hydrate the form with any existing profile so Save doesn't overwrite it with placeholders
  useEffect(() => {
    api.getMe()
      .then((res) => {
        const p = res.user?.profile;
        if (!p) return;
        setSex(p.sex);
        setAge(String(p.age));
        setHeightCm(String(p.heightCm));
        setWeightKg(String(p.weightKg));
        setActivity(p.activityLevel);
        setGoal(p.goal);
        setProfile(p);
      })
      .catch(() => {});
  }, []);

  const targets = calculateNutritionTargets({
    sex,
    age: parseInt(age) || 25,
    heightCm: parseFloat(heightCm) || 175,
    weightKg: parseFloat(weightKg) || 75,
    activityLevel: activity,
    goal,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateProfile({
        sex,
        age: parseInt(age) || 25,
        heightCm: parseFloat(heightCm) || 175,
        weightKg: parseFloat(weightKg) || 75,
        activityLevel: activity,
        goal,
      });
      setProfile(res.profile);
      Alert.alert('Saved', 'Your nutrition blueprint has been updated.');
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="pt-2 pb-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Settings</Text>
            <Text className="text-white text-2xl font-black">Goals & Profile</Text>
          </View>

          {/* Calculated Target Summary Card */}
          <View className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-5 mb-5">
            <Text className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">Your Daily Blueprint</Text>
            <Text className="text-white text-3xl font-extrabold mb-1">{targets.calories} kcal</Text>
            <Text className="text-slate-400 text-xs mb-4">
              BMR: {targets.bmr} kcal • TDEE: {targets.tdee} kcal • Water: {targets.waterMl} ml
            </Text>

            <View className="flex-row justify-between bg-slate-950/70 rounded-2xl p-3">
              <View className="items-center flex-1">
                <Text className="text-purple-400 font-bold text-base">{targets.proteinG}g</Text>
                <Text className="text-slate-400 text-[10px] uppercase font-semibold">Protein</Text>
              </View>
              <View className="items-center flex-1 border-x border-slate-800">
                <Text className="text-emerald-400 font-bold text-base">{targets.carbsG}g</Text>
                <Text className="text-slate-400 text-[10px] uppercase font-semibold">Carbs</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-amber-400 font-bold text-base">{targets.fatG}g</Text>
                <Text className="text-slate-400 text-[10px] uppercase font-semibold">Fat</Text>
              </View>
            </View>
          </View>

          {/* Goal Selector */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Nutrition Goal</Text>
          <View className="flex-row bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-5">
            {(['cut', 'maintain', 'bulk'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGoal(g)}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  goal === g ? 'bg-emerald-500' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs capitalize ${
                    goal === g ? 'text-white font-bold' : 'text-slate-400 font-medium'
                  }`}
                >
                  {g} {g === 'cut' ? '(-400)' : g === 'bulk' ? '(+350)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sex Selector */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Sex</Text>
          <View className="flex-row space-x-3 mb-5">
            {(['male', 'female'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSex(s)}
                className={`flex-1 py-3 rounded-2xl border items-center capitalize ${
                  sex === s
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <Text
                  className={`text-sm font-semibold capitalize ${
                    sex === s ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity Level Selector */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Activity Level</Text>
          <View className="mb-5">
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => setActivity(level.value)}
                className={`flex-row items-center justify-between border rounded-2xl px-4 py-3 mb-2 ${
                  activity === level.value
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <Activity size={16} color={activity === level.value ? '#10b981' : '#64748b'} />
                  <View className="ml-3">
                    <Text
                      className={`text-sm font-semibold ${
                        activity === level.value ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {level.label}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-0.5">{level.hint}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Physical Stats Inputs */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Biometrics</Text>
          <View className="flex-row space-x-3 mb-5">
            <View className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
              <Text className="text-slate-400 text-xs mb-1">Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                className="text-white text-base font-bold"
              />
            </View>
            <View className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
              <Text className="text-slate-400 text-xs mb-1">Height (cm)</Text>
              <TextInput
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                className="text-white text-base font-bold"
              />
            </View>
            <View className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
              <Text className="text-slate-400 text-xs mb-1">Weight (kg)</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                className="text-white text-base font-bold"
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 items-center mb-4"
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Save Nutrition Blueprint</Text>
            )}
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={() => logout()}
            className="bg-slate-900/80 border border-red-500/30 rounded-2xl py-3.5 items-center mb-10 active:bg-red-500/10"
          >
            <Text className="text-red-400 font-bold text-sm">Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
