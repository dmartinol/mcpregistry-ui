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
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Link as ConnectIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { getDisplayName } from '../utils/displayNames';

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

interface OrphanedServerDialogProps {
  open: boolean;
  server: OrphanedServer | null;
  onClose: () => void;
  onConnect?: () => void;
}

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

export const OrphanedServerDialog: React.FC<OrphanedServerDialogProps> = ({
  open,
  server,
  onClose,
  onConnect,
}) => {
  if (!server) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getDisplayName(server.name)}
            </Typography>
            <Chip
              label="Unregistered"
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Status Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
            Status & Runtime
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={server.status}
              color={server.status === 'Running' ? 'success' : server.status === 'Pending' ? 'warning' : 'error'}
              size="small"
            />
            <Chip
              label={server.transport}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Port ${server.port}`}
              variant="outlined"
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Created {getTimeAgo(server.createdAt)}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Technical Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
            Technical Details
          </Typography>

          {/* Image */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Container Image:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'grey.50',
                p: 1,
                borderRadius: 1,
                wordBreak: 'break-all',
                fontSize: '0.85rem'
              }}
            >
              {server.image}
            </Typography>
          </Box>

          {/* URL */}
          {server.url && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Service URL:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'grey.50',
                  p: 1,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  fontSize: '0.85rem'
                }}
              >
                {server.url}
              </Typography>
            </Box>
          )}

          {/* Namespace & Ports */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                Namespace:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {server.namespace}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                Port Mapping:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {server.port} → {server.targetPort}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Labels */}
        {server.labels && Object.keys(server.labels).length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
              Kubernetes Labels
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(server.labels).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  variant="outlined"
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Warning Message */}
        <Box sx={{
          p: 2,
          bgcolor: 'warning.light',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'warning.main',
          mt: 2
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Unregistered Server
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This server is running but not connected to any registry. Connect it to a registry to make it discoverable and manageable.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {onConnect && (
          <Button
            onClick={onConnect}
            variant="contained"
            startIcon={<ConnectIcon />}
            sx={{ fontWeight: 600 }}
          >
            Connect to Registry
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};