import Joi from 'joi';

// Kubernetes naming convention validation
const kubernetesNameSchema = Joi.string()
  .min(1)
  .max(253)
  .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
  .messages({
    'string.pattern.base': 'Name must follow Kubernetes naming conventions: lowercase alphanumeric characters or hyphens, starting and ending with alphanumeric character',
    'string.min': 'Name must be at least 1 character long',
    'string.max': 'Name must be at most 253 characters long'
  });

// Duration validation (e.g., "30m", "1h", "2h30m")
const durationSchema = Joi.string()
  .pattern(/^(\d+[smhd])+$/)
  .messages({
    'string.pattern.base': 'Duration must be in format like "30m", "1h", "2h30m" (s=seconds, m=minutes, h=hours, d=days)'
  });

// Sync interval validation (duration or "manual")
const syncIntervalSchema = Joi.string()
  .custom((value, helpers) => {
    if (value === 'manual') {
      return value;
    }
    // Validate as duration pattern
    if (/^(\d+[smhd])+$/.test(value)) {
      return value;
    }
    return helpers.error('string.pattern.base');
  })
  .messages({
    'string.pattern.base': 'Sync interval must be "manual" or a duration like "30m", "1h", "2h30m" (s=seconds, m=minutes, h=hours, d=days)'
  });

// Git URL validation
const gitUrlSchema = Joi.string()
  .uri({ scheme: ['https'] })
  .pattern(/^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+\.git$/)
  .messages({
    'string.uri': 'Git URL must be a valid HTTPS URL',
    'string.pattern.base': 'Git URL must be from GitHub, GitLab, or Bitbucket and end with .git'
  });

// Branch name validation
const branchNameSchema = Joi.string()
  .min(1)
  .max(250)
  .pattern(/^[a-zA-Z0-9._/-]+$/)
  .messages({
    'string.pattern.base': 'Branch name contains invalid characters',
    'string.min': 'Branch name must be at least 1 character long',
    'string.max': 'Branch name must be at most 250 characters long'
  });

// File path validation
const filePathSchema = Joi.string()
  .min(1)
  .max(1000)
  .pattern(/^[^<>:"|?*]+$/)
  .custom((value) => {
    // Check for control characters manually
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      if (charCode < 32) {
        throw new Error('File path contains invalid control characters');
      }
    }
    return value;
  })
  .messages({
    'string.pattern.base': 'File path contains invalid characters',
    'string.min': 'File path must be at least 1 character long',
    'string.max': 'File path must be at most 1000 characters long'
  });

// Pattern validation for name filtering
const patternSchema = Joi.string()
  .min(1)
  .max(100)
  .messages({
    'string.min': 'Pattern must be at least 1 character long',
    'string.max': 'Pattern must be at most 100 characters long'
  });

// Tag validation
const tagSchema = Joi.string()
  .min(1)
  .max(50)
  .pattern(/^[a-zA-Z0-9._-]+$/)
  .messages({
    'string.pattern.base': 'Tag can only contain alphanumeric characters, dots, underscores, and hyphens',
    'string.min': 'Tag must be at least 1 character long',
    'string.max': 'Tag must be at most 50 characters long'
  });

// ConfigMap source schema
const configMapSourceSchema = Joi.object({
  name: kubernetesNameSchema.required().description('ConfigMap name'),
  key: Joi.string()
    .min(1)
    .max(253)
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'ConfigMap key can only contain alphanumeric characters, dots, underscores, and hyphens',
      'string.min': 'ConfigMap key must be at least 1 character long',
      'string.max': 'ConfigMap key must be at most 253 characters long'
    })
    .description('ConfigMap key containing registry data')
}).description('ConfigMap source configuration');

// Git source schema
const gitSourceSchema = Joi.object({
  repository: gitUrlSchema.required().description('Git repository URL'),
  branch: branchNameSchema.optional().default('main').description('Git branch (defaults to main)'),
  path: filePathSchema.required().description('Path to registry file in repository')
}).description('Git source configuration');

// Source schema
const sourceSchema = Joi.object({
  type: Joi.string()
    .valid('configmap', 'git')
    .required()
    .description('Source type'),
  format: Joi.string()
    .valid('toolhive')
    .default('toolhive')
    .description('Registry format (currently only toolhive supported)'),
  configmap: Joi.when('type', {
    is: 'configmap',
    then: configMapSourceSchema.required(),
    otherwise: Joi.forbidden()
  }),
  git: Joi.when('type', {
    is: 'git',
    then: gitSourceSchema.required(),
    otherwise: Joi.forbidden()
  })
}).description('Registry data source configuration');

// Filter schema
const filterSchema = Joi.object({
  names: Joi.object({
    include: Joi.array()
      .items(patternSchema)
      .max(20)
      .optional()
      .description('Patterns to include servers by name'),
    exclude: Joi.array()
      .items(patternSchema)
      .max(20)
      .optional()
      .description('Patterns to exclude servers by name')
  }).optional(),
  tags: Joi.object({
    include: Joi.array()
      .items(tagSchema)
      .max(50)
      .optional()
      .description('Tags to include servers'),
    exclude: Joi.array()
      .items(tagSchema)
      .max(50)
      .optional()
      .description('Tags to exclude servers')
  }).optional()
}).optional().description('Server filtering configuration');

// Sync policy schema
const syncPolicySchema = Joi.object({
  interval: syncIntervalSchema
    .required()
    .description('Sync interval (e.g., "30m", "1h", "manual" for manual sync only)')
}).optional().description('Registry synchronization policy');

// MCPRegistry metadata schema
const metadataSchema = Joi.object({
  name: kubernetesNameSchema.required().description('Registry name'),
  namespace: kubernetesNameSchema.required().description('Kubernetes namespace'),
  labels: Joi.object()
    .pattern(
      Joi.string().pattern(/^[a-z0-9.-/]+$/),
      Joi.string().max(63)
    )
    .optional()
    .description('Kubernetes labels'),
  annotations: Joi.object()
    .pattern(
      Joi.string().pattern(/^[a-z0-9.-/]+$/),
      Joi.string()
    )
    .optional()
    .description('Kubernetes annotations')
}).description('MCPRegistry metadata');

// MCPRegistry spec schema
const mcpRegistrySpecSchema = Joi.object({
  displayName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .description('User-friendly display name for the registry'),
  enforceServers: Joi.boolean()
    .optional()
    .default(false)
    .description('Whether to enforce server definitions (optional)'),
  source: sourceSchema.required(),
  syncPolicy: syncPolicySchema,
  filter: filterSchema
}).description('MCPRegistry specification');

// Complete MCPRegistry schema
export const mcpRegistrySchema = Joi.object({
  apiVersion: Joi.string()
    .valid('toolhive.stacklok.dev/v1alpha1')
    .required()
    .description('API version'),
  kind: Joi.string()
    .valid('MCPRegistry')
    .required()
    .description('Resource kind'),
  metadata: metadataSchema.required(),
  spec: mcpRegistrySpecSchema.required()
}).description('Complete MCPRegistry resource');

// Request schema for creating MCPRegistry (without apiVersion and kind)
export const createMCPRegistryRequestSchema = Joi.object({
  name: kubernetesNameSchema.required().description('Registry name'),
  displayName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .description('User-friendly display name for the registry'),
  namespace: kubernetesNameSchema.required().description('Kubernetes namespace'),
  enforceServers: Joi.boolean()
    .optional()
    .default(false)
    .description('Whether to enforce server definitions (optional)'),
  source: sourceSchema.required(),
  syncPolicy: syncPolicySchema,
  filter: filterSchema
}).description('MCPRegistry creation request');

// Type definitions for TypeScript
export interface MCPRegistryMetadata {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ConfigMapSource {
  name: string;
  key: string;
}

export interface GitSource {
  repository: string;
  branch?: string;
  path: string;
}

export interface MCPRegistrySource {
  type: 'configmap' | 'git';
  format: 'toolhive';
  configmap?: ConfigMapSource;
  git?: GitSource;
}

export interface MCPRegistryFilter {
  names?: {
    include?: string[];
    exclude?: string[];
  };
  tags?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface MCPRegistrySyncPolicy {
  interval: string;
}

export interface MCPRegistrySpec {
  displayName: string;
  enforceServers?: boolean;
  source: MCPRegistrySource;
  syncPolicy?: MCPRegistrySyncPolicy;
  filter?: MCPRegistryFilter;
}

export interface MCPRegistry {
  apiVersion: 'toolhive.stacklok.dev/v1alpha1';
  kind: 'MCPRegistry';
  metadata: MCPRegistryMetadata;
  spec: MCPRegistrySpec;
}

export interface CreateMCPRegistryRequest {
  name: string;
  displayName: string;
  namespace: string;
  enforceServers?: boolean;
  source: MCPRegistrySource;
  syncPolicy?: MCPRegistrySyncPolicy;
  filter?: MCPRegistryFilter;
}

// Helper function to validate and transform request to MCPRegistry
export function createMCPRegistryFromRequest(request: CreateMCPRegistryRequest): MCPRegistry {
  return {
    apiVersion: 'toolhive.stacklok.dev/v1alpha1',
    kind: 'MCPRegistry',
    metadata: {
      name: request.name,
      namespace: request.namespace
    },
    spec: {
      displayName: request.displayName,
      enforceServers: request.enforceServers || false,
      source: request.source,
      syncPolicy: request.syncPolicy,
      filter: request.filter
    }
  };
}

// Export commonly used schemas
export {
  kubernetesNameSchema,
  durationSchema,
  gitUrlSchema,
  branchNameSchema,
  filePathSchema,
  patternSchema,
  tagSchema
};