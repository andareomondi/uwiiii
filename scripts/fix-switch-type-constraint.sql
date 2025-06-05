-- Fix the gui_switch_type check constraint to allow all switch types used in the UI

-- First, drop the existing constraint
ALTER TABLE relay_channels DROP CONSTRAINT IF EXISTS relay_channels_gui_switch_type_check;

-- Add the updated constraint with all the switch types we use
ALTER TABLE relay_channels ADD CONSTRAINT relay_channels_gui_switch_type_check 
CHECK (gui_switch_type IN ('light', 'fan', 'outlet', 'heater', 'pump'));

-- Update any existing channels that might have invalid switch types
UPDATE relay_channels 
SET gui_switch_type = 'light' 
WHERE gui_switch_type NOT IN ('light', 'fan', 'outlet', 'heater', 'pump');

-- Verify the constraint is working
SELECT DISTINCT gui_switch_type FROM relay_channels;
