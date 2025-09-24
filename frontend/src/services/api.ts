// API service for connecting frontend to backend endpoints

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface RegistryServer {
  name: string;
  image: string;
  version?: string;
  description?: string;
  tags: string[];
  capabilities?: string[];
  author?: string;
  repository?: string;
  documentation?: string;
}

interface DeployedServer {
  id: string;
  name: string;
  registryRef: string;
  image: string;
  version?: string;
  status: 'Pending' | 'Running' | 'Failed' | 'Terminating';
  endpoint?: string;
  createdAt: string;
  lastUpdated: string;
  namespace: string;
  uid: string;
}

interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: string;
  serverCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RegistryServersResponse {
  servers: RegistryServer[];
  total: number;
  limit: number;
  offset: number;
}

interface DeployedServersResponse {
  servers: DeployedServer[];
  total: number;
}

interface DeploymentConfig {
  name: string;
  image: string;
  transport: string; // Keep original server transport (stdio, http, streamable-http, sse, etc.)
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
  proxyMode?: 'sse' | 'streamable-http';
}

interface DeploymentResponse {
  status: string;
  message: string;
  server: any;
  manifest: string;
}

interface OrphanedServer {
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

interface OrphanedServersResponse {
  servers: OrphanedServer[];
  total: number;
  namespace: string;
}

interface ConnectToRegistryRequest {
  registryName: string;
  registryNamespace: string;
  serverNameInRegistry: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithErrorHandling(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

export const api = {
  // Registry management
  async getRegistries(namespace?: string): Promise<Registry[]> {
    let url = `${API_BASE_URL}/registries`;
    if (namespace) {
      const params = new URLSearchParams({ namespace });
      url += `?${params.toString()}`;
    }
    const response = await fetchWithErrorHandling(url);

    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new ApiError(0, 'Invalid API response format');
    }

    if (!Array.isArray(response.registries)) {
      console.warn('API response does not contain a registries array:', response);
      return [];
    }

    return response.registries;
  },

  async getRegistryDetails(registryId: string): Promise<Registry> {
    return fetchWithErrorHandling(`${API_BASE_URL}/registries/${registryId}`);
  },

  // Registry servers (available)
  async getRegistryServers(
    registryId: string,
    params?: { tags?: string[]; limit?: number; offset?: number }
  ): Promise<RegistryServersResponse> {
    const url = new URL(`${API_BASE_URL}/registries/${registryId}/servers`);

    if (params?.tags) {
      params.tags.forEach(tag => url.searchParams.append('tags', tag));
    }
    if (params?.limit) {
      url.searchParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      url.searchParams.set('offset', params.offset.toString());
    }

    return fetchWithErrorHandling(url.toString());
  },

  // Deployed servers
  async getDeployedServers(
    registryId: string,
    params?: { status?: string; namespace?: string }
  ): Promise<DeployedServersResponse> {
    const url = new URL(`${API_BASE_URL}/registries/${registryId}/deployed-servers`);

    if (params?.status) {
      url.searchParams.set('status', params.status);
    }
    if (params?.namespace) {
      url.searchParams.set('namespace', params.namespace);
    }

    return fetchWithErrorHandling(url.toString());
  },

  // Server management
  async getDeployedServerById(serverId: string): Promise<DeployedServer> {
    return fetchWithErrorHandling(`${API_BASE_URL}/servers/${serverId}`);
  },

  async getServerLogs(serverId: string, lines?: number): Promise<string[]> {
    const url = new URL(`${API_BASE_URL}/servers/${serverId}/logs`);
    if (lines) {
      url.searchParams.set('lines', lines.toString());
    }
    return fetchWithErrorHandling(url.toString());
  },

  async getServerMetrics(serverId: string): Promise<Record<string, any>> {
    return fetchWithErrorHandling(`${API_BASE_URL}/servers/${serverId}/metrics`);
  },

  // Deployment operations
  async deleteDeployedServer(serverId: string, namespace?: string): Promise<void> {
    let url = `${API_BASE_URL}/servers/${serverId}`;
    if (namespace) {
      url += `?namespace=${encodeURIComponent(namespace)}`;
    }

    await fetchWithErrorHandling(url, {
      method: 'DELETE',
    });
  },

  async restartDeployedServer(serverId: string): Promise<void> {
    await fetchWithErrorHandling(`${API_BASE_URL}/servers/${serverId}/restart`, {
      method: 'POST',
    });
  },

  // Deploy server
  async deployServer(
    registryId: string,
    serverName: string,
    config: DeploymentConfig
  ): Promise<DeploymentResponse> {
    return fetchWithErrorHandling(
      `${API_BASE_URL}/registries/${registryId}/servers/${serverName}/deploy`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    );
  },

  // Orphaned servers
  async getOrphanedServers(namespace?: string): Promise<OrphanedServersResponse> {
    let url = `${API_BASE_URL}/orphaned-servers`;
    if (namespace) {
      url += `?namespace=${encodeURIComponent(namespace)}`;
    }
    return fetchWithErrorHandling(url);
  },

  async connectServerToRegistry(
    serverId: string,
    request: ConnectToRegistryRequest,
    namespace?: string
  ): Promise<{ status: string; message: string; server: any }> {
    let url = `${API_BASE_URL}/orphaned-servers/${serverId}/connect`;
    if (namespace) {
      url += `?namespace=${encodeURIComponent(namespace)}`;
    }
    return fetchWithErrorHandling(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Manifest operations
  async getServerManifest(registryId: string, serverName: string): Promise<object> {
    return fetchWithErrorHandling(
      `${API_BASE_URL}/registries/${registryId}/servers/${serverName}/manifest`
    );
  },

  async getDeployedServerManifest(registryId: string, serverName: string): Promise<object> {
    return fetchWithErrorHandling(
      `${API_BASE_URL}/registries/${registryId}/servers/deployed/${serverName}/manifest`
    );
  },

  async getOrphanedServerManifest(serverName: string, namespace?: string): Promise<object> {
    let url = `${API_BASE_URL}/orphaned-servers/${serverName}/manifest`;
    if (namespace) {
      url += `?namespace=${encodeURIComponent(namespace)}`;
    }
    return fetchWithErrorHandling(url);
  },

  async getRegistryManifest(registryId: string): Promise<object> {
    return fetchWithErrorHandling(
      `${API_BASE_URL}/registries/${registryId}/manifest`
    );
  },

  async getConfigMapManifest(registryId: string, configMapName: string, namespace: string = 'toolhive-system'): Promise<object> {
    return fetchWithErrorHandling(
      `${API_BASE_URL}/registries/${registryId}/configmap/${configMapName}/manifest?namespace=${namespace}`
    );
  },
};

export { ApiError };
export type {
  Registry,
  RegistryServer,
  DeployedServer,
  RegistryServersResponse,
  DeployedServersResponse,
  DeploymentConfig,
  DeploymentResponse,
  OrphanedServer,
  OrphanedServersResponse,
  ConnectToRegistryRequest
};