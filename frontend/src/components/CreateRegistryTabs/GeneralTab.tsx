import React from 'react';
import {
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Info as InfoIcon,
} from '@mui/icons-material';
import { CreateMCPRegistryRequest } from '../CreateRegistryDialog';

interface GeneralTabProps {
  formData: CreateMCPRegistryRequest;
  onUpdate: (updates: Partial<CreateMCPRegistryRequest>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  formData,
  onUpdate,
}) => {
  const validateKubernetesName = (name: string): string | null => {
    if (!name) return null;

    // Kubernetes naming rules for MCPRegistry resources
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

    if (name.length > 63) {
      return 'Name must be 63 characters or less';
    }

    if (!nameRegex.test(name)) {
      return 'Name must start and end with alphanumeric characters and can only contain lowercase letters, numbers, and hyphens';
    }

    return null;
  };

  const nameError = validateKubernetesName(formData.name);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        General Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the basic settings for your new MCP registry.
      </Typography>

      <TextField
        fullWidth
        label="Registry Name"
        value={formData.name}
        onChange={(e) => onUpdate({ name: e.target.value.toLowerCase() })}
        required
        error={!!nameError}
        helperText={nameError || 'Must follow Kubernetes naming conventions (lowercase, alphanumeric, hyphens)'}
        sx={{ mb: 2 }}
        placeholder="my-registry"
      />

      <TextField
        fullWidth
        label="Display Name"
        value={formData.displayName}
        onChange={(e) => onUpdate({ displayName: e.target.value })}
        required
        helperText="A human-readable name for the registry"
        sx={{ mb: 2 }}
        placeholder="My Custom Registry"
      />

      <TextField
        fullWidth
        label="Namespace"
        value={formData.namespace}
        disabled
        helperText="The namespace where the registry will be created (currently selected namespace)"
        sx={{ mb: 3 }}
      />

      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enforceServers || false}
              onChange={(e) => onUpdate({ enforceServers: e.target.checked })}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                Enforce Server Validation
              </Typography>
              <Tooltip title="When enabled, only servers defined in this registry can be deployed in this namespace. This provides additional security by preventing unauthorized server deployments.">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
          }
        />
      </Box>

      {formData.enforceServers && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Server Enforcement Enabled:</strong> Only servers defined in this registry will be allowed to be deployed as MCPServer resources in the <code>{formData.namespace}</code> namespace. This helps ensure that only approved servers can be deployed.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};