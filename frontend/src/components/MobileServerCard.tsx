import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as RunningIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Refresh as RestartIcon,
  Delete as DeleteIcon,
  CloudUpload as DeployIcon,
  Star as StarIcon,
} from '@mui/icons-material';

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
  metadata?: {
    stars?: number;
    pulls?: number;
    last_updated?: string;
  };
}

interface MobileServerCardProps {
  server: Server;
  isDeployed: boolean;
  onQuickDeploy?: () => void;
  onRestart?: () => void;
  onDelete?: () => void;
  onView: () => void;
  onAddToFavorites?: () => void;
}

const getStatusIcon = (server: Server, isDeployed: boolean) => {
  if (!isDeployed) {
    return null; // Available servers don't have status
  }

  if (server.status === 'Running' && server.ready) {
    return <RunningIcon sx={{ color: 'success.main', fontSize: 16 }} />;
  }
  if (server.status === 'Pending') {
    return <PendingIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
  }
  if (server.status === 'Failed' || !server.ready) {
    return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
  }
  return <WarningIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
};

const getStatusColor = (server: Server, isDeployed: boolean): 'success' | 'warning' | 'error' | 'default' => {
  if (!isDeployed) return 'default';

  if (server.status === 'Running' && server.ready) return 'success';
  if (server.status === 'Pending') return 'warning';
  if (server.status === 'Failed' || !server.ready) return 'error';
  return 'warning';
};


export const MobileServerCard: React.FC<MobileServerCardProps> = ({
  server,
  isDeployed,
  onQuickDeploy,
  onRestart,
  onDelete,
  onView,
  onAddToFavorites,
}) => {
  const theme = useTheme();
  const statusIcon = getStatusIcon(server, isDeployed);
  const statusColor = getStatusColor(server, isDeployed);

  const needsAttention = isDeployed && (
    server.status !== 'Running' || !server.ready
  );

  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 2,
        border: needsAttention ? `2px solid ${theme.palette.warning.main}` : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header with Logo and Status */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            {server.logoUrl && (
              <Box
                component="img"
                src={server.logoUrl}
                alt={`${server.name} logo`}
                sx={{
                  width: 24,
                  height: 24,
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
              variant="subtitle2"
              onClick={onView}
              sx={{
                fontWeight: 600,
                fontSize: '0.9rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                cursor: 'pointer',
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {server.name}
            </Typography>
          </Box>

          {/* Right-side indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                    ? (server.status === 'Running' && server.ready ? 'success.main' : server.status === 'Pending' ? 'warning.main' : 'error.main')
                    : (server.ready ? 'success.main' : 'grey.400'),
                  flexShrink: 0,
                }}
              />
            </Tooltip>

            {/* Tier Badge */}
            {server.tier && server.tier.toLowerCase() !== 'experimental' && (
              <Tooltip title={`Tier: ${server.tier} Server`}>
                <Chip
                  label={server.tier.toLowerCase() === 'official' ? '⭐' : '👥'}
                  size="small"
                  sx={{
                    minWidth: 20,
                    height: 16,
                    fontSize: '0.65rem',
                    bgcolor: server.tier.toLowerCase() === 'official' ? '#fff3e0' : '#e3f2fd',
                    color: server.tier.toLowerCase() === 'official' ? '#f57c00' : '#1976d2',
                    border: '1px solid',
                    borderColor: server.tier.toLowerCase() === 'official' ? '#ffb74d' : '#64b5f6',
                    '& .MuiChip-label': {
                      px: 0.25,
                      fontWeight: 600
                    }
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Status Line for Mobile */}
        {isDeployed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            {statusIcon}
            <Chip
              label={server.status || 'Unknown'}
              color={statusColor}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 500 }}
            />
          </Box>
        )}

        {/* Badges Row */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          {server.transport && (
            <Chip
              label={server.transport}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          {server.tools_count !== undefined && server.tools_count > 0 && (
            <Chip
              label={`${server.tools_count} tools`}
              color="info"
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          {server.metadata?.stars !== undefined && server.metadata.stars > 0 && (
            <Chip
              label={`⭐ ${server.metadata.stars.toLocaleString()}`}
              color="primary"
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          {server.metadata?.pulls !== undefined && server.metadata.pulls > 0 && (
            <Chip
              label={`📦 ${server.metadata.pulls.toLocaleString()}`}
              color="secondary"
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>

        {/* Description */}
        {server.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.8rem',
              lineHeight: 1.3,
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {server.description}
          </Typography>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Primary Action */}
            {isDeployed ? (
              <>
                {(server.status !== 'Running' || !server.ready) && onRestart && (
                  <IconButton
                    size="small"
                    onClick={onRestart}
                    sx={{
                      bgcolor: 'warning.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'warning.dark' },
                      minHeight: 32,
                      minWidth: 32,
                    }}
                  >
                    <RestartIcon fontSize="small" />
                  </IconButton>
                )}
              </>
            ) : (
              <>
                {onQuickDeploy && (
                  <IconButton
                    size="small"
                    onClick={onQuickDeploy}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      minHeight: 32,
                      minWidth: 32,
                    }}
                  >
                    <DeployIcon fontSize="small" />
                  </IconButton>
                )}
                {onAddToFavorites && (
                  <IconButton
                    size="small"
                    onClick={onAddToFavorites}
                    sx={{
                      bgcolor: 'action.selected',
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'action.hover' },
                      minHeight: 32,
                      minWidth: 32,
                    }}
                  >
                    <StarIcon fontSize="small" />
                  </IconButton>
                )}
              </>
            )}

          </Box>

          {/* Destructive Action */}
          {isDeployed && onDelete && (
            <IconButton
              size="small"
              onClick={onDelete}
              sx={{
                color: 'error.main',
                '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                minHeight: 32,
                minWidth: 32,
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Emergency Alert Banner */}
        {needsAttention && (
          <Box
            sx={{
              mt: 1.5,
              p: 1,
              bgcolor: 'warning.light',
              borderRadius: 1,
              border: `1px solid ${theme.palette.warning.main}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'warning.dark',
                fontWeight: 600,
                fontSize: '0.7rem',
                display: 'block',
              }}
            >
              ⚠️ Requires attention - {server.status !== 'Running' ? 'Not running' : 'Not ready'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};