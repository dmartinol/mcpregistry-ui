import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Button,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  TrendingUp as PopularIcon,
  Verified as OfficialIcon,
  Group as CommunityIcon,
} from '@mui/icons-material';
import { MobileServerCard } from './MobileServerCard';

interface Server {
  name: string;
  image: string;
  description?: string;
  tags?: string[];
  tier?: string;
  transport?: string;
  tools_count?: number;
  logoUrl?: string;
  metadata?: {
    stars?: number;
    pulls?: number;
  };
}

interface MobileServerDiscoveryProps {
  servers: Server[];
  onServerView: (server: Server) => void;
  onAddToFavorites?: (server: Server) => void;
  loading?: boolean;
}

const getPopularServers = (servers: Server[]): Server[] => {
  return servers
    .filter(s => s.metadata?.stars || s.metadata?.pulls)
    .sort((a, b) => {
      const aScore = (a.metadata?.stars || 0) + (a.metadata?.pulls || 0) / 1000;
      const bScore = (b.metadata?.stars || 0) + (b.metadata?.pulls || 0) / 1000;
      return bScore - aScore;
    })
    .slice(0, 3);
};

const getOfficialServers = (servers: Server[]): Server[] => {
  return servers.filter(s => s.tier?.toLowerCase() === 'official');
};

const getCommunityServers = (servers: Server[]): Server[] => {
  return servers.filter(s => s.tier?.toLowerCase() === 'community');
};

export const MobileServerDiscovery: React.FC<MobileServerDiscoveryProps> = ({
  servers,
  onServerView,
  onAddToFavorites,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedTransports, setSelectedTransports] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'categories' | 'all'>('categories');

  // Filter servers based on search and filters
  const filteredServers = servers.filter(server => {
    const matchesSearch = !searchQuery ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTier = selectedTiers.length === 0 || selectedTiers.includes(server.tier || '');
    const matchesTransport = selectedTransports.length === 0 || selectedTransports.includes(server.transport || '');

    return matchesSearch && matchesTier && matchesTransport;
  });

  // Get unique values for filters
  const availableTiers = Array.from(new Set(servers.map(s => s.tier).filter((tier): tier is string => Boolean(tier))));
  const availableTransports = Array.from(new Set(servers.map(s => s.transport).filter((transport): transport is string => Boolean(transport))));

  const toggleTierFilter = (tier: string) => {
    setSelectedTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  const toggleTransportFilter = (transport: string) => {
    setSelectedTransports(prev =>
      prev.includes(transport) ? prev.filter(t => t !== transport) : [...prev, transport]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTiers([]);
    setSelectedTransports([]);
  };

  const hasActiveFilters = searchQuery || selectedTiers.length > 0 || selectedTransports.length > 0;

  // Categorized servers for category view
  const popularServers = getPopularServers(filteredServers);
  const officialServers = getOfficialServers(filteredServers);
  const communityServers = getCommunityServers(filteredServers);

  const CategorySection: React.FC<{
    title: string;
    icon: React.ReactNode;
    servers: Server[];
    color?: string;
  }> = ({ title, icon, servers, color = 'primary.main' }) => {
    if (servers.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            {title}
          </Typography>
          <Chip
            label={servers.length}
            size="small"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {servers.slice(0, 3).map((server) => (
            <MobileServerCard
              key={server.name}
              server={server}
              isDeployed={false}
              onView={() => onServerView(server)}
              onAddToFavorites={onAddToFavorites ? () => onAddToFavorites(server) : undefined}
            />
          ))}
          {servers.length > 3 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setViewMode('all')}
              sx={{ alignSelf: 'center' }}
            >
              View All {servers.length} {title} Servers
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading servers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Search and Filter Header */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, pb: showFilters ? 2 : '16px !important' }}>
          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5 }}
          />

          {/* Filter Toggle and View Mode */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={viewMode === 'categories' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('categories')}
                sx={{ fontSize: '0.75rem', height: 28 }}
              >
                Categories
              </Button>
              <Button
                size="small"
                variant={viewMode === 'all' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('all')}
                sx={{ fontSize: '0.75rem', height: 28 }}
              >
                All ({filteredServers.length})
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={clearFilters}
                  sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
                >
                  Clear
                </Button>
              )}
              <IconButton
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <FilterIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Expandable Filters */}
          <Collapse in={showFilters}>
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />

              {/* Tier Filters */}
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.8rem' }}>
                Tier:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                {availableTiers.map((tier) => (
                  <Chip
                    key={tier}
                    label={tier}
                    size="small"
                    clickable
                    variant={selectedTiers.includes(tier) ? 'filled' : 'outlined'}
                    color={selectedTiers.includes(tier) ? 'primary' : 'default'}
                    onClick={() => toggleTierFilter(tier)}
                    sx={{ height: 24, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>

              {/* Transport Filters */}
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.8rem' }}>
                Transport:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {availableTransports.map((transport) => (
                  <Chip
                    key={transport}
                    label={transport}
                    size="small"
                    clickable
                    variant={selectedTransports.includes(transport) ? 'filled' : 'outlined'}
                    color={selectedTransports.includes(transport) ? 'secondary' : 'default'}
                    onClick={() => toggleTransportFilter(transport)}
                    sx={{ height: 24, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
        {hasActiveFilters ? `${filteredServers.length} servers found` : `${servers.length} servers available`}
      </Typography>

      {/* Content */}
      {viewMode === 'categories' && !hasActiveFilters ? (
        <Box>
          <CategorySection
            title="Popular"
            icon={<PopularIcon />}
            servers={popularServers}
            color="success.main"
          />
          <CategorySection
            title="Official"
            icon={<OfficialIcon />}
            servers={officialServers}
            color="primary.main"
          />
          <CategorySection
            title="Community"
            icon={<CommunityIcon />}
            servers={communityServers}
            color="secondary.main"
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredServers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No servers match your current filters.
            </Typography>
          ) : (
            filteredServers.map((server) => (
              <MobileServerCard
                key={server.name}
                server={server}
                isDeployed={false}
                onView={() => onServerView(server)}
                onAddToFavorites={onAddToFavorites ? () => onAddToFavorites(server) : undefined}
              />
            ))
          )}
        </Box>
      )}
    </Box>
  );
};