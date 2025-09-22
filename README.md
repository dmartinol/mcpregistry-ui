# ToolHive Registry Management Application

A comprehensive web-based UI for managing ToolHive registries in Kubernetes clusters. This application enables creating, listing, and inspecting registries, displaying registered servers with details, monitoring deployed instances, and deploying new instances from selected servers.

## Features

- **Registry Management**: Create, list, inspect, and sync ToolHive registries
- **Server Discovery**: Browse available servers with filtering and search capabilities
- **Instance Deployment**: Deploy servers as instances to Kubernetes clusters
- **Real-time Monitoring**: Monitor deployed instances with health and resource metrics
- **Access Control**: Namespace-based RBAC integration with Kubernetes

## Architecture

- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Integration**: Kubernetes API + ToolHive operator
- **Testing**: Jest (unit/integration) + Cypress (E2E)

## Prerequisites

- Node.js 18+
- Kubernetes cluster with ToolHive operator installed
- kubectl configured with cluster access
- RBAC permissions for MCPRegistry and MCPServer resources

## Quick Start

### Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd registry_ui
   npm install
   ```

2. **Backend setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend setup** (new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Production Deployment

Using Helm chart:
```bash
helm install registry-ui ./charts/registry-ui --namespace toolhive-system
```

## Project Structure

```
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── models/         # Data models and validation
│   │   ├── services/       # Business logic services
│   │   └── api/           # REST API endpoints
│   └── tests/             # Backend tests
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client services
│   │   └── pages/         # Application pages
│   └── tests/            # Frontend tests
├── tests/e2e/            # End-to-end tests
├── charts/               # Helm deployment charts
└── docs/                 # Documentation
```

## API Documentation

### Registry Endpoints

- `GET /api/v1/registries` - List all registries
- `POST /api/v1/registries` - Create new registry
- `GET /api/v1/registries/{id}` - Get registry details
- `PUT /api/v1/registries/{id}` - Update registry
- `DELETE /api/v1/registries/{id}` - Delete registry
- `POST /api/v1/registries/{id}/sync` - Sync registry

### Server Endpoints

- `GET /api/v1/registries/{id}/servers` - List servers in registry
- `GET /api/v1/servers/{id}` - Get server details
- `POST /api/v1/servers/{id}/deploy` - Deploy server instance

### Instance Endpoints

- `GET /api/v1/instances` - List all instances
- `GET /api/v1/instances/{id}` - Get instance details
- `DELETE /api/v1/instances/{id}` - Terminate instance
- `POST /api/v1/instances/{id}/scale` - Scale instance
- `GET /api/v1/instances/{id}/logs` - Get instance logs
- `GET /api/v1/instances/{id}/metrics` - Get instance metrics

## Development

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npm run type-check
```

### Building

```bash
# Build both frontend and backend
npm run build

# Build individually
cd backend && npm run build
cd frontend && npm run build
```

## Configuration

### Environment Variables

See `.env.example` files in backend/ and frontend/ directories for configuration options.

### Kubernetes RBAC

Required permissions for the application service account:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: registry-ui-role
rules:
- apiGroups: ["toolhive.stacklok.dev"]
  resources: ["mcpregistries", "mcpservers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
```

## Contributing

1. Follow the constitutional principles defined in `.specify/memory/constitution.md`
2. Use TDD approach: write tests before implementation
3. Maintain >90% test coverage
4. Follow TypeScript strict mode
5. Use conventional commit messages

## License

[Add your license here]

## Support

For issues and questions, please create an issue in the repository.