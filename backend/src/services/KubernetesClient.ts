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
    // Source configuration
    source?: {
      type?: 'configmap' | 'git' | 'http' | 'https';
      configMap?: {
        name: string;
        key?: string;
      };
      git?: {
        repository: string;
        branch?: string;
        path?: string;
      };
      http?: {
        url: string;
      };
    };
    // Sync configuration
    sync?: {
      interval?: string;
      automatic?: boolean;
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
  async mcpRegistryToRegistry(mcpRegistry: MCPRegistry): Promise<Registry> {
    const status = this.mapMCPPhaseToStatus(mcpRegistry.status?.phase);
    const actualServerCount = await this.getActualServerCount(mcpRegistry);
    const sourceInfo = this.extractSourceInfo(mcpRegistry);

    return {
      id: mcpRegistry.metadata.name,
      name: mcpRegistry.metadata.name,
      url: (mcpRegistry.status as any)?.apiEndpoint || mcpRegistry.spec.url || '',
      description: mcpRegistry.spec.description,
      status,
      serverCount: actualServerCount,
      lastSyncAt: mcpRegistry.status?.lastSync ? new Date(mcpRegistry.status.lastSync) : undefined,
      createdAt: new Date(mcpRegistry.metadata.creationTimestamp),
      updatedAt: new Date(mcpRegistry.metadata.creationTimestamp),
      metadata: {
        namespace: mcpRegistry.metadata.namespace,
        uid: mcpRegistry.metadata.uid,
        phase: mcpRegistry.status?.phase,
      },
      authConfig: mcpRegistry.spec.auth || { type: 'none' },
      source: sourceInfo,
    };
  }

  // Helper method to get actual server count from registry API
  private async getActualServerCount(mcpRegistry: MCPRegistry): Promise<number> {
    try {
      const apiEndpoint = (mcpRegistry.status as any)?.apiEndpoint || mcpRegistry.spec.url;
      if (!apiEndpoint) {
        console.warn(`No API endpoint found for registry ${mcpRegistry.metadata.name}`);
        return 0;
      }

      // Check if this is a cluster-internal URL and use Kubernetes API proxy
      if (apiEndpoint.includes('.svc.cluster.local')) {
        console.log(`Fetching server count via K8s proxy for: ${apiEndpoint}`);

        // Parse the cluster URL to extract service info
        // Format: http://service-name.namespace.svc.cluster.local:port
        const urlMatch = apiEndpoint.match(/^https?:\/\/([^.]+)\.([^.]+)\.svc\.cluster\.local:?(\d+)?/);
        if (!urlMatch) {
          console.warn(`Invalid cluster URL format: ${apiEndpoint}`);
          return 0;
        }

        const [, serviceName, namespace, port] = urlMatch;
        const servicePort = port || '8080';

        const data = await this.proxyServiceRequest(namespace, serviceName, servicePort, '/v0/servers');
        return data?.servers?.length || data?.total || 0;
      } else {
        // Try direct fetch for external URLs
        console.log(`Fetching server count directly from: ${apiEndpoint}`);
        const registryUrl = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
        const serversEndpoint = `${registryUrl}/v0/servers`;

        const response = await fetch(serversEndpoint);
        if (!response.ok) {
          console.warn(`Failed to fetch servers from ${serversEndpoint}: ${response.status}`);
          return 0;
        }

        const data = await response.json();
        return data?.servers?.length || data?.total || 0;
      }
    } catch (error) {
      console.warn(`Failed to fetch server count for registry ${mcpRegistry.metadata.name}:`, error);
      return 0;
    }
  }

  // Helper method to convert MCPRegistry to our RegistryDetails model
  async mcpRegistryToRegistryDetails(mcpRegistry: MCPRegistry): Promise<RegistryDetails> {
    const registry = await this.mcpRegistryToRegistry(mcpRegistry);

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

  /**
   * Extract source information from MCPRegistry spec
   */
  private extractSourceInfo(mcpRegistry: MCPRegistry): Registry['source'] | undefined {
    const spec = mcpRegistry.spec;

    // If there's no source configuration, try to infer from URL
    if (!spec.source) {
      const url = spec.url;
      if (url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return {
            type: url.startsWith('https://') ? 'https' : 'http',
            location: url,
            syncInterval: spec.sync?.interval || 'manual'
          };
        }
      }
      return undefined;
    }

    const source = spec.source;
    let location = '';
    let type = source.type || 'http';

    // Determine location string based on source type
    if (source.configMap) {
      type = 'configmap';
      location = `${source.configMap.name}${source.configMap.key ? `:${source.configMap.key}` : ''}`;
    } else if (source.git) {
      type = 'git';
      const branch = source.git.branch || 'main';
      const path = source.git.path ? `/${source.git.path}` : '';
      location = `${source.git.repository}@${branch}${path}`;
    } else if (source.http) {
      type = source.http.url.startsWith('https://') ? 'https' : 'http';
      location = source.http.url;
    }

    return {
      type,
      location,
      syncInterval: spec.sync?.interval || (spec.sync?.automatic === false ? 'manual' : 'manual')
    };
  }

  /**
   * Add force sync annotation to trigger manual sync
   */
  async addForceSyncAnnotation(name: string): Promise<void> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      const timestamp = new Date().toISOString();
      const patch = {
        metadata: {
          annotations: {
            'toolhive.stacklok.dev/sync-trigger': timestamp,
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
      console.error('Error adding force sync annotation:', error);
      throw new Error(`Failed to trigger force sync for MCPRegistry ${name}`);
    }
  }
}