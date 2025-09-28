import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Stack,
  IconButton,
  Alert,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { CreateMCPRegistryRequest } from '../CreateRegistryDialog';

interface DataFilteringTabProps {
  formData: CreateMCPRegistryRequest;
  onUpdate: (updates: Partial<CreateMCPRegistryRequest>) => void;
}

export const DataFilteringTab: React.FC<DataFilteringTabProps> = ({
  formData,
  onUpdate,
}) => {
  const [newNameIncludeFilter, setNewNameIncludeFilter] = React.useState('');
  const [newNameExcludeFilter, setNewNameExcludeFilter] = React.useState('');
  const [newTagIncludeFilter, setNewTagIncludeFilter] = React.useState('');
  const [newTagExcludeFilter, setNewTagExcludeFilter] = React.useState('');

  const handleAddNameIncludeFilter = () => {
    if (newNameIncludeFilter.trim()) {
      const currentIncludeFilters = formData.filter?.names?.include || [];
      onUpdate({
        filter: {
          ...formData.filter,
          names: {
            ...formData.filter?.names,
            include: [...currentIncludeFilters, newNameIncludeFilter.trim()],
          },
        },
      });
      setNewNameIncludeFilter('');
    }
  };

  const handleAddNameExcludeFilter = () => {
    if (newNameExcludeFilter.trim()) {
      const currentExcludeFilters = formData.filter?.names?.exclude || [];
      onUpdate({
        filter: {
          ...formData.filter,
          names: {
            ...formData.filter?.names,
            exclude: [...currentExcludeFilters, newNameExcludeFilter.trim()],
          },
        },
      });
      setNewNameExcludeFilter('');
    }
  };

  const handleRemoveNameIncludeFilter = (index: number) => {
    const currentIncludeFilters = formData.filter?.names?.include || [];
    const updatedFilters = currentIncludeFilters.filter((_, i) => i !== index);
    onUpdate({
      filter: {
        ...formData.filter,
        names: {
          ...formData.filter?.names,
          include: updatedFilters,
        },
      },
    });
  };

  const handleRemoveNameExcludeFilter = (index: number) => {
    const currentExcludeFilters = formData.filter?.names?.exclude || [];
    const updatedFilters = currentExcludeFilters.filter((_, i) => i !== index);
    onUpdate({
      filter: {
        ...formData.filter,
        names: {
          ...formData.filter?.names,
          exclude: updatedFilters,
        },
      },
    });
  };

  const handleAddTagIncludeFilter = () => {
    if (newTagIncludeFilter.trim()) {
      const currentIncludeFilters = formData.filter?.tags?.include || [];
      onUpdate({
        filter: {
          ...formData.filter,
          tags: {
            ...formData.filter?.tags,
            include: [...currentIncludeFilters, newTagIncludeFilter.trim()],
          },
        },
      });
      setNewTagIncludeFilter('');
    }
  };

  const handleAddTagExcludeFilter = () => {
    if (newTagExcludeFilter.trim()) {
      const currentExcludeFilters = formData.filter?.tags?.exclude || [];
      onUpdate({
        filter: {
          ...formData.filter,
          tags: {
            ...formData.filter?.tags,
            exclude: [...currentExcludeFilters, newTagExcludeFilter.trim()],
          },
        },
      });
      setNewTagExcludeFilter('');
    }
  };

  const handleRemoveTagIncludeFilter = (index: number) => {
    const currentIncludeFilters = formData.filter?.tags?.include || [];
    const updatedFilters = currentIncludeFilters.filter((_, i) => i !== index);
    onUpdate({
      filter: {
        ...formData.filter,
        tags: {
          ...formData.filter?.tags,
          include: updatedFilters,
        },
      },
    });
  };

  const handleRemoveTagExcludeFilter = (index: number) => {
    const currentExcludeFilters = formData.filter?.tags?.exclude || [];
    const updatedFilters = currentExcludeFilters.filter((_, i) => i !== index);
    onUpdate({
      filter: {
        ...formData.filter,
        tags: {
          ...formData.filter?.tags,
          exclude: updatedFilters,
        },
      },
    });
  };

  const handleEnableFilteringChange = (enabled: boolean) => {
    onUpdate({
      filter: enabled
        ? {
            names: {
              include: formData.filter?.names?.include || [],
              exclude: formData.filter?.names?.exclude || [],
            },
            tags: {
              include: formData.filter?.tags?.include || [],
              exclude: formData.filter?.tags?.exclude || [],
            },
          }
        : undefined,
    });
  };

  const handleKeyPress = (
    event: React.KeyboardEvent,
    action: () => void
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Filtering Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure optional filters to limit which servers are imported from the registry source.
        By default, all servers in the registry will be imported.
      </Typography>

      {/* Enable/Disable Filtering */}
      <FormControlLabel
        control={
          <Switch
            checked={!!formData.filter}
            onChange={(e) => handleEnableFilteringChange(e.target.checked)}
          />
        }
        label={
          <Box>
            <Typography variant="body1">Enable Data Filtering</Typography>
            <Typography variant="caption" color="text.secondary">
              Apply filters to selectively import servers from the registry
            </Typography>
          </Box>
        }
        sx={{ mb: 3 }}
      />

      {formData.filter && (
        <>
          <Divider sx={{ mb: 3 }} />

          {/* Name Filters */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              Server Name Filters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure patterns to include or exclude servers by name. Supports wildcards (*) and regex patterns.
            </Typography>

            {/* Include Name Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom color="success.main">
                ✓ Include Names
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Only import servers whose names match these patterns.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add include pattern"
                  value={newNameIncludeFilter}
                  onChange={(e) => setNewNameIncludeFilter(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleAddNameIncludeFilter)}
                  placeholder="e.g., mcp-*, database-*, *-tool"
                  helperText="Use * for wildcards or regex patterns"
                />
                <IconButton
                  onClick={handleAddNameIncludeFilter}
                  disabled={!newNameIncludeFilter.trim()}
                  color="primary"
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {formData.filter?.names?.include && formData.filter.names.include.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {formData.filter.names.include.map((nameFilter, index) => (
                    <Chip
                      key={index}
                      label={nameFilter}
                      onDelete={() => handleRemoveNameIncludeFilter(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                      color="success"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {/* Exclude Name Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom color="error.main">
                ✗ Exclude Names
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Skip servers whose names match these patterns.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add exclude pattern"
                  value={newNameExcludeFilter}
                  onChange={(e) => setNewNameExcludeFilter(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleAddNameExcludeFilter)}
                  placeholder="e.g., test-*, deprecated-*, *-legacy"
                  helperText="Use * for wildcards or regex patterns"
                />
                <IconButton
                  onClick={handleAddNameExcludeFilter}
                  disabled={!newNameExcludeFilter.trim()}
                  color="primary"
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {formData.filter?.names?.exclude && formData.filter.names.exclude.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {formData.filter.names.exclude.map((nameFilter, index) => (
                    <Chip
                      key={index}
                      label={nameFilter}
                      onDelete={() => handleRemoveNameExcludeFilter(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                      color="error"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {(!formData.filter?.names?.include || formData.filter.names.include.length === 0) &&
             (!formData.filter?.names?.exclude || formData.filter.names.exclude.length === 0) && (
              <Alert severity="info">
                No name filters configured. All server names will be included.
              </Alert>
            )}
          </Box>

          {/* Tag Filters */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              Tag Filters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure tags to include or exclude servers. Tag names are case-sensitive.
            </Typography>

            {/* Include Tag Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom color="success.main">
                ✓ Include Tags
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Only import servers that have at least one of these tags.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add include tag"
                  value={newTagIncludeFilter}
                  onChange={(e) => setNewTagIncludeFilter(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleAddTagIncludeFilter)}
                  placeholder="e.g., database, ai, web, utility"
                  helperText="Tag names are case-sensitive"
                />
                <IconButton
                  onClick={handleAddTagIncludeFilter}
                  disabled={!newTagIncludeFilter.trim()}
                  color="primary"
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {formData.filter?.tags?.include && formData.filter.tags.include.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {formData.filter.tags.include.map((tagFilter, index) => (
                    <Chip
                      key={index}
                      label={tagFilter}
                      onDelete={() => handleRemoveTagIncludeFilter(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                      color="success"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {/* Exclude Tag Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom color="error.main">
                ✗ Exclude Tags
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Skip servers that have any of these tags.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add exclude tag"
                  value={newTagExcludeFilter}
                  onChange={(e) => setNewTagExcludeFilter(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleAddTagExcludeFilter)}
                  placeholder="e.g., deprecated, experimental, legacy"
                  helperText="Tag names are case-sensitive"
                />
                <IconButton
                  onClick={handleAddTagExcludeFilter}
                  disabled={!newTagExcludeFilter.trim()}
                  color="primary"
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {formData.filter?.tags?.exclude && formData.filter.tags.exclude.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {formData.filter.tags.exclude.map((tagFilter, index) => (
                    <Chip
                      key={index}
                      label={tagFilter}
                      onDelete={() => handleRemoveTagExcludeFilter(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                      color="error"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {(!formData.filter?.tags?.include || formData.filter.tags.include.length === 0) &&
             (!formData.filter?.tags?.exclude || formData.filter.tags.exclude.length === 0) && (
              <Alert severity="info">
                No tag filters configured. All tags will be included.
              </Alert>
            )}
          </Box>

          {/* Filter Logic Explanation */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter Logic
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Name Filtering:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              • If include patterns exist: Server name must match <strong>at least one</strong> include pattern
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              • If exclude patterns exist: Server name must <strong>not match any</strong> exclude pattern
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
              <strong>Tag Filtering:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              • If include tags exist: Server must have <strong>at least one</strong> include tag
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              • If exclude tags exist: Server must <strong>not have any</strong> exclude tag
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>Combined Logic:</strong> All active filters must pass (AND logic between name and tag filters)
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Example:</strong> Include pattern &quot;mcp-*&quot;, exclude pattern &quot;*-test&quot;, include tag &quot;database&quot;, exclude tag &quot;deprecated&quot; will import servers that start with &quot;mcp-&quot;, don&apos;t end with &quot;-test&quot;, have the &quot;database&quot; tag, and don&apos;t have the &quot;deprecated&quot; tag.
            </Typography>
          </Box>
        </>
      )}

      {!formData.filter && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>No filtering enabled.</strong> All servers from the registry source will be imported.
            This is recommended for most use cases unless you need to limit the registry contents.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};