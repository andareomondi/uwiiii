-- VendorFlow Database Setup Script
-- Creates all necessary tables, relationships, and sample data

-- Create the shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  owner UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('vending_machine', 'relay_device', 'water_pump')),
  owner UUID,
  shop_id UUID,
  is_active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  
  -- Vending machine specific fields
  liquid_type VARCHAR(50) CHECK (liquid_type IN ('milk', 'cooking_oil')),
  current_level INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5000,
  
  -- Water pump specific fields
  state VARCHAR(10) DEFAULT 'off' CHECK (state IN ('on', 'off')),
  balance DECIMAL(10,2) DEFAULT 0,
  
  last_seen TIMESTAMP WITH TIME ZONE,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the relay_channels table
CREATE TABLE IF NOT EXISTS relay_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID,
  channel_number INTEGER NOT NULL CHECK (channel_number BETWEEN 1 AND 8),
  channel_type VARCHAR(10) NOT NULL CHECK (channel_type IN ('input', 'output')),
  display_name VARCHAR(100) DEFAULT '',
  gui_switch_type VARCHAR(20) DEFAULT 'light' CHECK (gui_switch_type IN ('light', 'fan', 'outlet', 'heater', 'pump')),
  state VARCHAR(10) DEFAULT 'off' CHECK (state IN ('on', 'off')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(device_id, channel_number, channel_type)
);

-- Create the mqtt_messages table
CREATE TABLE IF NOT EXISTS mqtt_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  device_id VARCHAR(255),
  device_type VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
DO $$ 
BEGIN
  -- Add foreign key for devices.shop_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'devices_shop_id_fkey' 
    AND table_name = 'devices'
  ) THEN
    ALTER TABLE devices ADD CONSTRAINT devices_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for relay_channels.device_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'relay_channels_device_id_fkey' 
    AND table_name = 'relay_channels'
  ) THEN
    ALTER TABLE relay_channels ADD CONSTRAINT relay_channels_device_id_fkey 
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_shop ON devices(shop_id);
CREATE INDEX IF NOT EXISTS idx_relay_channels_device ON relay_channels(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_device ON mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_timestamp ON mqtt_messages(timestamp);

-- Function to create relay channels for new relay devices
CREATE OR REPLACE FUNCTION create_relay_channels_for_device()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create channels for relay devices
  IF NEW.device_type = 'relay_device' THEN
    -- Create 8 input channels
    FOR i IN 1..8 LOOP
      INSERT INTO relay_channels (device_id, channel_number, channel_type, display_name, gui_switch_type)
      VALUES (NEW.id, i, 'input', 'Input ' || i, 'light');
    END LOOP;
    
    -- Create 8 output channels with different switch types
    INSERT INTO relay_channels (device_id, channel_number, channel_type, display_name, gui_switch_type) VALUES
    (NEW.id, 1, 'output', 'Living Room Light', 'light'),
    (NEW.id, 2, 'output', 'Ceiling Fan', 'fan'),
    (NEW.id, 3, 'output', 'Power Outlet', 'outlet'),
    (NEW.id, 4, 'output', 'Water Heater', 'heater'),
    (NEW.id, 5, 'output', 'Garden Pump', 'pump'),
    (NEW.id, 6, 'output', 'Kitchen Light', 'light'),
    (NEW.id, 7, 'output', 'Bedroom Fan', 'fan'),
    (NEW.id, 8, 'output', 'Garage Outlet', 'outlet');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create relay channels
DROP TRIGGER IF EXISTS trigger_create_relay_channels ON devices;
CREATE TRIGGER trigger_create_relay_channels
  AFTER INSERT ON devices
  FOR EACH ROW
  EXECUTE FUNCTION create_relay_channels_for_device();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_relay_channels_updated_at ON relay_channels;
CREATE TRIGGER update_relay_channels_updated_at BEFORE UPDATE ON relay_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample devices for VendorFlow
INSERT INTO devices (device_id, name, description, device_type, liquid_type, max_capacity) VALUES
('VF_VM001', 'VendorFlow Milk Station #1', 'Main entrance fresh milk dispenser', 'vending_machine', 'milk', 5000),
('VF_VM002', 'VendorFlow Oil Dispenser #1', 'Kitchen premium cooking oil station', 'vending_machine', 'cooking_oil', 3000),
('VF_RD001', 'VendorFlow Smart Controller', 'Main building relay control system', 'relay_device', NULL, NULL),
('VF_WP001', 'VendorFlow Garden Pump', 'Automated irrigation water pump system', 'water_pump', NULL, NULL)
ON CONFLICT (device_id) DO NOTHING;

-- Verify tables were created successfully
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('shops', 'devices', 'relay_channels', 'mqtt_messages')
  AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- Show sample data
SELECT 'VendorFlow sample devices created:' as info;
SELECT device_id, name, device_type FROM devices WHERE device_id LIKE 'VF_%' LIMIT 5;
