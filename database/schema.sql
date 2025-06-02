-- Users table (handled by Supabase Auth)

-- Shops table
CREATE TABLE shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL, -- Physical device identifier
  name VARCHAR(255) NOT NULL,
  description TEXT,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('vending_machine', 'relay_device', 'water_pump')),
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  
  -- Vending machine specific fields
  liquid_type VARCHAR(50), -- 'milk' or 'cooking_oil'
  current_level INTEGER DEFAULT 0, -- in ml
  max_capacity INTEGER DEFAULT 5000, -- in ml
  
  -- Water pump specific fields
  state VARCHAR(10) DEFAULT 'off' CHECK (state IN ('on', 'off')),
  balance DECIMAL(10,2) DEFAULT 0, -- in liters
  
  last_seen TIMESTAMP WITH TIME ZONE,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relay channels table
CREATE TABLE relay_channels (
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

-- MQTT messages table
CREATE TABLE mqtt_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  device_id VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_devices_owner ON devices(owner);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_type ON devices(device_type);
CREATE INDEX idx_relay_channels_device ON relay_channels(device_id);
CREATE INDEX idx_mqtt_messages_device ON mqtt_messages(device_id);
CREATE INDEX idx_mqtt_messages_timestamp ON mqtt_messages(timestamp);

-- Row Level Security (RLS) policies
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- Shops policies
CREATE POLICY "Users can view their own shops" ON shops
  FOR SELECT USING (auth.uid() = owner);

CREATE POLICY "Users can create shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update their own shops" ON shops
  FOR UPDATE USING (auth.uid() = owner);

-- Devices policies
CREATE POLICY "Users can view their own devices" ON devices
  FOR SELECT USING (auth.uid() = owner OR owner IS NULL);

CREATE POLICY "Users can update their own devices" ON devices
  FOR UPDATE USING (auth.uid() = owner);

-- Admin can create devices (you'll need to set up admin role)
CREATE POLICY "Admins can create devices" ON devices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Relay channels policies
CREATE POLICY "Users can view relay channels for their devices" ON relay_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.id = relay_channels.device_id 
      AND devices.owner = auth.uid()
    )
  );

CREATE POLICY "Users can update relay channels for their devices" ON relay_channels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.id = relay_channels.device_id 
      AND devices.owner = auth.uid()
    )
  );

-- MQTT messages policies (read-only for users)
CREATE POLICY "Users can view MQTT messages for their devices" ON mqtt_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.device_id = mqtt_messages.device_id 
      AND devices.owner = auth.uid()
    )
  );

-- Functions and triggers for automatic relay channel creation
CREATE OR REPLACE FUNCTION create_relay_channels()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create channels for relay devices
  IF NEW.device_type = 'relay_device' THEN
    -- Create 8 input channels
    FOR i IN 1..8 LOOP
      INSERT INTO relay_channels (device_id, channel_number, channel_type, display_name)
      VALUES (NEW.id, i, 'input', 'IN_' || i);
    END LOOP;
    
    -- Create 8 output channels
    FOR i IN 1..8 LOOP
      INSERT INTO relay_channels (device_id, channel_number, channel_type, display_name)
      VALUES (NEW.id, i, 'output', 'OUT_' || i);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_relay_channels
  AFTER INSERT ON devices
  FOR EACH ROW
  EXECUTE FUNCTION create_relay_channels();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relay_channels_updated_at BEFORE UPDATE ON relay_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
