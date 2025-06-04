-- First, create the shops table (referenced by devices)
CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
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
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_shop ON devices(shop_id);
CREATE INDEX IF NOT EXISTS idx_relay_channels_device ON relay_channels(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_device ON mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_timestamp ON mqtt_messages(timestamp);

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shops
DROP POLICY IF EXISTS "Users can view their own shops" ON shops;
CREATE POLICY "Users can view their own shops" ON shops
  FOR SELECT USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Users can create shops" ON shops;
CREATE POLICY "Users can create shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update their own shops" ON shops;
CREATE POLICY "Users can update their own shops" ON shops
  FOR UPDATE USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own shops" ON shops;
CREATE POLICY "Users can delete their own shops" ON shops
  FOR DELETE USING (auth.uid() = owner);

-- RLS Policies for devices
DROP POLICY IF EXISTS "Users can view their own devices" ON devices;
CREATE POLICY "Users can view their own devices" ON devices
  FOR SELECT USING (auth.uid() = owner OR owner IS NULL);

DROP POLICY IF EXISTS "Users can update their own devices" ON devices;
CREATE POLICY "Users can update their own devices" ON devices
  FOR UPDATE USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Admins can create devices" ON devices;
CREATE POLICY "Admins can create devices" ON devices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete devices" ON devices;
CREATE POLICY "Admins can delete devices" ON devices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for relay_channels
DROP POLICY IF EXISTS "Users can view relay channels for their devices" ON relay_channels;
CREATE POLICY "Users can view relay channels for their devices" ON relay_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.id = relay_channels.device_id 
      AND devices.owner = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update relay channels for their devices" ON relay_channels;
CREATE POLICY "Users can update relay channels for their devices" ON relay_channels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.id = relay_channels.device_id 
      AND devices.owner = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage relay channels" ON relay_channels;
CREATE POLICY "Admins can manage relay channels" ON relay_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for mqtt_messages
DROP POLICY IF EXISTS "Users can view MQTT messages for their devices" ON mqtt_messages;
CREATE POLICY "Users can view MQTT messages for their devices" ON mqtt_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.device_id = mqtt_messages.device_id 
      AND devices.owner = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert MQTT messages" ON mqtt_messages;
CREATE POLICY "System can insert MQTT messages" ON mqtt_messages
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
      VALUES (NEW.id, i, 'output', 'OUT_' || i, 'light');
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

-- Add update triggers for shops
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add update triggers for devices
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add update triggers for relay_channels
DROP TRIGGER IF EXISTS update_relay_channels_updated_at ON relay_channels;
CREATE TRIGGER update_relay_channels_updated_at BEFORE UPDATE ON relay_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('shops', 'devices', 'relay_channels', 'mqtt_messages')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
