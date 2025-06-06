-- Add phone number property to all devices for SMS control
-- This allows users to send SMS directly to the device's SIM card when offline

-- Add the phone_number column to the devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) DEFAULT NULL;

-- Add SMS command format for different device types
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS sms_commands JSONB DEFAULT '{}';

-- Update existing devices with sample phone numbers and SMS commands
-- Vending machines
UPDATE devices 
SET 
  phone_number = CASE 
    WHEN device_id = 'VF_VM001' THEN '+254712345001'
    WHEN device_id = 'VF_VM002' THEN '+254712345002'
    ELSE '+254712' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0')
  END,
  sms_commands = '{
    "dispense_100": "DISPENSE 100",
    "dispense_250": "DISPENSE 250", 
    "dispense_500": "DISPENSE 500",
    "status": "STATUS",
    "help": "HELP"
  }'::jsonb
WHERE device_type = 'vending_machine';

-- Relay devices
UPDATE devices 
SET 
  phone_number = CASE 
    WHEN device_id = 'VF_RD001' THEN '+254712345003'
    ELSE '+254712' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0')
  END,
  sms_commands = '{
    "turn_on_channel": "ON [CHANNEL_NUMBER]",
    "turn_off_channel": "OFF [CHANNEL_NUMBER]",
    "status": "STATUS",
    "help": "HELP"
  }'::jsonb
WHERE device_type = 'relay_device';

-- Water pumps
UPDATE devices 
SET 
  phone_number = CASE 
    WHEN device_id = 'VF_WP001' THEN '+254712345004'
    ELSE '+254712' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0')
  END,
  sms_commands = '{
    "start_pump": "START",
    "stop_pump": "STOP",
    "status": "STATUS",
    "help": "HELP"
  }'::jsonb
WHERE device_type = 'water_pump';

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_devices_phone_number ON devices(phone_number);

-- Verify the changes
SELECT 
  device_id,
  name,
  device_type,
  phone_number,
  sms_commands
FROM devices 
WHERE phone_number IS NOT NULL
ORDER BY device_type, device_id;

-- Show SMS command examples for each device type
SELECT 
  device_type,
  COUNT(*) as device_count,
  jsonb_pretty(sms_commands) as example_sms_commands
FROM devices 
WHERE phone_number IS NOT NULL
GROUP BY device_type, sms_commands
ORDER BY device_type;
