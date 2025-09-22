# ToolHive Registry Management API Documentation

## Overview

The ToolHive Registry Management API provides RESTful endpoints for managing ToolHive registries, servers, and deployed instances in Kubernetes clusters.

**Base URL**: `/api/v1`

**Authentication**: Kubernetes ServiceAccount tokens (RBAC-based)

**Content Type**: `application/json`

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "details": ["Additional error details"]
}
```

**HTTP Status Codes**:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resources)
- `500` - Internal Server Error

## Registry Management

### List Registries

`GET /registries`

Retrieve a paginated list of all registries.

**Query Parameters**:
- `status` (optional): Filter by status (`active`, `inactive`, `error`, `syncing`)
- `limit` (optional): Number of results per page (1-100, default: 20)
- `offset` (optional): Number of results to skip (default: 0)

**Response**:
```json
{
  "registries": [
    {
      "id": "uuid",
      "name": "registry-name",
      "url": "https://registry.example.com/api/v1",
      "description": "Registry description",
      "status": "active",
      "serverCount": 25,
      "lastSyncAt": "2025-01-19T10:30:00Z",
      "createdAt": "2025-01-19T10:00:00Z",
      "updatedAt": "2025-01-19T10:30:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### Create Registry

`POST /registries`

Create a new registry.

**Request Body**:
```json
{
  "name": "my-registry",
  "url": "https://registry.example.com/api/v1",
  "description": "Optional description",
  "authConfig": {
    "type": "none"
  }
}
```

**Validation Rules**:
- `name`: 1-64 characters, alphanumeric and hyphens only
- `url`: Valid HTTP/HTTPS URL
- `description`: Optional, max 500 characters

**Response**: `201 Created` with registry object

### Get Registry Details

`GET /registries/{id}`

Retrieve detailed information about a specific registry.

**Response**:
```json
{
  "id": "uuid",
  "name": "registry-name",
  "url": "https://registry.example.com/api/v1",
  "description": "Registry description",
  "status": "active",
  "serverCount": 25,
  "lastSyncAt": "2025-01-19T10:30:00Z",
  "createdAt": "2025-01-19T10:00:00Z",
  "updatedAt": "2025-01-19T10:30:00Z",
  "metadata": {},
  "authConfig": {
    "type": "none"
  },
  "syncHistory": [
    {
      "timestamp": "2025-01-19T10:30:00Z",
      "status": "success",
      "message": "Synced 25 servers"
    }
  ]
}
```

### Update Registry

`PUT /registries/{id}`

Update registry configuration.

**Request Body**:
```json
{
  "name": "updated-name",
  "description": "Updated description",
  "authConfig": {
    "type": "basic",
    "username": "user"
  }
}
```

**Response**: `200 OK` with updated registry object

### Delete Registry

`DELETE /registries/{id}`

Delete a registry and all associated data.

**Response**: `204 No Content`

**Note**: Returns `409 Conflict` if registry has active instances.

### Sync Registry

`POST /registries/{id}/sync`

Trigger synchronization of registry server data.

**Response**:
```json
{
  "syncId": "uuid",
  "status": "initiated"
}
```

**Note**: Returns `409 Conflict` if sync already in progress.

## Server Management

### List Servers in Registry

`GET /registries/{registryId}/servers`

Retrieve all servers available in a specific registry.

**Query Parameters**:
- `category` (optional): Filter by server category
- `tier` (optional): Filter by tier (`official`, `community`)
- `transport` (optional): Filter by transport (`stdio`, `http`, `sse`)
- `search` (optional): Search in name, description, and capabilities
- `limit` (optional): Number of results per page (1-100, default: 20)
- `offset` (optional): Number of results to skip (default: 0)

**Response**:
```json
{
  "servers": [
    {
      "id": "uuid",
      "registryId": "registry-uuid",
      "name": "server-name",
      "description": "Server description",
      "version": "1.0.0",
      "image": "registry.example.com/server:1.0.0",
      "transport": "stdio",
      "tier": "official",
      "status": "available",
      "category": ["database", "postgres"],
      "capabilities": ["read", "write", "query"],
      "repositoryUrl": "https://github.com/example/server",
      "pullCount": 1000,
      "stars": 50,
      "lastUpdated": "2025-01-19T10:00:00Z"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

### Get Server Details

`GET /servers/{id}`

Retrieve detailed information about a specific server.

**Response**:
```json
{
  "id": "uuid",
  "registryId": "registry-uuid",
  "name": "server-name",
  "description": "Server description",
  "version": "1.0.0",
  "image": "registry.example.com/server:1.0.0",
  "transport": "stdio",
  "tier": "official",
  "status": "available",
  "category": ["database", "postgres"],
  "capabilities": ["read", "write", "query"],
  "repositoryUrl": "https://github.com/example/server",
  "pullCount": 1000,
  "stars": 50,
  "lastUpdated": "2025-01-19T10:00:00Z",
  "networkPermissions": {
    "allowNetwork": true,
    "allowedHosts": ["api.example.com"]
  },
  "deploymentRequirements": {
    "minCpu": "100m",
    "minMemory": "256Mi",
    "storage": "1Gi",
    "ports": [
      {
        "name": "http",
        "port": 8080,
        "protocol": "TCP"
      }
    ]
  },
  "instances": [
    {
      "id": "instance-uuid",
      "name": "server-instance-1",
      "namespace": "default",
      "status": "running",
      "deployedAt": "2025-01-19T10:00:00Z",
      "replicas": {
        "desired": 2,
        "current": 2,
        "ready": 2
      }
    }
  ]
}
```

### Deploy Server Instance

`POST /servers/{id}/deploy`

Create a new deployment of the server to Kubernetes cluster.

**Request Body**:
```json
{
  "name": "my-instance",
  "namespace": "default",
  "replicas": 1,
  "resources": {
    "requests": {
      "cpu": "100m",
      "memory": "256Mi"
    },
    "limits": {
      "cpu": "500m",
      "memory": "512Mi"
    }
  },
  "environment": {
    "ENV_VAR": "value"
  },
  "configuration": {}
}
```

**Response**: `202 Accepted`
```json
{
  "deploymentId": "uuid",
  "instanceId": "uuid",
  "status": "initiated",
  "estimatedTime": "2-3 minutes",
  "trackingUrl": "/api/v1/instances/uuid"
}
```

## Instance Management

### List Instances

`GET /instances`

Retrieve all deployed instances across all namespaces (subject to RBAC).

**Query Parameters**:
- `namespace` (optional): Filter by Kubernetes namespace
- `status` (optional): Filter by status (`pending`, `running`, `failed`, `terminated`)
- `serverId` (optional): Filter by originating server
- `limit` (optional): Number of results per page (1-100, default: 20)
- `offset` (optional): Number of results to skip (default: 0)

**Response**:
```json
{
  "instances": [
    {
      "id": "uuid",
      "serverId": "server-uuid",
      "name": "instance-name",
      "namespace": "default",
      "status": "running",
      "phase": "ready",
      "replicas": {
        "desired": 2,
        "current": 2,
        "ready": 2
      },
      "deployedAt": "2025-01-19T10:00:00Z",
      "healthStatus": "healthy"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

### Get Instance Details

`GET /instances/{id}`

Retrieve detailed information about a specific instance.

**Response**:
```json
{
  "id": "uuid",
  "serverId": "server-uuid",
  "name": "instance-name",
  "namespace": "default",
  "status": "running",
  "phase": "ready",
  "replicas": {
    "desired": 2,
    "current": 2,
    "ready": 2
  },
  "deployedAt": "2025-01-19T10:00:00Z",
  "healthStatus": "healthy",
  "configuration": {
    "image": "registry.example.com/server:1.0.0",
    "resources": {
      "requests": {
        "cpu": "100m",
        "memory": "256Mi"
      },
      "limits": {
        "cpu": "500m",
        "memory": "512Mi"
      }
    },
    "environment": {
      "ENV_VAR": "value"
    },
    "ports": [
      {
        "name": "http",
        "port": 8080,
        "targetPort": 8080,
        "protocol": "TCP"
      }
    ]
  },
  "resourceUsage": {
    "cpu": {
      "current": "150m",
      "percentage": 30
    },
    "memory": {
      "current": "200Mi",
      "percentage": 40
    },
    "network": {
      "ingress": "1.2MB",
      "egress": "800KB"
    }
  },
  "events": [
    {
      "timestamp": "2025-01-19T10:05:00Z",
      "type": "Normal",
      "reason": "Started",
      "message": "Container started successfully"
    }
  ]
}
```

### Terminate Instance

`DELETE /instances/{id}`

Terminate a running instance and clean up resources.

**Response**: `202 Accepted`
```json
{
  "terminationId": "uuid",
  "status": "initiated"
}
```

### Scale Instance

`POST /instances/{id}/scale`

Change the number of replicas for an instance.

**Request Body**:
```json
{
  "replicas": 3
}
```

**Response**: `202 Accepted`
```json
{
  "scaleId": "uuid",
  "status": "initiated",
  "targetReplicas": 3
}
```

### Get Instance Logs

`GET /instances/{id}/logs`

Retrieve logs from instance containers.

**Query Parameters**:
- `container` (optional): Specific container name (if multiple)
- `tail` (optional): Number of recent log lines (1-1000, default: 100)
- `since` (optional): Show logs since timestamp (ISO 8601)
- `follow` (optional): Stream logs in real-time (boolean, default: false)

**Response** (JSON format):
```json
{
  "logs": [
    {
      "timestamp": "2025-01-19T10:05:00Z",
      "level": "info",
      "message": "Server started on port 8080",
      "container": "main"
    }
  ]
}
```

**Response** (Text format):
```
2025-01-19T10:05:00Z [INFO] Server started on port 8080
2025-01-19T10:05:01Z [INFO] Ready to accept connections
```

### Get Instance Metrics

`GET /instances/{id}/metrics`

Retrieve resource usage and performance metrics.

**Query Parameters**:
- `period` (optional): Time period (`1h`, `6h`, `24h`, `7d`, default: `1h`)
- `resolution` (optional): Metric resolution (`1m`, `5m`, `15m`, `1h`, default: `5m`)

**Response**:
```json
{
  "instanceId": "uuid",
  "period": "1h",
  "resolution": "5m",
  "metrics": {
    "cpu": [
      {
        "timestamp": "2025-01-19T10:00:00Z",
        "value": 25.5
      }
    ],
    "memory": [
      {
        "timestamp": "2025-01-19T10:00:00Z",
        "value": 209715200
      }
    ],
    "network": [
      {
        "timestamp": "2025-01-19T10:00:00Z",
        "ingress": 1048576,
        "egress": 524288
      }
    ],
    "requests": [
      {
        "timestamp": "2025-01-19T10:00:00Z",
        "count": 150,
        "responseTime": 45.2,
        "errorRate": 0.5
      }
    ]
  }
}
```

## Rate Limiting

API requests are rate limited to 100 requests per 15-minute window per IP address.

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when current window resets (Unix timestamp)

## WebSocket Events

Real-time updates are available via WebSocket connection at `/api/v1/ws`.

**Event Types**:
- `registry.sync.started`
- `registry.sync.completed`
- `registry.sync.failed`
- `instance.deployment.started`
- `instance.deployment.completed`
- `instance.deployment.failed`
- `instance.status.changed`
- `instance.metrics.updated`

**Event Format**:
```json
{
  "type": "instance.status.changed",
  "timestamp": "2025-01-19T10:05:00Z",
  "data": {
    "instanceId": "uuid",
    "oldStatus": "pending",
    "newStatus": "running"
  }
}
```