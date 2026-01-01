import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aktuelle Session prüfen
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      }
      setLoading(false)
    }

    getSession()

    // Auth-Änderungen beobachten
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId, userData = null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data)
      return
    }

    // Profile existiert nicht - erstelle eines
    if (error?.code === 'PGRST116' || !data) {
      // Hole User-Daten wenn nicht übergeben
      let userInfo = userData
      if (!userInfo) {
        const { data: { user } } = await supabase.auth.getUser()
        userInfo = user
      }

      if (userInfo) {
        const username = userInfo.user_metadata?.username || userInfo.email?.split('@')[0] || 'Pilot'
        const newProfile = {
          id: userId,
          username: username,
          display_name: username
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!createError && createdProfile) {
          console.log('Profile erstellt:', createdProfile)
          setProfile(createdProfile)
        } else {
          console.warn('Fehler beim Erstellen des Profiles:', createError)
        }
      }
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
