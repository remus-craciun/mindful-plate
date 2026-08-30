import { UserStats, CalculatedTargets } from './types';

/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation:
 * Men: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
 * Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
 */
export function calculateBMR(sex: 'male' | 'female', weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? Math.round(base + 5) : Math.round(base - 161);
}

/**
 * Activity Multipliers according to the Harris-Benedict / Mifflin principles.
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,          // Little or no exercise
  lightly_active: 1.375,   // Light exercise/sports 1-3 days/week
  moderately_active: 1.55, // Moderate exercise/sports 3-5 days/week
  very_active: 1.725,      // Hard exercise/sports 6-7 days a week
  extra_active: 1.9,       // Very hard exercise/physical job
} as const;

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Goal adjustments:
 * - Cut: -400 kcal (sustainable deficit for fat loss, approx 0.4kg/week)
 * - Maintain: 0 kcal offset
 * - Bulk: +350 kcal (lean muscle gain surplus)
 */
export const GOAL_CALORIE_OFFSETS = {
  cut: -400,
  maintain: 0,
  bulk: 350,
} as const;

/**
 * Comprehensive calculator: computes BMR, TDEE, adjusted daily calories,
 * balanced macronutrient split, and recommended daily water intake.
 *
 * Macronutrient split strategy:
 * - Protein: 2.0g per kg of bodyweight (4 kcal/g)
 * - Fat: 25% of total target calories (9 kcal/g)
 * - Carbs: Remaining calories (4 kcal/g)
 * - Water: 35ml per kg of bodyweight (+500ml for active days)
 */
export function calculateNutritionTargets(stats: UserStats): CalculatedTargets {
  const bmr = calculateBMR(stats.sex, stats.weightKg, stats.heightCm, stats.age);
  const tdee = calculateTDEE(bmr, stats.activityLevel);
  
  const offset = GOAL_CALORIE_OFFSETS[stats.goal] ?? 0;
  // Floor calories at safe minimums (1200 for female, 1500 for male)
  const minCalories = stats.sex === 'female' ? 1200 : 1500;
  const calories = Math.max(minCalories, tdee + offset);

  // Protein: 2.0g per kg
  const proteinG = Math.round(stats.weightKg * 2.0);
  const proteinKcal = proteinG * 4;

  // Fat: 25% of target calories
  const fatKcal = calories * 0.25;
  const fatG = Math.round(fatKcal / 9);

  // Carbs: Remaining calories
  const carbsKcal = Math.max(0, calories - proteinKcal - (fatG * 9));
  const carbsG = Math.round(carbsKcal / 4);

  // Water intake: 35ml / kg bodyweight + activity buffer
  const isHigherActivity = ['moderately_active', 'very_active', 'extra_active'].includes(stats.activityLevel);
  const waterMl = Math.round(stats.weightKg * 35 + (isHigherActivity ? 500 : 0));

  return {
    bmr,
    tdee,
    calories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
  };
}
