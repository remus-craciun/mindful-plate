import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Droplet, Plus } from 'lucide-react-native';

interface WaterTrackerProps {
  currentMl: number;
  targetMl: number;
  onAddWater: (amountMl: number) => void;
}

export function WaterTracker({ currentMl, targetMl, onAddWater }: WaterTrackerProps) {
  const percentage = Math.min(100, Math.round((currentMl / (targetMl || 2500)) * 100));

  return (
    <View className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 mb-5">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-sky-500/20 items-center justify-center mr-3">
            <Droplet size={20} color="#0ea5e9" />
          </View>
          <View>
            <Text className="text-white font-bold text-base">Water Intake</Text>
            <Text className="text-slate-400 text-xs">{currentMl} ml of {targetMl} ml goal</Text>
          </View>
        </View>
        <Text className="text-sky-400 font-bold text-sm">{percentage}%</Text>
      </View>

      {/* Progress bar */}
      <View className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
        <View 
          className="h-full bg-sky-500 rounded-full" 
          style={{ width: `${percentage}%` }} 
        />
      </View>

      {/* Quick Add Buttons */}
      <View className="flex-row justify-between space-x-2">
        <TouchableOpacity
          onPress={() => onAddWater(250)}
          className="flex-1 bg-slate-800/80 active:bg-slate-700 rounded-xl py-2.5 items-center justify-center flex-row"
        >
          <Plus size={14} color="#38bdf8" />
          <Text className="text-sky-400 font-semibold text-xs ml-1">250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onAddWater(500)}
          className="flex-1 bg-slate-800/80 active:bg-slate-700 rounded-xl py-2.5 items-center justify-center flex-row mx-2"
        >
          <Plus size={14} color="#38bdf8" />
          <Text className="text-sky-400 font-semibold text-xs ml-1">500 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onAddWater(750)}
          className="flex-1 bg-slate-800/80 active:bg-slate-700 rounded-xl py-2.5 items-center justify-center flex-row"
        >
          <Plus size={14} color="#38bdf8" />
          <Text className="text-sky-400 font-semibold text-xs ml-1">750 ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
