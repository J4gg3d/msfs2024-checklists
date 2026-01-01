import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://azihmdeajubwutgdlayu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aWhtZGVhanVid3V0Z2RsYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTQ4MjEsImV4cCI6MjA4MjczMDgyMX0.K4wZF5J6q7dvHZMWihnFnVTpqeUI7IvWtxzfMoG_eJQ'

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

// Flight Log Helpers - Using direct fetch (Supabase-JS has issues)
export const getFlights = async (userId, limit = 50) => {
  try {
    const url = `${supabaseUrl}/rest/v1/flights?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    if (!response.ok) {
      return { data: null, error: { message: `HTTP ${response.status}` } }
    }
    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    console.error('getFlights error:', err)
    return { data: null, error: err }
  }
}

export const getFlightStats = async (userId) => {
  try {
    const url = `${supabaseUrl}/rest/v1/flights?user_id=eq.${userId}&select=distance_nm,flight_duration_seconds,landing_rating`
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    if (!response.ok) {
      return { stats: null, error: { message: `HTTP ${response.status}` } }
    }
    const data = await response.json()

    const stats = {
      totalFlights: data.length,
      totalDistance: data.reduce((sum, f) => sum + (f.distance_nm || 0), 0),
      totalFlightTime: data.reduce((sum, f) => sum + (f.flight_duration_seconds || 0), 0),
      avgLandingRating: data.length > 0
        ? data.reduce((sum, f) => sum + (f.landing_rating || 0), 0) / data.length
        : 0,
    }
    return { stats, error: null }
  } catch (err) {
    console.error('getFlightStats error:', err)
    return { stats: null, error: err }
  }
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

// Flight Delete Helper
export const deleteFlight = async (flightId, userId) => {
  try {
    const url = `${supabaseUrl}/rest/v1/flights?id=eq.${flightId}&user_id=eq.${userId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}` } }
    }
    return { error: null }
  } catch (err) {
    console.error('deleteFlight error:', err)
    return { error: err }
  }
}
