/**
 * Carindex Webhook Handler Example
 * =================================
 * 
 * This example demonstrates how to handle webhooks from Carindex.
 * Can be used with Express.js, Next.js API routes, or serverless functions.
 */

const crypto = require('crypto');

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from X-Carindex-Signature header
 * @param {string} secret - Your webhook secret
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Example Express.js webhook handler
 */
function createWebhookHandler(webhookSecret) {
    return async (req, res) => {
        try {
            // Get signature from header
            const signature = req.headers['x-carindex-signature'];
            if (!signature) {
                return res.status(401).json({ error: 'Missing signature' });
            }

            // Get raw body (Express needs body-parser with verify option)
            const rawBody = req.rawBody || JSON.stringify(req.body);

            // Verify signature
            if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            // Parse webhook payload
            const payload = typeof req.body === 'string' 
                ? JSON.parse(req.body) 
                : req.body;

            // Handle different event types
            await handleWebhookEvent(payload);

            // Respond quickly (200 OK)
            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}

/**
 * Handle webhook events
 * @param {Object} payload - Webhook payload
 */
async function handleWebhookEvent(payload) {
    const { event_type, alert_id, alert_name, timestamp, data } = payload;

    console.log(`Received webhook: ${event_type} for alert ${alert_id}`);

    switch (event_type) {
        case 'price_drop':
            await handlePriceDrop(data);
            break;

        case 'new_listing':
            await handleNewListing(data);
            break;

        case 'market_movement':
            await handleMarketMovement(data);
            break;

        default:
            console.warn(`Unknown event type: ${event_type}`);
    }
}

/**
 * Handle price drop event
 * @param {Object} data - Event data
 */
async function handlePriceDrop(data) {
    const {
        listing_id,
        brand,
        model,
        year,
        previous_price,
        current_price,
        price_drop_percent,
        url,
        market_price,
        confidence_index
    } = data;

    console.log(`Price drop detected: ${year} ${brand} ${model}`);
    console.log(`Price: €${previous_price} → €${current_price} (${price_drop_percent}% drop)`);
    console.log(`Market Price: €${market_price} (Confidence: ${confidence_index}%)`);
    console.log(`Listing URL: ${url}`);

    // Example: Send notification to your team
    // await sendSlackNotification({
    //     text: `🚨 Price Drop Alert: ${year} ${brand} ${model}`,
    //     attachments: [{
    //         fields: [
    //             { title: 'Previous Price', value: `€${previous_price}`, short: true },
    //             { title: 'Current Price', value: `€${current_price}`, short: true },
    //             { title: 'Drop', value: `${price_drop_percent}%`, short: true },
    //             { title: 'Market Price', value: `€${market_price}`, short: true }
    //         ]
    //     }]
    // });

    // Example: Update your CRM
    // await updateCRM(listing_id, {
    //     price: current_price,
    //     price_drop_percent,
    //     alert_triggered: true
    // });
}

/**
 * Handle new listing event
 * @param {Object} data - Event data
 */
async function handleNewListing(data) {
    const {
        listing_id,
        brand,
        model,
        year,
        price,
        mileage,
        location,
        url,
        market_price,
        confidence_index
    } = data;

    console.log(`New listing: ${year} ${brand} ${model}`);
    console.log(`Price: €${price} (Market: €${market_price})`);
    console.log(`Mileage: ${mileage} km`);
    console.log(`Location: ${location.city}, ${location.country}`);

    // Example: Add to your sourcing pipeline
    // await addToSourcingPipeline({
    //     listing_id,
    //     brand,
    //     model,
    //     year,
    //     price,
    //     market_price,
    //     opportunity_score: calculateOpportunityScore(price, market_price)
    // });
}

/**
 * Handle market movement event
 * @param {Object} data - Event data
 */
async function handleMarketMovement(data) {
    const {
        brand,
        model,
        segment,
        trend_direction,
        price_change_percent,
        volume_change_percent
    } = data;

    console.log(`Market movement: ${brand} ${model}`);
    console.log(`Trend: ${trend_direction}`);
    console.log(`Price change: ${price_change_percent}%`);
    console.log(`Volume change: ${volume_change_percent}%`);

    // Example: Update your pricing strategy
    // if (trend_direction === 'increasing' && price_change_percent > 5) {
    //     await adjustPricingStrategy(brand, model, 'increase');
    // }
}

/**
 * Example Express.js setup
 */
// const express = require('express');
// const app = express();
// 
// // Middleware to capture raw body for signature verification
// app.use('/webhooks/carindex', express.raw({ type: 'application/json' }));
// 
// // Webhook endpoint
// const WEBHOOK_SECRET = process.env.CARINDEX_WEBHOOK_SECRET;
// app.post('/webhooks/carindex', createWebhookHandler(WEBHOOK_SECRET));
// 
// app.listen(3000, () => {
//     console.log('Webhook server listening on port 3000');
// });

/**
 * Example Next.js API route
 */
// export default async function handler(req, res) {
//     if (req.method !== 'POST') {
//         return res.status(405).json({ error: 'Method not allowed' });
//     }
// 
//     const webhookHandler = createWebhookHandler(process.env.CARINDEX_WEBHOOK_SECRET);
//     return webhookHandler(req, res);
// }

/**
 * Example Serverless Function (Vercel, Netlify, AWS Lambda)
 */
// exports.handler = async (event, context) => {
//     if (event.httpMethod !== 'POST') {
//         return {
//             statusCode: 405,
//             body: JSON.stringify({ error: 'Method not allowed' })
//         };
//     }
// 
//     const signature = event.headers['x-carindex-signature'];
//     const rawBody = event.body;
//     const webhookSecret = process.env.CARINDEX_WEBHOOK_SECRET;
// 
//     if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
//         return {
//             statusCode: 401,
//             body: JSON.stringify({ error: 'Invalid signature' })
//         };
//     }
// 
//     const payload = JSON.parse(rawBody);
//     await handleWebhookEvent(payload);
// 
//     return {
//         statusCode: 200,
//         body: JSON.stringify({ received: true })
//     };
// };

module.exports = {
    verifyWebhookSignature,
    createWebhookHandler,
    handleWebhookEvent
};



