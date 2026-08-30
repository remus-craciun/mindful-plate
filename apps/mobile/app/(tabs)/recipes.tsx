import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Plus, Clock, ChefHat } from 'lucide-react-native';

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState([
    {
      id: '1',
      title: 'High-Protein Turkey Chili',
      servings: 4,
      caloriesPerServing: 380,
      proteinPerServing: 42,
      carbsPerServing: 30,
      fatPerServing: 8,
      prepTime: '25 min',
    },
    {
      id: '2',
      title: 'Overnight Protein Oats with Berries',
      servings: 1,
      caloriesPerServing: 410,
      proteinPerServing: 35,
      carbsPerServing: 52,
      fatPerServing: 7,
      prepTime: '5 min',
    },
    {
      id: '3',
      title: 'Avocado & Tuna Salad Bowl',
      servings: 2,
      caloriesPerServing: 320,
      proteinPerServing: 38,
      carbsPerServing: 12,
      fatPerServing: 14,
      prepTime: '10 min',
    }
  ]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4">
      <View className="flex-row items-center justify-between pt-2 pb-4">
        <View>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nutrition Library</Text>
          <Text className="text-white text-2xl font-black">My Recipes</Text>
        </View>
        <TouchableOpacity className="flex-row items-center bg-emerald-500 rounded-2xl px-3.5 py-2 active:bg-emerald-600">
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-xs ml-1">New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {recipes.map((rec) => (
          <View
            key={rec.id}
            className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 mb-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-base flex-1 pr-2">{rec.title}</Text>
              <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full">
                <Text className="text-emerald-400 font-bold text-xs">{rec.caloriesPerServing} kcal</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3 text-slate-500">
              <Clock size={12} color="#64748b" />
              <Text className="text-slate-400 text-xs ml-1 mr-3">{rec.prepTime}</Text>
              <ChefHat size={12} color="#64748b" />
              <Text className="text-slate-400 text-xs ml-1">{rec.servings} servings</Text>
            </View>

            <View className="flex-row justify-between bg-slate-950/50 rounded-2xl p-3 mb-4">
              <View className="items-center flex-1">
                <Text className="text-purple-400 font-bold text-sm">{rec.proteinPerServing}g</Text>
                <Text className="text-slate-500 text-[10px] uppercase">Protein</Text>
              </View>
              <View className="items-center flex-1 border-x border-slate-800">
                <Text className="text-emerald-400 font-bold text-sm">{rec.carbsPerServing}g</Text>
                <Text className="text-slate-500 text-[10px] uppercase">Carbs</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-amber-400 font-bold text-sm">{rec.fatPerServing}g</Text>
                <Text className="text-slate-500 text-[10px] uppercase">Fat</Text>
              </View>
            </View>

            <TouchableOpacity className="bg-slate-800/80 active:bg-slate-700 py-2.5 rounded-xl items-center">
              <Text className="text-slate-200 font-semibold text-xs">+ Log 1 Serving to Today</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
