-- Add Spotify connections table for OAuth integration
CREATE TABLE IF NOT EXISTS spotify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  spotify_user_id TEXT,
  spotify_display_name TEXT,
  spotify_product TEXT,  -- 'premium' or 'free'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_spotify_connections_user_id ON spotify_connections(user_id);

-- Enable Row Level Security
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own Spotify connections
CREATE POLICY "Users can manage own spotify connections"
  ON spotify_connections FOR ALL USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spotify_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spotify_connections_updated_at
  BEFORE UPDATE ON spotify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_spotify_connections_updated_at();
