import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import './SimFlyCorpLanding.css'

const SimFlyCorpLanding = ({ onBack, onLogin, onProfile, onLeaderboard, onAirline }) => {
  const { t } = useTranslation()
  const { isAuthenticated, profile } = useAuth()

  const features = [
    {
      icon: '👨‍✈️',
      title: 'Pilotenprofil',
      titleEn: 'Pilot Profile',
      desc: 'Erstelle dein persönliches Pilotenprofil mit Statistiken zu all deinen Flügen.',
      descEn: 'Create your personal pilot profile with statistics from all your flights.'
    },
    {
      icon: '📊',
      title: 'Flugstatistiken',
      titleEn: 'Flight Statistics',
      desc: 'Verfolge deine Gesamtflugzeit, Distanz, Anzahl der Flüge und deinen Score.',
      descEn: 'Track your total flight time, distance, number of flights, and your score.'
    },
    {
      icon: '✈️',
      title: 'Automatisches Fluglog',
      titleEn: 'Automatic Flight Log',
      desc: 'Jeder Flug wird automatisch aufgezeichnet - Start, Ziel, Dauer und Landing-Rating.',
      descEn: 'Every flight is automatically logged - origin, destination, duration, and landing rating.'
    },
    {
      icon: '🎯',
      title: 'Landing-Bewertung',
      titleEn: 'Landing Rating',
      desc: 'Erhalte 1-5 Sterne für jede Landung basierend auf Sinkrate und G-Kräften.',
      descEn: 'Receive 1-5 stars for each landing based on descent rate and G-forces.'
    },
    {
      icon: '🏆',
      title: 'Rangliste',
      titleEn: 'Leaderboard',
      desc: 'Vergleiche dich mit anderen Piloten - wer hat die meisten Punkte, längste Flugzeit oder meisten Flüge?',
      descEn: 'Compare yourself with other pilots - who has the most points, longest flight time, or most flights?'
    },
    {
      icon: '🏢',
      title: 'Virtuelle Airlines',
      titleEn: 'Virtual Airlines',
      desc: 'Gründe deine eigene Airline oder tritt einer bestehenden bei. Fliege gemeinsam mit anderen Piloten.',
      descEn: 'Start your own airline or join an existing one. Fly together with other pilots.'
    },
    {
      icon: '🏠',
      title: 'Homebase',
      titleEn: 'Homebase',
      desc: 'Setze deinen Heimatflughafen und zeige anderen wo du stationiert bist.',
      descEn: 'Set your home airport and show others where you are based.'
    },
    {
      icon: '🔗',
      title: 'SimConnect Bridge',
      titleEn: 'SimConnect Bridge',
      desc: 'Verbinde MSFS 2024 mit SimChecklist für automatische Flugaufzeichnung und Live-Daten.',
      descEn: 'Connect MSFS 2024 with SimChecklist for automatic flight logging and live data.'
    }
  ]

  const isGerman = useTranslation().i18n.language?.startsWith('de')

  return (
    <div className="simflycorp-landing">
      {/* Header */}
      <header className="landing-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <div className="landing-logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">SimFlyCorp</span>
        </div>
        <div className="header-spacer"></div>
      </header>

      <div className="landing-content">
        {/* Hero Section */}
        <div className="landing-hero">
          <h1>{isGerman ? 'Was ist SimFlyCorp?' : 'What is SimFlyCorp?'}</h1>
          <p className="hero-subtitle">
            {isGerman
              ? 'Dein virtuelles Piloten-Netzwerk für Microsoft Flight Simulator 2024'
              : 'Your virtual pilot network for Microsoft Flight Simulator 2024'
            }
          </p>
          <p className="hero-description">
            {isGerman
              ? 'SimFlyCorp erweitert SimChecklist um ein vollständiges Piloten-Ökosystem. Tracke deine Flüge, sammle Punkte, gründe Airlines und vergleiche dich mit Piloten weltweit.'
              : 'SimFlyCorp extends SimChecklist with a complete pilot ecosystem. Track your flights, earn points, start airlines, and compare yourself with pilots worldwide.'
            }
          </p>
        </div>

        {/* Features Grid */}
        <div className="features-section">
          <h2>{isGerman ? 'Features' : 'Features'}</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <span className="feature-icon">{feature.icon}</span>
                <h3>{isGerman ? feature.title : feature.titleEn}</h3>
                <p>{isGerman ? feature.desc : feature.descEn}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="how-it-works-section">
          <h2>{isGerman ? 'So funktioniert\'s' : 'How it works'}</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{isGerman ? 'Account erstellen' : 'Create Account'}</h3>
                <p>{isGerman
                  ? 'Registriere dich kostenlos und erstelle dein Pilotenprofil.'
                  : 'Register for free and create your pilot profile.'
                }</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{isGerman ? 'Bridge installieren' : 'Install Bridge'}</h3>
                <p>{isGerman
                  ? 'Lade die SimConnect Bridge herunter und verbinde MSFS 2024.'
                  : 'Download the SimConnect Bridge and connect MSFS 2024.'
                }</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{isGerman ? 'Fliegen & Punkte sammeln' : 'Fly & Earn Points'}</h3>
                <p>{isGerman
                  ? 'Jeder Flug wird automatisch getrackt und bewertet.'
                  : 'Every flight is automatically tracked and rated.'
                }</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          {isAuthenticated ? (
            <>
              <p className="cta-welcome">
                {isGerman
                  ? `Willkommen zurück, ${profile?.display_name || 'Pilot'}!`
                  : `Welcome back, ${profile?.display_name || 'Pilot'}!`
                }
              </p>
              <div className="cta-buttons">
                <button className="cta-button primary" onClick={onProfile}>
                  <span>📊</span> {isGerman ? 'Mein Profil' : 'My Profile'}
                </button>
                <button className="cta-button secondary" onClick={onLeaderboard}>
                  <span>🏆</span> {isGerman ? 'Rangliste' : 'Leaderboard'}
                </button>
                <button className="cta-button secondary" onClick={onAirline}>
                  <span>🏢</span> {isGerman ? 'Airlines' : 'Airlines'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="cta-text">
                {isGerman
                  ? 'Bereit durchzustarten? Erstelle jetzt dein kostenloses Pilotenprofil!'
                  : 'Ready to take off? Create your free pilot profile now!'
                }
              </p>
              <div className="cta-buttons">
                <button className="cta-button primary" onClick={onLogin}>
                  <span>🚀</span> {isGerman ? 'Jetzt registrieren' : 'Register now'}
                </button>
                <button className="cta-button secondary" onClick={onLeaderboard}>
                  <span>🏆</span> {isGerman ? 'Rangliste ansehen' : 'View Leaderboard'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimFlyCorpLanding
