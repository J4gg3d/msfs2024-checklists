import './SimStatus.css';

function SimStatus({ isConnected, simData, isDemoMode, onConnect, onDisconnect }) {
  const getStatusLabel = () => {
    if (!isConnected) return 'MSFS DISCONNECTED';
    if (isDemoMode) return 'DEMO MODE';
    return 'MSFS CONNECTED';
  };

  return (
    <div className={`sim-status ${isDemoMode ? 'demo-mode' : ''}`}>
      <div className="sim-status-header">
        <div className={`sim-indicator ${isConnected ? 'connected' : ''} ${isDemoMode ? 'demo' : ''}`} />
        <span className="sim-label">{getStatusLabel()}</span>
      </div>

      {isConnected && simData && (
        <div className="sim-data">
          <div className="sim-data-item">
            <span className="sim-data-label">SIM RATE</span>
            <span className="sim-data-value">{simData.simRate}x</span>
          </div>
          {simData.paused && (
            <div className="sim-paused-badge">PAUSED</div>
          )}
        </div>
      )}

      <button
        className={`sim-button ${isConnected ? 'disconnect' : 'connect'}`}
        onClick={isConnected ? onDisconnect : onConnect}
      >
        {isConnected ? 'DISCONNECT' : 'CONNECT'}
      </button>

      {!isConnected && (
        <p className="sim-hint">
          Startet Demo-Modus wenn kein Server läuft
        </p>
      )}
    </div>
  );
}

export default SimStatus;
