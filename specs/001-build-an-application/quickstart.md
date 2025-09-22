# Quickstart: ToolHive Registry Management Application

## Overview
This quickstart guide validates the core functionality of the ToolHive Registry Management Application through step-by-step scenarios that mirror real user workflows.

## Prerequisites
- Kubernetes cluster with ToolHive operator installed
- kubectl access with appropriate RBAC permissions
- Application deployed and accessible
- At least one ToolHive registry available for testing

## Test Scenarios

### Scenario 1: Registry Management Workflow
**Objective**: Validate complete registry lifecycle management

#### 1.1 Create New Registry
**Steps:**
1. Navigate to application dashboard
2. Click "Add Registry" button
3. Enter registry details:
   - Name: `test-registry-001`
   - URL: `https://registry.example.com/api/v1`
   - Description: `Test registry for validation`
4. Click "Create Registry"

**Expected Results:**
- Registry appears in registry list with "syncing" status
- After sync completion, status changes to "active"
- Server count shows number > 0
- Last sync timestamp is current

#### 1.2 Inspect Registry Details
**Steps:**
1. Click on newly created registry from list
2. Verify registry details page displays:
   - Configuration information
   - Server count and categories
   - Sync history

**Expected Results:**
- All registry metadata displayed correctly
- Server list shows available servers with categories
- Sync history shows successful synchronization

#### 1.3 Update Registry Configuration
**Steps:**
1. From registry details, click "Edit"
2. Update description to `Updated test registry`
3. Save changes

**Expected Results:**
- Changes saved successfully
- Updated description displayed
- No impact on server synchronization

### Scenario 2: Server Discovery and Browsing
**Objective**: Validate server browsing and filtering capabilities

#### 2.1 Browse Available Servers
**Steps:**
1. Navigate to "Servers" section
2. Verify server list displays with:
   - Server names and descriptions
   - Categories and tiers
   - Version information
   - Pull counts

**Expected Results:**
- All servers from active registries displayed
- Sorting and pagination working
- Category filters functional

#### 2.2 Search and Filter Servers
**Steps:**
1. Use search box to find servers containing "database"
2. Apply tier filter for "official" servers only
3. Filter by "stdio" transport type

**Expected Results:**
- Search results update in real-time
- Filters combine correctly (AND logic)
- Result count updates appropriately

#### 2.3 View Server Details
**Steps:**
1. Click on a specific server from list
2. Verify server details page shows:
   - Full description and capabilities
   - Network permissions
   - Deployment requirements
   - Repository link

**Expected Results:**
- Complete server information displayed
- Deployment button enabled if server is available
- Links to external resources work

### Scenario 3: Instance Deployment Workflow
**Objective**: Validate server deployment and instance management

#### 3.1 Deploy Server Instance
**Steps:**
1. From server details page, click "Deploy"
2. Configure deployment:
   - Name: `test-instance-001`
   - Namespace: `default`
   - Replicas: `1`
   - Resource limits: Default values
3. Click "Deploy Instance"

**Expected Results:**
- Deployment initiated message displayed
- Deployment ID provided for tracking
- Redirect to instance monitoring page

#### 3.2 Monitor Deployment Progress
**Steps:**
1. Navigate to "Instances" section
2. Find newly created instance
3. Monitor status progression:
   - Initially: "pending" status
   - Progress to: "running" status
   - Health check: "healthy"

**Expected Results:**
- Instance appears in list within 30 seconds
- Status updates automatically
- Deployment completes within 2 minutes

#### 3.3 View Instance Details
**Steps:**
1. Click on deployed instance
2. Verify instance details display:
   - Configuration information
   - Resource usage metrics
   - Recent events
   - Container status

**Expected Results:**
- All instance metadata visible
- Resource metrics showing current usage
- Events log shows deployment progress

### Scenario 4: Instance Monitoring and Management
**Objective**: Validate instance lifecycle management and monitoring

#### 4.1 View Instance Logs
**Steps:**
1. From instance details, click "View Logs"
2. Verify log display shows:
   - Recent log entries (last 100 lines)
   - Timestamp and log level
   - Formatted output

**Expected Results:**
- Logs load within 5 seconds
- Log entries properly formatted
- Real-time log streaming available

#### 4.2 Scale Instance
**Steps:**
1. From instance details, click "Scale"
2. Change replica count to `2`
3. Confirm scaling operation

**Expected Results:**
- Scaling operation initiated
- Replica count updates to show desired: 2
- New pod deployment visible in events

#### 4.3 Monitor Resource Usage
**Steps:**
1. Navigate to metrics tab
2. View resource usage charts:
   - CPU utilization over time
   - Memory usage trends
   - Network I/O statistics

**Expected Results:**
- Metrics display for last hour
- Charts show actual resource consumption
- Data updates every 30 seconds

### Scenario 5: Error Handling and Edge Cases
**Objective**: Validate application behavior under error conditions

#### 5.1 Handle Registry Connection Failure
**Steps:**
1. Create registry with invalid URL: `https://invalid.registry.url`
2. Attempt to sync registry

**Expected Results:**
- Registry creation succeeds
- Sync fails with clear error message
- Registry status shows "error"
- Error details available in sync history

#### 5.2 Handle Deployment Failure
**Steps:**
1. Attempt to deploy to non-existent namespace: `invalid-namespace`
2. Monitor deployment status

**Expected Results:**
- Deployment fails with clear error message
- Instance status shows "failed"
- Events log shows specific error reason
- Cleanup of failed resources occurs

#### 5.3 Handle Insufficient Resources
**Steps:**
1. Deploy instance with very high resource requirements:
   - CPU: `10000m`
   - Memory: `100Gi`
2. Monitor deployment

**Expected Results:**
- Deployment shows "pending" status
- Events indicate insufficient resources
- Clear error message about resource constraints

### Scenario 6: Multi-User Access Control
**Objective**: Validate RBAC and namespace isolation

#### 6.1 Namespace Access Control
**Steps:**
1. Deploy instance to namespace `team-a`
2. Switch to user with access only to `team-b`
3. Verify instance visibility

**Expected Results:**
- User sees only instances in accessible namespaces
- Deployment attempts to unauthorized namespaces fail
- Clear authorization error messages

#### 6.2 Registry Permissions
**Steps:**
1. User with read-only permissions attempts to:
   - Create new registry
   - Deploy instance
   - Delete instance

**Expected Results:**
- All write operations fail with permission errors
- Read operations (viewing, browsing) succeed
- Clear permission error messages displayed

## Performance Validation

### Response Time Requirements
All API operations must complete within constitutional limits:
- Registry list: < 200ms
- Server browsing: < 200ms
- Instance deployment: < 500ms (initiation)
- Log retrieval: < 1000ms
- Metrics loading: < 2000ms

### UI Responsiveness
All user interactions must provide feedback within:
- Button clicks: < 100ms
- Page navigation: < 500ms
- Search results: < 300ms
- Auto-refresh updates: < 250ms

### Concurrent User Testing
Application must handle:
- 10 concurrent users browsing
- 5 simultaneous deployments
- 3 active log streaming sessions
- Multiple registry sync operations

## Success Criteria

### Functional Requirements Validation
- ✅ Registry creation, listing, and inspection
- ✅ Server browsing with filtering and search
- ✅ Instance deployment and configuration
- ✅ Real-time monitoring and metrics
- ✅ Log access and streaming
- ✅ Scaling and lifecycle management
- ✅ Error handling and recovery

### Non-Functional Requirements Validation
- ✅ Performance meets constitutional requirements
- ✅ UI responsive and accessible
- ✅ Security and access control enforced
- ✅ Resource usage within limits
- ✅ Integration with K8s ecosystem

### Integration Testing Checklist
- [ ] All API endpoints respond correctly
- [ ] Kubernetes integration working
- [ ] RBAC enforcement active
- [ ] Real-time updates functioning
- [ ] Error handling graceful
- [ ] Performance requirements met
- [ ] Accessibility compliance verified
- [ ] Multi-user scenarios validated

## Troubleshooting Common Issues

### Registry Sync Failures
**Symptoms**: Registry stuck in "syncing" status
**Solutions**:
1. Check registry URL accessibility
2. Verify authentication credentials
3. Review network policies
4. Check operator logs

### Deployment Failures
**Symptoms**: Instances remain in "pending" status
**Solutions**:
1. Verify namespace exists and accessible
2. Check resource quotas and limits
3. Review RBAC permissions
4. Examine cluster capacity

### Performance Issues
**Symptoms**: Slow response times or UI lag
**Solutions**:
1. Check cluster resource availability
2. Review network connectivity
3. Verify database performance
4. Monitor application metrics

### Access Control Problems
**Symptoms**: Permission denied errors
**Solutions**:
1. Verify service account permissions
2. Check namespace RBAC configuration
3. Review user role bindings
4. Validate cluster admin access

This quickstart guide ensures all core functionality works as designed and validates the application meets both functional and constitutional requirements.