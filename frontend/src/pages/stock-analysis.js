import { tr, renderLanguageToggle, attachLanguageToggle, formatNumber, formatCurrency } from '../utils/i18n.js'

export function renderStockAnalysis() {
  const container = document.getElementById('app')
  
  container.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-14 sm:h-16">
            <div class="flex items-center space-x-4 sm:space-x-8">
              <a href="#/" class="text-lg sm:text-xl font-bold text-blue-600">Carindex</a>
              <div class="hidden sm:flex items-center space-x-4">
                ${renderLanguageToggle()}
                <a href="#/search" class="text-gray-600 hover:text-blue-600 transition text-sm">${tr('Search', 'Recherche')}</a>
                <a href="#/dashboard" class="text-gray-600 hover:text-blue-600 transition text-sm">Dashboard</a>
                <a href="#/stock-analysis" class="text-blue-600 font-medium text-sm">${tr('Stock Analysis', 'Analyse Stock')}</a>
              </div>
            </div>
            <div class="flex items-center space-x-2 sm:space-x-4">
              ${(() => {
                const token = localStorage.getItem('carindex_token')
                const user = token ? JSON.parse(localStorage.getItem('carindex_user') || '{}') : null
                if (user) {
                  return `
                    <a href="#/dashboard" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm">Dashboard</a>
                    <span class="hidden sm:inline text-gray-600 text-sm">${user.email}</span>
                    <button onclick="window.logout()" class="px-3 sm:px-4 py-2 text-gray-600 hover:text-blue-600 transition text-sm">${tr('Logout', 'Déconnexion')}</button>
                  `
                } else {
                  return `
                    <a href="#/login" class="text-gray-600 hover:text-blue-600 transition text-sm">${tr('Login', 'Connexion')}</a>
                    <a href="#/signup" class="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">${tr('Sign up', 'Inscription')}</a>
                  `
                }
              })()}
            </div>
          </div>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">${tr('Stock Analysis', 'Analyse de Stock')}</h1>
          <p class="text-sm sm:text-base text-gray-600">${tr('Compare your stock with market prices and get pricing recommendations', 'Comparez votre stock avec les prix du marché et obtenez des recommandations de pricing')}</p>
        </div>

        <!-- Upload Section -->
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">${tr('Import your stock', 'Importer votre stock')}</h2>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-blue-500 transition">
            <input type="file" id="stock-file" accept=".csv,.xlsx,.json" class="hidden">
            <label for="stock-file" class="cursor-pointer">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p class="text-gray-600 mb-2">${tr('Click to upload a CSV, Excel, or JSON file', 'Cliquez pour télécharger un fichier CSV, Excel ou JSON')}</p>
              <p class="text-sm text-gray-500">${tr('Expected format: brand, model, year, mileage, asking price', 'Format attendu: marque, modèle, année, kilométrage, prix demandé')}</p>
            </label>
          </div>
          <div id="file-info" class="mt-4 hidden">
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span id="file-name" class="text-gray-700 font-medium"></span>
                <span id="file-count" class="text-sm text-gray-500"></span>
              </div>
              <button id="analyze-btn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                ${tr('Analyze', 'Analyser')}
              </button>
            </div>
          </div>
        </div>

        <!-- Manual Entry Section -->
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">${tr('Or add manually', 'Ou ajouter manuellement')}</h2>
          <form id="manual-entry-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <input type="text" id="manual-brand" placeholder="${tr('Brand', 'Marque')}" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <input type="text" id="manual-model" placeholder="${tr('Model', 'Modèle')}" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <input type="number" id="manual-year" placeholder="${tr('Year', 'Année')}" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <input type="number" id="manual-mileage" placeholder="${tr('Mileage', 'Kilométrage')}" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <input type="number" id="manual-price" placeholder="${tr('Asking price (€)', 'Prix demandé (€)')}" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <button type="submit" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium">
              ${tr('Add to stock', 'Ajouter au stock')}
            </button>
          </form>
        </div>

        <!-- Results Section -->
        <div id="results-section" class="hidden">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 mb-1">${tr('Total stock value', 'Valeur totale stock')}</p>
                  <p id="total-stock-value" class="text-2xl font-bold text-gray-900">-</p>
                </div>
                <div class="p-3 bg-blue-100 rounded-lg">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 mb-1">${tr('Underpriced', 'Sous-évalués')}</p>
                  <p id="underpriced-count" class="text-2xl font-bold text-red-600">-</p>
                </div>
                <div class="p-3 bg-red-100 rounded-lg">
                  <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 mb-1">${tr('Overpriced', 'Sur-évalués')}</p>
                  <p id="overpriced-count" class="text-2xl font-bold text-yellow-600">-</p>
                </div>
                <div class="p-3 bg-yellow-100 rounded-lg">
                  <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 mb-1">${tr('Fairly priced', 'Bien évalués')}</p>
                  <p id="optimally-priced-count" class="text-2xl font-bold text-green-600">-</p>
                </div>
                <div class="p-3 bg-green-100 rounded-lg">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Vehicles Table -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 class="text-lg sm:text-xl font-semibold text-gray-900">${tr('Vehicle details', 'Détail des véhicules')}</h2>
            </div>
            <div class="overflow-x-auto -mx-4 sm:mx-0">
              <table class="w-full min-w-[800px]">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Vehicle', 'Véhicule')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Asking price', 'Prix demandé')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Market price', 'Prix marché')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Gap', 'Écart')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Status', 'Statut')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Recommendation', 'Recommandation')}</th>
                  </tr>
                </thead>
                <tbody id="vehicles-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Results will be inserted here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl p-8 max-w-md mx-4">
            <div class="flex flex-col items-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p class="text-gray-700 font-medium">${tr('Analysis in progress...', 'Analyse en cours...')}</p>
              <p class="text-sm text-gray-500 mt-2">${tr('Comparing with market prices', 'Comparaison avec les prix du marché')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `

  // Initialize functionality
  initializeStockAnalysis()
  attachLanguageToggle(() => {
    window.location.reload()
  })
}

function initializeStockAnalysis() {
  let stockVehicles = []
  
  // Store stockVehicles globally for displayResults access
  window.stockVehicles = stockVehicles
  
  // File upload handler
  const fileInput = document.getElementById('stock-file')
  const fileInfo = document.getElementById('file-info')
  const fileName = document.getElementById('file-name')
  const fileCount = document.getElementById('file-count')
  const analyzeBtn = document.getElementById('analyze-btn')
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const vehicles = parseFile(file.name, text)
      stockVehicles = vehicles
      window.stockVehicles = vehicles
      
      fileName.textContent = file.name
      fileCount.textContent = `${vehicles.length} ${tr('vehicle(s)', 'véhicule(s)')}`
      fileInfo.classList.remove('hidden')
    } catch (error) {
      console.error('Error parsing file:', error)
      alert(tr('Error reading the file. Check the format.', 'Erreur lors de la lecture du fichier. Vérifiez le format.'))
    }
  })
  
  // Analyze button
  analyzeBtn.addEventListener('click', async () => {
    if (stockVehicles.length === 0) {
      alert(tr('Please import a file or add vehicles manually first.', 'Veuillez d\'abord importer un fichier ou ajouter des véhicules manuellement.'))
      return
    }
    
    await analyzeStock(stockVehicles)
  })
  
  // Manual entry form
  const manualForm = document.getElementById('manual-entry-form')
  manualForm.addEventListener('submit', (e) => {
    e.preventDefault()
    
    const vehicle = {
      id: `manual-${Date.now()}`,
      brand: document.getElementById('manual-brand').value,
      model: document.getElementById('manual-model').value,
      year: parseInt(document.getElementById('manual-year').value),
      mileage: parseInt(document.getElementById('manual-mileage').value),
      asking_price: parseFloat(document.getElementById('manual-price').value)
    }
    
    stockVehicles.push(vehicle)
    window.stockVehicles = stockVehicles
    
    // Show file info with manual count
    fileName.textContent = tr('Manual entry', 'Saisie manuelle')
    fileCount.textContent = `${stockVehicles.length} ${tr('vehicle(s)', 'véhicule(s)')}`
    fileInfo.classList.remove('hidden')
    
    // Reset form
    manualForm.reset()
    
    // Show success message
    const successMsg = document.createElement('div')
    successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
    successMsg.textContent = tr('Vehicle added to stock', 'Véhicule ajouté au stock')
    document.body.appendChild(successMsg)
    setTimeout(() => successMsg.remove(), 3000)
  })
  
  // Parse file (CSV, JSON)
  function parseFile(filename, content) {
    const ext = filename.split('.').pop().toLowerCase()
    
    if (ext === 'json') {
      const data = JSON.parse(content)
      return Array.isArray(data) ? data : [data]
    } else if (ext === 'csv') {
      return parseCSV(content)
    } else {
      throw new Error(tr('Unsupported file format. Use CSV or JSON.', 'Format de fichier non supporté. Utilisez CSV ou JSON.'))
    }
  }
  
  // Parse CSV
  function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const vehicles = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const vehicle = {}
      
      headers.forEach((header, index) => {
        const value = values[index]
        if (header.includes('marque') || header.includes('brand')) {
          vehicle.brand = value
        } else if (header.includes('modèle') || header.includes('model')) {
          vehicle.model = value
        } else if (header.includes('année') || header.includes('year')) {
          vehicle.year = parseInt(value) || 0
        } else if (header.includes('kilométrage') || header.includes('mileage') || header.includes('km')) {
          vehicle.mileage = parseInt(value.replace(/[^0-9]/g, '')) || 0
        } else if (header.includes('prix') || header.includes('price')) {
          vehicle.asking_price = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
        }
      })
      
      if (vehicle.brand && vehicle.model && vehicle.year && vehicle.asking_price) {
        vehicle.id = `csv-${i}`
        vehicles.push(vehicle)
      }
    }
    
    return vehicles
  }
  
  // Analyze stock
  async function analyzeStock(vehicles) {
    const loadingState = document.getElementById('loading-state')
    const resultsSection = document.getElementById('results-section')
    
    loadingState.classList.remove('hidden')
    
    try {
      const token = localStorage.getItem('carindex_token')
      if (!token) {
        throw new Error(tr('You must be logged in to analyze your stock.', 'Vous devez être connecté pour analyser votre stock.'))
      }
      
      const response = await fetch('/api/v1/stock/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vehicles })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || tr('Error during analysis', 'Erreur lors de l\'analyse'))
      }
      
      const data = await response.json()
      
      // Display results
      displayResults(data)
      
    } catch (error) {
      console.error('Error analyzing stock:', error)
      alert(error.message || tr('Error analyzing stock', 'Erreur lors de l\'analyse du stock'))
    } finally {
      loadingState.classList.add('hidden')
    }
  }
  
  // Display results
  function displayResults(data) {
    const resultsSection = document.getElementById('results-section')
    resultsSection.classList.remove('hidden')
    
    // Update summary cards
    document.getElementById('total-stock-value').textContent = 
      formatCurrency(data.total_stock_value || 0)
    document.getElementById('underpriced-count').textContent = data.summary?.underpriced_count || 0
    document.getElementById('overpriced-count').textContent = data.summary?.overpriced_count || 0
    document.getElementById('optimally-priced-count').textContent = data.summary?.optimally_priced_count || 0
    
    // Update table
    const tableBody = document.getElementById('vehicles-table-body')
    tableBody.innerHTML = data.vehicles.map(vehicle => {
      const statusColors = {
        'underpriced': 'bg-red-100 text-red-800',
        'overpriced': 'bg-yellow-100 text-yellow-800',
        'optimally_priced': 'bg-green-100 text-green-800'
      }
      
      const statusLabels = {
        'underpriced': tr('Underpriced', 'Sous-évalué'),
        'overpriced': tr('Overpriced', 'Sur-évalué'),
        'optimally_priced': tr('Fairly priced', 'Bien évalué')
      }
      
      const recommendationLabels = {
        'increase_price': tr('Increase price', 'Augmenter le prix'),
        'decrease_price': tr('Decrease price', 'Diminuer le prix'),
        'maintain_price': tr('Maintain price', 'Maintenir le prix')
      }
      
      const priceDiff = vehicle.price_difference || 0
      const priceDiffPercent = vehicle.price_difference_percent || 0
      const priceDiffFormatted = priceDiff > 0 
        ? `+${formatCurrency(priceDiff)} (+${priceDiffPercent.toFixed(1)}%)`
        : `${formatCurrency(priceDiff)} (${priceDiffPercent.toFixed(1)}%)`
      
      // Get vehicle details from original vehicle data
      const originalVehicle = (window.stockVehicles || []).find(v => v.id === vehicle.id)
      const vehicleBrand = originalVehicle?.brand || vehicle.brand || tr('N/A', 'N/A')
      const vehicleModel = originalVehicle?.model || vehicle.model || tr('N/A', 'N/A')
      const vehicleYear = originalVehicle?.year || vehicle.year || tr('N/A', 'N/A')
      const vehicleMileage = originalVehicle?.mileage || vehicle.mileage || 0
      
      return `
        <tr class="hover:bg-gray-50 transition">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${vehicleBrand} ${vehicleModel}</div>
            <div class="text-sm text-gray-500">${vehicleYear} • ${vehicleMileage > 0 ? formatNumber(vehicleMileage) + ' km' : tr('N/A', 'N/A')}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            ${formatCurrency(vehicle.asking_price || 0)}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            ${vehicle.market_price ? formatCurrency(vehicle.market_price) : tr('N/A', 'N/A')}
            ${vehicle.confidence_index ? `<span class="ml-2 text-xs text-gray-500">(${vehicle.confidence_index}% ${tr('confidence', 'confiance')})</span>` : ''}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm ${priceDiff > 0 ? 'text-red-600' : priceDiff < 0 ? 'text-green-600' : 'text-gray-600'}">
            ${priceDiffFormatted}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[vehicle.status] || 'bg-gray-100 text-gray-800'}">
              ${statusLabels[vehicle.status] || tr('N/A', 'N/A')}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            ${recommendationLabels[vehicle.recommendation] || tr('N/A', 'N/A')}
          </td>
        </tr>
      `
    }).join('')
  }
}

