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
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandIcon,
  Visibility as ViewIcon,
  CloudUpload as DeployIcon,
  Code as ManifestIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { Registry } from '../App';

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
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
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
                onClick={() => onServerClick(server, isDeployed)}
              >
                {server.name}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {server.tier && (
                <Chip
                  label={server.tier}
                  color={server.tier === 'official' ? 'primary' : server.tier === 'community' ? 'secondary' : 'default'}
                  size="small"
                  variant="outlined"
                />
              )}
              {isDeployed && server.status && (
                <Chip
                  label={server.status}
                  color={server.status === 'Running' ? 'success' : server.status === 'Pending' ? 'warning' : 'error'}
                  size="small"
                />
              )}
            </Box>
          </Box>

          {/* Basic Info */}
          <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {server.transport && (
              <Chip
                label={server.transport}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
            {server.tools_count !== undefined && server.tools_count > 0 && (
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
                variant="outlined"
              />
            )}
          </Box>

          {/* Description */}
          {server.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
              {server.description}
            </Typography>
          )}

          {/* Expandable Details */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Divider sx={{ mb: 2 }} />

            {/* Technical Details */}
            <Box sx={{ mb: 2, bgcolor: 'grey.50', borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                  Image:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                  {server.image}{server.version && `:${server.version}`}
                </Typography>
                <Tooltip title="Copy Image">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(`${server.image}${server.version ? `:${server.version}` : ''}`)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {server.endpoint_url && (
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                    Endpoint:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                    {server.endpoint_url}
                  </Typography>
                  <Tooltip title="Copy Endpoint">
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(server.endpoint_url!)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {server.namespace && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                    Namespace:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {server.namespace}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Tags */}
            {server.tags && server.tags.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Tags:</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {server.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              </Box>
            )}
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
              {!isDeployed && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DeployIcon />}
                  onClick={() => onQuickDeploy?.(server)}
                >
                  Deploy
                </Button>
              )}

              <Tooltip title="View Manifest">
                <IconButton
                  size="small"
                  onClick={() => onShowManifest(server.name, isDeployed)}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <ManifestIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  onClick={() => onServerClick(server, isDeployed)}
                  sx={{
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ViewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={() => toggleCardExpansion(server.name)}
                sx={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <ExpandIcon fontSize="small" />
              </IconButton>

              {isDeployed && onDeleteServer && (
                <IconButton
                  size="small"
                  onClick={() => onDeleteServer(server)}
                  sx={{
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.light' },
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
          >
            Force Sync
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

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