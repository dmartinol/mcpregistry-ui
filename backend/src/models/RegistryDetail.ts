import Joi from 'joi';
import { RegistryServer } from './RegistryServer';
import { DeployedServer } from './DeployedServer';

/**
 * Registry status enum
 */
export type RegistryStatus = 'active' | 'syncing' | 'error' | 'inactive';

/**
 * RegistryDetail extends the base registry information for the detail view.
 * This includes both the registry metadata and associated server data.
 */
export interface RegistryDetail {
  // Base registry fields (from existing model)
  /** Registry identifier */
  id: string;

  /** Registry display name */
  name: string;

  /** Registry source URL */
  url: string;

  /** Optional registry description */
  description?: string;

  /** Current registry status */
  status: RegistryStatus;

  /** Number of servers available in this registry */
  serverCount: number;

  /** Last successful sync timestamp */
  lastSyncAt?: Date;

  /** Registry creation timestamp */
  createdAt: Date;

  /** Last registry update timestamp */
  updatedAt: Date;

  // Extended fields for detail view
  /** Available servers from the registry source */
  availableServers: RegistryServer[];

  /** Currently deployed servers referencing this registry */
  deployedServers: DeployedServer[];

  /** Optional API endpoint for fetching server data */
  registryEndpoint?: string;
}

/**
 * Validation schema for RegistryDetail
 */
export const registryDetailSchema = Joi.object<RegistryDetail>({
  id: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .required()
    .messages({
      'string.pattern.base': 'Registry ID must follow Kubernetes naming convention'
    }),

  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Registry name is required',
      'string.max': 'Registry name must not exceed 100 characters'
    }),

  url: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Registry URL must be a valid URL'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),

  status: Joi.string()
    .valid('active', 'syncing', 'error', 'inactive')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, syncing, error, inactive'
    }),

  serverCount: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Server count must be a number',
      'number.integer': 'Server count must be an integer',
      'number.min': 'Server count cannot be negative'
    }),

  lastSyncAt: Joi.date()
    .optional()
    .messages({
      'date.base': 'Last sync date must be a valid date'
    }),

  createdAt: Joi.date()
    .required()
    .messages({
      'date.base': 'Created date must be a valid date'
    }),

  updatedAt: Joi.date()
    .required()
    .messages({
      'date.base': 'Updated date must be a valid date'
    }),

  availableServers: Joi.array()
    .items(Joi.object()) // Will be validated against RegistryServer schema separately
    .required(),

  deployedServers: Joi.array()
    .items(Joi.object()) // Will be validated against DeployedServer schema separately
    .required(),

  registryEndpoint: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Registry endpoint must be a valid URL'
    })
});

/**
 * Type for creating a RegistryDetail (excludes computed fields)
 */
export type CreateRegistryDetail = Omit<RegistryDetail, 'createdAt' | 'updatedAt' | 'availableServers' | 'deployedServers'>;

/**
 * Type for updating registry metadata (excludes server data)
 */
export type UpdateRegistryDetail = Partial<Pick<RegistryDetail, 'name' | 'description' | 'status' | 'serverCount' | 'lastSyncAt' | 'updatedAt' | 'registryEndpoint'>>;

/**
 * Basic registry info without server details (for list views)
 */
export interface RegistryInfo {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: RegistryStatus;
  serverCount: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for registry detail endpoint
 */
export interface RegistryDetailQuery {
  includeServers?: boolean;
  includeDeployed?: boolean;
}

/**
 * Validates a RegistryDetail object against the schema
 */
export function validateRegistryDetail(registry: unknown): { error?: Joi.ValidationError; value?: RegistryDetail } {
  return registryDetailSchema.validate(registry, { abortEarly: false });
}

/**
 * Type guard to check if an object is a valid RegistryDetail
 */
export function isRegistryDetail(obj: unknown): obj is RegistryDetail {
  const { error } = validateRegistryDetail(obj);
  return !error;
}

/**
 * Helper function to get status color for UI display
 */
export function getRegistryStatusColor(status: RegistryStatus): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'syncing':
      return 'info';
    case 'error':
      return 'error';
    case 'inactive':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * Helper function to check if registry is operational
 */
export function isRegistryOperational(status: RegistryStatus): boolean {
  return status === 'active' || status === 'syncing';
}

/**
 * Helper function to convert RegistryDetail to basic RegistryInfo
 */
export function toRegistryInfo(detail: RegistryDetail): RegistryInfo {
  return {
    id: detail.id,
    name: detail.name,
    url: detail.url,
    description: detail.description,
    status: detail.status,
    serverCount: detail.serverCount,
    lastSyncAt: detail.lastSyncAt,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}