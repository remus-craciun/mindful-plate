import { FastifyPluginAsync } from 'fastify';
import { logWaterRequestSchema } from '@mindful-plate/shared';
import { db } from '../../db';
import { waterLogs, userProfiles } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const waterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, rep) => {
    try { await req.jwtVerify(); } catch (err) { rep.send(err); }
  });

  // Get water intake for date
  fastify.get('/', async (request, reply) => {
    const { date } = request.query as { date?: string };
    const targetDate = date || new Date().toISOString().split('T')[0];
    const userId = (request.user as { id: string }).id;

    const logs = await db.query.waterLogs.findMany({
      where: and(
        eq(waterLogs.userId, userId),
        eq(waterLogs.date, targetDate)
      ),
    });

    const totalMl = logs.reduce((sum, entry) => sum + entry.amountMl, 0);

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    const targetMl = profile?.dailyWaterTargetMl || 2500;

    return reply.send({
      date: targetDate,
      totalMl,
      targetMl,
      percentage: Math.min(100, Math.round((totalMl / targetMl) * 100)),
      logs,
    });
  });

  // Log water increment (+250ml, etc.)
  fastify.post('/log', async (request, reply) => {
    const parseResult = logWaterRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const userId = (request.user as { id: string }).id;
    const { date, amountMl } = parseResult.data;

    const [newLog] = await db.insert(waterLogs).values({
      userId,
      date,
      amountMl,
    }).returning();

    return reply.status(201).send({ log: newLog });
  });
};
