-- Drop the functions we created
DROP FUNCTION IF EXISTS public.get_user_role;
DROP FUNCTION IF EXISTS public.set_user_role;
DROP FUNCTION IF EXISTS update_user_roles_updated_at;

-- Drop the user_roles table and all its dependencies
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Remove any policies we created
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Restore the original sample data
INSERT INTO devices (device_id, name, description, device_type, liquid_type, max_capacity) VALUES
('VM001', 'Milk Vending Machine #1', 'Main entrance milk dispenser', 'vending_machine', 'milk', 5000),
('VM002', 'Oil Vending Machine #1', 'Kitchen cooking oil dispenser', 'vending_machine', 'cooking_oil', 3000),
('RD001', 'Living Room Controller', 'Main living room relay controller', 'relay_device', NULL, NULL),
('WP001', 'Garden Water Pump', 'Automatic garden watering system', 'water_pump', NULL, NULL)
ON CONFLICT (device_id) DO NOTHING; 