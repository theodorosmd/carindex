import { apiCache } from '../utils/cache.js'
import { logout, isAuthenticated } from '../main.js'
import { tr, getLang, renderLanguageToggle, attachLanguageToggle, formatCurrency as formatCurrencyLocale, formatNumber, formatDate as formatDateLocale, capitalize } from '../utils/i18n.js'
import { getListingImage, getPlaceholderImageUrl, getFilteredImages } from '../utils/listingUtils.js'

// Make logout available globally
window.logout = logout

// Initialize global state variables
window.currentPage = 1
window.currentFilters = {}

export function renderListingsSearch() {
  const app = document.getElementById('app')
  
  app.innerHTML = `
    <!-- Navigation -->
    <header class="fixed inset-x-0 top-0 bg-white border-b border-zinc-200 z-[100]">
      <nav class="container mx-auto px-4 sm:px-6 py-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3 shrink-0">
            <!-- Mobile menu button -->
            <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <a href="#/" class="flex items-center space-x-2 shrink-0">
              <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">C</span>
              </div>
              <span class="text-lg font-semibold text-zinc-900 tracking-tight">Carindex</span>
            </a>
          </div>
          <div class="hidden lg:flex items-center space-x-5" id="nav-auth">
            <a href="#/" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Home', 'Accueil')}</a>
            ${(() => {
              const token = localStorage.getItem('carindex_token')
              const user = token ? JSON.parse(localStorage.getItem('carindex_user') || '{}') : null
              if (user) {
                const isAdmin = user.role === 'admin'
                return `
                  <a href="#/dashboard" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Dashboard', 'Dashboard')}</a>
                  ${isAdmin ? `<a href="#/admin" class="text-sm text-red-600 hover:text-red-700 transition font-medium">${tr('Admin', 'Admin')}</a>` : ''}
                  <span class="text-sm text-zinc-400 hidden xl:inline">${user.email}</span>
                  ${renderLanguageToggle()}
                  <button onclick="window.logout()" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Logout', 'Déconnexion')}</button>
                `
              } else {
                return `
                  <a href="#/login" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Login', 'Connexion')}</a>
                  <a href="#/signup" class="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition">${tr('Sign up', 'Inscription')}</a>
                `
              }
            })()}
          </div>
          <!-- Mobile auth button -->
          <div class="lg:hidden">
            ${(() => {
              const token = localStorage.getItem('carindex_token')
              const user = token ? JSON.parse(localStorage.getItem('carindex_user') || '{}') : null
              if (user) {
                return `<button id="mobile-user-menu-btn" class="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </button>`
              } else {
                return `<a href="#/login" class="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-sm">${tr('Login', 'Connexion')}</a>`
              }
            })()}
          </div>
        </div>
      </nav>
      <!-- Mobile menu -->
      <div id="mobile-menu" class="hidden lg:hidden border-t border-zinc-100 bg-white">
        <div class="px-4 py-3 space-y-1">
          <a href="#/" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition">${tr('Home', 'Accueil')}</a>
          ${(() => {
            const token = localStorage.getItem('carindex_token')
            const user = token ? JSON.parse(localStorage.getItem('carindex_user') || '{}') : null
            if (user) {
              const isAdmin = user.role === 'admin'
              return `
                <a href="#/dashboard" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition">${tr('Dashboard', 'Dashboard')}</a>
                ${isAdmin ? `<a href="#/admin" class="block px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium">${tr('Admin', 'Admin')}</a>` : ''}
                <div class="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-100 mt-2 pt-2">${user.email}</div>
                <div class="px-3 py-2">${renderLanguageToggle()}</div>
                <button onclick="window.logout()" class="block w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition">${tr('Logout', 'Déconnexion')}</button>
              `
            } else {
              return `
                <a href="#/login" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition">${tr('Login', 'Connexion')}</a>
                <a href="#/signup" class="block px-3 py-2 bg-zinc-900 text-white text-sm rounded-lg text-center">${tr('Sign up', 'Inscription')}</a>
              `
            }
          })()}
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex min-h-screen bg-zinc-50 pt-[60px]">
      <!-- Mobile filters overlay -->
      <div id="mobile-filters-overlay" class="hidden fixed inset-0 bg-black/40 z-40 lg:hidden" onclick="closeMobileFilters()"></div>

      <!-- Left Sidebar - Filters -->
      <aside class="fixed lg:sticky top-[60px] left-0 h-[calc(100vh-60px)] w-72 bg-white border-r border-zinc-100 overflow-y-auto transition-transform duration-300 z-40 -translate-x-full lg:translate-x-0" id="filters-sidebar">
        <div class="p-4 sm:p-5">
          <!-- Reset Button -->
          <button id="reset-filters" class="w-full mb-5 px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition text-sm font-medium">
            ${tr('Reset search', 'Réinitialiser la recherche')}
          </button>
          
          <!-- Pays -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('COUNTRY', 'PAYS')}</h3>
            <select id="country-filter" class="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-zinc-50">
              <option value="">${tr('All countries', 'Tous les pays')}</option>
              <!-- Countries populated dynamically from facets -->
            </select>
          </div>

          <!-- RHD / LHD -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">RHD / LHD</h3>
            <div class="space-y-2">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="steering" value="left" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">${tr('LEFT-HAND DRIVE', 'VOLANT À GAUCHE')} <span class="text-zinc-400">(0)</span></span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="steering" value="right" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">${tr('RIGHT-HAND DRIVE', 'VOLANT À DROITE')} <span class="text-zinc-400">(0)</span></span>
              </label>
            </div>
          </div>
          
          <!-- Marque -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('BRAND', 'MARQUE')}</h3>
            <div id="brand-list" class="space-y-2 max-h-64 overflow-y-auto">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Modèle -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('MODEL', 'MODELE')}</h3>
            <div id="model-list" class="space-y-2 max-h-64 overflow-y-auto">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Énergie -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('FUEL TYPE', 'ENERGIE')}</h3>
            <div id="fuel-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Version -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('VERSION', 'VERSION')}</h3>
            <div id="version-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Finition -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('TRIM', 'FINITION')}</h3>
            <div id="trim-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Boîte -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('TRANSMISSION', 'BOITE')}</h3>
            <div id="transmission-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Portes -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('DOORS', 'PORTES')}</h3>
            <div id="doors-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Catégorie -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('CATEGORY', 'CATÉGORIE')}</h3>
            <div id="category-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Transmission -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('DRIVETRAIN', 'TRANSMISSION')}</h3>
            <div id="drivetrain-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Type d'annonce -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('LISTING TYPE', 'TYPE D\'ANNONCE')}</h3>
            <div id="seller-type-list" class="space-y-2">
              <!-- Dynamically populated from API -->
            </div>
          </div>
          
          <!-- Date de parution -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('PUBLICATION DATE', 'DATE DE PARUTION')}</h3>
            <div class="space-y-2">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="publication-date" value="recent" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">${tr('LESS THAN 30 DAYS', 'MOINS DE 30 JOURS')} <span class="text-zinc-400">(0)</span></span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="publication-date" value="old" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">${tr('MORE THAN 30 DAYS', 'PLUS DE 30 JOURS')} <span class="text-zinc-400">(0)</span></span>
              </label>
            </div>
          </div>
          
          <!-- Mot-clé -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('KEYWORD', 'MOT CLE')}</h3>
            <div class="space-y-2">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="keyword" value="" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">${tr('NOT SPECIFIED', 'NON RENSEIGNE')} <span class="text-zinc-400">(0)</span></span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="keyword" value="AMG" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">AMG <span class="text-zinc-400">(0)</span></span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" name="keyword" value="L1H1" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
                <span class="ml-2 text-sm text-zinc-700">L1H1 <span class="text-zinc-400">(0)</span></span>
              </label>
            </div>
            <button class="text-xs text-zinc-400 mt-2 hover:text-zinc-700 transition">${tr('Show more', 'Voir plus')} ▼</button>
          </div>
          
          <!-- Prix -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('PRICE', 'PRIX')}</h3>
            <div class="mb-4">
              <div class="h-12 bg-zinc-100 rounded mb-2 relative" id="price-chart">
                <!-- Histogram bars will be generated here -->
                <div class="absolute inset-0 flex items-end justify-between px-1">
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 20%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 40%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 60%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 80%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 100%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 90%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 70%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 50%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 30%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 10%"></div>
                </div>
                <div class="absolute inset-0 flex items-center">
                  <input type="range" min="1" max="400000" value="1" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="price-min">
                  <input type="range" min="1" max="400000" value="400000" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="price-max">
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('From', 'de')}</label>
                  <input type="number" id="price-from" value="1" min="1" max="400000" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('To', 'à')}</label>
                  <input type="number" id="price-to" value="400000" min="1" max="400000" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Couleur -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('COLOR', 'COULEUR')}</h3>
            <div class="grid grid-cols-7 gap-2">
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition relative" style="background: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;" data-color="any" title="${tr('All', 'Toutes')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #F5E6D3" data-color="beige" title="${tr('Beige', 'Beige')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition bg-white" data-color="white" title="${tr('White', 'Blanc')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #1E3A8A" data-color="blue" title="${tr('Blue', 'Bleu')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #6B7280" data-color="gray" title="${tr('Gray', 'Gris')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #FCD34D" data-color="yellow" title="${tr('Yellow', 'Jaune')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #92400E" data-color="brown" title="${tr('Brown', 'Marron')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #A78BFA" data-color="purple" title="${tr('Purple', 'Violet')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition bg-black" data-color="black" title="${tr('Black', 'Noir')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #F97316" data-color="orange" title="${tr('Orange', 'Orange')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #EC4899" data-color="pink" title="${tr('Pink', 'Rose')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #991B1B" data-color="red" title="${tr('Red', 'Rouge')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #65A30D" data-color="green" title="${tr('Green', 'Vert')}"></button>
              <button class="w-7 h-7 rounded border-2 border-zinc-200 hover:border-zinc-900 transition" style="background: #7C3AED" data-color="dark-purple" title="${tr('Dark Purple', 'Violet foncé')}"></button>
            </div>
          </div>
          
          <!-- Kilomètres -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('MILEAGE', 'KILOMETRES')}</h3>
            <div class="mb-4">
              <div class="h-12 bg-zinc-100 rounded mb-2 relative" id="mileage-chart">
                <!-- Histogram bars -->
                <div class="absolute inset-0 flex items-end justify-between px-1">
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 100%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 80%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 60%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 50%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 45%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 40%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 35%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 30%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 25%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 20%"></div>
                </div>
                <div class="absolute inset-0 flex items-center">
                  <input type="range" min="1" max="500000" value="1" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="mileage-min">
                  <input type="range" min="1" max="500000" value="500000" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="mileage-max">
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('From', 'de')}</label>
                  <input type="number" id="mileage-from" value="1" min="1" max="500000" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('To', 'à')}</label>
                  <input type="number" id="mileage-to" value="500000" min="1" max="500000" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Année -->
          <div class="mb-6">
            <h3 class="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">${tr('YEAR', 'ANNEE')}</h3>
            <div class="mb-4">
              <div class="h-12 bg-zinc-100 rounded mb-2 relative" id="year-chart">
                <!-- Histogram bars -->
                <div class="absolute inset-0 flex items-end justify-between px-1">
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 10%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 15%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 20%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 30%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 50%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 70%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 90%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 100%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 95%"></div>
                  <div class="w-1 bg-zinc-400 rounded-t" style="height: 85%"></div>
                </div>
                <div class="absolute inset-0 flex items-center">
                  <input type="range" min="1910" max="2026" value="1910" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="year-min">
                  <input type="range" min="1910" max="2026" value="2026" class="w-full h-1 bg-transparent appearance-none cursor-pointer" id="year-max">
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('From', 'de')}</label>
                  <input type="number" id="year-from" value="1910" min="1910" max="2026" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
                <div class="flex-1">
                  <label class="text-xs text-zinc-500 mb-1 block">${tr('To', 'à')}</label>
                  <input type="number" id="year-to" value="2026" min="1910" max="2026" class="w-full px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900">
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      <!-- Right Content Area -->
      <main class="flex-1 min-w-0">
        <!-- Search Bar with Autocomplete -->
        <div class="bg-white border-b border-zinc-100 sticky top-[60px] z-30 px-4 sm:px-6 py-3">
          <!-- Mobile filters button -->
          <button id="mobile-filters-btn" class="lg:hidden w-full mb-3 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition flex items-center justify-center space-x-2 text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            <span>${tr('Filters', 'Filtres')}</span>
          </button>

          <div class="mb-3">
            <div class="relative">
              <input type="text" id="search-query" placeholder="${tr('Search by brand, model, keyword...', 'Rechercher par marque, modèle, mot-clé...')}"
                     class="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-sm bg-zinc-50"
                     autocomplete="off">
              <div id="autocomplete-dropdown" class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-96 overflow-y-auto hidden">
                <!-- Autocomplete suggestions will appear here -->
              </div>
            </div>
            <!-- Active filters chips -->
            <div id="active-filters" class="flex flex-wrap gap-1.5 mt-2">
              <!-- Active filter chips will appear here -->
            </div>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 class="text-base font-semibold text-zinc-900" id="results-count">${tr('Search for a vehicle', 'Rechercher un véhicule')}</h1>
              <p class="text-zinc-400 text-xs mt-0.5" id="results-info">${tr('Browse millions of listings from leboncoin, mobile.de, AutoScout24', 'Parcourez des millions d\'annonces depuis leboncoin, mobile.de, AutoScout24')}</p>
            </div>
            <div class="flex items-center">
              <select id="sort-by" class="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm bg-zinc-50">
                <option value="date">${tr('Most recent', 'Plus récent')}</option>
                <option value="price-asc">${tr('Price ascending', 'Prix croissant')}</option>
                <option value="price-desc">${tr('Price descending', 'Prix décroissant')}</option>
                <option value="mileage-asc">${tr('Mileage ascending', 'Kilométrage croissant')}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Results Grid -->
        <div class="p-4 sm:p-5">
          <div id="results-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            <!-- Results will be inserted here -->
            <div class="col-span-full text-center py-16">
              <svg class="mx-auto h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <p class="mt-3 text-sm text-zinc-400">${tr('Use filters to start your search', 'Utilisez les filtres pour commencer votre recherche')}</p>
            </div>
          </div>

          <!-- Pagination -->
          <div id="pagination" class="mt-6 flex justify-center items-center space-x-1.5 hidden">
            <!-- Pagination will be inserted here -->
          </div>
        </div>
      </main>
    </div>

    <!-- Listing Detail Modal -->
    <div id="listing-modal" class="fixed inset-0 bg-black/50 z-50 hidden items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-zinc-900">${tr('Listing details', 'Détails de l\'annonce')}</h3>
          <button id="close-modal" class="text-zinc-400 hover:text-zinc-600 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div id="modal-content" class="p-6">
          <!-- Modal content will be inserted here -->
        </div>
      </div>
    </div>
  `

  attachLanguageToggle(() => window.location.reload())
  
  // Initialize search functionality after DOM is ready
  setTimeout(() => {
    initializeSearch()
    initializeFilters()
    initializeMobileMenu()
    generateHistograms()
    updateAuthLinks()
    // Load facets (no filters on init so we always get base counts) and initial listings
    loadFacets(true)
    loadInitialListings()
    if (window.updateActiveFilters) {
      setTimeout(() => window.updateActiveFilters(), 200)
    }
    // Start auto-refresh if scraping is active
    startAutoRefresh()
  }, 100)
}

// Auto-refresh system: check if scraping is active and refresh results
let autoRefreshInterval = null
let isAutoRefreshing = false

async function startAutoRefresh() {
  // Check every 10 seconds if a scraping is active
  autoRefreshInterval = setInterval(async () => {
    try {
      // Check if user is admin (only admins can see scraping status)
      const token = localStorage.getItem('carindex_token')
      if (!token) return
      
      const user = JSON.parse(localStorage.getItem('carindex_user') || '{}')
      if (user.role !== 'admin') return
      
      // Check if any scraper is running
      const response = await fetch('/api/v1/admin/auto-scrapers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Silently ignore errors (don't log 500 errors to console)
      // This endpoint is called every 10 seconds and temporary failures are expected
      if (!response.ok) {
        // Handle 401 Unauthorized - token expired - redirect to login
        if (response.status === 401) {
          console.warn('⚠️ Token expired - redirecting to login')
          localStorage.removeItem('carindex_token')
          localStorage.removeItem('carindex_user')
          window.location.hash = '#/login'
          return
        }
        // Only log if it's not a 500 error (which is usually a temporary Supabase issue)
        if (response.status !== 500) {
          console.warn('Failed to check scraping status:', response.status)
        }
        return
      }
      
      const data = await response.json()
      const scrapers = data.scrapers || []
      const hasRunningScraper = scrapers.some(s => s.last_run_status === 'running')
      
      if (hasRunningScraper && !isAutoRefreshing) {
        isAutoRefreshing = true
        
        // Show refresh indicator
        showRefreshIndicator()
        
        // Clear cache to get fresh data
        apiCache.clear()
        
        // Refresh facets
        await loadFacets()
        
        // Refresh current search results (if we have filters) - force refresh without cache
        if (window.searchListings && window.currentFilters) {
          await window.searchListings(window.currentFilters, window.currentPage, true)
        } else if (window.searchListings) {
          // If no filters, refresh with empty filters - force refresh without cache
          await window.searchListings({}, 1, true)
        }
        
        // Hide refresh indicator after a short delay
        setTimeout(() => {
          hideRefreshIndicator()
          isAutoRefreshing = false
        }, 2000)
      } else if (!hasRunningScraper) {
        // No scraping active, hide indicator if visible
        hideRefreshIndicator()
        isAutoRefreshing = false
      }
    } catch (error) {
      console.error('Error checking scraping status:', error)
      isAutoRefreshing = false
    }
  }, 10000) // Check every 10 seconds
}

// Show refresh indicator
function showRefreshIndicator() {
  let indicator = document.getElementById('auto-refresh-indicator')
  if (!indicator) {
    indicator = document.createElement('div')
    indicator.id = 'auto-refresh-indicator'
    indicator.className = 'fixed top-20 right-4 bg-zinc-900 text-white px-4 py-2 rounded-lg z-50 flex items-center space-x-2 text-sm'
    indicator.innerHTML = `
      <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span class="text-sm font-medium">${tr('Updating...', 'Mise à jour en cours...')}</span>
    `
    document.body.appendChild(indicator)
  } else {
    indicator.classList.remove('hidden')
  }
}

// Hide refresh indicator
function hideRefreshIndicator() {
  const indicator = document.getElementById('auto-refresh-indicator')
  if (indicator) {
    indicator.classList.add('hidden')
  }
}

// Stop auto-refresh when leaving the page
window.addEventListener('beforeunload', () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
  }
})

// Initialize mobile menu and filters
function initializeMobileMenu() {
  // Mobile menu button
  const mobileMenuBtn = document.getElementById('mobile-menu-btn')
  const mobileMenu = document.getElementById('mobile-menu')
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden')
    })
  }
  
  // Mobile filters button
  const mobileFiltersBtn = document.getElementById('mobile-filters-btn')
  const filtersSidebar = document.getElementById('filters-sidebar')
  const filtersOverlay = document.getElementById('mobile-filters-overlay')
  
  if (mobileFiltersBtn && filtersSidebar) {
    mobileFiltersBtn.addEventListener('click', () => {
      filtersSidebar.classList.remove('-translate-x-full')
      if (filtersOverlay) filtersOverlay.classList.remove('hidden')
      document.body.style.overflow = 'hidden'
    })
  }
  
  // Close filters on overlay click
  if (filtersOverlay) {
    filtersOverlay.addEventListener('click', () => {
      closeMobileFilters()
    })
  }
  
  // Close button in filters sidebar (mobile)
  const closeFiltersBtn = document.createElement('button')
  closeFiltersBtn.className = 'lg:hidden absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900'
  closeFiltersBtn.innerHTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `
  closeFiltersBtn.addEventListener('click', () => {
    closeMobileFilters()
  })
  
  if (filtersSidebar) {
    const filtersContent = filtersSidebar.querySelector('.p-6')
    if (filtersContent) {
      filtersContent.style.position = 'relative'
      filtersContent.appendChild(closeFiltersBtn)
    }
  }
}

// Close mobile filters
window.closeMobileFilters = function() {
  const filtersSidebar = document.getElementById('filters-sidebar')
  const filtersOverlay = document.getElementById('mobile-filters-overlay')
  
  if (filtersSidebar) {
    filtersSidebar.classList.add('-translate-x-full')
  }
  if (filtersOverlay) {
    filtersOverlay.classList.add('hidden')
  }
  document.body.style.overflow = ''
}

// Update authentication links in header
function updateAuthLinks() {
  const authLinksContainer = document.getElementById('auth-links')
  if (!authLinksContainer) return
  
  const token = localStorage.getItem('carindex_token')
  const user = token ? JSON.parse(localStorage.getItem('carindex_user') || '{}') : null
  
  if (user && user.email) {
    authLinksContainer.innerHTML = `
      <a href="#/dashboard" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Dashboard', 'Dashboard')}</a>
      <span class="text-sm text-zinc-400">${user.email}</span>
      <button onclick="window.logout()" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Logout', 'Déconnexion')}</button>
    `
  } else {
    authLinksContainer.innerHTML = `
      <a href="#/login" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Login', 'Connexion')}</a>
      <a href="#/signup" class="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition">${tr('Sign up', 'Inscription')}</a>
    `
  }
}

// Initialize filter interactions
function initializeFilters() {
  // Reset filters button
  const resetBtn = document.getElementById('reset-filters')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false)
      document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.id === 'price-from') input.value = 1
        else if (input.id === 'price-to') input.value = 400000
        else if (input.id === 'mileage-from') input.value = 1
        else if (input.id === 'mileage-to') input.value = 500000
        else if (input.id === 'year-from') input.value = 1910
        else if (input.id === 'year-to') input.value = 2026
      })
      document.querySelectorAll('input[type="range"]').forEach(range => {
        if (range.id === 'price-min') range.value = 1
        else if (range.id === 'price-max') range.value = 400000
        else if (range.id === 'mileage-min') range.value = 1
        else if (range.id === 'mileage-max') range.value = 500000
        else if (range.id === 'year-min') range.value = 1910
        else if (range.id === 'year-max') range.value = 2026
      })
      document.querySelectorAll('button[data-color]').forEach(btn => {
        btn.classList.remove('border-zinc-900', 'ring-2', 'ring-zinc-900')
        btn.classList.add('border-zinc-200')
      })
      document.getElementById('search-query').value = ''
      const countryFilter = document.getElementById('country-filter')
      if (countryFilter) countryFilter.value = ''
    })
  }

  // Color buttons
  document.querySelectorAll('button[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('button[data-color]').forEach(b => {
        b.classList.remove('border-zinc-900', 'ring-2', 'ring-zinc-900')
        b.classList.add('border-zinc-200')
      })
      btn.classList.remove('border-zinc-200')
      btn.classList.add('border-zinc-900', 'ring-2', 'ring-zinc-900')
    })
  })
  
  // Range sliders sync with number inputs
  const syncRangeInput = (rangeId, inputId) => {
    const range = document.getElementById(rangeId)
    const input = document.getElementById(inputId)
    if (range && input) {
      range.addEventListener('input', () => {
        input.value = range.value
      })
      input.addEventListener('input', () => {
        range.value = input.value
      })
    }
  }
  
  syncRangeInput('price-min', 'price-from')
  syncRangeInput('price-max', 'price-to')
  syncRangeInput('mileage-min', 'mileage-from')
  syncRangeInput('mileage-max', 'mileage-to')
  syncRangeInput('year-min', 'year-from')
  syncRangeInput('year-max', 'year-to')
  
  // Filter checkboxes trigger search
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (window.updateActiveFilters) window.updateActiveFilters()
      window.currentPage = 1
      window.currentFilters = window.getFilters ? window.getFilters() : {}
      if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
    })
  })
  
  // Range inputs trigger search
  document.querySelectorAll('input[type="range"]').forEach(range => {
    range.addEventListener('input', () => {
      if (window.updateActiveFilters) window.updateActiveFilters()
      window.currentPage = 1
      window.currentFilters = window.getFilters ? window.getFilters() : {}
      if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
    })
  })
  
  // Number inputs trigger search on input
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      if (window.updateActiveFilters) window.updateActiveFilters()
      window.currentPage = 1
      window.currentFilters = window.getFilters ? window.getFilters() : {}
      if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
    })
  })

  // Text inputs trigger search on input
  document.querySelectorAll('input[type="text"]').forEach(input => {
    if (input.id === 'search-query') return
    input.addEventListener('input', () => {
      if (window.updateActiveFilters) window.updateActiveFilters()
      window.currentPage = 1
      window.currentFilters = window.getFilters ? window.getFilters() : {}
      if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
    })
  })

  // Select inputs trigger search on change
  document.querySelectorAll('select').forEach(select => {
    if (select.id === 'sort-by') return
    select.addEventListener('change', () => {
      if (window.updateActiveFilters) window.updateActiveFilters()
      window.currentPage = 1
      window.currentFilters = window.getFilters ? window.getFilters() : {}
      if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
    })
  })
}

// Generate histogram bars
function generateHistograms() {
  // Price histogram
  const priceHist = document.getElementById('price-histogram')
  if (priceHist) {
    priceHist.innerHTML = ''
    for (let i = 0; i < 20; i++) {
      const height = 20 + Math.random() * 60
      const bar = document.createElement('div')
      bar.className = 'bg-yellow-400 rounded-t'
      bar.style.width = '4%'
      bar.style.height = height + '%'
      priceHist.appendChild(bar)
    }
  }
  
  // Mileage histogram
  const mileageHist = document.getElementById('mileage-histogram')
  if (mileageHist) {
    mileageHist.innerHTML = ''
    const heights = [80, 60, 40, 30, 25, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]
    heights.forEach(h => {
      const bar = document.createElement('div')
      bar.className = 'bg-yellow-400 rounded-t'
      bar.style.width = '4%'
      bar.style.height = h + '%'
      mileageHist.appendChild(bar)
    })
  }
  
  // Year histogram
  const yearHist = document.getElementById('year-histogram')
  if (yearHist) {
    yearHist.innerHTML = ''
    for (let i = 0; i < 20; i++) {
      const height = 10 + (i * 3) + Math.random() * 10
      const bar = document.createElement('div')
      bar.className = 'bg-yellow-400 rounded-t'
      bar.style.width = '4%'
      bar.style.height = Math.min(height, 90) + '%'
      yearHist.appendChild(bar)
    }
  }
}

// Toggle "VOIR PLUS" sections
window.toggleMore = function(section) {
  const list = document.getElementById(section + '-list')
  if (list) {
    if (list.style.maxHeight === 'none' || !list.style.maxHeight) {
      list.style.maxHeight = '240px'
    } else {
      list.style.maxHeight = 'none'
    }
  }
}

// Helper function to create dynamic filter checkboxes
function createFilterCheckbox(name, value, count, filterName) {
  const label = document.createElement('label')
  label.className = 'flex items-center cursor-pointer'
  const displayName = name === '' || name === null || name === undefined ? tr('NOT SPECIFIED', 'NON RENSEIGNE') : name.toUpperCase()
  label.innerHTML = `
    <input type="checkbox" name="${filterName}" value="${value || ''}" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900">
    <span class="ml-2 text-sm text-zinc-700">${displayName} <span class="text-zinc-400">(${formatNumber(count)})</span></span>
  `
  return label
}

// Helper function to populate a filter section dynamically
function populateFilterSection(sectionId, facets, filterName, valueMapper = null, displayMapper = null, maxItems = 20) {
  const section = document.querySelector(`#${sectionId}`)?.closest('.mb-6')
  if (!section) return
  
  const container = section.querySelector('.space-y-2')
  if (!container) return
  
  // Clear existing hardcoded items
  container.innerHTML = ''
  
  if (!facets || facets.length === 0) {
    // Show "No data" message if no facets available
    const noDataMsg = document.createElement('div')
    noDataMsg.className = 'text-xs text-zinc-400 italic'
    noDataMsg.textContent = tr('No data available', 'Aucune donnée disponible')
    container.appendChild(noDataMsg)
    return
  }
  
  // Add dynamic checkboxes - filter out null/empty values
  facets
    .filter(({ name }) => name !== null && name !== undefined && name !== '' && String(name).trim() !== '')
    .slice(0, maxItems)
    .forEach(({ name, count }) => {
      const value = valueMapper ? valueMapper(name) : (name || '')
      const displayName = displayMapper ? displayMapper(name) : name
      const checkbox = createFilterCheckbox(displayName, value, count, filterName)
      container.appendChild(checkbox)
    })
  
  // Re-attach event listeners for new checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!cb.dataset.listenerAttached) {
      cb.dataset.listenerAttached = 'true'
      cb.addEventListener('change', () => {
        if (window.updateActiveFilters) window.updateActiveFilters()
        window.currentPage = 1
        window.currentFilters = window.getFilters ? window.getFilters() : {}
        if (window.searchListings) window.searchListings(window.currentFilters, window.currentPage)
      })
    }
  })
}

// Build query string from filters for facets API (excludes sort, limit, offset)
function buildFacetsQueryParams(filters = {}) {
  const params = new URLSearchParams()
  const facetParams = ['brand', 'model', 'min_price', 'max_price', 'min_year', 'max_year', 'min_mileage', 'max_mileage', 'country', 'fuel_type', 'seller_type', 'steering', 'transmission', 'doors', 'color', 'version', 'trim', 'keyword', 'publication_date']
  facetParams.forEach(key => {
    const val = filters[key]
    if (val != null && val !== '') {
      if (Array.isArray(val)) {
        val.forEach(v => params.append(key, v))
      } else {
        params.append(key, val)
      }
    }
  })
  return params.toString()
}

// Load facets from API and create all filters dynamically (uses current filters for dynamic counts)
// Pass forceNoFilters=true on initial load to always get base facets (avoids empty when URL has stale filters)
async function loadFacets(forceNoFilters = false) {
  try {
    const filters = forceNoFilters ? {} : (window.getFilters ? window.getFilters() : {})
    const queryString = buildFacetsQueryParams(filters)
    const url = queryString ? `/api/v1/facets?${queryString}` : '/api/v1/facets'
    const response = await fetch(url)
    if (!response.ok) {
      console.warn('Failed to load facets:', response.status, url)
      if (forceNoFilters === false && Object.keys(filters).length > 0) {
        return loadFacets(true)
      }
      return
    }
    
    const data = await response.json()
    const facets = data.facets || {}
    
    // Countries - populate select dynamically (all countries from DB)
    const countryNames = {
      FR: tr('France', 'France'),
      SE: tr('Sweden', 'Suède'),
      DE: tr('Germany', 'Allemagne'),
      BE: tr('Belgium', 'Belgique'),
      NL: tr('Netherlands', 'Pays-Bas'),
      IT: tr('Italy', 'Italie'),
      ES: tr('Spain', 'Espagne'),
      AT: tr('Austria', 'Autriche'),
      CH: tr('Switzerland', 'Suisse'),
      LU: tr('Luxembourg', 'Luxembourg'),
      GB: tr('United Kingdom', 'Royaume-Uni'),
      DK: tr('Denmark', 'Danemark'),
      NO: tr('Norway', 'Norvège'),
      FI: tr('Finland', 'Finlande'),
      PL: tr('Poland', 'Pologne'),
      PT: tr('Portugal', 'Portugal'),
      CZ: tr('Czech Republic', 'Tchéquie'),
      RO: tr('Romania', 'Roumanie'),
      HU: tr('Hungary', 'Hongrie')
    }
    if (facets.countries && facets.countries.length > 0) {
      const countrySelect = document.getElementById('country-filter')
      if (countrySelect) {
        countrySelect.innerHTML = ''
        const allOpt = document.createElement('option')
        allOpt.value = ''
        allOpt.textContent = tr('All countries', 'Tous les pays')
        countrySelect.appendChild(allOpt)
        facets.countries.forEach(({ name, count }) => {
          const option = document.createElement('option')
          option.value = name
          option.textContent = `${countryNames[name] || name} (${formatNumber(count)})`
          countrySelect.appendChild(option)
        })
      }
    }

    // Brands - create dynamically (value in lowercase for backend, display in uppercase)
    if (facets.brands && facets.brands.length > 0) {
      populateFilterSection('brand-list', facets.brands, 'brand', 
        (name) => name.toLowerCase(), // Value in lowercase for backend
        (name) => name.toUpperCase()  // Display in uppercase for user
      )
    }
    
    // Models - create dynamically (extract model name from "Brand Model" format)
    if (facets.models && facets.models.length > 0) {
      const modelFacets = facets.models.map(({ name, count }) => {
        const parts = name.split(' ')
        const model = parts.length >= 2 ? parts.slice(1).join(' ') : name
        return { name: model, count }
      })
      populateFilterSection('model-list', modelFacets, 'model', 
        (name) => name.toLowerCase(), // Value in lowercase for backend
        (name) => name.toUpperCase()  // Display in uppercase for user
      )
    }
    
    // Fuel types - create dynamically
    if (facets.fuel_types && facets.fuel_types.length > 0) {
      const fuelMap = {
        'petrol': tr('PETROL', 'ESSENCE'),
        'gasolina': tr('PETROL', 'ESSENCE'),  // Spanish/Portuguese from Coches.net
        'diesel': tr('DIESEL', 'DIESEL'),
        'diésel': tr('DIESEL', 'DIESEL'),  // Spanish spelling from sources like Coches.net
        'hybrid': tr('HYBRID', 'HYBRIDE'),
        'electric': tr('ELECTRIC', 'ÉLECTRIQUE'),
        'electro': tr('ELECTRIC', 'ÉLECTRIQUE')  // Spanish/Italian from Coches.net
      }
      populateFilterSection('fuel-list', facets.fuel_types, 'fuel', 
        (name) => name.toLowerCase(),
        (name) => fuelMap[name.toLowerCase()] || name.toUpperCase()
      )
    }
    
    // Steering - update counts only (already exists in HTML)
    if (facets.steering && facets.steering.length > 0) {
      facets.steering.forEach(({ name, count }) => {
        const nameUpper = name?.toUpperCase() || ''
        let value = ''
        if (nameUpper === 'LHD' || nameUpper === 'LEFT') value = 'left'
        else if (nameUpper === 'RHD' || nameUpper === 'RIGHT') value = 'right'
        if (value) {
          const checkbox = document.querySelector(`input[name="steering"][value="${value}"]`)
          if (checkbox) {
            const label = checkbox.closest('label')
            if (label) {
              const countSpan = label.querySelector('.text-zinc-400')
              if (countSpan) countSpan.textContent = `(${formatNumber(count)})`
            }
          }
        }
      })
    } else {
      // If no steering facets, it means no listings have steering data
      // This is expected if the scraped data doesn't include steering information
      // Keep the (0) display - it's accurate
    }
    
    // Transmissions - create dynamically
    if (facets.transmissions && facets.transmissions.length > 0) {
      const transmissionMap = {
        'automatic': tr('AUTOMATIC', 'AUTOMATIQUE'),
        'manual': tr('MANUAL', 'MANUELLE')
      }
      populateFilterSection('transmission-list', facets.transmissions, 'transmission',
        (name) => name.toLowerCase(),
        (name) => transmissionMap[name.toLowerCase()] || name.toUpperCase()
      )
    }
    
    // Doors - create dynamically
    if (facets.doors && facets.doors.length > 0) {
      populateFilterSection('doors-list', facets.doors, 'doors', 
        (name) => {
          // Extract number from "X portes" format
          const match = name.match(/(\d+)/)
          return match ? match[1] : name
        },
        (name) => name.toUpperCase()
      )
    }
    
    // Categories - create dynamically
    if (facets.categories && facets.categories.length > 0) {
      populateFilterSection('category-list', facets.categories, 'category',
        (name) => name.toLowerCase(),
        (name) => name.toUpperCase()
      )
    }
    
    // Drivetrains - create dynamically
    if (facets.drivetrains && facets.drivetrains.length > 0) {
      populateFilterSection('drivetrain-list', facets.drivetrains, 'drivetrain',
        (name) => name.toLowerCase(),
        (name) => name.toUpperCase()
      )
    }
    
    // Seller types - create dynamically
    if (facets.seller_types && facets.seller_types.length > 0) {
      const sellerMap = {
        'private': tr('PRIVATE', 'PARTICULIERS'),
        'professional': tr('PROFESSIONAL', 'PROFESSIONNELS')
      }
      populateFilterSection('seller-type-list', facets.seller_types, 'seller-type',
        (name) => name.toLowerCase(),
        (name) => sellerMap[name.toLowerCase()] || name.toUpperCase()
      )
    }
    
    // Versions - create dynamically
    if (facets.versions && facets.versions.length > 0) {
      populateFilterSection('version-list', facets.versions, 'version')
    }
    
    // Trims - create dynamically
    if (facets.trims && facets.trims.length > 0) {
      populateFilterSection('trim-list', facets.trims, 'trim')
    }
    
    // Colors - update tooltips (colors are buttons, not checkboxes)
    if (facets.colors && facets.colors.length > 0) {
      facets.colors.forEach(({ name, count }) => {
        const colorBtn = document.querySelector(`button[data-color="${name.toLowerCase()}"]`)
        if (colorBtn) {
          colorBtn.title = `${name} (${formatNumber(count)})`
        }
      })
    }

    // Publication date - update counts (recent = < 30 days, old = >= 30 days)
    if (facets.publication_date && facets.publication_date.length > 0) {
      facets.publication_date.forEach(({ name, count }) => {
        const checkbox = document.querySelector(`input[name="publication-date"][value="${name}"]`)
        if (checkbox) {
          const label = checkbox.closest('label')
          if (label) {
            const countSpan = label.querySelector('.text-zinc-400')
            if (countSpan) countSpan.textContent = `(${formatNumber(count)})`
          }
        }
      })
    }

    // Keywords - update counts (NOT SPECIFIED, AMG, L1H1)
    if (facets.keywords && facets.keywords.length > 0) {
      facets.keywords.forEach(({ name, count }) => {
        const value = name === '' ? '' : name
        const checkbox = document.querySelector(`input[name="keyword"][value="${value}"]`)
        if (checkbox) {
          const label = checkbox.closest('label')
          if (label) {
            const countSpan = label.querySelector('.text-zinc-400')
            if (countSpan) countSpan.textContent = `(${formatNumber(count)})`
          }
        }
      })
    }

    // Countries - update option counts in dropdown
    if (facets.countries && facets.countries.length > 0) {
      facets.countries.forEach(({ name, count }) => {
        const option = document.querySelector(`#country-filter option[value="${name}"]`)
        if (option) {
          const baseText = option.textContent.replace(/\s*\([^)]*\)\s*$/, '').trim()
          option.textContent = `${baseText} (${formatNumber(count)})`
        }
      })
    }
    
    console.log('Facets loaded successfully', { total: data.total })
  } catch (error) {
    console.error('Error loading facets:', error)
  }
}

// Load initial listings on page load
async function loadInitialListings() {
  try {
    // Wait for searchListings to be available
    let attempts = 0
    const checkAndLoad = setInterval(() => {
      attempts++
      if (window.searchListings) {
        clearInterval(checkAndLoad)
        window.searchListings({}, 1)
      } else if (attempts > 20) {
        clearInterval(checkAndLoad)
        console.warn('searchListings not available after 2 seconds')
      }
    }, 100)
  } catch (error) {
    console.error('Error loading initial listings:', error)
  }
}

function initializeSearch() {
  const searchForm = document.getElementById('search-form')
  const resultsContainer = document.getElementById('results-container')
  const resultsCount = document.getElementById('results-count')
  const quickFilters = document.querySelectorAll('.quick-filter')
  const sortSelect = document.getElementById('sort-by')
  const listingModal = document.getElementById('listing-modal')
  const closeModal = document.getElementById('close-modal')
  const searchQuery = document.getElementById('search-query')
  const autocompleteDropdown = document.getElementById('autocomplete-dropdown')
  const activeFiltersContainer = document.getElementById('active-filters')
  
  // Initialize global variables if not already set
  if (typeof window.currentPage === 'undefined') {
    window.currentPage = 1
  }
  if (typeof window.currentFilters === 'undefined') {
    window.currentFilters = {}
  }
  
  let currentPage = window.currentPage
  let currentFilters = window.currentFilters
  let autocompleteTimeout = null
  let allBrands = ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Peugeot', 'Renault', 'Citroën', 'Ford', 'Opel', 'Toyota', 'Porsche', 'Ferrari', 'Lamborghini', 'Jaguar', 'Land Rover', 'Range Rover', 'MINI', 'Fiat', 'Alfa Romeo', 'Volvo', 'Skoda', 'Seat', 'Hyundai', 'Kia', 'Mazda', 'Nissan', 'Honda', 'Suzuki', 'Dacia', 'DS']
  let allModels = {
    'BMW': ['320d', '520d', 'X3', 'X5', '118d', '320i', '520i', 'X1', 'X7', 'M3', 'M5'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'A-Class', 'GLC', 'CLA', 'S-Class', 'GLE', 'GLA', 'CLS'],
    'Audi': ['A3', 'A4', 'A5', 'Q5', 'Q7', 'A6', 'A8', 'Q3', 'TT'],
    'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touran', 'Polo', 'Touareg', 'Arteon', 'ID.3', 'ID.4'],
    'Porsche': ['Panamera', '911', 'Cayenne', 'Macan', 'Boxster', 'Cayman', 'Panamera Sport Turismo'],
    'Peugeot': ['208', '308', '3008', '5008', '2008', '508', '5008'],
    'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic', 'Talisman', 'Espace']
  }
  
  // Dynamic search with autocomplete
  if (searchQuery) {
    searchQuery.addEventListener('input', (e) => {
      const query = e.target.value.trim()
      
      // Clear previous timeout
      if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout)
      }
      
      // Show autocomplete after 200ms
      autocompleteTimeout = setTimeout(() => {
        if (query.length >= 2) {
          showAutocomplete(query)
        } else {
          hideAutocomplete()
        }
      }, 200)
      
      // Auto-update filters and search if query matches brand/model
      if (query.length >= 2) {
        updateFiltersFromQuery(query)
        // Auto-search with debouncing (1 second)
        clearTimeout(window.searchDebounceTimeout)
        window.searchDebounceTimeout = setTimeout(() => {
          if (searchQuery.value.trim() === query) {
            window.currentPage = 1
            currentPage = 1
            currentFilters = getFilters()
            window.currentFilters = currentFilters
            if (window.searchListings) window.searchListings(currentFilters, currentPage)
          }
        }, 1000)
      }
    })
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchQuery.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        hideAutocomplete()
      }
    })
    
    // Handle Enter key
    searchQuery.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        hideAutocomplete()
        window.currentPage = 1
        currentPage = 1
        currentFilters = getFilters()
        window.currentFilters = currentFilters
        if (window.searchListings) window.searchListings(currentFilters, currentPage)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const firstSuggestion = autocompleteDropdown.querySelector('.suggestion-item')
        if (firstSuggestion) firstSuggestion.focus()
      }
    })
  }
  
  // Handle search button
  const searchButton = document.getElementById('search-button')
  if (searchButton) {
    searchButton.addEventListener('click', async () => {
      hideAutocomplete()
      currentPage = 1
      currentFilters = getFilters()
      if (window.searchListings) await window.searchListings(currentFilters, currentPage)
    })
  }
  
  // Handle form submission
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      hideAutocomplete()
      currentPage = 1
      currentFilters = getFilters()
      if (window.searchListings) await window.searchListings(currentFilters, currentPage)
    })
  }
  
  // Show autocomplete suggestions
  function showAutocomplete(query) {
    const suggestions = []
    const queryLower = query.toLowerCase()
    
    // Match brands
    allBrands.forEach(brand => {
      if (brand.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'brand',
          value: brand,
          label: brand,
          count: 0 // Will be updated from facets API
        })
      }
    })
    
    // Match models (check all brands)
    Object.entries(allModels).forEach(([brand, models]) => {
      models.forEach(model => {
        if (model.toLowerCase().includes(queryLower)) {
          suggestions.push({
            type: 'model',
            value: model,
            label: `${brand} ${model}`,
            brand: brand,
            count: 0 // Will be updated from facets API
          })
        }
      })
    })
    
    // Limit to 8 suggestions
    const limitedSuggestions = suggestions.slice(0, 8)
    
    if (limitedSuggestions.length > 0) {
      let html = ''
      limitedSuggestions.forEach((suggestion, index) => {
        const icon = suggestion.type === 'brand' ? '🏷️' : '🚗'
        html += `
          <div class="suggestion-item px-4 py-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 flex items-center justify-between ${index === 0 ? 'bg-zinc-50' : ''}"
               data-type="${suggestion.type}" 
               data-value="${suggestion.value}" 
               data-brand="${suggestion.brand || ''}"
               tabindex="0">
            <div class="flex items-center space-x-3">
              <span class="text-xl">${icon}</span>
              <div>
                <div class="font-medium text-zinc-900 text-sm">${suggestion.label}</div>
                <div class="text-xs text-zinc-400">${suggestion.type === 'brand' ? tr('Brand', 'Marque') : tr('Model', 'Modèle')}</div>
              </div>
            </div>
            <span class="text-sm text-zinc-400">${formatNumber(suggestion.count)}</span>
          </div>
        `
      })
      autocompleteDropdown.innerHTML = html
      autocompleteDropdown.classList.remove('hidden')
      
      // Add click handlers
      autocompleteDropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          selectSuggestion(item.dataset.type, item.dataset.value, item.dataset.brand)
        })
        
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            selectSuggestion(item.dataset.type, item.dataset.value, item.dataset.brand)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const next = item.nextElementSibling
            if (next) next.focus()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prev = item.previousElementSibling
            if (prev) prev.focus()
            else searchQuery.focus()
          }
        })
      })
    } else {
      hideAutocomplete()
    }
  }
  
  // Hide autocomplete
  function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden')
  }
  
  // Select suggestion and update filters
  function selectSuggestion(type, value, brand = '') {
    if (type === 'brand') {
      // Check the brand checkbox (value in lowercase for backend)
      const brandValue = value.toLowerCase()
      const brandCheckbox = document.querySelector(`input[name="brand"][value="${brandValue}"]`)
      if (brandCheckbox) {
        brandCheckbox.checked = true
      } else {
        // Create checkbox if it doesn't exist
        const brandList = document.getElementById('brand-list')
        if (brandList) {
          const label = document.createElement('label')
          label.className = 'flex items-center space-x-2 cursor-pointer'
          label.innerHTML = `
            <input type="checkbox" name="brand" value="${brandValue}" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900" checked>
            <span class="text-sm text-zinc-700">${value.toUpperCase()} <span class="text-zinc-400">(0)</span></span>
          `
          brandList.appendChild(label)
        }
      }
      searchQuery.value = value
    } else if (type === 'model') {
      // Check the model checkbox (value in lowercase for backend)
      const modelValue = value.toLowerCase()
      const modelCheckbox = document.querySelector(`input[name="model"][value="${modelValue}"]`)
      if (modelCheckbox) {
        modelCheckbox.checked = true
      } else {
        // Create checkbox if it doesn't exist
        const modelList = document.getElementById('model-list')
        if (modelList) {
          const label = document.createElement('label')
          label.className = 'flex items-center space-x-2 cursor-pointer'
          label.innerHTML = `
            <input type="checkbox" name="model" value="${modelValue}" class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900" checked>
            <span class="text-sm text-zinc-700">${value.toUpperCase()} <span class="text-zinc-400">(0)</span></span>
          `
          modelList.appendChild(label)
        }
      }
      
      // Also check the brand if provided (value in lowercase)
      if (brand) {
        const brandValue = brand.toLowerCase()
        const brandCheckbox = document.querySelector(`input[name="brand"][value="${brandValue}"]`)
        if (brandCheckbox) {
          brandCheckbox.checked = true
        }
      }
      
      searchQuery.value = brand ? `${brand} ${value}` : value
    }
    
    hideAutocomplete()
    if (window.updateActiveFilters) window.updateActiveFilters()
    window.currentPage = 1
    currentPage = 1
    currentFilters = getFilters()
    window.currentFilters = currentFilters
    searchListings(currentFilters, currentPage)
  }
  
  // Update filters based on search query
  function updateFiltersFromQuery(query) {
    const queryLower = query.toLowerCase()
    let filtersUpdated = false
    
    // Try to match brand (value in lowercase)
    const matchedBrand = allBrands.find(brand => brand.toLowerCase() === queryLower || brand.toLowerCase().startsWith(queryLower))
    if (matchedBrand) {
      const brandValue = matchedBrand.toLowerCase()
      const brandCheckbox = document.querySelector(`input[name="brand"][value="${brandValue}"]`)
      if (brandCheckbox && !brandCheckbox.checked) {
        brandCheckbox.checked = true
        filtersUpdated = true
      }
    }
    
    // Try to match model (value in lowercase)
    Object.entries(allModels).forEach(([brand, models]) => {
      models.forEach(model => {
        if (model.toLowerCase() === queryLower || model.toLowerCase().startsWith(queryLower)) {
          const modelValue = model.toLowerCase()
          const modelCheckbox = document.querySelector(`input[name="model"][value="${modelValue}"]`)
          if (modelCheckbox && !modelCheckbox.checked) {
            modelCheckbox.checked = true
            // Also check brand (value in lowercase)
            const brandValue = brand.toLowerCase()
            const brandCheckbox = document.querySelector(`input[name="brand"][value="${brandValue}"]`)
            if (brandCheckbox) brandCheckbox.checked = true
            filtersUpdated = true
          }
        }
      })
    })
    
    if (filtersUpdated && window.updateActiveFilters) {
      window.updateActiveFilters()
    }
  }
  
  // Update active filters display
  function updateActiveFilters() {
    const activeFilters = []
    
    // Get checked brands
    document.querySelectorAll('input[name="brand"]:checked').forEach(cb => {
      activeFilters.push({
        type: 'brand',
        value: cb.value,
        label: cb.value
      })
    })
    
    // Get checked models
    document.querySelectorAll('input[name="model"]:checked').forEach(cb => {
      activeFilters.push({
        type: 'model',
        value: cb.value,
        label: cb.value
      })
    })
    
    // Get checked fuel types
    document.querySelectorAll('input[name="fuel"]:checked').forEach(cb => {
      const labels = {
        'petrol': tr('Petrol', 'Essence'),
        'diesel': tr('Diesel', 'Diesel'),
        'hybrid': tr('Hybrid', 'Hybride'),
        'electric': tr('Electric', 'Électrique')
      }
      activeFilters.push({
        type: 'fuel',
        value: cb.value,
        label: labels[cb.value] || cb.value
      })
    })
    
    // Get price range
    const priceFrom = document.getElementById('price-from')?.value
    const priceTo = document.getElementById('price-to')?.value
    if (priceFrom && priceTo && (priceFrom !== '1' || priceTo !== '400000')) {
      activeFilters.push({
        type: 'price',
        value: `${priceFrom}-${priceTo}`,
        label: `${tr('Price', 'Prix')}: ${formatNumber(parseInt(priceFrom))}€ - ${formatNumber(parseInt(priceTo))}€`
      })
    }
    
    // Display active filters
    if (activeFilters.length > 0) {
      let html = `<span class="text-xs text-zinc-400 mr-1">${tr('Active filters', 'Filtres actifs')}:</span>`
      activeFilters.forEach(filter => {
        html += `
          <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-zinc-100 text-zinc-700 border border-zinc-200">
            ${filter.label}
            <button onclick="removeFilter('${filter.type}', '${filter.value}')" class="ml-1.5 text-zinc-400 hover:text-zinc-700">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </span>
        `
      })
      activeFiltersContainer.innerHTML = html
    } else {
      activeFiltersContainer.innerHTML = ''
    }
  }
  
  // Make updateActiveFilters available globally
  window.updateActiveFilters = updateActiveFilters
  
  // Remove filter function (global)
  window.removeFilter = function(type, value) {
    if (type === 'brand') {
      const checkbox = document.querySelector(`input[name="brand"][value="${value}"]`)
      if (checkbox) checkbox.checked = false
    } else if (type === 'model') {
      const checkbox = document.querySelector(`input[name="model"][value="${value}"]`)
      if (checkbox) checkbox.checked = false
    } else if (type === 'fuel') {
      const checkbox = document.querySelector(`input[name="fuel"][value="${value}"]`)
      if (checkbox) checkbox.checked = false
    } else if (type === 'price') {
      document.getElementById('price-from').value = 1
      document.getElementById('price-to').value = 400000
      document.getElementById('price-min').value = 1
      document.getElementById('price-max').value = 400000
    }
    if (window.updateActiveFilters) window.updateActiveFilters()
    window.currentPage = 1
    currentPage = 1
    currentFilters = getFilters()
    window.currentFilters = currentFilters
    searchListings(currentFilters, currentPage)
  }
  
  // Handle quick filters
  quickFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.brand) {
        document.getElementById('brand').value = btn.dataset.brand
      }
      if (btn.dataset.price) {
        document.getElementById('max-price').value = btn.dataset.price
      }
      if (btn.dataset.year) {
        document.getElementById('min-year').value = btn.dataset.year
      }
      currentFilters = getFilters()
      window.currentFilters = currentFilters
      window.currentPage = 1
      currentPage = 1
      if (window.searchListings) window.searchListings(currentFilters, currentPage)
    })
  })
  
  // Handle sort
  sortSelect.addEventListener('change', () => {
    // Clear cache when sort changes to ensure fresh results
    apiCache.clear()
    const filters = getFilters() // Get fresh filters including new sort value
    window.currentPage = 1
    currentPage = 1
    if (window.searchListings) window.searchListings(filters, 1)
  })
  
  // Handle modal
  closeModal.addEventListener('click', () => {
    listingModal.classList.add('hidden')
  })
  
  listingModal.addEventListener('click', (e) => {
    if (e.target === listingModal) {
      listingModal.classList.add('hidden')
    }
  })
  
  // Get filters from form
  function getFilters() {
    const filters = {
      query: document.getElementById('search-query')?.value || '',
      sort: document.getElementById('sort-by')?.value || 'date'
    }
    
    // Get checked brands - normalize to lowercase for backend
    const brands = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value.toLowerCase())
    if (brands.length > 0) filters.brand = brands
    
    // Get checked models - normalize to lowercase for backend
    const models = Array.from(document.querySelectorAll('input[name="model"]:checked')).map(cb => cb.value.toLowerCase())
    if (models.length > 0) filters.model = models
    
    // Get checked fuel types
    const fuels = Array.from(document.querySelectorAll('input[name="fuel"]:checked')).map(cb => cb.value)
    if (fuels.length > 0) filters.fuel_type = fuels
    
    // Get steering
    const steering = Array.from(document.querySelectorAll('input[name="steering"]:checked')).map(cb => cb.value)
    if (steering.length > 0) filters.steering = steering
    
    // Get transmission
    const transmission = Array.from(document.querySelectorAll('input[name="transmission"]:checked')).map(cb => cb.value)
    if (transmission.length > 0) filters.transmission = transmission
    
    // Get doors
    const doors = Array.from(document.querySelectorAll('input[name="doors"]:checked')).map(cb => cb.value)
    if (doors.length > 0) filters.doors = doors
    
    // Get seller type
    const sellerType = Array.from(document.querySelectorAll('input[name="seller-type"]:checked')).map(cb => cb.value)
    if (sellerType.length > 0) filters.seller_type = sellerType
    
    // Get price range
    const priceFrom = document.getElementById('price-from')?.value
    const priceTo = document.getElementById('price-to')?.value
    if (priceFrom && priceFrom !== '1') filters.min_price = priceFrom
    if (priceTo && priceTo !== '400000') filters.max_price = priceTo
    
    // Get mileage range
    const mileageFrom = document.getElementById('mileage-from')?.value
    const mileageTo = document.getElementById('mileage-to')?.value
    if (mileageFrom && mileageFrom !== '1') filters.min_mileage = mileageFrom
    if (mileageTo && mileageTo !== '500000') filters.max_mileage = mileageTo
    
    // Get year range
    const yearFrom = document.getElementById('year-from')?.value
    const yearTo = document.getElementById('year-to')?.value
    if (yearFrom && yearFrom !== '1910') filters.min_year = yearFrom
    if (yearTo && yearTo !== '2026') filters.max_year = yearTo
    
    // Get selected color
    const colorBtn = document.querySelector('button[data-color].border-zinc-900')
    if (colorBtn && colorBtn.dataset.color && colorBtn.dataset.color !== 'any') {
      filters.color = colorBtn.dataset.color
    }
    
    // Get version
    const versions = Array.from(document.querySelectorAll('input[name="version"]:checked')).map(cb => cb.value).filter(v => v)
    if (versions.length > 0) filters.version = versions
    
    // Get trim (finition)
    const trims = Array.from(document.querySelectorAll('input[name="trim"]:checked')).map(cb => cb.value).filter(v => v)
    if (trims.length > 0) filters.trim = trims
    
    // Get keywords
    const keywords = Array.from(document.querySelectorAll('input[name="keyword"]:checked')).map(cb => cb.value)
    if (keywords.length > 0 && keywords[0]) filters.keyword = keywords[0]

    // Get publication date (recent = < 30 days, old = >= 30 days)
    const publicationDate = Array.from(document.querySelectorAll('input[name="publication-date"]:checked')).map(cb => cb.value)
    if (publicationDate.length > 0 && publicationDate[0]) filters.publication_date = publicationDate[0]

    // Get country
    const country = document.getElementById('country-filter')?.value
    if (country) filters.country = country
    
    return filters
  }
  
  // Make getFilters available globally
  window.getFilters = getFilters
  // Update global currentFilters reference
  window.currentFilters = currentFilters
  
  // Search listings (make it available globally)
  async function searchListings(filters, page = 1, forceRefresh = false) {
    try {
      // Refresh facet counts when filters change (page 1 = new search)
      if (page === 1 && typeof loadFacets === 'function') {
        loadFacets().catch(err => console.warn('Facets refresh failed:', err))
      }
      // Show skeleton loaders
      resultsContainer.innerHTML = Array.from({ length: 8 }, () => `
        <div class="listing-card bg-white rounded-xl border border-zinc-100 overflow-hidden animate-pulse">
          <div class="h-48 bg-zinc-100"></div>
          <div class="p-4">
            <div class="h-5 bg-zinc-100 rounded mb-2"></div>
            <div class="h-7 bg-zinc-100 rounded mb-3 w-1/2"></div>
            <div class="flex gap-2">
              <div class="h-3 bg-zinc-100 rounded w-12"></div>
              <div class="h-3 bg-zinc-100 rounded w-16"></div>
              <div class="h-3 bg-zinc-100 rounded w-10"></div>
            </div>
          </div>
        </div>
      `).join('')
      
      // Build query params
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            // For arrays, append each value
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value)
          }
        }
      })
      params.append('limit', '24')
      params.append('offset', ((page - 1) * 24).toString())
      
      // Save filters to URL
      const url = new URL(window.location)
      url.hash = '#/search'
      url.search = params.toString()
      window.history.replaceState({}, '', url)
      
      // Call API - no cache for search so total count stays fresh during imports
      const apiUrl = '/api/v1/listings/search'

      try {
        const response = await fetch(apiUrl + '?' + params.toString())
        let data
        try {
          data = await response.json()
        } catch {
          data = {}
        }
        
        if (!response.ok) {
          const serverMessage = data?.error?.message || (typeof data?.error === 'string' ? data.error : null)
          throw new Error(serverMessage || `HTTP error! status: ${response.status}`)
        }
        
        displayResults(data.listings || [], data.total || 0, page)
      } catch (error) {
        console.error('Search error:', error)
        // Show error message
        resultsContainer.innerHTML = `
          <div class="col-span-full text-center py-12">
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-lg font-medium text-red-800 mb-2">${tr('Search error', 'Erreur de recherche')}</h3>
              <p class="text-sm text-red-600 mb-4">${error.message || tr('An error occurred during the search.', 'Une erreur est survenue lors de la recherche.')}</p>
              <button onclick="window.searchListings(window.currentFilters || {}, 1)" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
                ${tr('Retry', 'Réessayer')}
              </button>
            </div>
          </div>
        `
        return
      }
    } catch (error) {
      console.error('Search error:', error)
      resultsContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-red-800 mb-2">${tr('Search error', 'Erreur de recherche')}</h3>
            <p class="text-sm text-red-600 mb-4">${tr('An error occurred during the search.', 'Une erreur est survenue lors de la recherche.')}</p>
            <button onclick="window.searchListings(window.currentFilters || {}, 1)" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
              ${tr('Retry', 'Réessayer')}
            </button>
          </div>
        </div>
      `
    }
    window.currentFilters = filters
    currentFilters = filters
    if (window.updateActiveFilters) window.updateActiveFilters()
    
    // Close mobile filters after search
    if (window.innerWidth < 1024) {
      window.closeMobileFilters()
    }
  }
  
  // Make searchListings available globally AFTER it's defined
  window.searchListings = searchListings
  
  // Normalize fuel/transmission for fallback (matches backend canonical grouping)
  function normalizeFuelForFallback(raw) {
    const k = (raw || '').toLowerCase()
    if (/diesel/i.test(k)) return 'DIESEL'
    if (/benz|petrol|gasolin|essence|bensin/i.test(k)) return 'PETROL'
    if (/elektro|elektrisch|electr|elettric|eléctric/i.test(k) && /benz|petrol/i.test(k)) return 'HYBRID'
    if (/elektro|elektrisch|electr|elettric|eléctric/i.test(k)) return 'ELECTRIC'
    if (/gpl|lpg|autogas/i.test(k)) return 'LPG'
    if (/hybrid|plug-in|plugin/i.test(k)) return 'HYBRID'
    return (raw || '').toUpperCase()
  }
  function normalizeTransmissionForFallback(raw) {
    const k = (raw || '').toLowerCase()
    if (/auto|automat|tronic|dsg|schalt|handges/i.test(k)) return /schalt|handges|manu|bvm/i.test(k) ? 'MANUAL' : 'AUTOMATIC'
    if (/manu|schalt|handges|bvm/i.test(k)) return 'MANUAL'
    return (raw || '').toUpperCase()
  }

  // Fallback: populate filters from search results when facets API fails or returns empty
  function populateFiltersFromListings(listings) {
    if (!listings || listings.length === 0) return
    const brands = {}
    const countries = {}
    const fuelTypes = {}
    const transmissionTypes = {}
    listings.forEach(l => {
      if (l.brand) brands[l.brand] = (brands[l.brand] || 0) + 1
      if (l.location_country) countries[l.location_country] = (countries[l.location_country] || 0) + 1
      if (l.fuel_type) {
        const c = normalizeFuelForFallback(l.fuel_type)
        fuelTypes[c] = (fuelTypes[c] || 0) + 1
      }
      if (l.transmission) {
        const c = normalizeTransmissionForFallback(l.transmission)
        transmissionTypes[c] = (transmissionTypes[c] || 0) + 1
      }
    })
    const countryNames = { FR: 'France', SE: 'Suède', DE: 'Allemagne', BE: 'Belgique', NL: 'Pays-Bas', IT: 'Italie', ES: 'Espagne', AT: 'Autriche', CH: 'Suisse' }
    const brandList = document.querySelector('#brand-list')
    if (brandList && Object.keys(brands).length > 0) {
      if (!brandList.querySelector('label')) {
        populateFilterSection('brand-list', Object.entries(brands).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), 'brand', n => n.toLowerCase(), n => n.toUpperCase())
      }
    }
    const countrySelect = document.getElementById('country-filter')
    if (countrySelect && Object.keys(countries).length > 0 && countrySelect.options.length <= 1) {
      countrySelect.innerHTML = ''
      const allOpt = document.createElement('option')
      allOpt.value = ''
      allOpt.textContent = tr('All countries', 'Tous les pays')
      countrySelect.appendChild(allOpt)
      Object.entries(countries).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
        const opt = document.createElement('option')
        opt.value = code
        opt.textContent = `${countryNames[code] || code} (${formatNumber(count)})`
        countrySelect.appendChild(opt)
      })
    }
    const fuelList = document.querySelector('#fuel-list')
    if (fuelList && Object.keys(fuelTypes).length > 0) {
      if (!fuelList.querySelector('label')) {
        const fuelMap = { petrol: tr('PETROL', 'ESSENCE'), diesel: tr('DIESEL', 'DIESEL'), hybrid: tr('HYBRID', 'HYBRIDE'), electric: tr('ELECTRIC', 'ÉLECTRIQUE'), lpg: tr('LPG', 'LPG'), cng: tr('CNG', 'CNG') }
        populateFilterSection('fuel-list', Object.entries(fuelTypes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), 'fuel', n => n.toLowerCase(), n => fuelMap[n?.toLowerCase()] || n?.toUpperCase())
      }
    }
    const transmissionList = document.querySelector('#transmission-list')
    if (transmissionList && Object.keys(transmissionTypes).length > 0) {
      if (!transmissionList.querySelector('label')) {
        const transmissionMap = { automatic: tr('AUTOMATIC', 'AUTOMATIQUE'), manual: tr('MANUAL', 'MANUELLE') }
        populateFilterSection('transmission-list', Object.entries(transmissionTypes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), 'transmission', n => n.toLowerCase(), n => transmissionMap[n?.toLowerCase()] || n?.toUpperCase())
      }
    }
    // Steering counts come only from facets API (never from search results - avoids showing page-size counts like 24 instead of full DB counts)
  }

  // Display results with virtual scrolling for large lists
  function displayResults(listings, total, page) {
    resultsCount.textContent = formatNumber(total) + ' ' + tr('listings found', 'annonces trouvées')
    populateFiltersFromListings(listings)
    if (listings.length === 0) {
      resultsContainer.innerHTML = `<div class="col-span-full text-center py-16"><svg class="mx-auto h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="mt-3 text-sm text-zinc-500">${tr('No results found', 'Aucun résultat trouvé')}</p><p class="text-xs text-zinc-400 mt-1">${tr('Try modifying your search criteria', 'Essayez de modifier vos critères de recherche')}</p></div>`
      return
    }
    
    // For large lists (>100 items), use virtual scrolling
    // For smaller lists, render all at once
    if (listings.length > 100) {
      renderWithVirtualScrolling(listings, total, page)
    } else {
      renderAllListings(listings, total, page)
    }
  }
  
  // Render all listings at once (for small lists)
  function renderAllListings(listings, total, page) {
    resultsContainer.innerHTML = listings.map(listing => createListingCard(listing)).join('')
    attachCardHandlers()
    initializeLazyLoading()
    updatePagination(total, page)
  }
  
  // Render with virtual scrolling (for large lists)
  function renderWithVirtualScrolling(listings, total, page) {
    // Clear container
    resultsContainer.innerHTML = ''
    
    // Create a container for virtual scrolling
    const virtualContainer = document.createElement('div')
    virtualContainer.className = 'relative'
    virtualContainer.style.minHeight = `${Math.ceil(listings.length / 3) * 400}px` // Estimate height
    resultsContainer.appendChild(virtualContainer)
    
    // Render initial visible items (first 30)
    const itemsPerRow = window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3
    const initialItems = Math.min(30, listings.length)
    const initialHTML = listings.slice(0, initialItems).map(listing => createListingCard(listing)).join('')
    virtualContainer.innerHTML = initialHTML
    
    attachCardHandlers()
    initializeLazyLoading()
    
    // Use IntersectionObserver for infinite scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentCount = virtualContainer.querySelectorAll('.listing-card').length
          if (currentCount < listings.length) {
            const nextBatch = listings.slice(currentCount, currentCount + 20)
            const nextHTML = nextBatch.map(listing => createListingCard(listing)).join('')
            virtualContainer.insertAdjacentHTML('beforeend', nextHTML)
            attachCardHandlers()
            initializeLazyLoading()
          }
        }
      })
    }, { rootMargin: '200px' })
    
    // Observe the last card
    const lastCard = virtualContainer.querySelector('.listing-card:last-child')
    if (lastCard) {
      observer.observe(lastCard)
    }
    
    updatePagination(total, page)
  }
  
  // Attach click handlers to listing cards
  function attachCardHandlers() {
    document.querySelectorAll('.listing-card').forEach(card => {
      // Only attach if not already attached
      if (!card.dataset.handlerAttached) {
        card.dataset.handlerAttached = 'true'
        card.addEventListener('click', (e) => {
          if (e.target.closest('a')) {
            return
          }
          const listingId = card.dataset.id
          if (listingId) {
            const nextPath = `/listing/${listingId}`
            window.history.pushState({}, '', nextPath)
            window.dispatchEvent(new PopStateEvent('popstate'))
          }
        })
      }
    })
  }
  
  // Lazy loading for images
  function initializeLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image[data-src]')
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            const placeholder = img.nextElementSibling
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              img.classList.add('opacity-0')
              img.onload = () => {
                img.classList.remove('opacity-0')
                img.classList.add('opacity-100', 'transition-opacity', 'duration-300')
                if (placeholder) placeholder.remove()
              }
            }
            observer.unobserve(img)
          }
        })
      }, {
        rootMargin: '50px'
      })
      
      lazyImages.forEach(img => imageObserver.observe(img))
    } else {
      // Fallback for browsers without IntersectionObserver
      lazyImages.forEach(img => {
        if (img.dataset.src) {
          img.src = img.dataset.src
          img.removeAttribute('data-src')
        }
      })
    }
  }
  
  // Extract data from specifications helper (same as in listing-details.js)
  function extractFromSpecifications(listing) {
    let specs = listing.specifications || {}
    if (Array.isArray(specs)) {
      const specsObj = {}
      specs.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          if (item.key && item.value !== undefined) {
            specsObj[item.key] = item.value
          } else {
            Object.assign(specsObj, item)
          }
        } else {
          specsObj[index] = item
        }
      })
      specs = specsObj
    }
    
    const extracted = {}
    if ((!listing.mileage || listing.mileage === 0) && specs.Mileage) {
      const mileageStr = String(specs.Mileage).replace(/,/g, '')
      const mileageMatch = mileageStr.match(/(\d+)/)
      if (mileageMatch) {
        extracted.mileage = parseInt(mileageMatch[1])
      }
    }
    return extracted
  }
  
  // Create listing card
  function createListingCard(listing) {
    const displayCurrency = listing.currency || 'EUR'
    // Extract missing data from specifications
    const extracted = extractFromSpecifications(listing)
    
    // Extract mileage from specifications if not available in listing
    let mileageValue = listing.mileage
    if ((!mileageValue || mileageValue === 0) && listing.specifications) {
      const specs = listing.specifications
      const mileageStr = specs.Mileage || specs.mileage || specs['Mileage'] || null
      if (mileageStr) {
        // Extract number from "66,427 km" or "66427 km" format
        const mileageMatch = String(mileageStr).replace(/,/g, '').match(/(\d+)/)
        if (mileageMatch) {
          mileageValue = parseInt(mileageMatch[1])
        }
      }
    }
    
    const enrichedListing = {
      ...listing,
      mileage: mileageValue || extracted.mileage || 0,
      fuel_type: listing.fuel_type || extracted.fuel_type,
      transmission: listing.transmission || extracted.transmission,
      doors: listing.doors || extracted.doors,
      power_hp: listing.power_hp || extracted.power_hp
    }
    
    // Format price - use market_price as fallback if price is 0
    const displayPrice = (listing.price && listing.price > 0) 
      ? listing.price 
      : (listing.market_price && listing.market_price > 0 ? listing.market_price : 0)
    const price = displayPrice > 0
      ? formatCurrencyLocale(displayPrice, displayCurrency)
      : tr('Price on request', 'Prix sur demande')
    
    // Format mileage - extract from specifications if needed, always show if available
    let mileage = null
    // First try enrichedListing.mileage (already extracted)
    if (enrichedListing.mileage && enrichedListing.mileage > 0) {
      mileage = `${formatNumber(enrichedListing.mileage)} km`
    } else if (listing.mileage && listing.mileage > 0) {
      // Fallback to listing.mileage directly
      mileage = `${formatNumber(listing.mileage)} km`
    } else if (listing.specifications) {
      // Try to extract from specifications - check multiple possible keys
      const specs = listing.specifications
      const mileageStr = specs.Mileage || specs.mileage || specs['Mileage'] || specs['Kilométrage'] || specs.kilometrage || specs.km || null
      if (mileageStr) {
        // Extract number from various formats: "66,427 km", "66427 km", "66 427 km", etc.
        const cleanedStr = String(mileageStr).replace(/[^\d]/g, '')
        if (cleanedStr && cleanedStr.length > 0) {
          const mileageNum = parseInt(cleanedStr)
          if (mileageNum > 0) {
            mileage = `${formatNumber(mileageNum)} km`
          }
        }
      }
    }
    
    // Get source (try source_platform first, then source)
    const source = listing.source_platform || listing.source || 'unknown'
    const sourceIcon = getSourceIcon(source)
    const sourceName = getSourceName(source)
    const marketPrice = listing.market_price ? formatCurrencyLocale(listing.market_price, listing.currency || 'EUR') : null
    const postedDate = formatDateLocale(listing.posted_date)
    const imageUrl = getListingImage(listing.images)
    const hasImage = !!imageUrl
    
    let cardHTML = '<div class="listing-card bg-white rounded-xl cursor-pointer border border-zinc-100 hover:border-zinc-200 overflow-hidden transition-colors duration-200" data-id="' + listing.id + '">'

    // Image section with lazy loading - absolute positioning ensures no letterboxing
    cardHTML += '<div class="relative aspect-[4/3] bg-zinc-100 overflow-hidden">'
    if (hasImage) {
      const fallbackUrl = getPlaceholderImageUrl(listing.brand, listing.model, 800, 600)
      cardHTML += '<img data-src="' + imageUrl + '" alt="' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '" class="lazy-image absolute inset-0 w-full h-full object-cover object-center block" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="if(this.naturalWidth<150||this.naturalHeight<150){this.style.display=\'none\'}" onerror="this.onerror=null; this.src=\'' + fallbackUrl + '\'; this.classList.add(\'opacity-50\')">'
      cardHTML += '<div class="absolute inset-0 bg-zinc-100 animate-pulse lazy-placeholder"></div>'
    } else {
      cardHTML += '<div class="w-full h-full flex items-center justify-center text-zinc-300"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
    }
    
    // Source badge (+ "X sites" when multi-source)
    const sourcesCount = (listing.sources && listing.sources.length) || 0
    cardHTML += '<div class="absolute top-2 right-2 flex items-center space-x-1 bg-white/90 px-2 py-1 rounded-md text-xs">'
    cardHTML += '<span>' + sourceIcon + '</span>'
    cardHTML += '<span class="text-zinc-600">' + sourceName + (sourcesCount > 1 ? ' · ' + sourcesCount + ' ' + tr('sites', 'sites') : '') + '</span>'
    cardHTML += '</div>'

    // Market price badge with confidence inline
    if (marketPrice) {
      cardHTML += '<div class="absolute bottom-2 left-2 bg-zinc-900 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">'
      cardHTML += '<span>' + tr('Market price', 'Prix marché') + ': ' + marketPrice + '</span>'
      if (listing.confidence_index) {
        const confidence = listing.confidence_index
        let confColor = 'text-red-200'
        if (confidence >= 70) {
          confColor = 'text-green-200'
        } else if (confidence >= 40) {
          confColor = 'text-yellow-200'
        }
        cardHTML += `<span class="${confColor}">${confidence}%</span>`
      }
      cardHTML += '</div>'
    }
    
    cardHTML += '</div>'
    
    // Content section
    cardHTML += '<div class="p-4">'
    
    // Title on first line
    cardHTML += '<h3 class="text-sm font-semibold text-zinc-900 mb-1.5">' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '</h3>'

    // Price on second line
    cardHTML += '<div class="mb-2.5 flex items-center gap-2 flex-wrap">'
    cardHTML += '<span class="text-xl font-bold text-zinc-900">' + price + '</span>'
    
    // Price drop badge (if price dropped in last 7 days and drop > 5%)
    if (listing.price_drop_pct && listing.price_drop_pct >= 5 && listing.last_price_drop_date) {
      const dropDate = new Date(listing.last_price_drop_date)
      const daysSinceDrop = Math.floor((new Date() - dropDate) / (1000 * 60 * 60 * 24))
      
      if (daysSinceDrop <= 7) {
        const dropAmount = listing.price_drop_amount || 0
        const dropPct = Math.round(listing.price_drop_pct)
        const dropAmountFormatted = formatCurrencyLocale(dropAmount, listing.currency || 'EUR')
        cardHTML += '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">'
        cardHTML += '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>'
        cardHTML += tr('Price dropped', 'Prix baissé') + ' -' + dropPct + '%'
        cardHTML += '</span>'
      }
    }
    
    cardHTML += '</div>'
    
    // Format location - show city if available, otherwise just country
    const locationCity = listing.location_city || listing.location?.city || listing.location_region
    const locationCountry = listing.location_country || listing.location?.country || 'FR'
    
    // Try to extract postal code from specifications
    const specs = listing.specifications || {}
    const postalCode = specs['Postal Code'] || specs.postalCode || specs.postal_code || specs.zip || specs.zipCode || null
    
    // Build location display: city + postal code (if available) + country
    let locationDisplay = locationCountry
    if (locationCity) {
      locationDisplay = locationCity
      if (postalCode) {
        locationDisplay = postalCode + ' ' + locationCity
      }
      locationDisplay += ', ' + locationCountry
    }
    
    // Format fuel type for display
    const fuelTypeMap = {
      'petrol': tr('PETROL', 'ESSENCE'),
      'gasolina': tr('PETROL', 'ESSENCE'),
      'diesel': tr('DIESEL', 'DIESEL'),
      'diésel': tr('DIESEL', 'DIESEL'),
      'hybrid': tr('HYBRID', 'HYBRIDE'),
      'electric': tr('ELECTRIC', 'ÉLECTRIQUE'),
      'electro': tr('ELECTRIC', 'ÉLECTRIQUE'),
      'electro/gasolina': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE'),
      'electro/gasoline': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE')
    };
    const rawFuel = enrichedListing.fuel_type ? enrichedListing.fuel_type.toLowerCase().trim() : ''
    const fuelTypeDisplay = rawFuel
      ? (fuelTypeMap[rawFuel] || rawFuel.split(/[/\s]+/).map(p => fuelTypeMap[p.trim()] || p.toUpperCase()).join('/'))
      : null;
    
    // Format transmission for display
    const transmissionMap = {
      'automatic': tr('AUTOMATIC', 'AUTOMATIQUE'),
      'manual': tr('MANUAL', 'MANUELLE')
    };
    const transmissionDisplay = enrichedListing.transmission 
      ? (transmissionMap[enrichedListing.transmission.toLowerCase()] || enrichedListing.transmission.toUpperCase())
      : null;
    
    // Details grid - only show available information (Year, Mileage, Fuel, Location)
    cardHTML += '<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 mb-2">'
    cardHTML += '<span>' + listing.year + '</span>'
    if (mileage) {
      cardHTML += '<span>' + mileage + '</span>'
    }
    if (fuelTypeDisplay) {
      cardHTML += '<span>' + fuelTypeDisplay + '</span>'
    }
    if (transmissionDisplay) {
      cardHTML += '<span>' + transmissionDisplay + '</span>'
    }
    if (locationDisplay) {
      cardHTML += '<span class="truncate max-w-[160px]">' + locationDisplay + '</span>'
    }
    cardHTML += '</div>'

    // Footer
    cardHTML += '<div class="flex items-center justify-between pt-2.5 border-t border-zinc-100">'
    cardHTML += '<span class="text-xs text-zinc-400">' + postedDate + '</span>'
    cardHTML += '<a href="/listing/' + listing.id + '" class="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition">' + tr('View', 'Voir') + ' →</a>'
    cardHTML += '</div>'
    cardHTML += '</div>'
    cardHTML += '</div>'
    
    return cardHTML
  }
  
  // Show listing details modal
  function showListingDetails(listingId, listing) {
    const modalContent = document.getElementById('modal-content')
    const modal = document.getElementById('listing-modal')

    const displayCurrency = listing.currency || 'EUR'
    const price = formatCurrencyLocale(listing.price, displayCurrency)
    const marketPrice = listing.market_price ? formatCurrencyLocale(listing.market_price, displayCurrency) : null
    const mileage = listing.mileage ? formatNumber(listing.mileage) : ''
    const filteredImages = getFilteredImages(listing.images)
    const mainImage = filteredImages[0] || getPlaceholderImageUrl(listing.brand, listing.model, 800, 600)
    const otherImages = filteredImages.slice(1, 4)
    
    let modalHTML = '<div class="grid md:grid-cols-2 gap-6">'
    modalHTML += '<div>'
    modalHTML += '<div class="rounded-xl overflow-hidden mb-4 relative" id="image-carousel">'
    modalHTML += '<div class="relative h-64 bg-zinc-100">'
    modalHTML += '<img id="main-carousel-image" src="' + mainImage + '" alt="' + listing.brand + ' ' + listing.model + '" class="w-full h-full object-cover" referrerpolicy="no-referrer">'
    if (filteredImages.length > 1) {
      modalHTML += '<button id="carousel-prev" class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>'
      modalHTML += '<button id="carousel-next" class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>'
      modalHTML += '<div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm"><span id="image-counter">1</span> / ' + filteredImages.length + '</div>'
    }
    modalHTML += '</div>'
    modalHTML += '</div>'
    if (otherImages.length > 0) {
      modalHTML += '<div class="grid grid-cols-3 gap-2" id="thumbnail-grid">'
      otherImages.forEach((img, index) => {
        modalHTML += '<img src="' + img + '" alt="" class="thumbnail-image w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 border-2 border-transparent hover:border-zinc-900 transition" data-index="' + (index + 1) + '" referrerpolicy="no-referrer">'
      })
      modalHTML += '</div>'
    }
    modalHTML += '</div>'
    
    modalHTML += '<div>'
    modalHTML += '<h2 class="text-2xl font-bold text-zinc-900 mb-2">' + listing.year + ' ' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '</h2>'
    modalHTML += '<div class="text-3xl font-bold text-zinc-900 mb-4">' + price + '</div>'

    if (marketPrice) {
      modalHTML += '<div class="bg-zinc-50 border border-zinc-100 rounded-lg p-4 mb-4">'
      modalHTML += '<div class="flex items-center justify-between gap-3">'
      modalHTML += '<div class="flex-1">'
      modalHTML += '<span class="text-xs text-zinc-500">' + tr('Estimated market price', 'Prix marché estimé') + '</span>'
      modalHTML += '<div class="flex items-baseline gap-2 mt-1">'
      modalHTML += '<span class="text-lg sm:text-xl font-bold text-zinc-900">' + marketPrice + '</span>'
      if (listing.confidence_index) {
        const confidence = listing.confidence_index
        let confColor = 'text-red-600'
        if (confidence >= 70) {
          confColor = 'text-green-600'
        } else if (confidence >= 40) {
          confColor = 'text-yellow-600'
        }
        modalHTML += `<span class="text-sm font-semibold ${confColor}">${confidence}%</span>`
      }
      modalHTML += '</div>'
      modalHTML += '</div>'
      modalHTML += '</div>'
      modalHTML += '</div>'
    }
    
    const modalFuelMap = { petrol: tr('PETROL', 'ESSENCE'), gasolina: tr('PETROL', 'ESSENCE'), diesel: tr('DIESEL', 'DIESEL'), diésel: tr('DIESEL', 'DIESEL'), hybrid: tr('HYBRID', 'HYBRIDE'), electric: tr('ELECTRIC', 'ÉLECTRIQUE'), electro: tr('ELECTRIC', 'ÉLECTRIQUE'), 'electro/gasolina': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE'), 'electro/gasoline': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE') }
    const rawModalFuel = listing.fuel_type ? listing.fuel_type.toLowerCase().trim() : ''
    const modalFuelDisplay = rawModalFuel ? (modalFuelMap[rawModalFuel] || rawModalFuel.split(/[/\s]+/).map(p => modalFuelMap[p.trim()] || p.toUpperCase()).join('/')) : null
    modalHTML += '<div class="grid grid-cols-2 gap-4 mb-6">'
    modalHTML += '<div class="bg-zinc-50 rounded-lg p-3 border border-zinc-100"><div class="text-xs text-zinc-500">' + tr('Year', 'Année') + '</div><div class="text-base font-semibold text-zinc-900">' + listing.year + '</div></div>'
    modalHTML += '<div class="bg-zinc-50 rounded-lg p-3 border border-zinc-100"><div class="text-xs text-zinc-500">' + tr('Mileage', 'Kilométrage') + '</div><div class="text-base font-semibold text-zinc-900">' + mileage + ' km</div></div>'
    if (modalFuelDisplay) {
      modalHTML += '<div class="bg-zinc-50 rounded-lg p-3 border border-zinc-100"><div class="text-xs text-zinc-500">' + tr('Fuel', 'Carburant') + '</div><div class="text-base font-semibold text-zinc-900">' + modalFuelDisplay + '</div></div>'
    }
    const modalLocationCity = listing.location_city || listing.location?.city || listing.location_region
    const modalLocationCountry = listing.location_country || listing.location?.country || 'FR'
    const modalLocationDisplay = modalLocationCity ? (modalLocationCity + ', ' + modalLocationCountry) : modalLocationCountry
    modalHTML += '<div class="bg-zinc-50 rounded-lg p-3 border border-zinc-100"><div class="text-xs text-zinc-500">' + tr('Location', 'Localisation') + '</div><div class="text-base font-semibold text-zinc-900">' + modalLocationDisplay + '</div></div>'
    modalHTML += '</div>'
    
    const sources = (listing.sources && listing.sources.length > 0 ? listing.sources.filter(function (s) { return s.url }) : null) || (listing.url ? [{ platform: listing.source_platform || listing.source, url: listing.url }] : [])
    const linkDisclaimer = '<p class="mt-2 text-xs text-zinc-400">' + tr('The seller may have removed this listing. If the link shows an error, the car may no longer be available.', 'Le vendeur peut avoir retiré cette annonce. Si le lien affiche une erreur, le véhicule n\'est peut-être plus disponible.') + '</p>'
    modalHTML += '<div class="flex flex-col space-y-2">'
    if (sources.length === 1) {
      modalHTML += '<a href="' + sources[0].url + '" target="_blank" rel="noopener noreferrer" class="flex-1 px-6 py-3 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-700 transition text-center">' + tr('View original listing', 'Voir l\'annonce originale') + '</a>' + linkDisclaimer
    } else if (sources.length > 1) {
      modalHTML += '<div class="text-sm font-medium text-zinc-700 mb-1">' + tr('Contact seller', 'Contacter le vendeur') + ' :</div>'
      sources.forEach(function (s) {
        modalHTML += '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between px-6 py-3 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-700 transition text-center"><span>' + getSourceName(s.platform) + '</span><span>→</span></a>'
      })
      modalHTML += linkDisclaimer
    }
    modalHTML += isAuthenticated() ? '<div class="flex space-x-3"><button class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" title="' + tr('Favorite', 'Favoris') + '"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button></div>' : ''
    modalHTML += '</div>'
    modalHTML += '</div>'
    modalHTML += '</div>'
    
    modalContent.innerHTML = modalHTML
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    
    // Initialize image carousel if multiple images
    if (filteredImages.length > 1) {
      initializeImageCarousel(filteredImages)
    }
  }
  
  // Image carousel functionality
  function initializeImageCarousel(images) {
    let currentIndex = 0
    const mainImage = document.getElementById('main-carousel-image')
    const counter = document.getElementById('image-counter')
    const prevBtn = document.getElementById('carousel-prev')
    const nextBtn = document.getElementById('carousel-next')
    const thumbnails = document.querySelectorAll('.thumbnail-image')
    
    const updateImage = (index) => {
      currentIndex = index
      mainImage.src = images[index]
      if (counter) counter.textContent = (index + 1) + ' / ' + images.length
      
      // Update thumbnail selection
      thumbnails.forEach((thumb, i) => {
        if (i === index - 1) {
          thumb.classList.add('border-zinc-900')
          thumb.classList.remove('border-transparent')
        } else {
          thumb.classList.remove('border-zinc-900')
          thumb.classList.add('border-transparent')
        }
      })
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        updateImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
      })
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        updateImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
      })
    }
    
    thumbnails.forEach((thumb, i) => {
      thumb.addEventListener('click', () => {
        updateImage(i + 1)
      })
    })
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('listing-modal') && !document.getElementById('listing-modal').classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') {
          updateImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
        } else if (e.key === 'ArrowRight') {
          updateImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
        }
      }
    })
  }
  
  // Update pagination
  function updatePagination(total, page) {
    const pagination = document.getElementById('pagination')
    if (!pagination) {
      console.warn('Pagination element not found in DOM')
      return
    }
    
    const totalPages = Math.ceil(total / 24)
    
    if (totalPages <= 1) {
      pagination.classList.add('hidden')
      return
    }
    
    pagination.classList.remove('hidden')
    
    let paginationHTML = ''
    
    // Previous button
    if (page > 1) {
      paginationHTML += '<button class="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition" onclick="window.changePage(' + (page - 1) + ')">' + tr('Previous', 'Précédent') + '</button>'
    } else {
      paginationHTML += '<button disabled class="px-3 py-1.5 border border-zinc-100 rounded-lg text-sm text-zinc-300 cursor-not-allowed">' + tr('Previous', 'Précédent') + '</button>'
    }

    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      const isActive = i === page
      paginationHTML += '<button class="w-9 h-9 rounded-lg text-sm border ' + (isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50') + ' transition" onclick="window.changePage(' + i + ')">' + i + '</button>'
    }

    // Next button
    if (page < totalPages) {
      paginationHTML += '<button class="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition" onclick="window.changePage(' + (page + 1) + ')">' + tr('Next', 'Suivant') + '</button>'
    } else {
      paginationHTML += '<button disabled class="px-3 py-1.5 border border-zinc-100 rounded-lg text-sm text-zinc-300 cursor-not-allowed">' + tr('Next', 'Suivant') + '</button>'
    }
    
    pagination.innerHTML = paginationHTML
  }
  
  // Global function for pagination
  window.changePage = function(newPage) {
    window.currentPage = newPage
    currentPage = newPage
    if (window.searchListings) window.searchListings(window.currentFilters || currentFilters, window.currentPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Helper functions
  function getSourceIcon(source) {
    if (!source) return '📋'
    const sourceLower = String(source).toLowerCase()
    const icons = {
      'leboncoin': '🔵',
      'mobile.de': '🟢',
      'autoscout24': '🟠',
      'autoscout': '🟠',
      'gaspedaal': '🔴',
      'marktplaats': '🟠'
    }
    return icons[sourceLower] || '📋'
  }
  
  function getSourceName(source) {
    if (!source) return tr('Unknown source', 'Source inconnue')
    const sourceLower = String(source).toLowerCase()
    const names = {
      'leboncoin': 'LeBonCoin',
      'mobile.de': 'mobile.de',
      'autoscout24': 'AutoScout24',
      'autoscout': 'AutoScout24',
      'gaspedaal': 'Gaspedaal.nl',
      'marktplaats': 'Marktplaats.nl',
      'bilweb': 'Bilweb.se',
      'bytbil': 'Bytbil.com',
      'blocket': 'Blocket.se',
      'coches.net': 'Coches.net',
      'finn': 'FINN.no',
      'otomoto': 'OtoMoto.pl',
      '2ememain': '2emain.be',
      'deuxememain': '2emain.be',
      'largus': "L'Argus",
      'lacentrale': 'La Centrale',
      'subito': 'Subito.it'
    }
    return names[sourceLower] || source
  }
  
  function formatDate(dateString) {
    if (!dateString) return tr('Recently', 'Récemment')
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return tr('Today', "Aujourd'hui")
    if (days === 1) return tr('Yesterday', 'Hier')
    if (days < 7) return tr(`${days} days ago`, 'Il y a ' + days + ' jours')
    return formatDateLocale(dateString)
  }
  
  // Generate mock listings for demo
  function generateMockListings(filters) {
    const brands = filters.brand ? [filters.brand] : ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Peugeot', 'Renault']
    const models = {
      'BMW': ['320d', '520d', 'X3', 'X5', '118d'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'A-Class', 'GLC', 'CLA'],
      'Audi': ['A3', 'A4', 'A5', 'Q5', 'Q7'],
      'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touran', 'Polo'],
      'Peugeot': ['208', '308', '3008', '5008', '2008'],
      'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic']
    }
    
    const sources = ['leboncoin', 'mobile.de', 'autoscout24']
    const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']
    const fuelTypes = ['diesel', 'petrol', 'electric', 'hybrid']
    
    const listings = []
    for (let i = 0; i < 24; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)]
      const model = models[brand]?.[Math.floor(Math.random() * models[brand].length)] || 'Modèle'
      const year = (filters.min_year ? parseInt(filters.min_year) : 2018) + Math.floor(Math.random() * 6)
      const mileage = filters.max_mileage ? Math.min(parseInt(filters.max_mileage), 150000) : 10000 + Math.floor(Math.random() * 150000)
      const maxPrice = filters.max_price ? parseInt(filters.max_price) : 50000
      const price = maxPrice - Math.floor(Math.random() * 20000)
      
      listings.push({
        id: 'listing-' + i,
        brand,
        model,
        year,
        mileage,
        price,
        location: {
          city: cities[Math.floor(Math.random() * cities.length)],
          country: filters.country || 'FR'
        },
        source: sources[Math.floor(Math.random() * sources.length)],
        posted_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/listing/' + i,
        market_price: price + (Math.random() * 2000 - 1000),
        confidence_index: 70 + Math.floor(Math.random() * 25),
        fuel_type: fuelTypes[Math.floor(Math.random() * fuelTypes.length)],
        images: [getPlaceholderImageUrl(brand, model, 600, 400)]
      })
    }
    
    return listings
  }
}

