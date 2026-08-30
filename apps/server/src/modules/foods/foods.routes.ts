import { FastifyPluginAsync } from 'fastify';
import { foodItemSchema } from '@mindful-plate/shared';
import { db } from '../../db';
import { foods } from '../../db/schema';
import { ilike, or, eq, gt, asc } from 'drizzle-orm';

export const foodRoutes: FastifyPluginAsync = async (fastify) => {
  // Public or auth search
  fastify.get('/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.trim().length === 0) {
      const top = await db.query.foods.findMany({ limit: 20 });
      return reply.send({ foods: top });
    }

    const matches = await db.query.foods.findMany({
      where: or(
        ilike(foods.name, `%${q}%`),
        ilike(foods.brand, `%${q}%`)
      ),
      limit: 25,
    });

    return reply.send({ foods: matches });
  });

  // Incremental sync for the mobile app's local SQLite cache: with no `since`,
  // returns the full table (first sync); with `since`, only rows created after
  // it.
  //
  // `createdAt` is a `timestamp` (no tz) column, so Postgres stores it in the
  // session's local timezone rather than true UTC (see schema.ts). The cursor
  // we hand back must therefore come from that same column, not this
  // process's clock (`new Date()`) — otherwise, on any server not running in
  // UTC, comparing a real-UTC cursor against the skewed column makes every
  // sync re-fetch the whole table forever instead of just what's new.
  fastify.get('/sync', async (request, reply) => {
    const { since } = request.query as { since?: string };
    const sinceDate = since ? new Date(since) : undefined;

    const results = await db.query.foods.findMany({
      where: sinceDate && !isNaN(sinceDate.getTime()) ? gt(foods.createdAt, sinceDate) : undefined,
      orderBy: [asc(foods.createdAt)],
    });

    // Postgres timestamps carry microsecond precision but JS Date only keeps
    // milliseconds, so the raw value here is always <= the true stored value
    // — round up 1ms so next time's `gt` comparison excludes this batch
    // instead of matching it (and everything since) again forever.
    const latestCreatedAt = results.at(-1)?.createdAt;
    const syncedAt = latestCreatedAt
      ? new Date(latestCreatedAt.getTime() + 1).toISOString()
      : (sinceDate ?? new Date(0)).toISOString();

    return reply.send({ foods: results, syncedAt });
  });

  // Create custom food
  fastify.post('/custom', {
    onRequest: [async (req, rep) => {
      try { await req.jwtVerify(); } catch (err) { rep.send(err); }
    }]
  }, async (request, reply) => {
    const parseResult = foodItemSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const userId = (request.user as { id: string }).id;
    const [newFood] = await db.insert(foods).values({
      ...parseResult.data,
      isCustom: true,
      userId,
    }).returning();

    return reply.status(201).send({ food: newFood });
  });
};
