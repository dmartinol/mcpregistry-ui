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

    return servers.map((server: any) => {
      // Debug chroma-mcp specifically
      if (server.name === 'chroma-mcp') {
        console.log('🔍 [CHROMA DEBUG] Raw server data:', JSON.stringify(server, null, 2));
      }
      const transformedServer = {
        name: server.name || server.id,
        image: server.image || `${server.name}:latest`,
        version: server.version,
        description: server.description || server.summary || `${server.status || 'Unknown'} server`,
        tags: server.tags || server.keywords || [],
      capabilities: server.capabilities || [],
      author: server.author || server.maintainer,
      repository: server.repository || server.source,
      documentation: server.documentation || server.docs,
      // Additional fields for enhanced UI
      tier: server.tier,
      transport: server.transport,
      tools: server.tools || [],
      tools_count: server.tools_count,
      status: server.status,
      endpoint_url: server.endpoint_url,
      ready: server.ready,
      namespace: server.namespace,
      // Enhanced fields from individual server endpoint
      env_vars: server.env_vars || [],
      metadata: server.metadata,
      repository_url: server.repository_url,
    };

      // Debug chroma-mcp specifically - log the transformed result
      if (transformedServer.name === 'chroma-mcp') {
        console.log('🔍 [CHROMA DEBUG] Transformed tags:', transformedServer.tags);
      }

      return transformedServer;
    });
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
      // Deployed servers are Kubernetes MCPServer resources, not stored in the registry
      // We need to fetch them directly from Kubernetes API
      const { KubernetesClient } = await import('./KubernetesClient');
      const k8sClient = new KubernetesClient();

      // For deployed servers, use the same namespace as the registry service
      // Default to toolhive-system for now
      const targetNamespace = 'toolhive-system';

      console.log(`Fetching deployed MCPServer resources from namespace: ${targetNamespace}`);

      // Fetch all MCPServer resources from the namespace
      const allMCPServers = await k8sClient.getAllMCPServers(targetNamespace);

      // Filter for deployed servers (those that have registry labels - opposite of orphaned)
      const deployedMCPServers = allMCPServers.filter((server: any) => {
        const labels = server.metadata?.labels || {};
        const hasRegistryName = labels['toolhive.stacklok.io/registry-name'];
        const hasRegistryNamespace = labels['toolhive.stacklok.io/registry-namespace'];
        const hasServerName = labels['toolhive.stacklok.io/server-name'];

        // Server is deployed if it has all required registry labels
        return hasRegistryName && hasRegistryNamespace && hasServerName;
      });

      // Transform MCPServer resources to our RegistryServer format
      const deployedServers = deployedMCPServers.map((mcpServer: any) => {
        const spec = mcpServer.spec || {};
        const status = mcpServer.status || {};
        const metadata = mcpServer.metadata || {};

        return {
          name: metadata.name || 'unknown',
          image: spec.image || 'unknown',
          version: spec.version,
          description: spec.description || `Deployed MCP server`,
          tags: ['deployed', ...(spec.tags || [])],
          capabilities: spec.capabilities || [],
          author: spec.author,
          repository: spec.repository,
          documentation: spec.documentation,
          tier: spec.tier,
          transport: spec.transport || 'http',
          tools: spec.tools || [],
          tools_count: spec.tools?.length || 0,
          status: status.phase || 'Unknown',
          endpoint_url: status.url || this.buildEndpointUrl(metadata.name, targetNamespace, spec.port),
          ready: status.phase === 'Running',
          namespace: targetNamespace,
          env_vars: spec.env || [],
          metadata: {
            last_updated: metadata.creationTimestamp,
            uid: metadata.uid,
          },
          repository_url: spec.repository,
        };
      });

      console.log(`Found ${deployedServers.length} deployed servers in namespace ${targetNamespace}`);
      return deployedServers;

    } catch (error) {
      console.warn(`Failed to fetch deployed servers from registry ${registryId}:`, error);
      return []; // Return empty array instead of fallback mock data for deployed servers
    }
  }

  /**
   * Build endpoint URL for a deployed MCPServer
   */
  private buildEndpointUrl(serverName: string, namespace: string, port?: number): string {
    const defaultPort = port || 8080;
    return `http://mcp-${serverName}-proxy.${namespace}.svc.cluster.local:${defaultPort}`;
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
      const server = response.servers.find(server => server.name === serverName);


      if (server) {
        // Fix tools_count vs tools mismatch
        if (server.tools_count && server.tools_count > 0 && (!server.tools || server.tools.length === 0)) {
          console.log(`Generating placeholder tools for server ${serverName} (${server.tools_count} tools)`);
          server.tools = Array.from({ length: server.tools_count }, (_, i) => `Available Tool ${i + 1}`);
        }

        // Ensure env_vars is preserved - if it's missing from fallback, try to fetch from raw data
        if (!server.env_vars || server.env_vars.length === 0) {
          try {
            const rawServerData = await this.fetchRawServerDataFromRegistry(registryId, serverName);
            if (rawServerData && (rawServerData as any).env_vars) {
              server.env_vars = (rawServerData as any).env_vars;
            }
          } catch (error) {
            console.warn(`Failed to fetch raw server data for env_vars: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Ensure tags are preserved - if they're missing from fallback, try to fetch from raw data
        if (!server.tags || server.tags.length === 0) {
          try {
            const rawServerData = await this.fetchRawServerDataFromRegistry(registryId, serverName);
            if (rawServerData && ((rawServerData as any).tags || (rawServerData as any).keywords)) {
              server.tags = (rawServerData as any).tags || (rawServerData as any).keywords || [];
              console.log(`🔍 [CHROMA DEBUG] Restored tags from raw data for ${serverName}:`, server.tags);
            }
          } catch (error) {
            console.warn(`Failed to fetch raw server data for tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Ensure metadata is preserved - if it's missing from fallback, try to fetch from raw data
        if (!server.metadata || (!server.metadata.stars && !server.metadata.pulls && !server.metadata.last_updated)) {
          try {
            const rawServerData = await this.fetchRawServerDataFromRegistry(registryId, serverName);
            if (rawServerData && (rawServerData as any).metadata) {
              server.metadata = (rawServerData as any).metadata;
              console.log(`🔍 [METADATA DEBUG] Restored metadata from raw data for ${serverName}:`, server.metadata);
            }
          } catch (error) {
            console.warn(`Failed to fetch raw server data for metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return server || null;
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
    // Debug chroma-mcp specifically in individual transformation
    if (data.name === 'chroma-mcp') {
      console.log('🔍 [CHROMA DEBUG] Individual raw data:', JSON.stringify(data, null, 2));
    }

    const result = {
      name: data.name || data.id,
      image: data.image || `${data.name}:latest`,
      version: data.version,
      description: data.description || data.summary || `${data.status || 'Unknown'} server`,
      tags: data.tags || data.keywords || [],
      capabilities: data.capabilities || [],
      author: data.author || data.maintainer,
      repository: data.repository || data.source,
      documentation: data.documentation || data.docs,
      // Additional fields for enhanced UI
      tier: data.tier,
      transport: data.transport,
      tools: data.tools || [],
      tools_count: data.tools_count,
      status: data.status,
      endpoint_url: data.endpoint_url,
      ready: data.ready,
      namespace: data.namespace,
      // Enhanced fields from individual server endpoint
      env_vars: data.env_vars || [],
      metadata: data.metadata || null,
      repository_url: data.repository_url,
    };

    // Debug chroma-mcp specifically in individual transformation
    if (result.name === 'chroma-mcp') {
      console.log('🔍 [CHROMA DEBUG] Individual transformed tags:', result.tags);
    }

    return result;
  }

  /**
   * Fetches the manifest for a specific server from a registry
   * For available servers, this returns the raw server data from the registry API
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns Promise resolving to the raw server data from registry or null if not found
   */
  async getServerManifest(registryId: string, serverName: string): Promise<object | null> {
    try {
      // For available servers, we want to show the raw registry server data,
      // not a fake MCPServer manifest. First try to get the raw server data.
      const serverData = await this.fetchRawServerDataFromRegistry(registryId, serverName);

      if (serverData) {
        return serverData;
      }

      // If no raw server data found, return null
      console.warn(`Server data not found for ${serverName} in registry ${registryId}`);
      return null;

    } catch (error) {
      console.warn(`Failed to fetch server data for ${serverName} from registry ${registryId}:`, error);
      return null;
    }
  }

  /**
   * Fetches a server manifest from a cluster-internal registry using Kubernetes API proxy
   * @param registryId The registry identifier
   * @param clusterUrl The cluster-internal URL
   * @param serverName The server name
   * @returns Promise resolving to the server manifest or null if not found
   */
  private async fetchServerManifestViaK8sProxy(registryId: string, clusterUrl: string, serverName: string): Promise<object | null> {
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

      console.log(`Proxying server manifest to service: ${serviceName} in namespace: ${namespace} on port: ${servicePort}`);

      // Use Kubernetes API to proxy the request to the service
      const manifest = await k8sClient.proxyServiceRequest(namespace, serviceName, servicePort, `/v0/servers/${serverName}/manifest`);
      return manifest;

    } catch (error) {
      console.warn(`Failed to fetch server manifest for ${serverName} via Kubernetes proxy for registry ${registryId}:`, error);
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Manifest not found
      }
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Fetches raw server data from the registry API without transformation
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns Promise resolving to raw server data from registry or null if not found
   */
  private async fetchRawServerDataFromRegistry(registryId: string, serverName: string): Promise<object | null> {
    try {
      // Get registry details to find the URL
      const registry = await this.getRegistryDetails(registryId);

      if (!registry.url) {
        console.warn(`Registry ${registryId} has no URL configured, cannot fetch raw server data`);
        return null;
      }

      // Check if this is a cluster-internal URL and use Kubernetes API proxy
      if (registry.url.includes('.svc.cluster.local')) {
        console.log(`Using Kubernetes API proxy for raw server data from: ${registry.url}`);
        return await this.fetchRawServerDataViaK8sProxy(registryId, registry.url, serverName);
      }

      // Try to fetch from the registry's /v0/servers/{name} endpoint directly
      const registryUrl = registry.url.endsWith('/') ? registry.url.slice(0, -1) : registry.url;
      const serverEndpoint = `${registryUrl}/v0/servers/${serverName}`;

      console.log(`Fetching raw server data from registry API: ${serverEndpoint}`);

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
      return data; // Return raw data without any transformation

    } catch (error) {
      console.warn(`Failed to fetch raw server data for ${serverName} from registry ${registryId}:`, error);
      return null;
    }
  }

  /**
   * Fetches raw server data from a cluster-internal registry using Kubernetes API proxy
   * @param registryId The registry identifier
   * @param clusterUrl The cluster-internal URL
   * @param serverName The server name
   * @returns Promise resolving to raw server data or null if not found
   */
  private async fetchRawServerDataViaK8sProxy(registryId: string, clusterUrl: string, serverName: string): Promise<object | null> {
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

      console.log(`Proxying raw server data to service: ${serviceName} in namespace: ${namespace} on port: ${servicePort}`);

      // Use Kubernetes API to proxy the request to the service
      const data = await k8sClient.proxyServiceRequest(namespace, serviceName, servicePort, `/v0/servers/${serverName}`);
      return data; // Return raw data without any transformation

    } catch (error) {
      console.warn(`Failed to fetch raw server data for ${serverName} via Kubernetes proxy for registry ${registryId}:`, error);
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Server not found
      }
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Generates a fallback manifest for a server when the registry doesn't provide one
   * @param registryId The registry identifier
   * @param serverName The server name
   * @returns A basic server manifest
   */
  private async generateFallbackManifest(registryId: string, serverName: string): Promise<object | null> {
    try {
      // Try to get basic server info
      const server = await this.getServerByName(registryId, serverName);
      if (!server) {
        return null;
      }

      // Generate a basic MCPServer manifest based on the server info
      return {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: serverName,
          namespace: 'default',
          labels: {
            'app.kubernetes.io/name': serverName,
            'app.kubernetes.io/component': 'mcp-server',
            'toolhive.stacklok.io/registry-name': registryId,
          },
        },
        spec: {
          image: server.image,
          transport: server.transport || 'streamable-http',
          targetPort: 8080,
          port: 8080,
          permissionProfile: {
            type: 'builtin',
            name: 'default',
          },
          resources: {
            limits: {
              cpu: '500m',
              memory: '512Mi',
            },
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
          },
          ...(server.env_vars && server.env_vars.length > 0 && {
            env: server.env_vars.map((envVar: any) => ({
              name: envVar.name,
              value: envVar.value || envVar.defaultValue || '',
            })),
          }),
        },
      };
    } catch (error) {
      console.warn(`Failed to generate fallback manifest for ${serverName}:`, error);
      return null;
    }
  }
}