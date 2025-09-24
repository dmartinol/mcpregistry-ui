# Orphaned Servers Implementation Plan

## Overview
Implement a feature to detect and manage "orphaned" MCPServers - servers that exist in Kubernetes but are not connected to any MCPRegistry through the expected labels.

## Requirements Analysis

### Orphaned Server Definition
An orphaned server is an MCPServer instance that lacks the required registry connection labels:
- `toolhive.stacklok.io/registry-name`
- `toolhive.stacklok.io/registry-namespace`
- `toolhive.stacklok.io/server-name`

### UI Requirements
- Separate tab/view for orphaned servers in the selected namespace
- Card-based display showing: name, transport, port, URL, image, deployment status
- "Connect to registry" functionality to add registry labels

## Implementation Tasks

### Phase 1: Backend Infrastructure
1. **Add Orphaned Servers Detection Method**
   - Extend `KubernetesClient.ts` with `getOrphanedMCPServers()` method
   - Filter MCPServers without required registry labels
   - Return enriched server data with status information

2. **Create API Endpoint**
   - Add `GET /api/v1/orphaned-servers` endpoint in `app.ts`
   - Support namespace filtering via query parameter
   - Return orphaned servers with proper error handling

3. **Add Connect to Registry Endpoint**
   - Add `POST /api/v1/orphaned-servers/:serverId/connect` endpoint
   - Accept registry selection and update server labels
   - Validate registry exists before connecting

### Phase 2: Frontend Components
4. **Create OrphanedServerCard Component**
   - Display server information in card format
   - Show status badges and technical details
   - Include "Connect to Registry" button

5. **Create ConnectToRegistryDialog Component**
   - Registry selection dropdown
   - Server name mapping input
   - Confirmation and error handling

6. **Update Main Application**
   - Add "Orphaned Servers" tab to main navigation
   - Integrate orphaned servers view with namespace filtering
   - Add API service methods for orphaned servers

### Phase 3: Integration & Features
7. **API Service Integration**
   - Add `getOrphanedServers()` method to `api.ts`
   - Add `connectServerToRegistry()` method
   - Handle error cases and loading states

8. **State Management**
   - Add orphaned servers state to main App component
   - Implement refresh functionality
   - Handle real-time updates after connection

9. **Error Handling & UX**
   - Loading states for orphaned servers
   - Error messages for connection failures
   - Success feedback after connecting servers

### Phase 4: Testing & Polish
10. **Manual Testing**
    - Create test orphaned servers
    - Verify detection and display
    - Test connection functionality

11. **Edge Cases**
    - Handle servers with partial labels
    - Validate against non-existent registries
    - Proper cleanup after connection

## Technical Details

### Backend Schema
```typescript
interface OrphanedServer {
  name: string;
  namespace: string;
  transport: string;
  port: number;
  targetPort: number;
  url?: string;
  image: string;
  status: 'Pending' | 'Running' | 'Failed' | 'Terminating';
  ready: boolean;
  createdAt: string;
  labels?: Record<string, string>;
}
```

### API Endpoints
- `GET /api/v1/orphaned-servers?namespace=<ns>` - List orphaned servers
- `POST /api/v1/orphaned-servers/:serverId/connect` - Connect server to registry

### Frontend Structure
```
src/
  components/
    OrphanedServerCard.tsx
    ConnectToRegistryDialog.tsx
  pages/
    OrphanedServersView.tsx (or integrate into main App)
```

## Success Criteria
- [ ] Orphaned servers are correctly identified and displayed
- [ ] Users can view orphaned servers in a dedicated UI section
- [ ] Users can connect orphaned servers to existing registries
- [ ] Connected servers move from orphaned to registry-managed state
- [ ] All operations include proper error handling and user feedback

## Notes
- Ensure namespace-aware operations throughout
- Maintain consistency with existing UI patterns
- Consider adding batch operations for multiple servers
- Future: Add notifications for newly orphaned servers