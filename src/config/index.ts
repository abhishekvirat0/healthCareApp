import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.APP_PORT || 3000,
    db: {
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    },
};