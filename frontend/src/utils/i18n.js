const STORAGE_KEY = 'carindex_lang'

// Used by t() for structured keys (language labels etc.)
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
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
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
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
    }
  },
  sv: {
    common: {
      appName: 'Carindex',
      search: 'Sök',
      dashboard: 'Dashboard',
      admin: 'Admin',
      marketInsights: 'Marknadsinsikter',
      evaluations: 'Utvärderingar',
      calculator: 'Kalkylator',
      logout: 'Logga ut',
      login: 'Logga in',
      signup: 'Registrera dig',
      loading: 'Laddar...',
      errorLoading: 'Fel vid laddning',
      retry: 'Försök igen',
      back: 'Tillbaka',
      view: 'Visa',
      viewAllInsights: 'Visa alla insikter →',
      allCountries: 'Alla länder',
      countryFrance: 'Frankrike',
      countrySweden: 'Sverige',
      countryGermany: 'Tyskland',
      countrySpain: 'Spanien',
      countryItaly: 'Italien',
      countryBelgium: 'Belgien',
      countryNetherlands: 'Nederländerna',
      countryAustria: 'Österrike',
      countrySwitzerland: 'Schweiz'
    },
    language: {
      label: 'Språk',
      english: 'English',
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
    }
  },
  de: {
    common: {
      appName: 'Carindex',
      search: 'Suchen',
      dashboard: 'Dashboard',
      admin: 'Admin',
      marketInsights: 'Markteinblicke',
      evaluations: 'Bewertungen',
      calculator: 'Kalkulator',
      logout: 'Abmelden',
      login: 'Anmelden',
      signup: 'Registrieren',
      loading: 'Laden...',
      errorLoading: 'Ladefehler',
      retry: 'Erneut versuchen',
      back: 'Zurück',
      view: 'Ansehen',
      viewAllInsights: 'Alle Einblicke ansehen →',
      allCountries: 'Alle Länder',
      countryFrance: 'Frankreich',
      countrySweden: 'Schweden',
      countryGermany: 'Deutschland',
      countrySpain: 'Spanien',
      countryItaly: 'Italien',
      countryBelgium: 'Belgien',
      countryNetherlands: 'Niederlande',
      countryAustria: 'Österreich',
      countrySwitzerland: 'Schweiz'
    },
    language: {
      label: 'Sprache',
      english: 'English',
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
    }
  },
  it: {
    common: {
      appName: 'Carindex',
      search: 'Cerca',
      dashboard: 'Dashboard',
      admin: 'Admin',
      marketInsights: 'Analisi di mercato',
      evaluations: 'Valutazioni',
      calculator: 'Calcolatore',
      logout: 'Esci',
      login: 'Accedi',
      signup: 'Registrati',
      loading: 'Caricamento...',
      errorLoading: 'Errore di caricamento',
      retry: 'Riprova',
      back: 'Indietro',
      view: 'Vedi',
      viewAllInsights: 'Vedi tutte le analisi →',
      allCountries: 'Tutti i paesi',
      countryFrance: 'Francia',
      countrySweden: 'Svezia',
      countryGermany: 'Germania',
      countrySpain: 'Spagna',
      countryItaly: 'Italia',
      countryBelgium: 'Belgio',
      countryNetherlands: 'Paesi Bassi',
      countryAustria: 'Austria',
      countrySwitzerland: 'Svizzera'
    },
    language: {
      label: 'Lingua',
      english: 'English',
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
    }
  },
  es: {
    common: {
      appName: 'Carindex',
      search: 'Buscar',
      dashboard: 'Panel',
      admin: 'Admin',
      marketInsights: 'Perspectivas del mercado',
      evaluations: 'Evaluaciones',
      calculator: 'Calculadora',
      logout: 'Cerrar sesión',
      login: 'Iniciar sesión',
      signup: 'Registrarse',
      loading: 'Cargando...',
      errorLoading: 'Error de carga',
      retry: 'Reintentar',
      back: 'Atrás',
      view: 'Ver',
      viewAllInsights: 'Ver todas las perspectivas →',
      allCountries: 'Todos los países',
      countryFrance: 'Francia',
      countrySweden: 'Suecia',
      countryGermany: 'Alemania',
      countrySpain: 'España',
      countryItaly: 'Italia',
      countryBelgium: 'Bélgica',
      countryNetherlands: 'Países Bajos',
      countryAustria: 'Austria',
      countrySwitzerland: 'Suiza'
    },
    language: {
      label: 'Idioma',
      english: 'English',
      french: 'Français',
      swedish: 'Svenska',
      german: 'Deutsch',
      italian: 'Italiano',
      spanish: 'Español'
    }
  }
}

// Translation maps for tr(en, fr) calls — no need to update call sites
// Falls back to English for any string not in the map
const svMap = {
  // Navigation
  'Home': 'Hem',
  'Search': 'Sök',
  'Features': 'Funktioner',
  'Pricing': 'Prissättning',
  'Dashboard': 'Dashboard',
  'Admin': 'Admin',
  'Logout': 'Logga ut',
  'Login': 'Logga in',
  'Sign up': 'Registrera dig',
  'Get started': 'Kom igång',
  // Search page
  'Filters': 'Filter',
  'Reset search': 'Återställ sökning',
  'Search for a vehicle': 'Sök fordon',
  'Search by brand, model, keyword...': 'Märke, modell, sökord...',
  'Browse millions of listings from leboncoin, mobile.de, AutoScout24': 'Bläddra bland miljontals annonser på leboncoin, mobile.de, AutoScout24',
  'listings found': 'annonser hittade',
  'Most recent': 'Senaste',
  'Price ascending': 'Pris stigande',
  'Price descending': 'Pris fallande',
  'Mileage ascending': 'Körsträcka stigande',
  'Updating...': 'Uppdaterar...',
  'Loading...': 'Laddar...',
  'View →': 'Visa →',
  'View': 'Visa',
  'Retry': 'Försök igen',
  'Previous': 'Föregående',
  'Next': 'Nästa',
  'No results found': 'Inga resultat hittades',
  'listings/page': 'annonser/sida',
  // Filters
  'COUNTRY': 'LAND',
  'BRAND': 'MÄRKE',
  'MODEL': 'MODELL',
  'FUEL TYPE': 'BRÄNSLE',
  'TRANSMISSION': 'VÄXELLÅDA',
  'STEERING': 'RATT',
  'YEAR': 'ÅR',
  'PRICE': 'PRIS',
  'MILEAGE': 'KÖRSTRÄCKA',
  'COLOR': 'FÄRG',
  'DOORS': 'DÖRRAR',
  'SELLER TYPE': 'SÄLJARE',
  'KEYWORD': 'SÖKORD',
  'PUBLICATION DATE': 'PUBLICERINGSDATUM',
  // Fuel types
  'DIESEL': 'DIESEL',
  'PETROL': 'BENSIN',
  'ELECTRIC': 'ELEKTRISK',
  'HYBRID': 'HYBRID',
  'PLUG-IN HYBRID': 'LADDHYBRID',
  'LPG': 'LPG',
  'CNG': 'CNG',
  // Transmission
  'AUTOMATIC': 'AUTOMATISK',
  'MANUAL': 'MANUELL',
  // Seller types
  'Private': 'Privat',
  'Professional': 'Professionell',
  'All': 'Alla',
  // Countries
  'All countries': 'Alla länder',
  'France': 'Frankrike',
  'Germany': 'Tyskland',
  'Sweden': 'Sverige',
  'Spain': 'Spanien',
  'Italy': 'Italien',
  'Belgium': 'Belgien',
  'Netherlands': 'Nederländerna',
  'Austria': 'Österrike',
  'Switzerland': 'Schweiz',
  // Listing details
  'Listing details': 'Annonsdetaljer',
  "Listing details": "Annonsdetaljer",
  'Close': 'Stäng',
  'View listing': 'Visa annons',
  'Price drop': 'Prissänkning',
  'Market price': 'Marknadspris',
  // Landing page
  'The European car market,<br>in one place': 'Den europeiska bilmarknaden,<br>på ett ställe',
  'Search millions of listings across Europe. Compare prices, track market trends, and make data-driven decisions.': 'Sök bland miljontals annonser i Europa. Jämför priser, följ marknadstrender och ta datadrivna beslut.',
  'Search vehicles': 'Sök fordon',
  'View pricing →': 'Visa priser →',
  'View pricing': 'Visa priser',
  '8.5M+ listings · leboncoin, mobile.de, AutoScout24': '8,5M+ annonser · leboncoin, mobile.de, AutoScout24',
  // Errors
  'Search error': 'Sökfel',
  'Something went wrong': 'Något gick fel',
  'Loading error': 'Laddningsfel',
  'Back to home': 'Tillbaka till start',
  'Back to dashboard': 'Tillbaka till dashboard',
  // Dashboard
  'Market Insights': 'Marknadsinsikter',
  'Evaluations': 'Utvärderingar',
  'Calculator': 'Kalkylator',
  'New evaluation': 'Ny utvärdering',
  'My evaluations': 'Mina utvärderingar',
  'Recently viewed': 'Nyligen visade',
  // Publication date
  'Recent (< 30 days)': 'Nyliga (< 30 dagar)',
  'Old (> 30 days)': 'Äldre (> 30 dagar)',
}

const deMap = {
  // Navigation
  'Home': 'Startseite',
  'Search': 'Suchen',
  'Features': 'Funktionen',
  'Pricing': 'Preise',
  'Dashboard': 'Dashboard',
  'Admin': 'Admin',
  'Logout': 'Abmelden',
  'Login': 'Anmelden',
  'Sign up': 'Registrieren',
  'Get started': 'Jetzt starten',
  // Search page
  'Filters': 'Filter',
  'Reset search': 'Suche zurücksetzen',
  'Search for a vehicle': 'Fahrzeug suchen',
  'Search by brand, model, keyword...': 'Marke, Modell, Stichwort...',
  'Browse millions of listings from leboncoin, mobile.de, AutoScout24': 'Millionen Inserate auf leboncoin, mobile.de, AutoScout24',
  'listings found': 'Inserate gefunden',
  'Most recent': 'Neueste',
  'Price ascending': 'Preis aufsteigend',
  'Price descending': 'Preis absteigend',
  'Mileage ascending': 'Kilometerstand aufsteigend',
  'Updating...': 'Aktualisierung...',
  'Loading...': 'Laden...',
  'View →': 'Ansehen →',
  'View': 'Ansehen',
  'Retry': 'Erneut versuchen',
  'Previous': 'Zurück',
  'Next': 'Weiter',
  'No results found': 'Keine Ergebnisse gefunden',
  'listings/page': 'Inserate/Seite',
  // Filters
  'COUNTRY': 'LAND',
  'BRAND': 'MARKE',
  'MODEL': 'MODELL',
  'FUEL TYPE': 'KRAFTSTOFF',
  'TRANSMISSION': 'GETRIEBE',
  'STEERING': 'LENKUNG',
  'YEAR': 'JAHR',
  'PRICE': 'PREIS',
  'MILEAGE': 'KILOMETERSTAND',
  'COLOR': 'FARBE',
  'DOORS': 'TÜREN',
  'SELLER TYPE': 'VERKÄUFER',
  'KEYWORD': 'STICHWORT',
  'PUBLICATION DATE': 'VERÖFFENTLICHUNGSDATUM',
  // Fuel types
  'DIESEL': 'DIESEL',
  'PETROL': 'BENZIN',
  'ELECTRIC': 'ELEKTRISCH',
  'HYBRID': 'HYBRID',
  'PLUG-IN HYBRID': 'PLUG-IN-HYBRID',
  'LPG': 'LPG',
  'CNG': 'CNG',
  // Transmission
  'AUTOMATIC': 'AUTOMATIK',
  'MANUAL': 'MANUELL',
  // Seller types
  'Private': 'Privat',
  'Professional': 'Gewerblich',
  'All': 'Alle',
  // Countries
  'All countries': 'Alle Länder',
  'France': 'Frankreich',
  'Germany': 'Deutschland',
  'Sweden': 'Schweden',
  'Spain': 'Spanien',
  'Italy': 'Italien',
  'Belgium': 'Belgien',
  'Netherlands': 'Niederlande',
  'Austria': 'Österreich',
  'Switzerland': 'Schweiz',
  // Listing details
  'Listing details': 'Anzeigendetails',
  'Close': 'Schließen',
  'View listing': 'Anzeige ansehen',
  'Price drop': 'Preissenkung',
  'Market price': 'Marktpreis',
  // Landing page
  'The European car market,<br>in one place': 'Der europäische Automarkt,<br>an einem Ort',
  'Search millions of listings across Europe. Compare prices, track market trends, and make data-driven decisions.': 'Millionen Inserate in Europa durchsuchen. Preise vergleichen, Markttrends verfolgen und datenbasierte Entscheidungen treffen.',
  'Search vehicles': 'Fahrzeuge suchen',
  'View pricing →': 'Preise ansehen →',
  'View pricing': 'Preise ansehen',
  '8.5M+ listings · leboncoin, mobile.de, AutoScout24': '8,5M+ Inserate · leboncoin, mobile.de, AutoScout24',
  // Errors
  'Search error': 'Suchfehler',
  'Something went wrong': 'Etwas ist schiefgelaufen',
  'Loading error': 'Ladefehler',
  'Back to home': 'Zurück zur Startseite',
  'Back to dashboard': 'Zurück zum Dashboard',
  // Dashboard
  'Market Insights': 'Markteinblicke',
  'Evaluations': 'Bewertungen',
  'Calculator': 'Kalkulator',
  'New evaluation': 'Neue Bewertung',
  'My evaluations': 'Meine Bewertungen',
  'Recently viewed': 'Zuletzt gesehen',
  // Publication date
  'Recent (< 30 days)': 'Aktuell (< 30 Tage)',
  'Old (> 30 days)': 'Älter (> 30 Tage)',
}

const itMap = {
  // Navigation
  'Home': 'Home',
  'Search': 'Cerca',
  'Features': 'Funzionalità',
  'Pricing': 'Prezzi',
  'Dashboard': 'Dashboard',
  'Admin': 'Admin',
  'Logout': 'Esci',
  'Login': 'Accedi',
  'Sign up': 'Registrati',
  'Get started': 'Inizia',
  // Search page
  'Filters': 'Filtri',
  'Reset search': 'Reimposta ricerca',
  'Search for a vehicle': 'Cerca un veicolo',
  'Search by brand, model, keyword...': 'Marca, modello, parola chiave...',
  'Browse millions of listings from leboncoin, mobile.de, AutoScout24': 'Sfoglia milioni di annunci su leboncoin, mobile.de, AutoScout24',
  'listings found': 'annunci trovati',
  'Most recent': 'Più recenti',
  'Price ascending': 'Prezzo crescente',
  'Price descending': 'Prezzo decrescente',
  'Mileage ascending': 'Chilometraggio crescente',
  'Updating...': 'Aggiornamento...',
  'Loading...': 'Caricamento...',
  'View →': 'Vedi →',
  'View': 'Vedi',
  'Retry': 'Riprova',
  'Previous': 'Precedente',
  'Next': 'Successivo',
  'No results found': 'Nessun risultato trovato',
  'listings/page': 'annunci/pagina',
  // Filters
  'COUNTRY': 'PAESE',
  'BRAND': 'MARCA',
  'MODEL': 'MODELLO',
  'FUEL TYPE': 'CARBURANTE',
  'TRANSMISSION': 'TRASMISSIONE',
  'STEERING': 'STERZO',
  'YEAR': 'ANNO',
  'PRICE': 'PREZZO',
  'MILEAGE': 'CHILOMETRAGGIO',
  'COLOR': 'COLORE',
  'DOORS': 'PORTE',
  'SELLER TYPE': 'VENDITORE',
  'KEYWORD': 'PAROLA CHIAVE',
  'PUBLICATION DATE': 'DATA DI PUBBLICAZIONE',
  // Fuel types
  'DIESEL': 'DIESEL',
  'PETROL': 'BENZINA',
  'ELECTRIC': 'ELETTRICO',
  'HYBRID': 'IBRIDO',
  'PLUG-IN HYBRID': 'IBRIDO PLUG-IN',
  'LPG': 'GPL',
  'CNG': 'GNC',
  // Transmission
  'AUTOMATIC': 'AUTOMATICO',
  'MANUAL': 'MANUALE',
  // Seller types
  'Private': 'Privato',
  'Professional': 'Professionale',
  'All': 'Tutti',
  // Countries
  'All countries': 'Tutti i paesi',
  'France': 'Francia',
  'Germany': 'Germania',
  'Sweden': 'Svezia',
  'Spain': 'Spagna',
  'Italy': 'Italia',
  'Belgium': 'Belgio',
  'Netherlands': 'Paesi Bassi',
  'Austria': 'Austria',
  'Switzerland': 'Svizzera',
  // Listing details
  'Listing details': 'Dettagli annuncio',
  'Close': 'Chiudi',
  'View listing': 'Vedi annuncio',
  'Price drop': 'Calo di prezzo',
  'Market price': 'Prezzo di mercato',
  // Landing page
  'The European car market,<br>in one place': 'Il mercato europeo dell\'auto,<br>in un unico posto',
  'Search millions of listings across Europe. Compare prices, track market trends, and make data-driven decisions.': 'Cerca milioni di annunci in Europa. Confronta prezzi, segui i trend di mercato e prendi decisioni basate sui dati.',
  'Search vehicles': 'Cerca veicoli',
  'View pricing →': 'Vedi prezzi →',
  'View pricing': 'Vedi prezzi',
  '8.5M+ listings · leboncoin, mobile.de, AutoScout24': '8,5M+ annunci · leboncoin, mobile.de, AutoScout24',
  // Errors
  'Search error': 'Errore di ricerca',
  'Something went wrong': 'Qualcosa è andato storto',
  'Loading error': 'Errore di caricamento',
  'Back to home': 'Torna alla home',
  'Back to dashboard': 'Torna alla dashboard',
  // Dashboard
  'Market Insights': 'Analisi di mercato',
  'Evaluations': 'Valutazioni',
  'Calculator': 'Calcolatore',
  'New evaluation': 'Nuova valutazione',
  'My evaluations': 'Le mie valutazioni',
  'Recently viewed': 'Visti di recente',
  // Publication date
  'Recent (< 30 days)': 'Recenti (< 30 giorni)',
  'Old (> 30 days)': 'Vecchi (> 30 giorni)',
}

const esMap = {
  // Navigation
  'Home': 'Inicio',
  'Search': 'Buscar',
  'Features': 'Características',
  'Pricing': 'Precios',
  'Dashboard': 'Panel',
  'Admin': 'Admin',
  'Logout': 'Cerrar sesión',
  'Login': 'Iniciar sesión',
  'Sign up': 'Registrarse',
  'Get started': 'Empezar',
  // Search page
  'Filters': 'Filtros',
  'Reset search': 'Restablecer búsqueda',
  'Search for a vehicle': 'Buscar vehículo',
  'Search by brand, model, keyword...': 'Marca, modelo, palabra clave...',
  'Browse millions of listings from leboncoin, mobile.de, AutoScout24': 'Explora millones de anuncios en leboncoin, mobile.de, AutoScout24',
  'listings found': 'anuncios encontrados',
  'Most recent': 'Más recientes',
  'Price ascending': 'Precio ascendente',
  'Price descending': 'Precio descendente',
  'Mileage ascending': 'Kilometraje ascendente',
  'Updating...': 'Actualizando...',
  'Loading...': 'Cargando...',
  'View →': 'Ver →',
  'View': 'Ver',
  'Retry': 'Reintentar',
  'Previous': 'Anterior',
  'Next': 'Siguiente',
  'No results found': 'Sin resultados',
  'listings/page': 'anuncios/página',
  // Filters
  'COUNTRY': 'PAÍS',
  'BRAND': 'MARCA',
  'MODEL': 'MODELO',
  'FUEL TYPE': 'COMBUSTIBLE',
  'TRANSMISSION': 'TRANSMISIÓN',
  'STEERING': 'DIRECCIÓN',
  'YEAR': 'AÑO',
  'PRICE': 'PRECIO',
  'MILEAGE': 'KILOMETRAJE',
  'COLOR': 'COLOR',
  'DOORS': 'PUERTAS',
  'SELLER TYPE': 'VENDEDOR',
  'KEYWORD': 'PALABRA CLAVE',
  'PUBLICATION DATE': 'FECHA DE PUBLICACIÓN',
  // Fuel types
  'DIESEL': 'DIÉSEL',
  'PETROL': 'GASOLINA',
  'ELECTRIC': 'ELÉCTRICO',
  'HYBRID': 'HÍBRIDO',
  'PLUG-IN HYBRID': 'HÍBRIDO ENCHUFABLE',
  'LPG': 'GLP',
  'CNG': 'GNC',
  // Transmission
  'AUTOMATIC': 'AUTOMÁTICO',
  'MANUAL': 'MANUAL',
  // Seller types
  'Private': 'Particular',
  'Professional': 'Profesional',
  'All': 'Todos',
  // Countries
  'All countries': 'Todos los países',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Sweden': 'Suecia',
  'Spain': 'España',
  'Italy': 'Italia',
  'Belgium': 'Bélgica',
  'Netherlands': 'Países Bajos',
  'Austria': 'Austria',
  'Switzerland': 'Suiza',
  // Listing details
  'Listing details': 'Detalles del anuncio',
  'Close': 'Cerrar',
  'View listing': 'Ver anuncio',
  'Price drop': 'Bajada de precio',
  'Market price': 'Precio de mercado',
  // Landing page
  'The European car market,<br>in one place': 'El mercado europeo del automóvil,<br>en un solo lugar',
  'Search millions of listings across Europe. Compare prices, track market trends, and make data-driven decisions.': 'Busca millones de anuncios en Europa. Compara precios, sigue las tendencias del mercado y toma decisiones basadas en datos.',
  'Search vehicles': 'Buscar vehículos',
  'View pricing →': 'Ver precios →',
  'View pricing': 'Ver precios',
  '8.5M+ listings · leboncoin, mobile.de, AutoScout24': '8,5M+ anuncios · leboncoin, mobile.de, AutoScout24',
  // Errors
  'Search error': 'Error de búsqueda',
  'Something went wrong': 'Algo salió mal',
  'Loading error': 'Error de carga',
  'Back to home': 'Volver al inicio',
  'Back to dashboard': 'Volver al panel',
  // Dashboard
  'Market Insights': 'Perspectivas del mercado',
  'Evaluations': 'Evaluaciones',
  'Calculator': 'Calculadora',
  'New evaluation': 'Nueva evaluación',
  'My evaluations': 'Mis evaluaciones',
  'Recently viewed': 'Vistos recientemente',
  // Publication date
  'Recent (< 30 days)': 'Recientes (< 30 días)',
  'Old (> 30 days)': 'Antiguos (> 30 días)',
}

export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'en'
}

export function setLang(lang) {
  const valid = ['en', 'fr', 'sv', 'de', 'it', 'es']
  const next = valid.includes(lang) ? lang : 'en'
  localStorage.setItem(STORAGE_KEY, next)
  document.documentElement.lang = next
  return next
}

export function t(key, params = {}) {
  const lang = getLang()
  const [group, name] = key.split('.')
  const value =
    translations?.[lang]?.[group]?.[name] ??
    translations?.en?.[group]?.[name] ??
    key

  if (typeof value !== 'string') return value
  return Object.entries(params).reduce(
    (acc, [paramKey, paramValue]) => acc.replaceAll(`{${paramKey}}`, String(paramValue)),
    value
  )
}

// tr(en, fr) — main translation function used throughout the app
// sv/de are looked up from maps; falls back to English if not in map
export function tr(enText, frText) {
  const lang = getLang()
  if (lang === 'fr') return frText
  if (lang === 'sv') return svMap[enText] ?? enText
  if (lang === 'de') return deMap[enText] ?? enText
  if (lang === 'it') return itMap[enText] ?? enText
  if (lang === 'es') return esMap[enText] ?? enText
  return enText
}

export function toggleLang() {
  const order = ['en', 'fr', 'sv', 'de', 'it', 'es']
  const current = getLang()
  const next = order[(order.indexOf(current) + 1) % order.length]
  return setLang(next)
}

// Locale map for Intl formatting
const localeMap = { en: 'en-US', fr: 'fr-FR', sv: 'sv-SE', de: 'de-DE', it: 'it-IT', es: 'es-ES' }

export function formatNumber(value) {
  const locale = localeMap[getLang()] || 'en-US'
  return new Intl.NumberFormat(locale).format(value)
}

export function formatCurrency(value, currency = 'EUR') {
  const locale = localeMap[getLang()] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDate(value) {
  if (!value) return ''
  const locale = localeMap[getLang()] || 'en-US'
  return new Date(value).toLocaleDateString(locale)
}

export function capitalize(str) {
  if (!str) return ''
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function renderLanguageToggle() {
  const lang = getLang()
  return `
    <div class="flex items-center">
      <select id="lang-toggle" class="text-xs border border-gray-300 rounded px-2 py-1">
        <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
        <option value="fr" ${lang === 'fr' ? 'selected' : ''}>Français</option>
        <option value="sv" ${lang === 'sv' ? 'selected' : ''}>Svenska</option>
        <option value="de" ${lang === 'de' ? 'selected' : ''}>Deutsch</option>
        <option value="it" ${lang === 'it' ? 'selected' : ''}>Italiano</option>
        <option value="es" ${lang === 'es' ? 'selected' : ''}>Español</option>
      </select>
    </div>
  `
}

export function attachLanguageToggle(onChange) {
  // querySelectorAll finds ALL #lang-toggle elements (desktop nav + mobile header + hamburger menu)
  const selects = document.querySelectorAll('[id="lang-toggle"]')
  if (!selects || selects.length === 0) return
  selects.forEach(select => {
    select.addEventListener('change', (event) => {
      const nextLang = event.target.value
      setLang(nextLang)
      // Dispatch hashchange to re-render via the SPA router
      window.dispatchEvent(new Event('hashchange'))
    })
  })
}
