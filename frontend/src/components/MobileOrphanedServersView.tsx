import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Alert,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as CriticalIcon,
  Info as InfoIcon,
  Link as ConnectIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { OrphanedServer, Registry } from '../services/api';

interface MobileOrphanedServersViewProps {
  servers: OrphanedServer[];
  registries: Registry[];
  onConnect: (server: OrphanedServer) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  loading?: boolean;
}

const getRiskLevel = (server: OrphanedServer): 'critical' | 'warning' | 'info' => {
  const name = server.name.toLowerCase();
  const namespace = server.namespace.toLowerCase();

  // Critical: Production-like names or system namespaces
  if (
    name.includes('prod') ||
    name.includes('production') ||
    name.includes('live') ||
    name.includes('auth') ||
    name.includes('security') ||
    namespace === 'kube-system' ||
    namespace === 'default' ||
    namespace.includes('prod')
  ) {
    return 'critical';
  }

  // Warning: Development or staging
  if (
    name.includes('dev') ||
    name.includes('test') ||
    name.includes('staging') ||
    name.includes('stage') ||
    namespace.includes('dev') ||
    namespace.includes('test')
  ) {
    return 'warning';
  }

  // Info: Everything else
  return 'info';
};

const getRiskColor = (level: 'critical' | 'warning' | 'info') => {
  switch (level) {
    case 'critical': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'info';
  }
};

const getRiskIcon = (level: 'critical' | 'warning' | 'info') => {
  switch (level) {
    case 'critical': return <CriticalIcon fontSize="small" />;
    case 'warning': return <WarningIcon fontSize="small" />;
    case 'info': return <InfoIcon fontSize="small" />;
    default: return <InfoIcon fontSize="small" />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const MobileOrphanedServersView: React.FC<MobileOrphanedServersViewProps> = ({
  servers,
  registries,
  onConnect,
  onRefresh,
  refreshing,
  loading,
}) => {
  const theme = useTheme();

  // Categorize servers by risk level
  const criticalServers = servers.filter(s => getRiskLevel(s) === 'critical');

  const getServerKey = (server: OrphanedServer) => `${server.namespace}/${server.name}`;

  const SimplifiedServerCard: React.FC<{ server: OrphanedServer }> = ({ server }) => {
    const riskLevel = getRiskLevel(server);
    const riskColor = getRiskColor(riskLevel);
    const riskIcon = getRiskIcon(riskLevel);

    return (
      <Card
        elevation={1}
        sx={{
          borderRadius: 2,
          border: riskLevel === 'critical' ? `1px solid ${theme.palette.error.main}` : 'none',
          transition: 'all 0.2s ease-in-out',
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: `${riskColor}.main` }}>{riskIcon}</Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {server.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {server.namespace} • {formatTimeAgo(server.createdAt)}
                </Typography>
                {riskLevel === 'critical' && (
                  <Chip
                    label="Critical"
                    color="error"
                    size="small"
                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600 }}
                  />
                )}
              </Box>
            </Box>

            {/* Single Connect Action */}
            <Button
              size="small"
              variant="contained"
              startIcon={<ConnectIcon />}
              onClick={() => onConnect(server)}
              sx={{
                minWidth: 100,
                fontSize: '0.75rem',
                height: 32,
              }}
              disabled={registries.length === 0}
            >
              Connect
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };


  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading orphaned servers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      {/* Simple Status Dashboard */}
      <Card
        elevation={2}
        sx={{
          mb: 3,
          background: servers.length > 0
            ? 'linear-gradient(135deg, #fff3e0 0%, #fef7e0 100%)'
            : 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
          border: `1px solid ${
            servers.length > 0
              ? theme.palette.warning.light
              : theme.palette.success.light
          }`,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Status indicator dot */}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: servers.length > 0 ? 'warning.main' : 'success.main',
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }}>
                  Unregistered Servers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  {servers.length === 0 ? 'All servers registered' : `${servers.length} need attention`}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={onRefresh}
              disabled={refreshing}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { bgcolor: 'grey.300' },
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {refreshing && (
            <LinearProgress sx={{ mb: 2, borderRadius: 1, height: 3 }} />
          )}

          {/* Simple count display */}
          {servers.length > 0 && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: criticalServers.length > 0 ? 'error.main' : 'warning.main' }}>
                {servers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                server{servers.length !== 1 ? 's' : ''} to register
                {criticalServers.length > 0 && (
                  <Chip
                    label={`${criticalServers.length} critical`}
                    size="small"
                    color="error"
                    sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Flat Server List */}
      {servers.length === 0 ? (
        <Alert severity="success" sx={{ mt: 3 }}>
          No unregistered servers found. All servers are properly registered.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {servers.map((server) => (
            <SimplifiedServerCard key={getServerKey(server)} server={server} />
          ))}
        </Box>
      )}

      {registries.length === 0 && servers.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          No registries available for registration. Create a registry first.
        </Alert>
      )}
    </Box>
  );
};