import { z } from 'zod';

export const vitalDataSchema = z.object({
    device: z.string({ required_error: "Device ID is required" }).min(1),
    timestamp: z.number({ required_error: "Timestamp is required" }).int().positive(),
    heartRateValue: z.number().optional(),
    breathValue: z.number().optional(),
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
}).passthrough();

export type VitalData = z.infer<typeof vitalDataSchema>;