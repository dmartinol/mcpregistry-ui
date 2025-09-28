import * as k8s from '@kubernetes/client-node';

export interface ConfigMapInfo {
  name: string;
  namespace: string;
  keys: string[];
  createdAt: Date;
}

export class ConfigMapService {
  private coreV1Api: k8s.CoreV1Api;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * List all ConfigMaps in a given namespace
   */
  async getConfigMaps(namespace: string = 'toolhive-system'): Promise<ConfigMapInfo[]> {
    try {
      console.log(`Fetching ConfigMaps from namespace: ${namespace}`);

      const response = await this.coreV1Api.listNamespacedConfigMap(namespace);
      const configMaps = response.body.items;

      console.log(`Found ${configMaps.length} ConfigMaps in namespace ${namespace}`);

      return configMaps.map(cm => ({
        name: cm.metadata?.name || '',
        namespace: cm.metadata?.namespace || namespace,
        keys: cm.data ? Object.keys(cm.data) : [],
        createdAt: new Date(cm.metadata?.creationTimestamp || Date.now()),
      }));
    } catch (error) {
      console.error(`Error fetching ConfigMaps from namespace ${namespace}:`, error);

      if (error instanceof Error) {
        // Handle specific Kubernetes API errors
        if (error.message.includes('Forbidden')) {
          throw new Error(`Access denied to ConfigMaps in namespace ${namespace}. Check RBAC permissions.`);
        }
        if (error.message.includes('NotFound')) {
          throw new Error(`Namespace ${namespace} not found.`);
        }
      }

      throw new Error(`Failed to fetch ConfigMaps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get keys for a specific ConfigMap
   */
  async getConfigMapKeys(name: string, namespace: string = 'toolhive-system'): Promise<string[]> {
    try {
      console.log(`Fetching keys for ConfigMap ${name} in namespace ${namespace}`);

      const response = await this.coreV1Api.readNamespacedConfigMap(name, namespace);
      const configMap = response.body;

      const keys = configMap.data ? Object.keys(configMap.data) : [];
      console.log(`ConfigMap ${name} has keys:`, keys);

      return keys;
    } catch (error) {
      console.error(`Error fetching ConfigMap ${name} keys:`, error);

      if (error instanceof Error) {
        if (error.message.includes('NotFound')) {
          throw new Error(`ConfigMap ${name} not found in namespace ${namespace}.`);
        }
        if (error.message.includes('Forbidden')) {
          throw new Error(`Access denied to ConfigMap ${name} in namespace ${namespace}.`);
        }
      }

      throw new Error(`Failed to fetch ConfigMap keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that a ConfigMap and key exist
   */
  async validateConfigMapKey(name: string, key: string, namespace: string = 'toolhive-system'): Promise<boolean> {
    try {
      const keys = await this.getConfigMapKeys(name, namespace);
      return keys.includes(key);
    } catch (error) {
      console.error(`Error validating ConfigMap ${name} key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get ConfigMap data for a specific key
   */
  async getConfigMapData(name: string, key: string, namespace: string = 'toolhive-system'): Promise<string | null> {
    try {
      console.log(`Fetching data for ConfigMap ${name}, key ${key} in namespace ${namespace}`);

      const response = await this.coreV1Api.readNamespacedConfigMap(name, namespace);
      const configMap = response.body;

      if (!configMap.data || !configMap.data[key]) {
        console.warn(`Key ${key} not found in ConfigMap ${name}`);
        return null;
      }

      return configMap.data[key];
    } catch (error) {
      console.error(`Error fetching ConfigMap ${name} data for key ${key}:`, error);
      throw new Error(`Failed to fetch ConfigMap data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}