import { db, client } from './index';
import { foods } from './schema';

export const commonFoods = [
  { name: 'Chicken Breast (Cooked, Boneless)', servingSize: 100, servingUnit: 'g', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, fiber: 0 },
  { name: 'White Rice (Cooked)', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  { name: 'Brown Rice (Cooked)', servingSize: 100, servingUnit: 'g', calories: 111, protein: 2.6, carbs: 23.0, fat: 0.9, fiber: 1.8 },
  { name: 'Whole Large Egg', servingSize: 1, servingUnit: 'item', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 },
  { name: 'Egg White', servingSize: 1, servingUnit: 'item', calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, fiber: 0 },
  { name: 'Oatmeal (Rolled, Raw)', servingSize: 40, servingUnit: 'g', calories: 150, protein: 5.0, carbs: 27.0, fat: 2.5, fiber: 4.0 },
  { name: 'Olive Oil', servingSize: 15, servingUnit: 'ml (1 tbsp)', calories: 119, protein: 0.0, carbs: 0.0, fat: 13.5, fiber: 0 },
  { name: 'Butter', servingSize: 14, servingUnit: 'g (1 tbsp)', calories: 102, protein: 0.1, carbs: 0.0, fat: 11.5, fiber: 0 },
  { name: 'Avocado', servingSize: 100, servingUnit: 'g', calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: 'Banana', servingSize: 118, servingUnit: 'medium (118g)', calories: 105, protein: 1.3, carbs: 27.0, fat: 0.3, fiber: 3.1 },
  { name: 'Apple', servingSize: 182, servingUnit: 'medium (182g)', calories: 95, protein: 0.5, carbs: 25.0, fat: 0.3, fiber: 4.4 },
  { name: 'Greek Yogurt (0% Fat, Plain)', servingSize: 170, servingUnit: 'g', calories: 100, protein: 17.0, carbs: 6.0, fat: 0.7, fiber: 0 },
  { name: 'Salmon (Atlantic, Cooked)', servingSize: 100, servingUnit: 'g', calories: 206, protein: 22.0, carbs: 0.0, fat: 12.3, fiber: 0 },
  { name: 'Whole Wheat Bread', servingSize: 1, servingUnit: 'slice (40g)', calories: 80, protein: 4.0, carbs: 13.0, fat: 1.0, fiber: 2.0 },
  { name: 'Whey Protein Powder', servingSize: 30, servingUnit: 'scoop (30g)', calories: 120, protein: 24.0, carbs: 3.0, fat: 1.5, fiber: 0.5 },
  { name: 'Milk (Whole, 3.25%)', servingSize: 240, servingUnit: 'ml (1 cup)', calories: 149, protein: 7.7, carbs: 11.7, fat: 8.0, fiber: 0 },
  { name: 'Almonds', servingSize: 28, servingUnit: 'g (handful)', calories: 164, protein: 6.0, carbs: 6.1, fat: 14.2, fiber: 3.5 },
  { name: 'Broccoli (Cooked)', servingSize: 100, servingUnit: 'g', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 3.3 },
  { name: 'Sweet Potato (Baked)', servingSize: 100, servingUnit: 'g', calories: 90, protein: 2.0, carbs: 20.7, fat: 0.1, fiber: 3.3 },
  { name: 'Peanut Butter', servingSize: 32, servingUnit: 'g (2 tbsp)', calories: 188, protein: 8.0, carbs: 7.0, fat: 16.0, fiber: 2.0 }
];

export async function seedFoods() {
  console.log('Seeding initial food database...');

  // `foods` has no unique constraint on name, so onConflictDoNothing() alone
  // won't stop re-runs from inserting duplicates; skip names already present instead.
  const existing = await db.query.foods.findMany({ columns: { name: true } });
  const existingNames = new Set(existing.map((f) => f.name));
  const toInsert = commonFoods.filter((food) => !existingNames.has(food.name));

  if (toInsert.length === 0) {
    console.log('Food database already seeded, nothing to do.');
    return;
  }

  await db.insert(foods).values(toInsert.map((food) => ({ ...food, isCustom: false })));
  console.log(`Seeded ${toInsert.length} food${toInsert.length === 1 ? '' : 's'}.`);
}

if (import.meta.main) {
  await seedFoods();
  await client.end();
}
