import { z } from 'zod';

export const userStatsSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().int().min(12).max(120),
  heightCm: z.number().min(80).max(250),
  weightKg: z.number().min(30).max(350),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active',
  ]),
  goal: z.enum(['cut', 'maintain', 'bulk']),
});

export const foodItemSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  servingSize: z.number().positive(),
  servingUnit: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
});

export const parsedMealItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
});

export const aiMealAnalysisSchema = z.object({
  items: z.array(parsedMealItemSchema),
  totalCalories: z.number().nonnegative(),
  totalProtein: z.number().nonnegative(),
  totalCarbs: z.number().nonnegative(),
  totalFat: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
});

export const logMealRequestSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(parsedMealItemSchema),
  notes: z.string().optional(),
});

export const logWaterRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMl: z.number().positive(),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().optional(),
  servings: z.number().int().positive().default(1),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      calories: z.number().nonnegative(),
      protein: z.number().nonnegative(),
      carbs: z.number().nonnegative(),
      fat: z.number().nonnegative(),
    })
  ),
});
