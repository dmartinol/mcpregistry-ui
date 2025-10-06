import React, { useState, useEffect, useCallback } from 'react';
import { useTheme, useMediaQuery, Box, CircularProgress, Alert } from '@mui/material';
import { MobileOrphanedServersView } from './MobileOrphanedServersView';
import { OrphanedServersView } from './OrphanedServersView';
import { ConnectToRegistryDialog } from './ConnectToRegistryDialog';
import { OrphanedServerDialog } from './OrphanedServerDialog';
import { api, OrphanedServer, ConnectToRegistryRequest, Registry } from '../services/api';

interface ResponsiveOrphanedServersViewProps {
  currentNamespace: string;
}

export const ResponsiveOrphanedServersView: React.FC<ResponsiveOrphanedServersViewProps> = ({ currentNamespace }) => {
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Data loading state
  const [orphanedServers, setOrphanedServers] = useState<OrphanedServer[]>([]);
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<OrphanedServer | null>(null);

  const loadData = useCallback(async () => {
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
  }, [currentNamespace]);

  useEffect(() => {
    loadData();
  }, [currentNamespace, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async (server: OrphanedServer) => {
    setSelectedServer(server);
    setConnectDialogOpen(true);
  };

  const handleConnectDialogClose = () => {
    setConnectDialogOpen(false);
    setSelectedServer(null);
  };

  const handleServerClick = (server: OrphanedServer) => {
    // Show server details dialog (same as clicking server name)
    setSelectedServer(server);
    setDetailsDialogOpen(true);
  };

  const handleShowManifest = (server: OrphanedServer) => {
    // For orphaned servers, show details instead of manifest
    handleServerClick(server);
  };

  const handleConnectFromDetails = () => {
    // Close details dialog and open connect dialog with same server
    setDetailsDialogOpen(false);
    setConnectDialogOpen(true);
  };

  const handleConnectToRegistry = async (
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
      await loadData();

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
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (isMobileOrTablet) {
    // Mobile/Tablet: Simplified monitoring interface
    return (
      <>
        <MobileOrphanedServersView
          servers={orphanedServers}
          registries={registries}
          onConnect={handleConnect}
          onRefresh={handleRefresh}
          onServerClick={handleServerClick}
          onShowManifest={handleShowManifest}
          refreshing={refreshing}
          loading={loading}
        />

        {/* Server Details Dialog */}
        <OrphanedServerDialog
          open={detailsDialogOpen}
          server={selectedServer}
          onClose={() => setDetailsDialogOpen(false)}
          onConnect={handleConnectFromDetails}
        />

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
          onConnect={handleConnectToRegistry}
        />
      </>
    );
  }

  // Desktop: Full management interface (existing implementation)
  return (
    <OrphanedServersView
      currentNamespace={currentNamespace}
    />
  );
};