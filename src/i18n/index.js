import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// UI Translations
import de from './locales/de/translation.json'
import en from './locales/en/translation.json'

const STORAGE_KEY = 'msfs-checklist-language'

// Get saved language or detect from browser
const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && ['de', 'en'].includes(saved)) {
      return saved
    }
  } catch (e) {
    console.warn('Could not load language preference:', e)
  }

  // Detect from browser
  const browserLang = navigator.language?.split('-')[0]
  return ['de', 'en'].includes(browserLang) ? browserLang : 'de'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en }
    },
    lng: getSavedLanguage(),
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false // React already escapes
    }
  })

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch (e) {
    console.warn('Could not save language preference:', e)
  }
})

export default i18n
