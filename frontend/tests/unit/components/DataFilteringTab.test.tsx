import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataFilteringTab } from '../../../src/components/CreateRegistryTabs/DataFilteringTab';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DataFilteringTab', () => {
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

  it('should render the filtering toggle', () => {
    renderWithTheme(
      <DataFilteringTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByLabelText(/Enable Data Filtering/i)).toBeInTheDocument();
    expect(screen.getByText(/No filtering enabled/i)).toBeInTheDocument();
  });

  it('should enable filtering when toggle is switched', async () => {
    renderWithTheme(
      <DataFilteringTab
        formData={mockFormData}
        onUpdate={mockOnUpdate}
      />
    );

    const filterToggle = screen.getByLabelText(/Enable Data Filtering/i);
    fireEvent.click(filterToggle);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: [],
            exclude: [],
          },
          tags: {
            include: [],
            exclude: [],
          },
        },
      });
    });
  });

  it('should display filter sections when filtering is enabled', () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: {
          include: [],
          exclude: [],
        },
        tags: {
          include: [],
          exclude: [],
        },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Server Name Filters')).toBeInTheDocument();
    expect(screen.getByText('Tag Filters')).toBeInTheDocument();
    expect(screen.getByText('✓ Include Names')).toBeInTheDocument();
    expect(screen.getByText('✗ Exclude Names')).toBeInTheDocument();
    expect(screen.getByText('✓ Include Tags')).toBeInTheDocument();
    expect(screen.getByText('✗ Exclude Tags')).toBeInTheDocument();
  });

  it('should add name include filter when typed and added', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const includeInput = screen.getByLabelText(/Add include pattern/i);
    fireEvent.change(includeInput, { target: { value: 'mcp-*' } });

    const addButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('[data-testid="AddIcon"]')
    );
    if (addButton) {
      fireEvent.click(addButton);
    }

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: ['mcp-*'],
            exclude: [],
          },
          tags: {
            include: [],
            exclude: [],
          },
        },
      });
    });
  });

  it('should add name exclude filter when typed and added', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const excludeInput = screen.getByLabelText(/Add exclude pattern/i);
    fireEvent.change(excludeInput, { target: { value: '*-test' } });

    const addButtons = screen.getAllByRole('button');
    const excludeAddButton = addButtons.find(btn =>
      btn.closest('div')?.querySelector('input[placeholder*="test-"]')
    );
    if (excludeAddButton) {
      fireEvent.click(excludeAddButton);
    }

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: [],
            exclude: ['*-test'],
          },
          tags: {
            include: [],
            exclude: [],
          },
        },
      });
    });
  });

  it('should add tag include filter when typed and added', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const tagIncludeInput = screen.getByLabelText(/Add include tag/i);
    fireEvent.change(tagIncludeInput, { target: { value: 'database' } });

    const addButtons = screen.getAllByRole('button');
    const tagAddButton = addButtons.find(btn =>
      btn.closest('div')?.querySelector('input[placeholder*="database"]')
    );
    if (tagAddButton) {
      fireEvent.click(tagAddButton);
    }

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: [],
            exclude: [],
          },
          tags: {
            include: ['database'],
            exclude: [],
          },
        },
      });
    });
  });

  it('should add tag exclude filter when typed and added', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const tagExcludeInput = screen.getByLabelText(/Add exclude tag/i);
    fireEvent.change(tagExcludeInput, { target: { value: 'deprecated' } });

    const addButtons = screen.getAllByRole('button');
    const tagExcludeAddButton = addButtons.find(btn =>
      btn.closest('div')?.querySelector('input[placeholder*="deprecated"]')
    );
    if (tagExcludeAddButton) {
      fireEvent.click(tagExcludeAddButton);
    }

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: [],
            exclude: [],
          },
          tags: {
            include: [],
            exclude: ['deprecated'],
          },
        },
      });
    });
  });

  it('should display existing filters as chips', () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: {
          include: ['mcp-*', 'database-*'],
          exclude: ['*-test', '*-deprecated'],
        },
        tags: {
          include: ['database', 'web'],
          exclude: ['deprecated', 'experimental'],
        },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    // Check name filters
    expect(screen.getByText('mcp-*')).toBeInTheDocument();
    expect(screen.getByText('database-*')).toBeInTheDocument();
    expect(screen.getByText('*-test')).toBeInTheDocument();
    expect(screen.getByText('*-deprecated')).toBeInTheDocument();

    // Check tag filters
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('deprecated')).toBeInTheDocument();
    expect(screen.getByText('experimental')).toBeInTheDocument();
  });

  it('should remove filter when chip delete is clicked', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: {
          include: ['mcp-*'],
          exclude: [],
        },
        tags: {
          include: [],
          exclude: [],
        },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const chip = screen.getByText('mcp-*');
    const deleteButton = chip.closest('.MuiChip-root')?.querySelector('[data-testid="DeleteIcon"]');

    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: [],
            exclude: [],
          },
          tags: {
            include: [],
            exclude: [],
          },
        },
      });
    });
  });

  it('should support adding filters with Enter key', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const includeInput = screen.getByLabelText(/Add include pattern/i);
    fireEvent.change(includeInput, { target: { value: 'api-*' } });
    fireEvent.keyPress(includeInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: {
          names: {
            include: ['api-*'],
            exclude: [],
          },
          tags: {
            include: [],
            exclude: [],
          },
        },
      });
    });
  });

  it('should display filter logic explanation', () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Filter Logic')).toBeInTheDocument();
    expect(screen.getByText(/Name Filtering:/)).toBeInTheDocument();
    expect(screen.getByText(/Tag Filtering:/)).toBeInTheDocument();
    expect(screen.getByText(/Combined Logic:/)).toBeInTheDocument();
    expect(screen.getByText(/at least one.*include pattern/)).toBeInTheDocument();
    expect(screen.getByText(/not match any.*exclude pattern/)).toBeInTheDocument();
  });

  it('should disable filtering when toggle is turned off', async () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: ['mcp-*'], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const filterToggle = screen.getByLabelText(/Enable Data Filtering/i);
    fireEvent.click(filterToggle);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        filter: undefined,
      });
    });
  });

  it('should display helpful examples and placeholders', () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByPlaceholderText(/mcp-.*database-.*\*-tool/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/test-.*deprecated-.*\*-legacy/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/database.*ai.*web.*utility/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/deprecated.*experimental.*legacy/)).toBeInTheDocument();
  });

  it('should have accessible form structure', () => {
    const formDataWithFilters = {
      ...mockFormData,
      filter: {
        names: { include: [], exclude: [] },
        tags: { include: [], exclude: [] },
      },
    };

    renderWithTheme(
      <DataFilteringTab
        formData={formDataWithFilters}
        onUpdate={mockOnUpdate}
      />
    );

    const toggle = screen.getByLabelText(/Enable Data Filtering/i);
    expect(toggle).toHaveAttribute('type', 'checkbox');

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('id');
    });
  });
});