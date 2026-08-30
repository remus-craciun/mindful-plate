import React from 'react';
import { View, Text } from 'react-native';

interface MacroCardProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  colorClass: string;
  barColorClass: string;
}

export function MacroCard({
  label,
  consumed,
  target,
  unit = 'g',
  colorClass,
  barColorClass,
}: MacroCardProps) {
  const percentage = Math.min(100, Math.round((consumed / (target || 1)) * 100));

  return (
    <View className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 mx-1">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</Text>
        <Text className={`text-xs font-bold ${colorClass}`}>{percentage}%</Text>
      </View>
      <View className="flex-row items-baseline mb-2">
        <Text className="text-lg font-bold text-white">{consumed}</Text>
        <Text className="text-xs text-slate-500 ml-1">/ {target}{unit}</Text>
      </View>
      {/* Progress bar */}
      <View className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <View 
          className={`h-full rounded-full ${barColorClass}`} 
          style={{ width: `${percentage}%` }} 
        />
      </View>
    </View>
  );
}
