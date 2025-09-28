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
      configmap?: {
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
    syncPolicy?: {
      interval?: string;
    };
    [key: string]: any;
  };
  status?: {
    phase: 'Pending' | 'Syncing' | 'Ready' | 'Error';
    servers?: number;
    lastSync?: string;
    message?: string;
    syncStatus?: {
      lastAttempt?: string;
      lastSyncHash?: string;
      lastSyncTime?: string;
      message?: string;
      phase?: 'Idle' | 'Syncing' | 'Error' | 'Pending';
      serverCount?: number;
    };
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
    labels?: {
      [key: string]: string;
    };
    [key: string]: any;
  };
  spec: {
    image: string;
    transport: 'stdio' | 'streamable-http' | 'sse';
    targetPort: number;
    port: number;
    proxyMode?: 'sse' | 'streamable-http';
    permissionProfile: {
      type: 'builtin';
      name: string;
    };
    resources: {
      limits: {
        cpu: string;
        memory: string;
      };
      requests: {
        cpu: string;
        memory: string;
      };
    };
    env?: Array<{
      name: string;
      value: string;
    }>;
    [key: string]: any;
  };
  status?: {
    phase: 'Pending' | 'Running' | 'Failed' | 'Terminating';
    ready: boolean;
    url?: string;
    [key: string]: any;
  };
}

export interface OrphanedServer {
  name: string;
  namespace: string;
  transport: 'stdio' | 'streamable-http' | 'sse';
  port: number;
  targetPort: number;
  url?: string;
  image: string;
  status: 'Pending' | 'Running' | 'Failed' | 'Terminating';
  createdAt: string;
  labels?: Record<string, string>;
}

// Global mock data store for test isolation
const globalMockRegistries: Map<string, MCPRegistry> = new Map();

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private customApi: k8s.CustomObjectsApi;
  private namespace: string;
  private mockMode: boolean = false;
  private mockRegistries: Map<string, MCPRegistry> = globalMockRegistries;

  constructor(namespace?: string) {
    this.kc = new k8s.KubeConfig();

    // Force mock mode in test environment
    if (process.env.NODE_ENV === 'test' || process.env.FORCE_MOCK_K8S === 'true') {
      console.warn('Forcing mock mode for tests');
      this.k8sApi = null as any;
      this.customApi = null as any;
      this.namespace = namespace || 'default';
      this.mockMode = true;
      this.initializeMockData();
      return;
    }

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
      this.mockMode = true;
      this.initializeMockData();
    }
  }

  private initializeMockData(): void {
    // Add a mock registry for testing purposes with a unique name
    const mockRegistry: MCPRegistry = {
      apiVersion: 'toolhive.stacklok.dev/v1alpha1',
      kind: 'MCPRegistry',
      metadata: {
        name: 'mock-registry-system',
        namespace: this.namespace,
        creationTimestamp: new Date().toISOString(),
        uid: 'mock-registry-system-uid-123',
      },
      spec: {
        url: 'https://mock-registry-system.example.com/api/v1',
        description: 'System mock registry for testing infrastructure',
        auth: { type: 'none' },
      },
      status: {
        phase: 'Ready',
        servers: 3,
        lastSync: new Date().toISOString(),
      },
    };
    this.mockRegistries.set('mock-registry-system', mockRegistry);
  }

  // Method to clear mock data for test isolation
  clearMockData(): void {
    if (this.mockMode) {
      this.mockRegistries.clear();
      this.initializeMockData();
    }
  }

  // Static method to clear global mock data for test isolation
  static clearGlobalMockData(): void {
    globalMockRegistries.clear();
  }

  // Static method to initialize mock data
  static initializeGlobalMockData(): void {
    globalMockRegistries.clear();
    const mockRegistry: MCPRegistry = {
      apiVersion: 'toolhive.stacklok.dev/v1alpha1',
      kind: 'MCPRegistry',
      metadata: {
        name: 'mock-registry-system',
        namespace: 'default',
        creationTimestamp: new Date().toISOString(),
        uid: 'mock-registry-system-uid-123',
      },
      spec: {
        url: 'https://mock-registry-system.example.com/api/v1',
        description: 'System mock registry for testing infrastructure',
        auth: { type: 'none' },
      },
      status: {
        phase: 'Ready',
        servers: 3,
        lastSync: new Date().toISOString(),
      },
    };
    globalMockRegistries.set('mock-registry-system', mockRegistry);
  }

  async getMCPRegistries(): Promise<MCPRegistry[]> {
    console.log('=== getMCPRegistries called ===');
    console.log('customApi available:', !!this.customApi);
    console.log('mockMode:', this.mockMode);
    console.log('namespace:', this.namespace);

    if (this.mockMode || !this.customApi) {
      console.warn('Using mock mode, returning mock registry data');
      return Array.from(this.mockRegistries.values());
    }

    try {
      console.log('Calling listNamespacedCustomObject...');
      const response = await this.customApi.listNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        this.namespace,
        'mcpregistries'
      );
      console.log('Response received, status:', response.response?.statusCode);
      console.log('Response body type:', typeof response.body);
      console.log('Response body items length:', (response.body as any)?.items?.length);

      const registries = (response.body as any).items || [];
      console.log('Returning registries count:', registries.length);
      return registries as MCPRegistry[];
    } catch (error) {
      console.error('=== Error in getMCPRegistries ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.error('Full error object:', error);
      throw new Error('Failed to fetch MCPRegistries from Kubernetes');
    }
  }

  async getMCPRegistry(name: string): Promise<MCPRegistry | null> {
    if (this.mockMode || !this.customApi) {
      console.warn('Using mock mode for getMCPRegistry');
      return this.mockRegistries.get(name) || null;
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
    if (this.mockMode || !this.customApi) {
      // Mock mode: create in-memory registry
      const mcpRegistry: MCPRegistry = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPRegistry',
        metadata: {
          name: registry.metadata?.name || '',
          namespace: this.namespace,
          creationTimestamp: new Date().toISOString(),
          uid: `mock-${registry.metadata?.name}-${Date.now()}`,
        },
        spec: registry.spec || {},
        status: {
          phase: 'Syncing',
          servers: 0,
          lastSync: new Date().toISOString(),
        },
      };

      this.mockRegistries.set(mcpRegistry.metadata.name, mcpRegistry);
      return mcpRegistry;
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
    if (this.mockMode || !this.customApi) {
      // Mock mode: update in-memory registry
      const existingRegistry = this.mockRegistries.get(name);
      if (!existingRegistry) {
        throw new Error(`MCPRegistry ${name} not found`);
      }

      // Merge the updates into the existing registry
      const updatedRegistry: MCPRegistry = {
        ...existingRegistry,
        spec: {
          ...existingRegistry.spec,
          ...registry.spec,
        },
        metadata: {
          ...existingRegistry.metadata,
          ...registry.metadata,
        },
        status: registry.status ? {
          ...existingRegistry.status,
          ...registry.status,
        } : existingRegistry.status,
      };

      this.mockRegistries.set(name, updatedRegistry);
      return updatedRegistry;
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
    if (this.mockMode || !this.customApi) {
      // Mock mode: delete from in-memory store
      this.mockRegistries.delete(name);
      return;
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
    if (this.mockMode || !this.customApi) {
      // Mock mode: simulate sync trigger by updating the registry status
      const registry = this.mockRegistries.get(name);
      if (registry) {
        // Update status to simulate sync completion
        registry.status = {
          ...registry.status,
          phase: 'Ready',
          lastSync: new Date().toISOString(),
        };
        this.mockRegistries.set(name, registry);
      }
      return;
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
    const sourceInfo = this.extractSourceInfo(mcpRegistry);
    const syncStatus = this.extractSyncStatus(mcpRegistry);

    // Use server count from syncStatus if available, otherwise fall back to API call
    const serverCount = syncStatus?.serverCount ?? await this.getActualServerCount(mcpRegistry);

    const result = {
      id: mcpRegistry.metadata.name,
      name: mcpRegistry.spec.displayName || mcpRegistry.metadata.name,
      url: (mcpRegistry.status as any)?.apiEndpoint || mcpRegistry.spec.url || '',
      description: mcpRegistry.spec.description,
      status,
      serverCount,
      lastSyncAt: mcpRegistry.status?.lastSync ? new Date(mcpRegistry.status.lastSync) : undefined,
      createdAt: new Date(mcpRegistry.metadata.creationTimestamp),
      updatedAt: new Date(mcpRegistry.metadata.creationTimestamp),
      metadata: {
        namespace: mcpRegistry.metadata.namespace,
        uid: mcpRegistry.metadata.uid,
        phase: mcpRegistry.status?.phase,
      },
      authConfig: mcpRegistry.spec.auth ?
        { ...mcpRegistry.spec.auth, type: mcpRegistry.spec.auth.type as 'none' | 'basic' | 'bearer' | 'oauth' } :
        { type: 'none' as const },
      source: sourceInfo,
      syncStatus,
    };

    return result;
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

        exec(command, (error: any, stdout: string, _stderr: string) => {
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
   * Extract sync status information from MCPRegistry status
   */
  private extractSyncStatus(mcpRegistry: MCPRegistry): Registry['syncStatus'] | undefined {
    const syncStatus = mcpRegistry.status?.syncStatus;
    if (!syncStatus) {
      return undefined;
    }

    return {
      lastAttempt: syncStatus.lastAttempt ? new Date(syncStatus.lastAttempt) : undefined,
      lastSyncHash: syncStatus.lastSyncHash,
      lastSyncTime: syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : undefined,
      message: syncStatus.message,
      phase: syncStatus.phase,
      serverCount: syncStatus.serverCount,
    };
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
            syncInterval: spec.syncPolicy?.interval || 'manual'
          };
        }
      }
      return undefined;
    }

    const source = spec.source;
    let location = '';
    let type = source.type || 'http';

    // Determine location string based on source type
    if (source.configmap) {
      type = 'configmap';
      location = `${source.configmap.name}${source.configmap.key ? `:${source.configmap.key}` : ''}`;
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
      syncInterval: spec.syncPolicy?.interval || 'manual'
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

  /**
   * Deploy an MCPServer using the provided configuration
   */
  async deployMCPServer(serverConfig: {
    name: string;
    image: string;
    transport: string; // Accept any transport from frontend
    targetPort: number;
    port: number;
    permissionProfile: {
      type: 'builtin';
      name: string;
    };
    resources: {
      limits: {
        cpu: string;
        memory: string;
      };
      requests: {
        cpu: string;
        memory: string;
      };
    };
    environmentVariables: Array<{
      name: string;
      value: string;
    }>;
    namespace: string;
    registryName: string;
    registryNamespace: string;
    serverName: string;
    proxyMode?: 'sse' | 'streamable-http';
  }): Promise<MCPServer> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    try {
      // Use the original transport value directly (MCPServer supports stdio, streamable-http, sse)
      const mcpTransport = serverConfig.transport as 'stdio' | 'streamable-http' | 'sse';

      const mcpServer: MCPServer = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: serverConfig.name,
          namespace: serverConfig.namespace,
          creationTimestamp: new Date().toISOString(),
          labels: {
            'toolhive.stacklok.io/registry-name': serverConfig.registryName,
            'toolhive.stacklok.io/registry-namespace': serverConfig.registryNamespace,
            'toolhive.stacklok.io/server-name': serverConfig.serverName,
          },
        },
        spec: {
          image: serverConfig.image,
          transport: mcpTransport,
          targetPort: serverConfig.targetPort,
          port: serverConfig.port,
          ...(serverConfig.proxyMode && {
            proxyMode: serverConfig.proxyMode,
          }),
          permissionProfile: serverConfig.permissionProfile,
          resources: serverConfig.resources,
          ...(serverConfig.environmentVariables.length > 0 && {
            env: serverConfig.environmentVariables,
          }),
        },
      };

      console.log('Deploying MCPServer:', JSON.stringify(mcpServer, null, 2));

      const response = await this.customApi.createNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        serverConfig.namespace,
        'mcpservers',
        mcpServer
      );

      return response.body as MCPServer;
    } catch (error) {
      console.error('Error deploying MCPServer:', error);
      throw new Error(`Failed to deploy MCPServer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an MCPServer by name
   */
  async getMCPServer(name: string, namespace?: string): Promise<MCPServer | null> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available');
      return null;
    }

    const targetNamespace = namespace || this.namespace;

    try {
      const response = await this.customApi.getNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        targetNamespace,
        'mcpservers',
        name
      );

      return response.body as MCPServer;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      console.error('Error fetching MCPServer:', error);
      throw new Error(`Failed to fetch MCPServer ${name}`);
    }
  }

  /**
   * Delete an MCPServer
   */
  async deleteMCPServer(name: string, namespace?: string): Promise<void> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    const targetNamespace = namespace || this.namespace;

    try {
      await this.customApi.deleteNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        targetNamespace,
        'mcpservers',
        name
      );
    } catch (error) {
      console.error('Error deleting MCPServer:', error);
      if ((error as any).statusCode === 404) {
        throw new Error(`MCPServer ${name} not found`);
      }
      throw new Error(`Failed to delete MCPServer ${name}`);
    }
  }

  /**
   * Read a ConfigMap from Kubernetes
   */
  async readConfigMap(name: string, namespace?: string): Promise<any> {
    if (!this.k8sApi) {
      throw new Error('Kubernetes client not available');
    }

    const targetNamespace = namespace || this.namespace;
    const response = await this.k8sApi.readNamespacedConfigMap(name, targetNamespace);
    return response.body;
  }

  /**
   * Get all MCPServers in a namespace
   */
  async getAllMCPServers(namespace?: string): Promise<MCPServer[]> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available, returning empty server list');
      return [];
    }

    const targetNamespace = namespace || this.namespace;

    try {
      const response = await this.customApi.listNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        targetNamespace,
        'mcpservers'
      );

      return (response.body as any).items || [];
    } catch (error) {
      console.error('Error fetching MCPServers:', error);
      return [];
    }
  }

  /**
   * Get orphaned MCPServers (servers without registry labels)
   */
  async getOrphanedMCPServers(namespace?: string): Promise<OrphanedServer[]> {
    if (!this.customApi) {
      console.warn('Kubernetes client not available, returning empty orphaned server list');
      return [];
    }

    const targetNamespace = namespace || this.namespace;

    try {
      const response = await this.customApi.listNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        targetNamespace,
        'mcpservers'
      );

      const servers = (response.body as any).items || [];

      // Filter for orphaned servers (missing required registry labels)
      const orphanedServers = servers.filter((server: MCPServer) => {
        const labels = server.metadata.labels || {};
        const hasRegistryName = labels['toolhive.stacklok.io/registry-name'];
        const hasRegistryNamespace = labels['toolhive.stacklok.io/registry-namespace'];
        const hasServerName = labels['toolhive.stacklok.io/server-name'];

        // Server is orphaned if any required label is missing
        return !hasRegistryName || !hasRegistryNamespace || !hasServerName;
      });

      // Convert to OrphanedServer format
      return orphanedServers.map((server: MCPServer): OrphanedServer => ({
        name: server.metadata.name,
        namespace: server.metadata.namespace,
        transport: server.spec.transport,
        port: server.spec.port,
        targetPort: server.spec.targetPort,
        url: server.status?.url,
        image: server.spec.image,
        status: server.status?.phase || 'Pending',
        createdAt: server.metadata.creationTimestamp,
        labels: server.metadata.labels,
      }));
    } catch (error) {
      console.error('Error fetching orphaned MCPServers:', error);
      throw new Error('Failed to fetch orphaned MCPServers from Kubernetes');
    }
  }

  /**
   * Get a ConfigMap by name from a namespace
   */
  async getConfigMap(name: string, namespace?: string): Promise<any | null> {
    if (!this.k8sApi) {
      console.warn('Kubernetes client not available');
      return null;
    }

    const targetNamespace = namespace || this.namespace;

    try {
      const response = await this.k8sApi.readNamespacedConfigMap(name, targetNamespace);
      return response.body;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      console.error('Error fetching ConfigMap:', error);
      throw new Error(`Failed to fetch ConfigMap ${name} in namespace ${targetNamespace}`);
    }
  }

  /**
   * Connect an orphaned server to a registry by adding the required labels
   */
  async connectServerToRegistry(
    serverName: string,
    registryName: string,
    registryNamespace: string,
    serverNameInRegistry: string,
    namespace?: string
  ): Promise<MCPServer> {
    if (!this.customApi) {
      throw new Error('Kubernetes client not available');
    }

    const targetNamespace = namespace || this.namespace;

    try {
      const patch = {
        metadata: {
          labels: {
            'toolhive.stacklok.io/registry-name': registryName,
            'toolhive.stacklok.io/registry-namespace': registryNamespace,
            'toolhive.stacklok.io/server-name': serverNameInRegistry,
          },
        },
      };

      const response = await this.customApi.patchNamespacedCustomObject(
        'toolhive.stacklok.dev',
        'v1alpha1',
        targetNamespace,
        'mcpservers',
        serverName,
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

      return response.body as MCPServer;
    } catch (error) {
      console.error('Error connecting server to registry:', error);
      if ((error as any).statusCode === 404) {
        throw new Error(`MCPServer ${serverName} not found`);
      }
      throw new Error(`Failed to connect server ${serverName} to registry ${registryName}`);
    }
  }
}