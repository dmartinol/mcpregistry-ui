import { Router, Request, Response } from 'express';
import { RegistryService } from '../services/RegistryService';
import {
  validateCreateRegistry,
  validateUpdateRegistry,
  validateRegistryQuery,
} from '../models/Registry';

const router = Router();
const registryService = new RegistryService();

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

    const registry = await registryService.createRegistry(value);
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

    const registry = await registryService.updateRegistry(req.params.id, value);
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

export { router as registriesRouter };