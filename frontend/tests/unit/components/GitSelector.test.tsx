import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { GitSelector } from '../../../src/components/CreateRegistryTabs/GitSelector';

// Mock API calls
jest.mock('../../../src/services/api', () => ({
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

describe('GitSelector', () => {
  const mockProps = {
    repository: '',
    branch: '',
    path: '',
    onRepositoryChange: jest.fn(),
    onBranchChange: jest.fn(),
    onPathChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API mocks
    const { validateGitRepository, getGitBranches, validateGitFile } = require('../../../src/services/api');
    validateGitRepository.mockResolvedValue({ valid: true, accessible: true });
    getGitBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
    ]);
    validateGitFile.mockResolvedValue({ valid: true, fileExists: true });
  });

  it('should render all form fields', () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    expect(screen.getByLabelText(/Repository URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Branch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/File Path/i)).toBeInTheDocument();
  });

  it('should display Git Repository Source heading', () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    expect(screen.getByText('Git Repository Source')).toBeInTheDocument();
  });

  it('should call onRepositoryChange when repository URL is typed', async () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    const repoInput = screen.getByLabelText(/Repository URL/i);
    fireEvent.change(repoInput, { target: { value: 'https://github.com/user/repo.git' } });

    expect(mockProps.onRepositoryChange).toHaveBeenCalledWith('https://github.com/user/repo.git');
  });

  it('should call onBranchChange when branch is typed', async () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    const branchInput = screen.getByLabelText(/Branch/i);
    fireEvent.change(branchInput, { target: { value: 'main' } });

    expect(mockProps.onBranchChange).toHaveBeenCalledWith('main');
  });

  it('should call onPathChange when file path is typed', async () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    const pathInput = screen.getByLabelText(/File Path/i);
    fireEvent.change(pathInput, { target: { value: 'registry.json' } });

    expect(mockProps.onPathChange).toHaveBeenCalledWith('registry.json');
  });

  it('should validate repository URL after typing', async () => {
    const { validateGitRepository } = require('../../../src/services/api');

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    await waitFor(() => {
      expect(validateGitRepository).toHaveBeenCalledWith('https://github.com/user/repo.git');
    }, { timeout: 2000 }); // Account for debounce
  });

  it('should display validation success for valid repository', async () => {
    const { validateGitRepository } = require('../../../src/services/api');
    validateGitRepository.mockResolvedValue({ valid: true, accessible: true });

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Repository is accessible and valid/i)).toBeInTheDocument();
    });
  });

  it('should display validation error for invalid repository', async () => {
    const { validateGitRepository } = require('../../../src/services/api');
    validateGitRepository.mockResolvedValue({ valid: false, error: 'Repository not found' });

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/invalid/repo.git"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Repository validation failed: Repository not found/i)).toBeInTheDocument();
    });
  });

  it('should load branches when repository is valid', async () => {
    const { getGitBranches } = require('../../../src/services/api');

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    await waitFor(() => {
      expect(getGitBranches).toHaveBeenCalledWith('https://github.com/user/repo.git');
    });
  });

  it('should display branch options when loaded', async () => {
    const { getGitBranches } = require('../../../src/services/api');
    getGitBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
      { name: 'feature-branch', isDefault: false },
    ]);

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    const branchInput = screen.getByLabelText(/Branch/i);
    fireEvent.click(branchInput);

    await waitFor(() => {
      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getByText('develop')).toBeInTheDocument();
      expect(screen.getByText('feature-branch')).toBeInTheDocument();
    });
  });

  it('should mark default branch in dropdown', async () => {
    const { getGitBranches } = require('../../../src/services/api');
    getGitBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
    ]);

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    const branchInput = screen.getByLabelText(/Branch/i);
    fireEvent.click(branchInput);

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument();
    });
  });

  it('should auto-select default branch when branches are loaded', async () => {
    const { getGitBranches } = require('../../../src/services/api');
    getGitBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
    ]);

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
        branch=""
      />
    );

    await waitFor(() => {
      expect(mockProps.onBranchChange).toHaveBeenCalledWith('main');
    });
  });

  it('should validate file path when complete URL is provided', async () => {
    const { validateGitFile } = require('../../../src/services/api');

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
        branch="main"
        path="registry.json"
      />
    );

    await waitFor(() => {
      expect(validateGitFile).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        'registry.json',
        'main'
      );
    }, { timeout: 2000 }); // Account for debounce
  });

  it('should display file validation error when file not found', async () => {
    const { validateGitFile } = require('../../../src/services/api');
    validateGitFile.mockResolvedValue({ valid: false, fileExists: false, error: 'File not found' });

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
        branch="main"
        path="nonexistent.json"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/File not found/i)).toBeInTheDocument();
    });
  });

  it('should show success summary when all fields are valid', async () => {
    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
        branch="main"
        path="registry.json"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Git Source Ready/i)).toBeInTheDocument();
      expect(screen.getByText('https://github.com/user/repo.git')).toBeInTheDocument();
      expect(screen.getByText(/Branch: main.*File: registry\.json/)).toBeInTheDocument();
    });
  });

  it('should disable form fields when disabled prop is true', () => {
    renderWithTheme(<GitSelector {...mockProps} disabled={true} />);

    expect(screen.getByLabelText(/Repository URL/i)).toBeDisabled();
    expect(screen.getByLabelText(/Branch/i)).toBeDisabled();
    expect(screen.getByLabelText(/File Path/i)).toBeDisabled();
  });

  it('should not validate when disabled', async () => {
    const { validateGitRepository } = require('../../../src/services/api');

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
        disabled={true}
      />
    );

    await waitFor(() => {
      expect(validateGitRepository).not.toHaveBeenCalled();
    });
  });

  it('should display validation loading indicators', async () => {
    const { validateGitRepository } = require('../../../src/services/api');
    validateGitRepository.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    await waitFor(() => {
      const loadingSpinner = document.querySelector('.MuiCircularProgress-root');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  it('should refresh branches when refresh button is clicked', async () => {
    const { getGitBranches } = require('../../../src/services/api');

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getGitBranches).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByTitle(/Refresh branches/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(getGitBranches).toHaveBeenCalledTimes(2);
    });
  });

  it('should display recent branches with relative time', async () => {
    const { getGitBranches } = require('../../../src/services/api');
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    getGitBranches.mockResolvedValue([
      { name: 'main', isDefault: true, lastCommitDate: recentDate },
      { name: 'develop', isDefault: false, lastCommitDate: recentDate },
    ]);

    renderWithTheme(
      <GitSelector
        {...mockProps}
        repository="https://github.com/user/repo.git"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/2h ago/)).toBeInTheDocument();
    });
  });

  it('should display help information about supported services', () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    expect(screen.getByText('Supported Git Hosting Services')).toBeInTheDocument();
    expect(screen.getByText(/GitHub.*GitLab.*Bitbucket/)).toBeInTheDocument();
    expect(screen.getByText(/publicly accessible via HTTPS/i)).toBeInTheDocument();
  });

  it('should display helpful placeholder text', () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    const repoInput = screen.getByLabelText(/Repository URL/i);
    expect(repoInput).toHaveAttribute('placeholder', 'https://github.com/user/repository.git');

    const pathInput = screen.getByLabelText(/File Path/i);
    expect(pathInput).toHaveAttribute('placeholder', 'registry.json');
  });

  it('should have accessible form structure', () => {
    renderWithTheme(<GitSelector {...mockProps} />);

    const repoInput = screen.getByLabelText(/Repository URL/i);
    const branchInput = screen.getByLabelText(/Branch/i);
    const pathInput = screen.getByLabelText(/File Path/i);

    expect(repoInput).toHaveAttribute('id');
    expect(branchInput).toHaveAttribute('id');
    expect(pathInput).toHaveAttribute('id');

    expect(repoInput).toHaveAttribute('type', 'text');
    expect(pathInput).toHaveAttribute('type', 'text');
  });
});