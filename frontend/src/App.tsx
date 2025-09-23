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
  InputAdornment
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
  Clear as ClearIcon
} from '@mui/icons-material';

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
  source?: {
    type: 'configmap' | 'git' | 'http' | 'https';
    location: string;
    syncInterval?: string;
  };
}

interface ApiResponse {
  registries: Registry[];
  total: number;
  limit: number;
  offset: number;
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
  const navigate = useNavigate();

  useEffect(() => {
    const loadRegistries = async () => {
      try {
        console.log('Loading registries from API...');
        const response = await fetch('/api/v1/registries');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        console.log('Registries loaded:', data);

        setRegistries(data.registries);
        setError(null);
      } catch (err) {
        console.error('Error loading registries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load registries');
      } finally {
        setLoading(false);
      }
    };

    loadRegistries();
  }, []);

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
      const response = await fetch('/api/v1/registries');
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setRegistries(data.registries);
        setError(null);
      }
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
        <Typography variant="h4" component="h1" gutterBottom>
          Registry Dashboard
        </Typography>

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

        {!loading && !error && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Found {registries.length} registries
              </Typography>
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
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        elevation: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                    onClick={() => handleRegistryClick(registry.id)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2">
                          {registry.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {registry.source && (
                            <Chip
                              icon={getSourceIcon(registry.source.type)}
                              label={registry.source.type}
                              color={getSourceColor(registry.source.type)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={registry.status}
                            color={getStatusColor(registry.status)}
                            size="small"
                          />
                        </Box>
                      </Box>

                      {registry.description && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {registry.description}
                        </Typography>
                      )}

                      {registry.source && (
                        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '50px', mr: 1 }}>
                            Source:
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontFamily: 'monospace',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem'
                            }}
                          >
                            {registry.source.location}
                          </Typography>
                        </Box>
                      )}

                      {registry.source?.syncInterval && (
                        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '50px', mr: 1 }}>
                            Sync:
                          </Typography>
                          <Chip
                            icon={<SyncIcon fontSize="small" />}
                            label={registry.source.syncInterval}
                            size="small"
                            color={registry.source.syncInterval === 'manual' ? 'default' : 'info'}
                            variant="outlined"
                          />
                        </Box>
                      )}

                      <Typography variant="body2" color="text.secondary">
                        <strong>Servers:</strong> {registry.serverCount}
                      </Typography>

                      {registry.url && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '32px', mr: 1 }}>
                            URL:
                          </Typography>
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
                          <Tooltip title="Copy URL">
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

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
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
      </Container>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [_serverDetailsLoading, setServerDetailsLoading] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilters, setTransportFilters] = useState<string[]>([]);
  const [tierFilters, setTierFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!registryId) {
        setError('Registry ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    loadData();
  }, [registryId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  const filteredServers = filterServers(servers);
  const filteredDeployedServers = filterServers(deployedServers);

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
              <Typography variant="h4" component="h1" gutterBottom>
                {registry.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  <strong>URL:</strong> {registry.url || 'Not specified'}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {registry.status}
                </Typography>
                <Typography variant="body2">
                  <strong>Server Count:</strong> {registry.serverCount}
                </Typography>
              </Box>
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
              <Tab label="Available Servers" {...a11yProps(0)} />
              <Tab label="Deployed Servers" {...a11yProps(1)} />
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleServerClick(server, false)}
                        >
                          {server.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {server.tier && (
                            <Chip
                              label={server.tier}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {server.transport && (
                            <Chip
                              label={server.transport}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          {server.tags && server.tags.length > 0 && server.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      </Box>

                      {(server.tools_count !== undefined && server.tools_count > 0) && (
                        <Box sx={{ mb: 1 }}>
                          <Chip
                            label={`${server.tools_count} tools`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Box>
                      )}

                      {server.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {server.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleServerClick(server, true)}
                        >
                          {server.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {server.transport && (
                            <Chip
                              label={server.transport}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          {server.status && (
                            <Chip
                              label={server.status}
                              size="small"
                              color={server.status === 'Running' ? 'success' : 'error'}
                              variant="filled"
                            />
                          )}
                          {server.tags && server.tags.length > 0 && server.tags
                            .filter(tag => tag.toLowerCase() !== 'deployed' && tag.toLowerCase() !== 'running')
                            .slice(0, 2)
                            .map((tag) => (
                              <Chip key={tag} label={tag} size="small" color="primary" />
                            ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, alignItems: 'center' }}>
                        {(server.tools_count !== undefined && server.tools_count > 0) && (
                          <Chip
                            label={`${server.tools_count} tools`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                        {server.ready !== undefined && (
                          <Chip
                            label={server.ready ? 'Ready' : 'Not Ready'}
                            size="small"
                            color={server.ready ? 'success' : 'warning'}
                            variant="filled"
                          />
                        )}
                      </Box>

                      {server.image && (
                        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '45px', mr: 1 }}>
                            Image:
                          </Typography>
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

                      {server.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {server.description}
                        </Typography>
                      )}

                      {server.endpoint_url && (
                        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
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

                      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
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
                  <Chip
                    label={selectedServer.tier}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 2 }}
                  />
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedServer.transport && (
                      <Chip
                        label={selectedServer.transport}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {selectedServer.status && (
                      <Chip
                        label={selectedServer.status}
                        size="small"
                        color={selectedServer.status === 'Running' ? 'success' : selectedServer.status === 'Active' ? 'success' : 'error'}
                        variant="filled"
                      />
                    )}
                    {selectedServer.ready !== undefined && (
                      <Chip
                        label={selectedServer.ready ? 'Ready' : 'Not Ready'}
                        size="small"
                        color={selectedServer.ready ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Statistics Section */}
                  {selectedServer.metadata && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedServer.metadata.stars !== undefined && (
                        <Chip
                          label={`⭐ ${selectedServer.metadata.stars.toLocaleString()}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {selectedServer.metadata.pulls !== undefined && (
                        <Chip
                          label={`📦 ${selectedServer.metadata.pulls.toLocaleString()}`}
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
                  )}
                </Box>

                {/* Overview content only - tabs removed per user request */}

                <Box sx={{ p: 3 }}>
                  {/* Overview Content */}

                  {/* Technical Details Section */}
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    📋 Technical Details
                  </Typography>

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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedServer.tags
                          .filter(tag => tag.toLowerCase() !== 'deployed' && tag.toLowerCase() !== 'running')
                          .map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                      </Box>
                    </>
                  )}
                </Box>

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
                    disabled
                    sx={{ ml: 'auto' }}
                  >
                    Deploy (Not Implemented)
                  </Button>
                )}
                <Button onClick={handleDialogClose}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
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