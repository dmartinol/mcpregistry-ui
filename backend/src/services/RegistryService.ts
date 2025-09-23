import {
  Registry,
  CreateRegistryRequest,
  UpdateRegistryRequest,
  RegistryDetails,
  RegistryListResponse,
} from '../models/Registry';
import { KubernetesClient, MCPRegistry } from './KubernetesClient';

export class RegistryService {
  private k8sClient: KubernetesClient;

  constructor(namespace?: string) {
    this.k8sClient = new KubernetesClient(namespace);
  }

  async createRegistry(data: CreateRegistryRequest): Promise<Registry> {
    // Check for duplicate names
    const existingRegistries = await this.k8sClient.getMCPRegistries();
    const duplicateRegistry = existingRegistries.find(r => r.metadata.name === data.name);
    if (duplicateRegistry) {
      throw new Error('Registry with this name already exists');
    }

    // Create MCPRegistry object
    const mcpRegistry: Partial<MCPRegistry> = {
      metadata: {
        name: data.name,
        namespace: this.k8sClient.getCurrentNamespace(),
        creationTimestamp: new Date().toISOString(),
        uid: '',
      },
      spec: {
        url: data.url,
        description: data.description,
        auth: data.authConfig || { type: 'none' },
      },
    };

    // Create in Kubernetes
    const createdRegistry = await this.k8sClient.createMCPRegistry(mcpRegistry);

    // Convert to our Registry model
    return await this.k8sClient.mcpRegistryToRegistry(createdRegistry);
  }

  async getRegistries(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<RegistryListResponse> {
    // Get MCPRegistries from Kubernetes
    const mcpRegistries = await this.k8sClient.getMCPRegistries();

    // Convert to our Registry model
    let registries = await Promise.all(mcpRegistries.map(mcpRegistry =>
      this.k8sClient.mcpRegistryToRegistry(mcpRegistry)
    ));

    // Filter by status if provided
    if (status) {
      registries = registries.filter(r => r.status === status);
    }

    // Apply pagination
    const total = registries.length;
    const paginatedRegistries = registries.slice(offset, offset + limit);

    return {
      registries: paginatedRegistries,
      total,
      limit,
      offset,
    };
  }

  async getRegistryById(id: string): Promise<RegistryDetails | null> {
    // Get MCPRegistry from Kubernetes by name (id is the name)
    const mcpRegistry = await this.k8sClient.getMCPRegistry(id);
    if (!mcpRegistry) {
      return null;
    }

    // Convert to our RegistryDetails model
    return await this.k8sClient.mcpRegistryToRegistryDetails(mcpRegistry);
  }

  async updateRegistry(id: string, data: UpdateRegistryRequest): Promise<Registry | null> {
    // Get existing MCPRegistry
    const existingRegistry = await this.k8sClient.getMCPRegistry(id);
    if (!existingRegistry) {
      return null;
    }

    // Check for duplicate names if name is being updated
    if (data.name && data.name !== existingRegistry.metadata.name) {
      const allRegistries = await this.k8sClient.getMCPRegistries();
      const duplicateRegistry = allRegistries.find(r =>
        r.metadata.name === data.name && r.metadata.name !== id
      );
      if (duplicateRegistry) {
        throw new Error('Registry with this name already exists');
      }
    }

    // Create update object
    const updateData: Partial<MCPRegistry> = {
      spec: {
        ...existingRegistry.spec,
        ...(data.url && { url: data.url }),
        ...(data.description && { description: data.description }),
        ...(data.authConfig && { auth: data.authConfig }),
      },
    };

    // Update in Kubernetes
    const updatedRegistry = await this.k8sClient.updateMCPRegistry(id, updateData);

    // Convert to our Registry model
    return await this.k8sClient.mcpRegistryToRegistry(updatedRegistry);
  }

  async deleteRegistry(id: string): Promise<boolean> {
    // Check if registry exists
    const registry = await this.k8sClient.getMCPRegistry(id);
    if (!registry) {
      return false;
    }

    // Check if registry has active servers
    const servers = await this.k8sClient.getMCPServers(id);
    if (servers.length > 0) {
      throw new Error('Cannot delete registry with active servers. Delete all servers first.');
    }

    // Delete from Kubernetes
    await this.k8sClient.deleteMCPRegistry(id);
    return true;
  }

  async syncRegistry(id: string): Promise<{ syncId: string; status: string } | null> {
    // Check if registry exists
    const registry = await this.k8sClient.getMCPRegistry(id);
    if (!registry) {
      return null;
    }

    // Check if already syncing
    if (registry.status?.phase === 'Syncing') {
      throw new Error('Sync already in progress');
    }

    // Trigger sync by updating annotation
    await this.k8sClient.triggerMCPRegistrySync(id);

    return {
      syncId: `sync-${Date.now()}`,
      status: 'initiated',
    };
  }

  async forceSyncRegistry(id: string): Promise<{ syncId: string; status: string } | null> {
    // Check if registry exists
    const registry = await this.k8sClient.getMCPRegistry(id);
    if (!registry) {
      return null;
    }

    // Trigger force sync by adding the specific annotation
    await this.k8sClient.addForceSyncAnnotation(id);

    return {
      syncId: `force-sync-${Date.now()}`,
      status: 'initiated',
    };
  }

  async refreshRegistries(): Promise<void> {
    // This method will be used to refresh the registry cache
    // For now, it's just a placeholder since we're fetching from Kubernetes directly
    console.log('Refreshing registries data from Kubernetes cluster');
  }


  // Get current namespace
  getCurrentNamespace(): string {
    return this.k8sClient.getCurrentNamespace();
  }

  // Set namespace for operations
  setNamespace(namespace: string): void {
    this.k8sClient.setNamespace(namespace);
  }
}