import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/mindful_plate'),
  JWT_SECRET: z.string().min(16).default('mindful_plate_super_secure_jwt_secret_key_123!'),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
