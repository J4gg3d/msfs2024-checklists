import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFlights, getFlightStats, deleteFlight, getUserAirline, updateProfile, getProfile } from '../lib/supabase'
import './SimFlyCorp.css'

// Icon mapping for airlines
const AIRLINE_ICONS = {
  plane: '✈️',
  turbine: '🌀',
  jet: '🛩️',
  takeoff: '🛫',
  landing: '🛬',
  rocket: '🚀',
  globe: '🌍',
  star: '⭐',
  crown: '👑',
  eagle: '🦅',
  lightning: '⚡',
  shield: '🛡️',
  diamond: '💎',
  fire: '🔥',
  wing: '🪽'
}

const getIconEmoji = (iconId) => AIRLINE_ICONS[iconId] || '✈️'

// Demo data for non-logged-in users
const DEMO_PROFILE = {
  display_name: 'Max Mustermann',
  username: 'max_pilot'
}

const DEMO_STATS = {
  totalFlights: 47,
  totalDistance: 28450,
  totalFlightTime: 156 * 3600, // 156 hours
  totalScore: 32850,
  avgLandingRating: 4.2
}

const DEMO_FLIGHTS = [
  { id: 1, created_at: '2024-12-28T14:30:00Z', origin: 'EDDF', destination: 'KJFK', aircraft_type: 'Airbus A330-200', distance_nm: 3450, flight_duration_seconds: 28800, landing_rating: 5, score: 3500 },
  { id: 2, created_at: '2024-12-25T09:15:00Z', origin: 'KJFK', destination: 'EGLL', aircraft_type: 'Airbus A330-200', distance_nm: 3020, flight_duration_seconds: 25200, landing_rating: 4, score: 3060 },
  { id: 3, created_at: '2024-12-22T18:45:00Z', origin: 'EGLL', destination: 'LEMD', aircraft_type: 'Airbus A330-200', distance_nm: 780, flight_duration_seconds: 7200, landing_rating: 4, score: 820 },
  { id: 4, created_at: '2024-12-20T11:00:00Z', origin: 'LEMD', destination: 'LFPG', aircraft_type: 'Pilatus PC-12 NGX', distance_nm: 650, flight_duration_seconds: 5400, landing_rating: 5, score: 700 },
  { id: 5, created_at: '2024-12-18T16:20:00Z', origin: 'LFPG', destination: 'EDDF', aircraft_type: 'Pilatus PC-12 NGX', distance_nm: 280, flight_duration_seconds: 3600, landing_rating: 3, score: 310 },
]

const SimFlyCorp = ({ onBack, onLogin, viewUserId }) => {
  const { user, profile: ownProfile } = useAuth()
  const [flights, setFlights] = useState([])
  const [stats, setStats] = useState(null)
  const [myAirline, setMyAirline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [editingHomebase, setEditingHomebase] = useState(false)
  const [homebaseInput, setHomebaseInput] = useState('')
  const [savingHomebase, setSavingHomebase] = useState(false)
  const [viewedProfile, setViewedProfile] = useState(null)

  // Determine if viewing own profile or someone else's
  const isViewingOther = viewUserId && viewUserId !== user?.id
  const isDemo = !user && !viewUserId
  const isReadOnly = isDemo || isViewingOther

  // The profile to display (own or viewed)
  const profile = isViewingOther ? viewedProfile : ownProfile
  const displayUserId = isViewingOther ? viewUserId : user?.id

  useEffect(() => {
    if (viewUserId) {
      // Viewing another user's profile
      loadOtherProfile(viewUserId)
    } else if (user) {
      // Viewing own profile
      loadData(user.id)
    } else {
      // Demo mode - use demo data
      setStats(DEMO_STATS)
      setFlights(DEMO_FLIGHTS)
      setLoading(false)
    }
  }, [user, viewUserId])

  const loadOtherProfile = async (userId) => {
    setLoading(true)
    try {
      const [profileResult, flightsResult, statsResult, airlineResult] = await Promise.all([
        getProfile(userId),
        getFlights(userId),
        getFlightStats(userId),
        getUserAirline(userId)
      ])

      if (!profileResult.error && profileResult.data) {
        setViewedProfile(profileResult.data)
      }
      if (!flightsResult.error) {
        setFlights(flightsResult.data || [])
      }
      if (!statsResult.error) {
        setStats(statsResult.stats)
      }
      if (!airlineResult.error && airlineResult.data) {
        setMyAirline(airlineResult.data)
      }
    } catch (err) {
      console.error('SimFlyCorp error:', err)
    }
    setLoading(false)
  }

  const loadData = async (userId) => {
    setLoading(true)
    try {
      const [flightsResult, statsResult, airlineResult] = await Promise.all([
        getFlights(userId),
        getFlightStats(userId),
        getUserAirline(userId)
      ])

      if (!flightsResult.error) {
        setFlights(flightsResult.data || [])
      }
      if (!statsResult.error) {
        setStats(statsResult.stats)
      }
      if (!airlineResult.error && airlineResult.data) {
        setMyAirline(airlineResult.data)
      }
    } catch (err) {
      console.error('SimFlyCorp error:', err)
    }
    setLoading(false)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRatingStars = (rating) => {
    if (!rating) return '-----'
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const getRatingClass = (rating) => {
    if (rating >= 4) return 'rating-good'
    if (rating >= 3) return 'rating-ok'
    return 'rating-bad'
  }

  const handleDeleteFlight = async (flightId) => {
    if (isReadOnly) return
    if (!window.confirm('Flug wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    setDeletingId(flightId)
    const { error } = await deleteFlight(flightId, user.id)

    if (error) {
      console.error('Fehler beim Löschen:', error)
      alert('Fehler beim Löschen des Fluges')
    } else {
      await loadData(user.id)
    }
    setDeletingId(null)
  }

  const handleEditHomebase = () => {
    setHomebaseInput(profile?.home_base || '')
    setEditingHomebase(true)
  }

  const handleSaveHomebase = async () => {
    if (isDemo || !user) return

    const icao = homebaseInput.trim().toUpperCase()
    if (icao.length < 3 || icao.length > 4) {
      alert('Bitte gib einen gültigen ICAO-Code ein (3-4 Buchstaben)')
      return
    }

    setSavingHomebase(true)
    const { error } = await updateProfile(user.id, { home_base: icao })

    if (error) {
      console.error('Fehler beim Speichern:', error)
      alert('Fehler beim Speichern der Homebase')
    } else {
      // Profil wird über AuthContext aktualisiert - hier nur UI schließen
      profile.home_base = icao // Lokales Update für sofortige Anzeige
    }
    setSavingHomebase(false)
    setEditingHomebase(false)
  }

  const handleCancelHomebase = () => {
    setEditingHomebase(false)
    setHomebaseInput('')
  }

  // Pilot rank based on flight hours (stripes like pilot uniforms)
  const getPilotRank = (totalSeconds) => {
    const hours = totalSeconds / 3600
    if (hours >= 500) return { title: 'Captain', stripes: 4 }
    if (hours >= 250) return { title: 'First Officer', stripes: 3 }
    if (hours >= 100) return { title: 'Second Officer', stripes: 2 }
    if (hours >= 25) return { title: 'Flight Cadet', stripes: 1 }
    return { title: 'Student Pilot', stripes: 0 }
  }

  // Render pilot stripes
  const renderStripes = (count) => {
    if (count === 0) return null
    return (
      <div className="pilot-stripes">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="stripe" />
        ))}
      </div>
    )
  }

  const pilotRank = stats ? getPilotRank(stats.totalFlightTime) : { title: 'Student Pilot', stripes: 0 }

  return (
    <div className="simflycorp-page">
      {/* Header */}
      <header className="simflycorp-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <div className="simflycorp-logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">SimFlyCorp</span>
        </div>
        <div className="header-spacer"></div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="demo-banner">
          <div className="demo-banner-content">
            <span className="demo-badge">DEMO</span>
            <span className="demo-text">Dies ist eine Vorschau. Melde dich an, um dein eigenes Pilotenprofil zu erstellen!</span>
            <button className="demo-login-btn" onClick={onLogin}>
              Jetzt anmelden
            </button>
          </div>
        </div>
      )}

      {/* Viewing Other Profile Banner */}
      {isViewingOther && (
        <div className="viewing-other-banner">
          <div className="demo-banner-content">
            <span className="viewing-badge">👤</span>
            <span className="demo-text">Du siehst das Profil von <strong>{profile?.display_name || profile?.username || 'Pilot'}</strong></span>
          </div>
        </div>
      )}

      <div className="simflycorp-content">
        {loading ? (
          <div className="simflycorp-loading">
            <div className="loading-spinner"></div>
            <p>Lade Pilotendaten...</p>
          </div>
        ) : (
          <>
            {/* Pilot Profile Section */}
            <section className="pilot-profile">
              <div className="profile-card">
                <div className="profile-avatar">
                  <div className={`avatar-placeholder ${isDemo ? 'demo' : ''}`}>
                    {(isDemo ? DEMO_PROFILE.display_name : (profile?.display_name || profile?.username || 'P')).charAt(0).toUpperCase()}
                  </div>
                  <div className="rank-section">
                    {renderStripes(pilotRank.stripes)}
                    <div className="rank-title">{pilotRank.title}</div>
                  </div>
                </div>

                <div className="profile-info">
                  <h1 className="pilot-name">
                    {isDemo ? DEMO_PROFILE.display_name : (profile?.display_name || profile?.username || 'Pilot')}
                    {isDemo && <span className="demo-tag">Demo</span>}
                  </h1>
                  <div className="pilot-details">
                    <div className="detail-row">
                      <span className="detail-label">Pilot ID</span>
                      <span className="detail-value">{isDemo ? 'SFC-4821' : (displayUserId?.substring(0, 8).toUpperCase() || '--------')}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Airline</span>
                      {isDemo ? (
                        <span className="detail-value placeholder">SimFlyCorp Virtual</span>
                      ) : myAirline ? (
                        <span className="detail-value airline-value" style={{ color: myAirline.color }}>
                          <span className="airline-icon-small">{getIconEmoji(myAirline.icon)}</span>
                          {myAirline.name}
                        </span>
                      ) : (
                        <span className="detail-value placeholder">Keine Airline</span>
                      )}
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Homebase</span>
                      {isDemo ? (
                        <span className="detail-value">EDDF</span>
                      ) : isReadOnly ? (
                        <span className="detail-value">
                          {profile?.home_base || <span className="placeholder">Nicht gesetzt</span>}
                        </span>
                      ) : editingHomebase ? (
                        <span className="detail-value homebase-edit">
                          <input
                            type="text"
                            value={homebaseInput}
                            onChange={(e) => setHomebaseInput(e.target.value.toUpperCase())}
                            placeholder="ICAO"
                            maxLength={4}
                            className="homebase-input"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveHomebase()
                              if (e.key === 'Escape') handleCancelHomebase()
                            }}
                          />
                          <button
                            className="homebase-btn save"
                            onClick={handleSaveHomebase}
                            disabled={savingHomebase}
                          >
                            {savingHomebase ? '...' : '✓'}
                          </button>
                          <button
                            className="homebase-btn cancel"
                            onClick={handleCancelHomebase}
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <span
                          className="detail-value editable"
                          onClick={handleEditHomebase}
                          title="Klicken zum Bearbeiten"
                        >
                          {profile?.home_base || <span className="placeholder">Nicht gesetzt</span>}
                          <span className="edit-icon">✎</span>
                        </span>
                      )}
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Mitglied seit</span>
                      <span className="detail-value">
                        {isDemo
                          ? 'März 2024'
                          : (profile?.created_at
                              ? new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
                              : '---'
                            )
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-stats">
                  <div className="profile-stat highlight">
                    <div className="stat-number">{(stats?.totalScore || 0).toLocaleString()}</div>
                    <div className="stat-text">Punkte</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-number">{stats?.totalFlights || 0}</div>
                    <div className="stat-text">Flüge</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-number">{formatDuration(stats?.totalFlightTime || 0)}</div>
                    <div className="stat-text">Flugzeit</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-number">{Math.round(stats?.totalDistance || 0).toLocaleString()}</div>
                    <div className="stat-text">NM geflogen</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-number">{stats?.avgLandingRating?.toFixed(1) || '-'}</div>
                    <div className="stat-text">Ø Landing</div>
                  </div>
                </div>
              </div>

              {/* Achievements Placeholder */}
              <div className="achievements-card">
                <h3>Achievements</h3>
                <div className="achievements-grid">
                  <div className="achievement unlocked" title="Erster Flug">
                    <span className="achievement-icon">🛫</span>
                    <span className="achievement-name">First Flight</span>
                  </div>
                  <div className={`achievement ${(stats?.totalFlights || 0) >= 10 ? 'unlocked' : 'locked'}`} title="10 Flüge">
                    <span className="achievement-icon">✈️</span>
                    <span className="achievement-name">Frequent Flyer</span>
                  </div>
                  <div className={`achievement ${(stats?.totalDistance || 0) >= 10000 ? 'unlocked' : 'locked'}`} title="10.000 NM">
                    <span className="achievement-icon">🌍</span>
                    <span className="achievement-name">World Traveler</span>
                  </div>
                  <div className={`achievement ${(stats?.avgLandingRating || 0) >= 4.5 ? 'unlocked' : 'locked'}`} title="Ø Landing 4.5+">
                    <span className="achievement-icon">🎯</span>
                    <span className="achievement-name">Butter Landing</span>
                  </div>
                  <div className="achievement locked" title="Coming soon">
                    <span className="achievement-icon">🏆</span>
                    <span className="achievement-name">???</span>
                  </div>
                  <div className="achievement locked" title="Coming soon">
                    <span className="achievement-icon">⭐</span>
                    <span className="achievement-name">???</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Flight Log Section */}
            <section className="flightlog-section">
              <h2>Flugbuch</h2>

              {flights.length === 0 ? (
                <div className="flightlog-empty">
                  <div className="empty-icon">📋</div>
                  <h3>Noch keine Flüge aufgezeichnet</h3>
                  <p>Starte die SimConnect Bridge und fliege eine Mission, um deinen ersten Flug zu loggen!</p>
                </div>
              ) : (
                <div className="flightlog-table-container">
                  <table className="flightlog-table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Route</th>
                        <th>Flugzeug</th>
                        <th>Distanz</th>
                        <th>Zeit</th>
                        <th>Landing</th>
                        <th>Score</th>
                        {!isReadOnly && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {flights.map((flight) => (
                        <tr key={flight.id}>
                          <td className="col-date">{formatDate(flight.created_at)}</td>
                          <td className="col-route">
                            <span className="airport">{flight.origin || '???'}</span>
                            <span className="arrow">→</span>
                            <span className="airport">{flight.destination || '???'}</span>
                          </td>
                          <td className="col-aircraft" title={flight.aircraft_type}>
                            {flight.aircraft_type?.split(' ').slice(0, 2).join(' ') || 'Unknown'}
                          </td>
                          <td className="col-distance">{Math.round(flight.distance_nm || 0)} NM</td>
                          <td className="col-time">{formatDuration(flight.flight_duration_seconds)}</td>
                          <td className={`col-rating ${getRatingClass(flight.landing_rating)}`}>
                            {getRatingStars(flight.landing_rating)}
                          </td>
                          <td className="col-score">{(flight.score || 0).toLocaleString()}</td>
                          {!isReadOnly && (
                            <td className="col-actions">
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteFlight(flight.id)}
                                disabled={deletingId === flight.id}
                                title="Flug löschen"
                              >
                                {deletingId === flight.id ? '...' : '🗑️'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default SimFlyCorp
