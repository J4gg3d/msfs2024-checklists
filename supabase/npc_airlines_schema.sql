-- ============================================
-- NPC AIRLINES SCHEMA EXTENSION
-- Run this in Supabase SQL Editor AFTER airlines_schema.sql
-- ============================================

-- 1. Add NPC columns to airlines table
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS is_npc BOOLEAN DEFAULT FALSE;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS real_airline_icao VARCHAR(4);
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS real_airline_name VARCHAR(100);
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS raw_flight_count INT DEFAULT 0;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS last_api_update TIMESTAMP WITH TIME ZONE;

-- 2. Index for quick NPC lookups
CREATE INDEX IF NOT EXISTS idx_airlines_is_npc ON airlines(is_npc);
CREATE INDEX IF NOT EXISTS idx_airlines_real_icao ON airlines(real_airline_icao);

-- 3. Table to track daily flight counts from API
CREATE TABLE IF NOT EXISTS npc_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  raw_flights INT DEFAULT 0,
  scaled_flights INT DEFAULT 0,
  raw_distance DECIMAL DEFAULT 0,
  scaled_distance DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(airline_id, date)
);

-- 4. Enable RLS on npc_daily_stats
ALTER TABLE npc_daily_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read NPC stats
CREATE POLICY "NPC stats are viewable by everyone"
  ON npc_daily_stats FOR SELECT
  USING (true);

-- Only service role can insert/update (via Edge Function)
-- No INSERT/UPDATE policies for anon users

-- 5. Function to get total player flights (for scaling)
CREATE OR REPLACE FUNCTION get_total_player_flights()
RETURNS INT AS $$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM flights f
  JOIN airlines a ON f.airline_id = a.id
  WHERE a.is_npc = FALSE OR f.airline_id IS NULL;

  RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to update NPC airline stats with scaling
CREATE OR REPLACE FUNCTION update_npc_airline_stats(
  p_airline_id UUID,
  p_raw_flights INT,
  p_raw_distance DECIMAL
)
RETURNS void AS $$
DECLARE
  player_flights INT;
  scale_factor DECIMAL;
  scaled_flights INT;
  scaled_distance DECIMAL;
  avg_score_per_flight DECIMAL;
BEGIN
  -- Get total player flights for scaling
  SELECT get_total_player_flights() INTO player_flights;

  -- Calculate scale factor (NPC gets at most as many flights as players have)
  IF p_raw_flights > 0 AND player_flights > 0 THEN
    scale_factor := LEAST(1.0, player_flights::DECIMAL / p_raw_flights);
  ELSE
    scale_factor := 0;
  END IF;

  -- Apply scaling
  scaled_flights := FLOOR(p_raw_flights * scale_factor);
  scaled_distance := p_raw_distance * scale_factor;

  -- Calculate score (similar to player score formula)
  -- Score = Distance + (Flights * 30) as simplified version for NPCs
  avg_score_per_flight := 30; -- Average landing bonus equivalent

  -- Update airline stats
  UPDATE airlines
  SET
    raw_flight_count = p_raw_flights,
    total_flights = scaled_flights,
    total_distance = scaled_distance,
    total_score = FLOOR(scaled_distance + (scaled_flights * avg_score_per_flight)),
    total_flight_time = scaled_flights * 7200, -- Assume 2h average per flight
    last_api_update = NOW()
  WHERE id = p_airline_id;

  -- Record daily stats
  INSERT INTO npc_daily_stats (airline_id, date, raw_flights, scaled_flights, raw_distance, scaled_distance)
  VALUES (p_airline_id, CURRENT_DATE, p_raw_flights, scaled_flights, p_raw_distance, scaled_distance)
  ON CONFLICT (airline_id, date)
  DO UPDATE SET
    raw_flights = EXCLUDED.raw_flights,
    scaled_flights = EXCLUDED.scaled_flights,
    raw_distance = EXCLUDED.raw_distance,
    scaled_distance = EXCLUDED.scaled_distance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper function to create an NPC airline
CREATE OR REPLACE FUNCTION create_npc_airline(
  p_name VARCHAR(50),
  p_code VARCHAR(4),
  p_real_icao VARCHAR(4),
  p_real_name VARCHAR(100),
  p_icon VARCHAR(20) DEFAULT 'plane',
  p_color VARCHAR(7) DEFAULT '#4fc3f7'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO airlines (name, code, icon, color, is_npc, real_airline_icao, real_airline_name)
  VALUES (p_name, p_code, p_icon, p_color, TRUE, p_real_icao, p_real_name)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE NPC AIRLINES (Optional - run separately)
-- ============================================
-- SELECT create_npc_airline('Virtual Lufthansa', 'VLHA', 'DLH', 'Lufthansa', 'plane', '#FFD700');
-- SELECT create_npc_airline('Virtual British Airways', 'VBAW', 'BAW', 'British Airways', 'crown', '#1E3A8A');
-- SELECT create_npc_airline('Virtual Air France', 'VAFR', 'AFR', 'Air France', 'globe', '#002157');
-- SELECT create_npc_airline('Virtual Emirates', 'VEMR', 'UAE', 'Emirates', 'star', '#C8102E');
-- SELECT create_npc_airline('Virtual United', 'VUAL', 'UAL', 'United Airlines', 'shield', '#0033A0');
