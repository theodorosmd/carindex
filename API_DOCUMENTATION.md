# Carindex API Documentation

## Overview

The Carindex API provides programmatic access to market intelligence data, allowing you to integrate pricing, trends, and stock analysis directly into your business systems.

**Base URL**: `https://api.carindex.com/v1`

**Authentication**: API Key (available on Performance plan only)

**Rate Limit**: 100,000 requests/month (extendable on request)

---

## Authentication

All API requests require authentication using an API key in the header:

```http
Authorization: Bearer YOUR_API_KEY
```

You can generate and manage your API keys from the Carindex dashboard under Settings > API.

---

## Endpoints

### 1. Get Market Price

Get market price and confidence index for a specific vehicle.

**Endpoint**: `GET /market-price`

**Query Parameters:**
- `brand` (required): Vehicle brand (e.g., "BMW", "Mercedes-Benz")
- `model` (required): Vehicle model (e.g., "320d", "C-Class")
- `year` (required): Manufacturing year (e.g., 2020)
- `mileage` (required): Mileage in km
- `country` (optional): Country code (default: "FR")
- `fuel_type` (optional): "diesel", "petrol", "electric", "hybrid"
- `transmission` (optional): "manual", "automatic"

**Example Request:**
```bash
curl -X GET "https://api.carindex.com/v1/market-price?brand=BMW&model=320d&year=2020&mileage=50000&country=FR" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "market_price": 28500,
  "currency": "EUR",
  "confidence_index": 87,
  "comparables_count": 142,
  "price_range": {
    "min": 24500,
    "max": 32500,
    "median": 28000
  },
  "average_sales_time_days": 18,
  "market_attractiveness": "high",
  "last_updated": "2024-01-15T10:30:00Z"
}
```

---

### 2. Search Listings

Search for vehicle listings matching specific criteria.

**Endpoint**: `GET /listings/search`

**Query Parameters:**
- `brand` (optional): Vehicle brand
- `model` (optional): Vehicle model
- `min_price` (optional): Minimum price
- `max_price` (optional): Maximum price
- `min_year` (optional): Minimum year
- `max_year` (optional): Maximum year
- `country` (optional): Country code
- `limit` (optional): Results per page (default: 50, max: 500)
- `offset` (optional): Pagination offset

**Example Request:**
```bash
curl -X GET "https://api.carindex.com/v1/listings/search?brand=BMW&model=320d&min_price=20000&max_price=30000&country=FR&limit=50" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "total": 1247,
  "limit": 50,
  "offset": 0,
  "listings": [
    {
      "id": "listing_12345",
      "brand": "BMW",
      "model": "320d",
      "year": 2020,
      "mileage": 48500,
      "price": 27900,
      "currency": "EUR",
      "location": {
        "city": "Paris",
        "country": "FR"
      },
      "url": "https://...",
      "source": "leboncoin",
      "posted_date": "2024-01-10T08:15:00Z",
      "market_price": 28500,
      "confidence_index": 89
    }
  ]
}
```

---

### 3. Get Market Trends

Retrieve market trends for a specific model or segment.

**Endpoint**: `GET /trends`

**Query Parameters:**
- `brand` (required): Vehicle brand
- `model` (required): Vehicle model
- `country` (optional): Country code
- `period` (optional): "30d", "90d", "6m", "12m", "30m" (default: "30m")

**Example Request:**
```bash
curl -X GET "https://api.carindex.com/v1/trends?brand=BMW&model=320d&country=FR&period=30m" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "brand": "BMW",
  "model": "320d",
  "country": "FR",
  "period": "30m",
  "trends": [
    {
      "month": "2022-01",
      "average_price": 32000,
      "listings_count": 1250,
      "average_sales_time_days": 22,
      "price_change_percent": 0
    },
    {
      "month": "2022-02",
      "average_price": 31800,
      "listings_count": 1320,
      "average_sales_time_days": 21,
      "price_change_percent": -0.6
    }
  ],
  "insights": {
    "trend_direction": "declining",
    "trend_strength": "moderate",
    "market_volume": "increasing",
    "competitiveness": "high"
  }
}
```

---

### 4. Analyze Stock

Analyze your vehicle inventory against market data.

**Endpoint**: `POST /stock/analyze`

**Request Body:**
```json
{
  "vehicles": [
    {
      "id": "vehicle_001",
      "brand": "BMW",
      "model": "320d",
      "year": 2020,
      "mileage": 50000,
      "asking_price": 28000,
      "country": "FR"
    },
    {
      "id": "vehicle_002",
      "brand": "Mercedes-Benz",
      "model": "C-Class",
      "year": 2019,
      "mileage": 65000,
      "asking_price": 26500,
      "country": "FR"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "https://api.carindex.com/v1/stock/analyze" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @stock_data.json
```

**Example Response:**
```json
{
  "total_stock_value": 54500,
  "total_market_value": 56000,
  "vehicles": [
    {
      "id": "vehicle_001",
      "market_price": 28500,
      "asking_price": 28000,
      "price_difference": -500,
      "price_difference_percent": -1.75,
      "status": "underpriced",
      "confidence_index": 87,
      "average_sales_time_days": 18,
      "recommendation": "increase_price"
    },
    {
      "id": "vehicle_002",
      "market_price": 25500,
      "asking_price": 26500,
      "price_difference": 1000,
      "price_difference_percent": 3.92,
      "status": "overpriced",
      "confidence_index": 82,
      "average_sales_time_days": 25,
      "recommendation": "decrease_price"
    }
  ],
  "summary": {
    "underpriced_count": 1,
    "overpriced_count": 1,
    "optimally_priced_count": 0,
    "average_days_on_market": 21.5,
    "market_day_supply": 18.2
  }
}
```

---

### 5. Create Alert

Create a custom alert for price drops, new listings, or market movements.

**Endpoint**: `POST /alerts`

**Request Body:**
```json
{
  "name": "BMW 320d Price Drops",
  "type": "price_drop",
  "criteria": {
    "brand": "BMW",
    "model": "320d",
    "min_year": 2018,
    "max_year": 2022,
    "max_price": 30000,
    "country": "FR"
  },
  "threshold": {
    "price_drop_percent": 5
  },
  "webhook_url": "https://your-domain.com/webhooks/carindex"
}
```

**Example Request:**
```bash
curl -X POST "https://api.carindex.com/v1/alerts" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @alert_config.json
```

**Example Response:**
```json
{
  "alert_id": "alert_abc123",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 6. Get Alert Events

Retrieve events triggered by your alerts.

**Endpoint**: `GET /alerts/{alert_id}/events`

**Query Parameters:**
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset
- `since` (optional): ISO 8601 timestamp (only events after this date)

**Example Request:**
```bash
curl -X GET "https://api.carindex.com/v1/alerts/alert_abc123/events?limit=50" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Webhooks

Configure webhooks to receive real-time notifications when alerts are triggered.

### Webhook Payload

When an alert is triggered, Carindex sends a POST request to your configured webhook URL:

```json
{
  "event_type": "price_drop",
  "alert_id": "alert_abc123",
  "alert_name": "BMW 320d Price Drops",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "listing_id": "listing_12345",
    "brand": "BMW",
    "model": "320d",
    "year": 2020,
    "previous_price": 30000,
    "current_price": 28500,
    "price_drop_percent": 5,
    "url": "https://...",
    "market_price": 28500,
    "confidence_index": 87
  }
}
```

### Webhook Security

Carindex signs webhook payloads with your webhook secret. Verify the signature to ensure the request is authentic:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'brand' parameter is required",
    "details": {
      "parameter": "brand"
    }
  }
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limiting

API requests are rate-limited to 100,000 requests per month. Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100000
X-RateLimit-Remaining: 98750
X-RateLimit-Reset: 1705276800
```

When the rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

---

## SDKs

Official SDKs are available in multiple languages:

- **Python**: `pip install carindex-sdk`
- **JavaScript/Node.js**: `npm install @carindex/sdk`
- **PHP**: `composer require carindex/sdk`

See the `examples/` directory for usage examples.

---

## Support

For API support:
- Email: api-support@carindex.com
- Documentation: https://docs.carindex.com
- Status Page: https://status.carindex.com









