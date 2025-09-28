import request from 'supertest';
import { app } from '../../src/app';

describe('MCPRegistry Creation API - Integration Test', () => {
  const testNamespace = 'default'; // In test mode, KubernetesClient defaults to 'default' namespace

  // Base valid registry request for ConfigMap source
  const validConfigMapRegistryRequest = {
    name: 'test-configmap-registry',
    displayName: 'Test ConfigMap Registry',
    namespace: testNamespace,
    enforceServers: false,
    source: {
      type: 'configmap',
      format: 'toolhive',
      configmap: {
        name: 'test-registry-config',
        key: 'registry.json'
      }
    },
    syncPolicy: {
      interval: '30m'
    },
    filter: {
      names: {
        include: ['mcp-*'],
        exclude: ['*-test']
      },
      tags: {
        include: ['database', 'web'],
        exclude: ['deprecated']
      }
    }
  };

  // Base valid registry request for Git source
  const validGitRegistryRequest = {
    name: 'test-git-registry',
    displayName: 'Test Git Registry',
    namespace: testNamespace,
    enforceServers: true,
    source: {
      type: 'git',
      format: 'toolhive',
      git: {
        repository: 'https://github.com/example/mcp-registry.git',
        branch: 'main',
        path: 'data/registry.json'
      }
    },
    syncPolicy: {
      interval: 'manual'
    }
  };

  describe('POST /api/v1/mcpregistries - ConfigMap Source', () => {
    it('should create MCPRegistry with valid ConfigMap source', async () => {
      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(validConfigMapRegistryRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('registry');

      // Validate registry structure
      const registry = response.body.registry;
      expect(registry).toHaveProperty('metadata');
      expect(registry.metadata).toHaveProperty('name', validConfigMapRegistryRequest.name);
      expect(registry.metadata).toHaveProperty('namespace', testNamespace);

      expect(registry).toHaveProperty('spec');
      expect(registry.spec).toHaveProperty('displayName', validConfigMapRegistryRequest.displayName);
      expect(registry.spec).toHaveProperty('source');
      expect(registry.spec.source).toHaveProperty('type', 'configmap');
      expect(registry.spec.source).toHaveProperty('format', 'toolhive');
      expect(registry.spec.source.configmap).toHaveProperty('name', 'test-registry-config');
      expect(registry.spec.source.configmap).toHaveProperty('key', 'registry.json');

      // Validate sync policy
      expect(registry.spec).toHaveProperty('syncPolicy');
      expect(registry.spec.syncPolicy).toHaveProperty('interval', '30m');

      // Validate filters
      expect(registry.spec).toHaveProperty('filter');
      expect(registry.spec.filter.names).toHaveProperty('include', ['mcp-*']);
      expect(registry.spec.filter.names).toHaveProperty('exclude', ['*-test']);
      expect(registry.spec.filter.tags).toHaveProperty('include', ['database', 'web']);
      expect(registry.spec.filter.tags).toHaveProperty('exclude', ['deprecated']);
    });

    it('should create MCPRegistry with minimal ConfigMap configuration', async () => {
      const minimalRequest = {
        name: 'minimal-configmap-registry',
        displayName: 'Minimal ConfigMap Registry',
        namespace: testNamespace,
        source: {
          type: 'configmap',
          format: 'toolhive',
          configmap: {
            name: 'minimal-config',
            key: 'registry.json'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(minimalRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.registry.spec.displayName).toBe('Minimal ConfigMap Registry');
      expect(response.body.registry.spec.source.type).toBe('configmap');
    });
  });

  describe('POST /api/v1/mcpregistries - Git Source', () => {
    it('should create MCPRegistry with valid Git source', async () => {
      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(validGitRegistryRequest)
        .expect('Content-Type', /json/);

      // Debug: Print response for validation errors
      if (response.status !== 201) {
        throw new Error(`Expected status 201, got ${response.status}. Error: ${JSON.stringify(response.body, null, 2)}`);
      }

      // Validate response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('registry');

      // Validate Git source configuration
      const registry = response.body.registry;
      expect(registry.spec.source).toHaveProperty('type', 'git');
      expect(registry.spec.source.git).toHaveProperty('repository', 'https://github.com/example/mcp-registry.git');
      expect(registry.spec.source.git).toHaveProperty('branch', 'main');
      expect(registry.spec.source.git).toHaveProperty('path', 'data/registry.json');

      // Validate enforceServers setting
      expect(registry.spec).toHaveProperty('enforceServers', true);

      // Validate manual sync policy
      expect(registry.spec.syncPolicy).toHaveProperty('interval', 'manual');
    });

    it('should create MCPRegistry with Git source and default branch', async () => {
      const requestWithoutBranch = {
        ...validGitRegistryRequest,
        name: 'git-registry-default-branch',
        source: {
          type: 'git',
          format: 'toolhive',
          git: {
            repository: 'https://github.com/example/another-registry.git',
            path: 'registry.json'
            // No branch specified - should default
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(requestWithoutBranch)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.registry.spec.source.git).toHaveProperty('repository');
      expect(response.body.registry.spec.source.git).toHaveProperty('path', 'registry.json');
    });
  });

  describe('POST /api/v1/mcpregistries - Validation Tests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        name: 'invalid-registry'
        // Missing displayName, namespace, source
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return 400 for invalid registry name format', async () => {
      const invalidNameRequest = {
        ...validConfigMapRegistryRequest,
        name: 'Invalid_Registry_Name_With_Underscores!'
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidNameRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid request format');
    });

    it('should return 400 for invalid source type', async () => {
      const invalidSourceRequest = {
        ...validConfigMapRegistryRequest,
        source: {
          type: 'invalid-source-type',
          format: 'toolhive'
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidSourceRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing ConfigMap configuration when type is configmap', async () => {
      const invalidConfigMapRequest = {
        ...validConfigMapRegistryRequest,
        source: {
          type: 'configmap',
          format: 'toolhive'
          // Missing configmap configuration
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidConfigMapRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing Git configuration when type is git', async () => {
      const invalidGitRequest = {
        ...validGitRegistryRequest,
        source: {
          type: 'git',
          format: 'toolhive'
          // Missing git configuration
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidGitRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid sync interval format', async () => {
      const invalidSyncRequest = {
        ...validConfigMapRegistryRequest,
        syncPolicy: {
          interval: 'invalid-interval-format'
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(invalidSyncRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/mcpregistries - Conflict Detection', () => {
    it('should return error for duplicate registry names', async () => {
      // First, create a registry
      await request(app)
        .post('/api/v1/mcpregistries')
        .send({
          ...validConfigMapRegistryRequest,
          name: 'duplicate-test-registry'
        })
        .expect(201);

      // Try to create another with the same name
      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send({
          ...validGitRegistryRequest,
          name: 'duplicate-test-registry'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/v1/mcpregistries - Filter Configuration', () => {
    it('should handle complex filter configurations', async () => {
      const complexFilterRequest = {
        ...validConfigMapRegistryRequest,
        name: 'complex-filter-registry',
        filter: {
          names: {
            include: ['mcp-*', 'toolhive-*', '*-server'],
            exclude: ['*-test', '*-dev', 'deprecated-*']
          },
          tags: {
            include: ['database', 'web', 'ai', 'utility'],
            exclude: ['deprecated', 'experimental', 'internal']
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(complexFilterRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);

      const filters = response.body.registry.spec.filter;
      expect(filters.names.include).toHaveLength(3);
      expect(filters.names.exclude).toHaveLength(3);
      expect(filters.tags.include).toHaveLength(4);
      expect(filters.tags.exclude).toHaveLength(3);
    });

    it('should handle registry without filters', async () => {
      const noFiltersRequest = {
        name: 'no-filters-registry',
        displayName: 'Registry Without Filters',
        namespace: testNamespace,
        source: {
          type: 'configmap',
          format: 'toolhive',
          configmap: {
            name: 'simple-config',
            key: 'registry.json'
          }
        }
        // No filter property
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(noFiltersRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Filter should be undefined or empty when not specified
      expect(response.body.registry.spec.filter).toBeUndefined();
    });
  });

  describe('POST /api/v1/mcpregistries - Edge Cases', () => {
    it('should handle very long display names', async () => {
      const longDisplayName = 'A'.repeat(90); // Keep within 100 char limit
      const longNameRequest = {
        ...validConfigMapRegistryRequest,
        name: 'long-display-name-registry',
        displayName: longDisplayName
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(longNameRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.registry.spec.displayName).toBe(longDisplayName);
    });

    it('should handle empty filter arrays', async () => {
      const emptyFiltersRequest = {
        ...validConfigMapRegistryRequest,
        name: 'empty-filters-registry',
        filter: {
          names: {
            include: [],
            exclude: []
          },
          tags: {
            include: [],
            exclude: []
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(emptyFiltersRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.registry.spec.filter.names.include).toEqual([]);
      expect(response.body.registry.spec.filter.names.exclude).toEqual([]);
    });

    it('should handle special characters in Git repository URLs', async () => {
      const specialCharsRequest = {
        ...validGitRegistryRequest,
        name: 'special-chars-git-registry',
        source: {
          type: 'git',
          format: 'toolhive',
          git: {
            repository: 'https://github.com/org-name/repo-with-hyphens.git',
            branch: 'feature/new-registry-format',
            path: 'data/mcp-registry.json'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/mcpregistries')
        .send(specialCharsRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.registry.spec.source.git.branch).toBe('feature/new-registry-format');
    });
  });
});