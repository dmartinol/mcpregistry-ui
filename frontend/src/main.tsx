import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: '16px',
          '@media (max-width: 600px)': {
            margin: '0',
            borderRadius: '0',
            height: '100%',
            maxHeight: 'none',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '16px 24px',
            flex: 1,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            minHeight: '48px',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            minHeight: '48px',
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            minHeight: '48px',
            fontSize: '1rem',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            '& .MuiInputBase-root': {
              minHeight: '48px',
            },
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            '& .MuiInputBase-root': {
              minHeight: '48px',
            },
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);