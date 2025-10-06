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
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Link as ConnectIcon,
  Code as ManifestIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { ManifestViewer } from './ManifestViewer';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);


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
        {/* CRITICAL TIER - Always Visible Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            {/* Name - Clickable */}
            <Typography
              variant="subtitle1"
              component="h3"
              sx={{
                cursor: onClick ? 'pointer' : 'default',
                color: onClick ? 'primary.main' : 'text.primary',
                '&:hover': onClick ? { textDecoration: 'underline' } : {},
                flex: 1,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
              onClick={onClick}
            >
              {getDisplayName(server.name)}
            </Typography>
          </Box>

          {/* Right-side indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Status Indicator Dot */}
            <Tooltip title={`Server Status: ${server.status}`}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: server.status === 'Running' ? 'success.main' : server.status === 'Pending' ? 'warning.main' : 'error.main',
                  flexShrink: 0,
                }}
              />
            </Tooltip>

            {/* Unregistered Badge */}
            <Tooltip title="Unregistered Server">
              <Chip
                label="⚠️"
                size="small"
                sx={{
                  minWidth: 28,
                  height: 20,
                  fontSize: '0.8rem',
                  bgcolor: '#fff3e0',
                  color: '#f57c00',
                  border: '1px solid #ffb74d',
                }}
              />
            </Tooltip>
          </Box>
        </Box>

        {/* CRITICAL TIER - Compact Status Line */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.75rem',
            lineHeight: 1.3,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            flexWrap: 'wrap'
          }}
        >
          {/* Transport */}
          <span style={{ fontWeight: 500 }}>{server.transport}</span>
          <span>•</span>
          {/* Port */}
          <span>port {server.port}</span>
          <span>•</span>
          {/* Status */}
          <span style={{
            color: server.status === 'Running' ? '#2e7d32' : server.status === 'Pending' ? '#ed6c02' : '#d32f2f'
          }}>
            {server.status.toLowerCase()}
          </span>
          <span>•</span>
          {/* Time */}
          <span>{getTimeAgo(server.createdAt)}</span>
        </Typography>

        {/* TERTIARY TIER - Expandable Technical Details - Desktop Only */}
        {!isMobile && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ mb: 1.5, bgcolor: 'grey.50', borderRadius: 1, p: 1.5, fontSize: '0.8rem' }}>
            {/* Image */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: '50px' }}>
                Image:
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                {server.image}
              </Typography>
              <Tooltip title="Copy Image">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(server.image);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <CopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* URL */}
            {server.url && (
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, minWidth: '50px' }}>
                  URL:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                  {server.url}
                </Typography>
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(server.url!);
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <CopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Namespace & Ports */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                NS: {server.namespace}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Port: {server.port}→{server.targetPort}
              </Typography>
            </Box>
          </Box>
        </Collapse>
        )}


        {/* ACTION TIER - Smart Grouped Actions */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 0.5
        }}>
          {/* Primary Action */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<ConnectIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onConnect(server);
            }}
            size="small"
            sx={{
              height: 32,
              minWidth: 100,
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            Connect
          </Button>

          {/* Secondary Actions */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Collapsible Details Button - Desktop Only */}
            {!isMobile && (
              <Tooltip title={isExpanded ? "Hide Details" : "Show Details"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.hover' },
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <ExpandIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* View Manifest Button */}
            {onShowManifest && (
              <Tooltip title="View Manifest">
                <IconButton
                  size="small"
                  onClick={handleManifestClick}
                  disabled={loadingManifest}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ManifestIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

          </Box>
        </Box>
      </CardContent>

      {/* Manifest Viewer */}
      {manifest && (
        <ManifestViewer
          open={manifestViewerOpen}
          onClose={() => setManifestViewerOpen(false)}
          title={`${getDisplayName(server.name)} Server`}
          manifest={manifest}
        />
      )}
    </Card>
  );
};