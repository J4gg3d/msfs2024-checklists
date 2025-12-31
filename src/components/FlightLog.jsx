import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFlights, getFlightStats } from '../lib/supabase'
import './FlightLog.css'

const FlightLog = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth()
  const [flights, setFlights] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      loadData()
    }
  }, [isOpen, user])

  const loadData = async () => {
    setLoading(true)
    const [flightsResult, statsResult] = await Promise.all([
      getFlights(user.id),
      getFlightStats(user.id)
    ])

    if (!flightsResult.error) {
      setFlights(flightsResult.data || [])
    }
    if (!statsResult.error) {
      setStats(statsResult.stats)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const formatDuration = (seconds) => {
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
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const getRatingClass = (rating) => {
    if (rating >= 4) return 'rating-good'
    if (rating >= 3) return 'rating-ok'
    return 'rating-bad'
  }

  return (
    <div className="flightlog-overlay" onClick={onClose}>
      <div className="flightlog-modal" onClick={(e) => e.stopPropagation()}>
        <button className="flightlog-close" onClick={onClose}>×</button>

        <div className="flightlog-header">
          <h2>Flugbuch</h2>
          {profile && <span className="flightlog-pilot">{profile.display_name || profile.username}</span>}
        </div>

        {loading ? (
          <div className="flightlog-loading">Lade Flüge...</div>
        ) : (
          <>
            {stats && (
              <div className="flightlog-stats">
                <div className="stat-card">
                  <div className="stat-value">{stats.totalFlights}</div>
                  <div className="stat-label">Flüge</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{Math.round(stats.totalDistance).toLocaleString()}</div>
                  <div className="stat-label">NM gesamt</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatDuration(stats.totalFlightTime)}</div>
                  <div className="stat-label">Flugzeit</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.avgLandingRating.toFixed(1)}</div>
                  <div className="stat-label">Ø Landing</div>
                </div>
              </div>
            )}

            <div className="flightlog-list">
              {flights.length === 0 ? (
                <div className="flightlog-empty">
                  <p>Noch keine Flüge aufgezeichnet.</p>
                  <p>Starte die Bridge und fliege eine Mission!</p>
                </div>
              ) : (
                <table className="flightlog-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Route</th>
                      <th>Flugzeug</th>
                      <th>Distanz</th>
                      <th>Zeit</th>
                      <th>Landing</th>
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
                        <td className="col-distance">{Math.round(flight.distance_nm)} NM</td>
                        <td className="col-time">{formatDuration(flight.flight_duration_seconds)}</td>
                        <td className={`col-rating ${getRatingClass(flight.landing_rating)}`}>
                          {getRatingStars(flight.landing_rating)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FlightLog
