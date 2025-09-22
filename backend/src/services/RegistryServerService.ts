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
      const response = await this.getAvailableServers(registryId);
      return response.servers.find(server => server.name === serverName) || null;
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
      description: server.description || server.summary,
      tags: server.tags || server.keywords || [],
      capabilities: server.capabilities || [],
      author: server.author || server.maintainer,
      repository: server.repository || server.source,
      documentation: server.documentation || server.docs,
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
}