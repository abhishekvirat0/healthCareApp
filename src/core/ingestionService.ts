import { Pool } from 'pg';
import { VitalData } from './types';

// This is our "swappable" component. For now, a simple in-memory array.
const queue: VitalData[] = [];

export const ingestionService = {
    addToQueue: (data: VitalData) => {
        queue.push(data);
    },

    startWorker: (dbPool: Pool) => {
        console.log('Starting ingestion worker...');
        setInterval(() => {
            if (queue.length > 0) {
                const batch = queue.splice(0, 100); // Process up to 100 items
                processBatch(dbPool, batch);
            }
        }, 5000); // Process every 5 seconds
    }
};

async function processBatch(dbPool: Pool, batch: VitalData[]) {
    const client = await dbPool.connect();
    try {
        // Using a single transaction for the whole batch is efficient
        await client.query('BEGIN');

        for (const item of batch) {
            // COALESCE to only update fields that are present in the new data.
            const query = `
                INSERT INTO latest_device_vitals (
                    device_id, heart_rate, breath_rate, blood_pressure_systolic, blood_pressure_diastolic, last_updated
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (device_id) DO UPDATE SET
                    heart_rate = COALESCE($2, latest_device_vitals.heart_rate),
                    breath_rate = COALESCE($3, latest_device_vitals.breath_rate),
                    blood_pressure_systolic = COALESCE($4, latest_device_vitals.blood_pressure_systolic),
                    blood_pressure_diastolic = COALESCE($5, latest_device_vitals.blood_pressure_diastolic),
                    last_updated = $6
                WHERE latest_device_vitals.last_updated < $6; -- Optional: Prevent older data from overwriting newer data
            `;
            const values = [
                item.device,
                item.heartRateValue,
                item.breathValue,
                item.bloodPressureSystolic,
                item.bloodPressureDiastolic,
                new Date(item.timestamp * 1000) // Convert Unix timestamp to JS Date
            ];
            await client.query(query, values);
        }

        await client.query('COMMIT');
        console.log(`Successfully processed a batch of ${batch.length} items.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing batch, rolling back:', error);
        
    } finally {
        client.release();
    }
}