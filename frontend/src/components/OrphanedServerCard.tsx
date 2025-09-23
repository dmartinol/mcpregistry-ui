import React from 'react';
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
  Launch as LaunchIcon,
  Storage as ServerIcon,
  Schedule as ClockIcon,
  AccountTree as NamespaceIcon,
  Link as ConnectIcon,
} from '@mui/icons-material';

export interface OrphanedServer {
  name: string;
  namespace: string;
  transport: 'streamable-http' | 'stdio';
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
}

export const OrphanedServerCard: React.FC<OrphanedServerCardProps> = ({
  server,
  onConnect,
  onClick
}) => {
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
      {/* Unregistered indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 'bold',
        }}
      >
        UNREGISTERED
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1, pt: 5 }}>
        {/* Header with Name and Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ServerIcon sx={{ mr: 1, color: 'text.secondary' }} />
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
              {server.name}
            </Typography>
          </Box>
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

        {/* URL if available */}
        {server.url && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              URL:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  flexGrow: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'primary.main',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(server.url, '_blank');
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
              <Tooltip title="Open URL">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(server.url, '_blank');
                  }}
                  aria-label="open URL"
                  sx={{ color: 'primary.main' }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Metadata */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
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
        </Box>

        {/* Register with Registry Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 'auto' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ConnectIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onConnect(server);
            }}
            fullWidth
          >
            Register with Registry
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};