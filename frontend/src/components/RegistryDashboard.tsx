import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { RegistryList } from './RegistryList';
import { RegistryForm } from './RegistryForm';
import { ApiClient } from '../services/ApiClient';

export interface Registry {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  serverCount: number;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryListResponse {
  registries: Registry[];
  total: number;
  limit: number;
  offset: number;
}

const RegistryDashboard: React.FC = () => {
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [total, setTotal] = useState(0);

  const apiClient = new ApiClient();

  const loadRegistries = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getRegistries();
      setRegistries(response.registries);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegistry = async (data: {
    name: string;
    url: string;
    description?: string;
  }): Promise<void> => {
    try {
      await apiClient.createRegistry(data);
      setShowCreateForm(false);
      await loadRegistries();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  const handleSyncRegistry = async (id: string): Promise<void> => {
    try {
      await apiClient.syncRegistry(id);
      // Refresh the list to show updated sync status
      await loadRegistries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync registry');
    }
  };

  const handleDeleteRegistry = async (id: string): Promise<void> => {
    try {
      await apiClient.deleteRegistry(id);
      await loadRegistries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete registry');
    }
  };

  useEffect(() => {
    loadRegistries();
  }, []);

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Registry Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadRegistries}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateForm(true)}
            data-testid="add-registry-button"
          >
            Add Registry
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Registries
              </Typography>
              <Typography variant="h3" color="primary">
                {total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Registries
              </Typography>
              <Typography variant="h3" color="success.main">
                {registries.filter(r => r.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Servers
              </Typography>
              <Typography variant="h3" color="info.main">
                {registries.reduce((sum, r) => sum + r.serverCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Registry List */}
        <Grid item xs={12}>
          <RegistryList
            registries={registries}
            onSync={handleSyncRegistry}
            onDelete={handleDeleteRegistry}
          />
        </Grid>
      </Grid>

      {/* Create Registry Form Dialog */}
      <RegistryForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateRegistry}
        title="Create New Registry"
      />
    </Box>
  );
};

export default RegistryDashboard;