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
    const url = `${supabaseUrl}/rest/v1/flights?user_id=eq.${userId}&select=distance_nm,flight_duration_seconds,landing_rating,score`
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
      totalScore: data.reduce((sum, f) => sum + (f.score || 0), 0),
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

// Leaderboard Helpers
export const getLeaderboard = async (type = 'score', limit = 10) => {
  try {
    // Hole alle Flüge mit Score
    const flightsUrl = `${supabaseUrl}/rest/v1/flights?select=user_id,score,flight_duration_seconds,distance_nm`
    const flightsResponse = await fetch(flightsUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })

    if (!flightsResponse.ok) {
      return { data: null, error: { message: `HTTP ${flightsResponse.status}` } }
    }

    const flights = await flightsResponse.json()

    // Aggregiere pro User
    const userStats = {}
    flights.forEach(flight => {
      if (!flight.user_id) return
      if (!userStats[flight.user_id]) {
        userStats[flight.user_id] = {
          user_id: flight.user_id,
          total_score: 0,
          total_flight_time: 0,
          total_distance: 0,
          flight_count: 0
        }
      }
      userStats[flight.user_id].total_score += flight.score || 0
      userStats[flight.user_id].total_flight_time += flight.flight_duration_seconds || 0
      userStats[flight.user_id].total_distance += flight.distance_nm || 0
      userStats[flight.user_id].flight_count += 1
    })

    // In Array konvertieren und sortieren
    let leaderboard = Object.values(userStats)

    switch (type) {
      case 'score':
        leaderboard.sort((a, b) => b.total_score - a.total_score)
        break
      case 'time':
        leaderboard.sort((a, b) => b.total_flight_time - a.total_flight_time)
        break
      case 'flights':
        leaderboard.sort((a, b) => b.flight_count - a.flight_count)
        break
    }

    leaderboard = leaderboard.slice(0, limit)

    // Hole Profil-Namen für die Top-User
    const userIds = leaderboard.map(u => u.user_id)
    if (userIds.length > 0) {
      const profilesUrl = `${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})`
      const profilesResponse = await fetch(profilesUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        const profileMap = {}
        profiles.forEach(p => {
          profileMap[p.id] = p.display_name || p.username || 'Unknown Pilot'
        })

        leaderboard.forEach(entry => {
          entry.display_name = profileMap[entry.user_id] || 'Unknown Pilot'
        })
      }
    }

    return { data: leaderboard, error: null }
  } catch (err) {
    console.error('getLeaderboard error:', err)
    return { data: null, error: err }
  }
}

// Flight Delete Helper
export const deleteFlight = async (flightId, userId) => {
  try {
    // Get token from localStorage directly
    const storageKey = 'sb-azihmdeajubwutgdlayu-auth-token'
    const stored = localStorage.getItem(storageKey)
    let token = supabaseAnonKey

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        token = parsed?.access_token || supabaseAnonKey
      } catch (e) {
        // Use anon key as fallback
      }
    }

    const url = `${supabaseUrl}/rest/v1/flights?id=eq.${flightId}&user_id=eq.${userId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
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

// ============================================
// AIRLINE HELPERS
// ============================================

// Helper to get auth token
const getAuthToken = () => {
  const storageKey = 'sb-azihmdeajubwutgdlayu-auth-token'
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return parsed?.access_token || supabaseAnonKey
    } catch (e) {
      return supabaseAnonKey
    }
  }
  return supabaseAnonKey
}

// Get all airlines (for browsing/joining)
export const getAirlines = async (limit = 50) => {
  try {
    const url = `${supabaseUrl}/rest/v1/airlines?order=total_score.desc&limit=${limit}`
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
    console.error('getAirlines error:', err)
    return { data: null, error: err }
  }
}

// Get a single airline by ID
export const getAirline = async (airlineId) => {
  try {
    const url = `${supabaseUrl}/rest/v1/airlines?id=eq.${airlineId}`
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
    return { data: data[0] || null, error: null }
  } catch (err) {
    console.error('getAirline error:', err)
    return { data: null, error: err }
  }
}

// Get airline members
export const getAirlineMembers = async (airlineId) => {
  try {
    const url = `${supabaseUrl}/rest/v1/airline_members?airline_id=eq.${airlineId}&order=joined_at.asc`
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    if (!response.ok) {
      return { data: null, error: { message: `HTTP ${response.status}` } }
    }
    const members = await response.json()

    // Get profile info for each member
    if (members.length > 0) {
      const userIds = members.map(m => m.user_id)
      const profilesUrl = `${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})`
      const profilesResponse = await fetch(profilesUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        const profileMap = {}
        profiles.forEach(p => {
          profileMap[p.id] = p
        })

        members.forEach(member => {
          const profile = profileMap[member.user_id] || {}
          member.display_name = profile.display_name || profile.username || 'Unknown Pilot'
        })
      }
    }

    return { data: members, error: null }
  } catch (err) {
    console.error('getAirlineMembers error:', err)
    return { data: null, error: err }
  }
}

// Get user's airline membership
export const getUserAirline = async (userId) => {
  try {
    // First get membership
    const memberUrl = `${supabaseUrl}/rest/v1/airline_members?user_id=eq.${userId}`
    const memberResponse = await fetch(memberUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    if (!memberResponse.ok) {
      return { data: null, error: { message: `HTTP ${memberResponse.status}` } }
    }
    const memberData = await memberResponse.json()

    if (memberData.length === 0) {
      return { data: null, error: null } // User not in an airline
    }

    const membership = memberData[0]

    // Get airline details
    const { data: airline, error } = await getAirline(membership.airline_id)
    if (error) {
      return { data: null, error }
    }

    return {
      data: {
        ...airline,
        role: membership.role,
        joined_at: membership.joined_at
      },
      error: null
    }
  } catch (err) {
    console.error('getUserAirline error:', err)
    return { data: null, error: err }
  }
}

// Create a new airline
export const createAirline = async (userId, airlineData) => {
  try {
    const token = getAuthToken()

    // Create the airline
    const createUrl = `${supabaseUrl}/rest/v1/airlines`
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: airlineData.name,
        code: airlineData.code.toUpperCase(),
        description: airlineData.description || '',
        icon: airlineData.icon || 'plane',
        color: airlineData.color || '#4fc3f7',
        owner_id: userId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Create airline error:', errorText)
      if (errorText.includes('duplicate')) {
        return { data: null, error: { message: 'Name oder Code bereits vergeben' } }
      }
      return { data: null, error: { message: `HTTP ${response.status}` } }
    }

    const airlines = await response.json()
    const airline = airlines[0]

    // Add owner as CEO member
    const memberUrl = `${supabaseUrl}/rest/v1/airline_members`
    await fetch(memberUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        airline_id: airline.id,
        user_id: userId,
        role: 'ceo'
      })
    })

    return { data: airline, error: null }
  } catch (err) {
    console.error('createAirline error:', err)
    return { data: null, error: err }
  }
}

// Join an airline
export const joinAirline = async (userId, airlineId) => {
  try {
    const token = getAuthToken()

    const url = `${supabaseUrl}/rest/v1/airline_members`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        airline_id: airlineId,
        user_id: userId,
        role: 'pilot'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (errorText.includes('duplicate') || errorText.includes('unique')) {
        return { error: { message: 'Du bist bereits Mitglied einer Airline' } }
      }
      return { error: { message: `HTTP ${response.status}` } }
    }

    return { error: null }
  } catch (err) {
    console.error('joinAirline error:', err)
    return { error: err }
  }
}

// Leave an airline
export const leaveAirline = async (userId, airlineId) => {
  try {
    const token = getAuthToken()

    const url = `${supabaseUrl}/rest/v1/airline_members?user_id=eq.${userId}&airline_id=eq.${airlineId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}` } }
    }

    return { error: null }
  } catch (err) {
    console.error('leaveAirline error:', err)
    return { error: err }
  }
}

// Remove a member (CEO only)
export const removeMember = async (memberId, airlineId) => {
  try {
    const token = getAuthToken()

    const url = `${supabaseUrl}/rest/v1/airline_members?user_id=eq.${memberId}&airline_id=eq.${airlineId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}` } }
    }

    return { error: null }
  } catch (err) {
    console.error('removeMember error:', err)
    return { error: err }
  }
}

// Update airline (CEO only)
export const updateAirline = async (airlineId, updates) => {
  try {
    const token = getAuthToken()

    const url = `${supabaseUrl}/rest/v1/airlines?id=eq.${airlineId}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      return { data: null, error: { message: `HTTP ${response.status}` } }
    }

    const data = await response.json()
    return { data: data[0], error: null }
  } catch (err) {
    console.error('updateAirline error:', err)
    return { data: null, error: err }
  }
}

// Delete airline (CEO only)
export const deleteAirline = async (airlineId) => {
  try {
    const token = getAuthToken()

    const url = `${supabaseUrl}/rest/v1/airlines?id=eq.${airlineId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}` } }
    }

    return { error: null }
  } catch (err) {
    console.error('deleteAirline error:', err)
    return { error: err }
  }
}

// Get airline leaderboard
export const getAirlineLeaderboard = async (type = 'score', limit = 10) => {
  try {
    let orderBy = 'total_score'
    if (type === 'flights') orderBy = 'total_flights'
    if (type === 'time') orderBy = 'total_flight_time'
    if (type === 'distance') orderBy = 'total_distance'

    const url = `${supabaseUrl}/rest/v1/airlines?order=${orderBy}.desc&limit=${limit}`
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
    console.error('getAirlineLeaderboard error:', err)
    return { data: null, error: err }
  }
}

// Search airlines by name or code
export const searchAirlines = async (query) => {
  try {
    const url = `${supabaseUrl}/rest/v1/airlines?or=(name.ilike.*${query}*,code.ilike.*${query}*)&order=member_count.desc&limit=20`
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
    console.error('searchAirlines error:', err)
    return { data: null, error: err }
  }
}

// ============================================
// ANNOUNCEMENTS HELPERS
// ============================================

// Get active announcements (respects starts_at/ends_at via RLS)
export const getAnnouncements = async () => {
  try {
    const url = `${supabaseUrl}/rest/v1/announcements?active=eq.true&order=created_at.desc`
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
    console.error('getAnnouncements error:', err)
    return { data: null, error: err }
  }
}
