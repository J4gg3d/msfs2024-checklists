import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Checklist from './components/Checklist'
import SimStatus from './components/SimStatus'
import DetailPanel from './components/DetailPanel'
import FlightInfo from './components/FlightInfo'
import { LandingModal, LandingPanel } from './components/LandingRating'
import AuthModal from './components/AuthModal'
import SimFlyCorp from './components/SimFlyCorp'
import { useAuth } from './context/AuthContext'
import useSimConnect from './hooks/useSimConnect'
import { useChecklist, availableAircraft } from './hooks/useChecklist'
import { calculateFlownDistance, isAirportKnown, getAirportCoordinatesAsync, calculateRouteDistanceAsync } from './utils/geoUtils'
import './App.css'

// LocalStorage Keys
const STORAGE_KEYS = {
  MODE: 'msfs-checklist-mode',
  AIRCRAFT: 'msfs-checklist-aircraft',
  CHECKED_NORMAL: 'msfs-checklist-checked-normal',
  CHECKED_CAREER: 'msfs-checklist-checked-career',
  COLLAPSED_NORMAL: 'msfs-checklist-collapsed-normal',
  COLLAPSED_CAREER: 'msfs-checklist-collapsed-career',
  FLIGHT_ROUTE: 'msfs-checklist-flight-route'
}

// Hilfsfunktionen für LocalStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      return new Set(parsed)
    }
  } catch (e) {
    console.warn('Fehler beim Laden aus LocalStorage:', e)
  }
  return defaultValue
}

const saveToStorage = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch (e) {
    console.warn('Fehler beim Speichern in LocalStorage:', e)
  }
}

function App() {
  const { t, i18n } = useTranslation()
  const { user, profile, isAuthenticated, signOut, loading: authLoading } = useAuth()

  // Auth & SimFlyCorp
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSimFlyCorp, setShowSimFlyCorp] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // FlightInfo visibility tracking for status bar
  const flightInfoRef = useRef(null)
  const [isFlightInfoVisible, setIsFlightInfoVisible] = useState(true)

  // Lade ausgewähltes Flugzeug aus Storage
  const [selectedAircraft, setSelectedAircraft] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AIRCRAFT)
      // Prüfen ob das gespeicherte Flugzeug noch existiert
      if (saved && availableAircraft.find(a => a.id === saved)) {
        return saved
      }
    } catch {
      // Fallback
    }
    return 'a330'
  })

  // Hole das aktuelle Flugzeug-Objekt
  const currentAircraft = availableAircraft.find(a => a.id === selectedAircraft) || availableAircraft[0]

  // Lade initialen Modus aus Storage
  const [isCareerMode, setIsCareerMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) === 'career'
      // Wenn Flugzeug nur Career hat, immer Career
      if (currentAircraft && !currentAircraft.hasNormal) {
        return true
      }
      return savedMode
    } catch {
      return false
    }
  })

  // Sprachabhängige Checklisten-Daten
  const checklistData = useChecklist(selectedAircraft, isCareerMode)

  // Lade checked items basierend auf Modus
  const [checkedItems, setCheckedItems] = useState(() => {
    const key = isCareerMode ? STORAGE_KEYS.CHECKED_CAREER : STORAGE_KEYS.CHECKED_NORMAL
    return loadFromStorage(key, new Set())
  })

  // Lade collapsed sections basierend auf Modus
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const key = isCareerMode ? STORAGE_KEYS.COLLAPSED_CAREER : STORAGE_KEYS.COLLAPSED_NORMAL
    return loadFromStorage(key, new Set())
  })

  const [showAircraftModal, setShowAircraftModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'news', 'changelog', 'bridge'

  // Flugdaten (manuell eingegeben)
  const [flightRoute, setFlightRoute] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLIGHT_ROUTE)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.warn('Fehler beim Laden der Flugdaten:', e)
    }
    return { origin: '', destination: '' }
  })

  // Speichere ausgewähltes Flugzeug bei Änderung
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AIRCRAFT, selectedAircraft)
  }, [selectedAircraft])

  // Speichere Modus bei Änderung
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE, isCareerMode ? 'career' : 'normal')
  }, [isCareerMode])

  // Speichere checked items bei Änderung
  useEffect(() => {
    const key = isCareerMode ? STORAGE_KEYS.CHECKED_CAREER : STORAGE_KEYS.CHECKED_NORMAL
    saveToStorage(key, checkedItems)
  }, [checkedItems, isCareerMode])

  // Speichere collapsed sections bei Änderung
  useEffect(() => {
    const key = isCareerMode ? STORAGE_KEYS.COLLAPSED_CAREER : STORAGE_KEYS.COLLAPSED_NORMAL
    saveToStorage(key, collapsedSections)
  }, [collapsedSections, isCareerMode])

  // Speichere Flugdaten bei Änderung
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FLIGHT_ROUTE, JSON.stringify(flightRoute))
    } catch (e) {
      console.warn('Fehler beim Speichern der Flugdaten:', e)
    }
  }, [flightRoute])

  // Track FlightInfo visibility for status bar
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFlightInfoVisible(entry.isIntersecting)
      },
      { threshold: 0.1, rootMargin: '-82px 0px 0px 0px' } // Account for header + status bar height
    )

    if (flightInfoRef.current) {
      observer.observe(flightInfoRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Sprachwechsel-Funktion
  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de'
    i18n.changeLanguage(newLang)
  }

  // SimConnect Integration
  const {
    isConnected,
    simData,
    isDemoMode,
    // Manuelle IP-Verbindung (lokales Netzwerk)
    bridgeIP,
    isManualIPMode,
    connectToIP,
    disconnectFromIP,
    error: connectionError,
    // Route-Synchronisation
    sharedRoute,
    sendRoute,
    // User-Authentifizierung (für Flight-Logging)
    sendAuth,
    // Airport-Lookup über Bridge (umgeht CORS)
    getAirportFromBridge,
    // Landing-Rating
    lastLanding,
    landingHistory,
    clearLastLanding,
    // Standard-Funktionen
    connect,
    disconnect,
    checkAutoStatus
  } = useSimConnect()

  // Landing-Panel State
  const [isLandingPanelExpanded, setIsLandingPanelExpanded] = useState(false)

  // Bridge-IP Eingabe State (für lokales Netzwerk)
  const [bridgeIPInput, setBridgeIPInput] = useState('')
  const [isConnectingIP, setIsConnectingIP] = useState(false)

  // Automatisch mit SimConnect verbinden beim Start
  // (wird vom Hook selbst gehandhabt wenn eine gespeicherte IP existiert)
  useEffect(() => {
    // Nur verbinden wenn keine gespeicherte Bridge-IP existiert
    // (sonst übernimmt der Hook die Verbindung)
    const savedIP = localStorage.getItem('msfs-checklist-bridge-ip');
    if (!savedIP) {
      connect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // User-Authentifizierung an Bridge senden (für Flight-Logging)
  useEffect(() => {
    if (!isConnected || isDemoMode) return
    // Sende User-ID an Bridge wenn verbunden
    sendAuth(user?.id || null)
  }, [isConnected, isDemoMode, user?.id, sendAuth])

  // Route-Synchronisation: Empfange Route von anderen Clients
  useEffect(() => {
    if (!sharedRoute) return

    setFlightRoute(prev => {
      // Nur aktualisieren wenn sich die Route tatsächlich geändert hat
      if (sharedRoute.origin !== prev.origin || sharedRoute.destination !== prev.destination) {
        console.log('App: Route von Bridge empfangen:', sharedRoute)
        return {
          ...prev,
          origin: sharedRoute.origin || prev.origin,
          destination: sharedRoute.destination || prev.destination
        }
      }
      return prev
    })
  }, [sharedRoute])

  // Route-Synchronisation: Sende aktuelle Route wenn Verbindung hergestellt wird
  useEffect(() => {
    if (!isConnected || isDemoMode) return
    if (!flightRoute?.origin && !flightRoute?.destination) return

    // Kurze Verzögerung um sicherzustellen dass die Verbindung stabil ist
    const timeout = setTimeout(() => {
      sendRoute({
        origin: flightRoute.origin || '',
        destination: flightRoute.destination || ''
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [isConnected, isDemoMode, sendRoute, flightRoute?.origin, flightRoute?.destination])

  // Flughafen-Koordinaten vorladen wenn Origin gesetzt wird
  // Nutzt Bridge für unbekannte Flughäfen (umgeht CORS)
  useEffect(() => {
    if (!flightRoute?.origin) return

    const loadAirport = async () => {
      if (!isAirportKnown(flightRoute.origin)) {
        console.log('App: Lade Flughafen:', flightRoute.origin)

        // Versuche zuerst über Bridge (CORS-frei)
        if (isConnected && !isDemoMode && getAirportFromBridge) {
          const coords = await getAirportFromBridge(flightRoute.origin)
          if (coords) {
            console.log('App: Flughafen über Bridge geladen:', flightRoute.origin, coords)
            // Speichere im lokalen Cache für geoUtils
            try {
              const cache = JSON.parse(localStorage.getItem('msfs-checklist-airport-cache') || '{}')
              cache[flightRoute.origin.toUpperCase()] = coords
              localStorage.setItem('msfs-checklist-airport-cache', JSON.stringify(cache))
            } catch (e) {
              console.warn('Cache-Fehler:', e)
            }
            return
          }
        }

        // Fallback: Direkte API (funktioniert nur lokal, nicht auf HTTPS)
        const coords = await getAirportCoordinatesAsync(flightRoute.origin)
        if (coords) {
          console.log('App: Flughafen über API geladen:', flightRoute.origin, coords)
        } else {
          console.warn('App: Flughafen nicht gefunden:', flightRoute.origin)
        }
      }
    }

    loadAirport()
  }, [flightRoute?.origin, isConnected, isDemoMode, getAirportFromBridge])

  // Automatische Berechnung der Gesamtdistanz zwischen Origin und Destination
  // Nutzt GPS-Ziel oder manuell eingegebenes Ziel
  useEffect(() => {
    const origin = flightRoute?.origin
    // Destination: GPS-Ziel hat Vorrang, dann manuelle Eingabe
    const destination = simData?.gpsApproachAirportId || flightRoute?.destination

    if (!origin || !destination) return

    const calculateDistance = async () => {
      console.log('App: Berechne Distanz:', origin, '→', destination)

      // Lade Destination-Koordinaten über Bridge wenn nötig
      if (!isAirportKnown(destination) && isConnected && !isDemoMode && getAirportFromBridge) {
        console.log('App: Lade Zielflughafen über Bridge:', destination)
        const coords = await getAirportFromBridge(destination)
        if (coords) {
          // Im lokalen Cache speichern
          try {
            const cache = JSON.parse(localStorage.getItem('msfs-checklist-airport-cache') || '{}')
            cache[destination.toUpperCase()] = coords
            localStorage.setItem('msfs-checklist-airport-cache', JSON.stringify(cache))
            console.log('App: Zielflughafen über Bridge geladen:', destination, coords)
          } catch (e) {
            console.warn('Cache-Fehler:', e)
          }
        }
      }

      const distance = await calculateRouteDistanceAsync(origin, destination)

      if (distance != null && distance > 0) {
        setFlightRoute(prev => {
          // Nur aktualisieren wenn sich die Distanz geändert hat
          if (prev.totalDistance !== distance) {
            console.log('App: Gesamtdistanz berechnet:', distance, 'NM')
            return { ...prev, totalDistance: distance }
          }
          return prev
        })
      }
    }

    calculateDistance()
  }, [flightRoute?.origin, flightRoute?.destination, simData?.gpsApproachAirportId, isConnected, isDemoMode, getAirportFromBridge])

  // Automatisches Tracking der geflogenen Distanz basierend auf GPS-Position
  // Berechnet die Distanz vom Startflughafen zur aktuellen Position
  useEffect(() => {
    if (!isConnected) return
    if (!flightRoute?.origin) return
    if (simData?.latitude == null || simData?.longitude == null) return

    // Prüfen ob der Startflughafen bekannt ist (inkl. Cache von API)
    if (!isAirportKnown(flightRoute.origin)) {
      // Flughafen wird gerade geladen oder existiert nicht
      return
    }

    // Distanz vom Startflughafen zur aktuellen Position berechnen
    const gpsFlownDistance = calculateFlownDistance(
      flightRoute.origin,
      simData.latitude,
      simData.longitude
    )

    if (gpsFlownDistance != null && gpsFlownDistance >= 0) {
      setFlightRoute(prev => {
        // Nur aktualisieren wenn sich die Distanz signifikant geändert hat (> 0.5 NM)
        const currentFlown = prev.flownDistance || 0
        if (Math.abs(gpsFlownDistance - currentFlown) > 0.5) {
          return { ...prev, flownDistance: gpsFlownDistance }
        }
        return prev
      })
    }
  }, [isConnected, simData?.latitude, simData?.longitude, flightRoute?.origin])

  const handleItemToggle = (itemId) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleItemSelect = (item) => {
    setSelectedItem(item)
  }

  const handleSectionToggle = (sectionId) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleAircraftChange = () => {
    setShowAircraftModal(true)
  }

  const handleCareerModeToggle = () => {
    // Prüfen ob das aktuelle Flugzeug den anderen Modus unterstützt
    if (!isCareerMode && !currentAircraft.hasCareer) return
    if (isCareerMode && !currentAircraft.hasNormal) return

    const newMode = !isCareerMode
    setIsCareerMode(newMode)
    // Lade gespeicherte Items für den neuen Modus
    const checkedKey = newMode ? STORAGE_KEYS.CHECKED_CAREER : STORAGE_KEYS.CHECKED_NORMAL
    const collapsedKey = newMode ? STORAGE_KEYS.COLLAPSED_CAREER : STORAGE_KEYS.COLLAPSED_NORMAL
    setCheckedItems(loadFromStorage(checkedKey, new Set()))
    setCollapsedSections(loadFromStorage(collapsedKey, new Set()))
    setSelectedItem(null)
  }

  const handleAircraftSelect = (aircraftId) => {
    const aircraft = availableAircraft.find(a => a.id === aircraftId)
    if (!aircraft) return

    setSelectedAircraft(aircraftId)
    setShowAircraftModal(false)
    setSelectedItem(null)

    // Wenn das neue Flugzeug den aktuellen Modus nicht unterstützt, wechseln
    if (isCareerMode && !aircraft.hasCareer) {
      setIsCareerMode(false)
    } else if (!isCareerMode && !aircraft.hasNormal) {
      setIsCareerMode(true)
    }
  }

  const handleMenuItemClick = (modal) => {
    setActiveModal(modal)
    setShowMenu(false)
  }

  const handleResetChecklist = () => {
    if (confirm(t('confirm.resetChecklist'))) {
      setCheckedItems(new Set())
      setCollapsedSections(new Set())
      setFlightRoute({ origin: '', destination: '', totalDistance: 0, flownDistance: 0 })
    }
  }

  const handleFlightRouteChange = (newRoute) => {
    setFlightRoute(newRoute)

    // Route an andere verbundene Clients senden
    if (isConnected && !isDemoMode) {
      sendRoute({
        origin: newRoute.origin || '',
        destination: newRoute.destination || ''
      })
    }
  }

  const handleResetFlight = () => {
    if (confirm(t('confirm.resetFlight'))) {
      setFlightRoute(prev => ({ ...prev, flownDistance: 0 }))
    }
  }

  // Handler für IP-Verbindung (lokales Netzwerk)
  const handleIPConnect = async () => {
    if (!bridgeIPInput.trim()) return

    setIsConnectingIP(true)
    await connectToIP(bridgeIPInput.trim())
    setIsConnectingIP(false)
    setBridgeIPInput('')
  }

  const handleIPDisconnect = () => {
    disconnectFromIP()
  }

  return (
    <>
      {/* Top Header Bar */}
      <header className="top-header">
        <div className="header-left">
          <button className="header-menu-btn" onClick={() => setShowMenu(!showMenu)}>
            <span>☰</span>
          </button>
          <span className="header-logo">SimChecklist</span>
        </div>

        <div className="header-right">
          {/* SimFlyCorp Button */}
          <button className="header-btn header-btn-simflycorp" onClick={() => setShowSimFlyCorp(true)}>
            <span className="header-btn-icon">✈</span>
            <span className="header-btn-text">SimFlyCorp</span>
          </button>

          {/* User Button */}
          {isAuthenticated ? (
            <div className="header-user-dropdown">
              <button className="header-btn header-btn-user" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="header-btn-icon">👨‍✈️</span>
                <span className="header-btn-text">{profile?.display_name || profile?.username || 'Pilot'}</span>
                <span className="header-btn-arrow">▾</span>
              </button>
              {showUserMenu && (
                <div className="header-dropdown-menu" onMouseLeave={() => setShowUserMenu(false)}>
                  <button onClick={() => { setShowSimFlyCorp(true); setShowUserMenu(false); }}>
                    <span>📊</span> Mein Profil
                  </button>
                  <button onClick={async () => { await signOut(); setShowUserMenu(false); }}>
                    <span>🚪</span> Abmelden
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="header-btn header-btn-login" onClick={() => setShowAuthModal(true)}>
              <span className="header-btn-icon">👤</span>
              <span className="header-btn-text">Login</span>
            </button>
          )}

          {/* Language Toggle */}
          <div className="header-lang-toggle">
            <button
              className={`header-lang-btn ${i18n.language === 'de' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('de')}
            >
              DE
            </button>
            <button
              className={`header-lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Status Bar */}
      <div className={`status-bar ${!isFlightInfoVisible ? 'expanded' : ''}`}>
        <div className="status-bar-content">
          {/* Connection Status - always visible */}
          <div className={`status-item status-connection ${isConnected ? 'connected' : ''}`}>
            <span className="status-dot"></span>
            <span className="status-label">
              {isConnected ? 'Bridge verbunden' : 'Bridge offline'}
            </span>
          </div>

          {/* Flight Route and Data - only when FlightInfo is scrolled out of view */}
          {!isFlightInfoVisible && (
            <>
              {(flightRoute.origin || flightRoute.destination) && (
                <div className="status-item status-route">
                  <span className="status-icon">✈</span>
                  <span className="status-value">
                    {flightRoute.origin || '????'} → {flightRoute.destination || '????'}
                  </span>
                </div>
              )}

              {isConnected && simData && (
                <>
                  <div className="status-item">
                    <span className="status-label">ALT</span>
                    <span className="status-value">{Math.round(simData.altitude || 0).toLocaleString()} ft</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">GS</span>
                    <span className="status-value">{Math.round(simData.groundSpeed || 0)} kts</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">HDG</span>
                    <span className="status-value">{Math.round(simData.heading || 0)}°</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Menu Overlay */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>{t('menu.title')}</h3>
              <button className="menu-close" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            <div className="menu-items">
              <button className="menu-item" onClick={() => handleMenuItemClick('workflow')}>
                <span className="menu-item-icon">🛫</span>
                <span className="menu-item-text">{t('menu.flightPrep')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('news')}>
                <span className="menu-item-icon">📢</span>
                <span className="menu-item-text">{t('menu.news')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('changelog')}>
                <span className="menu-item-icon">📋</span>
                <span className="menu-item-text">{t('menu.changelog')}</span>
              </button>
              <div className="menu-divider"></div>
              <button className="menu-item" onClick={() => handleMenuItemClick('bridge')}>
                <span className="menu-item-icon">🔗</span>
                <span className="menu-item-text">{t('menu.bridge')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('tablet')}>
                <span className="menu-item-icon">📱</span>
                <span className="menu-item-text">{t('menu.tablet')}</span>
              </button>
              <div className="menu-divider"></div>
              <button className="menu-item" onClick={() => handleMenuItemClick('github')}>
                <span className="menu-item-icon">⌨</span>
                <span className="menu-item-text">{t('menu.github')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('feedback')}>
                <span className="menu-item-icon">💬</span>
                <span className="menu-item-text">{t('menu.feedback')}</span>
              </button>
              <div className="menu-divider"></div>
              <button className="menu-item" onClick={() => { setShowMenu(false); handleResetFlight(); }}>
                <span className="menu-item-icon">🛫</span>
                <span className="menu-item-text">{t('menu.newFlight')}</span>
              </button>
              <button className="menu-item menu-item-danger" onClick={() => { setShowMenu(false); handleResetChecklist(); }}>
                <span className="menu-item-icon">🔄</span>
                <span className="menu-item-text">{t('menu.resetChecklist')}</span>
              </button>
            </div>
            <div className="menu-footer">
              <div className="menu-footer-greeting">Fly Safe!</div>
              <div className="menu-footer-author">Florian (J4gg3d)</div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {activeModal === 'workflow' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🛫 {t('modals.workflow.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <p className="workflow-intro">{t('modals.workflow.intro')}</p>
              </div>

              <div className="workflow-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>{t('modals.workflow.step1Title')}</h3>
                  <p>
                    {t('modals.workflow.step1Text')}
                    <strong> {t('modals.workflow.step1Important')}</strong> {t('modals.workflow.step1ImportantText')}
                  </p>
                  <div className="step-tip">💡 {t('modals.workflow.step1Tip')}</div>
                </div>
              </div>

              <div className="workflow-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>{t('modals.workflow.step2Title')}</h3>
                  <p>
                    {t('modals.workflow.step2Text').split('MSFS Flight Planner')[0]}
                    <a href="https://planner.flightsimulator.com/" target="_blank" rel="noopener noreferrer">
                    {t('modals.workflow.flightPlanner')}</a>
                    {t('modals.workflow.step2Text').split('MSFS Flight Planner')[1] || ''}
                  </p>
                  <div className="step-warning">
                    ⚠️ <strong>{t('modals.workflow.step2Warning')}</strong> {t('modals.workflow.step2WarningText')}
                  </div>
                </div>
              </div>

              <div className="workflow-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>{t('modals.workflow.step3Title')}</h3>
                  <p>{t('modals.workflow.step3Text')}</p>
                </div>
              </div>

              <div className="workflow-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>{t('modals.workflow.step4Title')}</h3>
                  <p>{t('modals.workflow.step4Text')}</p>
                  <div className="step-tip">💡 {t('modals.workflow.step4Tip')}</div>
                </div>
              </div>

              <div className="info-section workflow-links">
                <h3>{t('modals.workflow.usefulLinks')}</h3>
                <ul>
                  <li>
                    <a href="https://planner.flightsimulator.com/" target="_blank" rel="noopener noreferrer">
                      {t('modals.workflow.flightPlanner')}
                    </a> - {t('modals.workflow.flightPlannerDesc')}
                  </li>
                  <li>
                    <a href="https://simbrief.com/" target="_blank" rel="noopener noreferrer">
                      {t('modals.workflow.simbrief')}
                    </a> - {t('modals.workflow.simbriefDesc')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News Modal */}
      {activeModal === 'news' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📢 {t('modals.news.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <h3>{t('modals.news.welcome')}</h3>
                <p>{t('modals.news.welcomeText')}</p>
              </div>
              <div className="info-section">
                <h3>{t('modals.news.features')}</h3>
                <ul>
                  <li><strong>{t('modals.news.featureNormal')}</strong> {t('modals.news.featureNormalDesc')}</li>
                  <li><strong>{t('modals.news.featureCareer')}</strong> {t('modals.news.featureCareerDesc')}</li>
                  <li><strong>{t('modals.news.featureDetail')}</strong> {t('modals.news.featureDetailDesc')}</li>
                  <li><strong>{t('modals.news.featureProgress')}</strong> {t('modals.news.featureProgressDesc')}</li>
                </ul>
              </div>
              <div className="info-section info-storage">
                <h3>💾 {t('modals.news.storage')}</h3>
                <p>{t('modals.news.storageText')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Modal */}
      {activeModal === 'changelog' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 {t('modals.changelog.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="changelog-entry">
                <div className="changelog-version">v1.2.0</div>
                <div className="changelog-date">Dezember 2024</div>
                <ul>
                  <li>SimConnect Bridge mit Auto-Check Feature</li>
                  <li>Automatische Statusanzeige für Checklist-Items</li>
                  <li>Live-Überwachung von Cockpit-Zuständen</li>
                  <li>Grün/Rot-Indikatoren zeigen korrekten/falschen Status</li>
                </ul>
              </div>
              <div className="changelog-entry">
                <div className="changelog-version">v1.1.0</div>
                <div className="changelog-date">Dezember 2024</div>
                <ul>
                  <li>Karriere-Modus mit optimierter Checkliste hinzugefügt</li>
                  <li>LocalStorage - Fortschritt wird gespeichert</li>
                  <li>Hamburger-Menü mit News, Changelog und Bridge-Info</li>
                  <li>Checkliste zurücksetzen Funktion</li>
                </ul>
              </div>
              <div className="changelog-entry">
                <div className="changelog-version">v1.0.0</div>
                <div className="changelog-date">Dezember 2024</div>
                <ul>
                  <li>Initiale Version</li>
                  <li>A330 Checkliste mit allen Flugphasen</li>
                  <li>Detail-Panel mit Erklärungen</li>
                  <li>SimConnect Bridge Integration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablet Modal */}
      {activeModal === 'tablet' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📱 {t('modals.tablet.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* LOKALES NETZWERK - IP-Verbindung (prominenter) */}
              <div className="info-section bridge-session-section">
                <h3>🌐 {t('modals.tablet.localNetworkTitle', 'Lokales Netzwerk')}</h3>
                <p>{t('modals.tablet.localNetworkIntro', 'Verbinde dich mit dem PC, auf dem die Bridge läuft. Die IP-Adresse wird in der Bridge angezeigt.')}</p>

                {isManualIPMode && isConnected ? (
                  <div className="session-connected">
                    <div className="session-status connected">
                      <span className="status-icon">✓</span>
                      <span>{t('modals.tablet.ipConnected', 'Verbunden mit Bridge')}</span>
                    </div>
                    <div className="session-code-display">
                      <code>{bridgeIP}</code>
                    </div>
                    <button
                      className="session-disconnect-btn"
                      onClick={handleIPDisconnect}
                    >
                      {t('modals.tablet.ipDisconnect', 'Trennen')}
                    </button>
                  </div>
                ) : (
                  <div className="session-input-container">
                    <input
                      type="text"
                      className="session-code-input"
                      placeholder={t('modals.tablet.ipPlaceholder', '192.168.1.100')}
                      value={bridgeIPInput}
                      onChange={(e) => setBridgeIPInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIPConnect()}
                      disabled={isConnectingIP}
                    />
                    <button
                      className="session-connect-btn"
                      onClick={handleIPConnect}
                      disabled={isConnectingIP || !bridgeIPInput.trim()}
                    >
                      {isConnectingIP
                        ? t('modals.tablet.ipConnecting', 'Verbinde...')
                        : t('modals.tablet.ipConnect', 'Verbinden')}
                    </button>
                  </div>
                )}

                {connectionError && (
                  <div className="session-error">
                    {connectionError}
                  </div>
                )}

                <div className="hint-text" style={{marginTop: '12px'}}>
                  💡 {t('modals.tablet.ipHint', 'Die IP-Adresse findest du in der Bridge-Konsole. Tablet und PC müssen im gleichen WLAN sein.')}
                </div>
              </div>

              {/* Aktueller Verbindungsstatus */}
              <div className="info-section info-storage">
                <h3>{t('modals.tablet.currentConnection')}</h3>
                <p>
                  <strong>Status:</strong>{' '}
                  {isConnected ? (
                    isDemoMode ? (
                      <span style={{color: '#ffa726'}}>Demo-Modus (keine Bridge)</span>
                    ) : isManualIPMode ? (
                      <span style={{color: '#66bb6a'}}>Verbunden mit {bridgeIP}</span>
                    ) : (
                      <span style={{color: '#66bb6a'}}>Verbunden (lokal)</span>
                    )
                  ) : (
                    <span style={{color: '#ef5350'}}>Nicht verbunden</span>
                  )}
                </p>
              </div>

              <div className="info-section">
                <h3>{t('modals.tablet.hints')}</h3>
                <ul>
                  <li>{t('modals.tablet.hint1')}</li>
                  <li>{t('modals.tablet.hint2')}</li>
                  <li>{t('modals.tablet.hint3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bridge Modal */}
      {activeModal === 'bridge' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large modal-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔗 {t('modals.bridge.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Was ist die Bridge */}
              <div className="info-section">
                <h3>{t('modals.bridge.whatIs')}</h3>
                <p>{t('modals.bridge.whatIsText')}</p>
              </div>

              {/* Aktueller Status */}
              <div className="info-section bridge-status-section">
                <h3>{t('modals.bridge.status')}</h3>
                <p className="bridge-status">
                  {isConnected ? (
                    isDemoMode ? `🟡 ${t('modals.bridge.statusDemo')}` : `🟢 ${t('modals.bridge.statusConnected')}`
                  ) : (
                    `🔴 ${t('modals.bridge.statusDisconnected')}`
                  )}
                </p>
              </div>

              {/* Voraussetzungen */}
              <div className="info-section info-warning">
                <h3>⚠️ {t('modals.bridge.requirements')}</h3>
                <p>{t('modals.bridge.requirementsText')}</p>
              </div>

              {/* SDK Installation */}
              <div className="info-section bridge-steps">
                <h3>📦 {t('modals.bridge.sdkTitle')}</h3>
                <ol>
                  <li>{t('modals.bridge.sdkStep1')}</li>
                  <li>{t('modals.bridge.sdkStep2')}</li>
                  <li>{t('modals.bridge.sdkStep3')}</li>
                  <li>{t('modals.bridge.sdkStep4')}<br/>
                    <code className="code-box-inline">{t('modals.bridge.sdkPath')}</code>
                  </li>
                </ol>
                <p className="hint-text">💡 {t('modals.bridge.sdkNote')}</p>
              </div>

              {/* .NET Runtime */}
              <div className="info-section bridge-steps">
                <h3>⚙️ {t('modals.bridge.dotnetTitle')}</h3>
                <ol>
                  <li>{t('modals.bridge.dotnetStep1')}</li>
                  <li>{t('modals.bridge.dotnetStep2')}</li>
                  <li>{t('modals.bridge.dotnetStep3')}</li>
                </ol>
              </div>

              {/* Bridge herunterladen */}
              <div className="info-section bridge-steps">
                <h3>📥 {t('modals.bridge.downloadTitle')}</h3>
                <p>{t('modals.bridge.downloadText')}</p>
                <ol>
                  <li>{t('modals.bridge.downloadStep1')}</li>
                  <li>{t('modals.bridge.downloadStep2')}</li>
                  <li>{t('modals.bridge.downloadStep3')}<br/>
                    <code className="code-box-inline">C:\MSFSBridge</code>
                  </li>
                </ol>
                <a
                  href="https://github.com/J4gg3d/msfs2024-checklists/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-link-btn"
                  style={{marginTop: '12px', display: 'inline-block'}}
                >
                  🔗 {t('modals.bridge.downloadButton')}
                </a>
              </div>

              {/* Bridge Installation */}
              <div className="info-section bridge-steps">
                <h3>🔧 {t('modals.bridge.installation')}</h3>
                <ol>
                  <li>{t('modals.bridge.installStep1')}</li>
                  <li>{t('modals.bridge.installStep2')}</li>
                  <li>{t('modals.bridge.installStep3')}</li>
                  <li>{t('modals.bridge.installStep4')}</li>
                </ol>
                <p className="hint-text">💡 {t('modals.bridge.installNote')}</p>
              </div>

              {/* Verbindung */}
              <div className="info-section">
                <h3>🔌 {t('modals.bridge.connection')}</h3>
                <p>{t('modals.bridge.connectionText')}</p>
                <div className="step-tip">💡 {t('modals.bridge.connectionTip')}</div>
              </div>

              {/* Auto-Check Feature */}
              <div className="info-section">
                <h3>✅ {t('modals.bridge.autoCheck')}</h3>
                <p>{t('modals.bridge.autoCheckText')}</p>
                <ul className="status-legend">
                  <li><span style={{color: '#66bb6a'}}>●</span> {t('modals.bridge.autoCheckGreen')}</li>
                  <li><span style={{color: '#ef5350'}}>●</span> {t('modals.bridge.autoCheckRed')}</li>
                  <li><span style={{color: '#666'}}>○</span> {t('modals.bridge.autoCheckGray')}</li>
                </ul>
              </div>

              {/* Troubleshooting */}
              <div className="info-section troubleshooting-section">
                <h3>🔍 {t('modals.bridge.troubleshooting')}</h3>

                <div className="trouble-item">
                  <strong>{t('modals.bridge.troubleConnection')}</strong>
                  <ul>
                    <li>{t('modals.bridge.troubleConnectionTip1')}</li>
                    <li>{t('modals.bridge.troubleConnectionTip2')}</li>
                    <li>{t('modals.bridge.troubleConnectionTip3')}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <strong>{t('modals.bridge.troubleSdk')}</strong>
                  <ul>
                    <li>{t('modals.bridge.troubleSdkTip1')}</li>
                    <li>{t('modals.bridge.troubleSdkTip2')}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <strong>{t('modals.bridge.troubleFirewall')}</strong>
                  <ul>
                    <li>{t('modals.bridge.troubleFirewallTip')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Modal */}
      {activeModal === 'github' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⌨ {t('modals.github.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <h3>{t('modals.github.openSource')}</h3>
                <p>{t('modals.github.openSourceText')}</p>
              </div>

              <div className="info-section">
                <h3>{t('modals.github.whyTitle')}</h3>
                <ul>
                  <li><strong>{t('modals.github.whyTransparency')}</strong> {t('modals.github.whyTransparencyDesc')}</li>
                  <li><strong>{t('modals.github.whyCommunity')}</strong> {t('modals.github.whyCommunityDesc')}</li>
                  <li><strong>{t('modals.github.whyExtensible')}</strong> {t('modals.github.whyExtensibleDesc')}</li>
                  <li><strong>{t('modals.github.whyFree')}</strong> {t('modals.github.whyFreeDesc')}</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>{t('modals.github.howTitle')}</h3>
                <ul>
                  <li>{t('modals.github.howChecklists')}</li>
                  <li>{t('modals.github.howBugs')}</li>
                  <li>{t('modals.github.howTranslations')}</li>
                  <li>{t('modals.github.howFeatures')}</li>
                </ul>
              </div>

              <div className="info-section github-link-section">
                <a
                  href="https://github.com/J4gg3d/msfs2024-checklists"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-button"
                >
                  {t('modals.github.buttonText')}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {activeModal === 'feedback' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 {t('modals.feedback.title')}</h2>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <p>{t('modals.feedback.intro')}</p>
              </div>

              <div className="feedback-options">
                <div className="feedback-option">
                  <div className="feedback-option-icon">🐛</div>
                  <h3>{t('modals.feedback.githubTitle')}</h3>
                  <p>{t('modals.feedback.githubDesc')}</p>
                  <div className="feedback-benefits">
                    <strong>{t('modals.feedback.githubBenefits')}</strong>
                    <ul>
                      <li>{t('modals.feedback.githubBenefit1')}</li>
                      <li>{t('modals.feedback.githubBenefit2')}</li>
                      <li>{t('modals.feedback.githubBenefit3')}</li>
                    </ul>
                  </div>
                  <a
                    href="https://github.com/J4gg3d/msfs2024-checklists/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="feedback-button github"
                  >
                    {t('modals.feedback.githubButton')}
                  </a>
                </div>

                <div className="feedback-option">
                  <div className="feedback-option-icon">✉️</div>
                  <h3>{t('modals.feedback.emailTitle')}</h3>
                  <p>{t('modals.feedback.emailDesc')}</p>
                  <div className="feedback-benefits">
                    <strong>{t('modals.feedback.emailBenefits')}</strong>
                    <ul>
                      <li>{t('modals.feedback.emailBenefit1')}</li>
                      <li>{t('modals.feedback.emailBenefit2')}</li>
                      <li>{t('modals.feedback.emailBenefit3')}</li>
                    </ul>
                  </div>
                  <a
                    href="mailto:florian@eiche-digital.de?subject=MSFS%20Checklists%20Feedback"
                    className="feedback-button email"
                  >
                    {t('modals.feedback.emailButton')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="app-layout">
        <div className="checklist-container">
          {checklistData ? (
          <Checklist
            data={checklistData}
            checkedItems={checkedItems}
            collapsedSections={collapsedSections}
            selectedItemId={selectedItem?.id}
            onItemToggle={handleItemToggle}
            onItemSelect={handleItemSelect}
            onSectionToggle={handleSectionToggle}
            onAircraftChange={handleAircraftChange}
            isCareerMode={isCareerMode}
            onCareerModeToggle={handleCareerModeToggle}
            canToggleMode={currentAircraft.hasNormal && currentAircraft.hasCareer}
            checkAutoStatus={checkAutoStatus}
            isSimConnected={isConnected}
            simStatusComponent={
              <SimStatus
                isConnected={isConnected}
                simData={simData}
                isDemoMode={isDemoMode}
                onConnect={connect}
                onDisconnect={disconnect}
              />
            }
          />
          ) : (
            <div className="loading-checklist">{t('common.loading', 'Loading...')}</div>
          )}
        </div>
        <div
          className="detail-container"
          onClick={(e) => {
            // Close detail panel when clicking on the overlay background (tablet modal)
            if (e.target.classList.contains('detail-container') && selectedItem) {
              setSelectedItem(null)
            }
          }}
        >
          <div ref={flightInfoRef}>
            <FlightInfo
              simData={simData}
              isConnected={isConnected}
              flightRoute={flightRoute}
              onFlightRouteChange={handleFlightRouteChange}
            />
          </div>
          <LandingPanel
            history={landingHistory}
            isExpanded={isLandingPanelExpanded}
            onToggle={() => setIsLandingPanelExpanded(!isLandingPanelExpanded)}
          />
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      </div>

      {showAircraftModal && (
        <div className="modal-overlay" onClick={() => setShowAircraftModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('modals.aircraft.title', 'Flugzeug wählen')}</h2>
              <button className="modal-close-btn" onClick={() => setShowAircraftModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="aircraft-list">
                {availableAircraft.map((aircraft) => (
                  <button
                    key={aircraft.id}
                    className={`aircraft-option ${selectedAircraft === aircraft.id ? 'selected' : ''}`}
                    onClick={() => handleAircraftSelect(aircraft.id)}
                  >
                    <span className="aircraft-option-name">{aircraft.name}</span>
                    <span className="aircraft-option-modes">
                      {aircraft.hasNormal && <span className="mode-badge normal">Normal</span>}
                      {aircraft.hasCareer && <span className="mode-badge career">Karriere</span>}
                    </span>
                  </button>
                ))}
              </div>
              <div className="info-section" style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                  {t('modals.aircraft.contribute', 'Weitere Flugzeuge können über GitHub beigetragen werden.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landing Rating Modal */}
      <LandingModal landing={lastLanding} onClose={clearLastLanding} />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* SimFlyCorp Page */}
      {showSimFlyCorp && (
        <SimFlyCorp
          onBack={() => setShowSimFlyCorp(false)}
          onLogin={() => { setShowSimFlyCorp(false); setShowAuthModal(true); }}
        />
      )}
    </>
  )
}

export default App
