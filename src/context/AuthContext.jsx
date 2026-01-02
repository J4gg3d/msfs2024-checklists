import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aktuelle Session prüfen
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id, currentSession.user)
      }
      setLoading(false)
    }

    getSession()

    // Auth-Änderungen beobachten
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession?.user) {
          await loadProfile(currentSession.user.id, currentSession.user)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId, userData = null) => {
    // Get token from localStorage (Supabase-JS has async issues)
    const storageKey = 'sb-azihmdeajubwutgdlayu-auth-token'
    const stored = localStorage.getItem(storageKey)
    let token = null

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        token = parsed?.access_token
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (!token) return

    try {
      // Load profile via REST API
      const url = `https://azihmdeajubwutgdlayu.supabase.co/rest/v1/profiles?id=eq.${userId}&select=*`
      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aWhtZGVhanVid3V0Z2RsYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTQ4MjEsImV4cCI6MjA4MjczMDgyMX0.K4wZF5J6q7dvHZMWihnFnVTpqeUI7IvWtxzfMoG_eJQ',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) return

      const data = await response.json()

      if (data && data.length > 0) {
        setProfile(data[0])
        return
      }

      // Profile existiert nicht - erstelle eines
      let userInfo = userData
      if (!userInfo && stored) {
        try {
          const parsed = JSON.parse(stored)
          userInfo = parsed?.user
        } catch (e) {}
      }

      const username = userInfo?.user_metadata?.username || userInfo?.email?.split('@')[0] || 'Pilot'
      const newProfile = {
        id: userId,
        username: username,
        display_name: username
      }

      const createResponse = await fetch('https://azihmdeajubwutgdlayu.supabase.co/rest/v1/profiles', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aWhtZGVhanVid3V0Z2RsYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTQ4MjEsImV4cCI6MjA4MjczMDgyMX0.K4wZF5J6q7dvHZMWihnFnVTpqeUI7IvWtxzfMoG_eJQ',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newProfile)
      })

      if (createResponse.ok) {
        const created = await createResponse.json()
        if (created && created.length > 0) {
          setProfile(created[0])
        }
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    }
  }

  const signUp = async (email, password, username) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )

      const result = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        }),
        timeoutPromise
      ])

      return result
    } catch (err) {
      console.log('SignUp: Timeout')
      return { data: null, error: { message: 'Registrierung fehlgeschlagen - bitte erneut versuchen' } }
    }
  }

  const signIn = async (email, password) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )

      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise
      ])

      // Success - update state
      if (result?.data?.user) {
        setUser(result.data.user)
        await loadProfile(result.data.user.id, result.data.user)
      }

      return result
    } catch (err) {
      // Timeout - check localStorage directly for session
      console.log('SignIn: Timeout, checking localStorage...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check localStorage for session token
      const storageKey = 'sb-azihmdeajubwutgdlayu-auth-token'
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed?.user) {
            setUser(parsed.user)
            await loadProfile(parsed.user.id)
            return { data: { user: parsed.user }, error: null }
          }
        } catch (e) {
          console.log('SignIn: Could not parse stored session')
        }
      }

      return { data: null, error: { message: 'Anmeldung fehlgeschlagen - bitte erneut versuchen' } }
    }
  }

  const signOut = async () => {
    console.log('SignOut: Clearing session...')

    // Clear local state immediately
    setUser(null)
    setProfile(null)

    // Clear Supabase session from localStorage
    const storageKey = `sb-azihmdeajubwutgdlayu-auth-token`
    localStorage.removeItem(storageKey)

    // Try to call supabase signOut with timeout (don't wait for it)
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ])
    } catch (err) {
      console.log('SignOut: Supabase call skipped (timeout or error)')
    }

    console.log('SignOut: Complete')
    return { error: null }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
