import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Facets API', () => {
  describe('GET /api/v1/facets', () => {
    it('should return facet counts', async () => {
      const response = await request(app)
        .get('/api/v1/facets')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('facets');
      expect(response.body.facets).toHaveProperty('brands');
      expect(response.body.facets).toHaveProperty('fuel_types');
      expect(Array.isArray(response.body.facets.brands)).toBe(true);
    });

    it('should filter facets based on base filters', async () => {
      const response = await request(app)
        .get('/api/v1/facets?brand=BMW&min_price=20000')
        .expect(200);

      expect(response.body.facets.brands.every(b => b.name === 'BMW')).toBe(true);
    });
  });
});








