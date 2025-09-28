import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Autocomplete,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  GitHub as GitIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api, GitValidationResult, GitBranchInfo } from '../../services/api';

interface GitSelectorProps {
  repository: string;
  branch?: string;
  path: string;
  onRepositoryChange: (repository: string) => void;
  onBranchChange: (branch: string) => void;
  onPathChange: (path: string) => void;
  disabled?: boolean;
}

export const GitSelector: React.FC<GitSelectorProps> = ({
  repository,
  branch,
  path,
  onRepositoryChange,
  onBranchChange,
  onPathChange,
  disabled = false,
}) => {
  const [validationResult, setValidationResult] = useState<GitValidationResult | null>(null);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [validatingRepo, setValidatingRepo] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [validatingFile, setValidatingFile] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GitBranchInfo[]>([]);

  const validateRepository = useCallback(async () => {
    if (!repository.trim()) return;

    setValidatingRepo(true);
    setRepoError(null);

    try {
      console.log('GitSelector: Validating repository:', repository);
      const result = await api.validateGitRepository(repository);
      console.log('GitSelector: Validation result:', result);

      setValidationResult(result);
      if (!result.valid) {
        setRepoError(result.error || 'Repository validation failed');
      }
    } catch (error) {
      console.error('GitSelector: Repository validation error:', error);
      setRepoError(error instanceof Error ? error.message : 'Failed to validate repository');
      setValidationResult(null);
    } finally {
      setValidatingRepo(false);
    }
  }, [repository]);

  const loadBranches = useCallback(async () => {
    if (!repository.trim()) return;

    setLoadingBranches(true);

    try {
      console.log('GitSelector: Loading branches for:', repository);
      const branchList = await api.getGitBranches(repository);
      console.log('GitSelector: Found branches:', branchList);

      setBranches(branchList);

      // Auto-select default branch if no branch is selected
      if (!branch && branchList.length > 0) {
        const defaultBranch = branchList.find(b => b.isDefault) || branchList[0];
        onBranchChange(defaultBranch.name);
      }
    } catch (error) {
      console.error('GitSelector: Error loading branches:', error);
      setBranches([{ name: 'main', isDefault: true }]); // Fallback
    } finally {
      setLoadingBranches(false);
    }
  }, [repository, branch, onBranchChange]);

  const searchBranches = useCallback(async (search: string) => {
    if (!repository.trim() || search.length < 1) return;

    try {
      console.log('GitSelector: Searching branches for:', search);
      const branchList = await api.getGitBranches(repository, search);
      console.log('GitSelector: Search results:', branchList);

      setSearchResults(branchList);
    } catch (error) {
      console.error('GitSelector: Error searching branches:', error);
      setSearchResults([]);
    }
  }, [repository]);

  const validateFile = useCallback(async () => {
    if (!path.trim() || !repository.trim() || !branch) return;

    setValidatingFile(true);
    setFileError(null);

    try {
      console.log('GitSelector: Validating file:', path, 'in', repository, 'branch', branch);
      const result = await api.validateGitFile(repository, path, branch);
      console.log('GitSelector: File validation result:', result);

      if (!result.valid) {
        setFileError(result.error || 'File validation failed');
      } else if (result.fileExists === false) {
        // Only show "File not found" if we explicitly checked and it doesn't exist
        setFileError(result.error || 'File not found');
      } else if (result.error) {
        // Show any validation warnings/notes
        setFileError(result.error);
      }
    } catch (error) {
      console.error('GitSelector: File validation error:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to validate file');
    } finally {
      setValidatingFile(false);
    }
  }, [path, repository, branch]);

  // Debounced repository validation
  useEffect(() => {
    if (!repository.trim() || disabled) {
      setValidationResult(null);
      setBranches([]);
      setRepoError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await validateRepository();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [repository, disabled, validateRepository]);

  // Load branches when repository validation succeeds
  useEffect(() => {
    if (validationResult?.valid && validationResult?.accessible) {
      loadBranches();
    }
  }, [validationResult, loadBranches]);

  // Validate file when path or branch changes
  useEffect(() => {
    if (!path.trim() || !repository.trim() || !validationResult?.valid) {
      setFileError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await validateFile();
    }, 1500); // 1.5 second debounce for file validation

    return () => clearTimeout(timeoutId);
  }, [path, branch, repository, validationResult, validateFile]);

  // Debounced branch search
  useEffect(() => {
    if (!repository.trim() || !validationResult?.valid) {
      setSearchResults([]);
      return;
    }

    if (searchTerm.length >= 1) {
      const timeoutId = setTimeout(async () => {
        await searchBranches(searchTerm);
      }, 300); // 300ms debounce for search

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, repository, validationResult, searchBranches]);

  const getRepoValidationIcon = () => {
    if (validatingRepo) {
      return <CircularProgress size={20} />;
    }
    if (repoError) {
      return <ErrorIcon color="error" />;
    }
    if (validationResult?.valid) {
      return <CheckCircleIcon color="success" />;
    }
    return null;
  };

  const getFileValidationIcon = () => {
    if (validatingFile) {
      return <CircularProgress size={20} />;
    }
    if (fileError) {
      return <ErrorIcon color="error" />;
    }
    if (path.trim() && !fileError && validationResult?.valid) {
      return <CheckCircleIcon color="success" />;
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GitIcon />
        Git Repository Source
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Specify the Git repository and file path that contains the registry data in ToolHive format.
      </Typography>

      {/* Repository URL */}
      <TextField
        fullWidth
        label="Repository URL"
        value={repository}
        onChange={(e) => onRepositoryChange(e.target.value)}
        disabled={disabled}
        error={!!repoError}
        helperText={repoError || 'HTTPS URL to Git repository (GitHub, GitLab, Bitbucket)'}
        placeholder="https://github.com/user/repository.git"
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: getRepoValidationIcon(),
        }}
      />

      {/* Repository Validation Status */}
      {validationResult && (
        <Alert
          severity={validationResult.valid ? 'success' : 'error'}
          sx={{ mb: 2 }}
        >
          {validationResult.valid
            ? `Repository is accessible and valid`
            : `Repository validation failed: ${validationResult.error}`
          }
        </Alert>
      )}

      {/* Branch Selection */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Autocomplete
          fullWidth
          value={branch || null}
          onChange={(_, newValue) => {
            if (newValue) {
              onBranchChange(newValue);
              setSearchTerm(''); // Clear search when selecting
            }
          }}
          inputValue={branch || ''}
          onInputChange={(_, newInputValue) => {
            // Update search term for filtering
            setSearchTerm(newInputValue);
            // Allow manual typing of branch names
            onBranchChange(newInputValue);
          }}
          options={
            searchTerm.length >= 1 && searchResults.length > 0
              ? searchResults.map(b => b.name)
              : branches.map(b => b.name)
          }
          getOptionLabel={(option) => option}
          renderOption={(props, option) => {
            const allBranches = searchTerm.length >= 1 && searchResults.length > 0 ? searchResults : branches;
            const branchInfo = allBranches.find(b => b.name === option);
            return (
              <Box component="li" {...props}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography>{option}</Typography>
                  {branchInfo?.isDefault && (
                    <Chip label="default" size="small" color="primary" variant="outlined" />
                  )}
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Branch"
              placeholder="Type to search or enter branch name (3+ chars to search)"
              disabled={disabled || !validationResult?.valid}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingBranches && <CircularProgress size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          freeSolo
          clearOnBlur={false}
          selectOnFocus
          handleHomeEndKeys
          disabled={disabled || !validationResult?.valid}
          noOptionsText={
            searchTerm.length >= 1
              ? "Type any branch name or select from common branches"
              : "Type to search common branch names or enter any branch name"
          }
        />

        <Tooltip title="Refresh branches">
          <IconButton
            onClick={loadBranches}
            disabled={disabled || !validationResult?.valid || loadingBranches}
            sx={{ mt: 1 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search Information */}
      {searchTerm.length >= 1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Type any branch name. Common branches are suggested, but you can enter any valid branch name.
          </Typography>
        </Alert>
      )}

      {/* Recent Branches Quick Selection */}
      {branches.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Recent branches:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {branches.slice(0, 6).map((branchInfo) => {
              const getRelativeTime = (dateString?: string) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                if (diffDays > 7) return '';
                if (diffDays > 0) return `${diffDays}d ago`;
                if (diffHours > 0) return `${diffHours}h ago`;
                return 'recent';
              };

              const relativeTime = getRelativeTime(branchInfo.lastCommitDate);

              return (
                <Chip
                  key={branchInfo.name}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{branchInfo.name}</span>
                      {relativeTime && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ({relativeTime})
                        </Typography>
                      )}
                    </Box>
                  }
                  onClick={() => onBranchChange(branchInfo.name)}
                  variant={branch === branchInfo.name ? 'filled' : 'outlined'}
                  color={branchInfo.isDefault ? 'primary' : 'default'}
                  size="small"
                  icon={branchInfo.isDefault ? <CheckCircleIcon fontSize="small" /> : undefined}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* File Path */}
      <TextField
        fullWidth
        label="File Path"
        value={path}
        onChange={(e) => onPathChange(e.target.value)}
        disabled={disabled || !validationResult?.valid}
        error={!!fileError}
        helperText={fileError || 'Path to the registry file (e.g., registry.json, data/servers.json)'}
        placeholder="registry.json"
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: getFileValidationIcon(),
        }}
      />

      {/* File Validation Status */}
      {fileError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {fileError}
        </Alert>
      )}

      {/* Success Summary */}
      {validationResult?.valid && branch && path && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: fileError ? 'warning.50' : 'success.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: fileError ? 'warning.200' : 'success.200'
          }}
        >
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon
              fontSize="small"
              color={fileError ? 'warning' : 'success'}
            />
            <strong>
              {fileError
                ? 'Git Source Configured (see warning above):'
                : 'Git Source Ready:'
              }
            </strong> {repository}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Branch: {branch} • File: {path}
            {fileError && ' • File validation will occur during sync'}
          </Typography>
        </Box>
      )}

      {/* Help Information */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Supported Git Hosting Services
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • GitHub (github.com) • GitLab (gitlab.com) • Bitbucket (bitbucket.org)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The repository must be publicly accessible via HTTPS. Private repositories are not currently supported.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Note:</strong> Repository accessibility and file existence will be verified during the first sync after registry creation.
        </Typography>
      </Box>
    </Box>
  );
};