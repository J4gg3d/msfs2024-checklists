import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Import all checklist files statically for Vite bundling
// A330
import deA330Normal from '../data/de/a330-normal.json'
import deA330Career from '../data/de/a330-career.json'
import enA330Normal from '../data/en/a330-normal.json'
import enA330Career from '../data/en/a330-career.json'
// PC-12 NGX
import dePC12Career from '../data/de/pc12-career.json'
import enPC12Career from '../data/en/pc12-career.json'

// Checklist registry - easy to extend with new aircraft
const checklists = {
  de: {
    'a330-normal': deA330Normal,
    'a330-career': deA330Career,
    'pc12-career': dePC12Career
  },
  en: {
    'a330-normal': enA330Normal,
    'a330-career': enA330Career,
    'pc12-career': enPC12Career
  }
}

// Available aircraft for UI
export const availableAircraft = [
  { id: 'a330', name: 'Airbus A330-200', hasNormal: true, hasCareer: true },
  { id: 'pc12', name: 'Pilatus PC-12 NGX', hasNormal: false, hasCareer: true }
]

/**
 * Hook to get checklist data based on current language
 * @param {string} aircraft - Aircraft ID (e.g., 'a330')
 * @param {boolean} isCareerMode - Whether to load career or normal checklist
 * @returns {Object} Checklist data
 */
export function useChecklist(aircraft = 'a330', isCareerMode = false) {
  const { i18n } = useTranslation()
  const [checklistData, setChecklistData] = useState(null)

  useEffect(() => {
    const lang = i18n.language || 'de'
    const mode = isCareerMode ? 'career' : 'normal'
    const checklistKey = `${aircraft}-${mode}`

    // Get checklist for current language, fallback to German
    const langChecklists = checklists[lang] || checklists['de']
    const data = langChecklists[checklistKey] || checklists['de'][checklistKey]

    setChecklistData(data)
  }, [i18n.language, aircraft, isCareerMode])

  return checklistData
}

export default useChecklist
