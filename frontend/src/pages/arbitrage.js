import { getAuthToken } from '../main.js';
import { tr, renderLanguageToggle, formatCurrency, capitalize } from '../utils/i18n.js';

const API_BASE = '/api/v1';
const COUNTRY_NAMES = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', LU: 'Luxembourg', NL: 'Pays-Bas',
  ES: 'Espagne', IT: 'Italie', CH: 'Suisse', PL: 'Pologne', NO: 'Norvège',
  DK: 'Danemark', FI: 'Finlande', SE: 'Suède'
};

/** External marketplace search URLs by country (buy country = where to find cars) */
const EXTERNAL_SEARCH_URLS = {
  DE: (brand, model) => `https://suchen.mobile.de/fahrzeuge/search.html?lang=de&cn=DE&s=Car&vc=Car&q=${encodeURIComponent(brand + ' ' + model)}`,
  DK: (brand, model) => `https://suchen.mobile.de/fahrzeuge/search.html?lang=de&cn=DK&s=Car&vc=Car&q=${encodeURIComponent(brand + ' ' + model)}`,
  SE: (brand, model) => `https://www.blocket.se/mobility/search/car?q=${encodeURIComponent(brand + ' ' + model)}`,
  NO: (brand, model) => `https://www.finn.no/mobility/search/car?q=${encodeURIComponent(brand + ' ' + model)}`,
  NL: (brand, model) => `https://www.gaspedaal.nl/zoeken?srt=df-a&q=${encodeURIComponent(brand + ' ' + model)}`,
  BE: (brand, model) => `https://www.2ememain.be/l/autos/?search_term=${encodeURIComponent(brand + ' ' + model)}`,
  FR: (brand, model) => `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(brand + ' ' + model)}&category=2`,
  IT: (brand, model) => `https://www.subito.it/annunci-italia/vendita/auto?q=${encodeURIComponent(brand + ' ' + model)}`,
  ES: (brand, model) => `https://www.coches.net/segunda-mano/coches/?q=${encodeURIComponent(brand + ' ' + model)}`,
  PL: (brand, model) => `https://www.otomoto.pl/osobowe?search%5Bfilter_enum_make%5D=${encodeURIComponent(brand)}&search%5Bfilter_enum_model%5D=${encodeURIComponent(model)}`,
  FI: (brand, model) => `https://www.nettiauto.com/?make=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`,
  CH: (brand, model) => `https://suchen.mobile.de/fahrzeuge/search.html?lang=de&cn=CH&s=Car&vc=Car&q=${encodeURIComponent(brand + ' ' + model)}`,
  LU: (brand, model) => `https://suchen.mobile.de/fahrzeuge/search.html?lang=de&cn=LU&s=Car&vc=Car&q=${encodeURIComponent(brand + ' ' + model)}`,
};

async function apiGet(path, params = {}, options = {}) {
  const q = new URLSearchParams(params).toString();
  const headers = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/arbitrage/${path}${q ? '?' + q : ''}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data?.error?.message || data?.error?.code || `Erreur ${res.status}` };
  }
  return data;
}

export function renderArbitrage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div class="container mx-auto px-3 sm:px-6 py-3 sm:py-4 max-w-[100vw]">
        <div class="flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <a href="#/" class="flex items-center space-x-2 shrink-0">
              <span class="text-lg sm:text-2xl font-bold text-blue-600">Carindex</span>
            </a>
            <h1 class="text-base sm:text-xl font-semibold text-gray-900 truncate">Arbitrage Véhicule</h1>
          </div>
          <nav class="flex items-center space-x-2 sm:space-x-4 shrink-0 text-sm sm:text-base">
            ${renderLanguageToggle()}
            <a href="#/dashboard" class="text-gray-600 hover:text-blue-600 whitespace-nowrap">Dashboard</a>
            <a href="#/search" class="text-gray-600 hover:text-blue-600 whitespace-nowrap">Recherche</a>
          </nav>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-[100vw] overflow-x-hidden">
      <!-- Opportunités auto-détectées -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-4">🔄 Opportunités auto-détectées</h2>
        <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Mises à jour quotidiennement (4h). Achat dans le pays moins cher, vente dans le pays plus cher.</p>
        <div id="auto-opp-result" class="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-gray-200" style="-webkit-overflow-scrolling: touch">Chargement...</div>
      </div>

      <!-- Simulateur coûts d'import -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">💰 Simulateur de coûts d'import</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Prix d'achat (€)</label>
            <input type="number" id="sim-price" placeholder="25000" class="w-full px-3 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Pays achat</label>
            <select id="sim-buy" class="w-full px-3 py-2 border rounded-lg">
              ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Pays vente</label>
            <select id="sim-sell" class="w-full px-3 py-2 border rounded-lg">
              ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Réparations (€)</label>
            <input type="number" id="sim-reconditioning" placeholder="500" min="0" class="w-full px-3 py-2 border rounded-lg" title="Réparations / réconditionnement estimées avant revente">
          </div>
          <div class="flex items-end">
            <button onclick="window.calcImportCosts()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Calculer
            </button>
          </div>
        </div>
        <div id="sim-result" class="hidden p-4 bg-gray-50 rounded-lg"></div>
      </div>

      <!-- Comparaison prix par pays -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">📊 Comparaison des prix par pays</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <input type="text" id="comp-brand" placeholder="Marque (ex: bmw)" class="px-3 py-2 border rounded-lg">
          <input type="text" id="comp-model" placeholder="Modèle (ex: x3)" class="px-3 py-2 border rounded-lg">
          <input type="number" id="comp-year" placeholder="Année (optionnel)" class="px-3 py-2 border rounded-lg" min="2000">
          <button onclick="window.loadPriceComparison()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Comparer</button>
        </div>
        <div id="comp-result" class="overflow-x-auto"></div>
      </div>

      <!-- Opportunités d'arbitrage -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">🎯 Opportunités d'arbitrage</h2>
        <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Paires de pays où acheter moins cher et revendre plus cher (marge après coûts)</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <input type="text" id="opp-brand" placeholder="Marque" class="px-3 py-2 border rounded-lg">
          <input type="text" id="opp-model" placeholder="Modèle" class="px-3 py-2 border rounded-lg">
          <input type="number" id="opp-year" placeholder="Année" class="px-3 py-2 border rounded-lg" min="2000">
          <button onclick="window.loadOpportunities()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Rechercher</button>
        </div>
        <div id="opp-result" class="overflow-x-auto"></div>
      </div>

      <!-- Annonces avec opportunité -->
      <div id="list-listings-section" class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">🚗 Annonces avec opportunité</h2>
        <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Annonces réelles sous la médiane du pays de vente cible</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4 flex-wrap">
          <input type="text" id="list-brand" placeholder="Marque" class="px-3 py-2 border rounded-lg">
          <input type="text" id="list-model" placeholder="Modèle" class="px-3 py-2 border rounded-lg">
          <input type="number" id="list-year" placeholder="Année" class="px-3 py-2 border rounded-lg">
          <select id="list-buy" class="px-3 py-2 border rounded-lg">
            <option value="">Achat...</option>
            ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
          </select>
          <select id="list-sell" class="px-3 py-2 border rounded-lg">
            <option value="">Vente...</option>
            ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
          </select>
          <button onclick="window.loadListingsArbitrage()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 col-span-full md:col-span-1">Rechercher</button>
        </div>
        <div id="list-result" class="overflow-x-auto"></div>
      </div>

      <!-- Alerte arbitrage -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-6 overflow-hidden">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">🔔 Alerte arbitrage</h2>
        <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Recevez un email quand une annonce rentable apparaît (achat en X, vente en Y)</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <input type="text" id="alert-name" placeholder="Nom de l'alerte" class="px-3 py-2 border rounded-lg">
          <input type="text" id="alert-brand" placeholder="Marque" class="px-3 py-2 border rounded-lg">
          <input type="text" id="alert-model" placeholder="Modèle" class="px-3 py-2 border rounded-lg">
          <select id="alert-buy" class="px-3 py-2 border rounded-lg">
            <option value="">Achat...</option>
            ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
          </select>
          <select id="alert-sell" class="px-3 py-2 border rounded-lg">
            <option value="">Vente...</option>
            ${Object.entries(COUNTRY_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}
          </select>
          <input type="number" id="alert-margin" placeholder="Marge min (€)" value="2000" class="px-3 py-2 border rounded-lg">
          <button onclick="window.createArbitrageAlert()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Créer l'alerte</button>
        </div>
        <div id="alert-result" class="text-sm"></div>
      </div>
    </div>
  `;

  window.loadAutoDetected = async () => {
    const el = document.getElementById('auto-opp-result');
    if (!el) return;
    el.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    try {
      const r = await apiGet('auto-detected', { limit: 500, _: Date.now() });
      const errMsg = r?.error?.message || (typeof r?.error === 'string' ? r.error : r?.error?.code) || 'Erreur API';
      if (!r?.success) { el.innerHTML = `<p class="text-red-600">${errMsg}</p>`; return; }
      if (!r.opportunities?.length) {
        el.innerHTML = '<p class="text-gray-500">Aucune opportunité détectée pour l\'instant. Le job tourne chaque nuit.</p>';
        return;
      }
    const appBaseUrl = window.location.origin;
    const buildListingsUrl = (brand, model, buy, sell) => {
      const p = new URLSearchParams({ brand, model, buy, sell });
      return `${appBaseUrl}/?${p.toString()}#/arbitrage`;
    };
    el.innerHTML = `
      <table class="min-w-[720px] divide-y divide-gray-200 text-sm table-sticky-col">
        <thead class="bg-gray-50"><tr>
          <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Modèle</th>
          <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Achat</th>
          <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Vente</th>
          <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Liquidité</th>
          <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Prix achat</th>
          <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Prix vente</th>
          <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Marge nette</th>
          <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Liens</th>
        </tr></thead>
        <tbody class="bg-white divide-y">
          ${r.opportunities.map(o => {
            const brand = (o.brand || '').replace(/"/g, '&quot;');
            const model = (o.model || '').replace(/"/g, '&quot;');
            const buy = o.buy_country || '';
            const sell = o.sell_country || '';
            const listingsUrl = buildListingsUrl(o.brand, o.model, buy, sell);
            const listings = o.listings || o.top_listings || [];
            const exactLinks = listings.length > 0
              ? listings.slice(0, 3).map((item, i) => {
                  const url = (typeof item === 'string' ? item : item?.url) || '';
                  const obj = typeof item === 'object' ? item : {};
                  const priceStr = obj.priceEur != null ? formatCurrency(obj.priceEur) : '';
                  const label = obj.trim ? `${obj.trim} ${priceStr}`.trim() : priceStr || 'Voir';
                  return `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium" title="Ouvrir l'annonce sur mobile.de / Blocket / …">${label} →</a>`;
                }).join(' · ')
              : '';
            const liquidity = (o.listing_count_buy || 0) + (o.listing_count_sell || 0);
            return `
            <tr class="hover:bg-gray-50 cursor-pointer" data-brand="${brand}" data-model="${model}" data-buy="${buy}" data-sell="${sell}" onclick="window.fillOppFromAuto(this)">
              <td class="px-3 sm:px-4 py-2 font-medium whitespace-nowrap">${capitalize(o.brand)} ${capitalize(o.model)}</td>
              <td class="px-3 sm:px-4 py-2 whitespace-nowrap">${COUNTRY_NAMES[buy] || buy}</td>
              <td class="px-3 sm:px-4 py-2 whitespace-nowrap">${COUNTRY_NAMES[sell] || sell}</td>
              <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap" title="${o.listing_count_buy || 0} annonces achat + ${o.listing_count_sell || 0} vente">${liquidity}</td>
              <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap">${formatCurrency(o.buy_median_price)}</td>
              <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap">${formatCurrency(o.sell_median_price)}</td>
              <td class="px-3 sm:px-4 py-2 text-right font-bold text-green-600 whitespace-nowrap">${formatCurrency(o.net_margin)} (${o.net_margin_pct || 0}%)</td>
              <td class="px-3 sm:px-4 py-2 min-w-[200px]" onclick="event.stopPropagation()">
                ${exactLinks ? `<span class="inline-flex flex-wrap items-center gap-x-2">${exactLinks}</span>` : '<span class="text-gray-400 text-sm">Aucun lien direct</span>'}
                <span class="text-gray-300 mx-2">|</span>
                <a href="${listingsUrl}" class="text-gray-500 hover:underline text-sm">Nos annonces</a>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
      <p class="text-xs text-gray-500 mt-2">Classé par <strong>liquidité</strong> (annonces achat + vente). <strong>Lien direct</strong> (ex. « €24,900 → ») = ouvre l'annonce sur mobile.de / Blocket. « Nos annonces » = nos résultats.</p>
    `;
    } catch (err) {
      el.innerHTML = `<p class="text-red-600">Erreur: ${err?.message || 'Connexion impossible'}. Vérifiez que vous êtes connecté.</p>`;
    }
  };

  window.fillOppFromAuto = (row) => {
    const brand = row?.dataset?.brand || '';
    const model = row?.dataset?.model || '';
    const buy = row?.dataset?.buy || '';
    const sell = row?.dataset?.sell || '';
    const oppBrand = document.getElementById('opp-brand');
    const oppModel = document.getElementById('opp-model');
    const listBrand = document.getElementById('list-brand');
    const listModel = document.getElementById('list-model');
    const listBuy = document.getElementById('list-buy');
    const listSell = document.getElementById('list-sell');
    if (oppBrand) oppBrand.value = brand;
    if (oppModel) oppModel.value = model;
    if (listBrand) listBrand.value = brand;
    if (listModel) listModel.value = model;
    if (listBuy) listBuy.value = buy;
    if (listSell) listSell.value = sell;
  };

  loadAutoDetected();

  // Auto-load listings from URL params (e.g. ?brand=ferrari&model=f430&buy=SE&sell=BE)
  const urlParams = new URLSearchParams(window.location.search);
  const urlBrand = urlParams.get('brand');
  const urlModel = urlParams.get('model');
  const urlBuy = urlParams.get('buy');
  const urlSell = urlParams.get('sell');
  if (urlBrand && urlModel && urlBuy && urlSell) {
    const listBrand = document.getElementById('list-brand');
    const listModel = document.getElementById('list-model');
    const listBuy = document.getElementById('list-buy');
    const listSell = document.getElementById('list-sell');
    if (listBrand) listBrand.value = urlBrand;
    if (listModel) listModel.value = urlModel;
    if (listBuy) listBuy.value = urlBuy;
    if (listSell) listSell.value = urlSell;
    document.getElementById('list-listings-section')?.scrollIntoView?.({ behavior: 'smooth' });
    setTimeout(() => window.loadListingsArbitrage?.(), 300);
  }

  window.calcImportCosts = async () => {
    const price = document.getElementById('sim-price').value;
    const buy = document.getElementById('sim-buy').value;
    const sell = document.getElementById('sim-sell').value;
    const reconditioning = document.getElementById('sim-reconditioning')?.value;
    if (!price || !buy || !sell) return;
    const params = { purchasePrice: price, buyCountry: buy, sellCountry: sell };
    if (reconditioning != null && reconditioning !== '') params.reconditioningEur = reconditioning;
    const r = await apiGet('import-costs', params);
    const el = document.getElementById('sim-result');
    el.classList.remove('hidden');
    el.innerHTML = r.success ? `
      <div class="space-y-2 text-sm">
        <p><strong>Prix achat:</strong> ${formatCurrency(r.purchasePrice)}</p>
        <p><strong>Transport:</strong> ${formatCurrency(r.breakdown.transport)}</p>
        <p><strong>Immatriculation:</strong> ${formatCurrency(r.breakdown.registration)}</p>
        <p><strong>Réparations / réconditionnement:</strong> ${formatCurrency(r.breakdown.reconditioning ?? 500)}</p>
        <p><strong>TVA (${r.breakdown.vatRecoverable ? 'récupérable' : 'nette'}):</strong> ${formatCurrency(r.breakdown.vatNetCost)}</p>
        <p class="pt-2 font-bold text-lg">Coût total import: ${formatCurrency(r.totalCost)}</p>
        <p class="font-bold">Coût au pays de vente: ${formatCurrency(r.costToSellCountry)}</p>
      </div>
    ` : `<p class="text-red-600">${r.error}</p>`;
  };

  window.loadPriceComparison = async () => {
    const brand = document.getElementById('comp-brand').value.trim();
    const model = document.getElementById('comp-model').value.trim();
    const year = document.getElementById('comp-year').value;
    const el = document.getElementById('comp-result');
    if (!brand || !model) { el.innerHTML = '<p class="text-gray-500">Marque et modèle requis</p>'; return; }
    el.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    const r = await apiGet('price-comparison', { brand, model, year: year || undefined });
    if (!r.success) { el.innerHTML = `<p class="text-red-600">${r.error}</p>`; return; }
    if (!r.byCountry?.length) { el.innerHTML = '<p class="text-gray-500">Aucune donnée pour ce modèle</p>'; return; }
    el.innerHTML = `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Pays</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Annonces</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix min</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Médian</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix max</th>
        </tr></thead>
        <tbody class="bg-white divide-y">
          ${r.byCountry.map(p => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">${COUNTRY_NAMES[p.country] || p.country}</td>
              <td class="px-4 py-2 text-right">${p.count}</td>
              <td class="px-4 py-2 text-right">${formatCurrency(p.minPrice)}</td>
              <td class="px-4 py-2 text-right font-semibold">${formatCurrency(p.medianPrice)}</td>
              <td class="px-4 py-2 text-right">${formatCurrency(p.maxPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-sm text-gray-600 mt-2">Écart: ${formatCurrency(r.priceSpread)} entre le moins cher et le plus cher</p>
    `;
  };

  window.loadOpportunities = async () => {
    const brand = document.getElementById('opp-brand').value.trim();
    const model = document.getElementById('opp-model').value.trim();
    const year = document.getElementById('opp-year').value;
    const el = document.getElementById('opp-result');
    if (!brand || !model) { el.innerHTML = '<p class="text-gray-500">Marque et modèle requis</p>'; return; }
    el.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    const r = await apiGet('opportunities', { brand, model, year: year || undefined });
    if (!r.success) { el.innerHTML = `<p class="text-red-600">${r.error}</p>`; return; }
    if (!r.opportunities?.length) { el.innerHTML = '<p class="text-gray-500">Aucune opportunité trouvée (marge min 2000€)</p>'; return; }
    el.innerHTML = `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Achat</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Vente</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix achat</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix vente</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Marge nette</th>
        </tr></thead>
        <tbody class="bg-white divide-y">
          ${r.opportunities.map(o => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2">${COUNTRY_NAMES[o.buyCountry] || o.buyCountry}</td>
              <td class="px-4 py-2">${COUNTRY_NAMES[o.sellCountry] || o.sellCountry}</td>
              <td class="px-4 py-2 text-right">${formatCurrency(o.buyMedianPrice)}</td>
              <td class="px-4 py-2 text-right">${formatCurrency(o.sellMedianPrice)}</td>
              <td class="px-4 py-2 text-right font-bold text-green-600">${formatCurrency(o.netMargin)} (${o.netMarginPct}%)</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  window.createArbitrageAlert = async () => {
    const name = document.getElementById('alert-name').value.trim();
    const brand = document.getElementById('alert-brand').value.trim();
    const model = document.getElementById('alert-model').value.trim();
    const buy = document.getElementById('alert-buy').value;
    const sell = document.getElementById('alert-sell').value;
    const margin = parseInt(document.getElementById('alert-margin').value) || 2000;
    const el = document.getElementById('alert-result');
    if (!name || !brand || !model || !buy || !sell) {
      el.innerHTML = '<p class="text-red-600">Remplissez tous les champs</p>';
      return;
    }
    el.innerHTML = '<p class="text-gray-500">Création...</p>';
    const r = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        name,
        type: 'arbitrage',
        criteria: { brand, model, buy_country: buy, sell_country: sell, min_margin_eur: margin }
      })
    });
    const data = await r.json();
    el.innerHTML = r.ok
      ? '<p class="text-green-600">Alerte créée ! Vous recevrez un email à chaque nouvelle opportunité.</p>'
      : `<p class="text-red-600">${data.error || 'Erreur'}</p>`;
  };

  window.loadListingsArbitrage = async () => {
    const brand = document.getElementById('list-brand').value.trim();
    const model = document.getElementById('list-model').value.trim();
    const year = document.getElementById('list-year').value;
    const buy = document.getElementById('list-buy').value;
    const sell = document.getElementById('list-sell').value;
    const el = document.getElementById('list-result');
    if (!brand || !model || !buy || !sell) { el.innerHTML = '<p class="text-gray-500">Marque, modèle, pays achat et vente requis</p>'; return; }
    el.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    const r = await apiGet('listings', { brand, model, year: year || undefined, buyCountry: buy, sellCountry: sell });
    if (!r.success) { el.innerHTML = `<p class="text-red-600">${r.error}</p>`; return; }
    if (!r.opportunities?.length) { el.innerHTML = '<p class="text-gray-500">Aucune annonce avec marge > 1500€</p>'; return; }
    el.innerHTML = `
      <p class="text-sm text-gray-600 mb-2">Médiane pays vente (${COUNTRY_NAMES[sell]}): ${formatCurrency(r.medianSell)}</p>
      <div class="space-y-2">
        ${r.opportunities.map(o => `
          <div class="flex flex-wrap items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div>
              <span class="font-semibold">${capitalize(o.brand)} ${capitalize(o.model)} ${o.year || ''}</span>
              <span class="text-gray-600 ml-2">${o.mileage ? (o.mileage / 1000).toFixed(0) + ' km' : ''}</span>
            </div>
            <div class="flex items-center gap-4">
              <span>${formatCurrency(o.priceEur)}</span>
              <span class="text-green-600 font-bold">${formatCurrency(o.netMargin)} marge</span>
              ${o.url ? `<a href="${o.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline text-sm">Voir annonce →</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };
}
