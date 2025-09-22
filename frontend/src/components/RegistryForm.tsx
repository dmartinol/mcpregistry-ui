import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';

interface RegistryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    url: string;
    description?: string;
  }) => Promise<void>;
  title: string;
  initialData?: {
    name?: string;
    url?: string;
    description?: string;
  };
}

export const RegistryForm: React.FC<RegistryFormProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setName('');
      setUrl('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save registry');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    if (!loading) {
      setName('');
      setUrl('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  const isValid = name.trim().length > 0 && url.trim().length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Registry Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="my-registry"
              helperText="Use only alphanumeric characters and hyphens"
              data-testid="registry-name-input"
            />

            <TextField
              label="Registry URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              fullWidth
              type="url"
              placeholder="https://registry.example.com/api/v1"
              helperText="Full URL to the registry API endpoint"
              data-testid="registry-url-input"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Optional description for this registry"
              helperText="Optional description (max 500 characters)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || loading}
            data-testid="create-registry-button"
          >
            {loading ? 'Creating...' : 'Create Registry'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};