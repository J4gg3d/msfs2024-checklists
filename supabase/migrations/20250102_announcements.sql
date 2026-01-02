-- Announcements table for dynamic news/alerts without deployment
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_de TEXT NOT NULL,
  message_en TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'important')),
  display_mode TEXT NOT NULL DEFAULT 'both' CHECK (display_mode IN ('ticker', 'banner', 'both')),
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying of active announcements
CREATE INDEX idx_announcements_active ON announcements (active, starts_at, ends_at);

-- RLS: Everyone can read active announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
  ON announcements FOR SELECT
  USING (
    active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

-- Only authenticated users with admin role can modify (you'll need to set this up)
-- For now, use Supabase Dashboard to manage announcements

-- Example announcement (optional - remove in production)
-- INSERT INTO announcements (message_de, message_en, type, display_mode)
-- VALUES (
--   'Willkommen bei SimChecklist! Die Bridge ist jetzt als Download verfügbar.',
--   'Welcome to SimChecklist! The Bridge is now available for download.',
--   'info',
--   'ticker'
-- );

COMMENT ON TABLE announcements IS 'Dynamic announcements shown on the website without deployment';
COMMENT ON COLUMN announcements.message_de IS 'German announcement text';
COMMENT ON COLUMN announcements.message_en IS 'English announcement text';
COMMENT ON COLUMN announcements.type IS 'info (blue), warning (orange), important (red)';
COMMENT ON COLUMN announcements.display_mode IS 'ticker (scrolling), banner (dismissable), both';
COMMENT ON COLUMN announcements.starts_at IS 'When to start showing (NULL = immediately)';
COMMENT ON COLUMN announcements.ends_at IS 'When to stop showing (NULL = forever)';
