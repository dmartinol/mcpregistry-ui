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
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { ServerCard } from '../components/ServerCard';
import { DeployedServerCard } from '../components/DeployedServerCard';
import { api } from '../services/api';

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

export const SimpleRegistryDetailPage: React.FC = () => {
  const { registryId } = useParams<{ registryId: string }>();
  const navigate = useNavigate();
  const [registry, setRegistry] = useState<any>(null);
  const [availableServers, setAvailableServers] = useState<any[]>([]);
  const [deployedServers, setDeployedServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [serversLoading, setServersLoading] = useState(false);
  const [deployedLoading, setDeployedLoading] = useState(false);

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

    if (registryId) {
      loadData();
    }
  }, [registryId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBreadcrumbClick = () => {
    navigate('/');
  };

  const handleShowServerManifest = async (serverName: string) => {
    try {
      const manifestData = await api.getServerManifest(registryId!, serverName);
      return manifestData;
    } catch (error) {
      console.error('Failed to load server manifest:', error);
      throw error;
    }
  };

  const handleShowDeployedManifest = async (server: any) => {
    try {
      const manifestData = await api.getDeployedServerManifest(registryId!, server.name || server.id);
      return manifestData;
    } catch (error) {
      console.error('Failed to load deployed server manifest:', error);
      throw error;
    }
  };

  const handleDeployServer = async (server: any) => {
    try {
      const config = {
        name: server.name,
        image: server.image,
        transport: 'http' as const,
        targetPort: 8080,
        port: 8080,
        permissionProfile: {
          type: 'builtin' as const,
          name: 'default'
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi'
          },
          requests: {
            cpu: '50m',
            memory: '64Mi'
          }
        },
        environmentVariables: [],
        namespace: 'default',
        registryName: registry?.name || 'unknown',
        registryNamespace: 'default'
      };
      await api.deployServer(registryId!, server.name, config);
      // Reload deployed servers
      setDeployedLoading(true);
      try {
        const deployedData = await api.getDeployedServers(registryId!);
        setDeployedServers(deployedData.servers);
      } catch (err) {
        console.warn('Failed to reload deployed servers:', err);
      }
      setDeployedLoading(false);
    } catch (error) {
      console.error('Failed to deploy server:', error);
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
          <Typography variant="h4" component="h1" gutterBottom>
            {registry.name}
          </Typography>

          {registry.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {registry.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              <strong>URL:</strong> {registry.url}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {registry.status}
            </Typography>
            <Typography variant="body2">
              <strong>Server Count:</strong> {registry.serverCount}
            </Typography>
          </Box>
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
                    onShowManifest={() => handleShowDeployedManifest(server)}
                  />
                ))}
              </Box>
            )}
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};