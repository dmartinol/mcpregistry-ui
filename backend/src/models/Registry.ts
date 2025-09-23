import Joi from 'joi';

export interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  serverCount: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  authConfig?: {
    type: 'none' | 'basic' | 'bearer' | 'oauth';
    [key: string]: any;
  };
  // Source information
  source?: {
    type: 'configmap' | 'git' | 'http' | 'https';
    location: string;
    syncInterval?: string;
  };
}

export interface CreateRegistryRequest {
  name: string;
  url: string;
  description?: string;
  authConfig?: Registry['authConfig'];
}

export interface UpdateRegistryRequest {
  name?: string;
  description?: string;
  authConfig?: Registry['authConfig'];
}

export interface RegistryDetails extends Registry {
  syncHistory: Array<{
    timestamp: Date;
    status: 'success' | 'error';
    message?: string;
  }>;
}

export interface RegistryListResponse {
  registries: Registry[];
  total: number;
  limit: number;
  offset: number;
}

// Validation schemas
export const createRegistrySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(64)
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name must contain only alphanumeric characters and hyphens',
    }),
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
    }),
  description: Joi.string()
    .max(500)
    .optional(),
  authConfig: Joi.object({
    type: Joi.string()
      .valid('none', 'basic', 'bearer', 'oauth')
      .default('none'),
  }).optional(),
});

export const updateRegistrySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(64)
    .pattern(/^[a-zA-Z0-9-]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Name must contain only alphanumeric characters and hyphens',
    }),
  description: Joi.string()
    .max(500)
    .optional(),
  authConfig: Joi.object({
    type: Joi.string()
      .valid('none', 'basic', 'bearer', 'oauth'),
  }).optional(),
});

export const registryQuerySchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'error', 'syncing')
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0),
});

// Utility functions
export function validateCreateRegistry(data: any): { error?: any; value?: CreateRegistryRequest } {
  const { error, value } = createRegistrySchema.validate(data);
  return { error, value };
}

export function validateUpdateRegistry(data: any): { error?: any; value?: UpdateRegistryRequest } {
  const { error, value } = updateRegistrySchema.validate(data);
  return { error, value };
}

export function validateRegistryQuery(data: any): { error?: any; value?: any } {
  const { error, value } = registryQuerySchema.validate(data);
  return { error, value };
}