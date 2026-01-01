import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLeaderboard, getAirlineLeaderboard, getUserAirline } from '../lib/supabase'
import './LeaderboardPage.css'

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

// Demo airline data
const DEMO_AIRLINES = [
  { id: 'demo-a1', name: 'Sky Express Virtual', code: 'SEV', icon: 'plane', color: '#4fc3f7', member_count: 12, total_flights: 245, total_score: 48500, total_distance: 125000, total_flight_time: 420000 },
  { id: 'demo-a2', name: 'Golden Wings', code: 'GWA', icon: 'crown', color: '#ffd700', member_count: 8, total_flights: 178, total_score: 35200, total_distance: 89000, total_flight_time: 310000 },
  { id: 'demo-a3', name: 'Thunder Aviation', code: 'THA', icon: 'lightning', color: '#ab47bc', member_count: 6, total_flights: 142, total_score: 28100, total_distance: 72000, total_flight_time: 256000 },
  { id: 'demo-a4', name: 'Phoenix Air', code: 'PHX', icon: 'fire', color: '#ef5350', member_count: 5, total_flights: 98, total_score: 19400, total_distance: 51000, total_flight_time: 178000 },
  { id: 'demo-a5', name: 'Diamond Jets', code: 'DJT', icon: 'diamond', color: '#26a69a', member_count: 4, total_flights: 67, total_score: 13200, total_distance: 34000, total_flight_time: 121000 },
]

// Demo data for display when no real data exists
const DEMO_LEADERBOARD = [
  { user_id: 'demo-1', display_name: 'Captain Sky', total_score: 12500, total_flight_time: 180000, total_distance: 45000, flight_count: 85 },
  { user_id: 'demo-2', display_name: 'AeroMax', total_score: 9800, total_flight_time: 145000, total_distance: 38000, flight_count: 72 },
  { user_id: 'demo-3', display_name: 'WingCommander', total_score: 8200, total_flight_time: 120000, total_distance: 32000, flight_count: 58 },
  { user_id: 'demo-4', display_name: 'SkyNavigator', total_score: 7500, total_flight_time: 110000, total_distance: 28450, flight_count: 47 },
  { user_id: 'demo-5', display_name: 'SkyPilot42', total_score: 6100, total_flight_time: 95000, total_distance: 24000, flight_count: 41 },
  { user_id: 'demo-6', display_name: 'JetStream', total_score: 5400, total_flight_time: 82000, total_distance: 21000, flight_count: 35 },
  { user_id: 'demo-7', display_name: 'CloudRider', total_score: 4200, total_flight_time: 68000, total_distance: 17500, flight_count: 28 },
  { user_id: 'demo-8', display_name: 'AirBoss', total_score: 3100, total_flight_time: 54000, total_distance: 14000, flight_count: 22 },
  { user_id: 'demo-9', display_name: 'FlightStar', total_score: 2400, total_flight_time: 42000, total_distance: 11000, flight_count: 18 },
  { user_id: 'demo-10', display_name: 'NovaPilot', total_score: 1800, total_flight_time: 32000, total_distance: 8500, flight_count: 14 },
]

const LeaderboardPage = ({ onBack }) => {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [airlines, setAirlines] = useState([])
  const [myAirline, setMyAirline] = useState(null)
  const [activeTab, setActiveTab] = useState('score')
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserAirline()
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'airlines') {
      loadAirlines()
    } else {
      loadLeaderboard(activeTab)
    }
  }, [activeTab])

  const loadUserAirline = async () => {
    const { data } = await getUserAirline(user.id)
    if (data) {
      setMyAirline(data)
    }
  }

  const loadAirlines = async () => {
    setLoading(true)
    try {
      const { data, error } = await getAirlineLeaderboard('score', 10)
      if (!error && data && data.length > 0) {
        setAirlines(data)
        setIsDemo(false)
      } else {
        setAirlines(DEMO_AIRLINES)
        setIsDemo(true)
      }
    } catch (err) {
      console.error('Airline leaderboard error:', err)
      setAirlines(DEMO_AIRLINES)
      setIsDemo(true)
    }
    setLoading(false)
  }

  const loadLeaderboard = async (type) => {
    setLoading(true)
    try {
      const { data, error } = await getLeaderboard(type, 10)
      if (!error && data && data.length > 0) {
        setLeaderboard(data)
        setIsDemo(false)
      } else {
        // Use demo data if no real data
        const sorted = [...DEMO_LEADERBOARD].sort((a, b) => {
          if (type === 'score') return b.total_score - a.total_score
          if (type === 'time') return b.total_flight_time - a.total_flight_time
          if (type === 'flights') return b.flight_count - a.flight_count
          return 0
        })
        setLeaderboard(sorted)
        setIsDemo(true)
      }
    } catch (err) {
      console.error('Leaderboard error:', err)
      setLeaderboard(DEMO_LEADERBOARD)
      setIsDemo(true)
    }
    setLoading(false)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getRankIcon = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const getRankClass = (index) => {
    if (index === 0) return 'rank-gold'
    if (index === 1) return 'rank-silver'
    if (index === 2) return 'rank-bronze'
    return ''
  }

  const getValue = (entry) => {
    switch (activeTab) {
      case 'score':
        return entry.total_score.toLocaleString()
      case 'time':
        return formatDuration(entry.total_flight_time)
      case 'flights':
        return entry.flight_count
      default:
        return ''
    }
  }

  const getLabel = () => {
    switch (activeTab) {
      case 'score': return 'Punkte'
      case 'time': return 'Flugzeit'
      case 'flights': return 'Flüge'
      default: return ''
    }
  }

  const tabs = [
    { id: 'airlines', label: 'Airlines', icon: '🏢', description: 'Beste virtuelle Airlines' },
    { id: 'score', label: 'Punkte', icon: '🏆', description: 'Gesamtpunkte aus allen Flügen' },
    { id: 'time', label: 'Flugzeit', icon: '⏱️', description: 'Gesamte Flugzeit' },
    { id: 'flights', label: 'Flüge', icon: '✈️', description: 'Anzahl absolvierter Flüge' }
  ]

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <header className="leaderboard-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <div className="leaderboard-logo">
          <span className="logo-icon">🏆</span>
          <span className="logo-text">Rangliste</span>
        </div>
        <div className="header-spacer"></div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="demo-banner">
          <div className="demo-banner-content">
            <span className="demo-badge">DEMO</span>
            <span className="demo-text">Dies sind Beispieldaten. Echte Ranglisten werden angezeigt, sobald Flüge aufgezeichnet wurden.</span>
          </div>
        </div>
      )}

      <div className="leaderboard-content">
        {/* Hero Section */}
        <div className="leaderboard-hero">
          <h1>Top Piloten</h1>
          <p>Die besten Piloten der SimFlyCorp Community</p>
        </div>

        {/* Tab Navigation */}
        <div className="leaderboard-tabs-container">
          <div className="leaderboard-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`leaderboard-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <div className="tab-content">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-desc">{tab.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="leaderboard-card">
          {loading ? (
            <div className="leaderboard-loading">
              <div className="loading-spinner"></div>
              <p>Lade Rangliste...</p>
            </div>
          ) : activeTab === 'airlines' ? (
            /* Airlines Leaderboard */
            airlines.length === 0 ? (
              <div className="leaderboard-empty">
                <div className="empty-icon">🏢</div>
                <h3>Noch keine Airlines</h3>
                <p>Gründe die erste Airline!</p>
              </div>
            ) : (
              <table className="leaderboard-table airlines-table">
                <thead>
                  <tr>
                    <th className="col-rank">Rang</th>
                    <th className="col-airline">Airline</th>
                    <th className="col-members">Piloten</th>
                    <th className="col-value">Score</th>
                    <th className="col-distance">Distanz</th>
                    <th className="col-flights">Flüge</th>
                  </tr>
                </thead>
                <tbody>
                  {airlines.map((airline, index) => (
                    <tr
                      key={airline.id}
                      className={`${getRankClass(index)} ${myAirline?.id === airline.id ? 'is-me' : ''}`}
                    >
                      <td className="col-rank">
                        <span className="rank-icon">{getRankIcon(index)}</span>
                      </td>
                      <td className="col-airline">
                        <div className="airline-info">
                          <span className="airline-badge" style={{ backgroundColor: airline.color }}>
                            {getIconEmoji(airline.icon)}
                          </span>
                          <div className="airline-text">
                            <span className="airline-name" style={{ color: index < 3 ? undefined : airline.color }}>
                              {airline.name}
                            </span>
                            <span className="airline-code">[{airline.code}]</span>
                          </div>
                          {myAirline?.id === airline.id && <span className="me-badge">Deine</span>}
                        </div>
                      </td>
                      <td className="col-members">{airline.member_count}</td>
                      <td className="col-value">{(airline.total_score || 0).toLocaleString()}</td>
                      <td className="col-distance">{Math.round(airline.total_distance || 0).toLocaleString()} NM</td>
                      <td className="col-flights">{airline.total_flights || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* Pilots Leaderboard */
            leaderboard.length === 0 ? (
              <div className="leaderboard-empty">
                <div className="empty-icon">🏆</div>
                <h3>Noch keine Piloten</h3>
                <p>Sei der Erste in der Rangliste!</p>
              </div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th className="col-rank">Rang</th>
                    <th className="col-pilot">Pilot</th>
                    <th className="col-value">{getLabel()}</th>
                    <th className="col-distance">Distanz</th>
                    <th className="col-flights">Flüge</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.user_id}
                      className={`${getRankClass(index)} ${entry.user_id === user?.id ? 'is-me' : ''}`}
                    >
                      <td className="col-rank">
                        <span className="rank-icon">{getRankIcon(index)}</span>
                      </td>
                      <td className="col-pilot">
                        <div className="pilot-info">
                          <span className="pilot-name">{entry.display_name}</span>
                          {entry.user_id === user?.id && <span className="me-badge">Du</span>}
                        </div>
                      </td>
                      <td className="col-value">{getValue(entry)}</td>
                      <td className="col-distance">{Math.round(entry.total_distance).toLocaleString()} NM</td>
                      <td className="col-flights">{entry.flight_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Score Info */}
        <div className="score-info-card">
          <h3>Wie werden Punkte berechnet?</h3>
          <div className="score-formula">
            <div className="formula-item">
              <span className="formula-icon">📏</span>
              <div className="formula-text">
                <strong>Distanz</strong>
                <span>Basis-Punkte = geflogene Meilen</span>
              </div>
            </div>
            <div className="formula-operator">×</div>
            <div className="formula-item">
              <span className="formula-icon">⏱️</span>
              <div className="formula-text">
                <strong>Zeit-Faktor</strong>
                <span>Realistische Flugzeit = 100%</span>
              </div>
            </div>
            <div className="formula-operator">+</div>
            <div className="formula-item">
              <span className="formula-icon">🎯</span>
              <div className="formula-text">
                <strong>Landing Bonus</strong>
                <span>10-50 Punkte je nach Rating</span>
              </div>
            </div>
          </div>
          <p className="score-note">
            Tipp: Flüge mit SimRate oder Überspringen geben weniger Punkte!
          </p>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage
