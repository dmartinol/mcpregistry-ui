# Phase 1: Data Model - Registry Server Details View

## Core Entities

### RegistryServer (Available Server)
Represents a server definition from the registry source.

```typescript
interface RegistryServer {
  name: string;                    // Server identifier
  image: string;                   // Container image name
  version?: string;                // Server version
  description?: string;            // Human-readable description
  tags: string[];                  // Classification tags
  capabilities?: string[];         // MCP capabilities
  author?: string;                 // Server author/maintainer
  repository?: string;             // Source code repository
  documentation?: string;          // Documentation URL
}
```

**Validation Rules**:
- `name`: Required, alphanumeric + hyphens, max 63 chars
- `image`: Required, valid container image reference
- `tags`: Array of strings, each max 32 chars
- `version`: Semantic versioning format when present

### DeployedServer (MCPServer Resource)
Represents an actual deployed server instance in Kubernetes.

```typescript
interface DeployedServer {
  id: string;                      // Kubernetes resource name
  name: string;                    // Server name from spec
  registryRef: string;             // Registry reference
  image: string;                   // Deployed image
  version?: string;                // Deployed version
  status: ServerStatus;            // Deployment status
  endpoint?: string;               // Service endpoint URL
  createdAt: Date;                 // Deployment timestamp
  lastUpdated: Date;               // Last status update
  namespace: string;               // Kubernetes namespace
  uid: string;                     // Kubernetes UID
}

type ServerStatus = 'Pending' | 'Running' | 'Failed' | 'Terminating';
```

**Validation Rules**:
- `id`: Required, Kubernetes name format
- `status`: Must be one of defined enum values
- `endpoint`: Valid URL format when present
- `registryRef`: Must match existing registry name

### RegistryDetail
Extended registry information for detail view.

```typescript
interface RegistryDetail {
  // Base registry fields (from existing model)
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  serverCount: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Extended fields for detail view
  availableServers: RegistryServer[];
  deployedServers: DeployedServer[];
  registryEndpoint?: string;       // API endpoint for server data
}
```

## State Transitions

### DeployedServer Status Flow
```
Pending → Running → Terminating
    ↓       ↓
  Failed ← Failed
```

**Business Rules**:
- New deployments start in `Pending` status
- `Running` servers can be terminated (→ `Terminating`)
- Failed deployments can be retried (→ `Pending`)
- Terminating servers eventually disappear from the list

## Data Relationships

```
Registry (1) ← has → (N) RegistryServer (available)
Registry (1) ← references → (N) DeployedServer (deployed)

RegistryServer.name may match DeployedServer.name (same server, different states)
```

## API Data Flow

### Available Servers
1. Get registry details via existing API: `GET /api/v1/registries/{id}`
2. Fetch server list from registry endpoint: `GET {registryEndpoint}/servers`
3. Parse and validate server definitions

### Deployed Servers
1. Query Kubernetes API for MCPServer resources with `spec.registryRef = {registryName}`
2. Transform Kubernetes resources to DeployedServer model
3. Enrich with endpoint URLs from service discovery

## Validation Schema

### RegistryServer Validation
```typescript
const registryServerSchema = {
  name: Joi.string().alphanum().max(63).required(),
  image: Joi.string().pattern(/^[a-z0-9.\-\/]+:[a-z0-9.\-]+$/i).required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+/).optional(),
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string().max(32)),
  capabilities: Joi.array().items(Joi.string()),
  author: Joi.string().max(100).optional(),
  repository: Joi.string().uri().optional(),
  documentation: Joi.string().uri().optional()
};
```

### DeployedServer Validation
```typescript
const deployedServerSchema = {
  id: Joi.string().pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).required(),
  name: Joi.string().required(),
  registryRef: Joi.string().required(),
  image: Joi.string().required(),
  status: Joi.string().valid('Pending', 'Running', 'Failed', 'Terminating').required(),
  endpoint: Joi.string().uri().optional(),
  namespace: Joi.string().required(),
  uid: Joi.string().guid().required()
};
```

## Error States

### Empty States
- **No available servers**: Registry contains no server definitions
- **No deployed servers**: No MCPServer resources reference this registry
- **Loading state**: Data fetching in progress
- **Error state**: Failed to fetch registry or server data

### Invalid Data Handling
- **Malformed server definitions**: Skip invalid entries, log warnings
- **Orphaned deployments**: Show deployed servers even if not in registry
- **Stale data**: Indicate last update time, provide refresh mechanism