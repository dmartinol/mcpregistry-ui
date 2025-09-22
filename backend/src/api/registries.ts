import { Router, Request, Response } from 'express';
import { RegistryService } from '../services/RegistryService';
import { RegistryServerService } from '../services/RegistryServerService';
import { DeployedServerService } from '../services/DeployedServerService';
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

// GET /api/v1/registries
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateRegistryQuery(req.query);
    if (error) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    const { status, limit, offset } = value;
    const result = await registryService.getRegistries(status, limit, offset);

    res.json(result);
  } catch (error) {
    console.error('Error listing registries:', error);
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

export { router as registriesRouter };