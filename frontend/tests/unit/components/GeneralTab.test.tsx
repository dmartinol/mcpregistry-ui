import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { GeneralTab } from '../../../src/components/CreateRegistryTabs/GeneralTab';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('GeneralTab', () => {
  const mockFormData = {
    name: '',
    displayName: '',
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

  it('should render all required fields', () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByLabelText(/Registry Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Namespace/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enforce Servers/i)).toBeInTheDocument();
  });

  it('should display current namespace as readonly', () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const namespaceInput = screen.getByDisplayValue('test-namespace');
    expect(namespaceInput).toBeInTheDocument();
    expect(namespaceInput).toBeDisabled();
  });

  it('should update registry name when typed', async () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.change(nameInput, { target: { value: 'my-registry' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        name: 'my-registry',
      });
    });
  });

  it('should update display name when typed', async () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const displayNameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(displayNameInput, { target: { value: 'My Registry' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        displayName: 'My Registry',
      });
    });
  });

  it('should toggle enforce servers checkbox', async () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const enforceCheckbox = screen.getByLabelText(/Enforce Servers/i);
    fireEvent.click(enforceCheckbox);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        enforceServers: true,
      });
    });
  });

  it('should validate registry name format', async () => {
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, name: 'Invalid-Name-With-Caps' }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/must be lowercase/i)).toBeInTheDocument();
    });
  });

  it('should validate registry name length', async () => {
    const longName = 'a'.repeat(64); // Exceeds 63 character limit
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, name: longName }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/must not exceed 63 characters/i)).toBeInTheDocument();
    });
  });

  it('should show error for invalid characters in registry name', async () => {
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, name: 'registry_with_underscores' }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/alphanumeric with hyphens/i)).toBeInTheDocument();
    });
  });

  it('should accept valid registry names', async () => {
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, name: 'valid-registry-name' }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.queryByText(/must be lowercase/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/alphanumeric with hyphens/i)).not.toBeInTheDocument();
    });
  });

  it('should show required field validation for empty name', async () => {
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, name: '' }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const nameInput = screen.getByLabelText(/Registry Name/i);
    fireEvent.focus(nameInput);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should show required field validation for empty display name', async () => {
    renderWithTheme(
      <GeneralTab
        formData={{ ...mockFormData, displayName: '' }}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    const displayNameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.focus(displayNameInput);
    fireEvent.blur(displayNameInput);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should pre-populate fields with existing form data', () => {
    const existingData = {
      ...mockFormData,
      name: 'existing-registry',
      displayName: 'Existing Registry',
      enforceServers: true,
    };

    renderWithTheme(
      <GeneralTab
        formData={existingData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByDisplayValue('existing-registry')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Registry')).toBeInTheDocument();
    expect(screen.getByLabelText(/Enforce Servers/i)).toBeChecked();
  });

  it('should display helpful text and tooltips', () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    expect(screen.getByText(/Basic registry configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Must follow Kubernetes naming conventions/i)).toBeInTheDocument();
    expect(screen.getByText(/User-friendly name for the registry/i)).toBeInTheDocument();
  });

  it('should have accessible form labels and structure', () => {
    renderWithTheme(
      <GeneralTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
        currentNamespace="test-namespace"
      />
    );

    // Check that all form inputs have proper labels
    const nameInput = screen.getByLabelText(/Registry Name/i);
    const displayNameInput = screen.getByLabelText(/Display Name/i);
    const namespaceInput = screen.getByLabelText(/Namespace/i);
    const enforceCheckbox = screen.getByLabelText(/Enforce Servers/i);

    expect(nameInput).toHaveAttribute('id');
    expect(displayNameInput).toHaveAttribute('id');
    expect(namespaceInput).toHaveAttribute('id');
    expect(enforceCheckbox).toHaveAttribute('id');
  });
});