import { Router, Request, Response } from 'express';
import { ConfigMapService } from '../services/ConfigMapService';
import { GitValidationService } from '../services/GitValidationService';

const router = Router();
const configMapService = new ConfigMapService();
const gitValidationService = new GitValidationService();

// GET /api/v1/configmaps - List ConfigMaps in a namespace
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const namespace = req.query.namespace as string || 'toolhive-system';

    console.log(`Fetching ConfigMaps for namespace: ${namespace}`);

    const configMaps = await configMapService.getConfigMaps(namespace);

    res.json({ configMaps });
  } catch (error) {
    console.error('Error fetching ConfigMaps:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch ConfigMaps'
    });
  }
});

// GET /api/v1/configmaps/:namespace/:name/keys - Get keys for a specific ConfigMap
router.get('/:namespace/:name/keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const { namespace, name } = req.params;

    console.log(`Fetching keys for ConfigMap ${name} in namespace ${namespace}`);

    const keys = await configMapService.getConfigMapKeys(name, namespace);

    res.json({ keys });
  } catch (error) {
    console.error(`Error fetching ConfigMap ${req.params.name} keys:`, error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch ConfigMap keys'
      });
    }
  }
});

// POST /api/v1/configmaps/validate - Validate ConfigMap and key exist
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, key, namespace = 'toolhive-system' } = req.body;

    if (!name || !key) {
      res.status(400).json({ error: 'ConfigMap name and key are required' });
      return;
    }

    console.log(`Validating ConfigMap ${name}, key ${key} in namespace ${namespace}`);

    const isValid = await configMapService.validateConfigMapKey(name, key, namespace);

    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error validating ConfigMap:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to validate ConfigMap'
    });
  }
});

// POST /api/v1/git/validate - Validate Git repository URL
router.post('/git/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repository, branch, path } = req.body;

    if (!repository) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    console.log(`Validating Git repository: ${repository}, branch: ${branch}, path: ${path}`);

    const result = await gitValidationService.validateGitSource(repository, branch, path);

    res.json(result);
  } catch (error) {
    console.error('Error validating Git repository:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to validate Git repository'
    });
  }
});

// GET /api/v1/git/branches - Get branches for a Git repository
router.post('/git/branches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repository, search } = req.body;

    if (!repository) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    console.log(`Fetching branches for repository: ${repository}, search: ${search || 'none'}`);

    const branches = await gitValidationService.getRepositoryBranches(repository, search);

    res.json({ branches });
  } catch (error) {
    console.error('Error fetching Git branches:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch Git branches'
    });
  }
});

// POST /api/v1/git/validate-file - Validate specific file in Git repository
router.post('/git/validate-file', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repository, branch = 'main', path } = req.body;

    if (!repository || !path) {
      res.status(400).json({ error: 'Repository URL and file path are required' });
      return;
    }

    console.log(`Validating file: ${path} in ${repository}:${branch}`);

    const result = await gitValidationService.validateFilePath(repository, path, branch);

    res.json(result);
  } catch (error) {
    console.error('Error validating Git file:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to validate Git file'
    });
  }
});

// POST /api/v1/data-sources/tags - Get available tags from a data source
router.post('/data-sources/tags', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, configmap, git } = req.body;

    if (!type || (type !== 'configmap' && type !== 'git')) {
      res.status(400).json({ error: 'Data source type is required (configmap or git)' });
      return;
    }

    let tags: string[] = [];

    if (type === 'configmap') {
      if (!configmap?.name || !configmap?.key) {
        res.status(400).json({ error: 'ConfigMap name and key are required' });
        return;
      }

      const namespace = configmap.namespace || 'toolhive-system';
      console.log(`Fetching tags from ConfigMap ${configmap.name}, key ${configmap.key} in namespace ${namespace}`);

      try {
        // Fetch the ConfigMap data and extract tags
        const rawData = await configMapService.getConfigMapData(configmap.name, configmap.key, namespace);
        if (rawData && typeof rawData === 'string') {
          const data = JSON.parse(rawData);
          const servers = data.servers || {};
          const tagSet = new Set<string>();

          // Extract tags from all servers
          Object.values(servers).forEach((server: any) => {
            if (server.tags && Array.isArray(server.tags)) {
              server.tags.forEach((tag: string) => tagSet.add(tag));
            }
            if (server.keywords && Array.isArray(server.keywords)) {
              server.keywords.forEach((tag: string) => tagSet.add(tag));
            }
          });

          tags = Array.from(tagSet).sort();
        }
      } catch (error) {
        console.error(`Error fetching ConfigMap data:`, error);
        // Return empty array instead of error to gracefully handle missing data
        tags = [];
      }
    } else if (type === 'git') {
      if (!git?.repository || !git?.path) {
        res.status(400).json({ error: 'Git repository and file path are required' });
        return;
      }

      const branch = git.branch || 'main';
      console.log(`Fetching tags from Git file: ${git.path} in ${git.repository}:${branch}`);

      try {
        // Fetch the Git file content and extract tags
        const fileContent = await gitValidationService.getFileContent(git.repository, git.path, branch);
        if (fileContent) {
          const data = JSON.parse(fileContent);
          const servers = data.servers || {};
          const tagSet = new Set<string>();

          // Extract tags from all servers
          Object.values(servers).forEach((server: any) => {
            if (server.tags && Array.isArray(server.tags)) {
              server.tags.forEach((tag: string) => tagSet.add(tag));
            }
            if (server.keywords && Array.isArray(server.keywords)) {
              server.keywords.forEach((tag: string) => tagSet.add(tag));
            }
          });

          tags = Array.from(tagSet).sort();
        }
      } catch (error) {
        console.error(`Error fetching Git file content:`, error);
        // Return empty array instead of error to gracefully handle missing data
        tags = [];
      }
    }

    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags from data source:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch tags from data source'
    });
  }
});

export { router as configMapsRouter };