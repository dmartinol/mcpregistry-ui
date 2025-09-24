import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  Chip,
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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Home as HomeIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Storage as StorageIcon,
  Http as HttpIcon,
  GitHub as GitIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Code as ManifestIcon,
} from '@mui/icons-material';
import { DeployServerDialog } from './components/DeployServerDialog';
import { OrphanedServersView } from './components/OrphanedServersView';
import { ManifestViewer } from './components/ManifestViewer';
import { api, DeploymentConfig } from './services/api';

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
}


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
  const [loadingManifest, setLoadingManifest] = useState(false);

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

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'error':
        return 'error';
      case 'syncing':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

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

  const handleForceSync = async (registryId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/v1/registries/${registryId}/force-sync`, { method: 'POST' });
      if (response.ok) {
        console.log('Force sync initiated for registry:', registryId);
        // Optionally refresh the data to show updated status
        await handleRefresh();
      } else {
        const error = await response.json();
        console.error('Force sync failed:', error);
      }
    } catch (err) {
      console.error('Error triggering force sync:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleShowRegistryManifest = async (registryId: string) => {
    setLoadingManifest(true);
    try {
      const manifestData = await api.getRegistryManifest(registryId);
      setManifest(manifestData);
      setManifestTitle(`${registryId} Registry`);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load registry manifest:', error);
    } finally {
      setLoadingManifest(false);
    }
  };



  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'git':
        return <GitIcon fontSize="small" />;
      case 'configmap':
        return <StorageIcon fontSize="small" />;
      case 'http':
      case 'https':
        return <HttpIcon fontSize="small" />;
      default:
        return <StorageIcon fontSize="small" />;
    }
  };

  const getSourceColor = (type: string): 'primary' | 'secondary' | 'success' | 'warning' => {
    switch (type) {
      case 'git':
        return 'primary';
      case 'configmap':
        return 'secondary';
      case 'http':
        return 'warning';
      case 'https':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ToolHive Registry Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            ToolHive Management
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Namespace</InputLabel>
            <Select
              value={currentNamespace}
              label="Namespace"
              onChange={(e) => setCurrentNamespace(e.target.value)}
            >
              <MenuItem value="toolhive-system">toolhive-system</MenuItem>
              <MenuItem value="default">default</MenuItem>
              <MenuItem value="kube-system">kube-system</MenuItem>
            </Select>
          </FormControl>
        </Box>

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
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Found {registries.length} registries
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Showing registries from namespace: {currentNamespace}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{ minWidth: 120 }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>

            <Grid container spacing={3}>
              {registries.map((registry) => (
                <Grid item xs={12} md={6} key={registry.id}>
                  <Card
                    elevation={2}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleRegistryClick(registry.id)}
                        >
                          {registry.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {registry.source && (
                            <Tooltip title={`${registry.source.type === 'git' ? 'Git Source' : registry.source.type === 'configmap' ? 'ConfigMap Source' : `${registry.source.type.toUpperCase()} Source`}: ${registry.source.location}`}>
                              <Chip
                                icon={getSourceIcon(registry.source.type)}
                                label={registry.source.type}
                                color={getSourceColor(registry.source.type)}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          <Chip
                            label={registry.status}
                            color={getStatusColor(registry.status)}
                            size="small"
                          />
                        </Box>
                      </Box>

                      {/* Registry Info Badges */}
                      <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Sync Status Badge */}
                        {registry.source?.syncInterval && (
                          <Tooltip title={`Sync policy: ${registry.source.syncInterval === 'manual' ? 'Manual sync only' : `Automatic, every ${registry.source.syncInterval}`}`}>
                            <Chip
                              icon={<SyncIcon fontSize="small" />}
                              label={registry.source.syncInterval === 'manual' ? 'Manual' : `Auto (${registry.source.syncInterval})`}
                              size="small"
                              color={registry.source.syncInterval === 'manual' ? 'default' : 'success'}
                              variant="outlined"
                            />
                          </Tooltip>
                        )}

                        {/* Server Count Badge */}
                        <Tooltip title={`Servers: ${registry.serverCount} available in this registry`}>
                          <Chip
                            label={`${registry.serverCount} Server${registry.serverCount !== 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Tooltip>

                        {/* Last Sync Badge */}
                        <Tooltip title={`Last sync: ${registry.lastSyncAt ? new Date(registry.lastSyncAt).toLocaleString() : 'Never synchronized'}`}>
                          <Chip
                            label={registry.lastSyncAt ? new Date(registry.lastSyncAt).toLocaleString() : 'Never synced'}
                            size="small"
                            color={registry.lastSyncAt ? 'info' : 'warning'}
                            variant="outlined"
                          />
                        </Tooltip>
                      </Box>

                      {registry.description && (
                        <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                          {registry.description}
                        </Typography>
                      )}

                      {/* API Information */}
                      {registry.url && (
                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontFamily: 'monospace',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              mr: 1
                            }}
                          >
                            {registry.url}
                          </Typography>
                          <Tooltip title="Copy API URL">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(registry.url);
                              }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}

                      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                        Created: {formatDate(registry.createdAt)}
                      </Typography>

                      <Typography variant="caption" display="block">
                        Updated: {formatDate(registry.updatedAt)}
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Tooltip title="Show Registry Manifest">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowRegistryManifest(registry.id);
                            }}
                            disabled={loadingManifest}
                            sx={{
                              color: 'white',
                              backgroundColor: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                                color: 'white',
                              },
                            }}
                          >
                            <ManifestIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SyncIcon />}
                          onClick={(e) => handleForceSync(registry.id, e)}
                          sx={{ minWidth: 120 }}
                        >
                          Force Sync
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

              {registries.length === 0 && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  No registries found. Create your first registry to get started.
                </Alert>
              )}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <OrphanedServersView
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
  const [tabValue, setTabValue] = useState(0);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<Registry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverDialogTabValue, setServerDialogTabValue] = useState(0);
  const [_serverDetailsLoading, setServerDetailsLoading] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilters, setTransportFilters] = useState<string[]>([]);
  const [tierFilters, setTierFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manifest viewer state
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [manifestTitle, setManifestTitle] = useState('');
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper functions for source click handling
  const parseConfigMapLocation = (location: string) => {
    const parts = location.split(':');
    return {
      name: parts[0],
      key: parts[1] || undefined
    };
  };

  const handleSourceClick = (registry: Registry) => {
    if (!registry.source) return;

    if (registry.source.type === 'configmap') {
      const { name } = parseConfigMapLocation(registry.source.location);
      handleShowConfigMapManifest(name, registry.metadata?.namespace || 'toolhive-system');
    } else if (registry.source.type === 'git') {
      // Open Git repository to the specific registry file
      const gitLocation = registry.source.location;
      console.log('Git location:', gitLocation);

      // Parse the git location: repository@branch/path or repository@branch
      let repository, branch, path;

      if (gitLocation.includes('@')) {
        const [repoUrl, branchAndPath] = gitLocation.split('@');
        repository = repoUrl;

        if (branchAndPath.includes('/')) {
          const [branchName, ...pathParts] = branchAndPath.split('/');
          branch = branchName;
          path = pathParts.join('/');
        } else {
          branch = branchAndPath;
          path = 'data/registry.json'; // Default path
        }
      } else {
        // No branch specified, assume main branch
        repository = gitLocation;
        branch = 'main';
        path = 'data/registry.json';
      }

      console.log('Parsed - repository:', repository, 'branch:', branch, 'path:', path);

      // Construct the direct file URL for GitHub/GitLab
      let fileUrl;
      if (repository.includes('github.com')) {
        fileUrl = `${repository}/blob/${branch}/${path}`;
      } else if (repository.includes('gitlab.com')) {
        fileUrl = `${repository}/-/blob/${branch}/${path}`;
      } else {
        // Fallback to repository root for other Git providers
        fileUrl = repository;
      }

      console.log('Final URL:', fileUrl);
      window.open(fileUrl, '_blank');
    }
  };

  const handleShowConfigMapManifest = async (configMapName: string, namespace: string) => {
    if (!registryId) return;

    setLoadingManifest(true);
    try {
      const manifestData = await api.getConfigMapManifest(registryId, configMapName, namespace);
      setManifest(manifestData);
      setManifestTitle(`${configMapName} ConfigMap`);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load ConfigMap manifest:', error);
    } finally {
      setLoadingManifest(false);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (!registryId) {
      setError('Registry ID is required');
      if (!isRefresh) setLoading(false);
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
  };

  useEffect(() => {
    loadData();
  }, [registryId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleServerDialogTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setServerDialogTabValue(newValue);
  };

  const handleRefresh = () => {
    loadData(true);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Filter and search logic
  const filterServers = (serverList: Server[]) => {
    return serverList.filter(server => {
      // Search filter
      const matchesSearch = !searchQuery ||
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Transport filter (multiple selection - OR logic)
      const matchesTransport = transportFilters.length === 0 || transportFilters.includes(server.transport || '');

      // Tier filter (multiple selection - OR logic)
      const matchesTier = tierFilters.length === 0 || tierFilters.includes(server.tier || '');

      // Status filter (multiple selection - OR logic, only for deployed servers)
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(server.status || '');

      return matchesSearch && matchesTransport && matchesTier && matchesStatus;
    });
  };

  const filteredServers = filterServers(servers).sort((a, b) => a.name.localeCompare(b.name));
  const filteredDeployedServers = filterServers(deployedServers).sort((a, b) => a.name.localeCompare(b.name));

  // Get unique values for filter badges
  const getAllTransports = () => {
    const transports = new Set<string>();
    [...servers, ...deployedServers].forEach(server => {
      if (server.transport) transports.add(server.transport);
    });
    return Array.from(transports);
  };

  const getAllTiers = () => {
    const tiers = new Set<string>();
    [...servers, ...deployedServers].forEach(server => {
      if (server.tier) tiers.add(server.tier);
    });
    return Array.from(tiers);
  };

  const getAllStatuses = () => {
    const statuses = new Set<string>();
    deployedServers.forEach(server => {
      if (server.status) statuses.add(server.status);
    });
    return Array.from(statuses);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTransportFilters([]);
    setTierFilters([]);
    setStatusFilters([]);
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

  const handleDeployServer = () => {
    if (selectedServer && registry) {
      setSelectedRegistry(registry);
      setDeployDialogOpen(true);
    }
  };

  const handleDeployDialogClose = () => {
    setDeployDialogOpen(false);
  };

  const handleDeploy = async (config: DeploymentConfig) => {
    if (!selectedServer || !selectedRegistry) return;

    try {
      await api.deployServer(selectedRegistry.id, selectedServer.name, config);

      // Close both dialogs after successful deployment
      setDeployDialogOpen(false);
      handleDialogClose(); // This closes the server popup

      // Optionally refresh deployed servers or show success message
    } catch (error) {
      throw error; // Let the dialog handle the error
    }
  };

  const handleDeleteServer = async () => {
    if (!serverToDelete || !registryId) return;

    setDeleting(true);
    try {
      // Call the delete API endpoint with namespace
      await api.deleteDeployedServer(serverToDelete.name, serverToDelete.namespace);

      // Refresh the deployed servers list
      const deployedServersResponse = await fetch(`/api/v1/registries/${registryId}/deployed-servers`);
      if (deployedServersResponse.ok) {
        const deployedServersData = await deployedServersResponse.json();
        setDeployedServers(deployedServersData.servers);
      }

      // Close dialog and reset state
      setDeleteConfirmOpen(false);
      setServerToDelete(null);
    } catch (error) {
      console.error('Error deleting server:', error);
      // Still close the dialog and reset state on error
      setDeleteConfirmOpen(false);
      setServerToDelete(null);
      // Could add error toast/notification here
    } finally {
      setDeleting(false);
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
      setManifestTitle(`${serverName} Server`);
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
      setManifestTitle(`${server.name} Server`);
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

            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                  {registry.name}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  size="small"
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Typography variant="body2">
                  <strong>URL:</strong> {registry.url || 'Not specified'}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {registry.status}
                </Typography>
                <Typography variant="body2">
                  <strong>Server Count:</strong> {registry.serverCount}
                </Typography>
                <Typography variant="body2">
                  <strong>Namespace:</strong> {registry.metadata?.namespace || 'Unknown'}
                </Typography>
              </Box>

              {/* Source and Sync Policy Information */}
              {(registry.source || registry.lastSyncAt) && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {registry.source && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">
                        <strong>{registry.source.type === 'git' ? 'Git Source' : registry.source.type === 'configmap' ? 'ConfigMap Source' : `${registry.source.type.toUpperCase()} Source`}:</strong>
                      </Typography>
                      <Typography variant="body2">
                        {registry.source.location}
                      </Typography>
                      {(registry.source.type === 'configmap' || registry.source.type === 'git') && (
                        <LaunchIcon
                          fontSize="small"
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.dark',
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSourceClick(registry);
                          }}
                        />
                      )}
                    </Box>
                  )}
                  {registry.source?.syncInterval && (
                    <Typography variant="body2">
                      <strong>Sync Policy:</strong> {registry.source.syncInterval === 'manual' ? 'Manual' : `Automatic (${registry.source.syncInterval})`}
                    </Typography>
                  )}
                  {registry.lastSyncAt && (
                    <Typography variant="body2">
                      <strong>Last Sync:</strong> {new Date(registry.lastSyncAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* Scrollable Content Section */}
      <Container maxWidth="lg" sx={{ flex: 1, pt: 3 }}>

        {/* Search and Filter Section */}
        <Box sx={{ mb: 3 }}>
          {/* Search Bar */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search servers by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setSearchQuery('')}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />

          {/* Filter Badges */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold' }}>
              Filters:
            </Typography>

            {/* Transport Filter */}
            {getAllTransports().map((transport) => (
              <Chip
                key={transport}
                label={transport}
                clickable
                variant={transportFilters.includes(transport) ? 'filled' : 'outlined'}
                color={transportFilters.includes(transport) ? 'primary' : 'default'}
                onClick={() => {
                  if (transportFilters.includes(transport)) {
                    setTransportFilters(transportFilters.filter(t => t !== transport));
                  } else {
                    setTransportFilters([...transportFilters, transport]);
                  }
                }}
                size="small"
              />
            ))}

            {/* Tier Filter - hide for deployed servers tab */}
            {tabValue !== 1 && getAllTiers().map((tier) => (
              <Chip
                key={tier}
                label={tier}
                clickable
                variant={tierFilters.includes(tier) ? 'filled' : 'outlined'}
                color={tierFilters.includes(tier) ? 'secondary' : 'default'}
                onClick={() => {
                  if (tierFilters.includes(tier)) {
                    setTierFilters(tierFilters.filter(t => t !== tier));
                  } else {
                    setTierFilters([...tierFilters, tier]);
                  }
                }}
                size="small"
              />
            ))}

            {/* Status Filter (only show for deployed servers tab) */}
            {tabValue === 1 && getAllStatuses().map((status) => (
              <Chip
                key={status}
                label={status}
                clickable
                variant={statusFilters.includes(status) ? 'filled' : 'outlined'}
                color={statusFilters.includes(status) ? (status === 'Running' ? 'success' : 'error') : 'default'}
                onClick={() => {
                  if (statusFilters.includes(status)) {
                    setStatusFilters(statusFilters.filter(s => s !== status));
                  } else {
                    setStatusFilters([...statusFilters, status]);
                  }
                }}
                size="small"
              />
            ))}

            {/* Clear Filters Button */}
            {(searchQuery || transportFilters.length > 0 || tierFilters.length > 0 || statusFilters.length > 0) && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
                sx={{ ml: 1 }}
              >
                Clear All
              </Button>
            )}
          </Box>
        </Box>

        <Paper elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="registry server tabs"
            >
              <Tab label={`Available Servers (${filteredServers.length})`} {...a11yProps(0)} />
              <Tab label={`Deployed Servers (${filteredDeployedServers.length})`} {...a11yProps(1)} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {serversLoading ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : filteredServers.length === 0 ? (
              <Alert severity="info">No servers available in this registry</Alert>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                {filteredServers.map((server) => (
                  <Card key={server.name} elevation={2}>
                    <CardContent>
                      {/* Title */}
                      <Typography
                        variant="h6"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                          mb: 1
                        }}
                        onClick={() => handleServerClick(server, false)}
                      >
                        {server.name}
                      </Typography>

                      {/* Badges Row: Config badges on left, Status badges on right */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        {/* Left side: Configuration badges */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', overflowX: 'auto', flex: 1, mr: 1 }}>
                          {server.tier && (
                            <Tooltip title={`Tier: ${server.tier}`}>
                              <Chip
                                label={server.tier}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {server.transport && (
                            <Tooltip title={`Transport: ${server.transport}`}>
                              <Chip
                                label={server.transport}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {(server.tools_count !== undefined && server.tools_count > 0) && (
                            <Tooltip title={`Tools: ${server.tools_count} available`}>
                              <Chip
                                label={`${server.tools_count} tools`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {server.tags && server.tags.length > 0 && server.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>

                        {/* Right side: Status badges */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {/* Available servers don't typically have status badges, this space is reserved for consistency */}
                        </Box>
                      </Box>

                      {server.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {server.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {server.repository && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => window.open(server.repository, '_blank')}
                            >
                              Repository
                            </Button>
                          )}
                        </Box>
                        <Tooltip title="Show Manifest">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowServerManifest(server.name);
                            }}
                            disabled={loadingManifest}
                            sx={{
                              color: 'white',
                              backgroundColor: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                                color: 'white',
                              },
                            }}
                          >
                            <ManifestIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {deployedServersLoading ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : filteredDeployedServers.length === 0 ? (
              <Alert severity="info">No deployed servers for this registry</Alert>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                {filteredDeployedServers.map((server) => (
                  <Card key={server.name} elevation={2}>
                    <CardContent>
                      {/* Title */}
                      <Typography
                        variant="h6"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                          mb: 1
                        }}
                        onClick={() => handleServerClick(server, true)}
                      >
                        {server.name}
                      </Typography>

                      {/* Badges Row: Config badges on left, Status badges on right */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        {/* Left side: Configuration badges */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', overflowX: 'auto', flex: 1, mr: 1 }}>
                          {server.transport && (
                            <Tooltip title={`Transport: ${server.transport}`}>
                              <Chip
                                label={server.transport}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {server.tier && (
                            <Tooltip title={`Tier: ${server.tier}`}>
                              <Chip
                                label={server.tier}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {(server.tools_count !== undefined && server.tools_count > 0) && (
                            <Tooltip title={`Tools: ${server.tools_count} available`}>
                              <Chip
                                label={`${server.tools_count} tools`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {server.tags && server.tags.length > 0 && server.tags
                            .filter(tag => tag.toLowerCase() !== 'deployed' && tag.toLowerCase() !== 'running')
                            .slice(0, 2)
                            .map((tag) => (
                              <Chip key={tag} label={tag} size="small" />
                            ))}
                        </Box>

                        {/* Right side: Status badges */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {server.status && (
                            <Tooltip title={`Status: ${server.status}`}>
                              <Chip
                                label={server.status}
                                size="small"
                                color={server.status === 'Running' ? 'success' : 'error'}
                                variant="filled"
                              />
                            </Tooltip>
                          )}
                          {server.ready !== undefined && (
                            <Tooltip title={server.ready ? 'Ready: Yes' : 'Ready: No'}>
                              <Chip
                                label={server.ready ? 'Ready' : 'Not Ready'}
                                size="small"
                                color={server.ready ? 'success' : 'warning'}
                                variant="filled"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {(server.image || server.endpoint_url) && (
                        <Box sx={{ mb: 1, bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                          {server.image && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: server.endpoint_url ? 1 : 0 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontFamily: 'monospace',
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  mr: 1
                                }}
                              >
                                {server.image}{server.version && `:${server.version}`}
                              </Typography>
                              <Tooltip title="Copy Image">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(`${server.image}${server.version ? `:${server.version}` : ''}`);
                                  }}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}

                          {server.endpoint_url && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontFamily: 'monospace',
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  mr: 1
                                }}
                              >
                                {server.endpoint_url}
                              </Typography>
                              <Tooltip title="Copy Endpoint">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(server.endpoint_url!);
                                  }}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {server.repository && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => window.open(server.repository, '_blank')}
                            >
                              Repository
                            </Button>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Tooltip title="Show Manifest">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowDeployedManifest(server);
                              }}
                              disabled={loadingManifest}
                              sx={{
                                color: 'white',
                                backgroundColor: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                  color: 'white',
                                },
                              }}
                            >
                              <ManifestIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setServerToDelete(server);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>
        </Paper>

        {/* Server Details Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          maxWidth="md"
          fullWidth
        >
          {selectedServer && (
            <>
              <DialogTitle>
                {selectedServer.name}
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
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                {/* Description and Badges Section - Above Tabs */}
                <Box sx={{ p: 3, pb: 2 }}>
                  {selectedServer.description && (
                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {selectedServer.description}
                    </Typography>
                  )}

                  {/* Status and Transport Chips */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
                    {selectedServer.transport && (
                      <Tooltip title={`Transport: ${selectedServer.transport}`}>
                        <Chip
                          label={selectedServer.transport}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                    {selectedServer.status && (
                      <Tooltip title={`Deployment status: ${selectedServer.status === 'Running' ? 'Server is running and operational' : selectedServer.status === 'Active' ? 'Server is active and available' : selectedServer.status === 'Pending' ? 'Server deployment is in progress' : selectedServer.status === 'Failed' ? 'Server deployment failed' : `Current status: ${selectedServer.status}`}`}>
                        <Chip
                          label={selectedServer.status}
                          size="small"
                          color={selectedServer.status === 'Running' ? 'success' : selectedServer.status === 'Active' ? 'success' : 'error'}
                          variant="filled"
                        />
                      </Tooltip>
                    )}
                    {selectedServer.ready !== undefined && (
                      <Tooltip title={selectedServer.ready ? 'Server is ready to accept connections and process requests' : 'Server is not ready - may be starting up or experiencing issues'}>
                        <Chip
                          label={selectedServer.ready ? 'Ready' : 'Not Ready'}
                          size="small"
                          color={selectedServer.ready ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                  </Box>

                  {/* Statistics Section */}
                  {selectedServer.metadata && (
                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                      {selectedServer.metadata.stars !== undefined && (
                        <Tooltip title={`⭐ ${selectedServer.metadata.stars.toLocaleString()} stars`}>
                          <Chip
                            label={`⭐ ${selectedServer.metadata.stars.toLocaleString()}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {selectedServer.metadata.pulls !== undefined && (
                        <Tooltip title={`📦 ${selectedServer.metadata.pulls.toLocaleString()} pulls`}>
                          <Chip
                            label={`📦 ${selectedServer.metadata.pulls.toLocaleString()}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {selectedServer.metadata.last_updated && (
                        <Tooltip title={`Updated: ${new Date(selectedServer.metadata.last_updated).toLocaleDateString()}`}>
                          <Chip
                            label={`Updated: ${new Date(selectedServer.metadata.last_updated).toLocaleDateString()}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Server Detail Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={serverDialogTabValue}
                    onChange={handleServerDialogTabChange}
                    aria-label="server detail tabs"
                  >
                    <Tab label="Overview" />
                    <Tab label="Tools" />
                    <Tab label="Config" />
                    <Tab label="Manual Installation" />
                  </Tabs>
                </Box>

                {/* Tab Panel: Overview */}
                {serverDialogTabValue === 0 && (
                  <Box sx={{ p: 3 }}>
                  {/* Overview Content */}

                  {/* Technical Details Section */}

                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.875rem' }}>
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
                {!selectedServer.endpoint_url && (
                  <Button
                    variant="contained"
                    onClick={handleDeployServer}
                    sx={{ ml: 'auto' }}
                  >
                    Deploy
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
          registryName={selectedRegistry?.name || ''}
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
      </Container>
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