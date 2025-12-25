import { useEffect, useRef } from 'react';
import ChecklistItem from './ChecklistItem';
import './ChecklistSection.css';

function ChecklistSection({ sectionId, title, color, items, checkedItems, selectedItemId, isCollapsed, onItemToggle, onItemSelect, onSectionToggle, checkAutoStatus, isSimConnected }) {
  const prevAllCheckedRef = useRef(false);

  // Prüfen ob alle Items gecheckt sind
  const allChecked = items.length > 0 && items.every(item => checkedItems.has(item.id));
  const checkedCount = items.filter(item => checkedItems.has(item.id)).length;

  // Automatisch einklappen wenn alle Items gecheckt werden
  useEffect(() => {
    if (allChecked && !prevAllCheckedRef.current && !isCollapsed) {
      onSectionToggle(sectionId);
    }
    prevAllCheckedRef.current = allChecked;
  }, [allChecked, isCollapsed, sectionId, onSectionToggle]);

  return (
    <div className={`checklist-section ${isCollapsed ? 'collapsed' : ''} ${allChecked ? 'completed' : ''}`}>
      <div
        className="section-header"
        style={{ borderLeftColor: color }}
        onClick={() => onSectionToggle(sectionId)}
      >
        <h2 className="section-title">{title}</h2>
        <div className="section-status">
          <span className="section-count">{checkedCount}/{items.length}</span>
          <span className={`section-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
        </div>
      </div>
      {!isCollapsed && (
        <div className="section-items">
          {items.map((item) => {
            // Berechne autoStatus wenn Item autoCheck hat und SimConnect verbunden
            const autoStatus = item.autoCheck && isSimConnected && checkAutoStatus
              ? checkAutoStatus(item.autoCheck)
              : null;

            return (
              <ChecklistItem
                key={item.id}
                item={item.item}
                action={item.action}
                checked={checkedItems.has(item.id)}
                isSelected={selectedItemId === item.id}
                autoStatus={autoStatus}
                onToggle={() => onItemToggle(item.id)}
                onSelect={() => onItemSelect(item)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChecklistSection;
