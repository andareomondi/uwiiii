-- Add a new property to all device types
-- Example: Adding 'location_coordinates' property to track GPS coordinates

-- Add the new column to the devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS location_coordinates JSONB DEFAULT '{"lat": null, "lng": null}';

-- Add another example property: maintenance_schedule
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB DEFAULT '{"last_maintenance": null, "next_maintenance": null, "maintenance_interval_days": 30}';

-- Add device-specific properties based on type
-- For vending machines: add refill tracking
UPDATE devices 
SET maintenance_schedule = jsonb_set(
  maintenance_schedule, 
  '{maintenance_interval_days}', 
  '7'::jsonb
)
WHERE device_type = 'vending_machine';

-- For relay devices: add power consumption tracking
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS power_consumption_watts INTEGER DEFAULT 0;

UPDATE devices 
SET power_consumption_watts = 50
WHERE device_type = 'relay_device';

-- For water pumps: add flow rate tracking
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS flow_rate_lpm DECIMAL(5,2) DEFAULT 0.0;

UPDATE devices 
SET flow_rate_lpm = 15.5
WHERE device_type = 'water_pump';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_location ON devices USING GIN (location_coordinates);
CREATE INDEX IF NOT EXISTS idx_devices_maintenance ON devices USING GIN (maintenance_schedule);

-- Verify the changes
SELECT 
  device_type,
  COUNT(*) as device_count,
  AVG(power_consumption_watts) as avg_power_consumption,
  AVG(flow_rate_lpm) as avg_flow_rate
FROM devices 
WHERE device_type IN ('vending_machine', 'relay_device', 'water_pump')
GROUP BY device_type;

-- Show sample data
SELECT 
  device_id,
  name,
  device_type,
  location_coordinates,
  maintenance_schedule,
  power_consumption_watts,
  flow_rate_lpm
FROM devices 
WHERE device_type IN ('vending_machine', 'relay_device', 'water_pump')
LIMIT 5;
