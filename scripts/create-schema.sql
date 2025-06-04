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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_shop ON devices(shop_id);
CREATE INDEX IF NOT EXISTS idx_relay_channels_device ON relay_channels(device_id);

-- Enable Row Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_channels ENABLE ROW LEVEL SECURITY;

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
