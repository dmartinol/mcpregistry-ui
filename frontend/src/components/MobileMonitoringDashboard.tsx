import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { Registry } from '../App';

interface MobileMonitoringDashboardProps {
  registries: Registry[];
  onRegistryClick: (registryId: string) => void;
  onRefresh: () => void;
  onForceSync: (registryId: string, event: React.MouseEvent) => void;
  refreshing?: boolean;
}

const getStatusIcon = (status: string, serverCount: number) => {
  const hasIssues = status !== 'active' && status !== 'ready';
  const hasServers = serverCount > 0;

  if (hasIssues) {
    return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
  }
  if (!hasServers) {
    return <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
  }
  return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
};

const getStatusColor = (status: string, serverCount: number): 'success' | 'warning' | 'error' => {
  const hasIssues = status !== 'active' && status !== 'ready';
  const hasServers = serverCount > 0;

  if (hasIssues) return 'error';
  if (!hasServers) return 'warning';
  return 'success';
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export const MobileMonitoringDashboard: React.FC<MobileMonitoringDashboardProps> = ({
  registries,
  onRegistryClick,
  onRefresh,
  onForceSync,
  refreshing,
}) => {
  const theme = useTheme();

  // Calculate system overview stats
  const totalServers = registries.reduce((sum, reg) => sum + reg.serverCount, 0);
  const activeRegistries = registries.filter(reg =>
    reg.status === 'active' || reg.status === 'ready'
  ).length;
  const hasIssues = registries.some(reg =>
    reg.status !== 'active' && reg.status !== 'ready'
  );

  const systemStatus = hasIssues ? 'warning' : 'success';
  const systemStatusText = hasIssues ? 'Issues Detected' : 'All Systems Healthy';

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      {/* System Overview Card */}
      <Card
        elevation={2}
        sx={{
          mb: 3,
          background: systemStatus === 'success'
            ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
            : 'linear-gradient(135deg, #fff3e0 0%, #fef7e0 100%)',
          border: `1px solid ${systemStatus === 'success' ? theme.palette.success.light : theme.palette.warning.light}`,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {systemStatus === 'success' ? (
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
              ) : (
                <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
              )}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }}>
                  {systemStatusText}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  Registry Management System
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={onRefresh}
              disabled={refreshing}
              sx={{
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                boxShadow: 1,
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {refreshing && (
            <LinearProgress
              sx={{
                mb: 2,
                borderRadius: 1,
                height: 3,
              }}
            />
          )}

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {registries.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Registries
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {activeRegistries}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {totalServers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Servers
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Registry Status Cards */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
        Registries
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {registries.map((registry) => {
          const lastSync = registry.syncStatus?.lastSyncTime || registry.lastSyncAt;
          const syncStatus = registry.source?.syncInterval || 'manual';

          return (
            <Card
              key={registry.id}
              elevation={1}
              sx={{
                transition: 'all 0.2s ease-in-out',
                '&:active': {
                  transform: 'scale(0.98)',
                  boxShadow: 3,
                },
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {getStatusIcon(registry.status, registry.serverCount)}
                      <Typography
                        variant="subtitle1"
                        onClick={() => onRegistryClick(registry.id)}
                        sx={{
                          fontWeight: 600,
                          fontSize: '1rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {registry.name}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={registry.status}
                        color={getStatusColor(registry.status, registry.serverCount)}
                        size="small"
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }}
                      />

                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {registry.serverCount} server{registry.serverCount !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quick Action - Resync */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onForceSync(registry.id, e);
                    }}
                    sx={{
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                      },
                      ml: 1,
                    }}
                  >
                    <SyncIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Sync Status */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <SyncIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {syncStatus === 'manual' ? 'Manual sync' : `Auto: ${syncStatus}`}
                    </Typography>
                  </Box>

                  {lastSync && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 3, fontSize: '0.75rem' }}>
                      Last synced {formatTimeAgo(lastSync)}
                    </Typography>
                  )}
                </Box>

              </CardContent>
            </Card>
          );
        })}
      </Box>

      {registries.length === 0 && !refreshing && (
        <Card elevation={1} sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Registries Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first registry to start monitoring servers
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};