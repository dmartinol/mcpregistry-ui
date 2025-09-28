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

export { router as configMapsRouter };