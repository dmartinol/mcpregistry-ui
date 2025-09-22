// API service for connecting frontend to backend endpoints

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

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
  async getRegistries(): Promise<Registry[]> {
    return fetchWithErrorHandling(`${API_BASE_URL}/registries`);
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
  async deleteDeployedServer(serverId: string): Promise<void> {
    await fetchWithErrorHandling(`${API_BASE_URL}/servers/${serverId}`, {
      method: 'DELETE',
    });
  },

  async restartDeployedServer(serverId: string): Promise<void> {
    await fetchWithErrorHandling(`${API_BASE_URL}/servers/${serverId}/restart`, {
      method: 'POST',
    });
  },
};

export { ApiError };
export type { Registry, RegistryServer, DeployedServer, RegistryServersResponse, DeployedServersResponse };