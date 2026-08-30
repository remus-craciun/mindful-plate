import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Check if an account already exists in the system (single-account mode)
  fastify.get('/status', async () => {
    try {
      const existingUser = await db.query.users.findFirst();
      return {
        hasAccount: !!existingUser,
        email: existingUser ? existingUser.email : null,
      };
    } catch {
      // If DB is not connected or tables not yet pushed, return default hasAccount false
      return {
        hasAccount: false,
        email: null,
      };
    }
  });

  fastify.post('/register', async (request, reply) => {
    // Check if an account already exists (enforce single-account setup)
    const existingUser = await db.query.users.findFirst();
    if (existingUser) {
      return reply.status(403).send({ 
        error: 'Registration closed. Single-account application already configured.' 
      });
    }

    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { email, password } = parseResult.data;

    // Bun native password hasher
    const passwordHash = await Bun.password.hash(password);
    let newUser;
    try {
      [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
      }).returning({ id: users.id, email: users.email });
    } catch (err: any) {
      // Unique constraint violation: another registration won the race.
      if (err?.code === '23505') {
        return reply.status(403).send({
          error: 'Registration closed. Single-account application already configured.',
        });
      }
      throw err;
    }

    const token = fastify.jwt.sign({ id: newUser.id, email: newUser.email });
    return reply.status(201).send({ user: newUser, token });
  });

  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { email, password } = parseResult.data;
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const isValid = await Bun.password.verify(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.send({ user: { id: user.id, email: user.email }, token });
  });

  fastify.get('/me', {
    onRequest: [async (req, rep) => {
      try { await req.jwtVerify(); } catch (err) { rep.send(err); }
    }]
  }, async (request) => {
    const payload = request.user as { id: string; email: string };
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id),
      with: { profile: true },
    });
    return { user };
  });
};
