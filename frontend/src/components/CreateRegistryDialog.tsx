import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { GeneralTab } from './CreateRegistryTabs/GeneralTab';
import { DataSourcesTab } from './CreateRegistryTabs/DataSourcesTab';
import { DataFilteringTab } from './CreateRegistryTabs/DataFilteringTab';
import { SyncPolicyTab } from './CreateRegistryTabs/SyncPolicyTab';
import { ManifestViewer } from './ManifestViewer';

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
      id={`create-registry-tabpanel-${index}`}
      aria-labelledby={`create-registry-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `create-registry-tab-${index}`,
    'aria-controls': `create-registry-tabpanel-${index}`,
  };
}

export interface CreateMCPRegistryRequest {
  name: string;
  displayName: string;
  namespace: string;
  enforceServers?: boolean;
  source: {
    type: 'configmap' | 'git';
    format: 'toolhive';
    configmap?: {
      name: string;
      key: string;
    };
    git?: {
      repository: string;
      branch?: string;
      path: string;
    };
  };
  syncPolicy?: {
    interval: string;
  };
  filter?: {
    names?: {
      include?: string[];
      exclude?: string[];
    };
    tags?: {
      include?: string[];
      exclude?: string[];
    };
  };
}

interface CreateRegistryDialogProps {
  open: boolean;
  onClose: () => void;
  currentNamespace: string;
  onCreate: (request: CreateMCPRegistryRequest) => Promise<void>;
}

export const CreateRegistryDialog: React.FC<CreateRegistryDialogProps> = ({
  open,
  onClose,
  currentNamespace,
  onCreate,
}) => {
  const [formData, setFormData] = useState<CreateMCPRegistryRequest>({
    name: '',
    displayName: '',
    namespace: currentNamespace,
    enforceServers: false,
    source: {
      type: 'configmap',
      format: 'toolhive',
      configmap: {
        name: '',
        key: '',
      },
    },
  });

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [showManifest, setShowManifest] = useState(false);
  const [generatedManifestObject, setGeneratedManifestObject] = useState<object | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        displayName: '',
        namespace: currentNamespace,
        enforceServers: false,
        source: {
          type: 'configmap',
          format: 'toolhive',
          configmap: {
            name: '',
            key: '',
          },
        },
      });
      setError(null);
      setCurrentTab(0);
      setShowManifest(false);
      setGeneratedManifestObject(null);
    }
  }, [open, currentNamespace]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const generateManifest = () => {
    const cleanedData = cleanFormDataForSubmission(formData);
    const manifest = {
      apiVersion: 'toolhive.stacklok.dev/v1alpha1',
      kind: 'MCPRegistry',
      metadata: {
        name: cleanedData.name,
        namespace: cleanedData.namespace,
      },
      spec: {
        displayName: cleanedData.displayName,
        ...(cleanedData.enforceServers && { enforceServers: cleanedData.enforceServers }),
        source: cleanedData.source,
        ...(cleanedData.syncPolicy && { syncPolicy: cleanedData.syncPolicy }),
        ...(cleanedData.filter && { filter: cleanedData.filter }),
      },
    };

    return JSON.stringify(manifest, null, 2);
  };

  const handlePreviewManifest = () => {
    const manifestString = generateManifest();
    const manifestObject = JSON.parse(manifestString);
    setGeneratedManifestObject(manifestObject);
    setShowManifest(true);
  };


  const cleanFormDataForSubmission = (data: CreateMCPRegistryRequest): CreateMCPRegistryRequest => {
    const cleaned: CreateMCPRegistryRequest = {
      ...data,
      source: {
        type: data.source.type,
        format: data.source.format,
        // Only include the relevant sub-object based on type
        ...(data.source.type === 'configmap' && data.source.configmap && {
          configmap: data.source.configmap
        }),
        ...(data.source.type === 'git' && data.source.git && {
          git: data.source.git
        })
      }
    };

    // Remove undefined values to avoid sending them
    if (cleaned.source.type === 'configmap') {
      delete (cleaned.source as any).git;
    } else if (cleaned.source.type === 'git') {
      delete (cleaned.source as any).configmap;
    }

    return cleaned;
  };

  const handleCreate = async () => {
    // Basic validation
    if (!formData.name.trim()) {
      setError('Registry name is required');
      setCurrentTab(0); // Go to General tab
      return;
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required');
      setCurrentTab(0); // Go to General tab
      return;
    }

    // Validate source configuration
    if (formData.source.type === 'configmap') {
      if (!formData.source.configmap?.name || !formData.source.configmap?.key) {
        setError('ConfigMap name and key are required');
        setCurrentTab(1); // Go to Data Sources tab
        return;
      }
    } else if (formData.source.type === 'git') {
      if (!formData.source.git?.repository || !formData.source.git?.path) {
        setError('Git repository URL and file path are required');
        setCurrentTab(1); // Go to Data Sources tab
        return;
      }
    }

    setCreating(true);
    setError(null);

    try {
      const cleanedData = cleanFormDataForSubmission(formData);
      await onCreate(cleanedData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create registry');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      onClose();
    }
  };

  const updateFormData = (updates: Partial<CreateMCPRegistryRequest>) => {
    console.log('CreateRegistryDialog: updateFormData called with:', updates);
    setFormData(prev => {
      console.log('CreateRegistryDialog: Previous formData:', prev);

      // Deep merge the source and filters objects specifically
      const newFormData = {
        ...prev,
        ...updates,
        source: updates.source ? {
          ...prev.source,
          ...updates.source,
          // Only keep the relevant sub-object based on type
          configmap: updates.source.type === 'configmap' ?
            (updates.source.configmap ? {
              ...(prev.source.configmap || {}),
              ...updates.source.configmap,
            } : prev.source.configmap) : undefined,
          git: updates.source.type === 'git' ?
            (updates.source.git ? {
              ...(prev.source.git || {}),
              ...updates.source.git,
            } : prev.source.git) : undefined,
        } : prev.source,
        filter: updates.filter ? {
          ...(prev.filter || {}),
          ...updates.filter,
          names: updates.filter.names ? {
            ...(prev.filter?.names || {}),
            ...updates.filter.names,
          } : prev.filter?.names,
          tags: updates.filter.tags ? {
            ...(prev.filter?.tags || {}),
            ...updates.filter.tags,
          } : prev.filter?.tags,
        } : prev.filter,
        syncPolicy: updates.syncPolicy ? {
          ...(prev.syncPolicy || {}),
          ...updates.syncPolicy,
        } : updates.syncPolicy === undefined ? undefined : prev.syncPolicy,
      };

      console.log('CreateRegistryDialog: New formData:', JSON.stringify(newFormData, null, 2));
      console.log('CreateRegistryDialog: New formData.source.configmap:', JSON.stringify(newFormData.source.configmap, null, 2));
      return newFormData;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create New Registry</Typography>
          <IconButton onClick={handleClose} disabled={creating}>
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
                aria-label="create registry tabs"
                sx={{ px: 2 }}
              >
                <Tab
                  label="General"
                  {...a11yProps(0)}
                />
                <Tab
                  label="Data Sources"
                  {...a11yProps(1)}
                />
                <Tab
                  label="Data Filtering"
                  {...a11yProps(2)}
                />
                <Tab
                  label="Sync Policy"
                  {...a11yProps(3)}
                />
              </Tabs>
            </Box>

            <Box sx={{ px: 2, pb: 2 }}>
              <TabPanel value={currentTab} index={0}>
                <GeneralTab
                  formData={formData}
                  onUpdate={updateFormData}
                />
              </TabPanel>

              <TabPanel value={currentTab} index={1}>
                <DataSourcesTab
                  formData={formData}
                  onUpdate={updateFormData}
                />
              </TabPanel>

              <TabPanel value={currentTab} index={2}>
                <DataFilteringTab
                  formData={formData}
                  onUpdate={updateFormData}
                />
              </TabPanel>

              <TabPanel value={currentTab} index={3}>
                <SyncPolicyTab
                  formData={formData}
                  onUpdate={updateFormData}
                />
              </TabPanel>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 2, px: 2, pt: 2 }}>
              <Typography variant="h6">Generated Manifest</Typography>
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
        <Button onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        {!showManifest ? (
          <>
            <Button onClick={handlePreviewManifest} variant="outlined">
              Preview Manifest
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={creating}
              startIcon={creating ? <CircularProgress size={20} /> : null}
            >
              {creating ? 'Creating...' : 'Create Registry'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setShowManifest(false)} variant="outlined">
              Back to Configuration
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={creating}
              startIcon={creating ? <CircularProgress size={20} /> : null}
            >
              {creating ? 'Creating...' : 'Create Registry'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};