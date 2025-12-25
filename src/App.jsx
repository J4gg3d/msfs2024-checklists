import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Checklist from './components/Checklist'
import SimStatus from './components/SimStatus'
import DetailPanel from './components/DetailPanel'
import FlightInfo from './components/FlightInfo'
import useSimConnect from './hooks/useSimConnect'
import { useChecklist } from './hooks/useChecklist'
import './App.css'

// LocalStorage Keys
const STORAGE_KEYS = {
  MODE: 'msfs-checklist-mode',
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

  // Lade initialen Modus aus Storage
  const [isCareerMode, setIsCareerMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MODE) === 'career'
    } catch {
      return false
    }
  })

  // Sprachabhängige Checklisten-Daten
  const checklistData = useChecklist('a330', isCareerMode)

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

  // Sprachwechsel-Funktion
  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de'
    i18n.changeLanguage(newLang)
  }

  // SimConnect Integration
  const { isConnected, simData, isDemoMode, connect, disconnect, checkAutoStatus } = useSimConnect()

  // Automatisch mit SimConnect verbinden beim Start
  useEffect(() => {
    connect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Automatisches Tracking der geflogenen Distanz (mit SimRate und Zeitstempel)
  const lastTrackingTime = useRef(Date.now())

  useEffect(() => {
    if (!isConnected || !simData?.groundSpeed || simData.groundSpeed <= 0) return
    if (!flightRoute?.totalDistance || flightRoute.totalDistance <= 0) return
    if (simData.onGround) return // Nicht tracken wenn am Boden

    const intervalId = setInterval(() => {
      const now = Date.now()
      const elapsedSeconds = (now - lastTrackingTime.current) / 1000
      lastTrackingTime.current = now

      const simRate = simData.simRate || 1
      const groundSpeedNm = simData.groundSpeed // Groundspeed in Knoten = NM/h
      const distancePerSecond = groundSpeedNm / 3600 // NM pro Sekunde
      const distanceIncrement = distancePerSecond * elapsedSeconds * simRate

      setFlightRoute(prev => {
        const newFlown = Math.min(
          (prev.flownDistance || 0) + distanceIncrement,
          prev.totalDistance || 0
        )
        return { ...prev, flownDistance: newFlown }
      })
    }, 5000) // Alle 5 Sekunden aktualisieren

    return () => clearInterval(intervalId)
  }, [isConnected, simData?.groundSpeed, simData?.onGround, simData?.simRate, flightRoute?.totalDistance])

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
    const newMode = !isCareerMode
    setIsCareerMode(newMode)
    // Lade gespeicherte Items für den neuen Modus
    const checkedKey = newMode ? STORAGE_KEYS.CHECKED_CAREER : STORAGE_KEYS.CHECKED_NORMAL
    const collapsedKey = newMode ? STORAGE_KEYS.COLLAPSED_CAREER : STORAGE_KEYS.COLLAPSED_NORMAL
    setCheckedItems(loadFromStorage(checkedKey, new Set()))
    setCollapsedSections(loadFromStorage(collapsedKey, new Set()))
    setSelectedItem(null)
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
  }

  const handleResetFlight = () => {
    if (confirm(t('confirm.resetFlight'))) {
      setFlightRoute(prev => ({ ...prev, flownDistance: 0 }))
    }
  }

  return (
    <>
      {/* Hamburger Menu Button */}
      <button className="hamburger-menu" onClick={() => setShowMenu(!showMenu)}>
        <span className="hamburger-icon">☰</span>
      </button>

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
              <button className="menu-item" onClick={() => handleMenuItemClick('bridge')}>
                <span className="menu-item-icon">🔗</span>
                <span className="menu-item-text">{t('menu.bridge')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('tablet')}>
                <span className="menu-item-icon">📱</span>
                <span className="menu-item-text">{t('menu.tablet')}</span>
              </button>
              <button className="menu-item" onClick={() => handleMenuItemClick('github')}>
                <span className="menu-item-icon">⌨</span>
                <span className="menu-item-text">{t('menu.github')}</span>
              </button>
              <div className="menu-divider"></div>
              <div className="language-toggle-container">
                <button
                  className={`language-btn ${i18n.language === 'de' ? 'active' : ''}`}
                  onClick={() => i18n.changeLanguage('de')}
                >
                  <span className="lang-flag">🇩🇪</span>
                  <span className="lang-code">DE</span>
                </button>
                <button
                  className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => i18n.changeLanguage('en')}
                >
                  <span className="lang-flag">🇬🇧</span>
                  <span className="lang-code">EN</span>
                </button>
              </div>
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
              <div className="info-section">
                <h3>{t('modals.tablet.intro')}</h3>
                <p>{t('modals.tablet.introText')}</p>
              </div>

              <div className="info-section tablet-connection-box">
                <h3>1. {t('modals.tablet.step1')}</h3>
                <div className="code-box">
                  <code>npm run dev -- --host</code>
                </div>
                <p className="hint-text">{t('modals.tablet.step1Hint')}</p>
              </div>

              <div className="info-section tablet-connection-box">
                <h3>2. {t('modals.tablet.step2')}</h3>
                <p>{t('modals.tablet.step2Text')}</p>
                <div className="code-box">
                  <code>Network: http://192.168.x.x:5173</code>
                </div>
                <p className="hint-text">{t('modals.tablet.step2Hint')} <code>ipconfig</code> (Windows)</p>
              </div>

              <div className="info-section tablet-connection-box">
                <h3>3. {t('modals.tablet.step3')}</h3>
                <p>{t('modals.tablet.step3Text')}</p>
                <div className="code-box">
                  <code>http://[YOUR-IP]:5173</code>
                </div>
              </div>

              <div className="info-section info-storage">
                <h3>{t('modals.tablet.currentConnection')}</h3>
                <p>
                  <strong>{t('modals.tablet.runningOn')}</strong><br/>
                  <code className="current-url">{window.location.href}</code>
                </p>
                <p>
                  <strong>{t('modals.tablet.wsConnects')}</strong><br/>
                  <code className="current-url">ws://{window.location.hostname}:8080</code>
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

              {/* Bridge Installation */}
              <div className="info-section bridge-steps">
                <h3>🔧 {t('modals.bridge.installation')}</h3>
                <ol>
                  <li>{t('modals.bridge.installStep1')}</li>
                  <li>{t('modals.bridge.installStep2')}<br/>
                    <code className="code-box-inline">cd SimConnectBridge</code>
                  </li>
                  <li>{t('modals.bridge.installStep3')}<br/>
                    <code className="code-box-inline">dotnet build</code>
                  </li>
                  <li>{t('modals.bridge.installStep4')}<br/>
                    <code className="code-box-inline">dotnet run</code>
                  </li>
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
        <div className="detail-container">
          <FlightInfo
            simData={simData}
            isConnected={isConnected}
            flightRoute={flightRoute}
            onFlightRouteChange={handleFlightRouteChange}
          />
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      </div>

      {showAircraftModal && (
        <div className="modal-overlay" onClick={() => setShowAircraftModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✈</div>
            <h2 className="modal-title">{t('modals.aircraft.title')}</h2>
            <p className="modal-text">{t('modals.aircraft.text')}</p>
            <button className="modal-close" onClick={() => setShowAircraftModal(false)}>
              {t('common.ok')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
