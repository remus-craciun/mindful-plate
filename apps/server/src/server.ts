import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { foodRoutes } from './modules/foods/foods.routes';
import { mealRoutes } from './modules/meals/meals.routes';
import { waterRoutes } from './modules/water/water.routes';
import { recipeRoutes } from './modules/recipes/recipes.routes';
import { aiRoutes } from './modules/ai/ai.routes';

export async function buildServer(isTest = false) {
  const isDev = process.env.NODE_ENV !== 'production';

  const fastify = Fastify({
    logger: isTest
      ? false
      : isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        }
      : true,
  });

  // Plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max image upload
    },
  });

  // Conditionally register Swagger/OpenAPI docs (development & testing only; disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Mindful Plate API',
          description: 'Nutrition, calorie, and meal tracking API with Gemini AI',
          version: '1.0.0',
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
    });
  }

  // Health check: simple status without internal engine/stack exposure
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Route groups
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(foodRoutes, { prefix: '/api/foods' });
  await fastify.register(mealRoutes, { prefix: '/api/meals' });
  await fastify.register(waterRoutes, { prefix: '/api/water' });
  await fastify.register(recipeRoutes, { prefix: '/api/recipes' });
  await fastify.register(aiRoutes, { prefix: '/api/ai' });

  return fastify;
}

if (import.meta.main) {
  const server = await buildServer();
  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    console.log(`Server listening on http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
    if (env.NODE_ENV !== 'production') {
      console.log(`Swagger documentation available at http://${env.HOST}:${env.PORT}/docs`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
