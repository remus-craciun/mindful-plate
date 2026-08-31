import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus, X, Utensils } from 'lucide-react-native';

interface MealSectionProps {
  title: string;
  items: any[];
  onAddItem: () => void;
  onDeleteItem?: (id: string) => void;
}

export function MealSection({ title, items, onAddItem, onDeleteItem }: MealSectionProps) {
  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);

  return (
    <View className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center mr-2.5">
            <Utensils size={16} color="#10b981" />
          </View>
          <Text className="text-white font-bold text-base capitalize">{title}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-slate-400 font-semibold text-xs mr-3">
            {totalCalories} kcal
          </Text>
          <TouchableOpacity
            onPress={onAddItem}
            className="w-7 h-7 rounded-full bg-emerald-500/20 items-center justify-center active:bg-emerald-500/30"
          >
            <Plus size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      {items.length === 0 ? (
        <Text className="text-slate-500 text-xs italic py-2">No food logged yet.</Text>
      ) : (
        <View className="space-y-2 mt-1">
          {items.map((item, idx) => (
            <View
              key={item.id || idx}
              className="flex-row items-center justify-between py-2 border-b border-slate-800/60 last:border-b-0"
            >
              <View className="flex-1 pr-2">
                <Text className="text-slate-200 font-medium text-sm">{item.name}</Text>
                <Text className="text-slate-500 text-xs">
                  {item.quantity} {item.unit} • P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-slate-300 font-semibold text-xs mr-3">
                  {item.calories} kcal
                </Text>
                {onDeleteItem && item.id && (
                  <TouchableOpacity
                    onPress={() => onDeleteItem(item.id)}
                    className="p-1 active:opacity-60"
                  >
                    <X size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
