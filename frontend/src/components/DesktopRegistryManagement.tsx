/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandIcon,
  CloudUpload as DeployIcon,
  Code as ManifestIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Storage as StorageIcon,
  GitHub as GitIcon,
} from '@mui/icons-material';
import { Registry } from '../App';
import { getDisplayName } from '../utils/displayNames';

interface Server {
  name: string;
  image: string;
  description?: string;
  tags?: string[];
  tier?: string;
  transport?: string;
  status?: string;
  ready?: boolean;
  tools_count?: number;
  logoUrl?: string;
  endpoint_url?: string;
  version?: string;
  namespace?: string;
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

interface DesktopRegistryManagementProps {
  registry: Registry;
  availableServers: Server[];
  deployedServers: Server[];
  onServerClick: (server: Server, isDeployed: boolean) => void;
  onForceSync: (event: React.MouseEvent) => void;
  onRefresh: () => void;
  onShowManifest: (serverName: string, isDeployed: boolean) => void;
  onDeleteServer?: (server: Server) => void;
  onQuickDeploy?: (server: Server) => void;
  refreshing?: boolean;
  serversLoading?: boolean;
  deployedServersLoading?: boolean;
}

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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const DesktopRegistryManagement: React.FC<DesktopRegistryManagementProps> = ({
  registry,
  availableServers,
  deployedServers,
  onServerClick,
  onForceSync,
  onRefresh,
  onShowManifest,
  onDeleteServer,
  onQuickDeploy,
  refreshing,
  serversLoading,
  deployedServersLoading,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilters, setTransportFilters] = useState<string[]>([]);
  const [tierFilters, setTierFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleCardExpansion = (serverName: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedCards(newExpanded);
  };

  // Filter logic
  const filterServers = (serverList: Server[]) => {
    return serverList.filter(server => {
      const matchesSearch = !searchQuery ||
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTransport = transportFilters.length === 0 || transportFilters.includes(server.transport || '');
      const matchesTier = tierFilters.length === 0 || tierFilters.includes(server.tier || '');
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(server.status || '');

      return matchesSearch && matchesTransport && matchesTier && matchesStatus;
    });
  };

  const filteredAvailableServers = filterServers(availableServers);
  const filteredDeployedServers = filterServers(deployedServers);

  // Get unique values for filters
  const getAllTransports = () => {
    const transports = new Set<string>();
    [...availableServers, ...deployedServers].forEach(server => {
      if (server.transport) transports.add(server.transport);
    });
    return Array.from(transports);
  };

  const getAllTiers = () => {
    const tiers = new Set<string>();
    [...availableServers, ...deployedServers].forEach(server => {
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

  const hasActiveFilters = searchQuery || transportFilters.length > 0 || tierFilters.length > 0 || statusFilters.length > 0;

  const ServerCard: React.FC<{ server: Server; isDeployed: boolean }> = ({ server, isDeployed }) => {
    const isExpanded = expandedCards.has(server.name);

    return (
      <Card
        elevation={2}
        sx={{
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-1px)',
          },
        }}
      >
        <CardContent sx={{ pb: '12px !important' }}>
          {/* CRITICAL TIER - Always Visible Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              {/* Logo */}
              {server.logoUrl && (
                <Box
                  component="img"
                  src={server.logoUrl}
                  alt={`${server.name} logo`}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    objectFit: 'contain',
                    flexShrink: 0,
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              {/* Name - Clickable */}
              <Typography
                variant="subtitle1"
                component="h3"
                sx={{
                  cursor: 'pointer',
                  color: 'text.primary',
                  '&:hover': { color: 'primary.main' },
                  flex: 1,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
                onClick={() => onServerClick(server, isDeployed)}
              >
                {getDisplayName(server.name)}
              </Typography>
            </Box>

            {/* Right-side indicators */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Status Indicator Dot */}
              <Tooltip title={
                isDeployed
                  ? `Status: ${server.status}${server.ready ? ' (Ready)' : ' (Not Ready)'}`
                  : `Availability: ${server.ready ? 'Ready' : 'Not Ready'}`
              }>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isDeployed
                      ? (server.status === 'Running' ? 'success.main' : server.status === 'Pending' ? 'warning.main' : 'error.main')
                      : (server.ready ? 'success.main' : 'grey.400'),
                    flexShrink: 0,
                  }}
                />
              </Tooltip>

              {/* Tier Badge - Only if official/community */}
              {server.tier && server.tier.toLowerCase() !== 'experimental' && (
                <Tooltip title={`Tier: ${server.tier} Server`}>
                  <Chip
                    label={server.tier.toLowerCase() === 'official' ? '⭐' : '👥'}
                    size="small"
                    sx={{
                      minWidth: 28,
                      height: 20,
                      fontSize: '0.8rem',
                      bgcolor: server.tier.toLowerCase() === 'official' ? '#fff3e0' : '#e3f2fd',
                      color: server.tier.toLowerCase() === 'official' ? '#f57c00' : '#1976d2',
                      border: '1px solid',
                      borderColor: server.tier.toLowerCase() === 'official' ? '#ffb74d' : '#64b5f6',
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontWeight: 600
                      }
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* CRITICAL TIER - Compact Status Line */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.75rem',
              lineHeight: 1.3,
              mb: server.description ? 1 : 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              flexWrap: 'wrap'
            }}
          >
            {/* Transport */}
            <span style={{ fontWeight: 500 }}>{server.transport || 'stdio'}</span>
            <span>•</span>
            {/* Tools Count */}
            <span>{server.tools_count || 0} tools</span>
            <span>•</span>
            {/* Status */}
            <span style={{
              color: isDeployed
                ? (server.status === 'Running' ? '#2e7d32' : server.status === 'Pending' ? '#ed6c02' : '#d32f2f')
                : (server.ready ? '#2e7d32' : '#757575')
            }}>
              {isDeployed ? server.status : (server.ready ? 'ready' : 'not ready')}
            </span>
          </Typography>

          {/* SECONDARY TIER - Description (if available) */}
          {server.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1.5,
                lineHeight: 1.4,
                fontSize: '0.85rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {server.description}
            </Typography>
          )}

          {/* TERTIARY TIER - Expandable Technical Details */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ mb: 1.5, bgcolor: 'grey.50', borderRadius: 1, p: 1.5, fontSize: '0.8rem' }}>
              {/* Image */}
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, minWidth: '50px' }}>
                  Image:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                  {server.image}{server.version && `:${server.version}`}
                </Typography>
                <Tooltip title="Copy Image">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(`${server.image}${server.version ? `:${server.version}` : ''}`)}
                    sx={{ p: 0.25 }}
                  >
                    <CopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Endpoint */}
              {server.endpoint_url && (
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: '50px' }}>
                    URL:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                    {server.endpoint_url}
                  </Typography>
                  <Tooltip title="Copy URL">
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(server.endpoint_url!)}
                      sx={{ p: 0.25 }}
                    >
                      <CopyIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {/* Namespace */}
              {server.namespace && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: '50px' }}>
                    NS:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {server.namespace}
                  </Typography>
                </Box>
              )}

              {/* Tags */}
              {server.tags && server.tags.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {server.tags.slice(0, 6).map((tag) => (
                    <Typography
                      key={tag}
                      variant="caption"
                      sx={{
                        bgcolor: 'background.paper',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: '0.7rem'
                      }}
                    >
                      {tag}
                    </Typography>
                  ))}
                  {server.tags.length > 6 && (
                    <Typography variant="caption" color="text.secondary">
                      +{server.tags.length - 6} more
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>

          {/* ACTION TIER - Smart Grouped Actions */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pt: 0.5
          }}>
            {/* Primary Actions */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {!isDeployed && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<DeployIcon fontSize="small" />}
                  onClick={() => onQuickDeploy?.(server)}
                  sx={{
                    height: 32,
                    minWidth: 100,
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Deploy
                </Button>
              )}

              {/* Secondary Actions - Icon Only */}
              <Tooltip title="View Manifest">
                <IconButton
                  size="small"
                  onClick={() => onShowManifest(server.name, isDeployed)}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ManifestIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Utility Actions */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={() => toggleCardExpansion(server.name)}
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.hover' },
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <ExpandIcon fontSize="small" />
              </IconButton>

              {/* Destructive Action - Separated */}
              {isDeployed && onDeleteServer && (
                <IconButton
                  size="small"
                  onClick={() => onDeleteServer(server)}
                  sx={{
                    width: 28,
                    height: 28,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                    ml: 0.5
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

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
          {registry.name} - Server Management
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={onForceSync}
            disabled={refreshing || registry.status === 'syncing'}
            size="small"
            sx={{
              height: 32,
              minWidth: 120,
              fontSize: '0.8rem'
            }}
          >
            Force Sync
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={refreshing}
            size="small"
            sx={{
              height: 32,
              minWidth: 120,
              fontSize: '0.8rem'
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Registry Metadata Panel */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Registry Details
          </Typography>

          {/* Compact Status Line */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getSourceIcon(registry.source?.type || 'configmap')}
              <span style={{ fontWeight: 600 }}>{registry.source?.type || 'unknown'}</span>
              <span>•</span>
              <span>{registry.serverCount} server{registry.serverCount !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>
                {registry.source?.syncInterval
                  ? (registry.source.syncInterval === 'manual' ? 'manual sync' : `auto ${registry.source.syncInterval}`)
                  : 'manual sync'}
              </span>
              <span>•</span>
              <span>
                {(registry.syncStatus?.lastSyncTime || registry.lastSyncAt)
                  ? `${formatDate(registry.syncStatus?.lastSyncTime || registry.lastSyncAt!)} ago`
                  : 'not synced'}
              </span>
            </Typography>

            {/* Data Source Location */}
            {registry.url && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  bgcolor: 'grey.50',
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {registry.url}
                </span>
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(registry.url)}
                    sx={{ p: 0.25 }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
            )}
          </Box>

          {/* Additional Metadata */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Status:
              </Typography>
              <Chip
                label={registry.status}
                color={registry.status === 'active' ? 'success' : registry.status === 'syncing' ? 'warning' : 'error'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Created:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {formatDate(registry.createdAt)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Updated:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {formatDate(registry.updatedAt)}
              </Typography>
            </Box>

            {registry.metadata?.namespace && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Namespace:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {registry.metadata.namespace}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap', mb: 2 }}>
            <TextField
              placeholder="Search servers..."
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
              <InputLabel>Transport</InputLabel>
              <Select
                multiple
                value={transportFilters}
                label="Transport"
                onChange={(e) => setTransportFilters(e.target.value as string[])}
              >
                {getAllTransports().map((transport) => (
                  <MenuItem key={transport} value={transport}>
                    {transport}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tier</InputLabel>
              <Select
                multiple
                value={tierFilters}
                label="Tier"
                onChange={(e) => setTierFilters(e.target.value as string[])}
              >
                {getAllTiers().map((tier) => (
                  <MenuItem key={tier} value={tier}>
                    {tier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {tabValue === 1 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  multiple
                  value={statusFilters}
                  label="Status"
                  onChange={(e) => setStatusFilters(e.target.value as string[])}
                >
                  {getAllStatuses().map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
              {transportFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={`Transport: ${filter}`}
                  size="small"
                  onDelete={() => setTransportFilters(transportFilters.filter(f => f !== filter))}
                />
              ))}
              {tierFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={`Tier: ${filter}`}
                  size="small"
                  onDelete={() => setTierFilters(tierFilters.filter(f => f !== filter))}
                />
              ))}
              {statusFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={`Status: ${filter}`}
                  size="small"
                  onDelete={() => setStatusFilters(statusFilters.filter(f => f !== filter))}
                />
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper elevation={1}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="server management tabs"
          >
            <Tab label={`Available Servers (${filteredAvailableServers.length})`} />
            <Tab label={`Deployed Servers (${filteredDeployedServers.length})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {serversLoading ? (
            <Typography>Loading available servers...</Typography>
          ) : (
            <Grid container spacing={3}>
              {/* eslint-disable-next-line react/prop-types */}
              {filteredAvailableServers.map((server) => (
                <Grid item xs={12} lg={6} key={server.name}>
                  <ServerCard server={server} isDeployed={false} />
                </Grid>
              ))}
              {filteredAvailableServers.length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {hasActiveFilters ? 'No servers match your current filters.' : 'No available servers found.'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {deployedServersLoading ? (
            <Typography>Loading deployed servers...</Typography>
          ) : (
            <Grid container spacing={3}>
              {/* eslint-disable-next-line react/prop-types */}
              {filteredDeployedServers.map((server) => (
                <Grid item xs={12} lg={6} key={server.name}>
                  <ServerCard server={server} isDeployed={true} />
                </Grid>
              ))}
              {filteredDeployedServers.length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {hasActiveFilters ? 'No servers match your current filters.' : 'No deployed servers found.'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};