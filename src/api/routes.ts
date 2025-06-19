import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ingestionService } from '../core/ingestionService';
import { repository } from '../core/repository';

// Zod schema for strong, runtime validation
const vitalDataSchema = z.object({
    device: z.string(),
    timestamp: z.number().int().positive(),
    heartRateValue: z.number().optional(),
    breathValue: z.number().optional(),
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
}).passthrough(); // .passthrough() allows unknown fields

export async function apiRoutes(server: FastifyInstance) {
    server.post('/vital-data', async (request, reply) => {
        try {
            const data = vitalDataSchema.parse(request.body);
            ingestionService.addToQueue(data);
            return reply.code(202).send({ status: 'accepted' });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ status: 'error', message: 'Invalid payload', issues: error.issues });
            }
            return reply.code(500).send({ status: 'error', message: 'Internal server error' });
        }
    });


    server.get('/vital-data', async (request, reply) => {
        const querySchema = z.object({
            count: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
            offset: z.preprocess(Number, z.number().int().min(0)).default(0),
            sortBy: z.string().default('timestamp'),
            orderBy: z.enum(['asc', 'desc']).default('desc'),
        });

        const parseResult = querySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.code(400).send({ status: 'error', message: 'Invalid query parameters', issues: parseResult.error.issues });
        }
        const queryOptions = parseResult.data;
        
        const dbPool = server.pg;
        const data = await repository.findLatestVitals(dbPool, {
            sortBy: queryOptions.sortBy,
            orderBy: queryOptions.orderBy,
            limit: queryOptions.count,
            offset: queryOptions.offset
        });

        return reply.send(data);
    });
}