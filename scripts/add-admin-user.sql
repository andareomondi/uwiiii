-- Script to make your current user an admin

UPDATE auth.users
SET raw_user_meta_data = '{"role": "admin"}'
WHERE id = 'your-user-id';
-- Note: Make sure to replace 'your-user-id' with the actual user ID of the user you want to promote to admin.
