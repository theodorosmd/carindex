const STORAGE_KEY = 'carindex_lang'

const translations = {
  en: {
    common: {
      appName: 'Carindex',
      search: 'Search',
      dashboard: 'Dashboard',
      admin: 'Admin',
      marketInsights: 'Market Insights',
      evaluations: 'Evaluations',
      calculator: 'Calculator',
      logout: 'Logout',
      login: 'Login',
      signup: 'Sign up',
      loading: 'Loading...',
      errorLoading: 'Error loading',
      retry: 'Retry',
      back: 'Back',
      view: 'View',
      viewAllInsights: 'View all insights →',
      allCountries: 'All countries',
      countryFrance: 'France',
      countrySweden: 'Sweden',
      countryGermany: 'Germany',
      countrySpain: 'Spain',
      countryItaly: 'Italy',
      countryBelgium: 'Belgium',
      countryNetherlands: 'Netherlands',
      countryAustria: 'Austria',
      countrySwitzerland: 'Switzerland'
    },
    language: {
      label: 'Language',
      english: 'English',
      french: 'Français'
    }
  },
  fr: {
    common: {
      appName: 'Carindex',
      search: 'Rechercher',
      dashboard: 'Dashboard',
      admin: 'Admin',
      marketInsights: 'Market Insights',
      evaluations: 'Évaluations',
      calculator: 'Calculateur',
      logout: 'Déconnexion',
      login: 'Connexion',
      signup: 'Inscription',
      loading: 'Chargement...',
      errorLoading: 'Erreur lors du chargement',
      retry: 'Réessayer',
      back: 'Retour',
      view: 'Voir',
      viewAllInsights: 'Voir tous les insights →',
      allCountries: 'Tous les pays',
      countryFrance: 'France',
      countrySweden: 'Suède',
      countryGermany: 'Allemagne',
      countrySpain: 'Espagne',
      countryItaly: 'Italie',
      countryBelgium: 'Belgique',
      countryNetherlands: 'Pays-Bas',
      countryAustria: 'Autriche',
      countrySwitzerland: 'Suisse'
    },
    language: {
      label: 'Langue',
      english: 'English',
      french: 'Français'
    }
  }
}

export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'en'
}

export function setLang(lang) {
  const next = lang === 'fr' ? 'fr' : 'en'
  localStorage.setItem(STORAGE_KEY, next)
  document.documentElement.lang = next
  return next
}

export function t(key, params = {}) {
  const lang = getLang()
  const [group, name] = key.split('.')
  const value =
    translations?.[lang]?.[group]?.[name] ??
    translations?.fr?.[group]?.[name] ??
    key

  if (typeof value !== 'string') return value
  return Object.entries(params).reduce(
    (acc, [paramKey, paramValue]) => acc.replaceAll(`{${paramKey}}`, String(paramValue)),
    value
  )
}

export function tr(enText, frText) {
  const lang = getLang()
  return lang === 'fr' ? frText : enText
}

export function toggleLang() {
  const current = getLang()
  return setLang(current === 'fr' ? 'en' : 'fr')
}

export function formatNumber(value) {
  const lang = getLang()
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(value)
}

export function formatCurrency(value, currency = 'EUR') {
  const lang = getLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDate(value) {
  if (!value) return ''
  const lang = getLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(value).toLocaleDateString(locale)
}

export function capitalize(str) {
  if (!str) return ''
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function renderLanguageToggle() {
  const lang = getLang()
  const label = t('language.label')
  const englishLabel = t('language.english')
  const frenchLabel = t('language.french')
  return `
    <div class="flex items-center">
      <select id="lang-toggle" class="text-xs border border-gray-300 rounded px-2 py-1">
        <option value="en" ${lang === 'en' ? 'selected' : ''}>${englishLabel}</option>
        <option value="fr" ${lang === 'fr' ? 'selected' : ''}>${frenchLabel}</option>
      </select>
    </div>
  `
}

export function attachLanguageToggle(onChange) {
  // querySelectorAll handles multiple #lang-toggle elements (desktop nav + mobile menu)
  // getElementById only finds the first, leaving mobile menu toggle without a listener
  const selects = document.querySelectorAll('[id="lang-toggle"]')
  if (!selects || selects.length === 0) return
  selects.forEach(select => {
    select.addEventListener('change', (event) => {
      const nextLang = event.target.value
      setLang(nextLang)
      if (typeof onChange === 'function') onChange(nextLang)
    })
  })
}
