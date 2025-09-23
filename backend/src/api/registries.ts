import { Router, Request, Response } from 'express';
import { RegistryService } from '../services/RegistryService';
import { RegistryServerService } from '../services/RegistryServerService';
import { DeployedServerService } from '../services/DeployedServerService';
import { KubernetesClient } from '../services/KubernetesClient';
import {
  validateCreateRegistry,
  validateUpdateRegistry,
  validateRegistryQuery,
} from '../models/Registry';
import Joi from 'joi';

const router = Router();
const registryService = new RegistryService();
const registryServerService = new RegistryServerService();
const deployedServerService = new DeployedServerService();
const kubernetesClient = new KubernetesClient();

// GET /api/v1/registries
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== GET /api/v1/registries called ===');
    console.log('Query params:', req.query);

    const { error, value } = validateRegistryQuery(req.query);
    if (error) {
      console.log('Validation error:', error.details);
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    const { status, limit, offset, namespace } = value;
    console.log('Validated params:', { status, limit, offset, namespace });

    // Create a new registry service with the specified namespace if provided
    const serviceToUse = namespace
      ? new RegistryService(namespace)
      : registryService;

    console.log('About to call getRegistries...');
    const result = await serviceToUse.getRegistries(status, limit, offset);
    console.log('Successfully got registries:', result);

    res.json(result);
  } catch (error) {
    console.error('=== ERROR in GET /api/v1/registries ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('Full error object:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/registries
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateCreateRegistry(req.body);
    if (error) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    const registry = await registryService.createRegistry(value!);
    res.status(201).json(registry);
  } catch (error) {
    console.error('Error creating registry:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/v1/registries/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const registry = await registryService.getRegistryById(req.params.id);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.json(registry);
  } catch (error) {
    console.error('Error getting registry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/registries/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateUpdateRegistry(req.body);
    if (error) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    const registry = await registryService.updateRegistry(req.params.id, value!);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.json(registry);
  } catch (error) {
    console.error('Error updating registry:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/v1/registries/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await registryService.deleteRegistry(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting registry:', error);
    if (error instanceof Error && error.message.includes('active instances')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/v1/registries/:id/sync
router.post('/:id/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await registryService.syncRegistry(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.status(202).json(result);
  } catch (error) {
    console.error('Error syncing registry:', error);
    if (error instanceof Error && error.message.includes('already in progress')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Validation schemas for new endpoints
const registryServersQuerySchema = Joi.object({
  tags: Joi.array().items(Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
});

const deployedServersQuerySchema = Joi.object({
  status: Joi.string().valid('Pending', 'Running', 'Failed', 'Terminating').optional(),
  namespace: Joi.string().optional(),
});

const deployServerSchema = Joi.object({
  name: Joi.string().required().regex(/^[a-z0-9-]+$/).message('Name must be lowercase alphanumeric with hyphens only'),
  image: Joi.string().required(),
  transport: Joi.string().valid('streamable-http', 'stdio').required(),
  targetPort: Joi.number().integer().min(1).max(65535).required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  permissionProfile: Joi.object({
    type: Joi.string().valid('builtin').required(),
    name: Joi.string().required(),
  }).required(),
  resources: Joi.object({
    limits: Joi.object({
      cpu: Joi.string().required(),
      memory: Joi.string().required(),
    }).required(),
    requests: Joi.object({
      cpu: Joi.string().required(),
      memory: Joi.string().required(),
    }).required(),
  }).required(),
  environmentVariables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required(),
      required: Joi.boolean().optional(),
    })
  ).default([]),
  namespace: Joi.string().required(),
  registryName: Joi.string().required(),
  registryNamespace: Joi.string().required(),
});

// GET /api/v1/registries/:registryId/servers
router.get('/:registryId/servers', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate registry exists
    const registry = await registryService.getRegistryById(req.params.registryId);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    // Validate query parameters
    const { error, value } = registryServersQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    // Fetch available servers
    const result = await registryServerService.getAvailableServers(req.params.registryId, value);
    res.json(result);
  } catch (error) {
    console.error('Error fetching registry servers:', error);
    if (error instanceof Error && error.message.includes('Registry not found')) {
      res.status(404).json({ error: 'Registry not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/v1/registries/:registryId/deployed-servers
router.get('/:registryId/deployed-servers', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate registry exists
    const registry = await registryService.getRegistryById(req.params.registryId);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    // Validate query parameters for registry server service
    const { error, value } = registryServersQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    // Fetch deployed servers from registry API
    const result = await registryServerService.getDeployedServers(req.params.registryId, value);
    res.json(result);
  } catch (error) {
    console.error('Error fetching deployed servers:', error);
    if (error instanceof Error && error.message.includes('Registry not found')) {
      res.status(404).json({ error: 'Registry not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/v1/registries/:registryId/servers/:serverName
router.get('/:registryId/servers/:serverName', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate registry exists
    const registry = await registryService.getRegistryById(req.params.registryId);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    // Fetch specific server details
    const server = await registryServerService.getServerByName(req.params.registryId, req.params.serverName);
    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    res.json(server);
  } catch (error) {
    console.error('Error fetching server details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/registries/:registryId/servers/deployed/:serverName
router.get('/:registryId/servers/deployed/:serverName', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate registry exists
    const registry = await registryService.getRegistryById(req.params.registryId);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    // Fetch specific deployed server details
    const deployedServer = await registryServerService.getDeployedServerByName(req.params.registryId, req.params.serverName);
    if (!deployedServer) {
      res.status(404).json({ error: 'Deployed server not found' });
      return;
    }

    res.json(deployedServer);
  } catch (error) {
    console.error('Error fetching deployed server details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/registries/:registryId/force-sync
router.post('/:registryId/force-sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await registryService.forceSyncRegistry(req.params.registryId);
    if (!result) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error triggering force sync:', error);
    if (error instanceof Error && error.message.includes('already in progress')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/v1/registries/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    await registryService.refreshRegistries();
    res.json({ status: 'success', message: 'Registries refreshed' });
  } catch (error) {
    console.error('Error refreshing registries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/registries/:registryId/servers/:serverName/deploy
router.post('/:registryId/servers/:serverName/deploy', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate registry exists
    const registry = await registryService.getRegistryById(req.params.registryId);
    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    // Validate server exists
    const server = await registryServerService.getServerByName(req.params.registryId, req.params.serverName);
    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    // Validate deployment configuration
    const { error, value } = deployServerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Invalid deployment configuration',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    // Check if a server with the same name already exists
    const existingServer = await kubernetesClient.getMCPServer(value.name, value.namespace);
    if (existingServer) {
      res.status(409).json({ error: `Server with name '${value.name}' already exists in namespace '${value.namespace}'` });
      return;
    }

    // Deploy the server
    const deploymentConfig = {
      ...value,
      serverName: req.params.serverName,
    };

    const deployedServer = await kubernetesClient.deployMCPServer(deploymentConfig);

    // Return the deployed server manifest
    res.status(201).json({
      status: 'success',
      message: 'Server deployed successfully',
      server: deployedServer,
      manifest: JSON.stringify(deployedServer, null, 2),
    });
  } catch (error) {
    console.error('Error deploying server:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: `Deployment failed: ${error.message}` });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export { router as registriesRouter };