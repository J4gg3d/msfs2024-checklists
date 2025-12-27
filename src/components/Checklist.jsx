import ChecklistSection from './ChecklistSection';
import './Checklist.css';

function Checklist({ data, checkedItems, collapsedSections, selectedItemId, onItemToggle, onItemSelect, onSectionToggle, onAircraftChange, simStatusComponent, isCareerMode, onCareerModeToggle, checkAutoStatus, isSimConnected, canToggleMode = true }) {
  return (
    <div className="checklist">
      <header className="checklist-header">
        <div className="header-top">
          <button className="aircraft-selector" onClick={onAircraftChange}>
            <span className="aircraft-selector-label">AIRCRAFT</span>
            <span className="aircraft-selector-value">{data.aircraft}</span>
            <span className="aircraft-selector-icon">▼</span>
          </button>
          {simStatusComponent && (
            <div className="sim-status-wrapper">
              {simStatusComponent}
            </div>
          )}
        </div>
        <div className={`mode-toggle-container ${!canToggleMode ? 'disabled' : ''}`}>
          <span className={`mode-label ${!isCareerMode ? 'active' : ''} ${!canToggleMode && isCareerMode ? 'unavailable' : ''}`}>NORMAL</span>
          <button
            className={`mode-toggle ${isCareerMode ? 'career' : ''}`}
            onClick={canToggleMode ? onCareerModeToggle : undefined}
            disabled={!canToggleMode}
            title={!canToggleMode ? 'Dieses Flugzeug unterstützt nur einen Modus' : (isCareerMode ? 'Zur Normal-Checkliste wechseln' : 'Zur Karriere-Checkliste wechseln')}
          >
            <span className="mode-toggle-slider"></span>
          </button>
          <span className={`mode-label ${isCareerMode ? 'active' : ''} ${!canToggleMode && !isCareerMode ? 'unavailable' : ''}`}>KARRIERE</span>
        </div>
        <p className="checklist-subtitle">
          {isCareerMode ? 'MSFS 2024 KARRIERE CHECKLISTE' : 'NORMAL PROCEDURES CHECKLIST'}
        </p>
      </header>
      <div className="checklist-sections">
        {data.sections.map((section) => (
          <ChecklistSection
            key={section.id}
            sectionId={section.id}
            title={section.title}
            color={section.color}
            items={section.items}
            checkedItems={checkedItems}
            selectedItemId={selectedItemId}
            isCollapsed={collapsedSections.has(section.id)}
            onItemToggle={onItemToggle}
            onItemSelect={onItemSelect}
            onSectionToggle={onSectionToggle}
            checkAutoStatus={checkAutoStatus}
            isSimConnected={isSimConnected}
          />
        ))}
      </div>
    </div>
  );
}

export default Checklist;
