import { Pool } from 'pg';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: Pool;
  }
}