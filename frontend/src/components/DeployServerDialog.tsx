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
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { getDisplayName } from '../utils/displayNames';
import { ManifestViewer } from './ManifestViewer';

interface EnvironmentVariable {
  name: string;
  value: string;
  required: boolean;
  description?: string;
  secret?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`deploy-tabpanel-${index}`}
      aria-labelledby={`deploy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

interface DeploymentConfig {
  name: string;
  image: string;
  transport: string; // Keep original server transport (stdio, http, streamable-http, sse, etc.)
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
  proxyMode?: 'sse' | 'streamable-http';
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
    secret?: boolean;
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
  registryNamespace: string;
  onDeploy: (config: DeploymentConfig) => Promise<void>;
}

export const DeployServerDialog: React.FC<DeployServerDialogProps> = ({
  open,
  onClose,
  server,
  registryId: _registryId,
  registryName,
  registryNamespace,
  onDeploy,
}) => {
  const [config, setConfig] = useState<DeploymentConfig>({
    name: '',
    image: '',
    transport: 'http',
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
  const [generatedManifestObject, setGeneratedManifestObject] = useState<object | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (server && open) {
      // Reset state when dialog opens with new server
      setError(null);
      setShowManifest(false);
      setGeneratedManifest('');
      setCurrentTab(0);

      // Generate default deployment name with counter logic
      const baseName = server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const timestamp = Date.now().toString().slice(-4);
      const defaultName = `${baseName}-${timestamp}`;

      // Extract environment variables from server definition
      const envVars: EnvironmentVariable[] = server.env?.map(env => ({
        name: env.name,
        value: env.default || '',
        required: env.required || false,
        description: env.description,
        secret: env.secret,
      })) || [];

      // Keep the original server transport as-is
      const originalTransport = server.transport || 'http';
      let defaultProxyMode: 'sse' | 'streamable-http' | undefined;

      // Set default proxy mode for stdio servers
      if (originalTransport === 'stdio') {
        defaultProxyMode = 'streamable-http'; // Default to streamable-http (SSE is legacy)
      }

      setConfig({
        name: defaultName,
        image: server.image,
        transport: originalTransport, // Keep original transport
        targetPort: server.port || 8080, // All servers need a valid target port (1-65535)
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
        namespace: registryNamespace,
        registryName: registryName,
        registryNamespace: registryNamespace,
        proxyMode: defaultProxyMode,
      });
    }
  }, [server, open, registryName, registryNamespace]);

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
        ...(config.proxyMode && {
          proxyMode: config.proxyMode,
        }),
        permissionProfile: config.permissionProfile,
        resources: config.resources,
        ...(config.environmentVariables.filter(env => env.value.trim()).length > 0 && {
          env: config.environmentVariables
            .filter(env => env.value.trim()) // Only include env vars with non-empty values
            .map(env => ({
              name: env.name,
              value: env.value,
            })),
        }),
      },
    };

    return JSON.stringify(manifest, null, 2);
  };

  const handlePreviewManifest = () => {
    const manifestString = generateManifest();
    const manifestObject = JSON.parse(manifestString);
    setGeneratedManifest(manifestString);
    setGeneratedManifestObject(manifestObject);
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
      // Filter out empty environment variables before deployment
      const deploymentConfig = {
        ...config,
        environmentVariables: config.environmentVariables.filter(env => env.value.trim())
      };
      await onDeploy(deploymentConfig);
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
        { name: '', value: '', required: false, description: undefined, secret: false },
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const permissionProfiles = [
    { value: 'none', label: 'None (No permissions)' },
    { value: 'network', label: 'Network (Network access permissions)' },
  ];

  if (!server) {return null;}

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Deploy {getDisplayName(server.name)}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {!showManifest ? (
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                aria-label="deployment configuration tabs"
                sx={{ px: 2 }}
              >
                <Tab
                  label="Server"
                  id="deploy-tab-0"
                  aria-controls="deploy-tabpanel-0"
                />
                <Tab
                  label="Environment Variables"
                  id="deploy-tab-1"
                  aria-controls="deploy-tabpanel-1"
                />
                <Tab
                  label="Resources"
                  id="deploy-tab-2"
                  aria-controls="deploy-tabpanel-2"
                />
              </Tabs>
            </Box>

            <Box sx={{ px: 2, pb: 2 }}>
              <TabPanel value={currentTab} index={0}>
                {/* Server Configuration */}

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

                <TextField
                  fullWidth
                  label="Transport"
                  value={config.transport}
                  disabled
                  helperText="Transport is determined by the server configuration"
                  sx={{ mb: 2 }}
                />

                {config.transport === 'stdio' && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Proxy Mode</InputLabel>
                    <Select
                      value={config.proxyMode || ''}
                      label="Proxy Mode"
                      onChange={(e) => setConfig({ ...config, proxyMode: e.target.value as 'sse' | 'streamable-http' })}
                    >
                      <MenuItem value="sse">SSE</MenuItem>
                      <MenuItem value="streamable-http">Streamable HTTP</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Target Port"
                    type="number"
                    value={config.targetPort}
                    onChange={(e) => setConfig({ ...config, targetPort: parseInt(e.target.value) })}
                    disabled={config.transport === 'stdio'}
                    sx={{ flex: 1 }}
                    helperText={config.transport === 'stdio' ? "Not applicable for stdio transport" : "Port where the MCP server is listening (1-65535)"}
                  />
                  <TextField
                    label="Service Port"
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                    sx={{ flex: 1 }}
                    helperText="Port for the Kubernetes service"
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
                  disabled
                  helperText="Namespace is determined by the registry configuration"
                />
              </TabPanel>

              <TabPanel value={currentTab} index={1}>
                {/* Environment Variables */}
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
                  <Box key={index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {/* Variable name, badges, and description in one row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {envVar.name || 'New Variable'}
                      </Typography>
                      {envVar.required && (
                        <Chip label="Required" size="small" color="error" />
                      )}
                      {envVar.secret && (
                        <Chip label="Secret" size="small" color="warning" />
                      )}
                      {envVar.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
                          {envVar.description}
                        </Typography>
                      )}
                    </Box>

                    {/* Input fields */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <TextField
                        label="Name"
                        value={envVar.name}
                        onChange={(e) => handleEnvVarChange(index, 'name', e.target.value)}
                        sx={{ flex: 1 }}
                        size="small"
                        disabled={envVar.required && server?.env && server.env.some(e => e.name === envVar.name)}
                      />
                      <TextField
                        label="Value"
                        value={envVar.value}
                        onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                        sx={{ flex: 2 }}
                        size="small"
                        required={envVar.required}
                        error={envVar.required && !envVar.value.trim()}
                        type={envVar.secret ? 'password' : 'text'}
                        helperText={envVar.secret ? 'This is a secret value' : ''}
                      />
                      <IconButton
                        onClick={() => removeEnvironmentVariable(index)}
                        disabled={envVar.required && server?.env && server.env.some(e => e.name === envVar.name)}
                        size="small"
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
              </TabPanel>

              <TabPanel value={currentTab} index={2}>
                {/* Resource Configuration */}
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
              </TabPanel>
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
            {generatedManifestObject && (
              <ManifestViewer
                open={true}
                onClose={() => {}} // Don't close, just display inline
                title=""
                manifest={generatedManifestObject}
                inline={true} // Add inline prop to display without dialog
              />
            )}
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