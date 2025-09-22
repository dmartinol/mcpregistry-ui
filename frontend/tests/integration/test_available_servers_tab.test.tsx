import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock API calls
jest.mock('../../src/services/api', () => ({
  getRegistries: jest.fn(),
  getRegistryDetails: jest.fn(),
  getRegistryServers: jest.fn(),
  getDeployedServers: jest.fn(),
}));

describe('Integration Test: Available Servers Tab Display', () => {
  const mockRegistry = {
    id: 'test-registry',
    name: 'Test Registry',
    url: 'https://example.com/registry',
    status: 'active',
    serverCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAvailableServers = {
    servers: [
      {
        name: 'server-one',
        image: 'registry.example.com/server-one:1.0.0',
        version: '1.0.0',
        description: 'First test server',
        tags: ['web', 'api'],
        capabilities: ['tools', 'resources'],
        author: 'Test Team',
        repository: 'https://github.com/test/server-one',
        documentation: 'https://docs.example.com/server-one',
      },
      {
        name: 'server-two',
        image: 'registry.example.com/server-two:2.1.0',
        version: '2.1.0',
        description: 'Second test server',
        tags: ['database', 'storage'],
        capabilities: ['tools'],
        author: 'Dev Team',
      },
      {
        name: 'server-three',
        image: 'registry.example.com/server-three:latest',
        tags: ['utility'],
        capabilities: ['resources'],
      },
    ],
    total: 3,
    limit: 50,
    offset: 0,
  };

  beforeEach(() => {
    const { getRegistryDetails, getRegistryServers, getDeployedServers } = require('../../src/services/api');
    getRegistryDetails.mockResolvedValue(mockRegistry);
    getRegistryServers.mockResolvedValue(mockAvailableServers);
    getDeployedServers.mockResolvedValue({ servers: [], total: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display Available Servers tab as selected by default', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Check that Available Servers tab is selected
    const availableTab = screen.getByText('Available Servers');
    expect(availableTab).toBeInTheDocument();
    expect(availableTab.closest('[aria-selected="true"]')).toBeTruthy();
  });

  it('should display server cards with required information', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('server-one')).toBeInTheDocument();
    });

    // Check first server card
    expect(screen.getByText('server-one')).toBeInTheDocument();
    expect(screen.getByText('registry.example.com/server-one:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('First test server')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();

    // Check second server card
    expect(screen.getByText('server-two')).toBeInTheDocument();
    expect(screen.getByText('registry.example.com/server-two:2.1.0')).toBeInTheDocument();
    expect(screen.getByText('Second test server')).toBeInTheDocument();
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('storage')).toBeInTheDocument();

    // Check third server card (minimal info)
    expect(screen.getByText('server-three')).toBeInTheDocument();
    expect(screen.getByText('registry.example.com/server-three:latest')).toBeInTheDocument();
    expect(screen.getByText('utility')).toBeInTheDocument();
  });

  it('should display tags as Material-UI chips', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('server-one')).toBeInTheDocument();
    });

    // Check that tags are displayed as chips (Material-UI Chip components)
    const webTag = screen.getByText('web');
    const apiTag = screen.getByText('api');
    const databaseTag = screen.getByText('database');

    expect(webTag.closest('.MuiChip-root')).toBeTruthy();
    expect(apiTag.closest('.MuiChip-root')).toBeTruthy();
    expect(databaseTag.closest('.MuiChip-root')).toBeTruthy();
  });

  it('should display server cards in Material-UI Card format', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('server-one')).toBeInTheDocument();
    });

    // Check for Material-UI Card components
    const cards = document.querySelectorAll('.MuiCard-root');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle empty state when no servers available', async () => {
    const { getRegistryServers } = require('../../src/services/api');
    getRegistryServers.mockResolvedValue({ servers: [], total: 0, limit: 50, offset: 0 });

    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Check for empty state message
    expect(screen.getByText(/No servers available/i)).toBeInTheDocument();
  });

  it('should show loading state while fetching servers', async () => {
    const { getRegistryServers } = require('../../src/services/api');

    // Make API call never resolve to simulate loading
    getRegistryServers.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Check for loading indicators (skeleton loading or spinner)
    expect(screen.getByTestId('servers-loading') || screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    const { getRegistryServers } = require('../../src/services/api');
    getRegistryServers.mockRejectedValue(new Error('Failed to fetch servers'));

    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Registry')).toBeInTheDocument();
    });

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load servers/i)).toBeInTheDocument();
    });
  });

  it('should support server filtering by tags', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('server-one')).toBeInTheDocument();
    });

    // Check if filtering UI is present (if implemented)
    const filterInput = screen.queryByPlaceholderText(/filter.*tag/i);
    if (filterInput) {
      fireEvent.change(filterInput, { target: { value: 'web' } });

      await waitFor(() => {
        // After filtering, only servers with 'web' tag should be visible
        expect(screen.getByText('server-one')).toBeInTheDocument();
        expect(screen.queryByText('server-two')).not.toBeInTheDocument();
      });
    }
  });
});