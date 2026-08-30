import { FastifyPluginAsync } from 'fastify';
import { createRecipeSchema } from '@mindful-plate/shared';
import { db } from '../../db';
import { recipes, recipeIngredients } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const recipeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, rep) => {
    try { await req.jwtVerify(); } catch (err) { rep.send(err); }
  });

  // List all recipes for user
  fastify.get('/', async (request, reply) => {
    const userId = (request.user as { id: string }).id;
    const userRecipes = await db.query.recipes.findMany({
      where: eq(recipes.userId, userId),
      with: { ingredients: true },
    });
    return reply.send({ recipes: userRecipes });
  });

  // Create recipe
  fastify.post('/', async (request, reply) => {
    const parseResult = createRecipeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const userId = (request.user as { id: string }).id;
    const { title, instructions, servings, ingredients } = parseResult.data;

    let totalCals = 0;
    let totalProt = 0;
    let totalCarb = 0;
    let totalFat = 0;

    for (const ing of ingredients) {
      totalCals += ing.calories;
      totalProt += ing.protein;
      totalCarb += ing.carbs;
      totalFat += ing.fat;
    }

    const calsPerServing = Math.round(totalCals / servings);
    const protPerServing = Math.round((totalProt / servings) * 10) / 10;
    const carbPerServing = Math.round((totalCarb / servings) * 10) / 10;
    const fatPerServing = Math.round((totalFat / servings) * 10) / 10;

    const [recipe] = await db.insert(recipes).values({
      userId,
      title,
      instructions,
      servings,
      caloriesPerServing: calsPerServing,
      proteinPerServing: protPerServing,
      carbsPerServing: carbPerServing,
      fatPerServing: fatPerServing,
    }).returning();

    if (ingredients.length > 0) {
      await db.insert(recipeIngredients).values(
        ingredients.map((ing) => ({
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
        }))
      );
    }

    const complete = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipe.id),
      with: { ingredients: true },
    });

    return reply.status(201).send({ recipe: complete });
  });
};
