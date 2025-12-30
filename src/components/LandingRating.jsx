import { useState, useEffect } from 'react';
import './LandingRating.css';

/**
 * Rating-Farben und Labels
 */
const RATINGS = {
  5: { label: 'Perfect', color: '#00e676' },
  4: { label: 'Good', color: '#4fc3f7' },
  3: { label: 'Acceptable', color: '#ffa726' },
  2: { label: 'Hard', color: '#ef5350' },
  1: { label: 'Very Hard', color: '#d32f2f' },
};

/**
 * Sterne-Anzeige Komponente
 */
function StarRating({ score, color }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`star ${i <= score ? 'filled' : 'empty'}`}
        style={{ color: i <= score ? color : '#333' }}
      >
        ★
      </span>
    );
  }
  return <div className="star-rating">{stars}</div>;
}

/**
 * Formatiert den Zeitstempel
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Landing-Modal das nach einer Landung erscheint
 */
export function LandingModal({ landing, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (landing) {
      // Animation starten
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [landing]);

  if (!landing) return null;

  const rating = RATINGS[landing.ratingScore] || RATINGS[3];

  return (
    <div className={`landing-modal-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}>
      <div className="landing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="landing-modal-header" style={{ borderColor: rating.color }}>
          <StarRating score={landing.ratingScore} color={rating.color} />
          <h2 style={{ color: rating.color }}>{landing.rating}</h2>
        </div>

        <div className="landing-modal-stats">
          <div className="landing-stat">
            <span className="landing-stat-label">Vertical Speed</span>
            <span className="landing-stat-value">{Math.abs(landing.verticalSpeed).toFixed(0)} ft/min</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-label">G-Force</span>
            <span className="landing-stat-value">{landing.gForce?.toFixed(2) || '-'} G</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-label">Ground Speed</span>
            <span className="landing-stat-value">{landing.groundSpeed?.toFixed(0) || '-'} kts</span>
          </div>
        </div>

        {landing.airport && (
          <div className="landing-airport">
            <span>{landing.airport}</span>
          </div>
        )}

        <button className="landing-modal-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

/**
 * Landing-Panel das die Historie anzeigt
 */
export function LandingPanel({ history, isExpanded, onToggle }) {
  if (!history || history.length === 0) {
    return null;
  }

  const latestLanding = history[0];
  const latestRating = RATINGS[latestLanding?.ratingScore] || RATINGS[3];

  return (
    <div className={`landing-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="landing-panel-header" onClick={onToggle}>
        <span className="landing-panel-icon">LANDING</span>
        <span className="landing-panel-latest" style={{ color: latestRating.color }}>
          {latestLanding?.rating} ({Math.abs(latestLanding?.verticalSpeed || 0).toFixed(0)} ft/min)
        </span>
        <span className="landing-panel-toggle">{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <div className="landing-panel-history">
          {history.map((landing, index) => {
            const r = RATINGS[landing.ratingScore] || RATINGS[3];
            return (
              <div key={index} className="landing-history-item">
                <span className="landing-history-time">{formatTime(landing.timestamp)}</span>
                <span className="landing-history-rating" style={{ color: r.color }}>
                  {landing.rating}
                </span>
                <span className="landing-history-vs">
                  {Math.abs(landing.verticalSpeed).toFixed(0)} ft/min
                </span>
                <span className="landing-history-g">
                  {landing.gForce?.toFixed(2) || '-'} G
                </span>
                {landing.airport && (
                  <span className="landing-history-airport">{landing.airport}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
