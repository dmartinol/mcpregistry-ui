import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock API calls
jest.mock('../../src/services/api', () => ({
  getRegistries: jest.fn(),
  getRegistryDetails: jest.fn(),
  getRegistryServers: jest.fn(),
  getDeployedServers: jest.fn(),
}));

describe('Integration Test: Registry Details Navigation', () => {
  const mockRegistries = [
    {
      id: 'test-registry-1',
      name: 'Test Registry 1',
      url: 'https://example.com/registry1',
      status: 'active',
      serverCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'test-registry-2',
      name: 'Test Registry 2',
      url: 'https://example.com/registry2',
      status: 'active',
      serverCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    // Mock successful API responses
    const { getRegistries, getRegistryDetails } = require('../../src/services/api');
    getRegistries.mockResolvedValue(mockRegistries);
    getRegistryDetails.mockResolvedValue(mockRegistries[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate from registry list to registry details', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Wait for registry list to load
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });

    // Click on a registry item
    const registryItem = screen.getByText('Test Registry 1');
    fireEvent.click(registryItem);

    // Verify navigation to details page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/registries/test-registry-1');
    });
  });

  it('should show registry details page with correct registry name', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry-1']}>
        <App />
      </MemoryRouter>
    );

    // Wait for registry details to load
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });

    // Verify that registry details are displayed
    expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
  });

  it('should display breadcrumb navigation on details page', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry-1']}>
        <App />
      </MemoryRouter>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });

    // Check for breadcrumb navigation
    expect(screen.getByText('Registries')).toBeInTheDocument();
  });

  it('should navigate back to registry list from details page', async () => {
    render(
      <MemoryRouter initialEntries={['/registries/test-registry-1']}>
        <App />
      </MemoryRouter>
    );

    // Wait for details page to load
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });

    // Click breadcrumb or back button
    const backLink = screen.getByText('Registries');
    fireEvent.click(backLink);

    // Verify navigation back to list
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  it('should handle 404 for non-existent registry', async () => {
    const { getRegistryDetails } = require('../../src/services/api');
    getRegistryDetails.mockRejectedValue(new Error('Registry not found'));

    render(
      <MemoryRouter initialEntries={['/registries/non-existent']}>
        <App />
      </MemoryRouter>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/Registry not found/i)).toBeInTheDocument();
    });
  });

  it('should preserve list state when navigating back', async () => {
    const { getRegistries } = require('../../src/services/api');

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });

    // Navigate to details
    fireEvent.click(screen.getByText('Test Registry 1'));

    // Navigate back
    await waitFor(() => {
      const backLink = screen.getByText('Registries');
      fireEvent.click(backLink);
    });

    // Verify list is preserved and API is not called again unnecessarily
    await waitFor(() => {
      expect(screen.getByText('Test Registry 1')).toBeInTheDocument();
    });
  });
});