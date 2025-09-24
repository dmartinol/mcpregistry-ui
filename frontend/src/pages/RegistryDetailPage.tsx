import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Container,
  Paper,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Launch as LaunchIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { ServerCard } from '../components/ServerCard';
import { DeployedServerCard } from '../components/DeployedServerCard';
import { DeployServerDialog } from '../components/DeployServerDialog';
import { ManifestViewer } from '../components/ManifestViewer';
import { api, DeploymentConfig } from '../services/api';

interface RegistryServer {
  name: string;
  image: string;
  version?: string;
  description?: string;
  tags: string[];
  capabilities?: string[];
  author?: string;
  repository?: string;
  documentation?: string;
}

interface DeployedServer {
  id: string;
  name: string;
  registryRef: string;
  image: string;
  version?: string;
  status: 'Pending' | 'Running' | 'Failed' | 'Terminating';
  endpoint?: string;
  createdAt: string;
  lastUpdated: string;
  namespace: string;
  uid: string;
}

interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: string;
  serverCount: number;
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

export const RegistryDetailPage: React.FC = () => {
  const { registryId } = useParams<{ registryId: string }>();
  const navigate = useNavigate();

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [availableServers, setAvailableServers] = useState<RegistryServer[]>([]);
  const [deployedServers, setDeployedServers] = useState<DeployedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [serversLoading, setServersLoading] = useState(false);
  const [deployedLoading, setDeployedLoading] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<RegistryServer | null>(null);

  // Manifest viewer state
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [manifestTitle, setManifestTitle] = useState('');
  const [, setLoadingManifest] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Force sync function
  const handleForceSync = async () => {
    if (!registryId || isSyncing) return;

    try {
      setIsSyncing(true);
      const response = await fetch(`/api/v1/registries/${registryId}/force-sync`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('Force sync initiated for registry:', registryId);
        // Refresh the registry data after a short delay to show updated status
        setTimeout(async () => {
          try {
            const registryData = await api.getRegistryDetails(registryId);
            setRegistry(registryData);
          } catch (err) {
            console.warn('Failed to refresh registry after sync:', err);
          }
        }, 2000);
      } else {
        const error = await response.json();
        console.error('Force sync failed:', error);
      }
    } catch (err) {
      console.error('Error triggering force sync:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const loadRegistryDetails = async () => {
      if (!registryId) {
        setError('Registry ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load registry details
        const registryData = await api.getRegistryDetails(registryId);
        setRegistry(registryData);

        // Load available servers
        setServersLoading(true);
        const serversData = await api.getRegistryServers(registryId);
        setAvailableServers(serversData.servers);
        setServersLoading(false);

        // Load deployed servers
        setDeployedLoading(true);
        try {
          const deployedData = await api.getDeployedServers(registryId);
          setDeployedServers(deployedData.servers);
        } catch (err) {
          console.warn('Failed to load deployed servers:', err);
          setDeployedServers([]);
        }
        setDeployedLoading(false);

      } catch (err) {
        console.error('Error loading registry details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load registry details');
      } finally {
        setLoading(false);
      }
    };

    loadRegistryDetails();
  }, [registryId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBreadcrumbClick = () => {
    navigate('/');
  };

  const handleDeployServer = (server: RegistryServer) => {
    setSelectedServer(server);
    setDeployDialogOpen(true);
  };

  const handleDeployDialogClose = () => {
    setDeployDialogOpen(false);
    setSelectedServer(null);
  };

  const handleDeploy = async (config: DeploymentConfig) => {
    if (!selectedServer || !registryId) return;

    try {
      await api.deployServer(registryId, selectedServer.name, config);

      // Close the deployment dialog after successful deployment
      setDeployDialogOpen(false);
      setSelectedServer(null);

      // Refresh deployed servers list
      setDeployedLoading(true);
      try {
        const deployedData = await api.getDeployedServers(registryId);
        setDeployedServers(deployedData.servers);
      } catch (err) {
        console.warn('Failed to refresh deployed servers:', err);
      }
      setDeployedLoading(false);

    } catch (error) {
      throw error; // Let the dialog handle the error
    }
  };

  const handleShowServerManifest = async (serverName: string) => {
    if (!registryId) return {};

    try {
      return await api.getServerManifest(registryId, serverName);
    } catch (error) {
      console.error('Failed to fetch server manifest:', error);
      throw error;
    }
  };

  const handleShowDeployedServerManifest = async (serverName: string) => {
    if (!registryId) return {};

    try {
      return await api.getDeployedServerManifest(registryId, serverName);
    } catch (error) {
      console.error('Failed to fetch deployed server manifest:', error);
      throw error;
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
    <Container maxWidth="lg">
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            color="inherit"
            href="/"
            onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(); }}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Registries
          </Link>
          <Typography color="text.primary">{registry.name}</Typography>
        </Breadcrumbs>

        {/* Registry Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h4" component="h1">
              {registry.name}
            </Typography>
            <Tooltip title="Force sync registry to fetch latest servers">
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon />}
                onClick={handleForceSync}
                disabled={isSyncing || registry.status === 'syncing'}
                sx={{ ml: 2, flexShrink: 0 }}
              >
                {isSyncing ? 'Syncing...' : 'Force Sync'}
              </Button>
            </Tooltip>
          </Box>

          {registry.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {registry.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="body2">
              <strong>URL:</strong> {registry.url}
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

        {/* Tabs for Available/Deployed Servers */}
        <Paper elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="registry server tabs"
            >
              <Tab label="Available Servers" {...a11yProps(0)} />
              <Tab label="Deployed Servers" {...a11yProps(1)} />
            </Tabs>
          </Box>

          {/* Available Servers Tab */}
          <TabPanel value={tabValue} index={0}>
            {serversLoading ? (
              <Box display="flex" justifyContent="center" data-testid="servers-loading">
                <CircularProgress />
              </Box>
            ) : availableServers.length === 0 ? (
              <Alert severity="info">No servers available in this registry</Alert>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                {availableServers.map((server) => (
                  <ServerCard
                    key={server.name}
                    server={server}
                    onDeploy={() => handleDeployServer(server)}
                    onShowManifest={() => handleShowServerManifest(server.name)}
                  />
                ))}
              </Box>
            )}
          </TabPanel>

          {/* Deployed Servers Tab */}
          <TabPanel value={tabValue} index={1}>
            {deployedLoading ? (
              <Box display="flex" justifyContent="center" data-testid="deployed-loading">
                <CircularProgress />
              </Box>
            ) : deployedServers.length === 0 ? (
              <Alert severity="info">No deployed servers for this registry</Alert>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                {deployedServers.map((server) => (
                  <DeployedServerCard
                    key={server.id}
                    server={server}
                    onShowManifest={() => handleShowDeployedServerManifest(server.name)}
                  />
                ))}
              </Box>
            )}
          </TabPanel>
        </Paper>

        {/* Deploy Server Dialog */}
        <DeployServerDialog
          open={deployDialogOpen}
          onClose={handleDeployDialogClose}
          server={selectedServer}
          registryId={registryId || ''}
          registryName={registry?.name || ''}
          registryNamespace={registry?.metadata?.namespace || 'toolhive-system'}
          onDeploy={handleDeploy}
        />

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
    </Container>
  );
};