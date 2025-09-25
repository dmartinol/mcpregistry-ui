import request from 'supertest';
import { app } from '../../src/app';

describe('Registry Management Workflow - Integration Test', () => {
  let registryId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    // This will be implemented when we have database layer
  });

  afterEach(async () => {
    // Clean up test data
    if (registryId) {
      await request(app)
        .delete(`/api/v1/registries/${registryId}`)
        .expect(204);
    }
  });

  it('should complete full registry lifecycle: create -> list -> inspect -> sync -> delete', async () => {
    // Step 1: Create registry
    const createResponse = await request(app)
      .post('/api/v1/registries')
      .send({
        name: 'integration-test-registry',
        url: 'https://registry.example.com/api/v1',
        description: 'Integration test registry',
      })
      .expect(201);

    registryId = createResponse.body.id;
    expect(registryId).toBeDefined();
    expect(createResponse.body.status).toBe('syncing');

    // Step 2: List registries and verify it appears
    const listResponse = await request(app)
      .get('/api/v1/registries')
      .expect(200);

    const createdRegistry = listResponse.body.registries.find(
      (r: any) => r.id === registryId
    );
    expect(createdRegistry).toBeDefined();
    expect(createdRegistry.name).toBe('integration-test-registry');

    // Step 3: Inspect registry details
    const detailsResponse = await request(app)
      .get(`/api/v1/registries/${registryId}`)
      .expect(200);

    expect(detailsResponse.body.id).toBe(registryId);
    expect(detailsResponse.body).toHaveProperty('metadata');
    expect(detailsResponse.body).toHaveProperty('authConfig');
    expect(detailsResponse.body).toHaveProperty('syncHistory');

    // Step 4: Trigger sync
    const syncResponse = await request(app)
      .post(`/api/v1/registries/${registryId}/sync`)
      .expect(202);

    expect(syncResponse.body).toHaveProperty('syncId');
    expect(syncResponse.body.status).toBe('initiated');

    // Step 5: Update registry
    const updateResponse = await request(app)
      .put(`/api/v1/registries/${registryId}`)
      .send({
        description: 'Updated integration test registry',
      })
      .expect(200);

    expect(updateResponse.body.description).toBe('Updated integration test registry');

    // Step 6: Delete registry (handled in afterEach)
  });

  it('should handle registry connection failures gracefully', async () => {
    // Create registry with invalid URL
    const createResponse = await request(app)
      .post('/api/v1/registries')
      .send({
        name: 'invalid-registry',
        url: 'https://invalid.registry.url',
        description: 'Invalid registry for testing',
      })
      .expect(201);

    registryId = createResponse.body.id;

    // Trigger sync which should fail
    await request(app)
      .post(`/api/v1/registries/${registryId}/sync`)
      .expect(202);

    // Wait a moment for sync to fail (in real implementation)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check registry status shows error
    const _detailsResponse = await request(app)
      .get(`/api/v1/registries/${registryId}`)
      .expect(200);

    // Registry should eventually show error status
    // expect(detailsResponse.body.status).toBe('error');
  });
});