import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUserAirline,
  getAirlines,
  getAirlineMembers,
  createAirline,
  joinAirline,
  leaveAirline,
  removeMember,
  updateAirline,
  deleteAirline,
  searchAirlines
} from '../lib/supabase'
import './AirlinePage.css'

// Predefined icons (15)
const AIRLINE_ICONS = [
  { id: 'plane', icon: '✈️', label: 'Flugzeug' },
  { id: 'turbine', icon: '🌀', label: 'Turbine' },
  { id: 'jet', icon: '🛩️', label: 'Jet' },
  { id: 'takeoff', icon: '🛫', label: 'Start' },
  { id: 'landing', icon: '🛬', label: 'Landung' },
  { id: 'rocket', icon: '🚀', label: 'Rakete' },
  { id: 'globe', icon: '🌍', label: 'Globus' },
  { id: 'star', icon: '⭐', label: 'Stern' },
  { id: 'crown', icon: '👑', label: 'Krone' },
  { id: 'eagle', icon: '🦅', label: 'Adler' },
  { id: 'lightning', icon: '⚡', label: 'Blitz' },
  { id: 'shield', icon: '🛡️', label: 'Schild' },
  { id: 'diamond', icon: '💎', label: 'Diamant' },
  { id: 'fire', icon: '🔥', label: 'Feuer' },
  { id: 'wing', icon: '🪽', label: 'Flügel' }
]

// Predefined colors (10)
const AIRLINE_COLORS = [
  { id: 'blue', color: '#4fc3f7', label: 'Himmelblau' },
  { id: 'gold', color: '#ffd700', label: 'Gold' },
  { id: 'red', color: '#ef5350', label: 'Rot' },
  { id: 'green', color: '#66bb6a', label: 'Grün' },
  { id: 'purple', color: '#ab47bc', label: 'Lila' },
  { id: 'orange', color: '#ffa726', label: 'Orange' },
  { id: 'teal', color: '#26a69a', label: 'Türkis' },
  { id: 'pink', color: '#ec407a', label: 'Pink' },
  { id: 'indigo', color: '#5c6bc0', label: 'Indigo' },
  { id: 'silver', color: '#90a4ae', label: 'Silber' }
]

const getIconEmoji = (iconId) => {
  const icon = AIRLINE_ICONS.find(i => i.id === iconId)
  return icon ? icon.icon : '✈️'
}

const formatDuration = (seconds) => {
  if (!seconds) return '0h'
  const hours = Math.floor(seconds / 3600)
  return `${hours}h`
}

const AirlinePage = ({ onBack, onLogin }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('loading') // loading, no-airline, my-airline, browse, create
  const [myAirline, setMyAirline] = useState(null)
  const [members, setMembers] = useState([])
  const [airlines, setAirlines] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'plane',
    color: '#4fc3f7'
  })

  const isDemo = !user

  useEffect(() => {
    if (user) {
      loadUserAirline()
    } else {
      // Demo mode
      setView('no-airline')
      setLoading(false)
    }
  }, [user])

  const loadUserAirline = async () => {
    setLoading(true)
    const { data, error } = await getUserAirline(user.id)

    if (error) {
      console.error('Error loading airline:', error)
      setView('no-airline')
    } else if (data) {
      setMyAirline(data)
      setView('my-airline')
      // Load members
      const { data: membersData } = await getAirlineMembers(data.id)
      if (membersData) {
        setMembers(membersData)
      }
    } else {
      setView('no-airline')
    }
    setLoading(false)
  }

  const loadAirlines = async () => {
    const { data } = await getAirlines(50)
    if (data) {
      setAirlines(data)
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      loadAirlines()
      return
    }
    const { data } = await searchAirlines(query)
    if (data) {
      setAirlines(data)
    }
  }

  const handleBrowse = () => {
    setView('browse')
    loadAirlines()
  }

  const handleCreate = () => {
    setView('create')
    setCreateForm({
      name: '',
      code: '',
      description: '',
      icon: 'plane',
      color: '#4fc3f7'
    })
    setError('')
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setActionLoading(true)

    if (!createForm.name.trim()) {
      setError('Bitte gib einen Namen ein')
      setActionLoading(false)
      return
    }

    if (!createForm.code.trim() || createForm.code.length < 2 || createForm.code.length > 4) {
      setError('Der Code muss 2-4 Zeichen lang sein')
      setActionLoading(false)
      return
    }

    const { data, error } = await createAirline(user.id, createForm)

    if (error) {
      setError(error.message || 'Fehler beim Erstellen der Airline')
    } else {
      setSuccess('Airline erfolgreich erstellt!')
      setTimeout(() => {
        loadUserAirline()
        setSuccess('')
      }, 1500)
    }
    setActionLoading(false)
  }

  const handleJoin = async (airlineId) => {
    if (isDemo) {
      onLogin()
      return
    }
    setActionLoading(true)
    setError('')

    const { error } = await joinAirline(user.id, airlineId)

    if (error) {
      setError(error.message || 'Fehler beim Beitreten')
    } else {
      setSuccess('Erfolgreich beigetreten!')
      setTimeout(() => {
        loadUserAirline()
        setSuccess('')
      }, 1500)
    }
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!window.confirm('Willst du diese Airline wirklich verlassen?')) {
      return
    }
    setActionLoading(true)

    const { error } = await leaveAirline(user.id, myAirline.id)

    if (error) {
      setError(error.message || 'Fehler beim Verlassen')
    } else {
      setMyAirline(null)
      setMembers([])
      setView('no-airline')
    }
    setActionLoading(false)
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`${memberName} wirklich aus der Airline entfernen?`)) {
      return
    }
    setActionLoading(true)

    const { error } = await removeMember(memberId, myAirline.id)

    if (error) {
      setError(error.message || 'Fehler beim Entfernen')
    } else {
      // Reload members
      const { data } = await getAirlineMembers(myAirline.id)
      if (data) {
        setMembers(data)
      }
    }
    setActionLoading(false)
  }

  const handleDeleteAirline = async () => {
    if (!window.confirm('Airline wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      return
    }
    if (!window.confirm('Bist du WIRKLICH sicher? Alle Daten gehen verloren!')) {
      return
    }
    setActionLoading(true)

    const { error } = await deleteAirline(myAirline.id)

    if (error) {
      setError(error.message || 'Fehler beim Löschen')
    } else {
      setMyAirline(null)
      setMembers([])
      setView('no-airline')
    }
    setActionLoading(false)
  }

  const isCEO = myAirline?.role === 'ceo'

  return (
    <div className="airline-page">
      {/* Header */}
      <header className="airline-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <div className="airline-logo">
          <span className="logo-icon">🏢</span>
          <span className="logo-text">Airlines</span>
        </div>
        <div className="header-spacer"></div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="demo-banner">
          <div className="demo-banner-content">
            <span className="demo-badge">DEMO</span>
            <span className="demo-text">Melde dich an, um einer Airline beizutreten oder deine eigene zu gründen!</span>
            <button className="demo-login-btn" onClick={onLogin}>
              Jetzt anmelden
            </button>
          </div>
        </div>
      )}

      <div className="airline-content">
        {/* Messages */}
        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}

        {loading ? (
          <div className="airline-loading">
            <div className="loading-spinner"></div>
            <p>Lade Airline-Daten...</p>
          </div>
        ) : (
          <>
            {/* No Airline View */}
            {view === 'no-airline' && (
              <div className="no-airline-view">
                <div className="welcome-card">
                  <div className="welcome-icon">🏢</div>
                  <h2>Willkommen bei SimFlyCorp Airlines</h2>
                  <p>Gründe deine eigene virtuelle Airline oder tritt einer bestehenden bei!</p>

                  <div className="action-buttons">
                    <button
                      className="primary-btn"
                      onClick={isDemo ? onLogin : handleCreate}
                    >
                      <span>✈️</span> Airline gründen
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={handleBrowse}
                    >
                      <span>🔍</span> Airlines durchsuchen
                    </button>
                  </div>
                </div>

                <div className="info-cards">
                  <div className="info-card">
                    <div className="info-icon">👨‍✈️</div>
                    <h3>Als CEO</h3>
                    <p>Gründe deine Airline, wähle Logo und Farben, manage deine Piloten</p>
                  </div>
                  <div className="info-card">
                    <div className="info-icon">🧑‍✈️</div>
                    <h3>Als Pilot</h3>
                    <p>Tritt einer Airline bei und trage zu den gemeinsamen Stats bei</p>
                  </div>
                  <div className="info-card">
                    <div className="info-icon">🏆</div>
                    <h3>Rangliste</h3>
                    <p>Deine Flüge zählen zur Airline-Rangliste während deiner Mitgliedschaft</p>
                  </div>
                </div>
              </div>
            )}

            {/* My Airline View */}
            {view === 'my-airline' && myAirline && (
              <div className="my-airline-view">
                <div className="airline-card" style={{ borderColor: myAirline.color }}>
                  <div className="airline-badge" style={{ backgroundColor: myAirline.color }}>
                    <span className="badge-icon">{getIconEmoji(myAirline.icon)}</span>
                  </div>

                  <div className="airline-info">
                    <div className="airline-name-row">
                      <h2>{myAirline.name}</h2>
                      <span className="airline-code" style={{ color: myAirline.color }}>[{myAirline.code}]</span>
                    </div>
                    {myAirline.description && (
                      <p className="airline-description">{myAirline.description}</p>
                    )}
                    <div className="role-badge" style={{ backgroundColor: isCEO ? '#ffd700' : '#4fc3f7' }}>
                      {isCEO ? '👑 CEO' : '🧑‍✈️ Pilot'}
                    </div>
                  </div>

                  <div className="airline-stats">
                    <div className="stat">
                      <div className="stat-value">{myAirline.member_count || 1}</div>
                      <div className="stat-label">Piloten</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{myAirline.total_flights || 0}</div>
                      <div className="stat-label">Flüge</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{Math.round(myAirline.total_distance || 0).toLocaleString()}</div>
                      <div className="stat-label">NM</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{formatDuration(myAirline.total_flight_time)}</div>
                      <div className="stat-label">Flugzeit</div>
                    </div>
                    <div className="stat highlight">
                      <div className="stat-value">{(myAirline.total_score || 0).toLocaleString()}</div>
                      <div className="stat-label">Score</div>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div className="members-section">
                  <h3>Piloten ({members.length})</h3>
                  <div className="members-list">
                    {members.map((member) => (
                      <div key={member.id} className="member-row">
                        <div className="member-info">
                          <span className="member-role">
                            {member.role === 'ceo' ? '👑' : '🧑‍✈️'}
                          </span>
                          <span className="member-name">{member.display_name}</span>
                          {member.role === 'ceo' && <span className="ceo-tag">CEO</span>}
                        </div>
                        <div className="member-joined">
                          seit {new Date(member.joined_at).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                        </div>
                        {isCEO && member.role !== 'ceo' && (
                          <button
                            className="remove-btn"
                            onClick={() => handleRemoveMember(member.user_id, member.display_name)}
                            disabled={actionLoading}
                            title="Entfernen"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="airline-actions">
                  {!isCEO && (
                    <button
                      className="leave-btn"
                      onClick={handleLeave}
                      disabled={actionLoading}
                    >
                      Airline verlassen
                    </button>
                  )}
                  {isCEO && myAirline.member_count <= 1 && (
                    <button
                      className="delete-btn"
                      onClick={handleDeleteAirline}
                      disabled={actionLoading}
                    >
                      Airline auflösen
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Browse Airlines View */}
            {view === 'browse' && (
              <div className="browse-view">
                <div className="browse-header">
                  <button className="back-link" onClick={() => setView('no-airline')}>
                    ← Zurück
                  </button>
                  <h2>Airlines durchsuchen</h2>
                </div>

                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Suche nach Name oder Code..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                <div className="airlines-grid">
                  {airlines.length === 0 ? (
                    <div className="no-results">
                      <p>Keine Airlines gefunden</p>
                    </div>
                  ) : (
                    airlines.map((airline) => (
                      <div
                        key={airline.id}
                        className="airline-preview-card"
                        style={{ borderColor: airline.color }}
                      >
                        <div className="preview-badge" style={{ backgroundColor: airline.color }}>
                          {getIconEmoji(airline.icon)}
                        </div>
                        <div className="preview-info">
                          <div className="preview-name">{airline.name}</div>
                          <div className="preview-code">[{airline.code}]</div>
                          <div className="preview-stats">
                            <span>👨‍✈️ {airline.member_count}</span>
                            <span>✈️ {airline.total_flights}</span>
                            <span>⭐ {(airline.total_score || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          className="join-btn"
                          onClick={() => handleJoin(airline.id)}
                          disabled={actionLoading}
                          style={{ backgroundColor: airline.color }}
                        >
                          Beitreten
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Create Airline View */}
            {view === 'create' && (
              <div className="create-view">
                <div className="create-header">
                  <button className="back-link" onClick={() => setView('no-airline')}>
                    ← Zurück
                  </button>
                  <h2>Airline gründen</h2>
                </div>

                <form className="create-form" onSubmit={handleCreateSubmit}>
                  <div className="form-group">
                    <label>Name der Airline</label>
                    <input
                      type="text"
                      placeholder="z.B. Sky Express Virtual"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      maxLength={50}
                    />
                  </div>

                  <div className="form-group">
                    <label>Code (2-4 Zeichen)</label>
                    <input
                      type="text"
                      placeholder="z.B. SEV"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                      maxLength={4}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Beschreibung (optional)</label>
                    <textarea
                      placeholder="Kurze Beschreibung deiner Airline..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      maxLength={200}
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon</label>
                    <div className="icon-selector">
                      {AIRLINE_ICONS.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          className={`icon-option ${createForm.icon === icon.id ? 'selected' : ''}`}
                          onClick={() => setCreateForm({ ...createForm, icon: icon.id })}
                          title={icon.label}
                        >
                          {icon.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Farbe</label>
                    <div className="color-selector">
                      {AIRLINE_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`color-option ${createForm.color === c.color ? 'selected' : ''}`}
                          onClick={() => setCreateForm({ ...createForm, color: c.color })}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="preview-section">
                    <label>Vorschau</label>
                    <div className="airline-preview" style={{ borderColor: createForm.color }}>
                      <div className="preview-badge" style={{ backgroundColor: createForm.color }}>
                        {getIconEmoji(createForm.icon)}
                      </div>
                      <div className="preview-text">
                        <span className="preview-name">{createForm.name || 'Airline Name'}</span>
                        <span className="preview-code" style={{ color: createForm.color }}>
                          [{createForm.code || 'CODE'}]
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={actionLoading}
                    style={{ backgroundColor: createForm.color }}
                  >
                    {actionLoading ? 'Wird erstellt...' : 'Airline gründen'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AirlinePage
