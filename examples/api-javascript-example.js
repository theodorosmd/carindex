/**
 * Carindex API - JavaScript/Node.js Example
 * ==========================================
 * 
 * This example demonstrates how to use the Carindex API with JavaScript/Node.js.
 * Requires: npm install axios
 */

const axios = require('axios');

class CarindexAPI {
    /**
     * Initialize the Carindex API client
     * @param {string} apiKey - Your Carindex API key
     * @param {string} baseUrl - API base URL (default: https://api.carindex.com/v1)
     */
    constructor(apiKey, baseUrl = 'https://api.carindex.com/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get market price and confidence index for a vehicle
     * @param {Object} params - Vehicle parameters
     * @returns {Promise<Object>} Market price data
     */
    async getMarketPrice(params) {
        const {
            brand,
            model,
            year,
            mileage,
            country = 'FR',
            fuelType,
            transmission
        } = params;

        const queryParams = {
            brand,
            model,
            year,
            mileage,
            country
        };

        if (fuelType) queryParams.fuel_type = fuelType;
        if (transmission) queryParams.transmission = transmission;

        try {
            const response = await this.client.get('/market-price', {
                params: queryParams
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Search for vehicle listings
     * @param {Object} filters - Search filters
     * @returns {Promise<Object>} Search results
     */
    async searchListings(filters = {}) {
        const {
            brand,
            model,
            minPrice,
            maxPrice,
            country,
            limit = 50,
            offset = 0
        } = filters;

        const params = { limit, offset };
        if (brand) params.brand = brand;
        if (model) params.model = model;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;
        if (country) params.country = country;

        try {
            const response = await this.client.get('/listings/search', { params });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get market trends for a specific model
     * @param {Object} params - Trend parameters
     * @returns {Promise<Object>} Trend data
     */
    async getTrends(params) {
        const {
            brand,
            model,
            country = 'FR',
            period = '30m'
        } = params;

        try {
            const response = await this.client.get('/trends', {
                params: { brand, model, country, period }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Analyze vehicle inventory against market data
     * @param {Array<Object>} vehicles - Array of vehicle objects
     * @returns {Promise<Object>} Stock analysis
     */
    async analyzeStock(vehicles) {
        try {
            const response = await this.client.post('/stock/analyze', {
                vehicles
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Create a custom alert
     * @param {Object} alertConfig - Alert configuration
     * @returns {Promise<Object>} Alert information
     */
    async createAlert(alertConfig) {
        const {
            name,
            type,
            criteria,
            threshold,
            webhookUrl
        } = alertConfig;

        const payload = {
            name,
            type,
            criteria
        };

        if (threshold) payload.threshold = threshold;
        if (webhookUrl) payload.webhook_url = webhookUrl;

        try {
            const response = await this.client.post('/alerts', payload);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get alert events
     * @param {string} alertId - Alert ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Alert events
     */
    async getAlertEvents(alertId, options = {}) {
        const { limit = 50, offset = 0, since } = options;
        const params = { limit, offset };
        if (since) params.since = since;

        try {
            const response = await this.client.get(`/alerts/${alertId}/events`, {
                params
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors
     * @private
     */
    handleError(error) {
        if (error.response) {
            // Server responded with error status
            return new Error(
                `API Error ${error.response.status}: ${error.response.data.error?.message || error.message}`
            );
        } else if (error.request) {
            // Request made but no response
            return new Error('No response from API');
        } else {
            // Error setting up request
            return error;
        }
    }
}

// Example Usage
async function main() {
    // Initialize API client
    const api = new CarindexAPI('YOUR_API_KEY_HERE');

    // Example 1: Get market price
    console.log('=== Example 1: Get Market Price ===');
    try {
        const result = await api.getMarketPrice({
            brand: 'BMW',
            model: '320d',
            year: 2020,
            mileage: 50000,
            country: 'FR'
        });
        console.log(`Market Price: €${result.market_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`);
        console.log(`Confidence Index: ${result.confidence_index}%`);
        console.log(`Comparables: ${result.comparables_count}`);
        console.log(`Average Sales Time: ${result.average_sales_time_days} days`);
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 2: Search listings
    console.log('\n=== Example 2: Search Listings ===');
    try {
        const results = await api.searchListings({
            brand: 'BMW',
            model: '320d',
            minPrice: 20000,
            maxPrice: 30000,
            country: 'FR',
            limit: 10
        });
        console.log(`Total Results: ${results.total}`);
        console.log(`Returned: ${results.listings.length} listings`);
        results.listings.slice(0, 3).forEach(listing => {
            console.log(
                `  - ${listing.year} ${listing.brand} ${listing.model}: ` +
                `€${listing.price.toLocaleString('fr-FR')} (${listing.mileage.toLocaleString('fr-FR')} km)`
            );
        });
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 3: Analyze stock
    console.log('\n=== Example 3: Analyze Stock ===');
    try {
        const myStock = [
            {
                id: 'vehicle_001',
                brand: 'BMW',
                model: '320d',
                year: 2020,
                mileage: 50000,
                asking_price: 28000,
                country: 'FR'
            },
            {
                id: 'vehicle_002',
                brand: 'Mercedes-Benz',
                model: 'C-Class',
                year: 2019,
                mileage: 65000,
                asking_price: 26500,
                country: 'FR'
            }
        ];

        const analysis = await api.analyzeStock(myStock);
        console.log(`Total Stock Value: €${analysis.total_stock_value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`);
        console.log(`Total Market Value: €${analysis.total_market_value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`);
        console.log('\nVehicle Analysis:');
        analysis.vehicles.forEach(vehicle => {
            const diff = vehicle.price_difference;
            console.log(
                `  ${vehicle.id}: ${vehicle.status} (€${diff > 0 ? '+' : ''}${diff.toLocaleString('fr-FR', { minimumFractionDigits: 2 })})`
            );
        });
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 4: Get trends
    console.log('\n=== Example 4: Get Market Trends ===');
    try {
        const trends = await api.getTrends({
            brand: 'BMW',
            model: '320d',
            country: 'FR',
            period: '12m'
        });
        console.log(`Trend Direction: ${trends.insights.trend_direction}`);
        console.log(`Market Volume: ${trends.insights.market_volume}`);
        console.log('\nRecent Trends (last 3 months):');
        trends.trends.slice(-3).forEach(trend => {
            console.log(
                `  ${trend.month}: €${trend.average_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ` +
                `(${trend.listings_count} listings)`
            );
        });
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 5: Create alert
    console.log('\n=== Example 5: Create Alert ===');
    try {
        const alert = await api.createAlert({
            name: 'BMW 320d Price Drops',
            type: 'price_drop',
            criteria: {
                brand: 'BMW',
                model: '320d',
                minYear: 2018,
                maxYear: 2022,
                maxPrice: 30000,
                country: 'FR'
            },
            threshold: {
                price_drop_percent: 5
            },
            webhookUrl: 'https://your-domain.com/webhooks/carindex'
        });
        console.log(`Alert created: ${alert.alert_id}`);
        console.log(`Status: ${alert.status}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run examples if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CarindexAPI;



