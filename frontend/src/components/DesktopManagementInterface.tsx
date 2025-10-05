import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  GitHub as GitIcon,
  Sync as SyncIcon,
  Launch as LaunchIcon,
  Delete as DeleteIcon,
  Code as ManifestIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { Registry } from '../App';

interface DesktopManagementInterfaceProps {
  registries: Registry[];
  onRegistryClick: (registryId: string) => void;
  onCreateRegistry: () => void;
  onRefresh: () => void;
  onForceSync: (registryId: string, event: React.MouseEvent) => void;
  onShowManifest: (registryId: string) => void;
  onDelete: (registry: Registry) => void;
  refreshing?: boolean;
  currentNamespace: string;
  onNamespaceChange: (namespace: string) => void;
}

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'ready':
      return 'success';
    case 'syncing':
    case 'pending':
      return 'warning';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

const getSourceIcon = (type: string) => {
  switch (type) {
    case 'git':
      return <GitIcon fontSize="small" />;
    case 'configmap':
      return <StorageIcon fontSize="small" />;
    default:
      return <StorageIcon fontSize="small" />;
  }
};

const getSourceColor = (type: string): 'primary' | 'secondary' | 'default' => {
  switch (type) {
    case 'git':
      return 'primary';
    case 'configmap':
      return 'secondary';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const DesktopManagementInterface: React.FC<DesktopManagementInterfaceProps> = ({
  registries,
  onRegistryClick,
  onCreateRegistry,
  onRefresh,
  onForceSync,
  onShowManifest,
  onDelete,
  refreshing,
  currentNamespace,
  onNamespaceChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleCardExpansion = (registryId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(registryId)) {
      newExpanded.delete(registryId);
    } else {
      newExpanded.add(registryId);
    }
    setExpandedCards(newExpanded);
  };

  // Filter registries based on search and filters
  const filteredRegistries = registries.filter(registry => {
    const matchesSearch = !searchQuery ||
      registry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registry.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || registry.status === statusFilter;

    const matchesSourceType = sourceTypeFilter === 'all' || registry.source?.type === sourceTypeFilter;

    return matchesSearch && matchesStatus && matchesSourceType;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSourceTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sourceTypeFilter !== 'all';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Actions */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Registry Management
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Namespace</InputLabel>
            <Select
              value={currentNamespace}
              label="Namespace"
              onChange={(e) => onNamespaceChange(e.target.value)}
            >
              <MenuItem value="toolhive-system">toolhive-system</MenuItem>
              <MenuItem value="default">default</MenuItem>
              <MenuItem value="kube-system">kube-system</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateRegistry}
            sx={{ minWidth: 140 }}
          >
            Create Registry
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={refreshing}
            sx={{ minWidth: 120 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search registries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="syncing">Syncing</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={sourceTypeFilter}
                label="Source"
                onChange={(e) => setSourceTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="git">Git</MenuItem>
                <MenuItem value="configmap">ConfigMap</MenuItem>
                <MenuItem value="http">HTTP</MenuItem>
              </Select>
            </FormControl>

            {hasActiveFilters && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
              >
                Clear
              </Button>
            )}
          </Box>

          {hasActiveFilters && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Active filters:
              </Typography>
              {searchQuery && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  size="small"
                  onDelete={() => setSearchQuery('')}
                />
              )}
              {statusFilter !== 'all' && (
                <Chip
                  label={`Status: ${statusFilter}`}
                  size="small"
                  onDelete={() => setStatusFilter('all')}
                />
              )}
              {sourceTypeFilter !== 'all' && (
                <Chip
                  label={`Source: ${sourceTypeFilter}`}
                  size="small"
                  onDelete={() => setSourceTypeFilter('all')}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredRegistries.length} of {registries.length} registries
          {currentNamespace && ` in namespace "${currentNamespace}"`}
        </Typography>
      </Box>

      {/* Registry Cards */}
      <Grid container spacing={3}>
        {filteredRegistries.map((registry) => {
          const isExpanded = expandedCards.has(registry.id);

          return (
            <Grid item xs={12} lg={6} key={registry.id}>
              <Card
                elevation={2}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                        flex: 1,
                        fontWeight: 600,
                      }}
                      onClick={() => onRegistryClick(registry.id)}
                    >
                      {registry.name}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {registry.source && (
                        <Tooltip title={`${registry.source.type.toUpperCase()} Source: ${registry.source.location}`}>
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

                  {/* Registry Info */}
                  <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={`${registry.serverCount} Server${registry.serverCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />

                    {registry.source?.syncInterval && (
                      <Chip
                        icon={<SyncIcon fontSize="small" />}
                        label={registry.source.syncInterval === 'manual' ? 'Manual' : `Auto (${registry.source.syncInterval})`}
                        size="small"
                        color={registry.source.syncInterval === 'manual' ? 'default' : 'success'}
                        variant="outlined"
                      />
                    )}

                    {(registry.syncStatus?.lastSyncTime || registry.lastSyncAt) && (
                      <Chip
                        label={`Synced ${formatDate(registry.syncStatus?.lastSyncTime || registry.lastSyncAt!)}`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Description */}
                  {registry.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                      {registry.description}
                    </Typography>
                  )}

                  {/* Expandable Details */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ mb: 2 }} />

                    {/* URL Info */}
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
                            mr: 1,
                          }}
                        >
                          {registry.url}
                        </Typography>
                        <Tooltip title="Copy URL">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(registry.url)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}

                    {/* Metadata */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" display="block">
                        Created: {formatDate(registry.createdAt)}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Updated: {formatDate(registry.updatedAt)}
                      </Typography>
                      {registry.metadata?.namespace && (
                        <Typography variant="caption" display="block">
                          Namespace: {registry.metadata.namespace}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>

                  {/* Actions */}
                  <Box sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SyncIcon />}
                        onClick={(e) => onForceSync(registry.id, e)}
                        sx={{ minWidth: 100 }}
                      >
                        Sync
                      </Button>

                      <Tooltip title="View Registry Manifest">
                        <IconButton
                          size="small"
                          onClick={() => onShowManifest(registry.id)}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <ManifestIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Open Registry">
                        <IconButton
                          size="small"
                          onClick={() => onRegistryClick(registry.id)}
                          sx={{
                            bgcolor: 'action.selected',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => toggleCardExpansion(registry.id)}
                        sx={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                        }}
                      >
                        <ExpandIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => onDelete(registry)}
                        sx={{
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.light' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredRegistries.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          {hasActiveFilters
            ? 'No registries match your current filters.'
            : 'No registries found. Create your first registry to get started.'}
        </Alert>
      )}
    </Box>
  );
};