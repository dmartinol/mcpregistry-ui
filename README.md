# ToolHive Registry Management Application

A comprehensive web-based UI for managing ToolHive registries in Kubernetes clusters. This application enables creating, listing, and inspecting registries, displaying registered servers with details, monitoring deployed instances, and deploying new instances from selected servers.

## Implemented Features

### Registry Management
- **Registry Dashboard**: List all registries with status indicators, server counts, and source information
- **Registry Creation**: Form-based registry creation with Git, HTTP, and ConfigMap sources
- **Registry Details**: Comprehensive view with server listings and deployment status
- **Sync Management**: Manual and automatic registry synchronization

### Server Discovery and Deployment
- **Server Browsing**: Card-based interface with search and filtering by transport, tier, and tags
- **Server Details**: Comprehensive server popups with tabs for overview, tools, config, and installation
- **Logo Integration**: GitHub organization/user avatars for visual server identification
- **Deployment Configuration**: Multi-tab deployment dialog with environment variables and resource configuration
- **Manifest Viewer**: YAML/JSON manifest preview with syntax highlighting

### Instance Management
- **Deployed Server Monitoring**: Track deployed instances with status indicators and endpoints
- **Lifecycle Operations**: Delete deployed servers with confirmation dialogs
- **Orphaned Server Detection**: Identify and manage unregistered servers
- **Real-time Status**: Live updates for server health and readiness

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

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

2. **Start the backend** (terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the frontend** (terminal 2):
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

1. Use TDD approach: write tests before implementation
2. Maintain >90% test coverage
3. Follow TypeScript strict mode
4. Run quality gates before each commit:
   - `npm run typecheck` (both frontend and backend)
   - `npm run lint` (both frontend and backend)
5. Use conventional commit messages

## License

[Add your license here]

## Support

For issues and questions, please create an issue in the repository.