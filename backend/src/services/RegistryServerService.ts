import { RegistryServer, RegistryServersResponse, validateRegistryServer } from '../models/RegistryServer';

/**
 * Query parameters for fetching registry servers
 */
export interface RegistryServersQuery {
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Service for managing available servers from registry sources.
 * This service fetches server definitions from external registry APIs.
 */
export class RegistryServerService {
  /**
   * Fetches available servers from a registry source
   * @param registryId The registry identifier
   * @param query Optional query parameters for filtering and pagination
   * @returns Promise resolving to servers response
   */
  async getAvailableServers(registryId: string, query: RegistryServersQuery = {}): Promise<RegistryServersResponse> {
    try {
      // TODO: Implement actual registry API integration
      // For now, return mock data based on registry ID
      const mockServers = await this.fetchServersFromRegistry(registryId, query);

      // Apply filtering and pagination
      const filteredServers = this.applyFilters(mockServers, query);
      const paginatedResult = this.applyPagination(filteredServers, query);

      return {
        servers: paginatedResult.servers,
        total: filteredServers.length,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };
    } catch (error) {
      throw new Error(`Failed to fetch servers for registry ${registryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches a specific server from a registry
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns Promise resolving to the server or null if not found
   */
  async getServerByName(registryId: string, serverName: string): Promise<RegistryServer | null> {
    try {
      return await this.fetchServerByNameFromRegistry(registryId, serverName);
    } catch (error) {
      throw new Error(`Failed to fetch server ${serverName} from registry ${registryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates server data from external sources
   * @param serverData Raw server data from registry
   * @returns Validated RegistryServer or throws validation error
   */
  private validateServerData(serverData: unknown): RegistryServer {
    const { error, value } = validateRegistryServer(serverData);
    if (error) {
      throw new Error(`Invalid server data: ${error.details.map(d => d.message).join(', ')}`);
    }
    return value!;
  }

  /**
   * Fetches servers from the actual registry source
   * @param registryId The registry identifier
   * @param query Query parameters
   * @returns Promise resolving to raw server list
   */
  private async fetchServersFromRegistry(registryId: string, query: RegistryServersQuery): Promise<RegistryServer[]> {
    try {
      // Get registry details to find the URL
      const registry = await this.getRegistryDetails(registryId);

      if (!registry.url) {
        console.warn(`Registry ${registryId} has no URL configured, using mock data`);
        return this.getMockServers();
      }

      // Check if this is a cluster-internal URL and use Kubernetes API proxy
      if (registry.url.includes('.svc.cluster.local')) {
        console.log(`Detected cluster-internal URL: ${registry.url}`);
        console.log(`Using Kubernetes API proxy for cluster-internal registry: ${registry.url}`);
        return await this.fetchServersViaK8sProxy(registryId, registry.url, query);
      }

      // Try to fetch from the registry's /v0/servers endpoint directly
      const registryUrl = registry.url.endsWith('/') ? registry.url.slice(0, -1) : registry.url;
      const serversEndpoint = `${registryUrl}/v0/servers`;

      console.log(`Fetching servers from registry API: ${serversEndpoint}`);

      const response = await fetch(serversEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ToolHive-Registry-UI/1.0.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Registry API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform registry response to our format
      const servers = this.transformRegistryResponse(data);
      return servers.map(server => this.validateServerData(server));

    } catch (error) {
      console.warn(`Failed to fetch from registry ${registryId}, falling back to mock data:`, error);
      return this.getMockServers();
    }
  }

  /**
   * Fetches servers from a cluster-internal registry using Kubernetes API proxy
   * @param registryId The registry identifier
   * @param clusterUrl The cluster-internal URL
   * @param query Query parameters
   * @returns Promise resolving to raw server list
   */
  private async fetchServersViaK8sProxy(registryId: string, clusterUrl: string, query: RegistryServersQuery): Promise<RegistryServer[]> {
    try {
      // Import here to avoid circular dependencies
      const { KubernetesClient } = await import('./KubernetesClient');
      const k8sClient = new KubernetesClient();

      // Parse the cluster URL to extract service info
      // Format: http://service-name.namespace.svc.cluster.local:port
      const urlMatch = clusterUrl.match(/^https?:\/\/([^.]+)\.([^.]+)\.svc\.cluster\.local:?(\d+)?/);
      if (!urlMatch) {
        throw new Error(`Invalid cluster URL format: ${clusterUrl}`);
      }

      const [, serviceName, namespace, port] = urlMatch;
      const servicePort = port || '8080';

      console.log(`Proxying to service: ${serviceName} in namespace: ${namespace} on port: ${servicePort}`);

      // Use Kubernetes API to proxy the request to the service
      const data = await k8sClient.proxyServiceRequest(namespace, serviceName, servicePort, '/v0/servers');

      // Transform registry response to our format
      const servers = this.transformRegistryResponse(data);
      return servers.map(server => this.validateServerData(server));

    } catch (error) {
      console.warn(`Failed to fetch via Kubernetes proxy for registry ${registryId}:`, error);
      throw error; // Re-throw to trigger fallback to mock data
    }
  }

  /**
   * Get registry details from Kubernetes client
   */
  private async getRegistryDetails(registryId: string): Promise<{ url: string }> {
    // For testing with enhanced data, use test registry server
    if (registryId === 'test-registry') {
      return { url: 'http://localhost:9000' };
    }

    // Import here to avoid circular dependencies
    const { KubernetesClient } = await import('./KubernetesClient');
    const k8sClient = new KubernetesClient();

    const registries = await k8sClient.getMCPRegistries();
    const registry = registries.find(r => (r as any).metadata?.name === registryId);

    if (!registry) {
      throw new Error(`Registry ${registryId} not found`);
    }

    // Use the apiEndpoint from the status section, not the url field
    const apiEndpoint = (registry as any).status?.apiEndpoint;
    if (!apiEndpoint) {
      throw new Error(`Registry ${registryId} has no apiEndpoint in status`);
    }

    return { url: apiEndpoint };
  }

  /**
   * Transform registry API response to our RegistryServer format
   */
  private transformRegistryResponse(data: any): RegistryServer[] {
    // Handle different possible response formats
    const servers = data.servers || data.tools || data;

    if (!Array.isArray(servers)) {
      throw new Error('Invalid registry response: expected array of servers');
    }

    return servers.map((server: any) => ({
      name: server.name || server.id,
      image: server.image || `${server.name}:latest`,
      version: server.version,
      description: server.description || server.summary || `${server.status || 'Unknown'} server`,
      tags: server.tags || server.keywords || (server.status && server.status !== 'Active' ? [server.status.toLowerCase()] : []),
      capabilities: server.capabilities || [],
      author: server.author || server.maintainer,
      repository: server.repository || server.source,
      documentation: server.documentation || server.docs,
      // Additional fields for enhanced UI
      tier: server.tier,
      transport: server.transport,
      tools: server.tools || [],
      status: server.status,
      endpoint_url: server.endpoint_url,
      ready: server.ready,
      namespace: server.namespace,
      // Enhanced fields from individual server endpoint
      env_vars: server.env_vars || [],
      metadata: server.metadata,
      repository_url: server.repository_url,
    }));
  }

  /**
   * Get mock servers as fallback
   */
  private getMockServers(): RegistryServer[] {
    return [
      {
        name: 'web-scraper',
        image: 'toolhive/web-scraper:1.2.0',
        version: '1.2.0',
        description: 'A powerful web scraping tool with JavaScript rendering support',
        tags: ['web', 'scraping', 'automation'],
        capabilities: ['tools', 'resources'],
        author: 'ToolHive Team',
        repository: 'https://github.com/toolhive/web-scraper',
        documentation: 'https://docs.toolhive.com/web-scraper',
      },
      {
        name: 'database-manager',
        image: 'toolhive/database-manager:2.1.0',
        version: '2.1.0',
        description: 'Multi-database management tool with query capabilities',
        tags: ['database', 'sql', 'management'],
        capabilities: ['tools'],
        author: 'Database Team',
        repository: 'https://github.com/toolhive/database-manager',
      },
      {
        name: 'file-processor',
        image: 'toolhive/file-processor:latest',
        description: 'Process and transform files in various formats',
        tags: ['files', 'processing', 'utility'],
        capabilities: ['tools', 'resources'],
        author: 'Utils Team',
      },
    ];
  }

  /**
   * Applies tag-based filtering to server list
   * @param servers List of servers to filter
   * @param query Query parameters
   * @returns Filtered server list
   */
  private applyFilters(servers: RegistryServer[], query: RegistryServersQuery): RegistryServer[] {
    let filteredServers = [...servers];

    // Filter by tags if specified
    if (query.tags && query.tags.length > 0) {
      filteredServers = filteredServers.filter(server =>
        query.tags!.some(tag => server.tags.includes(tag))
      );
    }

    return filteredServers;
  }

  /**
   * Applies pagination to server list
   * @param servers List of servers to paginate
   * @param query Query parameters
   * @returns Paginated result
   */
  private applyPagination(servers: RegistryServer[], query: RegistryServersQuery): { servers: RegistryServer[] } {
    const limit = Math.min(query.limit || 50, 100); // Max 100 per page
    const offset = Math.max(query.offset || 0, 0);

    const paginatedServers = servers.slice(offset, offset + limit);

    return { servers: paginatedServers };
  }

  /**
   * Fetches deployed servers from a registry source
   * @param registryId The registry identifier
   * @param query Optional query parameters for filtering and pagination
   * @returns Promise resolving to deployed servers response
   */
  async getDeployedServers(registryId: string, query: RegistryServersQuery = {}): Promise<RegistryServersResponse> {
    try {
      const deployedServers = await this.fetchDeployedServersFromRegistry(registryId, query);

      // Apply filtering and pagination
      const filteredServers = this.applyFilters(deployedServers, query);
      const paginatedResult = this.applyPagination(filteredServers, query);

      return {
        servers: paginatedResult.servers,
        total: filteredServers.length,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };
    } catch (error) {
      throw new Error(`Failed to fetch deployed servers for registry ${registryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches deployed servers from the actual registry source
   * @param registryId The registry identifier
   * @param query Query parameters
   * @returns Promise resolving to raw deployed server list
   */
  private async fetchDeployedServersFromRegistry(registryId: string, query: RegistryServersQuery): Promise<RegistryServer[]> {
    try {
      // Get registry details to find the URL
      const registry = await this.getRegistryDetails(registryId);

      if (!registry.url) {
        console.warn(`Registry ${registryId} has no URL configured, returning empty deployed servers list`);
        return [];
      }

      // Check if this is a cluster-internal URL and use Kubernetes API proxy
      if (registry.url.includes('.svc.cluster.local')) {
        console.log(`Using Kubernetes API proxy for deployed servers from: ${registry.url}`);
        return await this.fetchDeployedServersViaK8sProxy(registryId, registry.url, query);
      }

      // Try to fetch from the registry's /v0/servers/deployed endpoint directly
      const registryUrl = registry.url.endsWith('/') ? registry.url.slice(0, -1) : registry.url;
      const deployedEndpoint = `${registryUrl}/v0/servers/deployed`;

      console.log(`Fetching deployed servers from registry API: ${deployedEndpoint}`);

      const response = await fetch(deployedEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ToolHive-Registry-UI/1.0.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Registry API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform registry response to our format
      const servers = this.transformRegistryResponse(data);
      return servers.map(server => this.validateServerData(server));

    } catch (error) {
      console.warn(`Failed to fetch deployed servers from registry ${registryId}:`, error);
      return []; // Return empty array instead of fallback mock data for deployed servers
    }
  }

  /**
   * Fetches deployed servers from a cluster-internal registry using Kubernetes API proxy
   * @param registryId The registry identifier
   * @param clusterUrl The cluster-internal URL
   * @param query Query parameters
   * @returns Promise resolving to raw deployed server list
   */
  private async fetchDeployedServersViaK8sProxy(registryId: string, clusterUrl: string, query: RegistryServersQuery): Promise<RegistryServer[]> {
    try {
      // Import here to avoid circular dependencies
      const { KubernetesClient } = await import('./KubernetesClient');
      const k8sClient = new KubernetesClient();

      // Parse the cluster URL to extract service info
      // Format: http://service-name.namespace.svc.cluster.local:port
      const urlMatch = clusterUrl.match(/^https?:\/\/([^.]+)\.([^.]+)\.svc\.cluster\.local:?(\d+)?/);
      if (!urlMatch) {
        throw new Error(`Invalid cluster URL format: ${clusterUrl}`);
      }

      const [, serviceName, namespace, port] = urlMatch;
      const servicePort = port || '8080';

      console.log(`Proxying deployed servers to service: ${serviceName} in namespace: ${namespace} on port: ${servicePort}`);

      // Use Kubernetes API to proxy the request to the service
      const data = await k8sClient.proxyServiceRequest(namespace, serviceName, servicePort, '/v0/servers/deployed');

      // Transform registry response to our format
      const servers = this.transformRegistryResponse(data);
      return servers.map(server => this.validateServerData(server));

    } catch (error) {
      console.warn(`Failed to fetch deployed servers via Kubernetes proxy for registry ${registryId}:`, error);
      return []; // Return empty array for deployed servers
    }
  }

  /**
   * Refreshes server cache for a registry (if caching is implemented)
   * @param registryId The registry identifier
   * @returns Promise that resolves when refresh is complete
   */
  async refreshServerCache(registryId: string): Promise<void> {
    // TODO: Implement cache refresh logic
    // This would involve:
    // 1. Clearing cached server data for the registry
    // 2. Fetching fresh data from registry API
    // 3. Updating cache with new data
    console.log(`Refreshing server cache for registry: ${registryId}`);
  }

  /**
   * Fetches a specific deployed server from a registry
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns Promise resolving to the deployed server or null if not found
   */
  async getDeployedServerByName(registryId: string, serverName: string): Promise<RegistryServer | null> {
    try {
      const response = await this.getDeployedServers(registryId);
      return response.servers.find(server => server.name === serverName) || null;
    } catch (error) {
      throw new Error(`Failed to fetch deployed server ${serverName} from registry ${registryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets server statistics for a registry
   * @param registryId The registry identifier
   * @returns Promise resolving to server statistics
   */
  async getServerStats(registryId: string): Promise<{ total: number; byTag: Record<string, number> }> {
    try {
      const response = await this.getAvailableServers(registryId);
      const tagCounts: Record<string, number> = {};

      response.servers.forEach(server => {
        server.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return {
        total: response.total,
        byTag: tagCounts,
      };
    } catch (error) {
      throw new Error(`Failed to get server stats for registry ${registryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches a specific server from the actual registry source
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns Promise resolving to the server with enhanced details or null if not found
   */
  private async fetchServerByNameFromRegistry(registryId: string, serverName: string): Promise<RegistryServer | null> {
    try {
      // Get registry details to find the URL
      const registry = await this.getRegistryDetails(registryId);

      if (!registry.url) {
        console.warn(`Registry ${registryId} has no URL configured, falling back to list search`);
        const response = await this.getAvailableServers(registryId);
        return response.servers.find(server => server.name === serverName) || null;
      }

      // Check if this is a cluster-internal URL and use Kubernetes API proxy
      if (registry.url.includes('.svc.cluster.local')) {
        console.log(`Using Kubernetes API proxy for individual server from: ${registry.url}`);
        return await this.fetchServerByNameViaK8sProxy(registryId, registry.url, serverName);
      }

      // Try to fetch from the registry's /v0/servers/{name} endpoint directly
      const registryUrl = registry.url.endsWith('/') ? registry.url.slice(0, -1) : registry.url;
      const serverEndpoint = `${registryUrl}/v0/servers/${serverName}`;

      console.log(`Fetching individual server from registry API: ${serverEndpoint}`);

      const response = await fetch(serverEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ToolHive-Registry-UI/1.0.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Server not found
        }
        throw new Error(`Registry API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform and validate individual server response
      const transformedServer = this.transformIndividualServerResponse(data);
      return this.validateServerData(transformedServer);

    } catch (error) {
      console.warn(`Failed to fetch individual server ${serverName} from registry ${registryId}:`, error);
      // Fallback to list search
      const response = await this.getAvailableServers(registryId);
      return response.servers.find(server => server.name === serverName) || null;
    }
  }

  /**
   * Fetches a specific server from a cluster-internal registry using Kubernetes API proxy
   * @param registryId The registry identifier
   * @param clusterUrl The cluster-internal URL
   * @param serverName The server name
   * @returns Promise resolving to the server with enhanced details or null if not found
   */
  private async fetchServerByNameViaK8sProxy(registryId: string, clusterUrl: string, serverName: string): Promise<RegistryServer | null> {
    try {
      // Import here to avoid circular dependencies
      const { KubernetesClient } = await import('./KubernetesClient');
      const k8sClient = new KubernetesClient();

      // Parse the cluster URL to extract service info
      // Format: http://service-name.namespace.svc.cluster.local:port
      const urlMatch = clusterUrl.match(/^https?:\/\/([^.]+)\.([^.]+)\.svc\.cluster\.local:?(\d+)?/);
      if (!urlMatch) {
        throw new Error(`Invalid cluster URL format: ${clusterUrl}`);
      }

      const [, serviceName, namespace, port] = urlMatch;
      const servicePort = port || '8080';

      console.log(`Proxying individual server to service: ${serviceName} in namespace: ${namespace} on port: ${servicePort}`);

      // Use Kubernetes API to proxy the request to the service
      const data = await k8sClient.proxyServiceRequest(namespace, serviceName, servicePort, `/v0/servers/${serverName}`);

      // Transform and validate individual server response
      const transformedServer = this.transformIndividualServerResponse(data);
      return this.validateServerData(transformedServer);

    } catch (error) {
      console.warn(`Failed to fetch individual server ${serverName} via Kubernetes proxy for registry ${registryId}:`, error);
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Server not found
      }
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Transform individual server API response to our RegistryServer format
   * This handles the enhanced data structure returned by /v0/servers/{name} endpoints
   */
  private transformIndividualServerResponse(data: any): RegistryServer {
    return {
      name: data.name || data.id,
      image: data.image || `${data.name}:latest`,
      version: data.version,
      description: data.description || data.summary || `${data.status || 'Unknown'} server`,
      tags: data.tags || data.keywords || (data.status && data.status !== 'Active' ? [data.status.toLowerCase()] : []),
      capabilities: data.capabilities || [],
      author: data.author || data.maintainer,
      repository: data.repository || data.source,
      documentation: data.documentation || data.docs,
      // Additional fields for enhanced UI
      tier: data.tier,
      transport: data.transport,
      tools: data.tools || [],
      status: data.status,
      endpoint_url: data.endpoint_url,
      ready: data.ready,
      namespace: data.namespace,
      // Enhanced fields from individual server endpoint
      env_vars: data.env_vars || [],
      metadata: data.metadata || null,
      repository_url: data.repository_url,
    };
  }
}