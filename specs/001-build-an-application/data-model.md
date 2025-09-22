# Data Model: ToolHive Registry Management Application

## Core Entities

### Registry
Represents a ToolHive registry containing server definitions.

**Fields:**
- `id`: string (unique identifier)
- `name`: string (display name, required)
- `url`: string (registry endpoint URL, required)
- `description`: string (optional description)
- `status`: enum (active, inactive, error, syncing)
- `serverCount`: number (cached count of registered servers)
- `lastSyncAt`: timestamp (last successful sync)
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `metadata`: object (additional registry-specific data)
- `authConfig`: object (authentication configuration)

**Validation Rules:**
- Name must be 1-64 characters, alphanumeric with hyphens
- URL must be valid HTTP/HTTPS endpoint
- Status must be one of defined enum values

**State Transitions:**
- inactive → syncing → active (successful registration)
- active → syncing → active (periodic refresh)
- syncing → error (sync failure)
- error → syncing (retry attempt)

### Server
Represents a tool/service definition within a registry.

**Fields:**
- `id`: string (unique identifier)
- `registryId`: string (foreign key to Registry)
- `name`: string (server name from registry)
- `description`: string (server description)
- `version`: string (server version)
- `image`: string (container image reference)
- `transport`: enum (stdio, http, sse)
- `tier`: enum (official, community)
- `status`: enum (available, deprecated, experimental)
- `category`: string[] (categorization tags)
- `capabilities`: string[] (list of tool capabilities)
- `repositoryUrl`: string (source code repository)
- `networkPermissions`: object (network access requirements)
- `pullCount`: number (usage statistics)
- `stars`: number (popularity metric)
- `lastUpdated`: timestamp
- `deploymentRequirements`: object (resource requirements)

**Validation Rules:**
- Name must follow DNS label format
- Version must be semantic version or tag
- Image must be valid container reference
- Transport must be supported type

**Relationships:**
- Belongs to exactly one Registry
- Can have multiple Instances (one-to-many)

### Instance
Represents a deployed server running in the Kubernetes cluster.

**Fields:**
- `id`: string (unique identifier)
- `serverId`: string (foreign key to Server)
- `name`: string (K8s deployment name)
- `namespace`: string (K8s namespace)
- `status`: enum (pending, running, failed, terminated)
- `phase`: enum (deploying, ready, scaling, terminating)
- `replicas`: object (desired, current, ready replica counts)
- `deployedAt`: timestamp
- `configuration`: object (deployment parameters)
- `resourceUsage`: object (CPU, memory, storage metrics)
- `healthStatus`: enum (healthy, unhealthy, unknown)
- `logs`: object (log access information)
- `events`: object[] (K8s events related to instance)

**Validation Rules:**
- Name must be valid K8s resource name
- Namespace must exist and be accessible
- Replicas counts must be non-negative integers

**Relationships:**
- Belongs to exactly one Server
- Linked to one Deployment operation

### Deployment
Represents a deployment operation record.

**Fields:**
- `id`: string (unique identifier)
- `instanceId`: string (foreign key to Instance)
- `serverId`: string (foreign key to Server)
- `initiatedBy`: string (user identifier)
- `status`: enum (initiated, in_progress, completed, failed, cancelled)
- `startedAt`: timestamp
- `completedAt`: timestamp (nullable)
- `parameters`: object (deployment configuration)
- `steps`: object[] (deployment step history)
- `errors`: object[] (error details if failed)
- `rollbackInfo`: object (rollback capability data)

**Validation Rules:**
- Status transitions must follow defined workflow
- Completed deployments must have completedAt timestamp
- Failed deployments must have error details

**State Transitions:**
- initiated → in_progress → completed (successful deployment)
- initiated → in_progress → failed (deployment failure)
- in_progress → cancelled (user cancellation)

### Cluster
Represents target Kubernetes environment.

**Fields:**
- `id`: string (unique identifier)
- `name`: string (display name)
- `endpoint`: string (K8s API server URL)
- `context`: string (kubectl context name)
- `status`: enum (connected, disconnected, unauthorized)
- `version`: string (Kubernetes version)
- `capabilities`: string[] (supported features)
- `resourceQuota`: object (available resources)
- `accessLevel`: enum (read_only, deploy, admin)
- `lastCheckedAt`: timestamp

**Validation Rules:**
- Endpoint must be valid K8s API URL
- Version must be supported K8s version
- Access level must match actual RBAC permissions

### MonitoringMetrics
Represents real-time and historical performance data.

**Fields:**
- `instanceId`: string (foreign key to Instance)
- `timestamp`: timestamp
- `cpuUsage`: number (CPU utilization percentage)
- `memoryUsage`: number (memory usage in bytes)
- `networkIO`: object (ingress/egress bytes)
- `requestCount`: number (request volume)
- `responseTime`: number (average response time ms)
- `errorRate`: number (error percentage)
- `healthChecks`: object (health check results)

**Validation Rules:**
- Metrics must be within reasonable ranges
- Timestamp must be recent (within collection window)
- Percentages must be 0-100

## Entity Relationships

```
Registry (1) ←→ (N) Server
Server (1) ←→ (N) Instance
Instance (1) ←→ (1) Deployment
Instance (1) ←→ (N) MonitoringMetrics
Cluster (1) ←→ (N) Instance
```

## Data Access Patterns

### Primary Access Patterns
1. **Registry Management**: List registries, view registry details, sync registry servers
2. **Server Discovery**: Browse servers by registry, filter by category/tier, search capabilities
3. **Instance Monitoring**: View running instances, check health status, access logs
4. **Deployment Operations**: Deploy servers, track deployment progress, manage instance lifecycle

### Query Optimization
- Index on registry.status for active registry filtering
- Index on server.category for categorization queries
- Index on instance.namespace + instance.status for operational views
- Index on monitoringMetrics.instanceId + timestamp for time-series data

### Caching Strategy
- Registry server lists cached for 5 minutes
- Instance status cached for 30 seconds
- Monitoring metrics cached for 15 seconds
- Deployment logs cached for 2 minutes

## Security Considerations

### Data Classification
- **Public**: Server descriptions, capabilities, repository URLs
- **Internal**: Instance configurations, resource usage metrics
- **Sensitive**: Authentication tokens, deployment parameters
- **Restricted**: Cluster credentials, security configurations

### Access Control
- Registry data: Read access for authenticated users
- Instance data: Namespace-based access control
- Deployment operations: Role-based permissions (deploy, admin)
- Monitoring data: Instance ownership validation

### Data Retention
- Deployment logs: 30 days
- Monitoring metrics: 7 days (detailed), 90 days (aggregated)
- Audit logs: 1 year
- Configuration history: Indefinite