import { pgTable, uuid, varchar, timestamp, text, integer, doublePrecision, boolean, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sex: varchar('sex', { length: 10 }).notNull(), // 'male' | 'female'
  age: integer('age').notNull(),
  heightCm: doublePrecision('height_cm').notNull(),
  weightKg: doublePrecision('weight_kg').notNull(),
  activityLevel: varchar('activity_level', { length: 30 }).notNull(),
  goal: varchar('goal', { length: 20 }).notNull(), // 'cut' | 'maintain' | 'bulk'
  dailyCaloriesTarget: integer('daily_calories_target').notNull(),
  dailyProteinTargetG: integer('daily_protein_target_g').notNull(),
  dailyCarbsTargetG: integer('daily_carbs_target_g').notNull(),
  dailyFatTargetG: integer('daily_fat_target_g').notNull(),
  dailyWaterTargetMl: integer('daily_water_target_ml').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const foods = pgTable('foods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }),
  servingSize: doublePrecision('serving_size').notNull().default(100),
  servingUnit: varchar('serving_unit', { length: 50 }).notNull().default('g'),
  calories: integer('calories').notNull(),
  protein: doublePrecision('protein').notNull().default(0),
  carbs: doublePrecision('carbs').notNull().default(0),
  fat: doublePrecision('fat').notNull().default(0),
  fiber: doublePrecision('fiber').default(0),
  isCustom: boolean('is_custom').default(false).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mealLogs = pgTable('meal_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mealType: varchar('meal_type', { length: 20 }).notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: date('date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mealItems = pgTable('meal_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  mealLogId: uuid('meal_log_id').notNull().references(() => mealLogs.id, { onDelete: 'cascade' }),
  foodId: uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  calories: integer('calories').notNull(),
  protein: doublePrecision('protein').notNull().default(0),
  carbs: doublePrecision('carbs').notNull().default(0),
  fat: doublePrecision('fat').notNull().default(0),
  fiber: doublePrecision('fiber').default(0),
});

export const waterLogs = pgTable('water_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amountMl: integer('amount_ml').notNull(),
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
});

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  instructions: text('instructions'),
  servings: integer('servings').notNull().default(1),
  caloriesPerServing: integer('calories_per_serving').notNull().default(0),
  proteinPerServing: doublePrecision('protein_per_serving').notNull().default(0),
  carbsPerServing: doublePrecision('carbs_per_serving').notNull().default(0),
  fatPerServing: doublePrecision('fat_per_serving').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const recipeIngredients = pgTable('recipe_ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  foodId: uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  calories: integer('calories').notNull(),
  protein: doublePrecision('protein').notNull().default(0),
  carbs: doublePrecision('carbs').notNull().default(0),
  fat: doublePrecision('fat').notNull().default(0),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  mealLogs: many(mealLogs),
  waterLogs: many(waterLogs),
  recipes: many(recipes),
}));

export const mealLogsRelations = relations(mealLogs, ({ one, many }) => ({
  user: one(users, { fields: [mealLogs.userId], references: [users.id] }),
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  mealLog: one(mealLogs, { fields: [mealItems.mealLogId], references: [mealLogs.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
}));
