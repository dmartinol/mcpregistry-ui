import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Launch as LaunchIcon,
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
  endpoint_url?: string;
  documentation?: string;
  metadata?: {
    stars?: number;
    pulls?: number;
    last_updated?: string;
  };
}

interface MobileServerDialogProps {
  open: boolean;
  server: Server | null;
  isDeployed: boolean;
  onClose: () => void;
}

const getStatusColor = (server: Server, isDeployed: boolean): 'success' | 'warning' | 'error' => {
  if (!isDeployed) return 'success'; // Available servers are considered ready

  if (server.status === 'Running' && server.ready) return 'success';
  if (server.status === 'Pending') return 'warning';
  if (server.status === 'Failed' || !server.ready) return 'error';
  return 'warning';
};

const getTierColor = (tier?: string): 'primary' | 'secondary' | 'warning' => {
  switch (tier) {
    case 'official': return 'primary';
    case 'community': return 'secondary';
    case '3rd-party': return 'warning';
    default: return 'secondary';
  }
};

export const MobileServerDialog: React.FC<MobileServerDialogProps> = ({
  open,
  server,
  isDeployed,
  onClose,
}) => {

  if (!server) return null;

  const statusColor = getStatusColor(server, isDeployed);
  const tierColor = getTierColor(server.tier);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          margin: 1,
          maxHeight: '60vh', // Limit height for mobile
          borderRadius: 2,
        },
      }}
    >
      {/* Compact Header */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            {/* Logo if available */}
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

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {/* Status indicator dot */}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: `${statusColor}.main`,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {server.name}
                </Typography>
              </Box>

              {/* Tier chip */}
              {server.tier && (
                <Chip
                  label={server.tier}
                  color={tierColor}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>

          {/* Close button */}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ ml: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Essential Content */}
      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {/* Description */}
        {server.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2, // Limit to 2 lines
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {server.description}
          </Typography>
        )}

        {/* Essential badges */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
          {/* Transport */}
          {server.transport && (
            <Chip
              label={server.transport}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}

          {/* Tools count */}
          {server.tools_count !== undefined && server.tools_count > 0 && (
            <Chip
              label={`${server.tools_count} tools`}
              size="small"
              color="info"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}

          {/* Stars count */}
          {server.metadata?.stars !== undefined && server.metadata.stars > 0 && (
            <Chip
              label={`⭐ ${server.metadata.stars.toLocaleString()}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}

          {/* Pulls count */}
          {server.metadata?.pulls !== undefined && server.metadata.pulls > 0 && (
            <Chip
              label={`📦 ${server.metadata.pulls.toLocaleString()}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}

          {/* Status for deployed servers */}
          {isDeployed && server.status && (
            <Chip
              label={server.status}
              color={statusColor}
              size="small"
              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }}
            />
          )}

          {/* Ready status for deployed servers */}
          {isDeployed && server.ready !== undefined && (
            <Chip
              label={server.ready ? 'Ready' : 'Not Ready'}
              color={server.ready ? 'success' : 'warning'}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* Tags section */}
        {server.tags && server.tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Tags:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {server.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Endpoint URL for monitoring (deployed servers only) */}
        {isDeployed && server.endpoint_url && (
          <Box sx={{
            bgcolor: 'grey.50',
            p: 1.5,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Monitoring Endpoint:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: 'primary.main',
              }}
            >
              {server.endpoint_url}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Minimal Actions */}
      <DialogActions sx={{ pt: 0, pb: 2, px: 3 }}>
        {/* Documentation - for troubleshooting */}
        {server.documentation && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<LaunchIcon />}
            onClick={() => window.open(server.documentation, '_blank')}
            sx={{ fontSize: '0.8rem' }}
          >
            Docs
          </Button>
        )}

        {/* Close button */}
        <Button
          onClick={onClose}
          size="small"
          sx={{ ml: 'auto', fontSize: '0.8rem' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};