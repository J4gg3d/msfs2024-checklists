-- ============================================
-- AIRLINE SYSTEM SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Airlines Table
CREATE TABLE IF NOT EXISTS airlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(4) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(20) NOT NULL DEFAULT 'plane',
  color VARCHAR(7) NOT NULL DEFAULT '#4fc3f7',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Cached Stats (updated via trigger or periodic job)
  total_flights INT DEFAULT 0,
  total_distance DECIMAL DEFAULT 0,
  total_flight_time INT DEFAULT 0,
  total_score INT DEFAULT 0,
  member_count INT DEFAULT 1
);

-- 2. Airline Members Table
CREATE TABLE IF NOT EXISTS airline_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'pilot',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)  -- A user can only be in one airline
);

-- 3. Add airline_id to profiles (for quick access)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS airline_id UUID REFERENCES airlines(id) ON DELETE SET NULL;

-- 4. Add airline_id to flights (to track which airline a flight belongs to)
ALTER TABLE flights ADD COLUMN IF NOT EXISTS airline_id UUID REFERENCES airlines(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE airline_members ENABLE ROW LEVEL SECURITY;

-- Airlines: Anyone can read, owner can update
CREATE POLICY "Airlines are viewable by everyone"
  ON airlines FOR SELECT
  USING (true);

CREATE POLICY "Users can create airlines"
  ON airlines FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their airline"
  ON airlines FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their airline"
  ON airlines FOR DELETE
  USING (auth.uid() = owner_id);

-- Airline Members: Anyone can read, users can manage their own membership
CREATE POLICY "Airline members are viewable by everyone"
  ON airline_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join airlines"
  ON airline_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave airlines"
  ON airline_members FOR DELETE
  USING (auth.uid() = user_id);

-- CEO can remove members
CREATE POLICY "CEO can remove members"
  ON airline_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM airlines
      WHERE airlines.id = airline_members.airline_id
      AND airlines.owner_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_airline_members_airline_id ON airline_members(airline_id);
CREATE INDEX IF NOT EXISTS idx_airline_members_user_id ON airline_members(user_id);
CREATE INDEX IF NOT EXISTS idx_flights_airline_id ON flights(airline_id);
CREATE INDEX IF NOT EXISTS idx_profiles_airline_id ON profiles(airline_id);
CREATE INDEX IF NOT EXISTS idx_airlines_total_score ON airlines(total_score DESC);

-- ============================================
-- FUNCTION: Update airline stats
-- Call this periodically or via trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_airline_stats(p_airline_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE airlines
  SET
    member_count = (
      SELECT COUNT(*) FROM airline_members WHERE airline_id = p_airline_id
    ),
    total_flights = COALESCE((
      SELECT COUNT(*) FROM flights WHERE airline_id = p_airline_id
    ), 0),
    total_distance = COALESCE((
      SELECT SUM(distance_nm) FROM flights WHERE airline_id = p_airline_id
    ), 0),
    total_flight_time = COALESCE((
      SELECT SUM(flight_duration_seconds) FROM flights WHERE airline_id = p_airline_id
    ), 0),
    total_score = COALESCE((
      SELECT SUM(score) FROM flights WHERE airline_id = p_airline_id
    ), 0)
  WHERE id = p_airline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-assign airline_id to new flights
-- ============================================

CREATE OR REPLACE FUNCTION set_flight_airline_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user's current airline
  SELECT airline_id INTO NEW.airline_id
  FROM profiles
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_flight_airline ON flights;
CREATE TRIGGER trigger_set_flight_airline
  BEFORE INSERT ON flights
  FOR EACH ROW
  EXECUTE FUNCTION set_flight_airline_id();

-- ============================================
-- TRIGGER: Update airline stats on flight insert
-- ============================================

CREATE OR REPLACE FUNCTION update_airline_stats_on_flight()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.airline_id IS NOT NULL THEN
    PERFORM update_airline_stats(NEW.airline_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_airline_stats ON flights;
CREATE TRIGGER trigger_update_airline_stats
  AFTER INSERT ON flights
  FOR EACH ROW
  EXECUTE FUNCTION update_airline_stats_on_flight();

-- ============================================
-- TRIGGER: Update member count on join/leave
-- ============================================

CREATE OR REPLACE FUNCTION update_airline_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE airlines SET member_count = member_count + 1 WHERE id = NEW.airline_id;
    UPDATE profiles SET airline_id = NEW.airline_id WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE airlines SET member_count = member_count - 1 WHERE id = OLD.airline_id;
    UPDATE profiles SET airline_id = NULL WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_airline_member_count ON airline_members;
CREATE TRIGGER trigger_airline_member_count
  AFTER INSERT OR DELETE ON airline_members
  FOR EACH ROW
  EXECUTE FUNCTION update_airline_member_count();
