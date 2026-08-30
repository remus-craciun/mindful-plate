import { FastifyPluginAsync } from 'fastify';
import { userStatsSchema, calculateNutritionTargets } from '@mindful-plate/shared';
import { db } from '../../db';
import { userProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Preview nutrition calculations without auth (e.g. for onboarding preview)
  fastify.post('/preview-targets', async (request, reply) => {
    const parseResult = userStatsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }
    const targets = calculateNutritionTargets(parseResult.data);
    return reply.send({ targets });
  });

  // Calculate & update profile + targets (protected)
  fastify.put('/profile', {
    onRequest: [async (req, rep) => {
      try { await req.jwtVerify(); } catch (err) { rep.send(err); }
    }]
  }, async (request, reply) => {
    const parseResult = userStatsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const stats = parseResult.data;
    const targets = calculateNutritionTargets(stats);
    const userId = (request.user as { id: string }).id;

    const existing = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    if (existing) {
      const [updated] = await db.update(userProfiles).set({
        sex: stats.sex,
        age: stats.age,
        heightCm: stats.heightCm,
        weightKg: stats.weightKg,
        activityLevel: stats.activityLevel,
        goal: stats.goal,
        dailyCaloriesTarget: targets.calories,
        dailyProteinTargetG: targets.proteinG,
        dailyCarbsTargetG: targets.carbsG,
        dailyFatTargetG: targets.fatG,
        dailyWaterTargetMl: targets.waterMl,
        updatedAt: new Date(),
      }).where(eq(userProfiles.userId, userId)).returning();

      return reply.send({ profile: updated, targets });
    } else {
      const [created] = await db.insert(userProfiles).values({
        userId,
        sex: stats.sex,
        age: stats.age,
        heightCm: stats.heightCm,
        weightKg: stats.weightKg,
        activityLevel: stats.activityLevel,
        goal: stats.goal,
        dailyCaloriesTarget: targets.calories,
        dailyProteinTargetG: targets.proteinG,
        dailyCarbsTargetG: targets.carbsG,
        dailyFatTargetG: targets.fatG,
        dailyWaterTargetMl: targets.waterMl,
      }).returning();

      return reply.status(201).send({ profile: created, targets });
    }
  });
};
