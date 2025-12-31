import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './AuthModal.css'

const AuthModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login') // 'login' oder 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const { signIn, signUp } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          onClose()
        }
      } else {
        if (!username.trim()) {
          setError('Bitte gib einen Benutzernamen ein')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, username)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Registrierung erfolgreich! Bitte bestätige deine E-Mail.')
        }
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
    }

    setLoading(false)
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setSuccess('')
  }

  const handleOverlayClick = (e) => {
    // Only close if clicking directly on overlay, not on modal content
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="auth-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>

        <h2>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</h2>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dein Piloten-Name"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              required
            />
          </div>

          <div className="auth-field">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Laden...' : (mode === 'login' ? 'Anmelden' : 'Registrieren')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <span>Noch kein Konto? <button onClick={toggleMode}>Registrieren</button></span>
          ) : (
            <span>Bereits registriert? <button onClick={toggleMode}>Anmelden</button></span>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
