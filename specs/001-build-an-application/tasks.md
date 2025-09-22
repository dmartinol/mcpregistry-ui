# Tasks: ToolHive Registry Management Application

**Input**: Design documents from `/specs/001-build-an-application/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- Paths based on plan.md web application structure

## Phase 3.1: Setup
- [x] T001 Create web application project structure with backend/ and frontend/ directories
- [x] T002 Initialize Node.js 18+ backend project with TypeScript, Express.js, and @kubernetes/client-node dependencies
- [x] T003 [P] Initialize React frontend project with TypeScript, Material-UI, and Axios dependencies
- [x] T004 [P] Configure ESLint, Prettier, and TypeScript strict mode for backend
- [x] T005 [P] Configure ESLint, Prettier, and TypeScript strict mode for frontend
- [x] T006 [P] Setup Jest testing framework for backend in backend/tests/
- [x] T007 [P] Setup Jest and React Testing Library for frontend in frontend/tests/
- [x] T008 [P] Configure Cypress for E2E testing in tests/e2e/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T009 [P] Contract test GET /api/v1/registries in backend/tests/contract/test_registries_list.test.ts
- [x] T010 [P] Contract test POST /api/v1/registries in backend/tests/contract/test_registries_create.test.ts
- [ ] T011 [P] Contract test GET /api/v1/registries/{id} in backend/tests/contract/test_registries_get.test.ts
- [ ] T012 [P] Contract test PUT /api/v1/registries/{id} in backend/tests/contract/test_registries_update.test.ts
- [ ] T013 [P] Contract test DELETE /api/v1/registries/{id} in backend/tests/contract/test_registries_delete.test.ts
- [ ] T014 [P] Contract test POST /api/v1/registries/{id}/sync in backend/tests/contract/test_registries_sync.test.ts
- [ ] T015 [P] Contract test GET /api/v1/registries/{id}/servers in backend/tests/contract/test_servers_list.test.ts
- [ ] T016 [P] Contract test GET /api/v1/servers/{id} in backend/tests/contract/test_servers_get.test.ts
- [ ] T017 [P] Contract test POST /api/v1/servers/{id}/deploy in backend/tests/contract/test_servers_deploy.test.ts
- [ ] T018 [P] Contract test GET /api/v1/instances in backend/tests/contract/test_instances_list.test.ts
- [ ] T019 [P] Contract test GET /api/v1/instances/{id} in backend/tests/contract/test_instances_get.test.ts
- [ ] T020 [P] Contract test DELETE /api/v1/instances/{id} in backend/tests/contract/test_instances_delete.test.ts
- [ ] T021 [P] Contract test POST /api/v1/instances/{id}/scale in backend/tests/contract/test_instances_scale.test.ts
- [ ] T022 [P] Contract test GET /api/v1/instances/{id}/logs in backend/tests/contract/test_instances_logs.test.ts
- [ ] T023 [P] Contract test GET /api/v1/instances/{id}/metrics in backend/tests/contract/test_instances_metrics.test.ts

### Integration Tests
- [x] T024 [P] Integration test registry management workflow in backend/tests/integration/test_registry_workflow.test.ts
- [ ] T025 [P] Integration test server discovery and browsing in backend/tests/integration/test_server_discovery.test.ts
- [ ] T026 [P] Integration test instance deployment workflow in backend/tests/integration/test_instance_deployment.test.ts
- [ ] T027 [P] Integration test instance monitoring and management in backend/tests/integration/test_instance_monitoring.test.ts
- [ ] T028 [P] Integration test error handling and edge cases in backend/tests/integration/test_error_handling.test.ts
- [ ] T029 [P] Integration test multi-user access control in backend/tests/integration/test_access_control.test.ts

### Frontend Component Tests
- [ ] T030 [P] React component test RegistryList in frontend/tests/components/RegistryList.test.tsx
- [ ] T031 [P] React component test RegistryForm in frontend/tests/components/RegistryForm.test.tsx
- [ ] T032 [P] React component test ServerBrowser in frontend/tests/components/ServerBrowser.test.tsx
- [ ] T033 [P] React component test InstanceMonitor in frontend/tests/components/InstanceMonitor.test.tsx
- [ ] T034 [P] React component test DeploymentForm in frontend/tests/components/DeploymentForm.test.tsx

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models
- [x] T035 [P] Registry model with validation in backend/src/models/Registry.ts
- [ ] T036 [P] Server model with validation in backend/src/models/Server.ts
- [ ] T037 [P] Instance model with validation in backend/src/models/Instance.ts
- [ ] T038 [P] Deployment model with validation in backend/src/models/Deployment.ts
- [ ] T039 [P] Cluster model with validation in backend/src/models/Cluster.ts
- [ ] T040 [P] MonitoringMetrics model with validation in backend/src/models/MonitoringMetrics.ts

### Services Layer
- [x] T041 RegistryService with CRUD operations in backend/src/services/RegistryService.ts
- [ ] T042 ServerService with discovery operations in backend/src/services/ServerService.ts
- [ ] T043 InstanceService with lifecycle management in backend/src/services/InstanceService.ts
- [ ] T044 DeploymentService with K8s operations in backend/src/services/DeploymentService.ts
- [ ] T045 KubernetesClient with connection management in backend/src/services/KubernetesClient.ts
- [ ] T046 MonitoringService with metrics collection in backend/src/services/MonitoringService.ts

### API Endpoints
- [x] T047 Registry endpoints (GET, POST, PUT, DELETE) in backend/src/api/registries.ts
- [ ] T048 Server endpoints (GET, deploy) in backend/src/api/servers.ts
- [ ] T049 Instance endpoints (GET, DELETE, scale, logs, metrics) in backend/src/api/instances.ts
- [ ] T050 WebSocket handler for real-time updates in backend/src/api/websocket.ts

### Frontend Components
- [x] T051 [P] Registry dashboard component in frontend/src/components/RegistryDashboard.tsx
- [x] T052 [P] Registry list component in frontend/src/components/RegistryList.tsx
- [x] T053 [P] Registry form component in frontend/src/components/RegistryForm.tsx
- [ ] T054 [P] Server browser component in frontend/src/components/ServerBrowser.tsx
- [ ] T055 [P] Server details component in frontend/src/components/ServerDetails.tsx
- [ ] T056 [P] Instance monitor component in frontend/src/components/InstanceMonitor.tsx
- [ ] T057 [P] Instance details component in frontend/src/components/InstanceDetails.tsx
- [ ] T058 [P] Deployment form component in frontend/src/components/DeploymentForm.tsx
- [ ] T059 [P] Metrics chart component in frontend/src/components/MetricsChart.tsx

### Frontend Services
- [x] T060 [P] API client service in frontend/src/services/ApiClient.ts
- [ ] T061 [P] WebSocket service for real-time updates in frontend/src/services/WebSocketService.ts
- [ ] T062 [P] Authentication service in frontend/src/services/AuthService.ts

## Phase 3.4: Integration
- [ ] T063 Connect RegistryService to Kubernetes API for MCPRegistry resources
- [ ] T064 Connect ServerService to ToolHive registry APIs
- [ ] T065 Connect InstanceService to Kubernetes API for MCPServer resources
- [ ] T066 Implement RBAC middleware for namespace-based access control
- [ ] T067 Setup WebSocket connections for real-time K8s resource updates
- [ ] T068 Implement request/response logging and audit trails
- [ ] T069 Configure CORS and security headers for production deployment
- [ ] T070 Setup performance monitoring and metrics collection

## Phase 3.5: Polish
- [ ] T071 [P] Unit tests for Registry validation in backend/tests/unit/test_registry_validation.test.ts
- [ ] T072 [P] Unit tests for Kubernetes client in backend/tests/unit/test_kubernetes_client.test.ts
- [ ] T073 [P] Unit tests for monitoring service in backend/tests/unit/test_monitoring_service.test.ts
- [ ] T074 [P] Performance tests for API response times in backend/tests/performance/test_api_performance.test.ts
- [ ] T075 [P] E2E tests for complete user workflows in tests/e2e/test_user_workflows.spec.ts
- [ ] T076 [P] Accessibility tests for WCAG 2.1 AA compliance in frontend/tests/a11y/test_accessibility.test.ts
- [ ] T077 [P] Update API documentation in docs/api.md
- [ ] T078 [P] Create deployment documentation in docs/deployment.md
- [ ] T079 [P] Setup Helm chart for Kubernetes deployment in charts/registry-ui/
- [ ] T080 Remove code duplication and optimize performance
- [ ] T081 Execute quickstart validation scenarios

## Dependencies
- Tests (T009-T034) before implementation (T035-T070)
- T035-T040 (models) before T041-T046 (services)
- T041-T046 (services) before T047-T050 (API endpoints)
- T051-T062 (frontend) can run parallel with backend after models complete
- T063-T070 (integration) before T071-T081 (polish)

## Parallel Example
```
# Launch contract tests together (T009-T023):
Task: "Contract test GET /api/v1/registries in backend/tests/contract/test_registries_list.test.ts"
Task: "Contract test POST /api/v1/registries in backend/tests/contract/test_registries_create.test.ts"
Task: "Contract test GET /api/v1/registries/{id} in backend/tests/contract/test_registries_get.test.ts"
...

# Launch model creation together (T035-T040):
Task: "Registry model with validation in backend/src/models/Registry.ts"
Task: "Server model with validation in backend/src/models/Server.ts"
Task: "Instance model with validation in backend/src/models/Instance.ts"
...

# Launch frontend components together (T051-T059):
Task: "Registry dashboard component in frontend/src/components/RegistryDashboard.tsx"
Task: "Registry list component in frontend/src/components/RegistryList.tsx"
Task: "Registry form component in frontend/src/components/RegistryForm.tsx"
...
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all contract tests fail before implementing
- Commit after each major milestone
- Follow constitutional testing standards (>90% coverage)
- Maintain performance requirements (<200ms API, <100ms UI)

## Task Generation Rules Applied
1. **From Contracts**: 15 contract test tasks for all API endpoints
2. **From Data Model**: 6 model creation tasks for all entities
3. **From User Stories**: 6 integration test tasks for user workflows
4. **From Architecture**: Services, API endpoints, frontend components
5. **Ordering**: Setup → Tests → Models → Services → Endpoints → Integration → Polish
6. **Parallelization**: Different files marked [P], same files sequential