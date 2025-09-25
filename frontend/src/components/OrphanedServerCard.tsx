import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Schedule as ClockIcon,
  Link as ConnectIcon,
  Code as ManifestIcon,
} from '@mui/icons-material';
import { ManifestViewer } from './ManifestViewer';

export interface OrphanedServer {
  name: string;
  namespace: string;
  transport: 'stdio' | 'streamable-http' | 'sse';
  port: number;
  targetPort: number;
  url?: string;
  image: string;
  status: 'Pending' | 'Running' | 'Failed' | 'Terminating';
  createdAt: string;
  labels?: Record<string, string>;
}

interface OrphanedServerCardProps {
  server: OrphanedServer;
  onConnect: (server: OrphanedServer) => void;
  onClick?: () => void;
  onShowManifest?: () => Promise<object>;
}

export const OrphanedServerCard: React.FC<OrphanedServerCardProps> = ({
  server,
  onConnect,
  onClick,
  onShowManifest
}) => {
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleManifestClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onShowManifest) {return;}

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

    if (diffInMinutes < 1) {return 'Just now';}
    if (diffInMinutes < 60) {return `${diffInMinutes}m ago`;}

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {return `${diffInHours}h ago`;}

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
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
        border: '2px solid',
        borderColor: 'warning.main',
        position: 'relative',
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with Name and Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              mr: 1
            }}
          >
            {server.name}
          </Typography>
          <Chip
            label="Unregistered"
            size="small"
            color="warning"
            variant="filled"
          />
        </Box>

        {/* Status and Transport Chips */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={server.status}
            size="small"
            color={getStatusColor(server.status)}
            variant="filled"
          />
          <Chip
            label={server.transport}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>

        {/* Technical Details */}
        <Box sx={{ mb: 2, bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: server.url ? 1 : 0
            }}
          >
            {server.image}
          </Typography>
          {server.url && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  flexGrow: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mr: 1
                }}
              >
                {server.url}
              </Typography>
              <Tooltip title="Copy URL">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(server.url!);
                  }}
                  aria-label="copy URL"
                  sx={{ color: 'primary.main' }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Ports */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Port:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {server.port}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Target Port:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {server.targetPort}
            </Typography>
          </Box>
        </Box>


        {/* Metadata */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Namespace: {server.namespace}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ClockIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Created: {getTimeAgo(server.createdAt)}
            </Typography>
          </Box>
        </Box>


        {/* Register with Registry Button and Manifest Icon */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ConnectIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onConnect(server);
            }}
            sx={{ flex: 1, mr: onShowManifest ? 1 : 0 }}
          >
            Register with Registry
          </Button>
          {onShowManifest && (
            <Tooltip title="Show Manifest">
              <IconButton
                size="small"
                onClick={handleManifestClick}
                disabled={loadingManifest}
                aria-label="show manifest"
                sx={{
                  color: 'white',
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    color: 'white',
                  },
                }}
              >
                <ManifestIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>

      {/* Manifest Viewer */}
      {manifest && (
        <ManifestViewer
          open={manifestViewerOpen}
          onClose={() => setManifestViewerOpen(false)}
          title={`${server.name} Server`}
          manifest={manifest}
        />
      )}
    </Card>
  );
};