import * as k8s from '@kubernetes/client-node';
import { Registry, RegistryDetails } from '../models/Registry';

export interface MCPRegistry {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    uid: string;
    [key: string]: any;
  };
  spec: {
    url?: string;
    description?: string;
    auth?: {
      type: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  status?: {
    phase: 'Pending' | 'Syncing' | 'Ready' | 'Error';
    servers?: number;
    lastSync?: string;
    message?: string;
    [key: string]: any;
  };
}

export interface MCPServer {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    [key: string]: any;
  };
  spec: {
    registryRef: {
      name: string;
    };
    serverName: string;
    image: string;
    version?: string;
    [key: string]: any;
  };
  status?: {
    phase: 'Pending' | 'Running' | 'Failed' | 'Terminating';
    ready: boolean;
    [key: string]: any;
  };
}

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private customApi: k8s.CustomObjectsApi;
  private namespace: string;

  constructor(namespace?: string) {
    this.kc = new k8s.KubeConfig();

    try {
      // Try to load from default locations (in-cluster, ~/.kube/config, etc.)
      this.kc.loadFromDefault();
      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);

      // Use provided namespace or default to toolhive-system for now
      this.namespace = namespace || 'toolhive-system';
    } catch (error) {
      console.error('Failed to load Kubernetes config:', error);
      console.warn('Kubernetes client will operate in mock mode');
      // Initialize with null to handle gracefully
      this.k8sApi = null as any;
      this.customApi = null as any;
      this.namespace = namespace || 'default';
    }
  }

  async getMCPRegistries(): Promise<MCPRegistry[]> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available, returning empty registry list');
      return [];
    }

    try {
      const response = await this.customApi.listNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries'
      );

      const registries = (response.body as any).items || [];
      return registries as MCPRegistry[];
    } catch (error) {
      console.error('Error fetching MCPRegistries:', error);
      throw new Error('Failed to fetch MCPRegistries from Kubernetes');
    }
  }

  async getMCPRegistry(name: string): Promise<MCPRegistry | null> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available');
      return null;
    }

    try {
      const response = await this.customApi.getNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries',
        name
      );

      return response.body as MCPRegistry;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      console.error('Error fetching MCPRegistry:', error);
      throw new Error(`Failed to fetch MCPRegistry ${name}`);
    }
  }

  async createMCPRegistry(registry: Partial<MCPRegistry>): Promise<MCPRegistry> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      const mcpRegistry: MCPRegistry = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPRegistry',
        metadata: {
          name: registry.metadata?.name || '',
          namespace: this.namespace,
          creationTimestamp: new Date().toISOString(),
          uid: '',
        },
        spec: registry.spec || {},
      };

      const response = await this.customApi.createNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries',
        mcpRegistry
      );

      return response.body as MCPRegistry;
    } catch (error) {
      console.error('Error creating MCPRegistry:', error);
      throw new Error('Failed to create MCPRegistry in Kubernetes');
    }
  }

  async updateMCPRegistry(name: string, registry: Partial<MCPRegistry>): Promise<MCPRegistry> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      const response = await this.customApi.patchNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries',
        name,
        registry,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
        }
      );

      return response.body as MCPRegistry;
    } catch (error) {
      console.error('Error updating MCPRegistry:', error);
      throw new Error(`Failed to update MCPRegistry ${name}`);
    }
  }

  async deleteMCPRegistry(name: string): Promise<void> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      await this.customApi.deleteNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries',
        name
      );
    } catch (error) {
      console.error('Error deleting MCPRegistry:', error);
      throw new Error(`Failed to delete MCPRegistry ${name}`);
    }
  }

  async getMCPServers(registryName?: string): Promise<MCPServer[]> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available, returning empty server list');
      return [];
    }

    try {
      const response = await this.customApi.listNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpservers'
      );

      let servers = (response.body as any).items || [];

      // Filter by registry if specified
      if (registryName) {
        servers = servers.filter((server: MCPServer) =>
          server.spec.registryRef?.name === registryName
        );
      }

      return servers as MCPServer[];
    } catch (error) {
      console.error('Error fetching MCPServers:', error);
      throw new Error('Failed to fetch MCPServers from Kubernetes');
    }
  }

  async triggerMCPRegistrySync(name: string): Promise<void> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      // Trigger sync by adding/updating an annotation
      const timestamp = new Date().toISOString();
      const patch = {
        metadata: {
          annotations: {
            'toolhive.stacklok.dev/sync-requested': timestamp,
          },
        },
      };

      await this.customApi.patchNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries',
        name,
        patch,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
        }
      );
    } catch (error) {
      console.error('Error triggering sync for MCPRegistry:', error);
      throw new Error(`Failed to trigger sync for MCPRegistry ${name}`);
    }
  }

  // Helper method to convert MCPRegistry to our Registry model
  mcpRegistryToRegistry(mcpRegistry: MCPRegistry): Registry {
    const status = this.mapMCPPhaseToStatus(mcpRegistry.status?.phase);

    return {
      id: mcpRegistry.metadata.name,
      name: mcpRegistry.metadata.name,
      url: (mcpRegistry.status as any)?.apiEndpoint || mcpRegistry.spec.url || '',
      description: mcpRegistry.spec.description,
      status,
      serverCount: mcpRegistry.status?.serverCount || 0,
      lastSyncAt: mcpRegistry.status?.lastSyncTime ? new Date(mcpRegistry.status.lastSyncTime) : undefined,
      createdAt: new Date(mcpRegistry.metadata.creationTimestamp),
      updatedAt: new Date(mcpRegistry.metadata.creationTimestamp),
      metadata: {
        namespace: mcpRegistry.metadata.namespace,
        uid: mcpRegistry.metadata.uid,
        phase: mcpRegistry.status?.phase,
      },
      authConfig: mcpRegistry.spec.auth || { type: 'none' },
    };
  }

  // Helper method to convert MCPRegistry to our RegistryDetails model
  mcpRegistryToRegistryDetails(mcpRegistry: MCPRegistry): RegistryDetails {
    const registry = this.mcpRegistryToRegistry(mcpRegistry);

    return {
      ...registry,
      syncHistory: [
        {
          timestamp: new Date(mcpRegistry.metadata.creationTimestamp),
          status: 'success',
          message: mcpRegistry.status?.message || 'Registry created',
        },
      ],
    };
  }

  private mapMCPPhaseToStatus(phase?: string): Registry['status'] {
    switch (phase) {
      case 'Ready':
        return 'active';
      case 'Syncing':
        return 'syncing';
      case 'Error':
        return 'error';
      case 'Pending':
      default:
        return 'inactive';
    }
  }

  // Get current namespace
  getCurrentNamespace(): string {
    return this.namespace;
  }

  // Set namespace for operations
  setNamespace(namespace: string): void {
    this.namespace = namespace;
  }

  /**
   * Proxy a request to a Kubernetes service using the API server
   * @param namespace The namespace of the service
   * @param serviceName The name of the service
   * @param port The port to connect to
   * @param path The API path to request
   * @returns Promise resolving to the API response data
   */
  async proxyServiceRequest(namespace: string, serviceName: string, port: string, path: string): Promise<any> {
    try {
      // Use kubectl get --raw to proxy the request
      // This ensures proper authentication using the configured kubeconfig
      const proxyPath = `/api/v1/namespaces/${namespace}/services/${serviceName}:${port}/proxy${path}`;

      console.log(`Making Kubernetes proxy request to: ${proxyPath}`);

      const { exec } = require('child_process');

      return new Promise((resolve, reject) => {
        const command = `kubectl get --raw "${proxyPath}"`;

        exec(command, (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error('kubectl command failed:', error);
            reject(new Error(`kubectl command failed: ${error.message}`));
            return;
          }

          try {
            const jsonData = JSON.parse(stdout);
            resolve(jsonData);
          } catch (parseError) {
            console.error('Failed to parse kubectl response:', stdout);
            reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`));
          }
        });
      });

    } catch (error) {
      console.error('Error making Kubernetes proxy request:', error);
      throw new Error(`Failed to proxy request to service ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}