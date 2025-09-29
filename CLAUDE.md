# ToolHive Registry Management - Development Guidelines

**Version**: 2.0.0 | **Last Updated**: 2025-09-24

This document serves as the single source of truth for AI assistants working on the ToolHive Registry Management Application. It consolidates all development principles, technical specifications, and implementation guidelines.

## 🚨 CRITICAL COMPLETION REQUIREMENTS 🚨

**MANDATORY QUALITY GATES - MUST BE VERIFIED AFTER EVERY TASK/REQUEST:**

1. **✅ TypeScript Compilation**: `npm run typecheck` MUST pass without errors in both frontend and backend
2. **✅ ESLint Validation**: `npm run lint` MUST pass without errors in both frontend and backend
3. **✅ Code Formatting**: All code MUST follow established formatting standards
4. **✅ No Console Errors**: Browser console MUST be free of JavaScript errors
5. **✅ Functional Verification**: All modified functionality MUST be manually tested

**⚠️ FAILURE TO VERIFY THESE REQUIREMENTS CONSTITUTES INCOMPLETE WORK ⚠️**

AI assistants MUST run these checks immediately after any code changes and fix all issues before considering a task complete. No exceptions.

## Project Overview

The ToolHive Registry Management Application is a comprehensive web-based interface for managing ToolHive registries in Kubernetes clusters. It provides capabilities for registry lifecycle management, server discovery and deployment, instance monitoring, and multi-tenant access control through a modern React-based UI integrated with Kubernetes APIs.

**Primary Use Cases:**
- Create, list, and inspect ToolHive registries
- Browse and filter available MCP servers within registries
- Deploy server instances to Kubernetes clusters
- Monitor deployed instance health and resource consumption
- Manage instance lifecycle (scaling, termination, configuration)

## Core Architecture Principles

### I. Code Quality (NON-NEGOTIABLE)
All code MUST follow test-driven development: tests written first, implementation second. Code MUST be maintainable with clear naming, proper documentation, and modular architecture. Static analysis tools MUST pass without warnings. Code reviews MUST verify adherence to style guides and architectural patterns.

**Rationale**: High-quality code reduces technical debt, improves maintainability, and ensures reliability in the MCP registry interface that developers depend on.

### II. Testing Standards
Comprehensive testing is MANDATORY: unit tests for all business logic, integration tests for API contracts, end-to-end tests for critical user workflows. Test coverage MUST be above 90%. Tests MUST be deterministic and fast (<5s for unit tests, <30s for integration tests). Contract testing MUST validate MCP protocol compliance.

**Rationale**: The registry UI is a critical interface for MCP server discovery; comprehensive testing ensures reliability and protocol compliance.

### III. User Experience Consistency
All UI components MUST follow the established design system. User interactions MUST be predictable and accessible (WCAG 2.1 AA compliance). Loading states, error messages, and feedback MUST be consistent across all features. No feature ships without UX review and user testing validation.

**Rationale**: Consistent UX reduces cognitive load for developers browsing the registry and ensures accessibility for all users.

### IV. Performance Requirements
API responses MUST complete within 200ms (p95). UI interactions MUST feel responsive (<100ms feedback). Page loads MUST complete within 2 seconds on 3G networks. Memory usage MUST remain under 100MB for typical user sessions. Performance budgets MUST be monitored and enforced in CI/CD.

**Rationale**: Fast performance is essential for developer productivity when searching and discovering MCP servers.

### V. Security & Compliance
All user data MUST be encrypted in transit and at rest. Authentication MUST use secure protocols (OAuth 2.0/OIDC). Input validation MUST prevent injection attacks. Security headers MUST be properly configured. Regular security audits MUST be conducted and vulnerabilities addressed within 48 hours.

**Rationale**: Registry data and user information must be protected to maintain trust in the MCP ecosystem.

## Technical Stack

**Language/Version**: TypeScript 5.3, Node.js 18+
**Primary Dependencies**:
- Frontend: React 18, Material-UI 5, Vite, React Router DOM
- Backend: Express.js, Kubernetes client-node, Joi validation
**Storage**: Kubernetes API (MCPRegistry/MCPServer CRDs), no additional database
**Testing**: Jest (unit/integration), React Testing Library (frontend), Supertest (backend API), Cypress (E2E)
**Target Platform**: Web application (modern browsers), Kubernetes clusters
**Project Type**: web - Frontend + Backend architecture
**Performance Goals**: <200ms API responses, <100ms UI interactions, <2s page loads
**Constraints**: WCAG 2.1 AA accessibility, >90% test coverage, Kubernetes API rate limits

## Project Structure

```
backend/
├── src/
│   ├── models/           # Data models and validation schemas
│   ├── services/         # Business logic and Kubernetes integration
│   ├── api/             # REST API routes and middleware
│   └── types/           # TypeScript type definitions
└── tests/
    ├── unit/            # Unit tests for services and models
    ├── integration/     # API endpoint integration tests
    └── contract/        # Kubernetes contract tests

frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route-based page components
│   ├── services/       # API client and data services
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Utility functions
└── tests/
    ├── unit/           # Component unit tests
    ├── integration/    # User flow integration tests
    └── e2e/           # End-to-end Cypress tests
```

## Commands

**Frontend Development**:
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm test` - Run Jest unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - ESLint code analysis
- `npm run typecheck` - TypeScript type checking

**Backend Development**:
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run Jest unit and integration tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - ESLint code analysis
- `npm run typecheck` - TypeScript type checking

**Full Stack Testing**:
- `npm run test:e2e` - Run Cypress end-to-end tests
- `npm run test:contract` - Run Kubernetes contract tests

## Code Style and Standards

### TypeScript Guidelines
- Strict type checking enabled (`strict: true`)
- Use interfaces for data models and API contracts
- Prefer explicit return types for all functions
- Use Joi for runtime validation schemas
- Implement proper error handling with typed exceptions
- Follow functional programming patterns where appropriate

### React Development Patterns
- Material-UI design system for all components
- Functional components with React hooks
- React Testing Library for component testing
- Card-based UI patterns for data display
- Responsive design with mobile-first approach
- Accessibility compliance (WCAG 2.1 AA)

### API Design Standards
- RESTful endpoints with standard HTTP methods
- OpenAPI 3.0 specifications for documentation
- Express.js middleware patterns for cross-cutting concerns
- Kubernetes client-node for CRD access and operations
- Comprehensive request/response validation
- Consistent error response formats

## Core Entities and Data Models

### Registry
Represents a ToolHive registry containing server definitions.

```typescript
interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  serverCount: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    namespace: string;
    uid: string;
    phase?: string;
  };
  source?: {
    type: 'configmap' | 'git' | 'http' | 'https';
    location: string;
    syncInterval?: string;
  };
}
```

### Server (Available and Deployed)
Represents server definitions and deployed instances.

```typescript
interface Server {
  name: string;
  image: string;
  version?: string;
  description?: string;
  tags: string[];
  capabilities?: string[];
  author?: string;
  repository?: string;
  documentation?: string;
  tier?: string;
  transport?: string;
  tools?: string[];
  tools_count?: number;
  status?: string;
  endpoint_url?: string;
  ready?: boolean;
  namespace?: string;
  env_vars?: Array<{
    name: string;
    description: string;
    required: boolean;
    secret?: boolean;
    default?: string;
  }>;
  metadata?: {
    last_updated?: string;
    pulls?: number;
    stars?: number;
  };
  repository_url?: string;
}
```

## Key Features and Implementation

### Registry Management
- **Registry Dashboard**: List all registries with status indicators, server counts, and source information
- **Registry Creation**: Form-based registry creation with validation
- **Registry Details**: Comprehensive view with server listings and deployment status
- **Sync Management**: Manual and automatic registry synchronization

### Server Discovery and Deployment
- **Server Browsing**: Card-based interface with filtering and search
- **Server Details**: Comprehensive server information with deployment options
- **Deployment Configuration**: Form-based deployment with environment variables
- **Instance Management**: Lifecycle operations for deployed servers

### Monitoring and Management
- **Real-time Status**: WebSocket-based updates for instance status
- **Resource Monitoring**: CPU, memory, and network usage metrics
- **Log Access**: Container log streaming and historical access
- **Health Monitoring**: Health check status and alerting

### Multi-tenancy and Security
- **Namespace Isolation**: RBAC-based access control
- **Authentication**: Kubernetes ServiceAccount integration
- **Authorization**: Role-based permissions for operations
- **Audit Logging**: Comprehensive operation tracking

## Development Workflow

### Test-Driven Development
1. Write failing tests for new functionality
2. Implement minimum code to pass tests
3. Refactor while maintaining test coverage
4. **MANDATORY**: Run all quality gates before considering task complete
5. Ensure >90% test coverage before merge

### Code Review Process
1. All changes require pull request review
2. Automated checks: linting, type checking, tests
3. Manual review for architectural compliance
4. Performance impact assessment
5. Security review for sensitive changes

### Quality Gates (MANDATORY AFTER EVERY CHANGE)
- **CRITICAL**: ESLint and Prettier formatting compliance (`npm run lint`)
- **CRITICAL**: TypeScript compilation without errors (`npm run typecheck`)
- **CRITICAL**: No console errors in browser
- **CRITICAL**: Manual functional verification of changes
- Test coverage >90% for new code
- Performance benchmarks within constitutional limits
- Accessibility compliance verification

**⚠️ ALL CRITICAL QUALITY GATES MUST PASS BEFORE TASK COMPLETION ⚠️**

## Integration Patterns

### Kubernetes API Integration
- Use @kubernetes/client-node for all Kubernetes operations
- Implement resource watching for real-time updates
- Handle authentication through ServiceAccount tokens
- Implement proper error handling and retry logic
- Cache frequently accessed data with appropriate TTL

### Registry API Integration
- Support multiple registry formats and versions
- Implement fallback mechanisms for API failures
- Transform registry data to internal format
- Validate server definitions against schema
- Handle authentication and rate limiting

### Real-time Updates
- WebSocket connections for status updates
- Server-sent events for log streaming
- Optimistic UI updates with conflict resolution
- Graceful degradation when real-time unavailable

## Performance and Scalability

### Caching Strategy
- Registry server lists: 5 minutes TTL
- Instance status: 30 seconds TTL
- Monitoring metrics: 15 seconds TTL
- User session data: Redis with appropriate expiration

### API Performance
- Connection pooling for Kubernetes API clients
- Request debouncing for frequent operations
- Pagination for large data sets
- Lazy loading for expensive operations

### UI Performance
- Component lazy loading and code splitting
- Virtual scrolling for large lists
- Optimized re-rendering with React.memo
- Image optimization and lazy loading

## Security Considerations

### Authentication and Authorization
- Kubernetes RBAC integration
- Namespace-based access control
- Service account token validation
- Role-based UI feature access

### Data Protection
- HTTPS for all client-server communication
- Input validation and sanitization
- SQL injection prevention (though no SQL used)
- XSS protection with CSP headers

### Secrets Management
- Kubernetes secrets for sensitive configuration
- Environment variable protection
- No hardcoded credentials in source code
- Secure secret rotation procedures

## Recent Feature Implementations

### Registry Server Details View (002-when-i-select)
- Added comprehensive registry details page with tabbed navigation
- Implemented available servers tab with Material-UI card layout
- Created deployed servers tab with endpoint URLs and copy functionality
- Added search and filtering capabilities across servers
- Implemented server deployment dialog with configuration options
- Added manifest viewer with YAML/JSON formatting and code folding
- Integrated delete confirmation for deployed servers

**Key Technical Details:**
- Server data transformation in `RegistryServerService.ts` with comprehensive error handling
- Tags preservation logic for fallback scenarios when registry API fails
- YAML formatting with proper array indentation in `ManifestViewer.tsx`
- Clipboard integration for copying endpoints and manifests
- Real-time status updates through Kubernetes API watching

### Registry Management Foundation (001-build-an-application)
- Built core registry management interface
- Implemented Kubernetes CRD integration for MCPRegistry resources
- Created responsive Material-UI based dashboard
- Added registry creation and lifecycle management
- Implemented RBAC-based security model

## Error Handling and Debugging

### Frontend Error Handling
- Global error boundaries for React components
- User-friendly error messages with actionable guidance
- Automatic retry mechanisms for transient failures
- Graceful degradation when services unavailable

### Backend Error Handling
- Structured error responses with consistent format
- Kubernetes API error translation and retry logic
- Comprehensive logging with structured data
- Health check endpoints for monitoring

### Debugging Strategies
- Comprehensive logging with correlation IDs
- Performance monitoring and alerting
- Error aggregation and analysis
- Debug mode for development environments

## Future Roadmap Considerations

### Planned Enhancements
- Advanced filtering and search capabilities
- Bulk operations for server management
- Registry federation and multi-cluster support
- Enhanced monitoring and alerting features
- API versioning and backward compatibility

### Technical Debt Management
- Regular dependency updates and security patches
- Performance optimization and monitoring
- Code refactoring for maintainability
- Documentation updates and API evolution

This document serves as the comprehensive guide for all development activities on the ToolHive Registry Management Application. It should be updated as new features are implemented and architectural decisions are made.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->