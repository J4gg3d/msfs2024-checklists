import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://azihmdeajubwutgdlayu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth Helpers
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Flight Log Helpers
export const getFlights = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export const getFlightStats = async (userId) => {
  const { data, error } = await supabase
    .from('flights')
    .select('distance_nm, flight_duration_seconds, landing_rating')
    .eq('user_id', userId)

  if (error || !data) return { stats: null, error }

  const stats = {
    totalFlights: data.length,
    totalDistance: data.reduce((sum, f) => sum + (f.distance_nm || 0), 0),
    totalFlightTime: data.reduce((sum, f) => sum + (f.flight_duration_seconds || 0), 0),
    avgLandingRating: data.length > 0
      ? data.reduce((sum, f) => sum + (f.landing_rating || 0), 0) / data.length
      : 0,
  }

  return { stats, error: null }
}

// Profile Helpers
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}
