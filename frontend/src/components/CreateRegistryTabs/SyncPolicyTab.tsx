import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { CreateMCPRegistryRequest } from '../CreateRegistryDialog';

interface SyncPolicyTabProps {
  formData: CreateMCPRegistryRequest;
  onUpdate: (updates: Partial<CreateMCPRegistryRequest>) => void;
}

const PREDEFINED_INTERVALS = [
  { value: '1m', label: '1 minute', description: 'For development/testing' },
  { value: '5m', label: '5 minutes', description: 'Frequent updates' },
  { value: '15m', label: '15 minutes', description: 'Regular updates' },
  { value: '30m', label: '30 minutes', description: 'Moderate updates' },
  { value: '1h', label: '1 hour', description: 'Hourly updates' },
  { value: '6h', label: '6 hours', description: 'Periodic updates' },
  { value: '24h', label: '24 hours', description: 'Daily updates' },
  { value: 'manual', label: 'Manual only', description: 'No automatic sync' },
];

export const SyncPolicyTab: React.FC<SyncPolicyTabProps> = ({
  formData,
  onUpdate,
}) => {
  const [customInterval, setCustomInterval] = React.useState('');
  const [isCustomMode, setIsCustomMode] = React.useState(false);

  React.useEffect(() => {
    const currentInterval = formData.syncPolicy?.interval || '1h';
    const isPredefined = PREDEFINED_INTERVALS.some(interval => interval.value === currentInterval);

    if (!isPredefined && currentInterval !== 'manual') {
      setIsCustomMode(true);
      setCustomInterval(currentInterval);
    } else {
      setIsCustomMode(false);
      setCustomInterval('');
    }
  }, [formData.syncPolicy?.interval]);

  const handleIntervalChange = (interval: string) => {
    if (interval === 'custom') {
      setIsCustomMode(true);
      return;
    }

    setIsCustomMode(false);

    if (interval === 'manual') {
      onUpdate({
        syncPolicy: undefined, // Remove sync policy for manual mode
      });
    } else {
      onUpdate({
        syncPolicy: {
          interval: interval,
        },
      });
    }
  };

  const handleCustomIntervalChange = (interval: string) => {
    setCustomInterval(interval);

    if (interval.trim()) {
      onUpdate({
        syncPolicy: {
          interval: interval.trim(),
        },
      });
    }
  };

  const validateCustomInterval = (interval: string): string | null => {
    if (!interval.trim()) return 'Interval is required';

    // Basic validation for Kubernetes duration format
    const durationRegex = /^(\d+)(s|m|h|d)$/;
    if (!durationRegex.test(interval.trim())) {
      return 'Invalid format. Use format like: 30s, 5m, 1h, 2d';
    }

    return null;
  };

  const getCurrentInterval = () => {
    if (!formData.syncPolicy?.interval) return 'manual';
    if (isCustomMode) return 'custom';
    return formData.syncPolicy.interval;
  };

  const getIntervalDescription = (interval: string) => {
    if (interval === 'manual') return 'Registry will only sync when manually triggered';
    if (interval === 'custom') return 'Use custom duration format';

    const predefined = PREDEFINED_INTERVALS.find(p => p.value === interval);
    return predefined?.description || 'Custom sync interval';
  };

  const customIntervalError = isCustomMode ? validateCustomInterval(customInterval) : null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sync Policy Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure how frequently the registry should synchronize with its data source.
        Automatic sync keeps the registry up-to-date with the latest server definitions.
      </Typography>

      {/* Sync Interval Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Sync Interval</InputLabel>
        <Select
          value={getCurrentInterval()}
          label="Sync Interval"
          onChange={(e) => handleIntervalChange(e.target.value)}
        >
          {PREDEFINED_INTERVALS.map((interval) => (
            <MenuItem key={interval.value} value={interval.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {interval.value === 'manual' ? <TimerIcon /> : <ScheduleIcon />}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography>{interval.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {interval.description}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
          <MenuItem value="custom">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SyncIcon />
              <Box>
                <Typography>Custom Interval</Typography>
                <Typography variant="caption" color="text.secondary">
                  Specify your own sync duration
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Custom Interval Input */}
      {isCustomMode && (
        <TextField
          fullWidth
          label="Custom Sync Interval"
          value={customInterval}
          onChange={(e) => handleCustomIntervalChange(e.target.value)}
          error={!!customIntervalError}
          helperText={customIntervalError || 'Examples: 30s, 5m, 1h, 2d'}
          placeholder="1h"
          sx={{ mb: 3 }}
        />
      )}

      {/* Current Selection Summary */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon fontSize="small" />
          Current Sync Policy
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip
            label={
              formData.syncPolicy?.interval
                ? `Every ${formData.syncPolicy.interval}`
                : 'Manual sync only'
            }
            color={formData.syncPolicy?.interval ? 'primary' : 'default'}
            size="small"
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {getIntervalDescription(getCurrentInterval())}
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Sync Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sync Behavior
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Automatic Sync:</strong> The registry will periodically check the data source for updates and refresh the server list accordingly.
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          • <strong>ConfigMap sources:</strong> Changes to the ConfigMap data will be detected and applied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          • <strong>Git sources:</strong> New commits to the specified branch and file path will be pulled
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          • <strong>Manual sync:</strong> Registry can be manually refreshed from the registry details page
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>Error handling:</strong> Failed syncs will be retried with exponential backoff
        </Typography>
      </Box>

      {/* Performance Considerations */}
      <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
        <Typography variant="subtitle2" gutterBottom>
          Performance Considerations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Shorter intervals (&lt; 5 minutes) may impact cluster performance with frequent API calls
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • For large registries or slow data sources, consider longer intervals (&ge; 1 hour)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Manual sync is recommended for development or when changes are infrequent
        </Typography>
      </Box>
    </Box>
  );
};