import { KubernetesClient, MCPRegistry } from './KubernetesClient';
import {
  createMCPRegistryRequestSchema,
  CreateMCPRegistryRequest,
  createMCPRegistryFromRequest
} from '../models/MCPRegistrySchema';
import Joi from 'joi';

export interface MCPRegistryCreationResult {
  success: boolean;
  registry?: MCPRegistry;
  errors?: Joi.ValidationError;
  message?: string;
}

export interface MCPRegistryUpdateResult {
  success: boolean;
  registry?: MCPRegistry;
  errors?: Joi.ValidationError;
  message?: string;
}

export interface MCPRegistryListResult {
  registries: MCPRegistry[];
  total: number;
  namespace: string;
}

export interface MCPRegistryValidationResult {
  valid: boolean;
  errors?: Joi.ValidationError;
  warnings?: string[];
}

export class MCPRegistryService {
  private kubernetesClient: KubernetesClient;

  constructor(namespace?: string) {
    this.kubernetesClient = new KubernetesClient(namespace);
  }

  /**
   * Validate a create registry request
   */
  async validateCreateRequest(request: CreateMCPRegistryRequest): Promise<MCPRegistryValidationResult> {
    try {
      const { error } = createMCPRegistryRequestSchema.validate(request, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        return {
          valid: false,
          errors: error
        };
      }

      // Additional validation checks
      const warnings: string[] = [];

      // Check if registry name already exists
      try {
        const existingRegistry = await this.kubernetesClient.getMCPRegistry(request.name);
        if (existingRegistry) {
          return {
            valid: false,
            errors: new Joi.ValidationError('Validation failed', [{
              message: `Registry with name '${request.name}' already exists`,
              path: ['name'],
              type: 'any.unique',
              context: { value: request.name, key: 'name' }
            }], request)
          };
        }
      } catch (error) {
        // Registry doesn't exist, which is good for creation
      }

      // Validate sync interval format if provided
      if (request.syncPolicy?.interval) {
        const interval = request.syncPolicy.interval;
        if (interval !== 'manual' && !interval.match(/^(\d+[smhd])+$/)) {
          return {
            valid: false,
            errors: new Joi.ValidationError('Validation failed', [{
              message: 'Sync interval must be "manual" or a duration like "30m", "1h"',
              path: ['syncPolicy', 'interval'],
              type: 'string.pattern.base',
              context: { value: interval, key: 'interval' }
            }], request)
          };
        }
      }

      // Add warning for no sync policy
      if (!request.syncPolicy) {
        warnings.push('No sync policy specified. Registry will need to be manually synced.');
      }

      // Add warning for no filtering
      if (!request.filter || (!request.filter.names && !request.filter.tags)) {
        warnings.push('No filtering specified. All servers from the source will be included.');
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      console.error('Error validating create request:', error);
      return {
        valid: false,
        errors: new Joi.ValidationError('Validation failed', [{
          message: 'Internal validation error',
          path: [],
          type: 'any.unknown',
          context: {}
        }], request)
      };
    }
  }

  /**
   * Create a new MCPRegistry
   */
  async createRegistry(request: CreateMCPRegistryRequest): Promise<MCPRegistryCreationResult> {
    try {
      console.log('Creating MCPRegistry:', request);

      // Validate the request first
      const validation = await this.validateCreateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          message: 'Validation failed'
        };
      }

      // Transform request to Kubernetes MCPRegistry format
      const mcpRegistry = createMCPRegistryFromRequest(request);

      // Create the registry via Kubernetes API
      const createdRegistry = await this.kubernetesClient.createMCPRegistry({
        metadata: {
          name: mcpRegistry.metadata.name,
          namespace: mcpRegistry.metadata.namespace,
          creationTimestamp: new Date().toISOString(),
          uid: ''
        },
        spec: mcpRegistry.spec as any // Type assertion to handle interface mismatch
      });

      console.log('MCPRegistry created successfully:', createdRegistry.metadata.name);

      return {
        success: true,
        registry: createdRegistry,
        message: `Registry '${createdRegistry.metadata.name}' created successfully`
      };
    } catch (error) {
      console.error('Error creating MCPRegistry:', error);

      let message = 'Failed to create registry';
      if (error instanceof Error) {
        message = error.message;
      }

      return {
        success: false,
        message
      };
    }
  }

  /**
   * Update an existing MCPRegistry
   */
  async updateRegistry(name: string, request: Partial<CreateMCPRegistryRequest>): Promise<MCPRegistryUpdateResult> {
    try {
      console.log('Updating MCPRegistry:', name, request);

      // Get existing registry
      const existingRegistry = await this.kubernetesClient.getMCPRegistry(name);
      if (!existingRegistry) {
        return {
          success: false,
          message: `Registry '${name}' not found`
        };
      }

      // Merge request with existing registry data for validation
      let defaultSource: CreateMCPRegistryRequest['source'] = { type: 'configmap', format: 'toolhive' };
      if (existingRegistry.spec.source?.type === 'configmap' && existingRegistry.spec.source.configmap?.key) {
        defaultSource = {
          type: 'configmap',
          format: 'toolhive',
          configmap: {
            name: existingRegistry.spec.source.configmap.name,
            key: existingRegistry.spec.source.configmap.key
          }
        };
      } else if (existingRegistry.spec.source?.type === 'git' && existingRegistry.spec.source.git?.path) {
        defaultSource = {
          type: 'git',
          format: 'toolhive',
          git: {
            repository: existingRegistry.spec.source.git.repository,
            branch: existingRegistry.spec.source.git.branch,
            path: existingRegistry.spec.source.git.path
          }
        };
      }

      const fullRequest: CreateMCPRegistryRequest = {
        name: request.name || existingRegistry.metadata.name,
        displayName: request.displayName || existingRegistry.spec.displayName || existingRegistry.metadata.name,
        namespace: request.namespace || existingRegistry.metadata.namespace,
        enforceServers: request.enforceServers !== undefined ? request.enforceServers : existingRegistry.spec.enforceServers,
        source: request.source || defaultSource,
        syncPolicy: request.syncPolicy || (existingRegistry.spec.syncPolicy?.interval ? {
          interval: existingRegistry.spec.syncPolicy.interval
        } : undefined),
        filter: request.filter || existingRegistry.spec.filter
      };

      // Validate the merged request
      const validation = await this.validateCreateRequest(fullRequest);
      if (!validation.valid && validation.errors) {
        // Filter out name uniqueness errors for updates
        const filteredErrors = validation.errors.details.filter(
          detail => !(detail.path.includes('name') && detail.type === 'any.unique')
        );

        if (filteredErrors.length > 0) {
          return {
            success: false,
            errors: new Joi.ValidationError('Validation failed', filteredErrors, fullRequest),
            message: 'Validation failed'
          };
        }
      }

      // Update only the spec fields that were provided
      const updatedSpec = { ...existingRegistry.spec };
      if (request.displayName !== undefined) {
        updatedSpec.displayName = request.displayName;
      }
      if (request.enforceServers !== undefined) {
        updatedSpec.enforceServers = request.enforceServers;
      }
      if (request.source !== undefined) {
        updatedSpec.source = request.source;
      }
      if (request.syncPolicy !== undefined) {
        updatedSpec.syncPolicy = request.syncPolicy;
      }
      if (request.filter !== undefined) {
        updatedSpec.filter = request.filter;
      }

      // Update the registry via Kubernetes API
      const updatedRegistry = await this.kubernetesClient.updateMCPRegistry(name, {
        spec: updatedSpec
      });

      console.log('MCPRegistry updated successfully:', updatedRegistry.metadata.name);

      return {
        success: true,
        registry: updatedRegistry,
        message: `Registry '${updatedRegistry.metadata.name}' updated successfully`
      };
    } catch (error) {
      console.error('Error updating MCPRegistry:', error);

      let message = 'Failed to update registry';
      if (error instanceof Error) {
        message = error.message;
      }

      return {
        success: false,
        message
      };
    }
  }

  /**
   * Get a registry by name
   */
  async getRegistry(name: string): Promise<MCPRegistry | null> {
    try {
      return await this.kubernetesClient.getMCPRegistry(name);
    } catch (error) {
      console.error('Error getting MCPRegistry:', error);
      return null;
    }
  }

  /**
   * List all registries
   */
  async listRegistries(namespace?: string): Promise<MCPRegistryListResult> {
    try {
      const registries = await this.kubernetesClient.getMCPRegistries();

      // Filter by namespace if specified
      const filteredRegistries = namespace
        ? registries.filter(reg => reg.metadata.namespace === namespace)
        : registries;

      return {
        registries: filteredRegistries,
        total: filteredRegistries.length,
        namespace: namespace || 'all'
      };
    } catch (error) {
      console.error('Error listing MCPRegistries:', error);
      return {
        registries: [],
        total: 0,
        namespace: namespace || 'all'
      };
    }
  }

  /**
   * Delete a registry
   */
  async deleteRegistry(name: string): Promise<boolean> {
    try {
      await this.kubernetesClient.deleteMCPRegistry(name);
      console.log('MCPRegistry deleted successfully:', name);
      return true;
    } catch (error) {
      console.error('Error deleting MCPRegistry:', error);
      return false;
    }
  }

  /**
   * Trigger a manual sync for a registry
   */
  async triggerSync(name: string): Promise<boolean> {
    try {
      await this.kubernetesClient.triggerMCPRegistrySync(name);
      console.log('MCPRegistry sync triggered successfully:', name);
      return true;
    } catch (error) {
      console.error('Error triggering MCPRegistry sync:', error);
      return false;
    }
  }

  /**
   * Get registry status and sync information
   */
  async getRegistryStatus(name: string): Promise<{
    phase?: string;
    servers?: number;
    lastSync?: string;
    message?: string;
    syncStatus?: any;
  } | null> {
    try {
      const registry = await this.kubernetesClient.getMCPRegistry(name);
      if (!registry) {
        return null;
      }

      return {
        phase: registry.status?.phase,
        servers: registry.status?.servers,
        lastSync: registry.status?.lastSync,
        message: registry.status?.message,
        syncStatus: registry.status?.syncStatus
      };
    } catch (error) {
      console.error('Error getting MCPRegistry status:', error);
      return null;
    }
  }

  /**
   * Validate registry configuration without creating it
   */
  async validateConfiguration(request: CreateMCPRegistryRequest): Promise<MCPRegistryValidationResult> {
    return this.validateCreateRequest(request);
  }
}

export default MCPRegistryService;