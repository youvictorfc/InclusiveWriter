-- Add supabase_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS supabase_id TEXT UNIQUE,
DROP COLUMN IF EXISTS password_hash,
DROP COLUMN IF EXISTS verification_token,
DROP COLUMN IF EXISTS verification_expires,
DROP COLUMN IF EXISTS is_verified,
DROP COLUMN IF EXISTS username;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_user_id_fkey'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
  END IF;
END $$;
