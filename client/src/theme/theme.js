import { createTheme, alpha } from '@mui/material/styles';

// Painted Canyon Pastries brand palette
const palette = {
  // Desert canyon colors
  sandstone: {
    50: '#faf7f2',
    100: '#f5efe5',
    200: '#ebe0cc',
    300: '#dccaaa',
    400: '#c4956a',
    500: '#b8845a',
    600: '#a67c52',
    700: '#8b6544',
    800: '#6d4c41',
    900: '#5d4037',
  },
  clay: {
    main: '#c4956a',
    light: '#d4a87e',
    dark: '#a67c52',
  },
  espresso: {
    main: '#3e2723',
    light: '#5d4037',
    dark: '#1b0f0e',
  },
  cream: {
    main: '#faf7f2',
    light: '#ffffff',
    dark: '#f5efe5',
  },
  sage: {
    main: '#7c8b6f',
    light: '#a3b093',
    dark: '#5a6b4d',
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.clay.main,
      light: palette.clay.light,
      dark: palette.clay.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.espresso.main,
      light: palette.espresso.light,
      dark: palette.espresso.dark,
      contrastText: '#ffffff',
    },
    background: {
      default: palette.cream.main,
      paper: '#ffffff',
    },
    text: {
      primary: palette.espresso.main,
      secondary: palette.sandstone[800],
    },
    success: {
      main: palette.sage.main,
      light: palette.sage.light,
      dark: palette.sage.dark,
    },
    error: {
      main: '#c62828',
      light: '#ef5350',
    },
    warning: {
      main: '#e65100',
      light: '#ff9800',
    },
    divider: palette.sandstone[200],
    sandstone: palette.sandstone,
  },
  typography: {
    fontFamily: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '3rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: palette.espresso.main,
    },
    h2: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 600,
      fontSize: '2.25rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: palette.espresso.main,
    },
    h3: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      color: palette.espresso.main,
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.6,
      color: palette.sandstone[800],
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: palette.sandstone[700],
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: palette.espresso.light,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: palette.sandstone[800],
    },
    button: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.04em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      color: palette.sandstone[700],
    },
    overline: {
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: palette.clay.main,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(62,39,35,0.04)',
    '0 2px 6px rgba(62,39,35,0.06)',
    '0 4px 12px rgba(62,39,35,0.08)',
    '0 6px 16px rgba(62,39,35,0.10)',
    '0 8px 24px rgba(62,39,35,0.12)',
    '0 12px 32px rgba(62,39,35,0.14)',
    '0 16px 40px rgba(62,39,35,0.16)',
    '0 20px 48px rgba(62,39,35,0.18)',
    ...Array(16).fill('0 24px 56px rgba(62,39,35,0.20)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.cream.main,
          scrollBehavior: 'smooth',
        },
        '::selection': {
          backgroundColor: alpha(palette.clay.main, 0.2),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.9rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(196,149,106,0.3)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${palette.clay.main} 0%, ${palette.clay.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${palette.clay.dark} 0%, ${palette.sandstone[800]} 100%)`,
          },
        },
        outlined: {
          borderColor: palette.sandstone[300],
          color: palette.espresso.main,
          '&:hover': {
            borderColor: palette.clay.main,
            backgroundColor: alpha(palette.clay.main, 0.04),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(62,39,35,0.06)',
          border: `1px solid ${palette.sandstone[100]}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(62,39,35,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        filled: {
          backgroundColor: palette.sandstone[100],
          color: palette.sandstone[800],
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: palette.sandstone[200],
            },
            '&:hover fieldset': {
              borderColor: palette.sandstone[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: palette.clay.main,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(62,39,35,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: palette.espresso.main,
          boxShadow: '0 1px 3px rgba(62,39,35,0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${palette.sandstone[100]}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: palette.sandstone[800],
          backgroundColor: palette.sandstone[50],
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: palette.sandstone[100],
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
