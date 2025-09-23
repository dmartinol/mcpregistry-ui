import Joi from 'joi';

/**
 * Server deployment status enum
 */
export type ServerStatus = 'Pending' | 'Running' | 'Failed' | 'Terminating';

/**
 * DeployedServer represents an actual deployed server instance in Kubernetes.
 * This corresponds to an MCPServer Kubernetes resource.
 */
export interface DeployedServer {
  /** Kubernetes resource name - must follow K8s naming convention */
  id: string;

  /** Server name from the deployment spec */
  name: string;

  /** Reference to the registry this server comes from */
  registryRef: string;

  /** Deployed container image */
  image: string;

  /** Deployed version */
  version?: string;

  /** Current deployment status */
  status: ServerStatus;

  /** Service endpoint URL for accessing the deployed server */
  endpoint?: string;

  /** Timestamp when the deployment was created */
  createdAt: Date;

  /** Timestamp of the last status update */
  lastUpdated: Date;

  /** Kubernetes namespace where the server is deployed */
  namespace: string;

  /** Kubernetes resource UID */
  uid: string;
}

/**
 * Validation schema for DeployedServer
 */
export const deployedServerSchema = Joi.object<DeployedServer>({
  id: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .required()
    .messages({
      'string.pattern.base': 'ID must follow Kubernetes naming convention (alphanumeric with hyphens)'
    }),

  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Name is required'
    }),

  registryRef: Joi.string()
    .required()
    .messages({
      'string.empty': 'Registry reference is required'
    }),

  image: Joi.string()
    .required()
    .messages({
      'string.empty': 'Image is required'
    }),

  version: Joi.string()
    .optional(),

  status: Joi.string()
    .valid('Pending', 'Running', 'Failed', 'Terminating')
    .required()
    .messages({
      'any.only': 'Status must be one of: Pending, Running, Failed, Terminating'
    }),

  endpoint: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Endpoint must be a valid URL'
    }),

  createdAt: Joi.date()
    .required()
    .messages({
      'date.base': 'Created date must be a valid date'
    }),

  lastUpdated: Joi.date()
    .required()
    .messages({
      'date.base': 'Last updated date must be a valid date'
    }),

  namespace: Joi.string()
    .required()
    .messages({
      'string.empty': 'Namespace is required'
    }),

  uid: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'UID must be a valid UUID'
    })
});

/**
 * Type for creating a new DeployedServer (excludes computed fields)
 */
export type CreateDeployedServer = Omit<DeployedServer, 'createdAt' | 'lastUpdated'>;

/**
 * Type for updating a DeployedServer (only allow status updates typically)
 */
export type UpdateDeployedServer = Partial<Pick<DeployedServer, 'status' | 'endpoint' | 'lastUpdated'>>;

/**
 * Response type for deployed servers endpoint
 */
export interface DeployedServersResponse {
  servers: DeployedServer[];
  total: number;
}

/**
 * Query parameters for filtering deployed servers
 */
export interface DeployedServersQuery {
  status?: ServerStatus;
  namespace?: string;
}

/**
 * Validates a DeployedServer object against the schema
 */
export function validateDeployedServer(server: unknown): { error?: Joi.ValidationError; value?: DeployedServer } {
  return deployedServerSchema.validate(server, { abortEarly: false });
}

/**
 * Type guard to check if an object is a valid DeployedServer
 */
export function isDeployedServer(obj: unknown): obj is DeployedServer {
  const { error } = validateDeployedServer(obj);
  return !error;
}

/**
 * Helper function to check if a server status is a terminal state
 */
export function isTerminalStatus(status: ServerStatus): boolean {
  return status === 'Failed' || status === 'Terminating';
}

/**
 * Helper function to check if a server is healthy/running
 */
export function isHealthyStatus(status: ServerStatus): boolean {
  return status === 'Running';
}

/**
 * Helper function to get status color for UI display
 */
export function getStatusColor(status: ServerStatus): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'Running':
      return 'success';
    case 'Pending':
      return 'info';
    case 'Failed':
      return 'error';
    case 'Terminating':
      return 'warning';
    default:
      return 'info';
  }
}