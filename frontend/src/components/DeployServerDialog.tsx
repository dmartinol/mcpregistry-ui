import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Chip,
  Alert,
  Paper,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

interface EnvironmentVariable {
  name: string;
  value: string;
  required: boolean;
}

interface DeploymentConfig {
  name: string;
  image: string;
  transport: 'streamable-http' | 'stdio';
  targetPort: number;
  port: number;
  permissionProfile: {
    type: 'builtin';
    name: string;
  };
  resources: {
    limits: {
      cpu: string;
      memory: string;
    };
    requests: {
      cpu: string;
      memory: string;
    };
  };
  environmentVariables: EnvironmentVariable[];
  namespace: string;
  registryName: string;
  registryNamespace: string;
}

interface Server {
  name: string;
  image: string;
  description?: string;
  tags?: string[];
  env?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    default?: string;
  }>;
  transport?: string;
  port?: number;
}

interface DeployServerDialogProps {
  open: boolean;
  onClose: () => void;
  server: Server | null;
  registryId: string;
  registryName: string;
  onDeploy: (config: DeploymentConfig) => Promise<void>;
}

export const DeployServerDialog: React.FC<DeployServerDialogProps> = ({
  open,
  onClose,
  server,
  registryId: _registryId,
  registryName,
  onDeploy,
}) => {
  const [config, setConfig] = useState<DeploymentConfig>({
    name: '',
    image: '',
    transport: 'streamable-http',
    targetPort: 8080,
    port: 8080,
    permissionProfile: {
      type: 'builtin',
      name: 'network',
    },
    resources: {
      limits: {
        cpu: '100m',
        memory: '128Mi',
      },
      requests: {
        cpu: '50m',
        memory: '64Mi',
      },
    },
    environmentVariables: [],
    namespace: 'toolhive-system',
    registryName: registryName,
    registryNamespace: 'toolhive-system',
  });

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [generatedManifest, setGeneratedManifest] = useState('');

  useEffect(() => {
    if (server && open) {
      // Reset state when dialog opens with new server
      setError(null);
      setShowManifest(false);
      setGeneratedManifest('');

      // Generate default deployment name with counter logic
      const baseName = server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const timestamp = Date.now().toString().slice(-4);
      const defaultName = `${baseName}-${timestamp}`;

      // Extract environment variables from server definition
      const envVars: EnvironmentVariable[] = server.env?.map(env => ({
        name: env.name,
        value: env.default || '',
        required: env.required || false,
      })) || [];

      setConfig({
        name: defaultName,
        image: server.image,
        transport: (server.transport as 'streamable-http' | 'stdio') || 'streamable-http',
        targetPort: server.port || 8080,
        port: server.port || 8080,
        permissionProfile: {
          type: 'builtin',
          name: 'network',
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
        },
        environmentVariables: envVars,
        namespace: 'toolhive-system',
        registryName: registryName,
        registryNamespace: 'toolhive-system',
      });
    }
  }, [server, open, registryName]);

  const generateManifest = () => {
    const manifest = {
      apiVersion: 'toolhive.stacklok.dev/v1alpha1',
      kind: 'MCPServer',
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: {
          'toolhive.stacklok.io/registry-name': config.registryName,
          'toolhive.stacklok.io/registry-namespace': config.registryNamespace,
          'toolhive.stacklok.io/server-name': server?.name || config.name,
        },
      },
      spec: {
        image: config.image,
        transport: config.transport,
        targetPort: config.targetPort,
        port: config.port,
        ...(config.transport === 'stdio' && {
          proxyMode: 'streaming-http',
        }),
        permissionProfile: config.permissionProfile,
        resources: config.resources,
        ...(config.environmentVariables.length > 0 && {
          env: config.environmentVariables.map(env => ({
            name: env.name,
            value: env.value,
          })),
        }),
      },
    };

    return JSON.stringify(manifest, null, 2);
  };

  const handlePreviewManifest = () => {
    const manifest = generateManifest();
    setGeneratedManifest(manifest);
    setShowManifest(true);
  };

  const handleDeploy = async () => {
    // Validate required environment variables
    const missingRequired = config.environmentVariables
      .filter(env => env.required && !env.value.trim())
      .map(env => env.name);

    if (missingRequired.length > 0) {
      setError(`Please provide values for required environment variables: ${missingRequired.join(', ')}`);
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      await onDeploy(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy server');
    } finally {
      setDeploying(false);
    }
  };

  const handleEnvVarChange = (index: number, field: 'name' | 'value', value: string) => {
    const updatedEnvVars = [...config.environmentVariables];
    updatedEnvVars[index] = { ...updatedEnvVars[index], [field]: value };
    setConfig({ ...config, environmentVariables: updatedEnvVars });
  };

  const addEnvironmentVariable = () => {
    setConfig({
      ...config,
      environmentVariables: [
        ...config.environmentVariables,
        { name: '', value: '', required: false },
      ],
    });
  };

  const removeEnvironmentVariable = (index: number) => {
    const updatedEnvVars = config.environmentVariables.filter((_, i) => i !== index);
    setConfig({ ...config, environmentVariables: updatedEnvVars });
  };

  const copyManifestToClipboard = () => {
    navigator.clipboard.writeText(generatedManifest);
  };

  const permissionProfiles = [
    { value: 'network', label: 'Network Access' },
    { value: 'filesystem', label: 'Filesystem Access' },
    { value: 'minimal', label: 'Minimal Permissions' },
  ];

  if (!server) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Deploy {server.name}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!showManifest ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Basic Configuration */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Basic Configuration</Typography>

              <TextField
                fullWidth
                label="Deployment Name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                helperText="Must be a valid Kubernetes resource name"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Container Image"
                value={config.image}
                onChange={(e) => setConfig({ ...config, image: e.target.value })}
                disabled
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Transport</InputLabel>
                <Select
                  value={config.transport}
                  label="Transport"
                  onChange={(e) => setConfig({ ...config, transport: e.target.value as 'streamable-http' | 'stdio' })}
                >
                  <MenuItem value="streamable-http">Streamable HTTP</MenuItem>
                  <MenuItem value="stdio">STDIO</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Target Port"
                  type="number"
                  value={config.targetPort}
                  onChange={(e) => setConfig({ ...config, targetPort: parseInt(e.target.value) })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Service Port"
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                  sx={{ flex: 1 }}
                />
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Permission Profile</InputLabel>
                <Select
                  value={config.permissionProfile.name}
                  label="Permission Profile"
                  onChange={(e) => setConfig({
                    ...config,
                    permissionProfile: { ...config.permissionProfile, name: e.target.value }
                  })}
                >
                  {permissionProfiles.map(profile => (
                    <MenuItem key={profile.value} value={profile.value}>
                      {profile.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Namespace"
                value={config.namespace}
                onChange={(e) => setConfig({ ...config, namespace: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>

            <Divider />

            {/* Environment Variables */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Environment Variables</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addEnvironmentVariable}
                  size="small"
                >
                  Add Variable
                </Button>
              </Box>

              {config.environmentVariables.map((envVar, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                  <TextField
                    label="Name"
                    value={envVar.name}
                    onChange={(e) => handleEnvVarChange(index, 'name', e.target.value)}
                    sx={{ flex: 1 }}
                    disabled={envVar.required && server?.env && server.env.some(e => e.name === envVar.name)}
                  />
                  <TextField
                    label="Value"
                    value={envVar.value}
                    onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                    sx={{ flex: 2 }}
                    required={envVar.required}
                    error={envVar.required && !envVar.value.trim()}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '56px' }}>
                    {envVar.required && (
                      <Chip label="Required" size="small" color="warning" sx={{ mr: 1 }} />
                    )}
                    <IconButton
                      onClick={() => removeEnvironmentVariable(index)}
                      disabled={envVar.required && server?.env && server.env.some(e => e.name === envVar.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              {config.environmentVariables.length === 0 && (
                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No environment variables configured
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Resource Configuration */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Resource Configuration</Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Limits</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="CPU Limit"
                  value={config.resources.limits.cpu}
                  onChange={(e) => setConfig({
                    ...config,
                    resources: {
                      ...config.resources,
                      limits: { ...config.resources.limits, cpu: e.target.value }
                    }
                  })}
                  sx={{ flex: 1 }}
                  helperText="e.g., 100m, 0.5"
                />
                <TextField
                  label="Memory Limit"
                  value={config.resources.limits.memory}
                  onChange={(e) => setConfig({
                    ...config,
                    resources: {
                      ...config.resources,
                      limits: { ...config.resources.limits, memory: e.target.value }
                    }
                  })}
                  sx={{ flex: 1 }}
                  helperText="e.g., 128Mi, 1Gi"
                />
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Requests</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="CPU Request"
                  value={config.resources.requests.cpu}
                  onChange={(e) => setConfig({
                    ...config,
                    resources: {
                      ...config.resources,
                      requests: { ...config.resources.requests, cpu: e.target.value }
                    }
                  })}
                  sx={{ flex: 1 }}
                  helperText="e.g., 50m, 0.1"
                />
                <TextField
                  label="Memory Request"
                  value={config.resources.requests.memory}
                  onChange={(e) => setConfig({
                    ...config,
                    resources: {
                      ...config.resources,
                      requests: { ...config.resources.requests, memory: e.target.value }
                    }
                  })}
                  sx={{ flex: 1 }}
                  helperText="e.g., 64Mi, 512Mi"
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Generated Manifest</Typography>
              <Tooltip title="Copy to clipboard">
                <IconButton onClick={copyManifestToClipboard}>
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                {generatedManifest}
              </pre>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {!showManifest ? (
          <>
            <Button onClick={handlePreviewManifest} variant="outlined">
              Preview Manifest
            </Button>
            <Button
              onClick={handleDeploy}
              variant="contained"
              disabled={deploying}
              startIcon={deploying ? <CircularProgress size={20} /> : null}
            >
              {deploying ? 'Deploying...' : 'Deploy'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setShowManifest(false)} variant="outlined">
              Back to Configuration
            </Button>
            <Button
              onClick={handleDeploy}
              variant="contained"
              disabled={deploying}
              startIcon={deploying ? <CircularProgress size={20} /> : null}
            >
              {deploying ? 'Deploying...' : 'Deploy Server'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};