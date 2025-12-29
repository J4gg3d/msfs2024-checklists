import './DetailPanel.css';

function DetailPanel({ item, onClose }) {
  if (!item) {
    return (
      <div className="detail-panel empty">
        <div className="detail-placeholder">
          <div className="detail-placeholder-icon">←</div>
          <p className="detail-placeholder-text">
            Klicke auf einen Checklistenpunkt um Details zu sehen
          </p>
        </div>
      </div>
    );
  }

  const { item: itemName, action, details } = item;

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h2 className="detail-title">{itemName}</h2>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-action">
        <span className="detail-action-label">ACTION:</span>
        <span className="detail-action-value">{action}</span>
      </div>

      {details ? (
        <div className="detail-content">
          {details.location && (
            <div className="detail-location">
              <span className="detail-location-icon">📍</span>
              <span className="detail-location-text">{details.location}</span>
            </div>
          )}

          {details.description && (
            <div className="detail-section">
              <h3 className="detail-section-title">Beschreibung</h3>
              <p className="detail-description">{details.description}</p>
            </div>
          )}

          {details.steps && details.steps.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section-title">Schritte</h3>
              <ol className="detail-steps">
                {details.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {details.notes && (
            <div className="detail-section">
              <h3 className="detail-section-title">Hinweise</h3>
              <p className="detail-notes">{details.notes}</p>
            </div>
          )}

          {(details.image || details.image2) && (
            <div className="detail-section">
              <h3 className="detail-section-title">{details.image2 ? 'Bilder' : 'Bild'}</h3>
              {details.image && (
                <img
                  src={details.image}
                  alt={itemName}
                  className="detail-image"
                />
              )}
              {details.image2 && (
                <img
                  src={details.image2}
                  alt={`${itemName} (2)`}
                  className="detail-image"
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="detail-no-info">
          <p>Keine weiteren Informationen verfügbar.</p>
          <p className="detail-no-info-hint">
            Details können in der JSON-Datei hinzugefügt werden.
          </p>
        </div>
      )}
    </div>
  );
}

export default DetailPanel;
