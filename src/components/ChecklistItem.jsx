import './ChecklistItem.css';

function ChecklistItem({ item, action, checked, isSelected, autoStatus, onToggle, onSelect }) {
  // autoStatus: { status: 'ok' | 'fail' | 'unknown', value: any } | null

  return (
    <div className={`checklist-item ${checked ? 'checked' : ''} ${isSelected ? 'selected' : ''}`}>
      {/* Auto-Check Indikator */}
      {autoStatus && (
        <span
          className={`auto-status auto-status-${autoStatus.status}`}
          title={
            autoStatus.status === 'ok'
              ? 'Status korrekt'
              : autoStatus.status === 'fail'
              ? 'Status nicht korrekt'
              : 'Status unbekannt'
          }
        >
          {autoStatus.status === 'ok' && '●'}
          {autoStatus.status === 'fail' && '●'}
          {autoStatus.status === 'unknown' && '○'}
        </span>
      )}

      <span
        className="item-checkbox"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="item-content" onClick={onToggle}>
        <span className="item-name">{item}</span>
        <span className="item-dots"></span>
        <span className="item-action">{action}</span>
      </span>
      <button
        className="item-info-btn"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        title="Details anzeigen"
      >
        i
      </button>
    </div>
  );
}

export default ChecklistItem;
