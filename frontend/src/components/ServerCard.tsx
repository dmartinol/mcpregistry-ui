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
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Description as DocsIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  PlayArrow as DeployIcon,
  Code as ManifestIcon,
} from '@mui/icons-material';
import { ManifestViewer } from './ManifestViewer';

interface RegistryServer {
  name: string;
  image: string;
  version?: string;
  description?: string;
  tags: string[];
  capabilities?: string[];
  author?: string;
  repository?: string;
  documentation?: string;
}

interface ServerCardProps {
  server: RegistryServer;
  onClick?: () => void;
  onDeploy?: () => void;
  onShowManifest?: () => Promise<object>;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onClick, onDeploy, onShowManifest }) => {
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false);
  const [manifest, setManifest] = useState<object | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const handleLinkClick = (event: React.MouseEvent, url: string) => {
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeployClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDeploy?.();
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

  const getTagColor = (tag: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    // Assign colors based on common tag categories
    const tagLower = tag.toLowerCase();
    if (['web', 'api', 'http'].includes(tagLower)) return 'primary';
    if (['database', 'sql', 'storage'].includes(tagLower)) return 'info';
    if (['file', 'processing', 'utility'].includes(tagLower)) return 'success';
    if (['scraping', 'automation'].includes(tagLower)) return 'warning';
    return 'secondary';
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
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with Avatar and Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              mr: 2,
              bgcolor: 'primary.main',
              width: 48,
              height: 48,
            }}
          >
            <ImageIcon />
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
              {server.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {server.image}
            </Typography>
          </Box>
        </Box>

        {/* Version Badge */}
        {server.version && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`v${server.version}`}
              size="small"
              color="info"
              variant="outlined"
            />
          </Box>
        )}

        {/* Description */}
        {server.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {server.description}
          </Typography>
        )}

        {/* Tags */}
        {server.tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Tags:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto' }}>
              {server.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  color={getTagColor(tag)}
                  variant="filled"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Capabilities */}
        {server.capabilities && server.capabilities.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto' }}>
              {server.capabilities.map((capability) => (
                <Chip
                  key={capability}
                  label={capability}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Author */}
        {server.author && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {server.author}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Action buttons footer */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          borderTop: 1,
          borderColor: 'divider',
          pt: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {server.repository && (
            <Tooltip title="View Repository">
              <IconButton
                size="small"
                onClick={(e) => handleLinkClick(e, server.repository!)}
                sx={{ color: 'text.secondary' }}
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {server.documentation && (
            <Tooltip title="View Documentation">
              <IconButton
                size="small"
                onClick={(e) => handleLinkClick(e, server.documentation!)}
                sx={{ color: 'text.secondary' }}
              >
                <DocsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onShowManifest && (
            <Tooltip title="Show Manifest">
              <IconButton
                size="small"
                onClick={handleManifestClick}
                disabled={loadingManifest}
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                }}
              >
                <ManifestIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {onDeploy && (
          <Tooltip title="Deploy Server">
            <IconButton
              size="small"
              onClick={handleDeployClick}
              sx={{
                color: 'primary.main',
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                },
              }}
            >
              <DeployIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

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