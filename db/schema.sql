-- db/schema.sql
CREATE TABLE IF NOT EXISTS latest_device_vitals (
    device_id TEXT PRIMARY KEY,
    heart_rate REAL,
    breath_rate REAL,
    blood_pressure_systolic REAL,
    blood_pressure_diastolic REAL,
    last_updated TIMESTAMPTZ NOT NULL
);

-- Create indexes for the sorting operations requested by the frontend team.
-- The primary key on device_id already provides an index for that.
CREATE INDEX IF NOT EXISTS idx_vitals_last_updated ON latest_device_vitals(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_heart_rate ON latest_device_vitals(heart_rate);
CREATE INDEX IF NOT EXISTS idx_vitals_breath_rate ON latest_device_vitals(breath_rate);

-- Add some example data to show the system works out of the box
INSERT INTO latest_device_vitals (device_id, heart_rate, last_updated) VALUES ('device-001', 80, NOW() - interval '1 minute');
INSERT INTO latest_device_vitals (device_id, heart_rate, breath_rate, last_updated) VALUES ('device-002', 65, 16, NOW() - interval '2 minute');