// src/index.ts

import Fastify from 'fastify';
import { Pool } from 'pg';
import { config } from './config';
import { apiRoutes } from './api/routes';
import { ingestionService } from './core/ingestionService';

async function main() {
    const server = Fastify({ logger: true });

    try {
        // Setup Database Connection Pool
        const dbPool = new Pool(config.db);
        // Test the connection
        const client = await dbPool.connect();
        server.log.info('Database connected successfully.');
        client.release();

        // Make the pool available to routes
        server.decorate('pg', dbPool);

        // Register routes
        server.register(apiRoutes);

        // Start the background worker
        ingestionService.startWorker(dbPool);

        await server.listen({ port: config.port as number, host: '0.0.0.0' });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

main();