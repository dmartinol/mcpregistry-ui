import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  ButtonBase,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Storage as StorageIcon,
  GitHub as GitIcon,
  Sync as SyncIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Code as ManifestIcon,
} from '@mui/icons-material';
import { Registry } from '../App';

interface ModernRegistryCardProps {
  registry: Registry;
  onRegistryClick: (registryId: string) => void;
  onForceSync: (registryId: string, event: React.MouseEvent) => void;
  onShowManifest: (registryId: string) => void;
  onDelete: (registry: Registry) => void;
  isRefreshing?: boolean;
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

export const ModernRegistryCard: React.FC<ModernRegistryCardProps> = ({
  registry,
  onRegistryClick,
  onForceSync,
  onShowManifest,
  onDelete,
  isRefreshing,
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleExpandClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(!expanded);
  };

  const handleMainClick = () => {
    onRegistryClick(registry.id);
  };

  const handleActionClick = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  const lastSyncTime = registry.syncStatus?.lastSyncTime || registry.lastSyncAt;

  return (
    <Card
      elevation={1}
      sx={{
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          elevation: 3,
          transform: 'translateY(-1px)',
        },
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Main Card Content - Clickable */}
      <ButtonBase
        component="div"
        onClick={handleMainClick}
        sx={{
          width: '100%',
          textAlign: 'left',
          display: 'block',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <CardContent sx={{ pb: expanded ? 1 : 2 }}>
          {/* Header Row */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.5
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                  lineHeight: 1.2,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {registry.name}
              </Typography>

              {/* Status & Key Metrics Row */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                mb: 1
              }}>
                <Chip
                  label={registry.status}
                  color={getStatusColor(registry.status)}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />

                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}>
                  <StorageIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {registry.serverCount} server{registry.serverCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                {registry.source && (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                  }}>
                    {getSourceIcon(registry.source.type)}
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {registry.source.type}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Quick Actions */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              ml: 1,
            }}>
              <IconButton
                size="small"
                onClick={handleExpandClick}
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  color: 'text.secondary',
                }}
              >
                <ExpandIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Last Sync Info */}
          {lastSyncTime && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              Synced {formatTimeAgo(lastSyncTime)}
            </Typography>
          )}
        </CardContent>
      </ButtonBase>

      {/* Expanded Details */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          {/* Description */}
          {registry.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, lineHeight: 1.5 }}
            >
              {registry.description}
            </Typography>
          )}

          {/* Detailed Info */}
          <Box sx={{ mb: 2 }}>
            {registry.source?.syncInterval && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SyncIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {registry.source.syncInterval === 'manual' ? 'Manual sync' : `Auto-sync: ${registry.source.syncInterval}`}
                </Typography>
              </Box>
            )}

            {registry.source?.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getSourceIcon(registry.source.type)}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {registry.source.location}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <IconButton
                size="small"
                onClick={(e) => handleActionClick(e, () => onForceSync(registry.id, e))}
                disabled={isRefreshing}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  minHeight: 36,
                  minWidth: 36,
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                onClick={(e) => handleActionClick(e, () => onShowManifest(registry.id))}
                sx={{
                  bgcolor: 'action.selected',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' },
                  minHeight: 36,
                  minWidth: 36,
                }}
              >
                <ManifestIcon fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                onClick={(e) => handleActionClick(e, () => onRegistryClick(registry.id))}
                sx={{
                  bgcolor: 'action.selected',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' },
                  minHeight: 36,
                  minWidth: 36,
                }}
              >
                <LaunchIcon fontSize="small" />
              </IconButton>
            </Box>

            <IconButton
              size="small"
              onClick={(e) => handleActionClick(e, () => onDelete(registry))}
              sx={{
                color: 'error.main',
                '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                minHeight: 36,
                minWidth: 36,
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};