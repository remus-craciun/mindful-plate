import { FastifyPluginAsync } from 'fastify';
import { foodItemSchema } from '@mindful-plate/shared';
import { db } from '../../db';
import { foods } from '../../db/schema';
import { ilike, or, and, eq, gt, asc, desc } from 'drizzle-orm';

const SEARCH_SORTS = {
  name: asc(foods.name),
  calories: asc(foods.calories),
  protein: desc(foods.protein),
} as const;
type SearchSort = keyof typeof SEARCH_SORTS;

export const foodRoutes: FastifyPluginAsync = async (fastify) => {
  // Paginated, filterable, sortable search. `source` narrows to common
  // (isCustom=false) or custom (isCustom=true) foods; `sort` defaults to
  // name. Fetches one extra row over `limit` to derive `hasMore` without a
  // separate count query.
  fastify.get('/search', async (request, reply) => {
    const { q, source, sort, limit: limitParam, offset: offsetParam } = request.query as {
      q?: string;
      source?: string;
      sort?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(Math.max(parseInt(limitParam ?? '', 10) || 20, 1), 50);
    const offset = Math.max(parseInt(offsetParam ?? '', 10) || 0, 0);
    const orderBy = SEARCH_SORTS[sort as SearchSort] ?? SEARCH_SORTS.name;

    const conditions = [];
    if (q && q.trim().length > 0) {
      conditions.push(or(ilike(foods.name, `%${q}%`), ilike(foods.brand, `%${q}%`)));
    }
    if (source === 'common') {
      conditions.push(eq(foods.isCustom, false));
    } else if (source === 'custom') {
      conditions.push(eq(foods.isCustom, true));
    }

    const results = await db.query.foods.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [orderBy],
      limit: limit + 1,
      offset,
    });

    const hasMore = results.length > limit;
    return reply.send({
      foods: hasMore ? results.slice(0, limit) : results,
      hasMore,
      offset,
      limit,
    });
  });

  // Incremental sync for the mobile app's local SQLite cache: with no `since`,
  // returns the full table (first sync); with `since`, only rows created
  // after it. `createdAt` is `timestamp with time zone`, so this cursor
  // could just use this process's own clock — using the returned rows'
  // own latest `createdAt` (+1ms, since Postgres's microsecond precision
  // exceeds JS Date's millisecond precision) instead is still correct and
  // avoids ever depending on this server's clock being right.
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
