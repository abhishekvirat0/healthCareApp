import { Pool } from 'pg';

// Allowed columns for sorting to prevent SQL injection
const allowedSortColumns: { [key: string]: string } = {
    deviceId: 'device_id',
    heartRate: 'heart_rate',
    breathRate: 'breath_rate',
    timestamp: 'last_updated',
};

export const repository = {
    async findLatestVitals(
        dbPool: Pool,
        options: { sortBy: string; orderBy: 'asc' | 'desc'; limit: number; offset: number }
    ) {
        const { limit, offset } = options;
        // Safely get the column name, defaulting to last_updated
        const sortByColumn = allowedSortColumns[options.sortBy] || 'last_updated';
        const orderByDirection = options.orderBy.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const query = `
            SELECT
                device_id AS "deviceId",
                heart_rate AS "heartRate",
                breath_rate AS "breathRate",
                blood_pressure_systolic AS "bloodPressureSystolic",
                blood_pressure_diastolic AS "bloodPressureDiastolic",
                extract(epoch from last_updated) as "lastUpdated"
            FROM latest_device_vitals
            ORDER BY ${sortByColumn} ${orderByDirection}
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `SELECT COUNT(*) as total FROM latest_device_vitals;`;

        const [resourcesResult, totalResult] = await Promise.all([
            dbPool.query(query, [limit, offset]),
            dbPool.query(countQuery),
        ]);

        return {
            total: parseInt(totalResult.rows[0].total, 10),
            resources: resourcesResult.rows,
        };
    }
};