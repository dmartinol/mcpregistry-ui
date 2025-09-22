import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  serverCount: number;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryListResponse {
  registries: Registry[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateRegistryRequest {
  name: string;
  url: string;
  description?: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Request interceptor for auth tokens (if needed)
    this.client.interceptors.request.use(
      config => {
        // Add auth headers here if needed
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        throw new Error(error.message || 'Network error');
      }
    );
  }

  // Registry endpoints
  async getRegistries(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<RegistryListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response: AxiosResponse<RegistryListResponse> = await this.client.get(
      `/registries?${params.toString()}`
    );
    return response.data;
  }

  async getRegistry(id: string): Promise<Registry> {
    const response: AxiosResponse<Registry> = await this.client.get(`/registries/${id}`);
    return response.data;
  }

  async createRegistry(data: CreateRegistryRequest): Promise<Registry> {
    const response: AxiosResponse<Registry> = await this.client.post('/registries', data);
    return response.data;
  }

  async updateRegistry(id: string, data: Partial<CreateRegistryRequest>): Promise<Registry> {
    const response: AxiosResponse<Registry> = await this.client.put(`/registries/${id}`, data);
    return response.data;
  }

  async deleteRegistry(id: string): Promise<void> {
    await this.client.delete(`/registries/${id}`);
  }

  async syncRegistry(id: string): Promise<{ syncId: string; status: string }> {
    const response: AxiosResponse<{ syncId: string; status: string }> = await this.client.post(
      `/registries/${id}/sync`
    );
    return response.data;
  }

  // Server endpoints (placeholder)
  async getServers(registryId: string): Promise<any[]> {
    const response = await this.client.get(`/registries/${registryId}/servers`);
    return response.data.servers || [];
  }

  // Instance endpoints (placeholder)
  async getInstances(): Promise<any[]> {
    const response = await this.client.get('/instances');
    return response.data.instances || [];
  }

  async deployInstance(serverId: string, config: any): Promise<any> {
    const response = await this.client.post(`/servers/${serverId}/deploy`, config);
    return response.data;
  }
}