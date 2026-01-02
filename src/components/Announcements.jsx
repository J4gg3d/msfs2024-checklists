import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getAnnouncements } from '../lib/supabase'
import './Announcements.css'

const DISMISSED_KEY = 'msfs-dismissed-announcements'

const Announcements = () => {
  const { i18n } = useTranslation()
  const [announcements, setAnnouncements] = useState([])
  const [dismissedIds, setDismissedIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load dismissed announcements from localStorage
    try {
      const stored = localStorage.getItem(DISMISSED_KEY)
      if (stored) {
        setDismissedIds(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading dismissed announcements:', e)
    }

    loadAnnouncements()

    // Refresh announcements every 5 minutes
    const interval = setInterval(loadAnnouncements, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await getAnnouncements()
      if (!error && data) {
        setAnnouncements(data)
      }
    } catch (err) {
      console.error('Error loading announcements:', err)
    }
    setLoading(false)
  }

  const getMessage = (announcement) => {
    const lang = i18n.language?.startsWith('de') ? 'de' : 'en'
    return lang === 'de' ? announcement.message_de : announcement.message_en
  }

  const dismissBanner = (id) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissed))
    } catch (e) {
      console.error('Error saving dismissed announcements:', e)
    }
  }

  if (loading || announcements.length === 0) {
    return null
  }

  // Filter announcements by display mode
  const tickerAnnouncements = announcements.filter(
    a => a.display_mode === 'ticker' || a.display_mode === 'both'
  )
  const bannerAnnouncements = announcements.filter(
    a => (a.display_mode === 'banner' || a.display_mode === 'both') && !dismissedIds.includes(a.id)
  )

  return (
    <>
      {/* Ticker - scrolling announcements */}
      {tickerAnnouncements.length > 0 && (
        <div className="announcement-ticker">
          <div className="ticker-content">
            {tickerAnnouncements.map((announcement, index) => (
              <span key={announcement.id} className={`ticker-item ticker-${announcement.type}`}>
                {announcement.type === 'important' && <span className="ticker-icon">!</span>}
                {announcement.type === 'warning' && <span className="ticker-icon">!</span>}
                {announcement.type === 'info' && <span className="ticker-icon">i</span>}
                {getMessage(announcement)}
                {index < tickerAnnouncements.length - 1 && <span className="ticker-separator">•</span>}
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {tickerAnnouncements.map((announcement, index) => (
              <span key={`dup-${announcement.id}`} className={`ticker-item ticker-${announcement.type}`}>
                {announcement.type === 'important' && <span className="ticker-icon">!</span>}
                {announcement.type === 'warning' && <span className="ticker-icon">!</span>}
                {announcement.type === 'info' && <span className="ticker-icon">i</span>}
                {getMessage(announcement)}
                {index < tickerAnnouncements.length - 1 && <span className="ticker-separator">•</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Banners - dismissable announcements */}
      {bannerAnnouncements.map(announcement => (
        <div
          key={announcement.id}
          className={`announcement-banner banner-${announcement.type}`}
        >
          <div className="banner-content">
            <span className="banner-icon">
              {announcement.type === 'important' && '!'}
              {announcement.type === 'warning' && '!'}
              {announcement.type === 'info' && 'i'}
            </span>
            <span className="banner-message">{getMessage(announcement)}</span>
            <button
              className="banner-dismiss"
              onClick={() => dismissBanner(announcement.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

export default Announcements
