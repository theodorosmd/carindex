import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { db } from '../src/config/database.js';

describe('Listings API', () => {
  beforeAll(async () => {
    // Setup test database or mock
  });

  afterAll(async () => {
    // Cleanup
    await db.end();
  });

  describe('GET /api/v1/listings/search', () => {
    it('should return listings with default parameters', async () => {
      const response = await request(app)
        .get('/api/v1/listings/search')
        .expect(200);

      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.listings)).toBe(true);
    });

    it('should filter by brand', async () => {
      const response = await request(app)
        .get('/api/v1/listings/search?brand=BMW')
        .expect(200);

      expect(response.body.listings.every(l => l.brand === 'BMW')).toBe(true);
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/listings/search?min_price=10000&max_price=50000')
        .expect(200);

      expect(response.body.listings.every(l => 
        l.price >= 10000 && l.price <= 50000
      )).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/v1/listings/search?limit=10&offset=0')
        .expect(200);

      const page2 = await request(app)
        .get('/api/v1/listings/search?limit=10&offset=10')
        .expect(200);

      expect(page1.body.listings.length).toBeLessThanOrEqual(10);
      expect(page2.body.listings.length).toBeLessThanOrEqual(10);
      // Results should be different
      expect(page1.body.listings[0]?.id).not.toBe(page2.body.listings[0]?.id);
    });

    it('should validate limit parameter', async () => {
      await request(app)
        .get('/api/v1/listings/search?limit=1000')
        .expect(400);
    });
  });
});








