-- Create admin setup with initial super admin
-- First ensure admin_users table has necessary fields and constraints

-- Insert default super admin (you should change this password immediately)
-- Password: AdminPayFesa2025! (hashed with bcrypt)
INSERT INTO admin_users (
  username,
  password_hash,
  email,
  is_active,
  permissions
) VALUES (
  'superadmin',
  '$2a$10$rMVE8bqV.pQxJm/7zYJ8/.u5qVOGN5vLx8qWXNq0zKGh4Qf6YMQAy',
  'admin@payfesa.com',
  true,
  '["all"]'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- Create admin role if not exists
INSERT INTO admin_roles (
  name,
  display_name,
  description,
  permissions
) VALUES (
  'super_admin',
  'Super Administrator',
  'Full system access with all permissions',
  '["all"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Assign super admin role to the admin user
UPDATE admin_users 
SET role_id = (SELECT id FROM admin_roles WHERE name = 'super_admin' LIMIT 1)
WHERE username = 'superadmin';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

COMMENT ON TABLE admin_users IS 'Admin users with separate authentication from regular users';
COMMENT ON COLUMN admin_users.password_hash IS 'Bcrypt hashed password for admin authentication';
COMMENT ON COLUMN admin_users.permissions IS 'JSON array of permission strings';
