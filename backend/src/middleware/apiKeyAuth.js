/**
 * API Key auth for ingest - alternative to JWT for scripts/scrapers
 * Uses X-API-Key header or ?api_key= query param
 */
export function apiKeyIngestMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing X-API-Key header or api_key query param' }
    });
  }

  const validKey = process.env.INGEST_API_KEY;
  if (!validKey || apiKey !== validKey) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Invalid API key' }
    });
  }

  req.user = { id: 'ingest-api-key', role: 'admin' };
  next();
}
