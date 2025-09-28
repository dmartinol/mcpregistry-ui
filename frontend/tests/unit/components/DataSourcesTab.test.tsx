import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataSourcesTab } from '../../../src/components/CreateRegistryTabs/DataSourcesTab';

// Mock API calls
jest.mock('../../../src/services/api', () => ({
  getConfigMaps: jest.fn(),
  getConfigMapKeys: jest.fn(),
  validateGitRepository: jest.fn(),
  getGitBranches: jest.fn(),
  validateGitFile: jest.fn(),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DataSourcesTab', () => {
  const mockFormData = {
    name: 'test-registry',
    displayName: 'Test Registry',
    namespace: 'test-namespace',
    enforceServers: false,
    source: {
      type: 'configmap' as const,
      format: 'toolhive' as const,
      configmap: {
        name: '',
        key: '',
      },
    },
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API mocks
    const { getConfigMaps, getConfigMapKeys } = require('../../../src/services/api');
    getConfigMaps.mockResolvedValue([]);
    getConfigMapKeys.mockResolvedValue({ keys: [] });
  });

  it('should render source type selection', () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByLabelText(/ConfigMap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Git Repository/i)).toBeInTheDocument();
  });

  it('should have ConfigMap selected by default', () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const configMapRadio = screen.getByLabelText(/ConfigMap/i);
    expect(configMapRadio).toBeChecked();
  });

  it('should switch to Git source when selected', async () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const gitRadio = screen.getByLabelText(/Git Repository/i);
    fireEvent.click(gitRadio);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        source: {
          type: 'git',
          format: 'toolhive',
          git: {
            repository: '',
            branch: '',
            path: '',
          },
        },
      });
    });
  });

  it('should display ConfigMap section when ConfigMap is selected', () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByText('ConfigMap Data Source')).toBeInTheDocument();
    expect(screen.getByLabelText(/ConfigMap Name/i)).toBeInTheDocument();
  });

  it('should display Git section when Git is selected', () => {
    const gitFormData = {
      ...mockFormData,
      source: {
        type: 'git' as const,
        format: 'toolhive' as const,
        git: {
          repository: '',
          branch: '',
          path: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={gitFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByText('Git Repository Source')).toBeInTheDocument();
    expect(screen.getByLabelText(/Repository URL/i)).toBeInTheDocument();
  });

  it('should load ConfigMaps when component mounts', async () => {
    const { getConfigMaps } = require('../../../src/services/api');
    const mockConfigMaps = [
      { name: 'config1', namespace: 'test-namespace', keys: ['data.json'] },
      { name: 'config2', namespace: 'test-namespace', keys: ['registry.json'] },
    ];
    getConfigMaps.mockResolvedValue(mockConfigMaps);

    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    await waitFor(() => {
      expect(getConfigMaps).toHaveBeenCalledWith('test-namespace');
    });
  });

  it('should update ConfigMap name when selected', async () => {
    const { getConfigMaps, getConfigMapKeys } = require('../../../src/services/api');
    const mockConfigMaps = [
      { name: 'test-config', namespace: 'test-namespace', keys: ['data.json'] },
    ];
    getConfigMaps.mockResolvedValue(mockConfigMaps);
    getConfigMapKeys.mockResolvedValue({ keys: ['data.json', 'registry.json'] });

    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test-config')).toBeInTheDocument();
    });

    const configMapSelect = screen.getByLabelText(/ConfigMap Name/i);
    fireEvent.click(configMapSelect);

    const configMapOption = screen.getByText('test-config');
    fireEvent.click(configMapOption);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        source: {
          ...mockFormData.source,
          configmap: {
            name: 'test-config',
            key: '',
          },
        },
      });
    });
  });

  it('should load ConfigMap keys when ConfigMap is selected', async () => {
    const { getConfigMaps, getConfigMapKeys } = require('../../../src/services/api');
    getConfigMaps.mockResolvedValue([
      { name: 'test-config', namespace: 'test-namespace', keys: [] },
    ]);
    getConfigMapKeys.mockResolvedValue({ keys: ['data.json', 'registry.json'] });

    const formDataWithConfigMap = {
      ...mockFormData,
      source: {
        ...mockFormData.source,
        configmap: {
          name: 'test-config',
          key: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={formDataWithConfigMap}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    await waitFor(() => {
      expect(getConfigMapKeys).toHaveBeenCalledWith('test-namespace', 'test-config');
    });
  });

  it('should handle ConfigMap loading errors gracefully', async () => {
    const { getConfigMaps } = require('../../../src/services/api');
    getConfigMaps.mockRejectedValue(new Error('Failed to load ConfigMaps'));

    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load ConfigMaps/i)).toBeInTheDocument();
    });
  });

  it('should validate Git repository URL', async () => {
    const { validateGitRepository } = require('../../../src/services/api');
    validateGitRepository.mockResolvedValue({ valid: false, error: 'Invalid URL' });

    const gitFormData = {
      ...mockFormData,
      source: {
        type: 'git' as const,
        format: 'toolhive' as const,
        git: {
          repository: 'invalid-url',
          branch: '',
          path: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={gitFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    await waitFor(() => {
      expect(validateGitRepository).toHaveBeenCalledWith('invalid-url');
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid URL/i)).toBeInTheDocument();
    });
  });

  it('should update Git repository URL when typed', async () => {
    const gitFormData = {
      ...mockFormData,
      source: {
        type: 'git' as const,
        format: 'toolhive' as const,
        git: {
          repository: '',
          branch: '',
          path: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={gitFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const repoInput = screen.getByLabelText(/Repository URL/i);
    fireEvent.change(repoInput, { target: { value: 'https://github.com/user/repo.git' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        source: {
          ...gitFormData.source,
          git: {
            ...gitFormData.source.git,
            repository: 'https://github.com/user/repo.git',
          },
        },
      });
    });
  });

  it('should update Git branch when typed', async () => {
    const gitFormData = {
      ...mockFormData,
      source: {
        type: 'git' as const,
        format: 'toolhive' as const,
        git: {
          repository: 'https://github.com/user/repo.git',
          branch: '',
          path: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={gitFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const branchInput = screen.getByLabelText(/Branch/i);
    fireEvent.change(branchInput, { target: { value: 'main' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        source: {
          ...gitFormData.source,
          git: {
            ...gitFormData.source.git,
            branch: 'main',
          },
        },
      });
    });
  });

  it('should update Git file path when typed', async () => {
    const gitFormData = {
      ...mockFormData,
      source: {
        type: 'git' as const,
        format: 'toolhive' as const,
        git: {
          repository: 'https://github.com/user/repo.git',
          branch: 'main',
          path: '',
        },
      },
    };

    renderWithTheme(
      <DataSourcesTab
        formData={gitFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const pathInput = screen.getByLabelText(/File Path/i);
    fireEvent.change(pathInput, { target: { value: 'registry.json' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        source: {
          ...gitFormData.source,
          git: {
            ...gitFormData.source.git,
            path: 'registry.json',
          },
        },
      });
    });
  });

  it('should display helpful information and examples', () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByText(/Configure the data source/i)).toBeInTheDocument();
    expect(screen.getByText(/Kubernetes ConfigMap/i)).toBeInTheDocument();
    expect(screen.getByText(/Git repository/i)).toBeInTheDocument();
  });

  it('should have accessible form structure', () => {
    renderWithTheme(
      <DataSourcesTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const configMapRadio = screen.getByLabelText(/ConfigMap/i);
    const gitRadio = screen.getByLabelText(/Git Repository/i);

    expect(configMapRadio).toHaveAttribute('type', 'radio');
    expect(gitRadio).toHaveAttribute('type', 'radio');
    expect(configMapRadio).toHaveAttribute('name');
    expect(gitRadio).toHaveAttribute('name');
  });
});