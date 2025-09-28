import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import {
  Storage as StorageIcon,
  GitHub as GitIcon,
} from '@mui/icons-material';
import { CreateMCPRegistryRequest } from '../CreateRegistryDialog';
import { ConfigMapSelector } from './ConfigMapSelector';
import { GitSelector } from './GitSelector';

interface DataSourcesTabProps {
  formData: CreateMCPRegistryRequest;
  onUpdate: (updates: Partial<CreateMCPRegistryRequest>) => void;
}

export const DataSourcesTab: React.FC<DataSourcesTabProps> = ({
  formData,
  onUpdate,
}) => {
  const handleSourceTypeChange = (sourceType: 'configmap' | 'git') => {
    const newSource = {
      type: sourceType,
      format: 'toolhive' as const,
    };

    // Add the appropriate source configuration
    if (sourceType === 'configmap') {
      (newSource as any).configmap = {
        name: '',
        key: '',
      };
    } else {
      (newSource as any).git = {
        repository: '',
        branch: 'main',
        path: '',
      };
    }

    onUpdate({ source: newSource });
  };

  const handleConfigMapChange = (configMapName: string) => {
    console.log('DataSourcesTab: handleConfigMapChange called with:', configMapName);

    if (formData.source.type === 'configmap') {
      // Only update the configmap name, preserve the existing key
      onUpdate({
        source: {
          ...formData.source,
          configmap: {
            name: configMapName,
            key: formData.source.configmap?.key || '', // Preserve existing key
          },
        },
      });
    }
  };

  const handleKeyChange = (key: string) => {
    if (formData.source.type === 'configmap') {
      onUpdate({
        source: {
          ...formData.source,
          configmap: {
            ...(formData.source.configmap || { name: '', key: '' }),
            key: key,
          },
        },
      });
    }
  };

  const handleGitRepositoryChange = (repository: string) => {
    if (formData.source.type === 'git') {
      onUpdate({
        source: {
          ...formData.source,
          git: {
            repository: repository,
            branch: formData.source.git?.branch || 'main',
            path: formData.source.git?.path || '',
          },
        },
      });
    }
  };

  const handleGitBranchChange = (branch: string) => {
    if (formData.source.type === 'git') {
      onUpdate({
        source: {
          ...formData.source,
          git: {
            ...(formData.source.git || { repository: '', path: '' }),
            branch: branch,
          },
        },
      });
    }
  };

  const handleGitPathChange = (path: string) => {
    if (formData.source.type === 'git') {
      onUpdate({
        source: {
          ...formData.source,
          git: {
            ...(formData.source.git || { repository: '', branch: 'main' }),
            path: path,
          },
        },
      });
    }
  };


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Sources Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure where the registry data will be sourced from. The registry must contain server definitions in ToolHive format.
      </Typography>

      {/* Source Type Selection */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Data Source Type
          </Typography>
        </FormLabel>
        <RadioGroup
          value={formData.source.type}
          onChange={(e) => handleSourceTypeChange(e.target.value as 'configmap' | 'git')}
          sx={{ mt: 1 }}
        >
          <FormControlLabel
            value="configmap"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon />
                <Box>
                  <Typography variant="body1">ConfigMap</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Load registry data from a Kubernetes ConfigMap
                  </Typography>
                </Box>
              </Box>
            }
          />
          <FormControlLabel
            value="git"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitIcon />
                <Box>
                  <Typography variant="body1">Git Repository</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Load registry data from a Git repository file
                  </Typography>
                </Box>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ mb: 3 }} />

      {/* ConfigMap Configuration */}
      {formData.source.type === 'configmap' && (
        <ConfigMapSelector
          namespace={formData.namespace}
          selectedConfigMap={formData.source.configmap?.name}
          selectedKey={formData.source.configmap?.key}
          onConfigMapChange={handleConfigMapChange}
          onKeyChange={handleKeyChange}
        />
      )}

      {/* Git Configuration */}
      {formData.source.type === 'git' && (
        <GitSelector
          repository={formData.source.git?.repository || ''}
          branch={formData.source.git?.branch}
          path={formData.source.git?.path || ''}
          onRepositoryChange={handleGitRepositoryChange}
          onBranchChange={handleGitBranchChange}
          onPathChange={handleGitPathChange}
        />
      )}

      {/* Format Information */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Registry Format: ToolHive
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The registry data must be in ToolHive format, which includes server definitions with metadata, tags, tools, and deployment configurations.
        </Typography>
      </Box>
    </Box>
  );
};