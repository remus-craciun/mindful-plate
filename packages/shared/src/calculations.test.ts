import { describe, it, expect } from 'bun:test';
import {
  calculateBMR,
  calculateTDEE,
  calculateNutritionTargets,
  GOAL_CALORIE_OFFSETS,
} from './calculations';
import { UserStats } from './types';

describe('Nutrition & Calorie Calculations', () => {
  it('correctly calculates BMR for male and female using Mifflin-St Jeor', () => {
    // Male: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const bmrMale = calculateBMR('male', 80, 180, 30);
    expect(bmrMale).toBe(1780);

    // Female: 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345
    const bmrFemale = calculateBMR('female', 60, 165, 25);
    expect(bmrFemale).toBe(1345);
  });

  it('correctly calculates TDEE with activity levels', () => {
    const bmr = 1780;
    // Moderately active multiplier is 1.55 -> 1780 * 1.55 = 2759
    const tdee = calculateTDEE(bmr, 'moderately_active');
    expect(tdee).toBe(2759);
  });

  it('correctly calculates targets for cutting goal', () => {
    const stats: UserStats = {
      sex: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: 'moderately_active',
      goal: 'cut',
    };

    const targets = calculateNutritionTargets(stats);
    expect(targets.bmr).toBe(1780);
    expect(targets.tdee).toBe(2759);
    // TDEE (2759) - 400 = 2359
    expect(targets.calories).toBe(2359);
    // Protein: 80kg * 2.0g = 160g
    expect(targets.proteinG).toBe(160);
    // Fat: 25% of 2359 = 589.75 / 9 = ~66g
    expect(targets.fatG).toBe(66);
    // Carbs: (2359 - (160 * 4) - (66 * 9)) / 4 = (2359 - 640 - 594) / 4 = 1125 / 4 = ~281g
    expect(targets.carbsG).toBe(281);
    // Water: 80 * 35 + 500 = 3300ml
    expect(targets.waterMl).toBe(3300);
  });

  it('correctly calculates targets for bulking goal', () => {
    const stats: UserStats = {
      sex: 'female',
      age: 25,
      heightCm: 165,
      weightKg: 60,
      activityLevel: 'lightly_active',
      goal: 'bulk',
    };

    const targets = calculateNutritionTargets(stats);
    expect(targets.bmr).toBe(1345);
    // TDEE: 1345 * 1.375 = 1849
    expect(targets.tdee).toBe(1849);
    // Calories: 1849 + 350 = 2199
    expect(targets.calories).toBe(2199);
    // Protein: 60kg * 2.0 = 120g
    expect(targets.proteinG).toBe(120);
    // Fat: 25% of 2199 = 549.75 / 9 = ~61g
    expect(targets.fatG).toBe(61);
    // Water: 60 * 35 = 2100ml
    expect(targets.waterMl).toBe(2100);
  });
});
