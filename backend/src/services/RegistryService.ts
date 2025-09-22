import { v4 as uuidv4 } from 'uuid';
import {
  Registry,
  CreateRegistryRequest,
  UpdateRegistryRequest,
  RegistryDetails,
  RegistryListResponse,
} from '../models/Registry';

export class RegistryService {
  private registries: Map<string, RegistryDetails> = new Map();

  async createRegistry(data: CreateRegistryRequest): Promise<Registry> {
    // Check for duplicate names
    for (const registry of this.registries.values()) {
      if (registry.name === data.name) {
        throw new Error('Registry with this name already exists');
      }
    }

    const now = new Date();
    const registry: RegistryDetails = {
      id: uuidv4(),
      name: data.name,
      url: data.url,
      description: data.description,
      status: 'syncing',
      serverCount: 0,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      authConfig: data.authConfig || { type: 'none' },
      syncHistory: [
        {
          timestamp: now,
          status: 'success',
          message: 'Registry created',
        },
      ],
    };

    this.registries.set(registry.id, registry);

    // Simulate async sync process
    this.triggerSync(registry.id).catch(console.error);

    // Return basic registry info (without sync history)
    const { syncHistory, ...basicRegistry } = registry;
    return basicRegistry;
  }

  async getRegistries(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<RegistryListResponse> {
    let registries = Array.from(this.registries.values());

    // Filter by status if provided
    if (status) {
      registries = registries.filter(r => r.status === status);
    }

    // Apply pagination
    const total = registries.length;
    const paginatedRegistries = registries
      .slice(offset, offset + limit)
      .map(({ syncHistory, ...registry }) => registry); // Remove sync history from list view

    return {
      registries: paginatedRegistries,
      total,
      limit,
      offset,
    };
  }

  async getRegistryById(id: string): Promise<RegistryDetails | null> {
    const registry = this.registries.get(id);
    return registry || null;
  }

  async updateRegistry(id: string, data: UpdateRegistryRequest): Promise<Registry | null> {
    const registry = this.registries.get(id);
    if (!registry) {
      return null;
    }

    // Check for duplicate names if name is being updated
    if (data.name && data.name !== registry.name) {
      for (const [otherId, otherRegistry] of this.registries.entries()) {
        if (otherId !== id && otherRegistry.name === data.name) {
          throw new Error('Registry with this name already exists');
        }
      }
    }

    // Update fields
    const updatedRegistry: RegistryDetails = {
      ...registry,
      ...data,
      updatedAt: new Date(),
    };

    this.registries.set(id, updatedRegistry);

    // Return basic registry info
    const { syncHistory, ...basicRegistry } = updatedRegistry;
    return basicRegistry;
  }

  async deleteRegistry(id: string): Promise<boolean> {
    const registry = this.registries.get(id);
    if (!registry) {
      return false;
    }

    // Check if registry has active instances (would be implemented with InstanceService)
    // For now, allow deletion

    this.registries.delete(id);
    return true;
  }

  async syncRegistry(id: string): Promise<{ syncId: string; status: string } | null> {
    const registry = this.registries.get(id);
    if (!registry) {
      return null;
    }

    // Check if already syncing
    if (registry.status === 'syncing') {
      throw new Error('Sync already in progress');
    }

    const syncId = uuidv4();

    // Update status to syncing
    registry.status = 'syncing';
    registry.updatedAt = new Date();
    this.registries.set(id, registry);

    // Trigger async sync
    this.triggerSync(id).catch(console.error);

    return {
      syncId,
      status: 'initiated',
    };
  }

  private async triggerSync(id: string): Promise<void> {
    const registry = this.registries.get(id);
    if (!registry) {
      return;
    }

    try {
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate fetching server count (would make HTTP request to registry.url)
      const serverCount = Math.floor(Math.random() * 50) + 10;

      // Update registry with sync results
      registry.status = 'active';
      registry.serverCount = serverCount;
      registry.lastSyncAt = new Date();
      registry.updatedAt = new Date();
      registry.syncHistory.push({
        timestamp: new Date(),
        status: 'success',
        message: `Synced ${serverCount} servers`,
      });

      this.registries.set(id, registry);
    } catch (error) {
      // Handle sync failure
      registry.status = 'error';
      registry.updatedAt = new Date();
      registry.syncHistory.push({
        timestamp: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Sync failed',
      });

      this.registries.set(id, registry);
    }
  }

  // For testing purposes
  async clear(): Promise<void> {
    this.registries.clear();
  }
}