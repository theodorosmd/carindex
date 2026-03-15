import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

export function renderLandingPage() {
  const app = document.getElementById('app')

  app.innerHTML = `
    <div class="bg-white">

      <!-- Navigation -->
      <header class="fixed inset-x-0 top-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-zinc-200">
        <nav class="mx-auto max-w-7xl flex items-center justify-between px-6 py-4 lg:px-8">
          <a href="#" class="flex items-center gap-2.5">
            <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">C</span>
            </div>
            <span class="text-lg font-semibold text-zinc-900 tracking-tight">Carindex</span>
          </a>

          <div class="hidden lg:flex items-center gap-8">
            <a href="#/search" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">${tr('Search', 'Rechercher')}</a>
            <a href="#/deal-score" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium">${tr('Deal Score', 'Deal Score')}</a>
            <a href="#features" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">${tr('Features', 'Fonctionnalités')}</a>
            <a href="#pricing" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">${tr('Pricing', 'Tarifs')}</a>
            <a href="#faq" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">FAQ</a>
          </div>

          <div class="hidden lg:flex items-center gap-4">
            ${renderLanguageToggle()}
            <a href="#/login" class="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">${tr('Login', 'Connexion')}</a>
            <a href="#/search" class="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
              ${tr('Get started', 'Commencer')} →
            </a>
          </div>

          <button type="button" id="mobile-menu-button" class="lg:hidden p-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </nav>

        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden lg:hidden border-t border-zinc-100 bg-white">
          <div class="px-6 py-4 space-y-1">
            <a href="#/search" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">${tr('Search', 'Rechercher')}</a>
            <a href="#/deal-score" class="block px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">${tr('Deal Score', 'Deal Score')}</a>
            <a href="#features" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">${tr('Features', 'Fonctionnalités')}</a>
            <a href="#pricing" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">${tr('Pricing', 'Tarifs')}</a>
            <a href="#faq" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">FAQ</a>
            <div class="pt-3 mt-3 border-t border-zinc-100 space-y-1">
              ${renderLanguageToggle()}
              <a href="#/login" class="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">${tr('Login', 'Connexion')}</a>
              <a href="#/search" class="block px-3 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors text-center">${tr('Get started', 'Commencer')}</a>
            </div>
          </div>
        </div>
      </header>

      <!-- Hero -->
      <section class="pt-32 pb-20 lg:pt-40 lg:pb-28 px-6 lg:px-8 bg-zinc-950">
        <div class="mx-auto max-w-4xl text-center">
          <div class="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 mb-10">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ${tr('8.5M+ listings · leboncoin, mobile.de, AutoScout24', '8.5M+ annonces · leboncoin, mobile.de, AutoScout24')}
          </div>
          <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            ${tr('The European car market,<br>in one place', 'Le marché auto européen,<br>en un seul endroit')}
          </h1>
          <p class="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            ${tr('Search millions of listings across Europe. Compare prices, track market trends, and make data-driven decisions.', 'Recherchez des millions d\'annonces à travers l\'Europe. Comparez les prix, suivez les tendances marché et prenez des décisions basées sur les données.')}
          </p>
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#/deal-score" class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors">
              🔥 ${tr('Check deal score', 'Vérifier le deal score')}
            </a>
            <a href="#/search" class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors">
              ${tr('Search vehicles', 'Rechercher des véhicules')} →
            </a>
          </div>
        </div>
      </section>

      <!-- Stats bar -->
      <section class="border-b border-zinc-100 bg-white">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-zinc-100">
            <div class="px-6 py-8 lg:px-8">
              <p class="text-3xl font-bold text-zinc-900 tracking-tight">8.5M+</p>
              <p class="mt-1 text-sm text-zinc-500">${tr('Active listings', 'Annonces actives')}</p>
            </div>
            <div class="px-6 py-8 lg:px-8">
              <p class="text-3xl font-bold text-zinc-900 tracking-tight">20+</p>
              <p class="mt-1 text-sm text-zinc-500">${tr('Countries', 'Pays')}</p>
            </div>
            <div class="px-6 py-8 lg:px-8">
              <p class="text-3xl font-bold text-zinc-900 tracking-tight">95%+</p>
              <p class="mt-1 text-sm text-zinc-500">${tr('Price accuracy', 'Précision des prix')}</p>
            </div>
            <div class="px-6 py-8 lg:px-8">
              <p class="text-3xl font-bold text-zinc-900 tracking-tight">+18%</p>
              <p class="mt-1 text-sm text-zinc-500">${tr('Avg. margin gain', 'Gain marge moyen')}</p>
            </div>
            <div class="px-6 py-8 lg:px-8 col-span-2 lg:col-span-1">
              <p class="text-3xl font-bold text-zinc-900 tracking-tight">&lt;24h</p>
              <p class="mt-1 text-sm text-zinc-500">${tr('Data refresh', 'Actualisation données')}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Benefits -->
      <section class="py-24 px-6 lg:px-8 bg-white">
        <div class="mx-auto max-w-7xl">
          <div class="mb-16">
            <p class="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">${tr('Why Carindex', 'Pourquoi Carindex')}</p>
            <h2 class="text-4xl font-bold text-zinc-900 tracking-tight max-w-xl">${tr('Built for automotive professionals', 'Conçu pour les professionnels de l\'automobile')}</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-100 rounded-2xl overflow-hidden">
            <div class="bg-white p-8 lg:p-10">
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-zinc-900 mb-3">${tr('Maximize your margins', 'Maximisez vos marges')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Market price algorithms tell you exactly where to position each vehicle. Professionals using Carindex increase margins by 18% on average.', 'Les algorithmes de prix marché vous indiquent précisément où positionner chaque véhicule. Les professionnels augmentent leurs marges de 18% en moyenne.')}</p>
            </div>
            <div class="bg-white p-8 lg:p-10">
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-zinc-900 mb-3">${tr('Sell faster', 'Vendez plus vite')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Identify underpriced vehicles that sell within days. Our segment analysis helps optimize turnover and free up cash flow faster.', 'Identifiez les véhicules sous-cotés qui partent en quelques jours. Notre analyse par segment optimise votre rotation et libère votre trésorerie.')}</p>
            </div>
            <div class="bg-white p-8 lg:p-10">
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-zinc-900 mb-3">${tr('Data-driven decisions', 'Décisions basées sur les données')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Every purchase, trade-in, or pricing decision backed by thousands of real comparables with a transparent confidence index.', 'Chaque décision d\'achat, de reprise ou de cotation s\'appuie sur des milliers de comparables réels avec un indice de confiance transparent.')}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section id="features" class="py-24 px-6 lg:px-8 bg-zinc-50">
        <div class="mx-auto max-w-7xl">
          <div class="mb-16">
            <p class="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">${tr('Features', 'Fonctionnalités')}</p>
            <h2 class="text-4xl font-bold text-zinc-900 tracking-tight max-w-xl">${tr('Everything you need to optimise your business', 'Tout ce dont vous avez besoin pour optimiser votre activité')}</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Pro Search', 'Recherche Pro')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Advanced filters, bulk export, multi-vehicle comparisons, price history.', 'Filtres avancés, export en masse, comparaisons multi-véhicules, historique des prix.')}</p>
            </div>
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Market Price & Confidence Index', 'Prix Marché & Indice de Confiance')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Accurate pricing in seconds with a confidence index (0–100%) reflecting analysis reliability.', 'Cotation précise en quelques secondes avec un indice de confiance (0–100%) reflétant la fiabilité.')}</p>
            </div>
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Professional Alerts', 'Alertes Professionnelles')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Custom alerts for price drops, new listings, market opportunities. Real-time notifications.', 'Alertes personnalisées sur baisses de prix, nouvelles annonces, opportunités de marché.')}</p>
            </div>
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Multi-Country Market', 'Marché Multi-Pays')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Overview across 20+ countries. Volumes, 30-month trends, top models, market dynamics.', 'Vue d\'ensemble sur 20+ pays. Volumes, tendances 30 mois, modèles performants, dynamique du marché.')}</p>
            </div>
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Advanced Pricing', 'Cotation Avancée')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Comparables, selling time, model attractiveness, competitive positioning, price evolution.', 'Comparables, temps de vente, attractivité modèle, positionnement concurrentiel, évolution des prix.')}</p>
            </div>
            <div class="bg-white rounded-xl p-6 border border-zinc-100 hover:border-zinc-200 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center mb-5">
                <svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-zinc-900 mb-2">${tr('Stock Analysis', 'Analyse de Stock')}</h3>
              <p class="text-sm text-zinc-500 leading-relaxed">${tr('Stock value, under/overpriced models, selling time vs. market, Market Day Supply.', 'Valeur stock, modèles sous/sur-cotés, durée vente vs marché, Market Day Supply.')}</p>
            </div>
          </div>

        </div>
      </section>

      <!-- How it works -->
      <section class="py-24 px-6 lg:px-8 bg-white">
        <div class="mx-auto max-w-3xl">
          <div class="mb-16">
            <p class="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">${tr('How it works', 'Comment ça marche')}</p>
            <h2 class="text-4xl font-bold text-zinc-900 tracking-tight">${tr('Up and running in minutes', 'Opérationnel en quelques minutes')}</h2>
          </div>
          <div class="space-y-0">
            <div class="flex gap-6 pb-10 relative">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div class="w-px flex-1 bg-zinc-100 mt-3"></div>
              </div>
              <div class="pt-1 pb-2">
                <h3 class="text-base font-semibold text-zinc-900 mb-1">${tr('Create your professional account', 'Créez votre compte professionnel')}</h3>
                <p class="text-sm text-zinc-500">${tr('Sign up with your business email. Choose a plan and start your 14-day free trial.', 'Inscrivez-vous avec votre email professionnel. Choisissez un plan et démarrez votre essai gratuit de 14 jours.')}</p>
              </div>
            </div>
            <div class="flex gap-6 pb-10 relative">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div class="w-px flex-1 bg-zinc-100 mt-3"></div>
              </div>
              <div class="pt-1 pb-2">
                <h3 class="text-base font-semibold text-zinc-900 mb-1">${tr('Access market data', 'Accédez aux données du marché')}</h3>
                <p class="text-sm text-zinc-500">${tr('Explore millions of listings. Use advanced filters to find exactly what you\'re looking for across 20+ countries.', 'Explorez des millions d\'annonces. Utilisez les filtres avancés pour trouver exactement ce que vous cherchez dans 20+ pays.')}</p>
              </div>
            </div>
            <div class="flex gap-6 pb-10 relative">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div class="w-px flex-1 bg-zinc-100 mt-3"></div>
              </div>
              <div class="pt-1 pb-2">
                <h3 class="text-base font-semibold text-zinc-900 mb-1">${tr('Set up your alerts', 'Configurez vos alertes')}</h3>
                <p class="text-sm text-zinc-500">${tr('Define alert criteria: price drops, new listings, market movements. Receive real-time notifications.', 'Définissez des critères d\'alerte : baisses de prix, nouvelles annonces, mouvements de marché.')}</p>
              </div>
            </div>
            <div class="flex gap-6">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shrink-0">4</div>
              </div>
              <div class="pt-1">
                <h3 class="text-base font-semibold text-zinc-900 mb-1">${tr('Analyse your stock', 'Analysez votre stock')}</h3>
                <p class="text-sm text-zinc-500">${tr('Import your inventory. Carindex analyses each vehicle against the market and suggests pricing adjustments.', 'Importez votre inventaire. Carindex analyse chaque véhicule face au marché et suggère des ajustements de prix.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="py-24 px-6 lg:px-8 bg-zinc-50">
        <div class="mx-auto max-w-7xl">
          <div class="mb-16 text-center">
            <p class="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">${tr('Pricing', 'Tarifs')}</p>
            <h2 class="text-4xl font-bold text-zinc-900 tracking-tight">${tr('Simple, transparent pricing', 'Tarifs simples et transparents')}</h2>
            <p class="mt-3 text-sm text-zinc-500">${tr('No commitment. Cancel anytime.', 'Sans engagement. Résiliation à tout moment.')}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            <!-- Starter (free) -->
            <div class="bg-white rounded-2xl p-8 border border-zinc-200">
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-4">Starter</h3>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-4xl font-bold text-zinc-900 tracking-tight">${tr('Free', 'Gratuit')}</span>
                </div>
                <p class="mt-3 text-sm text-zinc-500">${tr('Get started at no cost.', 'Commencez gratuitement.')}</p>
              </div>
              <ul class="space-y-3 mb-8">
                ${[
                  [tr('200 searches / month', '200 recherches / mois'), true],
                  [tr('Basic deal score', 'Score deal basique'), true],
                  [tr('Estimated market price', 'Prix marché estimé'), true],
                  [tr('10 saved searches', '10 recherches sauvegardées'), true],
                  [tr('10 price alerts', '10 alertes de prix'), true],
                  [tr('Price history & depreciation', 'Historique & dépréciation'), false],
                  [tr('Import arbitrage', "Arbitrage d'import"), false],
                ].map(([label, included]) => `
                  <li class="flex items-start gap-3 text-sm ${included ? 'text-zinc-600' : 'text-zinc-400 line-through'}">
                    <svg class="w-4 h-4 ${included ? 'text-zinc-400' : 'text-zinc-300'} mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    ${label}
                  </li>`).join('')}
              </ul>
              <a href="#/search" class="block w-full text-center rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors">
                ${tr('Get started free', 'Commencer gratuitement')}
              </a>
            </div>

            <!-- Pro (highlighted) -->
            <div class="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 relative">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                <span class="inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">${tr('Most popular', 'Le plus populaire')}</span>
              </div>
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-zinc-100 uppercase tracking-wide mb-4">Pro</h3>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-4xl font-bold text-white tracking-tight">€19</span>
                  <span class="text-sm text-zinc-400">${tr('/mo', '/mois')}</span>
                </div>
                <p class="mt-3 text-sm text-zinc-400">${tr('7-day free trial. No credit card required.', 'Essai 7 jours. Sans carte bancaire.')}</p>
              </div>
              <ul class="space-y-3 mb-8">
                ${[
                  tr('Unlimited searches', 'Recherches illimitées'),
                  tr('Exact market price', 'Prix marché exact'),
                  tr('Full price history (12 months)', 'Historique des prix (12 mois)'),
                  tr('Depreciation curves', 'Courbes de dépréciation'),
                  tr('Unlimited saved searches & alerts', 'Recherches & alertes illimitées'),
                  tr('Ownership cost calculator', 'Calculateur de TCO'),
                ].map(f => `
                  <li class="flex items-start gap-3 text-sm text-zinc-300">
                    <svg class="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    ${f}
                  </li>`).join('')}
              </ul>
              <button onclick="window.__landingCheckout('pro')" class="block w-full text-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer">
                ${tr('Start 7-day free trial', 'Essayer 7 jours gratuit')}
              </button>
            </div>

            <!-- Dealer -->
            <div class="bg-white rounded-2xl p-8 border border-zinc-200">
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-4">Dealer</h3>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-4xl font-bold text-zinc-900 tracking-tight">€129</span>
                  <span class="text-sm text-zinc-500">${tr('/mo', '/mois')}</span>
                </div>
                <p class="mt-3 text-sm text-zinc-500">${tr('14-day free trial. No credit card required.', 'Essai 14 jours. Sans carte bancaire.')}</p>
              </div>
              <ul class="space-y-3 mb-8">
                ${[
                  tr('Everything in Pro', 'Tout le plan Pro'),
                  tr('Import arbitrage tool', "Outil d'arbitrage import"),
                  tr('Market dashboard & price drops', 'Dashboard marché & baisses de prix'),
                  tr('Batch CSV analysis & export', 'Analyse lot CSV & export'),
                  tr('3 team seats', '3 comptes équipe'),
                  tr('Priority support', 'Support prioritaire'),
                ].map(f => `
                  <li class="flex items-start gap-3 text-sm text-zinc-600">
                    <svg class="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    ${f}
                  </li>`).join('')}
              </ul>
              <button onclick="window.__landingCheckout('dealer')" class="block w-full text-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer">
                ${tr('Start 14-day free trial', 'Essayer 14 jours gratuit')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" class="py-24 px-6 lg:px-8 bg-zinc-50">
        <div class="mx-auto max-w-3xl">
          <div class="mb-12">
            <p class="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">FAQ</p>
            <h2 class="text-4xl font-bold text-zinc-900 tracking-tight">${tr('Frequently asked questions', 'Questions fréquentes')}</h2>
          </div>
          <div class="space-y-px">
            ${[
              { q: tr('Which countries are covered?', 'Quels pays sont couverts ?'), a: tr('Carindex covers 13 European countries: France, Germany, Belgium, Netherlands, Spain, Italy, Sweden, Norway, Finland, Denmark, Switzerland, Luxembourg and Poland. We add new markets based on demand.', 'Carindex couvre 13 pays européens : France, Allemagne, Belgique, Pays-Bas, Espagne, Italie, Suède, Norvège, Finlande, Danemark, Suisse, Luxembourg et Pologne. Nous ajoutons de nouveaux marchés selon la demande.') },
              { q: tr('How accurate are the market prices?', 'Quelle est la précision des prix marché ?'), a: tr('Each market price is calculated from real comparable listings and comes with a confidence index (0–100%). The more listings available for a model, the higher the confidence.', 'Chaque prix de marché est calculé à partir d\'annonces réelles comparables et accompagné d\'un indice de confiance (0–100 %). Plus il y a d\'annonces pour un modèle, plus la confiance est élevée.') },
              { q: tr('How often is data updated?', 'À quelle fréquence les données sont-elles mises à jour ?'), a: tr('Listings are refreshed daily from all covered markets. Price alerts are checked every hour. Historical trend data covers up to 30 months.', 'Les annonces sont actualisées quotidiennement depuis tous les marchés couverts. Les alertes de prix sont vérifiées toutes les heures. Les données historiques couvrent jusqu\'à 30 mois.') },
              { q: tr('Is there a commitment period?', 'Y a-t-il un engagement de durée ?'), a: tr('No commitment. Cancel anytime. Pro includes a 7-day free trial, Dealer a 14-day free trial. You keep access until the end of the current billing period.', 'Aucun engagement. Annulez à tout moment. Pro inclut 7 jours d\'essai gratuit, Dealer 14 jours. Vous gardez l\'accès jusqu\'à la fin de la période en cours.') },
            ].map(({ q, a }) => `
              <div class="bg-white border border-zinc-100 first:rounded-t-xl last:rounded-b-xl p-6">
                <h3 class="text-sm font-semibold text-zinc-900 mb-2">${q}</h3>
                <p class="text-sm text-zinc-500 leading-relaxed">${a}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-24 px-6 lg:px-8 bg-zinc-950">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-4xl font-bold text-white tracking-tight">${tr('Ready to transform your automotive business?', 'Prêt à transformer votre activité automobile ?')}</h2>
          <p class="mt-4 text-zinc-400">${tr('Join hundreds of professionals who trust Carindex.', 'Rejoignez les centaines de professionnels qui font confiance à Carindex.')}</p>
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#/search" class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors">
              ${tr('Start 14-day free trial', 'Démarrer l\'essai gratuit 14 jours')}
            </a>
            <a href="/demo" class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors">
              ${tr('Request a demo', 'Demander une démo')}
            </a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-zinc-950 border-t border-zinc-800 py-12 px-6 lg:px-8">
        <div class="mx-auto max-w-7xl">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div class="col-span-2 md:col-span-1">
              <a href="#" class="flex items-center gap-2 mb-4">
                <div class="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                  <span class="text-zinc-900 font-bold text-xs">C</span>
                </div>
                <span class="text-sm font-semibold text-white">Carindex</span>
              </a>
              <p class="text-xs text-zinc-500 leading-relaxed">${tr('Automotive market intelligence for professionals.', 'L\'intelligence marché automobile pour professionnels.')}</p>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">${tr('Product', 'Produit')}</h4>
              <ul class="space-y-2.5">
                <li><a href="#features" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">${tr('Features', 'Fonctionnalités')}</a></li>
                <li><a href="#pricing" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">${tr('Pricing', 'Tarifs')}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">${tr('Resources', 'Ressources')}</h4>
              <ul class="space-y-2.5">
                <li><a href="/docs" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">${tr('Documentation', 'Documentation')}</a></li>
                <li><a href="/blog" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Blog</a></li>
                <li><a href="/support" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">${tr('Support', 'Support')}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">${tr('Contact', 'Contact')}</h4>
              <ul class="space-y-2.5">
                <li><span class="text-sm text-zinc-500">contact@getcarindex.com</span></li>
              </ul>
            </div>
          </div>
          <div class="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p class="text-xs text-zinc-600">&copy; 2025 Carindex. ${tr('All rights reserved.', 'Tous droits réservés.')}</p>
            <a href="#/login" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">${tr('Login', 'Connexion')}</a>
          </div>
        </div>
      </footer>

    </div>
  `

  const mobileMenuButton = document.getElementById('mobile-menu-button')
  const mobileMenu = document.getElementById('mobile-menu')

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden')
    })
    document.addEventListener('click', (e) => {
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden')
      }
    })
  }

  attachLanguageToggle(() => {
    window.location.reload()
  })

  // Pricing CTA buttons — redirect to Stripe Checkout or /pricing if not logged in
  window.__landingCheckout = async (plan) => {
    const { redirectToCheckout } = await import('../utils/subscription.js')
    redirectToCheckout(plan)
  }
}
