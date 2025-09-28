import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { api, ConfigMapInfo } from '../../services/api';

interface ConfigMapSelectorProps {
  namespace: string;
  selectedConfigMap?: string;
  selectedKey?: string;
  onConfigMapChange: (configMapName: string) => void;
  onKeyChange: (key: string) => void;
  disabled?: boolean;
}

export const ConfigMapSelector: React.FC<ConfigMapSelectorProps> = ({
  namespace,
  selectedConfigMap,
  selectedKey,
  onConfigMapChange,
  onKeyChange,
  disabled = false,
}) => {
  console.log('ConfigMapSelector: Props received:', {
    namespace,
    selectedConfigMap,
    selectedKey,
    disabled,
  });
  const [configMaps, setConfigMaps] = useState<ConfigMapInfo[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loadingConfigMaps, setLoadingConfigMaps] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ConfigMaps when namespace changes
  useEffect(() => {
    const loadConfigMaps = async () => {
      if (!namespace || disabled) return;

      setLoadingConfigMaps(true);
      setError(null);

      try {
        console.log(`Loading ConfigMaps for namespace: ${namespace}`);
        const configMapList = await api.getConfigMaps(namespace);
        console.log(`Found ${configMapList.length} ConfigMaps`);

        setConfigMaps(configMapList);
      } catch (err) {
        console.error('Error loading ConfigMaps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ConfigMaps');
        setConfigMaps([]);
      } finally {
        setLoadingConfigMaps(false);
      }
    };

    loadConfigMaps();
  }, [namespace, disabled]);

  // Load keys when ConfigMap changes
  useEffect(() => {
    const loadKeys = async () => {
      if (!selectedConfigMap || !namespace || disabled) {
        setKeys([]);
        return;
      }

      setLoadingKeys(true);
      setError(null);

      try {
        console.log(`Loading keys for ConfigMap: ${selectedConfigMap}`);
        const keyList = await api.getConfigMapKeys(selectedConfigMap, namespace);
        console.log(`Found keys:`, keyList);

        setKeys(keyList);
      } catch (err) {
        console.error('Error loading ConfigMap keys:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ConfigMap keys');
        setKeys([]);
      } finally {
        setLoadingKeys(false);
      }
    };

    loadKeys();
  }, [selectedConfigMap, namespace, disabled]);

  const handleConfigMapChange = (configMapName: string) => {
    console.log('ConfigMapSelector: ConfigMap changed to:', configMapName);
    onConfigMapChange(configMapName);
    // Don't reset the key automatically - let the parent handle key management
  };


  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon />
        ConfigMap Source
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a ConfigMap and key that contains the registry data in ToolHive format.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Namespace Display */}
      <TextField
        fullWidth
        label="Namespace"
        value={namespace}
        disabled
        sx={{ mb: 2 }}
        helperText="ConfigMaps will be searched in this namespace"
      />

      {/* ConfigMap Selector */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>ConfigMap</InputLabel>
        <Select
          value={selectedConfigMap || ''}
          label="ConfigMap"
          onChange={(e) => {
            console.log('ConfigMapSelector: Select onChange triggered with value:', e.target.value);
            handleConfigMapChange(e.target.value);
          }}
          disabled={disabled || loadingConfigMaps}
          endAdornment={loadingConfigMaps && <CircularProgress size={20} />}
        >
          {configMaps.length === 0 && !loadingConfigMaps && (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon fontSize="small" color="warning" />
                No ConfigMaps found
              </Box>
            </MenuItem>
          )}
          {configMaps.map((configMap) => (
            <MenuItem key={configMap.name} value={configMap.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography>{configMap.name}</Typography>
                <Chip
                  label={`${configMap.keys.length} keys`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Key Selector */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Key</InputLabel>
        <Select
          value={selectedKey || ''}
          label="Key"
          onChange={(e) => onKeyChange(e.target.value)}
          disabled={disabled || !selectedConfigMap || loadingKeys}
          endAdornment={loadingKeys && <CircularProgress size={20} />}
        >
          {keys.length === 0 && !loadingKeys && selectedConfigMap && (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon fontSize="small" color="warning" />
                No keys found
              </Box>
            </MenuItem>
          )}
          {keys.map((key) => (
            <MenuItem key={key} value={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{key}</Typography>
                {key.toLowerCase().includes('registry') && (
                  <CheckCircleIcon fontSize="small" color="success" />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {selectedConfigMap && !loadingKeys && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Select the key that contains the registry JSON data
          </Typography>
        )}
      </FormControl>

      {/* Selection Summary */}
      {selectedConfigMap && selectedKey && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon fontSize="small" color="success" />
            <strong>Selected:</strong> {selectedConfigMap}.{selectedKey}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Registry data will be loaded from this ConfigMap key
          </Typography>
        </Box>
      )}
    </Box>
  );
};