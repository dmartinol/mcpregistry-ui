import request from 'supertest';
import { app } from '../../src/app';

describe('Contract Test: GET /api/v1/registries/{registryId}/servers', () => {
  const validRegistryId = 'test-registry';
  const invalidRegistryId = 'invalid-registry';

  beforeEach(() => {
    // Setup test data if needed
  });

  afterEach(() => {
    // Cleanup test data if needed
  });

  describe('Success Cases', () => {
    it('should return 200 with server list for valid registry', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers`)
        .expect(200);

      // Validate response structure matches contract
      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.servers)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.limit).toBe('number');
      expect(typeof response.body.offset).toBe('number');
    });

    it('should return server objects with required fields', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers`)
        .expect(200);

      if (response.body.servers.length > 0) {
        const server = response.body.servers[0];
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('image');
        expect(server).toHaveProperty('tags');
        expect(typeof server.name).toBe('string');
        expect(typeof server.image).toBe('string');
        expect(Array.isArray(server.tags)).toBe(true);
      }
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers?limit=10&offset=0`)
        .expect(200);

      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
    });

    it('should support filtering by tags', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers?tags=web,api`)
        .expect(200);

      expect(response.body).toHaveProperty('servers');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent registry', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${invalidRegistryId}/servers`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers?limit=0`)
        .expect(400);

      await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers?limit=101`)
        .expect(400);

      await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers?offset=-1`)
        .expect(400);
    });
  });

  describe('Response Headers', () => {
    it('should return correct content-type', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/servers`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});