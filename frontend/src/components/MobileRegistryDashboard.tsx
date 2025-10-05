import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
  Button,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Speed as ActivityIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { Registry } from '../App';

interface Server {
  name: string;
  status?: string;
  ready?: boolean;
}

interface MobileRegistryDashboardProps {
  registry: Registry;
  availableServers: Server[];
  deployedServers: Server[];
  refreshing?: boolean;
}

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

const getRegistryHealth = (registry: Registry, deployedServers: Server[]) => {
  const failedServers = deployedServers.filter(s => s.status !== 'Running' && s.ready === false).length;
  const pendingServers = deployedServers.filter(s => s.status === 'Pending').length;

  if (registry.status !== 'active') {
    return { status: 'error', message: 'Registry Issues', color: 'error' as const };
  }
  if (failedServers > 0) {
    return { status: 'warning', message: `${failedServers} Failed`, color: 'warning' as const };
  }
  if (pendingServers > 0) {
    return { status: 'warning', message: `${pendingServers} Pending`, color: 'warning' as const };
  }
  return { status: 'healthy', message: 'All Systems Healthy', color: 'success' as const };
};

export const MobileRegistryDashboard: React.FC<MobileRegistryDashboardProps> = ({
  registry,
  availableServers,
  deployedServers,
  refreshing,
}) => {
  const theme = useTheme();
  const health = getRegistryHealth(registry, deployedServers);

  const runningServers = deployedServers.filter(s => s.status === 'Running').length;
  const failedServers = deployedServers.filter(s => s.status !== 'Running' && s.ready === false).length;
  const pendingServers = deployedServers.filter(s => s.status === 'Pending').length;

  const lastSync = registry.syncStatus?.lastSyncTime || registry.lastSyncAt;

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      {/* Registry Health Overview Card */}
      <Card
        elevation={2}
        sx={{
          mb: 3,
          background: health.color === 'success'
            ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
            : health.color === 'warning'
            ? 'linear-gradient(135deg, #fff3e0 0%, #fef7e0 100%)'
            : 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
          border: `1px solid ${theme.palette[health.color].light}`,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {health.status === 'healthy' ? (
                <HealthyIcon sx={{ color: 'success.main', fontSize: 28 }} />
              ) : health.status === 'warning' ? (
                <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
              ) : (
                <ErrorIcon sx={{ color: 'error.main', fontSize: 28 }} />
              )}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }}>
                  System Health
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  {health.message}
                </Typography>
              </Box>
            </Box>

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

          {/* Key Metrics */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {availableServers.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Available
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {runningServers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Running
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: failedServers > 0 ? 'error.main' : 'text.secondary' }}>
                  {failedServers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Sync Status */}
          {lastSync && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SyncIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Last sync: {formatTimeAgo(lastSync)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>


      {/* Critical Alerts */}
      {(failedServers > 0 || pendingServers > 0) && (
        <Card elevation={1} sx={{ mb: 3, borderLeft: `4px solid ${theme.palette.warning.main}` }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Attention Required
              </Typography>
            </Box>

            {failedServers > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                • {failedServers} server{failedServers !== 1 ? 's' : ''} failing
              </Typography>
            )}

            {pendingServers > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                • {pendingServers} deployment{pendingServers !== 1 ? 's' : ''} pending
              </Typography>
            )}

            <Box sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<ActivityIcon />}
                fullWidth
              >
                View Details
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Registry Info */}
      <Card elevation={1}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>
            Registry Info
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

            {registry.source && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Source:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {registry.source.type}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Namespace:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {registry.metadata?.namespace || 'Unknown'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};