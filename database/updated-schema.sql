-- Drop existing devices table and create separate tables for each device type

-- Shops table (unchanged)
CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vending machines table
CREATE TABLE IF NOT EXISTS vending_machines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  liquid_type VARCHAR(50) NOT NULL CHECK (liquid_type IN ('milk', 'cooking_oil')),
  current_level INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5000,
  last_seen TIMESTAMP WITH TIME ZONE,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relay devices table
CREATE TABLE IF NOT EXISTS relay_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  last_seen TIMESTAMP WITH TIME ZONE,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Water pumps table
CREATE TABLE IF NOT EXISTS water_pumps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  state VARCHAR(10) DEFAULT 'off' CHECK (state IN ('on', 'off')),
  balance DECIMAL(10,2) DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relay channels table (updated to reference relay_devices)
CREATE TABLE IF NOT EXISTS relay_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  relay_device_id UUID REFERENCES relay_devices(id) ON DELETE CASCADE,
  channel_number INTEGER NOT NULL CHECK (channel_number BETWEEN 1 AND 8),
  channel_type VARCHAR(10) NOT NULL CHECK (channel_type IN ('input', 'output')),
  display_name VARCHAR(100) DEFAULT '',
  gui_switch_type VARCHAR(20) DEFAULT 'light' CHECK (gui_switch_type IN ('light', 'fan', 'outlet')),
  state VARCHAR(10) DEFAULT 'off' CHECK (state IN ('on', 'off')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(relay_device_id, channel_number, channel_type)
);

-- MQTT messages table (unchanged)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vending_machines_owner ON vending_machines(owner);
CREATE INDEX IF NOT EXISTS idx_vending_machines_device_id ON vending_machines(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_devices_owner ON relay_devices(owner);
CREATE INDEX IF NOT EXISTS idx_relay_devices_device_id ON relay_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_water_pumps_owner ON water_pumps(owner);
CREATE INDEX IF NOT EXISTS idx_water_pumps_device_id ON water_pumps(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_channels_device ON relay_channels(relay_device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_device ON mqtt_messages(device_id);

-- Enable RLS
ALTER TABLE vending_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vending_machines
CREATE POLICY "Users can view their own vending machines" ON vending_machines
  FOR SELECT USING (auth.uid() = owner OR owner IS NULL);

CREATE POLICY "Users can update their own vending machines" ON vending_machines
  FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Admins can create vending machines" ON vending_machines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for relay_devices
CREATE POLICY "Users can view their own relay devices" ON relay_devices
  FOR SELECT USING (auth.uid() = owner OR owner IS NULL);

CREATE POLICY "Users can update their own relay devices" ON relay_devices
  FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Admins can create relay devices" ON relay_devices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for water_pumps
CREATE POLICY "Users can view their own water pumps" ON water_pumps
  FOR SELECT USING (auth.uid() = owner OR owner IS NULL);

CREATE POLICY "Users can update their own water pumps" ON water_pumps
  FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Admins can create water pumps" ON water_pumps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for relay_channels
CREATE POLICY "Users can view relay channels for their devices" ON relay_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM relay_devices 
      WHERE relay_devices.id = relay_channels.relay_device_id 
      AND relay_devices.owner = auth.uid()
    )
  );

CREATE POLICY "Users can update relay channels for their devices" ON relay_channels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM relay_devices 
      WHERE relay_devices.id = relay_channels.relay_device_id 
      AND relay_devices.owner = auth.uid()
    )
  );

-- Function to create relay channels for new relay devices
CREATE OR REPLACE FUNCTION create_relay_channels_for_device()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 8 input channels
  FOR i IN 1..8 LOOP
    INSERT INTO relay_channels (relay_device_id, channel_number, channel_type, display_name)
    VALUES (NEW.id, i, 'input', 'IN_' || i);
  END LOOP;
  
  -- Create 8 output channels
  FOR i IN 1..8 LOOP
    INSERT INTO relay_channels (relay_device_id, channel_number, channel_type, display_name)
    VALUES (NEW.id, i, 'output', 'OUT_' || i);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for relay devices
DROP TRIGGER IF EXISTS trigger_create_relay_channels ON relay_devices;
CREATE TRIGGER trigger_create_relay_channels
  AFTER INSERT ON relay_devices
  FOR EACH ROW
  EXECUTE FUNCTION create_relay_channels_for_device();

-- Update timestamp functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_vending_machines_updated_at BEFORE UPDATE ON vending_machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relay_devices_updated_at BEFORE UPDATE ON relay_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_water_pumps_updated_at BEFORE UPDATE ON water_pumps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relay_channels_updated_at BEFORE UPDATE ON relay_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
