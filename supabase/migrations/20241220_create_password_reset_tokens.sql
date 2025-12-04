-- Create table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- RLS policies
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for service_role (full access)
CREATE POLICY "Service role can manage password reset tokens" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for authenticated users (only their own tokens)
CREATE POLICY "Users can view their own password reset tokens" ON password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic cleanup of expired tokens when creating new ones
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up expired tokens before inserting a new one
  PERFORM cleanup_expired_password_reset_tokens();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cleanup_expired_tokens_trigger
  BEFORE INSERT ON password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_expired_tokens();

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Tokens for user password recovery';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ID of the user for whom the token was created';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique token for password recovery';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Token usage time (NULL if not used)';
