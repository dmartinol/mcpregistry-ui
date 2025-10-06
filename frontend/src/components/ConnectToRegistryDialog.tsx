import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { OrphanedServer } from './OrphanedServerCard';

interface Registry {
  id: string;
  name: string;
  namespace?: string;
}

interface ConnectToRegistryDialogProps {
  open: boolean;
  server: OrphanedServer | null;
  registries: Registry[];
  onClose: () => void;
  onConnect: (
    serverName: string,
    registryName: string,
    registryNamespace: string,
    serverNameInRegistry: string,
    serverNamespace: string
  ) => Promise<void>;
}

export const ConnectToRegistryDialog: React.FC<ConnectToRegistryDialogProps> = ({
  open,
  server,
  registries,
  onClose,
  onConnect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedRegistry, setSelectedRegistry] = useState('');
  const [serverNameInRegistry, setServerNameInRegistry] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or server changes
  useEffect(() => {
    if (open && server) {
      setSelectedRegistry('');
      setServerNameInRegistry(server.name); // Default to server name
      setError(null);
    } else {
      setSelectedRegistry('');
      setServerNameInRegistry('');
      setError(null);
    }
  }, [open, server]);

  const handleConnect = async () => {
    if (!server || !selectedRegistry || !serverNameInRegistry.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const registry = registries.find(r => r.id === selectedRegistry);
    if (!registry) {
      setError('Selected registry not found');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      await onConnect(
        server.name,
        registry.id,
        registry.namespace || 'toolhive-system',
        serverNameInRegistry.trim(),
        server.namespace
      );
      onClose();
    } catch (err) {
      console.error('Error connecting server to registry:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect server to registry');
    } finally {
      setConnecting(false);
    }
  };

  const handleClose = () => {
    if (!connecting) {
      onClose();
    }
  };

  if (!server) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isMobile ? false : "sm"}
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        Connect Server to Registry
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Server: {server.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will connect the server to the selected registry by adding the required registry labels.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 2 : 3
        }}>
          <FormControl fullWidth required>
            <InputLabel>Registry</InputLabel>
            <Select
              value={selectedRegistry}
              label="Registry"
              onChange={(e) => setSelectedRegistry(e.target.value)}
              disabled={connecting}
            >
              {registries.map((registry) => (
                <MenuItem key={registry.id} value={registry.id}>
                  {registry.name}
                  {registry.namespace && registry.namespace !== 'toolhive-system' && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({registry.namespace})
                    </Typography>
                  )}
                </MenuItem>
              ))}
              {registries.length === 0 && (
                <MenuItem disabled>
                  No registries available
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField
            label="Server Name in Registry"
            value={serverNameInRegistry}
            onChange={(e) => setServerNameInRegistry(e.target.value)}
            fullWidth
            required
            disabled={connecting}
            helperText="The name this server should have within the registry (defaults to current server name)"
            placeholder={server.name}
          />
        </Box>

      </DialogContent>

      <DialogActions sx={{
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1 : 0,
        p: isMobile ? 2 : 1,
        '& .MuiButton-root': {
          minHeight: isMobile ? 48 : 36,
          width: isMobile ? '100%' : 'auto'
        }
      }}>
        <Button
          onClick={handleClose}
          disabled={connecting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connecting || !selectedRegistry || !serverNameInRegistry.trim() || registries.length === 0}
          startIcon={connecting ? <CircularProgress size={16} /> : undefined}
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};