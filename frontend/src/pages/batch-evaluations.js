import { getAuthToken } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, formatCurrency } from '../utils/i18n.js'

const API_BASE = '/api/v1'

/**
 * Render the batch evaluations page (spreadsheet-style)
 */
export function renderBatchEvaluations() {
  try {
    document.body.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <a href="#/" class="flex items-center space-x-2">
              <span class="text-xl sm:text-2xl font-bold text-blue-600">Carindex</span>
            </a>
            <nav class="flex items-center space-x-2 sm:space-x-4">
              ${renderLanguageToggle()}
              <a href="#/evaluations-manager" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('My Evaluations', 'Mes Évaluations')}</a>
              <a href="#/dashboard" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">Dashboard</a>
              <a href="#/auction-margin" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('Calculator', 'Calculateur')}</a>
            </nav>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">${tr('Batch Evaluations', 'Évaluations en Lot')}</h1>
          <p class="text-gray-600">${tr('Paste your URLs and launch analyses automatically', 'Collez vos URLs et lancez les analyses automatiquement')}</p>
        </div>

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="text-sm text-blue-800">
              <p class="font-semibold mb-1">${tr('How to use:', 'Comment utiliser :')}</p>
              <ol class="list-decimal list-inside space-y-1">
                <li>${tr('Paste your auction URLs (one per line or comma-separated)', 'Collez vos URLs d\'enchères (une par ligne ou séparées par des virgules)')}</li>
                <li>${tr('Click "Start analyses"', 'Cliquez sur "Lancer les analyses"')}</li>
                <li>${tr('Results will appear automatically in the table', 'Les résultats s\'afficheront automatiquement dans le tableau')}</li>
                <li>${tr('Maximum 50 URLs per batch', 'Maximum 50 URLs par lot')}</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">${tr('URLs to analyze', 'URLs à analyser')}</h2>
            <div class="flex items-center space-x-2">
              <button id="clear-btn" onclick="clearUrls()" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                ${tr('Clear', 'Effacer')}
              </button>
              <button id="start-btn" onclick="startBatchAnalysis()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                🚀 ${tr('Start analyses', 'Lancer les analyses')}
              </button>
            </div>
          </div>
          <textarea 
            id="urls-input" 
            placeholder="${tr('Paste your URLs here (one per line)', 'Collez vos URLs ici (une par ligne)')}&#10;${tr('Example:', 'Exemple:')}&#10;https://www.kvd.se/auction/...&#10;https://www.kvd.se/auction/..."
            class="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
          <div class="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span id="url-count">0 ${tr('URL(s)', 'URL(s)')}</span>
            <span id="processing-status" class="hidden text-blue-600 font-medium"></span>
          </div>
        </div>

        <!-- Results Table -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">${tr('Results', 'Résultats')}</h2>
            <div class="flex items-center space-x-2">
              <button onclick="exportResults()" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                📥 ${tr('Export CSV', 'Exporter CSV')}
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Status', 'Statut')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Brand', 'Marque')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Model', 'Modèle')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Year', 'Année')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Median Margin', 'Marge Médiane')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Estimated Price', 'Prix Estimé')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody id="results-tbody" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                    ${tr('No results. Paste URLs and start analyses.', 'Aucun résultat. Collez des URLs et lancez les analyses.')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
    `;

    // Setup event listeners
    setupEventListeners();
    attachLanguageToggle(() => {
      window.location.reload();
    });
  } catch (error) {
    console.error('Error rendering batch evaluations page:', error);
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <p class="text-red-600">${tr('Error loading the page', 'Erreur lors du chargement de la page')}</p>
          <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">${tr('Reload', 'Recharger')}</button>
        </div>
      </div>
    `;
  }
}

function setupEventListeners() {
  const urlsInput = document.getElementById('urls-input');
  if (urlsInput) {
    urlsInput.addEventListener('input', updateUrlCount);
    urlsInput.addEventListener('paste', () => {
      setTimeout(updateUrlCount, 100);
    });
  }
}

function updateUrlCount() {
  const input = document.getElementById('urls-input');
  const countEl = document.getElementById('url-count');
  if (!input || !countEl) return;

  const text = input.value.trim();
  if (!text) {
    countEl.textContent = `0 ${tr('URL(s)', 'URL(s)')}`;
    return;
  }

  // Split by newlines, commas, or semicolons
  const urls = text
    .split(/[\n,;]/)
    .map(url => url.trim())
    .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

  countEl.textContent = `${urls.length} ${tr('URL(s)', 'URL(s)')}`;
}

function clearUrls() {
  const input = document.getElementById('urls-input');
  if (input) {
    input.value = '';
    updateUrlCount();
  }
  
  const tbody = document.getElementById('results-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-gray-500">
          ${tr('No results. Paste URLs and start analyses.', 'Aucun résultat. Collez des URLs et lancez les analyses.')}
        </td>
      </tr>
    `;
  }
}

async function startBatchAnalysis() {
  const token = getAuthToken();
  if (!token) {
    alert(tr('You must be logged in', 'Vous devez être connecté'));
    window.location.hash = '#/auth-login';
    return;
  }

  const input = document.getElementById('urls-input');
  const startBtn = document.getElementById('start-btn');
  const statusEl = document.getElementById('processing-status');
  const tbody = document.getElementById('results-tbody');

  if (!input || !startBtn || !statusEl || !tbody) return;

  const text = input.value.trim();
  if (!text) {
    alert(tr('Please enter at least one URL', 'Veuillez entrer au moins une URL'));
    return;
  }

  // Parse URLs
  const urls = text
    .split(/[\n,;]/)
    .map(url => url.trim())
    .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

  if (urls.length === 0) {
    alert(tr('No valid URL found', 'Aucune URL valide trouvée'));
    return;
  }

  if (urls.length > 50) {
    alert(tr('Maximum 50 URLs per batch', 'Maximum 50 URLs par lot'));
    return;
  }

  // Disable button and show loading
  startBtn.disabled = true;
  startBtn.textContent = `⏳ ${tr('Processing...', 'Traitement en cours...')}`;
  statusEl.classList.remove('hidden');
  statusEl.textContent = `${tr('Processing', 'Traitement de')} ${urls.length} ${tr('URL(s)', 'URL(s)')}...`;

  // Clear previous results
  tbody.innerHTML = urls.map((url, index) => `
    <tr id="row-${index}" class="bg-yellow-50">
      <td class="px-4 py-3 text-sm text-gray-900">${index + 1}</td>
      <td class="px-4 py-3 text-sm font-mono text-gray-600 max-w-md truncate">${url}</td>
      <td class="px-4 py-3 text-sm">
        <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">⏳ ${tr('In progress...', 'En cours...')}</span>
      </td>
      <td class="px-4 py-3 text-sm text-gray-500" colspan="6">${tr('Analysis in progress...', 'Analyse en cours...')}</td>
    </tr>
  `).join('');

  try {
    const response = await fetch(`${API_BASE}/evaluations/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls,
        options: {
          concurrency: 3 // Process 3 at a time
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || tr('Error during processing', 'Erreur lors du traitement'));
    }

    const data = await response.json();

    // Update table with results
    if (data.results && data.results.length > 0) {
      tbody.innerHTML = data.results.map((result, index) => {
        if (result.status === 'success' && result.evaluation) {
          const evaluation = result.evaluation;
          return `
            <tr id="row-${index}" class="bg-green-50 hover:bg-green-100">
              <td class="px-4 py-3 text-sm text-gray-900">${index + 1}</td>
              <td class="px-4 py-3 text-sm font-mono text-gray-600 max-w-md truncate" title="${result.url}">${result.url}</td>
              <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">✅ ${tr('Success', 'Succès')}</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 font-medium">${evaluation.brand || '-'}</td>
              <td class="px-4 py-3 text-sm text-gray-900 font-medium">${evaluation.model || '-'}</td>
              <td class="px-4 py-3 text-sm text-gray-600">${evaluation.year || '-'}</td>
              <td class="px-4 py-3 text-sm text-green-600 font-semibold">
                ${evaluation.margin_mid ? formatCurrency(evaluation.margin_mid) : '-'}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 font-medium">
                ${evaluation.price_estimate_mid ? formatCurrency(evaluation.price_estimate_mid) : '-'}
              </td>
              <td class="px-4 py-3 text-sm">
                <a href="#/evaluations-manager" class="text-blue-600 hover:text-blue-800 font-medium">${tr('View', 'Voir')}</a>
              </td>
            </tr>
          `;
        } else {
          return `
            <tr id="row-${index}" class="bg-red-50 hover:bg-red-100">
              <td class="px-4 py-3 text-sm text-gray-900">${index + 1}</td>
              <td class="px-4 py-3 text-sm font-mono text-gray-600 max-w-md truncate" title="${result.url}">${result.url}</td>
              <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">❌ ${tr('Error', 'Erreur')}</span>
              </td>
              <td class="px-4 py-3 text-sm text-red-600" colspan="6" title="${result.error || tr('Unknown error', 'Erreur inconnue')}">
                ${result.error || tr('Unknown error', 'Erreur inconnue')}
              </td>
            </tr>
          `;
        }
      }).join('');
    }

    // Update status
    statusEl.textContent = `✅ ${tr('Completed:', 'Terminé :')} ${data.success_count} ${tr('success', 'succès')}, ${data.error_count} ${tr('error(s)', 'erreur(s)')}`;
    statusEl.classList.remove('text-blue-600');
    statusEl.classList.add('text-green-600');

    // Re-enable button
    startBtn.disabled = false;
    startBtn.textContent = `🚀 ${tr('Start analyses', 'Lancer les analyses')}`;

    // Store results for export
    window.batchResults = data.results;

  } catch (error) {
    console.error('Error in batch analysis:', error);
    
    // Show error in table
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center">
          <div class="text-red-600">
            <p class="font-semibold">${tr('Error during processing', 'Erreur lors du traitement')}</p>
            <p class="text-sm mt-2">${error.message}</p>
          </div>
        </td>
      </tr>
    `;

    statusEl.textContent = `❌ ${tr('Error:', 'Erreur :')} ${error.message}`;
    statusEl.classList.remove('text-blue-600');
    statusEl.classList.add('text-red-600');

    // Re-enable button
    startBtn.disabled = false;
    startBtn.textContent = `🚀 ${tr('Start analyses', 'Lancer les analyses')}`;
  }
}

function exportResults() {
  if (!window.batchResults || window.batchResults.length === 0) {
    alert(tr('No results to export', 'Aucun résultat à exporter'));
    return;
  }

  // Create CSV content
  const headers = ['#', 'URL', tr('Status', 'Statut'), tr('Brand', 'Marque'), tr('Model', 'Modèle'), tr('Year', 'Année'), tr('Median Margin (EUR)', 'Marge Médiane (EUR)'), tr('Estimated Price (EUR)', 'Prix Estimé (EUR)'), tr('Error', 'Erreur')];
  const rows = window.batchResults.map((result, index) => {
    if (result.status === 'success' && result.evaluation) {
      const evaluation = result.evaluation;
      return [
        index + 1,
        result.url,
        tr('Success', 'Succès'),
        evaluation.brand || '',
        evaluation.model || '',
        evaluation.year || '',
        evaluation.margin_mid || '',
        evaluation.price_estimate_mid || '',
        ''
      ];
    } else {
      return [
        index + 1,
        result.url,
        tr('Error', 'Erreur'),
        '',
        '',
        '',
        '',
        '',
        result.error || tr('Unknown error', 'Erreur inconnue')
      ];
    }
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evaluations-batch-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Make functions globally available
window.startBatchAnalysis = startBatchAnalysis;
window.clearUrls = clearUrls;
window.exportResults = exportResults;
