/**
 * Chart.js helper for creating price history charts
 */

/**
 * Create a price history line chart
 * @param {string} canvasId - ID of the canvas element
 * @param {Array} data - Array of {price, recorded_at} objects
 * @param {Object} options - Chart options
 */
export function createPriceHistoryChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element not found: ${canvasId}`);
    return null;
  }

  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please include Chart.js library.');
    return null;
  }

  // Process data
  const labels = data.map(item => {
    const date = new Date(item.recorded_at);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  });

  const prices = data.map(item => parseFloat(item.price || 0));

  // Find price drops (negative changes)
  const drops = [];
  for (let i = 1; i < data.length; i++) {
    const currentPrice = parseFloat(data[i].price || 0);
    const previousPrice = parseFloat(data[i - 1].price || 0);
    if (currentPrice < previousPrice) {
      drops.push({
        index: i,
        price: currentPrice,
        drop: previousPrice - currentPrice,
        dropPct: ((previousPrice - currentPrice) / previousPrice) * 100
      });
    }
  }

  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Prix (€)',
          data: prices,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              }).format(context.parsed.y);
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0
              }).format(value);
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      ...options
    }
  };

  // Highlight price drops
  if (drops.length > 0 && chartConfig.data.datasets[0]) {
    // Add drop points as a separate dataset
    const dropPrices = new Array(prices.length).fill(null);
    const dropColors = new Array(prices.length).fill(null);
    
    drops.forEach(drop => {
      dropPrices[drop.index] = drop.price;
      dropColors[drop.index] = 'rgb(239, 68, 68)'; // Red for drops
    });

    chartConfig.data.datasets.push({
      label: 'Baisses de prix',
      data: dropPrices,
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: 'rgb(239, 68, 68)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      showLine: false
    });
  }

  // Destroy existing chart if it exists
  if (canvas.chart) {
    canvas.chart.destroy();
  }

  // Create new chart
  const chart = new Chart(canvas, chartConfig);
  canvas.chart = chart;

  return chart;
}

/**
 * Highlight price drops on an existing chart
 * @param {Chart} chart - Chart.js instance
 * @param {Array} drops - Array of drop data
 */
export function highlightPriceDrops(chart, drops) {
  if (!chart || !drops || drops.length === 0) {
    return;
  }

  // Add annotation plugin if available
  if (chart.options.plugins && chart.options.plugins.annotation) {
    drops.forEach(drop => {
      chart.options.plugins.annotation.annotations.push({
        type: 'line',
        mode: 'vertical',
        scaleID: 'x',
        value: drop.index,
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
          enabled: true,
          content: `-${drop.dropPct.toFixed(1)}%`,
          position: 'top'
        }
      });
    });
    chart.update();
  }
}
