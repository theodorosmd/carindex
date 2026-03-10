import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

export function renderLandingPage() {
  const app = document.getElementById('app')
  
  app.innerHTML = `
    <div class="bg-white dark:bg-gray-900">
      <!-- Navigation -->
      <header class="fixed inset-x-0 top-0 z-[100] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-transparent">
        <nav aria-label="Global" class="flex items-center justify-between p-6 lg:px-8">
          <div class="flex lg:flex-1">
            <a href="#" class="-m-1.5 p-1.5 flex items-center space-x-2">
              <span class="sr-only">Carindex</span>
              <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-xl">C</span>
              </div>
              <span class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
            </a>
          </div>
          <div class="hidden lg:flex lg:gap-x-12">
            <a href="#/search" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">${tr('Search', 'Rechercher')}</a>
            <a href="#features" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">${tr('Features', 'Fonctionnalités')}</a>
            <a href="#pricing" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">${tr('Pricing', 'Tarifs')}</a>
            <a href="#api" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">API</a>
            <a href="#faq" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">FAQ</a>
          </div>
          <div class="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-4">
            ${renderLanguageToggle()}
            <a href="#/login" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">${tr('Login', 'Connexion')}</a>
            <a href="/demo" class="text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition">${tr('Demo', 'Démo')}</a>
            <a href="/trial" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400">${tr('Free Trial', 'Essai gratuit')}</a>
          </div>
          <div class="flex lg:hidden">
            <button type="button" id="mobile-menu-button" class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-200">
              <span class="sr-only">Open main menu</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6">
                <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </nav>
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden lg:hidden border-t border-gray-200 bg-white dark:bg-gray-900">
          <div class="px-4 py-3 space-y-2">
            <a href="#/search" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">${tr('Search', 'Rechercher')}</a>
            <a href="#features" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">${tr('Features', 'Fonctionnalités')}</a>
            <a href="#pricing" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">${tr('Pricing', 'Tarifs')}</a>
            <a href="#api" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">API</a>
            <a href="#faq" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">FAQ</a>
            <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
              ${renderLanguageToggle()}
              <a href="#/login" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">${tr('Login', 'Connexion')}</a>
              <a href="/demo" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">${tr('Demo', 'Démo')}</a>
              <a href="/trial" class="block px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-center">${tr('Free Trial', 'Essai gratuit')}</a>
            </div>
          </div>
        </div>
        </nav>
      </header>

      <!-- Hero Section -->
      <div class="relative isolate px-6 pt-24 lg:pt-28 lg:px-8">
        <div aria-hidden="true" class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div class="mx-auto max-w-2xl py-20 sm:py-32 lg:py-48">
          <div class="hidden sm:mb-8 sm:flex sm:justify-center">
            <div class="relative rounded-full px-3 py-1 text-xs sm:text-sm text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20 dark:text-gray-400 dark:ring-white/10 dark:hover:ring-white/20">
              🔍 ${tr('8.5M+ listings from leboncoin, mobile.de, AutoScout24.', '8.5M+ annonces depuis leboncoin, mobile.de, AutoScout24.')} <a href="#/search" class="font-semibold text-indigo-600 dark:text-indigo-400"><span aria-hidden="true" class="absolute inset-0"></span>${tr('Search now', 'Rechercher maintenant')} <span aria-hidden="true">&rarr;</span></a>
            </div>
          </div>
          
          <div class="text-center px-4">
            <h1 class="text-3xl sm:text-5xl lg:text-7xl font-semibold tracking-tight text-balance text-gray-900 dark:text-white">
              ${tr('Search among millions of car listings', 'Recherchez parmi des millions d\'annonces automobiles')}
            </h1>
            <p class="mt-6 sm:mt-8 text-base sm:text-lg font-medium text-pretty text-gray-500 dark:text-gray-400">
              ${tr('Access listings from', 'Accédez aux annonces de')} <strong>leboncoin</strong>, <strong>mobile.de</strong>, <strong>AutoScout24</strong> ${tr('and more. Advanced search, market prices, confidence index. Everything you need to find the perfect vehicle.', 'et plus encore. Recherche avancée, prix marché, indice de confiance. Tout ce dont vous avez besoin pour trouver le véhicule idéal.')}
            </p>
            <div class="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
              <a href="#/search" class="w-full sm:w-auto rounded-md bg-indigo-600 px-4 sm:px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 text-center">${tr('Search vehicles', 'Rechercher des véhicules')}</a>
              <a href="/trial" class="text-sm/6 font-semibold text-gray-900 dark:text-white">${tr('Free Trial', 'Essai gratuit')} <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
        
        <div aria-hidden="true" class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="relative -mt-12 sm:-mt-20 pb-12 sm:pb-24">
        <div class="container mx-auto px-4 sm:px-6">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:bg-gray-800/80 dark:border-gray-700">
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">8.5M+</div>
              <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">${tr('Active listings', 'Annonces actives')}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:bg-gray-800/80 dark:border-gray-700">
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">20+</div>
              <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">${tr('Countries covered', 'Pays couverts')}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:bg-gray-800/80 dark:border-gray-700">
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">95%+</div>
              <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">${tr('Accuracy', 'Précision')}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:bg-gray-800/80 dark:border-gray-700">
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">18%</div>
              <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">${tr('Margin increase', 'Augmentation marge')}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:bg-gray-800/80 dark:border-gray-700 col-span-2 md:col-span-1">
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">&lt;24h</div>
              <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">${tr('Update', 'Mise à jour')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Benefits Section -->
    <section class="py-12 sm:py-24 bg-white">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="text-center mb-12 sm:mb-20">
          <h2 class="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">${tr('Why Carindex', 'Pourquoi Carindex')}</h2>
          <p class="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">${tr('Concrete benefits to transform your business', 'Des bénéfices concrets pour transformer votre activité')}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <div class="group p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-2xl transition-all bg-gradient-to-br from-white to-blue-50/30">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <span class="text-3xl">💰</span>
            </div>
            <h3 class="text-2xl font-bold mb-4 text-gray-900">${tr('Maximize your margins', 'Maximisez vos marges')}</h3>
            <p class="text-gray-600 leading-relaxed">
              ${tr('Our market price analysis algorithms tell you exactly where to position each vehicle to optimize your profitability without compromising your competitiveness.', 'Nos algorithmes d\'analyse de prix marché vous indiquent précisément où positionner chaque véhicule pour optimiser votre rentabilité sans compromettre votre compétitivité.')} <strong class="text-gray-900">${tr('Professionals using Carindex increase their margins by an average of 18%.', 'Les professionnels utilisant Carindex augmentent en moyenne leurs marges de 18%.')}</strong>
            </p>
          </div>
          <div class="group p-8 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-2xl transition-all bg-gradient-to-br from-white to-indigo-50/30">
            <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <span class="text-3xl">⚡</span>
            </div>
            <h3 class="text-2xl font-bold mb-4 text-gray-900">${tr('Sell faster', 'Vendez plus vite')}</h3>
            <p class="text-gray-600 leading-relaxed">
              ${tr('Identify underpriced vehicles that sell in days, and quickly adjust those that stagnate. Our analysis of average selling time by segment helps you optimize your turnover and free up your cash flow faster.', 'Identifiez les véhicules sous-cotés qui partent en quelques jours, et ajustez rapidement ceux qui stagnent. Notre analyse de la durée moyenne de vente par segment vous permet d\'optimiser votre rotation et de libérer votre trésorerie plus rapidement.')}
            </p>
          </div>
          <div class="group p-8 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-2xl transition-all bg-gradient-to-br from-white to-purple-50/30">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <span class="text-3xl">📊</span>
            </div>
            <h3 class="text-2xl font-bold mb-4 text-gray-900">${tr('Data-driven decisions', 'Décisions basées sur des données')}</h3>
            <p class="text-gray-600 leading-relaxed">
              ${tr('No more finger-in-the-air estimates. Every purchase, trade-in, or pricing decision is based on thousands of real comparables, with a transparent confidence index that tells you the reliability of each analysis.', 'Fini les estimations au doigt mouillé. Chaque décision d\'achat, de reprise ou de cotation s\'appuie sur des milliers de comparables réels, avec un indice de confiance transparent qui vous indique la fiabilité de chaque analyse.')}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-12 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="text-center mb-12 sm:mb-20">
          <h2 class="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">${tr('Key Features', 'Fonctionnalités Clés')}</h2>
          <p class="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">${tr('Everything you need to optimize your business', 'Tout ce dont vous avez besoin pour optimiser votre activité')}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Pro Search & Navigation', 'Recherche & Navigation Pro')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Interface designed for professionals. Advanced filters, bulk export, multi-vehicle comparisons, price history.', 'Interface pensée pour les professionnels. Filtres avancés, export en masse, comparaisons multi-véhicules, historique des prix.')}</p>
          </div>
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Market Price & Confidence Index', 'Prix Marché & Indice de Confiance')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Accurate pricing in seconds with a confidence index (0-100%) that reflects the reliability of the analysis.', 'Cotation précise en quelques secondes avec un indice de confiance (0-100%) qui reflète la fiabilité de l\'analyse.')}</p>
          </div>
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Professional Alerts', 'Alerting Professionnel')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Custom alerts on price drops, new listings, market opportunities. Real-time notifications.', 'Alertes personnalisées sur baisses de prix, nouvelles annonces, opportunités de marché. Notifications en temps réel.')}</p>
          </div>
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Multi-Country Used Car Market', 'Marché VO Multi-Pays')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Market overview across 20+ countries. Volumes, 30-month trends, top-performing models, market dynamics.', 'Vue d\'ensemble du marché sur 20+ pays. Volumes, tendances sur 30 mois, modèles performants, dynamique du marché.')}</p>
          </div>
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Advanced Pricing', 'Cotation Avancée')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Complete analysis: comparables, selling time, model attractiveness, competitive positioning, price evolution.', 'Analyse complète : comparables, temps de vente, attractivité modèle, positionnement concurrence, évolution prix.')}</p>
          </div>
          <div class="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${tr('Stock Analysis', 'Analyse de Stock')}</h3>
            <p class="text-gray-600 leading-relaxed">${tr('Stock value, under/overpriced models, selling time vs market, Market Day Supply. Complete dashboard.', 'Valeur stock, modèles sous/sur-cotés, durée de vente vs marché, Market Day Supply. Tableau de bord complet.')}</p>
          </div>
          <div class="group p-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl hover:shadow-3xl transition-all md:col-span-2 lg:col-span-3 text-white">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold mb-3">${tr('API & Integrations', 'API & Intégrations')}</h3>
            <p class="text-white/90 leading-relaxed text-lg">${tr('Complete REST API to integrate into your CRM, DMS, internal tools. Webhooks for real-time alerts. Complete documentation, available SDKs, dedicated technical support for complex integrations.', 'API REST complète pour intégrer dans votre CRM, DMS, outils internes. Webhooks pour alertes en temps réel. Documentation complète, SDK disponibles, support technique dédié pour les intégrations complexes.')}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-12 sm:py-24 bg-white">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="text-center mb-12 sm:mb-20">
          <h2 class="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">${tr('How it works', 'Comment ça marche')}</h2>
          <p class="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">${tr('In 5 simple steps to transform your business', 'En 5 étapes simples pour transformer votre activité')}</p>
        </div>
        <div class="max-w-5xl mx-auto">
          <div class="space-y-6 sm:space-y-8">
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 group">
              <div class="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl shadow-lg group-hover:scale-110 transition-transform">1</div>
              <div class="flex-1 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl sm:rounded-2xl border border-blue-100 group-hover:shadow-xl transition-all">
                <h3 class="text-xl sm:text-2xl font-bold mb-2 text-gray-900">${tr('Create your professional account', 'Créez votre compte professionnel')}</h3>
                <p class="text-gray-600 leading-relaxed">${tr('Sign up in minutes with your business email. Choose your plan and start your 14-day free trial.', 'Inscrivez-vous en quelques minutes avec votre email professionnel. Choisissez votre formule et démarrez votre essai gratuit de 14 jours.')}</p>
              </div>
            </div>
            <div class="flex gap-6 group">
              <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">2</div>
              <div class="flex-1 p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 group-hover:shadow-xl transition-all">
                <h3 class="text-2xl font-bold mb-2 text-gray-900">${tr('Access market data', 'Accédez aux données du marché')}</h3>
                <p class="text-gray-600 leading-relaxed">${tr('Explore millions of available listings. Use our advanced filters to find exactly what you\'re looking for.', 'Explorez les millions d\'annonces disponibles. Utilisez nos filtres avancés pour trouver exactement ce que vous cherchez.')}</p>
              </div>
            </div>
            <div class="flex gap-6 group">
              <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">3</div>
              <div class="flex-1 p-6 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 group-hover:shadow-xl transition-all">
                <h3 class="text-2xl font-bold mb-2 text-gray-900">${tr('Configure your alerts', 'Configurez vos alertes')}</h3>
                <p class="text-gray-600 leading-relaxed">${tr('Set your alert criteria: price drops, new listings, market movements. Receive real-time notifications.', 'Définissez vos critères d\'alerte : baisses de prix, nouvelles annonces, mouvements de marché. Recevez des notifications en temps réel.')}</p>
              </div>
            </div>
            <div class="flex gap-6 group">
              <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">4</div>
              <div class="flex-1 p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 group-hover:shadow-xl transition-all">
                <h3 class="text-2xl font-bold mb-2 text-gray-900">${tr('Analyze your stock', 'Analysez votre stock')}</h3>
                <p class="text-gray-600 leading-relaxed">${tr('Import your inventory. Carindex analyzes each vehicle, compares its price to the market and suggests adjustments.', 'Importez votre inventaire. Carindex analyse chaque véhicule, compare son prix au marché et vous suggère des ajustements.')}</p>
              </div>
            </div>
            <div class="flex gap-6 group">
              <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">5</div>
              <div class="flex-1 p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 group-hover:shadow-xl transition-all">
                <h3 class="text-2xl font-bold mb-2 text-gray-900">${tr('Integrate via API', 'Intégrez via API')}</h3>
                <p class="text-gray-600 leading-relaxed">${tr('Connect Carindex to your CRM or DMS via our REST API. Automate your pricing and sync your inventory.', 'Connectez Carindex à votre CRM ou DMS via notre API REST. Automatisez vos cotations et synchronisez vos stocks.')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-12 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="text-center mb-12 sm:mb-20">
          <h2 class="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">${tr('Pricing Plans', 'Plans Tarifaires')}</h2>
          <p class="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">${tr('Choose the plan that fits your business', 'Choisissez le plan adapté à votre activité')}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <!-- Start Plan -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-gray-100 hover:border-blue-200 transition-all hover:shadow-2xl">
            <div class="mb-6">
              <h3 class="text-xl sm:text-2xl font-bold mb-2 text-gray-900">Start</h3>
              <div class="mb-4">
                <span class="text-4xl sm:text-5xl font-bold text-gray-900">199€</span>
                <span class="text-sm sm:text-base text-gray-600">/month ex. VAT</span>
              </div>
              <p class="text-gray-600">${tr('Perfect for small dealerships and independent used car dealers', 'Parfait pour petits concessionnaires et marchands VO indépendants')}</p>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Ad-free navigation', 'Navigation sans publicité')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Market price + confidence index', 'Prix marché + indice confiance')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Daily updates', 'Mise à jour quotidienne')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Professional alerts', 'Alertes professionnelles')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Results export', 'Export de résultats')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Up to 3 users', 'Jusqu\'à 3 utilisateurs')}</span>
              </li>
            </ul>
            <a href="/trial?plan=start" class="block w-full text-center px-6 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg">
              ${tr('Free Trial', 'Essai gratuit')}
            </a>
          </div>

          <!-- Confort Plan -->
          <div class="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-blue-500 relative sm:transform sm:scale-105">
            <div class="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-3 sm:px-4 py-1 sm:py-2 rounded-bl-xl sm:rounded-bl-2xl rounded-tr-xl sm:rounded-tr-2xl text-xs sm:text-sm font-bold">
              ${tr('Popular', 'Populaire')}
            </div>
            <div class="mb-6 text-white">
              <h3 class="text-xl sm:text-2xl font-bold mb-2">${tr('Comfort', 'Confort')}</h3>
              <div class="mb-4">
                <span class="text-4xl sm:text-5xl font-bold">${formatCurrency(499)}</span>
                <span class="text-sm sm:text-base text-blue-100">${tr('/month ex. VAT', '/mois HT')}</span>
              </div>
              <p class="text-blue-100">${tr('Perfect for medium dealerships and regional auto groups', 'Parfait pour concessionnaires moyens et groupes auto régionaux')}</p>
            </div>
            <ul class="space-y-4 mb-8 text-white">
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Everything in Start', 'Tout Start')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Complete Used Car Market module', 'Module Marché VO complet')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Advanced market pricing', 'Prix marché avancé')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Trend analysis', 'Analyses de tendances')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Customizable reports', 'Rapports personnalisables')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Priority support', 'Support prioritaire')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${tr('Up to 10 users', 'Jusqu\'à 10 utilisateurs')}</span>
              </li>
            </ul>
            <a href="/trial?plan=confort" class="block w-full text-center px-6 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition shadow-lg">
              ${tr('Free Trial', 'Essai gratuit')}
            </a>
          </div>

          <!-- Performance Plan -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-gray-100 hover:border-indigo-200 transition-all hover:shadow-2xl">
            <div class="mb-6">
              <h3 class="text-xl sm:text-2xl font-bold mb-2 text-gray-900">Performance</h3>
              <div class="mb-4">
                <span class="text-4xl sm:text-5xl font-bold text-gray-900">1 299€</span>
                <span class="text-sm sm:text-base text-gray-600">/month ex. VAT</span>
              </div>
              <p class="text-gray-600">${tr('Perfect for large groups and companies with integration needs', 'Parfait pour grands groupes et entreprises avec besoins d\'intégration')}</p>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Everything in Comfort', 'Tout Confort')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Complete stock analysis', 'Analyse de stock complète')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Automatic stock tracking', 'Suivi automatique stock')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Complete REST API', 'API REST complète')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Real-time webhooks', 'Webhooks temps réel')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Dedicated account manager', 'Account manager dédié')}</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-gray-700">${tr('Unlimited users', 'Utilisateurs illimités')}</span>
              </li>
            </ul>
            <a href="/trial?plan=performance" class="block w-full text-center px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg">
              ${tr('Free Trial', 'Essai gratuit')}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- API Section -->
    <section id="api" class="py-12 sm:py-24 bg-white">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-8 sm:mb-12">
            <h2 class="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">${tr('B2B API', 'API B2B')}</h2>
            <p class="text-base sm:text-xl text-gray-600">${tr('Automate your processes with the Carindex API', 'Automatisez vos processus avec l\'API Carindex')}</p>
          </div>
          <div class="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl sm:rounded-3xl p-6 sm:p-10 mb-6 sm:mb-8 border border-gray-200 shadow-xl">
            <p class="text-gray-700 mb-8 text-lg leading-relaxed">
              ${tr('The Carindex API (available on the Performance plan) transforms the way you work by integrating market intelligence directly into your business tools. No more switching between multiple applications: Carindex data is available where you need it.', 'L\'API Carindex (disponible sur le plan Performance) transforme votre façon de travailler en intégrant l\'intelligence marché directement dans vos outils métier. Plus besoin de basculer entre plusieurs applications : les données Carindex sont disponibles là où vous en avez besoin.')}
            </p>
            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-white rounded-2xl p-6 shadow-lg">
                <h4 class="font-bold text-lg mb-4 text-gray-900">${tr('Main use cases', 'Cas d\'usage principaux')}</h4>
                <ul class="space-y-3 text-gray-700">
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('CRM integration', 'Intégration CRM')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('DMS connection', 'Connexion DMS')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Custom dashboards', 'Tableaux de bord personnalisés')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Automated alerts', 'Alertes automatisées')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Performance analysis', 'Analyse de performance')}</span>
                  </li>
                </ul>
              </div>
              <div class="bg-white rounded-2xl p-6 shadow-lg">
                <h4 class="font-bold text-lg mb-4 text-gray-900">${tr('Benefits', 'Avantages')}</h4>
                <ul class="space-y-3 text-gray-700">
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Optimal scalability', 'Scalabilité optimale')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Native integration', 'Intégration native')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Real-time', 'Temps réel')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Enhanced security', 'Sécurité renforcée')}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${tr('Dedicated technical support', 'Support technique dédié')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="text-center">
            <a href="/docs/api" class="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
              ${tr('View API documentation', 'Voir la documentation API')}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div class="container mx-auto px-6">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-5xl font-bold text-gray-900 mb-4">${tr('Frequently Asked Questions', 'Questions Fréquentes')}</h2>
            <p class="text-xl text-gray-600">${tr('Everything you need to know about Carindex', 'Tout ce que vous devez savoir sur Carindex')}</p>
          </div>
          <div class="space-y-4">
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <h3 class="text-lg font-bold mb-3 text-gray-900">${tr('Which countries are covered by Carindex?', 'Quels pays sont couverts par Carindex ?')}</h3>
              <p class="text-gray-600 leading-relaxed">${tr('Carindex currently covers 20+ countries in Europe, North America and South America. We regularly add new countries based on our clients\' demand.', 'Carindex couvre actuellement 20+ pays en Europe, Amérique du Nord et Amérique du Sud. Nous ajoutons régulièrement de nouveaux pays selon la demande de nos clients.')}</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <h3 class="text-lg font-bold mb-3 text-gray-900">${tr('What is the accuracy of the market prices provided?', 'Quelle est la précision des prix marché fournis ?')}</h3>
              <p class="text-gray-600 leading-relaxed">${tr('Accuracy depends on the number of comparables available. For popular models with more than 50 similar listings, our accuracy exceeds 95%. Each market price comes with a confidence index (0-100%).', 'La précision dépend du nombre de comparables disponibles. Pour les modèles populaires avec plus de 50 annonces similaires, notre précision est supérieure à 95%. Chaque prix marché est accompagné d\'un indice de confiance (0-100%).')}</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <h3 class="text-lg font-bold mb-3 text-gray-900">${tr('How often is the data updated?', 'À quelle fréquence les données sont-elles mises à jour ?')}</h3>
              <p class="text-gray-600 leading-relaxed">${tr('Price and inventory data is updated several times a day. Trend analyses are recalculated monthly with a 30-month history.', 'Les données de prix et d\'inventaire sont mises à jour plusieurs fois par jour. Les analyses de tendances sont recalculées mensuellement avec un historique de 30 mois.')}</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <h3 class="text-lg font-bold mb-3 text-gray-900">${tr('Is the API available on all plans?', 'L\'API est-elle disponible sur tous les plans ?')}</h3>
              <p class="text-gray-600 leading-relaxed">${tr('The API is exclusively available on the Performance plan. It enables complete integration with your CRM, DMS or internal tools.', 'L\'API est exclusivement disponible sur le plan Performance. Elle permet une intégration complète avec votre CRM, DMS ou outils internes.')}</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <h3 class="text-lg font-bold mb-3 text-gray-900">${tr('Is there a commitment period?', 'Y a-t-il un engagement de durée ?')}</h3>
              <p class="text-gray-600 leading-relaxed">${tr('No, all our plans are commitment-free. You can cancel at any time. The 14-day free trial allows you to test all features before committing.', 'Non, tous nos plans sont sans engagement. Vous pouvez résilier à tout moment. L\'essai gratuit de 14 jours vous permet de tester toutes les fonctionnalités avant de vous engager.')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Final -->
    <section class="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
      </div>
      <div class="container mx-auto px-6 text-center relative z-10">
        <h2 class="text-5xl font-bold mb-4">${tr('Ready to transform your automotive business?', 'Prêt à transformer votre activité automobile ?')}</h2>
        <p class="text-xl mb-10 text-blue-100 max-w-2xl mx-auto">${tr('Join hundreds of professionals who trust Carindex to optimize their business decisions', 'Rejoignez les centaines de professionnels qui font confiance à Carindex pour optimiser leurs décisions commerciales')}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/trial" class="px-10 py-5 bg-white text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50 transition shadow-2xl hover:shadow-3xl transform hover:-translate-y-1">
            ${tr('Start 14-day free trial', 'Démarrer l\'essai gratuit 14 jours')}
          </a>
          <a href="/demo" class="px-10 py-5 bg-transparent border-2 border-white text-white rounded-xl text-lg font-semibold hover:bg-white/10 transition">
            ${tr('Request a personalized demo', 'Demander une démo personnalisée')}
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 py-16">
      <div class="container mx-auto px-6">
        <div class="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-xl">C</span>
              </div>
              <span class="text-2xl font-bold text-white">Carindex</span>
            </div>
            <p class="text-sm text-gray-400">${tr('Automotive market intelligence for professionals', 'L\'intelligence marché automobile pour professionnels')}</p>
          </div>
          <div>
            <h4 class="font-bold text-white mb-4">${tr('Product', 'Produit')}</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#features" class="hover:text-white transition">${tr('Features', 'Fonctionnalités')}</a></li>
              <li><a href="#pricing" class="hover:text-white transition">${tr('Pricing', 'Tarifs')}</a></li>
              <li><a href="#api" class="hover:text-white transition">API</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-white mb-4">${tr('Resources', 'Ressources')}</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="/docs" class="hover:text-white transition">${tr('Documentation', 'Documentation')}</a></li>
              <li><a href="/blog" class="hover:text-white transition">Blog</a></li>
              <li><a href="/support" class="hover:text-white transition">${tr('Support', 'Support')}</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-white mb-4">${tr('Contact', 'Contact')}</h4>
            <ul class="space-y-2 text-sm">
              <li>contact@carindex.com</li>
              <li>+33 1 XX XX XX XX</li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>&copy; 2024 Carindex. ${tr('All rights reserved.', 'Tous droits réservés.')}</p>
        </div>
      </div>
    </footer>
  `
  
  // Mobile menu handler
  const mobileMenuButton = document.getElementById('mobile-menu-button')
  const mobileMenu = document.getElementById('mobile-menu')
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden')
    })
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden')
      }
    })
  }
  
  // Attach language toggle handler
  attachLanguageToggle(() => {
    // Reload page when language changes
    window.location.reload()
  })
}
