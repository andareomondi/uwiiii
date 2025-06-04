-- Check current table structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('devices', 'relay_channels')
ORDER BY table_name, ordinal_position;

-- If relay_channels table exists but has wrong foreign key, let's fix it
-- First, check if the foreign key column exists
DO $$
BEGIN
    -- Check if device_id column exists in relay_channels
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'relay_channels' AND column_name = 'device_id'
    ) THEN
        -- If it exists, we're good
        RAISE NOTICE 'device_id column exists in relay_channels';
    ELSE
        -- If it doesn't exist, add it
        ALTER TABLE relay_channels ADD COLUMN device_id UUID REFERENCES devices(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added device_id column to relay_channels';
    END IF;
END $$;

-- Update existing relay_channels to have proper device_id if needed
-- This is a placeholder - you might need to adjust based on your data
