import { useState, useMemo } from 'react';
import './FlightInfo.css';

function FlightInfo({ simData, isConnected, flightRoute, onFlightRouteChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDistance, setEditDistance] = useState('');

  // Daten aus simData extrahieren (falls verbunden)
  const {
    atcId = null,
    atcAirline = null,
    atcFlightNumber = null,
    gpsWpNextId = null,
    gpsWpPrevId = null,
    gpsFlightPlanWpIndex = 0,
    gpsFlightPlanWpCount = 0,
    gpsWpDistance = 0,
    gpsWpEte = 0,
    gpsEte = 0,
    gpsIsActiveFlightPlan = false,
    gpsFlightPlanTotalDistance = 0,
    gpsApproachAirportId = null,
    altitude = null,
    groundSpeed = null,
  } = simData || {};

  // Formatiere ETE in HH:MM
  const formatEte = (seconds) => {
    if (!seconds || seconds <= 0) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Callsign zusammenbauen
  const callsign = atcId || (atcAirline && atcFlightNumber ? `${atcAirline}${atcFlightNumber}` : null);

  // Effektive Route: GPS-Daten haben Vorrang, wenn verfügbar
  const effectiveDestination = gpsApproachAirportId || flightRoute?.destination;
  const effectiveOrigin = flightRoute?.origin; // Abflughafen nur aus manueller Eingabe
  const effectiveTotalDistance = gpsFlightPlanTotalDistance > 0
    ? gpsFlightPlanTotalDistance
    : (flightRoute?.totalDistance || 0);

  // GPS-basierte ETE formatieren
  const gpsEteFormatted = formatEte(gpsEte);

  // Fortschritt berechnen basierend auf geflogener Distanz
  const progress = useMemo(() => {
    const totalDist = flightRoute?.totalDistance || 0;
    const flownDist = flightRoute?.flownDistance || 0;
    if (totalDist <= 0) return 0;
    return Math.min(100, Math.max(0, (flownDist / totalDist) * 100));
  }, [flightRoute?.totalDistance, flightRoute?.flownDistance]);

  // Verbleibende Distanz
  const remainingDistance = useMemo(() => {
    const totalDist = flightRoute?.totalDistance || 0;
    const flownDist = flightRoute?.flownDistance || 0;
    return Math.max(0, totalDist - flownDist);
  }, [flightRoute?.totalDistance, flightRoute?.flownDistance]);

  // ETE berechnen (wenn groundSpeed vorhanden)
  const estimatedEte = useMemo(() => {
    if (!groundSpeed || groundSpeed <= 0 || remainingDistance <= 0) return null;
    const hours = remainingDistance / groundSpeed;
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [groundSpeed, remainingDistance]);

  // Edit-Modus starten
  const handleStartEdit = () => {
    setEditOrigin(flightRoute?.origin || '');
    setEditDestination(flightRoute?.destination || '');
    setEditDistance(flightRoute?.totalDistance?.toString() || '');
    setIsEditing(true);
  };

  // Speichern
  const handleSave = () => {
    onFlightRouteChange?.({
      origin: editOrigin.toUpperCase().trim(),
      destination: editDestination.toUpperCase().trim(),
      totalDistance: parseFloat(editDistance) || 0,
      flownDistance: flightRoute?.flownDistance || 0
    });
    setIsEditing(false);
  };

  // Abbrechen
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Enter-Taste zum Speichern
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flight-info">
      {/* Flugnummer / Callsign */}
      <div className="flight-info-header">
        <span className={`flight-callsign ${!isConnected ? 'flight-callsign-offline' : ''}`}>
          {isConnected
            ? (callsign || 'VERBUNDEN')
            : 'OFFLINE'}
        </span>
        {isConnected && gpsFlightPlanWpCount > 0 && (
          <span className="flight-progress">WP {gpsFlightPlanWpIndex + 1}/{gpsFlightPlanWpCount}</span>
        )}
      </div>

      {/* Route Eingabe/Anzeige */}
      <div className="flight-route-section">
        {isEditing ? (
          <div className="route-edit-form">
            <div className="route-edit-inputs">
              <div className="route-input-group">
                <label>FROM</label>
                <input
                  type="text"
                  value={editOrigin}
                  onChange={(e) => setEditOrigin(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ICAO"
                  maxLength={4}
                  autoFocus
                />
              </div>
              <span className="route-arrow-edit">→</span>
              <div className="route-input-group">
                <label>TO</label>
                <input
                  type="text"
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ICAO"
                  maxLength={4}
                />
              </div>
              <div className="route-input-group route-input-distance">
                <label>DIST (NM)</label>
                <input
                  type="number"
                  value={editDistance}
                  onChange={(e) => setEditDistance(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="route-edit-buttons">
              <button className="route-btn route-btn-save" onClick={handleSave}>OK</button>
              <button className="route-btn route-btn-cancel" onClick={handleCancel}>X</button>
            </div>
          </div>
        ) : (
          <div className="route-display-container" onClick={handleStartEdit}>
            {effectiveOrigin || effectiveDestination ? (
              <>
                <div className="route-airports">
                  <span className="route-airport route-origin">{effectiveOrigin || '????'}</span>
                  <span className="route-airport route-destination">{effectiveDestination || '????'}</span>
                </div>
                <div className="route-progress-container">
                  <div className="route-progress-line">
                    <div className="route-progress-fill" style={{ width: `${progress}%` }}></div>
                    <div className="route-plane-icon" style={{ left: `${progress}%` }}>✈</div>
                  </div>
                </div>
                {effectiveTotalDistance > 0 && (
                  <div className="route-distance-info">
                    <span className="route-flown">{Math.round(flightRoute?.flownDistance || 0)} NM</span>
                    <span className="route-total">{Math.round(effectiveTotalDistance)} NM</span>
                  </div>
                )}
              </>
            ) : (
              <span className="route-placeholder">Route eingeben...</span>
            )}
            <span className="route-edit-hint">✎</span>
          </div>
        )}
      </div>

      {/* Next Waypoint (wenn verbunden) */}
      {isConnected && gpsWpNextId && (
        <div className="flight-info-next-wp">
          <span className="next-wp-label">NEXT</span>
          <span className="next-wp-id">{gpsWpNextId}</span>
          {gpsWpDistance > 0 && (
            <span className="next-wp-dist">{gpsWpDistance} NM</span>
          )}
        </div>
      )}

      {/* Flugdaten Grid */}
      <div className="flight-info-grid">
        <div className="flight-data-item">
          <span className="data-label">REM</span>
          <span className="data-value">{remainingDistance > 0 ? Math.round(remainingDistance) : '--'}</span>
        </div>
        <div className="flight-data-item">
          <span className="data-label">ETE</span>
          <span className="data-value">
            {isConnected && gpsEte > 0 ? gpsEteFormatted : (estimatedEte || '--:--')}
          </span>
        </div>
        <div className="flight-data-item">
          <span className="data-label">ALT</span>
          <span className="data-value">{isConnected && altitude != null ? `${Math.round(altitude)}` : '--'}</span>
        </div>
        <div className="flight-data-item">
          <span className="data-label">GS</span>
          <span className="data-value">{isConnected && groundSpeed != null ? `${Math.round(groundSpeed)}` : '--'}</span>
        </div>
      </div>
    </div>
  );
}

export default FlightInfo;
