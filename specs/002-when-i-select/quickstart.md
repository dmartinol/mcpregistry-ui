# Quickstart: Registry Server Details View

## User Story Validation

This quickstart validates the primary user story: "As a user managing ToolHive registries, when I select a specific registry from the registry list, I want to see detailed information about all servers associated with that registry, including both available servers and currently deployed servers."

## Prerequisites

1. ToolHive Registry Management application running
2. At least one registry configured with servers
3. Some MCPServer resources deployed in Kubernetes

## Test Scenario Steps

### Step 1: Navigate to Registry List
1. Open the ToolHive Registry Management application
2. Verify the registry list page displays
3. Confirm at least one registry is visible with server count > 0

**Expected Result**: Registry list shows registries with server counts

### Step 2: Select Registry for Details
1. Click on a registry entry in the list
2. Wait for navigation to complete

**Expected Result**:
- Navigation to registry detail page occurs
- URL changes to include registry ID
- Page shows registry name and basic info

### Step 3: Verify Available Servers Tab
1. Confirm "Available Servers" tab is selected by default
2. Verify server cards are displayed
3. Check each card shows:
   - Server name
   - Container image name
   - Tags (as chips/badges)
   - Description (if available)
   - Other relevant fields

**Expected Result**:
- Cards display server information clearly
- Material-UI design system consistency maintained
- Loading state shown during data fetch
- Empty state if no servers available

### Step 4: Verify Deployed Servers Tab
1. Click on "Deployed Servers" tab
2. Wait for data to load
3. Verify deployed server cards show:
   - Server name
   - Deployment status
   - Endpoint URL
   - Copy button next to URL

**Expected Result**:
- Tab switches correctly
- Deployed servers displayed as cards
- Copy functionality available for URLs
- Status indicators clearly visible

### Step 5: Test URL Copy Functionality
1. Locate a deployed server with an endpoint URL
2. Click the copy button next to the URL
3. Verify copy feedback (toast/snackbar message)
4. Paste the URL elsewhere to confirm it was copied

**Expected Result**:
- Copy button triggers clipboard action
- User feedback confirms successful copy
- Actual URL is copied correctly

### Step 6: Test Empty States
1. Switch to a registry with no available servers
2. Verify empty state message in Available Servers tab
3. Switch to Deployed Servers tab
4. Verify appropriate empty state if no deployments

**Expected Result**:
- Clear messaging when no data available
- Helpful guidance for next steps
- No broken UI or error states

### Step 7: Test Navigation Back
1. Use breadcrumb or back button to return to registry list
2. Verify navigation works correctly

**Expected Result**:
- Returns to registry list
- List state preserved (pagination, filters)

## Performance Validation

### Response Time Test
1. Use browser dev tools to monitor network requests
2. Navigate to registry details
3. Measure API response times for:
   - Available servers endpoint
   - Deployed servers endpoint

**Expected Result**:
- API responses complete within 200ms (p95)
- UI feedback appears within 100ms of user interaction

### Large Dataset Test
1. Test with registry containing >50 servers
2. Verify smooth scrolling and rendering
3. Check memory usage in browser dev tools

**Expected Result**:
- Smooth performance with large datasets
- No UI freezing or stuttering
- Memory usage remains reasonable

## Accessibility Validation

### Keyboard Navigation
1. Navigate entire interface using only keyboard
2. Tab through all interactive elements
3. Verify focus indicators are visible

**Expected Result**:
- All functionality accessible via keyboard
- Clear focus indicators
- Logical tab order

### Screen Reader Test
1. Use screen reader to navigate interface
2. Verify all content is announced properly
3. Check ARIA labels for buttons and tabs

**Expected Result**:
- Content properly announced
- Interactive elements clearly labeled
- Tab navigation announced correctly

## Error Handling Validation

### Network Error Test
1. Disconnect network while on details page
2. Try switching tabs
3. Verify error handling

**Expected Result**:
- Graceful error messages
- Retry mechanisms available
- No application crashes

### Invalid Registry Test
1. Navigate to non-existent registry ID
2. Verify 404 handling

**Expected Result**:
- Clear error message
- Navigation back to registry list
- No broken UI state

## Success Criteria

✅ **Functional**: All user interactions work as specified
✅ **Performance**: Response times meet constitutional requirements
✅ **Accessibility**: WCAG 2.1 AA compliance verified
✅ **UX Consistency**: Material-UI design system followed
✅ **Error Handling**: Graceful degradation in error scenarios
✅ **Mobile Responsive**: Interface works on different screen sizes

## Regression Checklist

- [ ] Existing registry list functionality unaffected
- [ ] No performance degradation in other parts of app
- [ ] Authentication/authorization still working
- [ ] Other navigation patterns still functional
- [ ] API contracts backward compatible

## Manual Testing Notes

**Browser Compatibility**: Test in Chrome, Firefox, Safari, Edge
**Screen Sizes**: Test on desktop, tablet, mobile viewports
**Network Conditions**: Test on slow 3G connection
**Data Scenarios**: Test with empty, small, and large datasets

This quickstart serves as both implementation validation and ongoing regression test suite.