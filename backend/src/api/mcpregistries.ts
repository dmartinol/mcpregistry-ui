import { Router, Request, Response } from 'express';
import { MCPRegistryService } from '../services/MCPRegistryService';
import { GitValidationService } from '../services/GitValidationService';
import { ConfigMapService } from '../services/ConfigMapService';
import { createMCPRegistryRequestSchema, CreateMCPRegistryRequest } from '../models/MCPRegistrySchema';
import Joi from 'joi';

const router = Router();
const mcpRegistryService = new MCPRegistryService();
const gitValidationService = new GitValidationService();
const configMapService = new ConfigMapService();

// Validation schema for registry validation request
const validateRegistryRequestSchema = Joi.object({
  name: Joi.string().required(),
  displayName: Joi.string().required(),
  namespace: Joi.string().required(),
  enforceServers: Joi.boolean().optional(),
  source: Joi.object({
    type: Joi.string().valid('configmap', 'git').required(),
    format: Joi.string().valid('toolhive').default('toolhive'),
    configmap: Joi.when('type', {
      is: 'configmap',
      then: Joi.object({
        name: Joi.string().required(),
        key: Joi.string().required()
      }).required(),
      otherwise: Joi.forbidden()
    }),
    git: Joi.when('type', {
      is: 'git',
      then: Joi.object({
        repository: Joi.string().required(),
        branch: Joi.string().optional(),
        path: Joi.string().required()
      }).required(),
      otherwise: Joi.forbidden()
    })
  }).required(),
  syncPolicy: Joi.object({
    interval: Joi.string().required()
  }).optional(),
  filter: Joi.object({
    names: Joi.object({
      include: Joi.array().items(Joi.string()).optional(),
      exclude: Joi.array().items(Joi.string()).optional()
    }).optional(),
    tags: Joi.object({
      include: Joi.array().items(Joi.string()).optional(),
      exclude: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).optional()
});

// POST /api/v1/mcpregistries/validate - Validate MCPRegistry configuration
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('MCPRegistry validation request:', req.body);

    // Basic schema validation
    const { error: schemaError, value } = validateRegistryRequestSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (schemaError) {
      console.log('Schema validation failed:', schemaError.details);
      res.status(400).json({
        valid: false,
        error: 'Invalid request format',
        details: schemaError.details.map(d => d.message)
      });
      return;
    }

    // Validate using MCPRegistryService
    const validationResult = await mcpRegistryService.validateConfiguration(value as CreateMCPRegistryRequest);

    // Additional source-specific validation
    let sourceValidation: { valid: boolean; error?: string } = { valid: true };

    if (value.source.type === 'git') {
      console.log('Validating Git source:', value.source.git);
      sourceValidation = await gitValidationService.validateGitSource(
        value.source.git.repository,
        value.source.git.branch,
        value.source.git.path
      );
    } else if (value.source.type === 'configmap') {
      console.log('Validating ConfigMap source:', value.source.configmap);
      try {
        const isValid = await configMapService.validateConfigMapKey(
          value.source.configmap.name,
          value.source.configmap.key,
          value.namespace
        );
        sourceValidation = { valid: isValid, error: isValid ? undefined : 'ConfigMap or key not found' };
      } catch (error) {
        sourceValidation = {
          valid: false,
          error: error instanceof Error ? error.message : 'ConfigMap validation failed'
        };
      }
    }

    // Combine validation results
    const combinedResult = {
      valid: validationResult.valid && sourceValidation.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      sourceValidation: {
        valid: sourceValidation.valid,
        error: sourceValidation.error
      }
    };

    console.log('MCPRegistry validation result:', combinedResult);
    res.json(combinedResult);
  } catch (error) {
    console.error('Error validating MCPRegistry configuration:', error);
    res.status(500).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// POST /api/v1/mcpregistries - Create new MCPRegistry
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('MCPRegistry creation request:', req.body);

    // Validate request using Joi schema
    const { error, value } = createMCPRegistryRequestSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      console.log('Request validation failed:', error.details);
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Create the registry
    const result = await mcpRegistryService.createRegistry(value as CreateMCPRegistryRequest);

    if (result.success) {
      console.log('MCPRegistry created successfully:', result.registry?.metadata.name);
      res.status(201).json({
        success: true,
        message: result.message,
        registry: result.registry
      });
    } else {
      console.log('MCPRegistry creation failed:', result.message);
      if (result.errors) {
        // Extract the most specific error message from validation details
        const specificError = result.errors.details?.[0]?.message || result.message || 'Validation failed';
        res.status(400).json({
          success: false,
          error: specificError,
          details: result.errors.details?.map(d => d.message) || []
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message || 'Failed to create registry'
        });
      }
    }
  } catch (error) {
    console.error('Error creating MCPRegistry:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /api/v1/mcpregistries - List MCPRegistries
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const namespace = req.query.namespace as string;
    console.log('Listing MCPRegistries for namespace:', namespace || 'all');

    const result = await mcpRegistryService.listRegistries(namespace);

    res.json({
      registries: result.registries,
      total: result.total,
      namespace: result.namespace
    });
  } catch (error) {
    console.error('Error listing MCPRegistries:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list registries'
    });
  }
});

// GET /api/v1/mcpregistries/:name - Get specific MCPRegistry
router.get('/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    console.log('Getting MCPRegistry:', name);

    const registry = await mcpRegistryService.getRegistry(name);

    if (!registry) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.json(registry);
  } catch (error) {
    console.error('Error getting MCPRegistry:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get registry'
    });
  }
});

// PUT /api/v1/mcpregistries/:name - Update MCPRegistry
router.put('/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    console.log('Updating MCPRegistry:', name, req.body);

    const result = await mcpRegistryService.updateRegistry(name, req.body);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        registry: result.registry
      });
    } else {
      if (result.errors) {
        res.status(400).json({
          success: false,
          error: result.message || 'Validation failed',
          details: result.errors.details?.map(d => d.message) || []
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message || 'Failed to update registry'
        });
      }
    }
  } catch (error) {
    console.error('Error updating MCPRegistry:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/v1/mcpregistries/:name - Delete MCPRegistry
router.delete('/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    console.log('Deleting MCPRegistry:', name);

    const success = await mcpRegistryService.deleteRegistry(name);

    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Registry not found' });
    }
  } catch (error) {
    console.error('Error deleting MCPRegistry:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete registry'
    });
  }
});

// POST /api/v1/mcpregistries/:name/sync - Trigger manual sync
router.post('/:name/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    console.log('Triggering sync for MCPRegistry:', name);

    const success = await mcpRegistryService.triggerSync(name);

    if (success) {
      res.json({
        success: true,
        message: `Sync triggered for registry '${name}'`
      });
    } else {
      res.status(404).json({ error: 'Registry not found' });
    }
  } catch (error) {
    console.error('Error triggering MCPRegistry sync:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger sync'
    });
  }
});

// GET /api/v1/mcpregistries/:name/status - Get registry status
router.get('/:name/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    console.log('Getting status for MCPRegistry:', name);

    const status = await mcpRegistryService.getRegistryStatus(name);

    if (!status) {
      res.status(404).json({ error: 'Registry not found' });
      return;
    }

    res.json(status);
  } catch (error) {
    console.error('Error getting MCPRegistry status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get registry status'
    });
  }
});

export { router as mcpRegistriesRouter };