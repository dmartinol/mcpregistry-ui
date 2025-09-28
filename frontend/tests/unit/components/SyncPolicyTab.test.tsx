import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SyncPolicyTab } from '../../../src/components/CreateRegistryTabs/SyncPolicyTab';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SyncPolicyTab', () => {
  const mockFormData = {
    name: 'test-registry',
    displayName: 'Test Registry',
    namespace: 'test-namespace',
    enforceServers: false,
    source: {
      type: 'configmap' as const,
      format: 'toolhive' as const,
    },
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render sync policy toggle', () => {
    renderWithTheme(
      <SyncPolicyTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByLabelText(/Enable Automatic Sync/i)).toBeInTheDocument();
    expect(screen.getByText(/No automatic sync configured/i)).toBeInTheDocument();
  });

  it('should enable sync policy when toggle is switched', async () => {
    renderWithTheme(
      <SyncPolicyTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
      />
    );

    const syncToggle = screen.getByLabelText(/Enable Automatic Sync/i);
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: {
          interval: '30m',
        },
      });
    });
  });

  it('should display sync configuration when enabled', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Sync Interval Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sync Interval/i)).toBeInTheDocument();
  });

  it('should display preset interval buttons', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByText('6h')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
  });

  it('should update interval when preset button is clicked', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const presetButton = screen.getByText('1h');
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: {
          interval: '1h',
        },
      });
    });
  });

  it('should update interval when custom value is typed', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    fireEvent.change(intervalInput, { target: { value: '45m' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: {
          interval: '45m',
        },
      });
    });
  });

  it('should validate interval format', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: 'invalid',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    fireEvent.blur(intervalInput);

    await waitFor(() => {
      expect(screen.getByText(/Invalid interval format/i)).toBeInTheDocument();
    });
  });

  it('should accept valid interval formats', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '2h30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    fireEvent.blur(intervalInput);

    await waitFor(() => {
      expect(screen.queryByText(/Invalid interval format/i)).not.toBeInTheDocument();
    });
  });

  it('should highlight selected preset interval', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '1h',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const selectedButton = screen.getByText('1h');
    expect(selectedButton.closest('button')).toHaveClass('MuiButton-contained');
  });

  it('should disable sync policy when toggle is turned off', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const syncToggle = screen.getByLabelText(/Enable Automatic Sync/i);
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: undefined,
      });
    });
  });

  it('should display sync policy explanation', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/How often to sync/i)).toBeInTheDocument();
    expect(screen.getByText(/Sync Policy Information/i)).toBeInTheDocument();
  });

  it('should show minimum interval validation', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '5s',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    fireEvent.blur(intervalInput);

    await waitFor(() => {
      expect(screen.getByText(/minimum interval.*1m/i)).toBeInTheDocument();
    });
  });

  it('should handle seconds, minutes, and hours in intervals', async () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '90s',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    fireEvent.change(intervalInput, { target: { value: '5m' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: {
          interval: '5m',
        },
      });
    });
  });

  it('should display helpful examples in placeholder', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    expect(intervalInput).toHaveAttribute('placeholder');
    expect(intervalInput.getAttribute('placeholder')).toMatch(/30m.*1h.*2h30m/);
  });

  it('should provide comprehensive sync policy information', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/registry will automatically sync/i)).toBeInTheDocument();
    expect(screen.getByText(/supports.*seconds.*minutes.*hours/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum.*1 minute/i)).toBeInTheDocument();
  });

  it('should have accessible form structure', () => {
    const formDataWithSync = {
      ...mockFormData,
      syncPolicy: {
        interval: '30m',
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={formDataWithSync}
        onUpdate={mockOnUpdate}
      />
    );

    const toggle = screen.getByLabelText(/Enable Automatic Sync/i);
    expect(toggle).toHaveAttribute('type', 'checkbox');

    const intervalInput = screen.getByLabelText(/Sync Interval/i);
    expect(intervalInput).toHaveAttribute('id');
    expect(intervalInput).toHaveAttribute('type', 'text');
  });

  it('should preserve existing form data when updating sync policy', async () => {
    const complexFormData = {
      ...mockFormData,
      name: 'existing-registry',
      displayName: 'Existing Registry',
      filter: {
        names: { include: ['mcp-*'], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <SyncPolicyTab
        formData={complexFormData}
        onUpdate={mockOnUpdate}
      />
    );

    const syncToggle = screen.getByLabelText(/Enable Automatic Sync/i);
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        syncPolicy: {
          interval: '30m',
        },
      });
    });

    // Should not have called with other form data (only the update)
    expect(mockOnUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.any(String),
        displayName: expect.any(String),
        filter: expect.any(Object),
      })
    );
  });
});