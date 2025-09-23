import request from 'supertest';
import { app } from '../../src/app';

describe('Contract Test: GET /api/v1/registries/{registryId}/deployed-servers', () => {
  const validRegistryId = 'test-registry';
  const invalidRegistryId = 'invalid-registry';

  beforeEach(() => {
    // Setup test data if needed
  });

  afterEach(() => {
    // Cleanup test data if needed
  });

  describe('Success Cases', () => {
    it('should return 200 with deployed servers list for valid registry', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers`)
        .expect(200);

      // Validate response structure matches contract
      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.servers)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('should return deployed server objects with required fields', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers`)
        .expect(200);

      if (response.body.servers.length > 0) {
        const server = response.body.servers[0];
        expect(server).toHaveProperty('id');
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('registryRef');
        expect(server).toHaveProperty('image');
        expect(server).toHaveProperty('status');
        expect(server).toHaveProperty('createdAt');
        expect(server).toHaveProperty('lastUpdated');
        expect(server).toHaveProperty('namespace');
        expect(server).toHaveProperty('uid');

        expect(typeof server.id).toBe('string');
        expect(typeof server.name).toBe('string');
        expect(typeof server.registryRef).toBe('string');
        expect(typeof server.image).toBe('string');
        expect(['Pending', 'Running', 'Failed', 'Terminating']).toContain(server.status);
        expect(typeof server.createdAt).toBe('string');
        expect(typeof server.lastUpdated).toBe('string');
        expect(typeof server.namespace).toBe('string');
        expect(typeof server.uid).toBe('string');
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers?status=Running`)
        .expect(200);

      expect(response.body).toHaveProperty('servers');
      if (response.body.servers.length > 0) {
        response.body.servers.forEach((server: any) => {
          expect(server.status).toBe('Running');
        });
      }
    });

    it('should support filtering by namespace', async () => {
      const namespace = 'test-namespace';
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers?namespace=${namespace}`)
        .expect(200);

      expect(response.body).toHaveProperty('servers');
      if (response.body.servers.length > 0) {
        response.body.servers.forEach((server: any) => {
          expect(server.namespace).toBe(namespace);
        });
      }
    });

    it('should include endpoint URLs when available', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers`)
        .expect(200);

      if (response.body.servers.length > 0) {
        const serverWithEndpoint = response.body.servers.find((s: any) => s.endpoint);
        if (serverWithEndpoint) {
          expect(serverWithEndpoint.endpoint).toMatch(/^https?:\/\//);
        }
      }
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent registry', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${invalidRegistryId}/deployed-servers`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 for invalid status filter', async () => {
      await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers?status=InvalidStatus`)
        .expect(400);
    });
  });

  describe('Response Headers', () => {
    it('should return correct content-type', async () => {
      const response = await request(app)
        .get(`/api/v1/registries/${validRegistryId}/deployed-servers`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});