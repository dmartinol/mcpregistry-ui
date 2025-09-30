# AI Assistant Guidelines - ToolHive Registry Management

**Version**: 2.1.0 | **Last Updated**: 2025-09-30

This document provides essential guidelines and context for AI assistants working on the ToolHive Registry Management Application.

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

## Development Principles

### Code Quality Standards
- Follow test-driven development approach
- Maintain clean, readable code with proper TypeScript typing
- Use established patterns and Material-UI design system
- Ensure accessibility compliance (WCAG 2.1 AA)

### Performance Guidelines
- Keep API responses under 200ms when possible
- Optimize UI interactions for responsiveness
- Use efficient data fetching and caching strategies

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

## Key Data Models

### Registry Interface
```typescript
interface Registry {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  serverCount: number;
  source?: {
    type: 'configmap' | 'git' | 'http' | 'https';
    location: string;
    syncInterval?: string;
  };
  // Additional metadata fields...
}
```

### Server Interface
```typescript
interface Server {
  name: string;
  image: string;
  description?: string;
  tags: string[];
  tier?: string;
  transport?: string;
  logoUrl?: string;
  repository_url?: string;
  // Additional fields for deployment and configuration...
}
```

## Current Implementation Status

### ✅ Implemented Features
- **Registry Dashboard**: Complete with status indicators and server counts
- **Registry Creation**: Form-based creation with Git, HTTP, and ConfigMap sources
- **Server Discovery**: Card-based browsing with search and filtering
- **Server Details**: Multi-tab popups with comprehensive information
- **Logo Integration**: GitHub avatars for visual server identification
- **Deployment Dialog**: Multi-tab configuration with environment variables
- **Manifest Viewer**: YAML/JSON preview with syntax highlighting
- **Instance Management**: Deploy and delete servers with status monitoring
- **Orphaned Server Detection**: Identify unregistered servers

### 🚧 Areas for Enhancement
- Advanced filtering and search capabilities
- Bulk operations for server management
- Enhanced monitoring and alerting features
- Multi-cluster registry support

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

## Important Implementation Details

### Logo Integration
- GitHub organization/user avatars are fetched automatically
- Backend supplements server data with repository information
- Frontend displays logos in both server cards and popups
- Fallback handling for servers without repository data

### Data Flow Architecture
- Backend fetches data from Kubernetes MCPRegistry APIs
- Individual server endpoints provide enhanced data (repository URLs, logos)
- Server list endpoints include supplementation for missing data
- Frontend uses consistent interfaces across components

### Key Components
- `RegistryServerService.ts`: Handles server data fetching and logo integration
- `GitValidationService.ts`: Manages repository validation and logo fetching
- `App.tsx`: Main application with server details dialogs
- `DeployServerDialog.tsx`: Multi-tab deployment configuration
- `ManifestViewer.tsx`: YAML/JSON syntax highlighting

## Common Tasks and Patterns

### Adding New Features
1. **Start with interfaces**: Define TypeScript interfaces for data models
2. **Backend first**: Implement API endpoints with proper validation
3. **Frontend integration**: Create/update components with Material-UI
4. **Test thoroughly**: Run quality gates and functional verification

### Debugging Server Issues
- Check backend logs for API proxy calls and Kubernetes operations
- Verify data transformation in `RegistryServerService.ts`
- Look for console errors in browser developer tools
- Test API endpoints directly with curl/Postman

### UI Component Development
- Use Material-UI components consistently
- Follow established card-based patterns for data display
- Implement proper loading states and error handling
- Ensure responsive design and accessibility

This document provides the essential context for AI assistants working on the ToolHive Registry Management Application.