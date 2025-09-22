import Joi from 'joi';

/**
 * RegistryServer represents a server definition from the registry source.
 * This interface defines available servers that can be deployed.
 */
export interface RegistryServer {
  /** Server identifier - alphanumeric + hyphens, max 63 chars */
  name: string;

  /** Container image reference - required */
  image: string;

  /** Server version using semantic versioning */
  version?: string;

  /** Human-readable description, max 500 chars */
  description?: string;

  /** Classification tags - array of strings, each max 32 chars */
  tags: string[];

  /** MCP capabilities that this server provides */
  capabilities?: string[];

  /** Server author/maintainer, max 100 chars */
  author?: string;

  /** Source code repository URL */
  repository?: string;

  /** Documentation URL */
  documentation?: string;
}

/**
 * Validation schema for RegistryServer
 */
export const registryServerSchema = Joi.object<RegistryServer>({
  name: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .max(63)
    .required()
    .messages({
      'string.pattern.base': 'Name must be alphanumeric with hyphens, starting and ending with alphanumeric characters',
      'string.max': 'Name must not exceed 63 characters'
    }),

  image: Joi.string()
    .pattern(/^[a-z0-9.\-\/]+:[a-z0-9.\-]+$/i)
    .required()
    .messages({
      'string.pattern.base': 'Image must be a valid container image reference (registry/image:tag)'
    }),

  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+/)
    .optional()
    .messages({
      'string.pattern.base': 'Version must follow semantic versioning (e.g., 1.0.0)'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().max(32))
    .required()
    .messages({
      'array.base': 'Tags must be an array of strings',
      'string.max': 'Each tag must not exceed 32 characters'
    }),

  capabilities: Joi.array()
    .items(Joi.string())
    .optional(),

  author: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Author must not exceed 100 characters'
    }),

  repository: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Repository must be a valid URL'
    }),

  documentation: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Documentation must be a valid URL'
    })
});

/**
 * Type for creating a new RegistryServer (excludes computed fields)
 */
export type CreateRegistryServer = RegistryServer;

/**
 * Type for updating a RegistryServer (all fields optional except name)
 */
export type UpdateRegistryServer = Partial<RegistryServer> & { name: string };

/**
 * Response type for registry servers endpoint
 */
export interface RegistryServersResponse {
  servers: RegistryServer[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Validates a RegistryServer object against the schema
 */
export function validateRegistryServer(server: unknown): { error?: Joi.ValidationError; value?: RegistryServer } {
  return registryServerSchema.validate(server, { abortEarly: false });
}

/**
 * Type guard to check if an object is a valid RegistryServer
 */
export function isRegistryServer(obj: unknown): obj is RegistryServer {
  const { error } = validateRegistryServer(obj);
  return !error;
}