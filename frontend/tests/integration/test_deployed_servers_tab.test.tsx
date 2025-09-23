import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock API calls
jest.mock('../../src/services/api', () => ({
  getRegistries: jest.fn(),
  getRegistryDetails: jest.fn(),
  getRegistryServers: jest.fn(),
  getDeployedServers: jest.fn(),
}));

describe('Integration Test: Deployed Servers Tab with Copy Functionality', () => {
  const mockRegistry = {
    id: 'test-registry',
    name: 'Test Registry',
    url: 'https://example.com/registry',
    status: 'active',
    serverCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockDeployedServers = {
    servers: [
      {
        id: 'deployed-server-1',
        name: 'server-one-instance',
        registryRef: 'test-registry',
        image: 'registry.example.com/server-one:1.0.0',
        version: '1.0.0',
        status: 'Running',
        endpoint: 'https://server-one.cluster.local:8080',
        createdAt: '2023-01-15T10:30:00Z',
        lastUpdated: '2023-01-15T11:00:00Z',
        namespace: 'toolhive-system',
        uid: '123e4567-e89b-12d3-a456-426614174000',
      },
      {
        id: 'deployed-server-2',
        name: 'server-two-instance',
        registryRef: 'test-registry',
        image: 'registry.example.com/server-two:2.1.0',
        version: '2.1.0',
        status: 'Pending',
        createdAt: '2023-01-15T11:30:00Z',
        lastUpdated: '2023-01-15T11:35:00Z',
        namespace: 'toolhive-system',
        uid: '456e7890-e89b-12d3-a456-426614174001',
      },
      {
        id: 'deployed-server-3',
        name: 'server-three-instance',
        registryRef: 'test-registry',
        image: 'registry.example.com/server-three:latest',
        status: 'Failed',
        endpoint: 'https://server-three.cluster.local:8080',
        createdAt: '2023-01-15T12:00:00Z',
        lastUpdated: '2023-01-15T12:15:00Z',
        namespace: 'toolhive-system',
        uid: '789e0123-e89b-12d3-a456-426614174002',
      },
    ],
    total: 3,
  };

  beforeEach(() => {
    const { getRegistryDetails, getRegistryServers, getDeployedServers } = require('../../src/services/api');
    getRegistryDetails.mockResolvedValue(mockRegistry);
    getRegistryServers.mockResolvedValue({ servers: [], total: 0, limit: 50, offset: 0 });
    getDeployedServers.mockResolvedValue(mockDeployedServers);

    // Reset clipboard mock
    navigator.clipboard.writeText.mockClear();
    navigator.clipboard.writeText.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should switch to Deployed Servers tab when clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Click on Deployed Servers tab
    const deployedTab = screen.getByText('Deployed Servers');
    fireEvent.click(deployedTab);

    // Check that tab is now selected
    await waitFor(() => {
      expect(deployedTab.closest('[aria-selected="true"]')).toBeTruthy();
    });
  });

  it('should display deployed server cards with required information', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Switch to Deployed Servers tab
    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('deployed-server-1')).toBeInTheDocument();
    });

    // Check first deployed server card
    expect(screen.getByText('deployed-server-1')).toBeInTheDocument();
    expect(screen.getByText('server-one-instance')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('https://server-one.cluster.local:8080')).toBeInTheDocument();

    // Check second deployed server card
    expect(screen.getByText('deployed-server-2')).toBeInTheDocument();
    expect(screen.getByText('server-two-instance')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Check third deployed server card
    expect(screen.getByText('deployed-server-3')).toBeInTheDocument();
    expect(screen.getByText('server-three-instance')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should display status indicators with appropriate styling', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Check status indicators have appropriate classes or colors
    const runningStatus = screen.getByText('Running');
    const pendingStatus = screen.getByText('Pending');
    const failedStatus = screen.getByText('Failed');

    expect(runningStatus.closest('.status-running, .MuiChip-colorSuccess')).toBeTruthy();
    expect(pendingStatus.closest('.status-pending, .MuiChip-colorWarning')).toBeTruthy();
    expect(failedStatus.closest('.status-failed, .MuiChip-colorError')).toBeTruthy();
  });

  it('should display copy buttons next to endpoint URLs', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('https://server-one.cluster.local:8080')).toBeInTheDocument();
    });

    // Check for copy buttons next to URLs
    const copyButtons = screen.getAllByLabelText(/copy/i);
    expect(copyButtons.length).toBeGreaterThanOrEqual(2); // At least for servers with endpoints
  });

  it('should copy URL to clipboard when copy button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('https://server-one.cluster.local:8080')).toBeInTheDocument();
    });

    // Find and click the copy button for the first server
    const copyButtons = screen.getAllByLabelText(/copy/i);
    fireEvent.click(copyButtons[0]);

    // Verify clipboard API was called
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://server-one.cluster.local:8080');
    });
  });

  it('should show toast notification after successful copy', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('https://server-one.cluster.local:8080')).toBeInTheDocument();
    });

    // Click copy button
    const copyButtons = screen.getAllByLabelText(/copy/i);
    fireEvent.click(copyButtons[0]);

    // Check for success toast/snackbar
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard/i) || screen.getByText(/url copied/i)).toBeInTheDocument();
    });
  });

  it('should handle copy failure gracefully', async () => {
    // Mock clipboard API to fail
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));

    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('https://server-one.cluster.local:8080')).toBeInTheDocument();
    });

    // Click copy button
    const copyButtons = screen.getAllByLabelText(/copy/i);
    fireEvent.click(copyButtons[0]);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to copy/i) || screen.getByText(/copy failed/i)).toBeInTheDocument();
    });
  });

  it('should handle empty state when no deployed servers exist', async () => {
    const { getDeployedServers } = require('../../src/services/api');
    getDeployedServers.mockResolvedValue({ servers: [], total: 0 });

    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    // Check for empty state message
    await waitFor(() => {
      expect(screen.getByText(/No deployed servers/i)).toBeInTheDocument();
    });
  });

  it('should support filtering by deployment status', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deployed Servers'));

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Check if status filtering UI is present (if implemented)
    const statusFilter = screen.queryByLabelText(/filter.*status/i);
    if (statusFilter) {
      fireEvent.change(statusFilter, { target: { value: 'Running' } });

      await waitFor(() => {
        // After filtering, only Running servers should be visible
        expect(screen.getByText('deployed-server-1')).toBeInTheDocument();
        expect(screen.queryByText('deployed-server-2')).not.toBeInTheDocument();
        expect(screen.queryByText('deployed-server-3')).not.toBeInTheDocument();
      });
    }
  });
});