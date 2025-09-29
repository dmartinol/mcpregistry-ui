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
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Register Server with Registry
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Server: {server.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will register the server with the selected registry by adding the required registry labels.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Technical Details:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            Namespace: {server.namespace}<br />
            Transport: {server.transport}<br />
            Image: {server.image}<br />
            Status: {server.status}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
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
          {connecting ? 'Registering...' : 'Register'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};