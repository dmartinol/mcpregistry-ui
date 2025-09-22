import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/v1/registries - Contract Test', () => {
  it('should return list of registries with correct schema', async () => {
    const response = await request(app)
      .get('/api/v1/registries')
      .expect('Content-Type', /json/)
      .expect(200);

    // Validate response schema
    expect(response.body).toHaveProperty('registries');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('limit');
    expect(response.body).toHaveProperty('offset');

    expect(Array.isArray(response.body.registries)).toBe(true);
    expect(typeof response.body.total).toBe('number');
    expect(typeof response.body.limit).toBe('number');
    expect(typeof response.body.offset).toBe('number');

    // Validate individual registry schema
    if (response.body.registries.length > 0) {
      const registry = response.body.registries[0];
      expect(registry).toHaveProperty('id');
      expect(registry).toHaveProperty('name');
      expect(registry).toHaveProperty('url');
      expect(registry).toHaveProperty('status');
      expect(registry).toHaveProperty('serverCount');
      expect(registry).toHaveProperty('createdAt');
      expect(registry).toHaveProperty('updatedAt');

      expect(typeof registry.id).toBe('string');
      expect(typeof registry.name).toBe('string');
      expect(typeof registry.url).toBe('string');
      expect(['active', 'inactive', 'error', 'syncing']).toContain(registry.status);
      expect(typeof registry.serverCount).toBe('number');
    }
  });

  it('should support filtering by status', async () => {
    const response = await request(app)
      .get('/api/v1/registries?status=active')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('registries');
    response.body.registries.forEach((registry: any) => {
      expect(registry.status).toBe('active');
    });
  });

  it('should support pagination', async () => {
    const response = await request(app)
      .get('/api/v1/registries?limit=5&offset=0')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.limit).toBe(5);
    expect(response.body.offset).toBe(0);
    expect(response.body.registries.length).toBeLessThanOrEqual(5);
  });

  it('should return 400 for invalid status filter', async () => {
    await request(app)
      .get('/api/v1/registries?status=invalid')
      .expect('Content-Type', /json/)
      .expect(400);
  });
});