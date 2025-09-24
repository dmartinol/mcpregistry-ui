import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Link,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Storage as ServerIcon,
  Schedule as ClockIcon,
  AccountTree as NamespaceIcon,
  Code as ManifestIcon,
} from '@mui/icons-material';
import { ManifestViewer } from './ManifestViewer';

type ServerStatus = 'Pending' | 'Running' | 'Failed' | 'Terminating';

interface DeployedServer {
  id: string;
  name: string;
  registryRef: string;
  image: string;
  version?: string;
  status: ServerStatus;
  endpoint?: string;
  createdAt: string;
  lastUpdated: string;
  namespace: string;
  uid: string;
}

interface DeployedServerCardProps {
  server: DeployedServer;
  onClick?: () => void;
  onShowManifest?: () => Promise<object>;
}

export const DeployedServerCard: React.FC<DeployedServerCardProps> = ({ server, onClick, onShowManifest }) => {
  const [copySnackbar, setCopySnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const getStatusColor = (status: ServerStatus): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'Running':
        return 'success';
      case 'Pending':
        return 'info';
      case 'Failed':
        return 'error';
      case 'Terminating':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status: ServerStatus) => {
    // Return appropriate icon or indicator based on status
    const color = getStatusColor(status);
    return (
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: `${color}.main`,
          display: 'inline-block',
          mr: 1,
        }}
      />
    );
  };

  const handleCopyUrl = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!server.endpoint) {
      setCopySnackbar({
        open: true,
        message: 'No endpoint URL available',
        severity: 'error',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(server.endpoint);
      setCopySnackbar({
        open: true,
        message: 'URL copied to clipboard',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setCopySnackbar({
        open: true,
        message: 'Failed to copy URL',
        severity: 'error',
      });
    }
  };

  const handleOpenUrl = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (server.endpoint) {
      window.open(server.endpoint, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSnackbarClose = () => {
    setCopySnackbar(prev => ({ ...prev, open: false }));
  };

  const handleManifestClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onShowManifest) return;

    setLoadingManifest(true);
    try {
      const manifestData = await onShowManifest();
      setManifest(manifestData);
      setManifestViewerOpen(true);
    } catch (error) {
      console.error('Failed to load manifest:', error);
    } finally {
      setLoadingManifest(false);
    }
  };


  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': onClick ? {
            transform: 'translateY(-2px)',
            boxShadow: (theme) => theme.shadows[4],
          } : {},
        }}
        onClick={onClick}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Header with Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                mr: 2,
                bgcolor: `${getStatusColor(server.status)}.main`,
                width: 48,
                height: 48,
              }}
            >
              <ServerIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {server.id}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {server.name}
              </Typography>
            </Box>
          </Box>

          {/* Status and Version */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={getStatusIcon(server.status)}
              label={server.status}
              size="small"
              color={getStatusColor(server.status)}
              className={`status-${server.status.toLowerCase()}`}
            />
            {server.version && (
              <Chip
                label={`v${server.version}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Image */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Image:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {server.image}
            </Typography>
          </Box>

          {/* Endpoint URL */}
          {server.endpoint && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Endpoint:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link
                  href={server.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {server.endpoint}
                </Link>
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={handleCopyUrl}
                    aria-label="copy URL"
                    sx={{ color: 'primary.main' }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open URL">
                  <IconButton
                    size="small"
                    onClick={handleOpenUrl}
                    aria-label="open URL"
                    sx={{ color: 'primary.main' }}
                  >
                    <LaunchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {onShowManifest && (
                  <Tooltip title="Show Manifest">
                    <IconButton
                      size="small"
                      onClick={handleManifestClick}
                      disabled={loadingManifest}
                      aria-label="show manifest"
                      sx={{ color: 'primary.main' }}
                    >
                      <ManifestIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )}

          {/* Metadata */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: onShowManifest ? 2 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NamespaceIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Namespace: {server.namespace}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ClockIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Created: {getTimeAgo(server.createdAt)}
              </Typography>
            </Box>
            {server.lastUpdated !== server.createdAt && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ClockIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Updated: {getTimeAgo(server.lastUpdated)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Actions */}
          {onShowManifest && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 'auto' }}>
              <Tooltip title="Show Manifest">
                <IconButton
                  onClick={handleManifestClick}
                  disabled={loadingManifest}
                  aria-label="show manifest"
                  sx={{
                    color: 'primary.main',
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <ManifestIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Copy Feedback Snackbar */}
      <Snackbar
        open={copySnackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={copySnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {copySnackbar.message}
        </Alert>
      </Snackbar>

      {/* Manifest Viewer */}
      {manifest && (
        <ManifestViewer
          open={manifestViewerOpen}
          onClose={() => setManifestViewerOpen(false)}
          title={`${server.id} Server`}
          manifest={manifest}
        />
      )}
    </>
  );
};