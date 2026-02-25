import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SECURE OpenAI Service with GPT-5.2
 * 
 * Security Features:
 * 1. API Key stored in environment variables (never exposed)
 * 2. Input validation and sanitization
 * 3. Prompt injection protection
 * 4. Rate limiting per user
 * 5. Cost tracking and monitoring
 * 6. Timeout protection
 * 7. Retry logic with exponential backoff
 * 8. Usage logging
 * 
 * GPT-5.2 Specifications:
 * - Context: 400,000 tokens
 * - Max output: 128,000 tokens (16,384 for Chat variant)
 * - Knowledge cutoff: August 31, 2025
 * - Pricing: $1.75/M input tokens, $14/M output tokens
 * - Variants: gpt-5.2, gpt-5.2-chat, gpt-5.2-pro
 */

// Initialize OpenAI client - API key from environment (NEVER hardcode)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 3
});

// GPT-5.2 Configuration
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;
const MAX_PROMPT_LENGTH = 100000; // GPT-5.2 supports 400K, but we limit for security
const MAX_RETRIES = 3;

// Rate limiting: track API calls per user
const userCallCounts = new Map();
const RATE_LIMIT_PER_HOUR = 50; // Max 50 calls per user per hour

// Allowed models (prevent model injection)
const ALLOWED_MODELS = ['gpt-5.2', 'gpt-5.2-chat', 'gpt-5.2-pro', 'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];

/**
 * Sanitize and validate prompt input
 * @param {string} prompt - User input
 * @returns {string} Sanitized prompt
 */
function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }

  // Remove potential prompt injection attempts
  const dangerousPatterns = [
    /ignore\s+(previous|all|above)\s+instructions?/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /user\s*:\s*/gi,
    /<\|.*?\|>/g, // Special tokens
    /\[INST\].*?\[\/INST\]/g, // Instruction tags
  ];

  let sanitized = prompt.trim();
  
  // Check length
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt too long. Maximum ${MAX_PROMPT_LENGTH} characters.`);
  }

  // Remove dangerous patterns
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (sanitized.length === 0) {
    throw new Error('Prompt is empty after sanitization');
  }

  return sanitized;
}

/**
 * Check rate limit for user
 * @param {string} userId - User ID
 * @returns {boolean} True if within rate limit
 */
function checkRateLimit(userId) {
  if (!userId) return true; // Allow if no user ID (for system calls)

  const now = Date.now();
  const userCalls = userCallCounts.get(userId) || [];

  // Remove calls older than 1 hour
  const recentCalls = userCalls.filter(timestamp => now - timestamp < 3600000);
  
  if (recentCalls.length >= RATE_LIMIT_PER_HOUR) {
    return false;
  }

  // Add current call
  recentCalls.push(now);
  userCallCounts.set(userId, recentCalls);
  return true;
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403 || error.status === 429) {
        throw error;
      }

      const delay = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
      logger.warn(`OpenAI GPT-5.2 API call failed, retrying in ${delay}ms...`, { 
        attempt: i + 1, 
        error: error.message 
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Estimate cost based on GPT-5.2 pricing
 * @param {string} model - Model name
 * @param {number} inputTokens - Input tokens
 * @param {number} outputTokens - Output tokens
 * @returns {number} Estimated cost in USD
 */
function estimateCost(model, inputTokens, outputTokens) {
  // GPT-5.2 Pricing (as of 2025):
  // Input: $1.75 per million tokens
  // Output: $14.00 per million tokens
  // Cached input: $0.175 per million tokens (if using cache)
  
  const inputCost = (inputTokens / 1000000) * 1.75;
  const outputCost = (outputTokens / 1000000) * 14.00;
  
  return inputCost + outputCost;
}

/**
 * Generate text using GPT-5.2 (SECURE)
 * @param {string} prompt - The prompt to send to the model
 * @param {Object} options - Additional options (temperature, max_tokens, etc.)
 * @param {string} userId - User ID for rate limiting (optional)
 * @returns {Promise<string>} The generated text
 */
export async function generateText(prompt, options = {}, userId = null) {
  // Security: Validate API key exists
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OpenAI API key not configured');
    throw new Error('OpenAI service not configured. Please set OPENAI_API_KEY in environment variables.');
  }

  // Security: Rate limiting
  if (userId && !checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded. Maximum 50 calls per hour. Please try again later.');
  }

  // Security: Sanitize input
  const sanitizedPrompt = sanitizePrompt(prompt);

  try {
    const {
      model = DEFAULT_MODEL,
      temperature = DEFAULT_TEMPERATURE,
      max_tokens = DEFAULT_MAX_TOKENS,
      ...otherOptions
    } = options;

    // Security: Validate model name (prevent model injection)
    const safeModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    logger.info('Calling OpenAI GPT-5.2 API', { 
      model: safeModel, 
      promptLength: sanitizedPrompt.length,
      userId: userId || 'system'
    });

    // Retry logic with exponential backoff
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: safeModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a car market intelligence platform. Always respond in a professional and accurate manner.'
          },
          {
            role: 'user',
            content: sanitizedPrompt
          }
        ],
        temperature: Math.max(0, Math.min(2, temperature)), // Clamp between 0 and 2
        max_tokens: Math.max(1, Math.min(128000, max_tokens)), // GPT-5.2 supports up to 128K output
        ...otherOptions
      });
    });

    const generatedText = response.choices[0]?.message?.content || '';
    
    // Log usage for cost tracking
    const tokensUsed = response.usage?.total_tokens || 0;
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = estimateCost(safeModel, inputTokens, outputTokens);
    
    logger.info('OpenAI GPT-5.2 API response received', {
      model: safeModel,
      tokensUsed,
      inputTokens,
      outputTokens,
      estimatedCost: `$${cost.toFixed(4)}`,
      responseLength: generatedText.length,
      userId: userId || 'system'
    });

    return generatedText;
  } catch (error) {
    // Security: Don't expose internal errors
    logger.error('Error calling OpenAI GPT-5.2 API', {
      error: error.message,
      status: error.status,
      userId: userId || 'system'
    });

    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 500) {
      throw new Error('OpenAI service temporarily unavailable. Please try again later.');
    }

    throw new Error('Failed to generate text. Please try again.');
  }
}

/**
 * Analyze sentiment of listing descriptions (SECURE)
 * @param {string} description - The listing description to analyze
 * @param {string} userId - User ID for rate limiting (optional)
 * @returns {Promise<Object>} Sentiment analysis result
 */
export async function analyzeSentiment(description, userId = null) {
  if (!description || typeof description !== 'string') {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      key_points: [],
      concerns: []
    };
  }

  // Limit description length for security
  const safeDescription = description.substring(0, 2000);

  const prompt = `Analyze the sentiment of this car listing description and provide a JSON response with:
- sentiment: "positive", "negative", or "neutral"
- confidence: number between 0 and 1
- key_points: array of key selling points mentioned
- concerns: array of any concerns or negative aspects mentioned

Description: ${safeDescription}

Respond only with valid JSON, no additional text.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.3,
      max_tokens: 500
    }, userId);

    return JSON.parse(response);
  } catch (error) {
    logger.error('Error analyzing sentiment', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      key_points: [],
      concerns: []
    };
  }
}

/**
 * Generate listing description from vehicle data (SECURE)
 * @param {Object} vehicleData - Vehicle information (brand, model, year, etc.)
 * @param {string} userId - User ID for rate limiting (optional)
 * @returns {Promise<string>} Generated description
 */
export async function generateListingDescription(vehicleData, userId = null) {
  // Validate and sanitize vehicle data
  const safeData = {
    brand: String(vehicleData.brand || 'N/A').substring(0, 50),
    model: String(vehicleData.model || 'N/A').substring(0, 50),
    year: vehicleData.year || 'N/A',
    mileage: vehicleData.mileage ? `${vehicleData.mileage} km` : 'N/A',
    price: vehicleData.price ? `${vehicleData.price} €` : 'N/A',
    fuel_type: String(vehicleData.fuel_type || 'N/A').substring(0, 20),
    transmission: String(vehicleData.transmission || 'N/A').substring(0, 20)
  };

  const prompt = `Generate a compelling car listing description in French for:
- Brand: ${safeData.brand}
- Model: ${safeData.model}
- Year: ${safeData.year}
- Mileage: ${safeData.mileage}
- Price: ${safeData.price}
- Fuel Type: ${safeData.fuel_type}
- Transmission: ${safeData.transmission}

Create a professional, attractive description that highlights the vehicle's features and value. Keep it concise (2-3 sentences).`;

  try {
    return await generateText(prompt, {
      temperature: 0.8,
      max_tokens: 300
    }, userId);
  } catch (error) {
    logger.error('Error generating listing description', error);
    return '';
  }
}

/**
 * Detect potential fraud or spam in listing (SECURE)
 * @param {Object} listing - The listing to analyze
 * @param {string} userId - User ID for rate limiting (optional)
 * @returns {Promise<Object>} Fraud detection result
 */
export async function detectFraud(listing, userId = null) {
  // Sanitize listing data
  const safeListing = {
    brand: String(listing.brand || '').substring(0, 50),
    model: String(listing.model || '').substring(0, 50),
    year: listing.year || '',
    price: listing.price || 0,
    currency: String(listing.currency || 'EUR').substring(0, 10),
    description: String(listing.description || '').substring(0, 1000),
    location_city: String(listing.location_city || 'N/A').substring(0, 50),
    location_country: String(listing.location_country || 'N/A').substring(0, 50),
    url: String(listing.url || 'N/A').substring(0, 200)
  };

  const prompt = `Analyze this car listing for potential fraud or spam indicators. Provide a JSON response with:
- is_fraud: boolean
- confidence: number between 0 and 1
- reasons: array of strings explaining why it might be fraud
- risk_level: "low", "medium", or "high"

Listing data:
- Title: ${safeListing.brand} ${safeListing.model} ${safeListing.year}
- Price: ${safeListing.price} ${safeListing.currency}
- Description: ${safeListing.description}
- Location: ${safeListing.location_city}, ${safeListing.location_country}
- URL: ${safeListing.url}

Respond only with valid JSON, no additional text.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.2,
      max_tokens: 500
    }, userId);

    return JSON.parse(response);
  } catch (error) {
    logger.error('Error detecting fraud', error);
    return {
      is_fraud: false,
      confidence: 0.5,
      reasons: [],
      risk_level: 'low'
    };
  }
}

/**
 * Extract structured data from unstructured listing text (SECURE)
 * @param {string} text - Unstructured listing text
 * @param {string} userId - User ID for rate limiting (optional)
 * @returns {Promise<Object>} Extracted structured data
 */
export async function extractListingData(text, userId = null) {
  if (!text || typeof text !== 'string') {
    return {};
  }

  // Limit text length for security
  const safeText = text.substring(0, 2000);

  const prompt = `Extract structured data from this car listing text. Provide a JSON response with:
- brand: string or null
- model: string or null
- year: number or null
- mileage: number (in km) or null
- price: number or null
- fuel_type: string or null
- transmission: string or null
- color: string or null
- any other relevant fields you can identify

Text: ${safeText}

Respond only with valid JSON, no additional text.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.3,
      max_tokens: 500
    }, userId);

    return JSON.parse(response);
  } catch (error) {
    logger.error('Error extracting listing data', error);
    return {};
  }
}

/**
 * Fill missing listing fields using AI when description or context has the info
 * Extrait les champs manquants (transmission, portes, couleur, etc.) depuis la description
 * @param {Object} listing - Listing avec des champs potentiellement null
 * @param {string} userId - User ID pour rate limiting (optional)
 * @returns {Promise<Object>} Object with only the fields that could be extracted (for merging)
 */
export async function fillMissingListingFields(listing, userId = null) {
  const text = [
    listing.description,
    listing.brand && listing.model ? `${listing.brand} ${listing.model}` : '',
    listing.url ? `URL: ${listing.url}` : ''
  ].filter(Boolean).join('\n');

  if (!text || text.length < 50) return {};

  const safeText = text.substring(0, 3000);

  const prompt = `Tu es un assistant qui extrait les caractéristiques automobiles depuis du texte. Le véhicule a déjà: marque=${listing.brand || '?'}, modèle=${listing.model || '?'}, année=${listing.year || '?'}.

Extrais UNIQUEMENT les champs que tu peux déduire du texte. Retourne un JSON avec les clés suivantes (null si introuvable):
- transmission: "manual" ou "automatic" (selon boîte manuelle/automatique, BVM/BVA, nombre de vitesses)
- doors: nombre (2, 3, 4 ou 5 portes)
- color: couleur en français (ex: Bleu, Noir, Gris)
- power_hp: nombre de chevaux (ch ou cv)
- displacement: cylindrée en litres (ex: 1.2, 2.0)
- category: "suv", "4x4", "berline", "break", "citadine", "monospace", "coupé" ou "cabriolet"
- drivetrain: "awd" si 4x4, 4Matic, Quattro, XDrive, etc.
- version: finition (ex: Business, Techno, Feel)

Texte: ${safeText}

Réponds UNIQUEMENT avec un JSON valide, sans texte autour.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.2,
      max_tokens: 300,
      model: 'gpt-4o-mini'
    }, userId);

    const extracted = JSON.parse(response.trim().replace(/```json\n?|\n?```/g, ''));
    const result = {};

    if (extracted.transmission && ['manual', 'automatic'].includes(String(extracted.transmission).toLowerCase())) {
      result.transmission = extracted.transmission.toLowerCase();
    }
    if (extracted.doors && [2, 3, 4, 5].includes(parseInt(extracted.doors, 10))) {
      result.doors = parseInt(extracted.doors, 10);
    }
    if (extracted.color && typeof extracted.color === 'string') {
      result.color = extracted.color.substring(0, 50);
    }
    const parsedHp = parseInt(extracted.power_hp, 10);
    if (extracted.power_hp && !isNaN(parsedHp) && parsedHp >= 50 && parsedHp <= 2000) {
      result.power_hp = parsedHp;
    }
    const parsedD = parseFloat(extracted.displacement);
    if (extracted.displacement && !isNaN(parsedD) && parsedD >= 0.8 && parsedD <= 8) {
      result.displacement = parsedD;
    }
    if (extracted.category && typeof extracted.category === 'string') {
      result.category = extracted.category.toLowerCase().substring(0, 50);
    }
    if (extracted.drivetrain === 'awd') result.drivetrain = 'awd';
    if (extracted.version && typeof extracted.version === 'string') {
      result.version = extracted.version.substring(0, 100);
    }
    return result;
  } catch (error) {
    logger.warn('AI fill missing fields failed', { error: error.message, listingId: listing.id });
    return {};
  }
}

export default {
  generateText,
  analyzeSentiment,
  generateListingDescription,
  detectFraud,
  extractListingData,
  fillMissingListingFields,
  DEFAULT_MODEL
};
