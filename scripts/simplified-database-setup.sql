-- Create the shops table without foreign key constraints initially
CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  owner UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the devices table without foreign key constraints initially
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
  gui_switch_type VARCHAR(20) DEFAULT 'light' CHECK (gui_switch_type IN ('light', 'fan', 'outlet')),
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

-- Add foreign key constraints after tables are created
DO $$ 
BEGIN
  -- Add foreign key for shops.owner if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shops_owner_fkey' 
    AND table_name = 'shops'
  ) THEN
    BEGIN
      ALTER TABLE shops ADD CONSTRAINT shops_owner_fkey 
      FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- If auth.users doesn't exist, just continue without the constraint
      RAISE NOTICE 'Could not add foreign key constraint for shops.owner - auth.users may not be accessible';
    END;
  END IF;

  -- Add foreign key for devices.owner if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'devices_owner_fkey' 
    AND table_name = 'devices'
  ) THEN
    BEGIN
      ALTER TABLE devices ADD CONSTRAINT devices_owner_fkey 
      FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key constraint for devices.owner - auth.users may not be accessible';
    END;
  END IF;

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

-- Enable Row Level Security (but with simpler policies)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies that don't depend on auth.users metadata
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON shops;
CREATE POLICY "Enable read access for authenticated users" ON shops
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shops;
CREATE POLICY "Enable insert for authenticated users" ON shops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for shop owners" ON shops;
CREATE POLICY "Enable update for shop owners" ON shops
  FOR UPDATE USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Enable delete for shop owners" ON shops;
CREATE POLICY "Enable delete for shop owners" ON shops
  FOR DELETE USING (auth.uid() = owner);

-- Device policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON devices;
CREATE POLICY "Enable read access for all authenticated users" ON devices
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON devices;
CREATE POLICY "Enable insert for authenticated users" ON devices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for device owners" ON devices;
CREATE POLICY "Enable update for device owners" ON devices
  FOR UPDATE USING (auth.uid() = owner OR owner IS NULL);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON devices;
CREATE POLICY "Enable delete for authenticated users" ON devices
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Relay channel policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON relay_channels;
CREATE POLICY "Enable read access for authenticated users" ON relay_channels
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON relay_channels;
CREATE POLICY "Enable insert for authenticated users" ON relay_channels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON relay_channels;
CREATE POLICY "Enable update for authenticated users" ON relay_channels
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON relay_channels;
CREATE POLICY "Enable delete for authenticated users" ON relay_channels
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- MQTT message policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON mqtt_messages;
CREATE POLICY "Enable read access for authenticated users" ON mqtt_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for all" ON mqtt_messages;
CREATE POLICY "Enable insert for all" ON mqtt_messages
  FOR INSERT WITH CHECK (true);

-- Function to create relay channels for new relay devices
CREATE OR REPLACE FUNCTION create_relay_channels_for_device()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create channels for relay devices
  IF NEW.device_type = 'relay_device' THEN
    -- Create 4 output channels (most common setup)
    FOR i IN 1..4 LOOP
      INSERT INTO relay_channels (device_id, channel_number, channel_type, display_name, gui_switch_type)
      VALUES (NEW.id, i, 'output', 'Channel ' || i, 'light');
    END LOOP;
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

-- Insert some sample devices for testing (optional)
INSERT INTO devices (device_id, name, description, device_type, liquid_type, max_capacity) VALUES
('VM001', 'Milk Vending Machine #1', 'Main entrance milk dispenser', 'vending_machine', 'milk', 5000),
('VM002', 'Oil Vending Machine #1', 'Kitchen cooking oil dispenser', 'vending_machine', 'cooking_oil', 3000),
('RD001', 'Living Room Controller', 'Main living room relay controller', 'relay_device', NULL, NULL),
('WP001', 'Garden Water Pump', 'Automatic garden watering system', 'water_pump', NULL, NULL)
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
SELECT 'Sample devices created:' as info;
SELECT device_id, name, device_type FROM devices LIMIT 5;
