import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { geminiService } from './gemini.service';

const textAnalysisSchema = z.object({
  prompt: z.string().min(1),
});

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, rep) => {
    try { await req.jwtVerify(); } catch (err) { rep.send(err); }
  });

  // Natural language meal analysis
  fastify.post('/parse-text', async (request, reply) => {
    const parseResult = textAnalysisSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    try {
      const result = await geminiService.parseFoodText(parseResult.data.prompt);
      return reply.send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to analyze meal with Gemini AI',
        message: err.message,
      });
    }
  });

  // Photo meal analysis (multipart upload)
  fastify.post('/parse-image', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No image file uploaded' });
      }

      const buffer = await data.toBuffer();
      const mimeType = data.mimetype;

      const result = await geminiService.parseFoodImage(buffer, mimeType);
      return reply.send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to analyze image with Gemini AI',
        message: err.message,
      });
    }
  });
};
