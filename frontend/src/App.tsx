import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Home as HomeIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { DeployServerDialog } from './components/DeployServerDialog';
import { ManifestViewer } from './components/ManifestViewer';
import { CreateRegistryDialog, CreateMCPRegistryRequest } from './components/CreateRegistryDialog';
import { ResponsiveRegistryView } from './components/ResponsiveRegistryView';
import { ResponsiveRegistryDetailView } from './components/ResponsiveRegistryDetailView';
import { ResponsiveOrphanedServersView } from './components/ResponsiveOrphanedServersView';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { api, DeploymentConfig, MCPRegistryRequest } from './services/api';
import { getDisplayName } from './utils/displayNames';

export interface Registry {
  id: string;
  name: string;
  url: string;
  status: string;
  serverCount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  metadata?: {
    namespace: string;
    uid: string;
    phase?: string;
    [key: string]: any;
  };
  source?: {
    type: 'configmap' | 'git' | 'http' | 'https';
    location: string;
    syncInterval?: string;
  };
  syncStatus?: {
    lastAttempt?: string;
    lastSyncHash?: string;
    lastSyncTime?: string;
    message?: string;
    phase?: 'Idle' | 'Syncing' | 'Error' | 'Pending';
    serverCount?: number;
  };
}


interface Server {
  name: string;
  image: string;
  version?: string;
  description?: string;
  tags?: string[];
  capabilities?: string[];
  author?: string;
  repository?: string;
  documentation?: string;
  // Additional fields for enhanced UI
  tier?: string;
  transport?: string;
  tools?: string[];
  tools_count?: number;
  status?: string;
  endpoint_url?: string;
  ready?: boolean;
  namespace?: string;
  // Enhanced fields from individual server endpoint
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
  logoUrl?: string;
}

interface ServersResponse {
  servers: Server[];
  total: number;
  limit: number;
  offset: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`registry-tabpanel-${index}`}
      aria-labelledby={`registry-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `registry-tab-${index}`,
    'aria-controls': `registry-tabpanel-${index}`,
  };
}


const RegistryDashboard: React.FC = () => {
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentNamespace, setCurrentNamespace] = useState('toolhive-system');
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  // Manifest viewer state
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [manifestTitle, setManifestTitle] = useState('');

  // Create Registry dialog state
  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);

  // Delete Registry confirmation state
  const [deleteRegistryConfirmOpen, setDeleteRegistryConfirmOpen] = useState(false);
  const [registryToDelete, setRegistryToDelete] = useState<Registry | null>(null);
  const [deletingRegistry, setDeletingRegistry] = useState(false);

  // Force Sync confirmation state
  const [forceSyncConfirmOpen, setForceSyncConfirmOpen] = useState(false);
  const [registryToSync, setRegistryToSync] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const loadRegistries = async () => {
      try {
        console.log('Loading registries from API for namespace:', currentNamespace);
        setLoading(true);
        setError(null);

        const registriesData = await api.getRegistries(currentNamespace);
        console.log('Registries loaded:', registriesData);

        setRegistries(registriesData);
      } catch (err) {
        console.error('Error loading registries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load registries');
      } finally {
        setLoading(false);
      }
    };

    loadRegistries();
  }, [currentNamespace]);


  const handleRegistryClick = (registryId: string) => {
    navigate(`/registries/${registryId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/v1/registries/refresh', { method: 'POST' });
      const registriesData = await api.getRegistries(currentNamespace);
      setRegistries(registriesData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing registries:', err);
      setError('Failed to refresh registries');
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceSync = (registryId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    // Find the registry name for the confirmation dialog
    const registry = registries.find(r => r.id === registryId);
    const registryName = registry?.name || registryId;

    // Show confirmation dialog
    setRegistryToSync({ id: registryId, name: registryName });
    setForceSyncConfirmOpen(true);
  };

  const confirmForceSync = async () => {
    if (!registryToSync) return;

    setForceSyncConfirmOpen(false);

    try {
      const response = await fetch(`/api/v1/registries/${registryToSync.id}/force-sync`, { method: 'POST' });
      if (response.ok) {
        console.log('Force sync initiated for registry:', registryToSync.id);
        // Optionally refresh the data to show updated status
        await handleRefresh();
      } else {
        const error = await response.json();
        console.error('Force sync failed:', error);
      }
    } catch (err) {
      console.error('Error triggering force sync:', err);
    } finally {
      setRegistryToSync(null);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleShowRegistryManifest = async (registryId: string) => {
    try {
      const manifestData = await api.getRegistryManifest(registryId);
      setManifest(manifestData);
      setManifestTitle(`${registryId} Registry`);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load registry manifest:', error);
    }
  };




  const handleCreateRegistry = async (request: CreateMCPRegistryRequest) => {
    console.log('Creating registry with request:', request);

    try {
      // Convert CreateMCPRegistryRequest to MCPRegistryRequest format
      const apiRequest: MCPRegistryRequest = {
        name: request.name,
        displayName: request.displayName,
        namespace: request.namespace,
        enforceServers: request.enforceServers,
        source: request.source,
        syncPolicy: request.syncPolicy,
        filter: request.filter
      };

      // Create the MCPRegistry via API
      const response = await api.createMCPRegistry(apiRequest);

      if (response.success) {
        console.log('MCPRegistry created successfully:', response.registry?.metadata?.name);

        // Refresh registries to show the new one
        try {
          const registriesData = await api.getRegistries(currentNamespace);
          setRegistries(registriesData);
        } catch (refreshError) {
          console.warn('Failed to refresh registries after creation:', refreshError);
          // Don't throw here - the registry was created successfully
        }
      } else {
        throw new Error(response.error || 'Failed to create registry');
      }
    } catch (error) {
      console.error('Error creating MCPRegistry:', error);
      throw error; // Re-throw so the dialog can handle the error display
    }
  };

  // Helper function to poll for resource deletion completion (RegistryDashboard)
  const pollForDeletion = async (resourceType: 'registry' | 'server', resourceId: string, _namespace?: string): Promise<void> => {
    const maxAttempts = 20; // 10 seconds with 500ms intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        let response;

        if (resourceType === 'registry') {
          response = await fetch(`/api/v1/registries/${resourceId}`);
        } else {
          // This polling function in RegistryDashboard only handles registry deletion
          // Server deletion polling is handled in RegistryDetailPage component
          throw new Error('Server polling not supported in RegistryDashboard component');
        }

        if (response.status === 404) {
          // Resource is fully deleted
          console.log(`${resourceType} ${resourceId} successfully deleted`);
          window.location.reload();
          return;
        } else if (response.ok) {
          const resource = await response.json();

          // Check if resource is in terminating state
          if (resource.status === 'terminating' || resource.status === 'Terminating' || resource.metadata?.deletionTimestamp) {
            console.log(`${resourceType} ${resourceId} is terminating, continuing to poll...`);
          } else {
            console.log(`${resourceType} ${resourceId} deletion may have failed, refreshing anyway...`);
            window.location.reload();
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error polling for ${resourceType} deletion:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Timeout reached, refresh anyway
    console.log(`Polling timeout reached for ${resourceType} ${resourceId}, refreshing page...`);
    window.location.reload();
  };

  const handleDeleteRegistry = async () => {
    if (!registryToDelete) return;

    setDeletingRegistry(true);
    try {
      await api.deleteMCPRegistry(registryToDelete.id);

      // Poll for deletion completion
      await pollForDeletion('registry', registryToDelete.id);
    } catch (error) {
      console.error('Error deleting registry:', error);
      // Still close the dialog and reset state on error
      setDeleteRegistryConfirmOpen(false);
      setRegistryToDelete(null);
      setDeletingRegistry(false);
      // Could add error toast/notification here
    }
  };

  const handleDeleteCancel = () => {
    setDeleteRegistryConfirmOpen(false);
    setRegistryToDelete(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🧪 MCP Registry (Experimental) ⚠️
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3 }}>

        {/* Main Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="main navigation tabs"
          >
            <Tab label="Registries" {...a11yProps(0)} />
            <Tab label="Unregistered Servers" {...a11yProps(1)} />
          </Tabs>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading registries...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          {!loading && !error && (
            <ResponsiveRegistryView
              registries={registries}
              onRegistryClick={handleRegistryClick}
              onCreateRegistry={() => setCreateRegistryOpen(true)}
              onRefresh={handleRefresh}
              onForceSync={handleForceSync}
              onShowManifest={handleShowRegistryManifest}
              onDelete={(registry) => {
                setRegistryToDelete(registry);
                setDeleteRegistryConfirmOpen(true);
              }}
              refreshing={refreshing}
              currentNamespace={currentNamespace}
              onNamespaceChange={setCurrentNamespace}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ResponsiveOrphanedServersView
            currentNamespace={currentNamespace}
          />
        </TabPanel>
      </Container>

      {/* Manifest Viewer */}
      {manifest && (
        <ManifestViewer
          open={manifestViewerOpen}
          onClose={() => setManifestViewerOpen(false)}
          title={manifestTitle}
          manifest={manifest}
        />
      )}

      {/* Create Registry Dialog */}
      <CreateRegistryDialog
        open={createRegistryOpen}
        onClose={() => setCreateRegistryOpen(false)}
        currentNamespace={currentNamespace}
        onCreate={handleCreateRegistry}
      />

      {/* Delete Registry Confirmation Dialog */}
      <Dialog
        open={deleteRegistryConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Registry Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the registry <strong>{registryToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action is equivalent to running: <code>kubectl delete mcpregistry {registryToDelete?.id}</code>
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deletingRegistry}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteRegistry}
            color="error"
            variant="contained"
            disabled={deletingRegistry}
            startIcon={deletingRegistry ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingRegistry ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Force Sync Confirmation Dialog */}
      <ConfirmationDialog
        open={forceSyncConfirmOpen}
        title="Confirm Registry Sync"
        message={`Are you sure you want to force sync the registry "${registryToSync?.name}"? This will immediately pull the latest data from the registry source and may affect server availability during the sync process.`}
        confirmLabel="Force Sync"
        cancelLabel="Cancel"
        onConfirm={confirmForceSync}
        onCancel={() => {
          setForceSyncConfirmOpen(false);
          setRegistryToSync(null);
        }}
        severity="warning"
      />
    </Box>
  );
};

const RegistryDetailPage: React.FC = () => {
  const { registryId } = useParams<{ registryId: string }>();
  const navigate = useNavigate();
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [deployedServers, setDeployedServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [serversLoading, setServersLoading] = useState(false);
  const [deployedServersLoading, setDeployedServersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force Sync confirmation state for detail page
  const [detailForceSyncConfirmOpen, setDetailForceSyncConfirmOpen] = useState(false);

  // Initialize tab value from URL parameter, defaulting to 0
  const [tabValue] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return tab ? parseInt(tab, 10) : 0;
  });

  // Helper function to reload page while preserving current tab state
  const reloadWithCurrentTab = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabValue.toString());
    window.location.href = url.toString();
  };

  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<Registry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverDialogTabValue, setServerDialogTabValue] = useState(0);
  const [_serverDetailsLoading, setServerDetailsLoading] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manifest viewer state
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [manifestTitle, setManifestTitle] = useState('');
  const [_loadingManifest, setLoadingManifest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to poll for resource deletion completion
  const pollForDeletion = async (resourceType: 'registry' | 'server', resourceId: string, _namespace?: string): Promise<void> => {
    const maxAttempts = 20; // 10 seconds with 500ms intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        let response;

        if (resourceType === 'registry') {
          response = await fetch(`/api/v1/registries/${resourceId}`);
        } else {
          // For deployed servers, use the deployed server endpoint
          // We need both registry ID and server name for deployed servers
          response = await fetch(`/api/v1/registries/${registryId}/servers/deployed/${resourceId}`);
        }

        if (response.status === 404) {
          // Resource is fully deleted
          console.log(`${resourceType} ${resourceId} successfully deleted`);
          reloadWithCurrentTab();
          return;
        } else if (response.ok) {
          const resource = await response.json();

          // Check if resource is in terminating state
          if (resource.status === 'terminating' || resource.status === 'Terminating' || resource.metadata?.deletionTimestamp) {
            console.log(`${resourceType} ${resourceId} is terminating, continuing to poll...`);
          } else {
            console.log(`${resourceType} ${resourceId} deletion may have failed, refreshing anyway...`);
            reloadWithCurrentTab();
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error polling for ${resourceType} deletion:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Timeout reached, refresh anyway
    console.log(`Polling timeout reached for ${resourceType} ${resourceId}, refreshing page...`);
    reloadWithCurrentTab();
  };


  const handleForceSync = (event: React.MouseEvent) => {
    if (!registryId) return;

    event.stopPropagation();
    setDetailForceSyncConfirmOpen(true);
  };

  const confirmDetailForceSync = async () => {
    if (!registryId) return;

    setDetailForceSyncConfirmOpen(false);

    try {
      const response = await fetch(`/api/v1/registries/${registryId}/force-sync`, { method: 'POST' });
      if (response.ok) {
        console.log('Force sync initiated for registry:', registryId);
        // Refresh the data to show updated status
        await loadData(true);
      } else {
        const error = await response.json();
        console.error('Force sync failed:', error);
      }
    } catch (err) {
      console.error('Error triggering force sync:', err);
    }
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (!registryId) {
      setError('Registry ID is required');
      if (!isRefresh) {setLoading(false);}
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const registryResponse = await fetch(`/api/v1/registries/${registryId}`);
      if (!registryResponse.ok) {
        throw new Error(`Failed to load registry: ${registryResponse.statusText}`);
      }
      const registryData = await registryResponse.json();
      setRegistry(registryData);

      setServersLoading(true);
      const serversResponse = await fetch(`/api/v1/registries/${registryId}/servers`);
      if (serversResponse.ok) {
        const serversData: ServersResponse = await serversResponse.json();
        setServers(serversData.servers);
      }
      setServersLoading(false);

      setDeployedServersLoading(true);
      const deployedServersResponse = await fetch(`/api/v1/registries/${registryId}/deployed-servers`);
      if (deployedServersResponse.ok) {
        const deployedServersData: ServersResponse = await deployedServersResponse.json();
        setDeployedServers(deployedServersData.servers);
      }
      setDeployedServersLoading(false);

    } catch (err) {
      console.error('Error loading registry details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load registry details');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [registryId]);

  useEffect(() => {
    loadData();
  }, [registryId, loadData]);


  const handleServerDialogTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setServerDialogTabValue(newValue);
  };

  const handleRefresh = () => {
    loadData(true);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const handleServerClick = async (server: Server, isDeployed: boolean = false) => {
    setServerDetailsLoading(true);
    setDialogOpen(true);

    try {
      // Fetch detailed server information from the appropriate endpoint
      const endpoint = isDeployed
        ? `/api/v1/registries/${registryId}/servers/deployed/${server.name}`
        : `/api/v1/registries/${registryId}/servers/${server.name}`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const detailedServer = await response.json();
        // Debug chroma-mcp specifically in frontend
        if (detailedServer.name === 'chroma-mcp') {
          console.log('🔍 [CHROMA FRONTEND DEBUG] Received server with tags:', detailedServer.tags);
        }
        setSelectedServer(detailedServer);
      } else {
        // Fallback to basic server data if endpoint fails
        setSelectedServer(server);
      }
    } catch (error) {
      console.error('Error fetching server details:', error);
      // Fallback to basic server data if fetch fails
      setSelectedServer(server);
    } finally {
      setServerDetailsLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedServer(null);
    setServerDialogTabValue(0);
  };


  const handleDeployDialogClose = () => {
    setDeployDialogOpen(false);
  };

  const handleDeploy = async (config: DeploymentConfig) => {
    if (!selectedServer || !selectedRegistry) {return;}

    try {
      await api.deployServer(selectedRegistry.id, selectedServer.name, config);

      // Close both dialogs after successful deployment
      setDeployDialogOpen(false);
      handleDialogClose(); // This closes the server popup

      // Add a delay to ensure the deployment is processed, then refresh the page
      setTimeout(() => {
        reloadWithCurrentTab();
      }, 1000);
    } catch (error) {
      throw error; // Let the dialog handle the error
    }
  };

  const handleDeleteServer = async () => {
    if (!serverToDelete || !registryId) {return;}

    setDeleting(true);
    try {
      // Call the delete API endpoint with namespace
      await api.deleteDeployedServer(serverToDelete.name, serverToDelete.namespace);

      // Poll for deletion completion
      await pollForDeletion('server', serverToDelete.name, serverToDelete.namespace);
    } catch (error) {
      console.error('Error deleting server:', error);
      // Still close the dialog and reset state on error
      setDeleteConfirmOpen(false);
      setServerToDelete(null);
      setDeleting(false);
      // Could add error toast/notification here
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setServerToDelete(null);
  };

  const handleShowServerManifest = async (serverName: string) => {
    setLoadingManifest(true);
    try {
      const manifestData = await api.getServerManifest(registryId!, serverName);
      setManifest(manifestData);
      setManifestTitle(`${getDisplayName(serverName)} Server`);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load server manifest:', error);
    } finally {
      setLoadingManifest(false);
    }
  };

  const handleShowDeployedManifest = async (server: Server) => {
    setLoadingManifest(true);
    try {
      const manifestData = await api.getDeployedServerManifest(registryId!, server.name);
      setManifest(manifestData);
      setManifestTitle(`${getDisplayName(server.name)} Server`);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load deployed server manifest:', error);
    } finally {
      setLoadingManifest(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!registry) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">Registry not found</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Fixed Header Section */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ pt: 2 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
              <Link
                color="inherit"
                href="/"
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Registries
              </Link>
              <Typography color="text.primary">{registry.name}</Typography>
            </Breadcrumbs>

            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                    {registry.name}
                  </Typography>
                  {/* Status indicator - visual only */}
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: registry.status === 'active' ? 'success.main' :
                               registry.status === 'syncing' ? 'warning.main' : 'error.main',
                      flexShrink: 0,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {/* Force Sync - Emergency action */}
                  <Tooltip title="Force Sync">
                    <IconButton
                      size="small"
                      onClick={handleForceSync}
                      disabled={registry.status === 'syncing'}
                      sx={{
                        bgcolor: 'warning.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'warning.dark' },
                        '&:disabled': { bgcolor: 'grey.300' },
                      }}
                    >
                      <SyncIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* Content Refresh - Monitoring action */}
                  <Tooltip title="Refresh Content">
                    <IconButton
                      size="small"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&:disabled': { bgcolor: 'grey.300' },
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* Responsive Content Section */}
      <ResponsiveRegistryDetailView
        registry={registry}
        availableServers={servers}
        deployedServers={deployedServers}
        onServerClick={handleServerClick}
        onForceSync={handleForceSync}
        onRefresh={handleRefresh}
        onShowManifest={(serverName, isDeployed) => {
          if (isDeployed) {
            const server = deployedServers.find(s => s.name === serverName);
            if (server) {
              handleShowDeployedManifest(server);
            }
          } else {
            handleShowServerManifest(serverName);
          }
        }}
        onDeleteServer={(server) => {
          setServerToDelete(server);
          setDeleteConfirmOpen(true);
        }}
        onQuickDeploy={(server) => {
          setSelectedServer(server);
          if (registry) {
            setSelectedRegistry(registry);
            setDeployDialogOpen(true);
          }
        }}
        refreshing={refreshing}
        serversLoading={serversLoading}
        deployedServersLoading={deployedServersLoading}
      />

      {/* Server Details Dialog */}
      <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          maxWidth="lg"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              height: '90vh',
              maxHeight: '90vh',
            }
          }}
        >
          {selectedServer && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedServer.logoUrl && (
                    <Box
                      component="img"
                      src={selectedServer.logoUrl}
                      alt={`${selectedServer.name} logo`}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        objectFit: 'contain',
                        flexShrink: 0,
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200'
                      }}
                      onError={(e) => {
                        // Hide logo if it fails to load
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {getDisplayName(selectedServer.name)}
                    {selectedServer.tier && (
                      <Tooltip title={`Server tier: ${selectedServer.tier === 'official' ? 'Official ToolHive server, maintained by the core team' : selectedServer.tier === 'community' ? 'Community-maintained server, verified for quality' : 'Third-party server, use with caution'}`}>
                        <Chip
                          label={selectedServer.tier}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ ml: 2 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </DialogTitle>

              {/* Compact Status Line */}
              <Box sx={{ px: 3, pb: 1 }}>
                {selectedServer.description && (
                  <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.4, color: 'text.secondary' }}>
                    {selectedServer.description}
                  </Typography>
                )}

                {/* Condensed Status Line */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedServer.transport && (
                    <Chip
                      label={selectedServer.transport}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {selectedServer.status && (
                    <Chip
                      label={selectedServer.status}
                      size="small"
                      color={selectedServer.status === 'Running' ? 'success' : selectedServer.status === 'Active' ? 'success' : 'error'}
                      variant="filled"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {selectedServer.ready !== undefined && (
                    <Chip
                      label={selectedServer.ready ? 'Ready' : 'Not Ready'}
                      size="small"
                      color={selectedServer.ready ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </Box>

              {/* Fixed Server Detail Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={serverDialogTabValue}
                  onChange={handleServerDialogTabChange}
                  aria-label="server detail tabs"
                  sx={{ px: 3 }}
                >
                  <Tab label="Overview" />
                  <Tab label="Tools" />
                  <Tab label="Config" />
                  <Tab label="Manual Installation" />
                </Tabs>
              </Box>

              {/* Scrollable Content Section */}
              <DialogContent sx={{ p: 0, overflow: 'auto' }}>

                {/* Tab Panel: Overview */}
                {serverDialogTabValue === 0 && (
                  <Box sx={{ p: 3 }}>
                  {/* Statistics Section */}
                  {selectedServer.metadata && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>Repository Statistics:</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {selectedServer.metadata.stars !== undefined && (
                          <Chip
                            label={`⭐ ${selectedServer.metadata.stars.toLocaleString()} stars`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {selectedServer.metadata.pulls !== undefined && (
                          <Chip
                            label={`📦 ${selectedServer.metadata.pulls.toLocaleString()} pulls`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                        {selectedServer.metadata.last_updated && (
                          <Chip
                            label={`Updated: ${new Date(selectedServer.metadata.last_updated).toLocaleDateString()}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Technical Details Section */}

                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {selectedRegistry && (
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                          Registry:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                          {selectedRegistry.name}
                        </Typography>
                        <Tooltip title="Copy Registry Name">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(selectedRegistry.name)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                        Server Name:
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                        {selectedServer.name}
                      </Typography>
                      <Tooltip title="Copy Server Name">
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(selectedServer.name)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                        Image:
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                        {selectedServer.image}{selectedServer.version && `:${selectedServer.version}`}
                      </Typography>
                      <Tooltip title="Copy Image">
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(`${selectedServer.image}${selectedServer.version ? `:${selectedServer.version}` : ''}`)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {selectedServer.endpoint_url && (
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                          Endpoint:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                          {selectedServer.endpoint_url}
                        </Typography>
                        <Tooltip title="Copy Endpoint">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(selectedServer.endpoint_url!)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}

                    {selectedServer.author && (
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                          Author:
                        </Typography>
                        <Typography variant="body2">
                          {selectedServer.author}
                        </Typography>
                      </Box>
                    )}

                    {selectedServer.namespace && (
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                          Namespace:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {selectedServer.namespace}
                        </Typography>
                      </Box>
                    )}

                    {(selectedServer.repository_url || selectedServer.repository) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                          Repository:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                          {selectedServer.repository_url || selectedServer.repository}
                        </Typography>
                        <Tooltip title="Open Repository">
                          <IconButton
                            size="small"
                            onClick={() => window.open(selectedServer.repository_url || selectedServer.repository!, '_blank')}
                          >
                            <LaunchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>

                  {/* Tags Section */}
                  {selectedServer.tags && selectedServer.tags.length > 0 && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        🏷️ Tags
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto' }}>
                        {selectedServer.tags
                          .filter(tag => tag.toLowerCase() !== 'deployed' && tag.toLowerCase() !== 'running')
                          .map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        {/* Show all tags if none remain after filtering */}
                        {selectedServer.tags.filter(tag => tag.toLowerCase() !== 'deployed' && tag.toLowerCase() !== 'running').length === 0 &&
                          selectedServer.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))
                        }
                      </Box>
                    </>
                  )}
                  </Box>
                )}

                {/* Tab Panel: Tools */}
                {serverDialogTabValue === 1 && (
                  <Box sx={{ p: 3 }}>
                    {selectedServer.tools && selectedServer.tools.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedServer.tools.map((tool, index) => (
                          <Chip
                            key={index}
                            label={tool}
                            size="medium"
                            color="primary"
                            variant="outlined"
                            sx={{ alignSelf: 'flex-start' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary">
                        No tools information available for this server.
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Tab Panel: Config */}
                {serverDialogTabValue === 2 && (
                  <Box sx={{ p: 3 }}>
                    {selectedServer.env_vars && selectedServer.env_vars.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Environment Variables:</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {selectedServer.env_vars.map((envVar, index) => (
                            <Box key={index} sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {envVar.name}
                                </Typography>
                                {envVar.required && <Chip label="Required" size="small" color="error" />}
                                {envVar.secret && <Chip label="Secret" size="small" color="warning" />}
                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                  {envVar.description || 'No description available'}
                                  {envVar.default && ` (Default: ${envVar.default})`}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">
                        No configuration options available for this server.
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Tab Panel: Manual Installation */}
                {serverDialogTabValue === 3 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      📋 Manual Installation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use these commands to manually install and run this server:
                    </Typography>

                    <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      <Typography variant="subtitle2" gutterBottom>Docker Command:</Typography>
                      <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'grey.300', position: 'relative' }}>
                        <code>
                          docker run -p 8080:8080 {selectedServer.image}{selectedServer.version ? `:${selectedServer.version}` : ''}
                        </code>
                        <Tooltip title="Copy Command">
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 4, right: 4 }}
                            onClick={() => copyToClipboard(`docker run -p 8080:8080 ${selectedServer.image}${selectedServer.version ? `:${selectedServer.version}` : ''}`)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {selectedServer.repository_url || selectedServer.repository ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Source Repository:</Typography>
                        <Button
                          variant="outlined"
                          startIcon={<LaunchIcon />}
                          onClick={() => window.open(selectedServer.repository_url || selectedServer.repository!, '_blank')}
                        >
                          View Source Code
                        </Button>
                      </Box>
                    ) : null}
                  </Box>
                )}

              </DialogContent>
              <DialogActions>
                {selectedServer.documentation && (
                  <Button
                    variant="outlined"
                    onClick={() => window.open(selectedServer.documentation, '_blank')}
                  >
                    Documentation
                  </Button>
                )}
                <Button onClick={handleDialogClose}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Deploy Server Dialog */}
        <DeployServerDialog
          open={deployDialogOpen}
          onClose={handleDeployDialogClose}
          server={selectedServer ? {
            name: selectedServer.name,
            image: selectedServer.image,
            description: selectedServer.description,
            tags: selectedServer.tags || [],
            env: selectedServer.env_vars?.map(env => ({
              name: env.name,
              description: env.description,
              required: env.required
            })),
            transport: selectedServer.transport
          } : null}
          registryId={selectedRegistry?.id || ''}
          registryName={selectedRegistry?.id || ''}
          registryNamespace={selectedRegistry?.metadata?.namespace || 'toolhive-system'}
          onDeploy={handleDeploy}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Confirm Server Deletion
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the server <strong>{serverToDelete?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action is equivalent to running: <code>kubectl delete mcpserver {serverToDelete?.name}</code>
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteServer}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

      {/* Manifest Viewer */}
      {manifest && (
        <ManifestViewer
          open={manifestViewerOpen}
          onClose={() => setManifestViewerOpen(false)}
          title={manifestTitle}
          manifest={manifest}
        />
      )}

      {/* Force Sync Confirmation Dialog */}
      <ConfirmationDialog
        open={detailForceSyncConfirmOpen}
        title="Confirm Registry Sync"
        message={`Are you sure you want to force sync the registry "${registry?.name || registryId}"? This will immediately pull the latest data from the registry source and may affect server availability during the sync process.`}
        confirmLabel="Force Sync"
        cancelLabel="Cancel"
        onConfirm={confirmDetailForceSync}
        onCancel={() => setDetailForceSyncConfirmOpen(false)}
        severity="warning"
      />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RegistryDashboard />} />
      <Route path="/registries/:registryId" element={<RegistryDetailPage />} />
    </Routes>
  );
};

export default App;