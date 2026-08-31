import { FastifyPluginAsync } from 'fastify';
import { logMealRequestSchema } from '@mindful-plate/shared';
import { db } from '../../db';
import { mealLogs, mealItems, userProfiles, foods } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const mealRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, rep) => {
    try { await req.jwtVerify(); } catch (err) { rep.send(err); }
  });

  // Get daily summary for date
  fastify.get('/daily', async (request, reply) => {
    const { date } = request.query as { date?: string };
    const targetDate = date || new Date().toISOString().split('T')[0];
    const userId = (request.user as { id: string }).id;

    // Fetch meals with items
    const userMealLogs = await db.query.mealLogs.findMany({
      where: and(
        eq(mealLogs.userId, userId),
        eq(mealLogs.date, targetDate)
      ),
      with: {
        items: true,
      },
    });

    // Fetch user targets
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    // Aggregate totals
    let consumedCalories = 0;
    let consumedProtein = 0;
    let consumedCarbs = 0;
    let consumedFat = 0;

    for (const log of userMealLogs) {
      for (const item of log.items) {
        consumedCalories += item.calories;
        consumedProtein += item.protein;
        consumedCarbs += item.carbs;
        consumedFat += item.fat;
      }
    }

    return reply.send({
      date: targetDate,
      meals: userMealLogs,
      summary: {
        calories: {
          consumed: Math.round(consumedCalories),
          target: profile?.dailyCaloriesTarget || 2000,
          remaining: Math.max(0, (profile?.dailyCaloriesTarget || 2000) - Math.round(consumedCalories)),
        },
        protein: {
          consumed: Math.round(consumedProtein * 10) / 10,
          target: profile?.dailyProteinTargetG || 150,
        },
        carbs: {
          consumed: Math.round(consumedCarbs * 10) / 10,
          target: profile?.dailyCarbsTargetG || 200,
        },
        fat: {
          consumed: Math.round(consumedFat * 10) / 10,
          target: profile?.dailyFatTargetG || 65,
        },
      },
    });
  });

  // Log meal
  fastify.post('/log', async (request, reply) => {
    const parseResult = logMealRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const userId = (request.user as { id: string }).id;
    const { mealType, date, items, notes } = parseResult.data;

    const [mealLog] = await db.insert(mealLogs).values({
      userId,
      mealType,
      date,
      notes,
    }).returning();

    if (items.length > 0) {
      await db.insert(mealItems).values(
        items.map((item) => ({
          mealLogId: mealLog.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber || 0,
        }))
      );

      // Items logged this way (AI-parsed text/photo, or any future free-form
      // entry) don't already exist in the shared foods table the way
      // manually-searched items do — persist them here so they're searchable
      // and reusable next time, instead of only living inside this one log.
      const existingFoods = await db.query.foods.findMany({ columns: { name: true } });
      const existingNames = new Set(existingFoods.map((f) => f.name.toLowerCase()));
      const seen = new Set<string>();
      const newFoods = items.filter((item) => {
        const key = item.name.trim().toLowerCase();
        if (!key || existingNames.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (newFoods.length > 0) {
        await db.insert(foods).values(
          newFoods.map((item) => ({
            name: item.name.trim(),
            servingSize: item.quantity,
            servingUnit: item.unit,
            calories: Math.round(item.calories),
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber || 0,
            isCustom: true,
            userId,
          }))
        );
      }
    }

    const completeLog = await db.query.mealLogs.findFirst({
      where: eq(mealLogs.id, mealLog.id),
      with: { items: true },
    });

    return reply.status(201).send({ meal: completeLog });
  });

  // Delete meal log
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as { id: string }).id;

    const deleted = await db.delete(mealLogs)
      .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({ error: 'Meal log not found' });
    }

    return reply.send({ success: true });
  });
};
