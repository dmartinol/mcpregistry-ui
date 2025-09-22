import request from 'supertest';
import { app } from '../../src/app';

describe('POST /api/v1/registries - Contract Test', () => {
  const validRegistryData = {
    name: 'test-registry',
    url: 'https://registry.example.com/api/v1',
    description: 'Test registry for validation',
  };

  it('should create registry with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/registries')
      .send(validRegistryData)
      .expect('Content-Type', /json/)
      .expect(201);

    // Validate response schema
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', validRegistryData.name);
    expect(response.body).toHaveProperty('url', validRegistryData.url);
    expect(response.body).toHaveProperty('description', validRegistryData.description);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('serverCount', 0);
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');

    expect(typeof response.body.id).toBe('string');
    expect(['active', 'inactive', 'error', 'syncing']).toContain(response.body.status);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/registries')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('details');
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  it('should return 400 for invalid name format', async () => {
    const invalidData = {
      ...validRegistryData,
      name: 'invalid_name_with_underscores!',
    };

    await request(app)
      .post('/api/v1/registries')
      .send(invalidData)
      .expect('Content-Type', /json/)
      .expect(400);
  });

  it('should return 400 for invalid URL format', async () => {
    const invalidData = {
      ...validRegistryData,
      url: 'not-a-valid-url',
    };

    await request(app)
      .post('/api/v1/registries')
      .send(invalidData)
      .expect('Content-Type', /json/)
      .expect(400);
  });

  it('should return 409 for duplicate registry name', async () => {
    // First create a registry
    await request(app)
      .post('/api/v1/registries')
      .send(validRegistryData)
      .expect(201);

    // Try to create another with same name
    await request(app)
      .post('/api/v1/registries')
      .send(validRegistryData)
      .expect('Content-Type', /json/)
      .expect(409);
  });

  it('should handle optional description field', async () => {
    const dataWithoutDescription = {
      name: 'registry-no-desc',
      url: 'https://registry2.example.com/api/v1',
    };

    const response = await request(app)
      .post('/api/v1/registries')
      .send(dataWithoutDescription)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('name', dataWithoutDescription.name);
    expect(response.body).toHaveProperty('url', dataWithoutDescription.url);
  });
});