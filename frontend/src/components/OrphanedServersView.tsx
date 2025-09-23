import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { OrphanedServerCard } from './OrphanedServerCard';
import { ConnectToRegistryDialog } from './ConnectToRegistryDialog';
import { api, OrphanedServer, Registry, ConnectToRegistryRequest } from '../services/api';

interface OrphanedServersViewProps {
  currentNamespace: string;
}

export const OrphanedServersView: React.FC<OrphanedServersViewProps> = ({
  currentNamespace
}) => {
  const [orphanedServers, setOrphanedServers] = useState<OrphanedServer[]>([]);
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<OrphanedServer | null>(null);

  const loadOrphanedServers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [orphanedResponse, registriesResponse] = await Promise.all([
        api.getOrphanedServers(currentNamespace),
        api.getRegistries(currentNamespace)
      ]);

      setOrphanedServers(orphanedResponse.servers);
      setRegistries(registriesResponse);
    } catch (err) {
      console.error('Error loading orphaned servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orphaned servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrphanedServers();
  }, [currentNamespace]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrphanedServers();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectToRegistry = (server: OrphanedServer) => {
    setSelectedServer(server);
    setConnectDialogOpen(true);
  };

  const handleConnectDialogClose = () => {
    setConnectDialogOpen(false);
    setSelectedServer(null);
  };

  const handleConnect = async (
    serverName: string,
    registryName: string,
    registryNamespace: string,
    serverNameInRegistry: string,
    serverNamespace: string
  ) => {
    try {
      const request: ConnectToRegistryRequest = {
        registryName,
        registryNamespace,
        serverNameInRegistry
      };

      await api.connectServerToRegistry(serverName, request, serverNamespace);

      // Refresh the orphaned servers list
      await loadOrphanedServers();

      // Close the dialog
      handleConnectDialogClose();
    } catch (error) {
      console.error('Error connecting server to registry:', error);
      throw error; // Let the dialog handle the error display
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading orphaned servers...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Unregistered Servers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            MCPServers not registered with any registry in namespace: {currentNamespace}
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Server count info */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1">
          Found {orphanedServers.length} unregistered server{orphanedServers.length !== 1 ? 's' : ''}
        </Typography>
        {orphanedServers.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            These servers exist in Kubernetes but are not registered with any MCPRegistry.
          </Typography>
        )}
      </Box>

      {/* Server cards */}
      {orphanedServers.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          {loading ? 'Loading...' : 'No unregistered servers found in this namespace. All servers appear to be properly registered with registries.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {orphanedServers.map((server) => (
            <Grid item xs={12} md={6} lg={4} key={`${server.namespace}/${server.name}`}>
              <OrphanedServerCard
                server={server}
                onConnect={handleConnectToRegistry}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Connect to Registry Dialog */}
      <ConnectToRegistryDialog
        open={connectDialogOpen}
        server={selectedServer}
        registries={registries.map(reg => ({
          id: reg.id,
          name: reg.name,
          namespace: currentNamespace
        }))}
        onClose={handleConnectDialogClose}
        onConnect={handleConnect}
      />
    </Box>
  );
};