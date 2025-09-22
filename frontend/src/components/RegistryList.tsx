import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import {
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Registry } from './RegistryDashboard';

interface RegistryListProps {
  registries: Registry[];
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}

export const RegistryList: React.FC<RegistryListProps> = ({
  registries,
  onSync,
  onDelete,
}) => {
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (registries.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          No registries found. Create your first registry to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>URL</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Servers</TableCell>
            <TableCell>Last Sync</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {registries.map(registry => (
            <TableRow key={registry.id} hover>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2">{registry.name}</Typography>
                  {registry.description && (
                    <Typography variant="caption" color="text.secondary">
                      {registry.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {registry.url}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={registry.status}
                  color={getStatusColor(registry.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{registry.serverCount}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {registry.lastSyncAt
                    ? formatDate(registry.lastSyncAt)
                    : 'Never'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="View Details">
                  <IconButton size="small">
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sync Registry">
                  <IconButton
                    size="small"
                    onClick={() => onSync(registry.id)}
                    disabled={registry.status === 'syncing'}
                  >
                    <SyncIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Registry">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(registry.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};