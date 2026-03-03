import { createTheme, alpha, responsiveFontSizes } from '@mui/material/styles';

// Painted Canyon Pastries brand palette
const brand = {
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

// Night (dark) mode palette overrides
const darkPalette = {
  background: {
    default: '#1a1412',
    paper: '#241e1a',
  },
  text: {
    primary: '#f0e8df',
    secondary: '#c5b9ab',
  },
  divider: 'rgba(196,149,106,0.18)',
  sandstone: {
    ...brand.sandstone,
    50: '#1e1915',
    100: '#2a2320',
    200: '#3a312b',
    300: '#4a3f37',
  },
};

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';

  const palette = {
    mode,
    primary: {
      main: brand.clay.main,
      light: brand.clay.light,
      dark: brand.clay.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: isDark ? '#d7ccc8' : brand.espresso.main,
      light: isDark ? '#efebe9' : brand.espresso.light,
      dark: isDark ? '#a1887f' : brand.espresso.dark,
      contrastText: isDark ? '#1a1412' : '#ffffff',
    },
    background: isDark ? darkPalette.background : { default: brand.cream.main, paper: '#ffffff' },
    text: isDark ? darkPalette.text : { primary: brand.espresso.main, secondary: brand.sandstone[800] },
    success: { main: brand.sage.main, light: brand.sage.light, dark: brand.sage.dark },
    error: { main: '#c62828', light: '#ef5350' },
    warning: { main: '#e65100', light: '#ff9800' },
    divider: isDark ? darkPalette.divider : brand.sandstone[200],
    sandstone: isDark ? darkPalette.sandstone : brand.sandstone,
  };

  const theme = createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      h1: {
        fontFamily: '"Playfair Display", Georgia, serif',
        fontWeight: 700,
        fontSize: '3rem',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontFamily: '"Playfair Display", Georgia, serif',
        fontWeight: 600,
        fontSize: '2.25rem',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontFamily: '"Playfair Display", Georgia, serif',
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.3,
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
      subtitle1: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.6 },
      subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
      body1: { fontSize: '1rem', lineHeight: 1.7 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      button: {
        fontFamily: '"DM Sans", "Inter", sans-serif',
        fontWeight: 600,
        fontSize: '0.875rem',
        letterSpacing: '0.04em',
        textTransform: 'none',
      },
      caption: { fontSize: '0.75rem' },
      overline: {
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: brand.clay.main,
      },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(62,39,35,0.04)',
      isDark ? '0 2px 6px rgba(0,0,0,0.25)' : '0 2px 6px rgba(62,39,35,0.06)',
      isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(62,39,35,0.08)',
      isDark ? '0 6px 16px rgba(0,0,0,0.3)' : '0 6px 16px rgba(62,39,35,0.10)',
      isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 8px 24px rgba(62,39,35,0.12)',
      isDark ? '0 12px 32px rgba(0,0,0,0.4)' : '0 12px 32px rgba(62,39,35,0.14)',
      isDark ? '0 16px 40px rgba(0,0,0,0.4)' : '0 16px 40px rgba(62,39,35,0.16)',
      isDark ? '0 20px 48px rgba(0,0,0,0.45)' : '0 20px 48px rgba(62,39,35,0.18)',
      ...Array(16).fill(isDark ? '0 24px 56px rgba(0,0,0,0.5)' : '0 24px 56px rgba(62,39,35,0.20)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollBehavior: 'smooth',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
          '::selection': { backgroundColor: alpha(brand.clay.main, 0.2) },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: '0.9rem',
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(196,149,106,0.3)' },
          },
          contained: {
            background: `linear-gradient(135deg, ${brand.clay.main} 0%, ${brand.clay.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.clay.dark} 0%, ${brand.sandstone[800]} 100%)`,
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(196,149,106,0.35)' : brand.sandstone[300],
            '&:hover': {
              borderColor: brand.clay.main,
              backgroundColor: alpha(brand.clay.main, isDark ? 0.1 : 0.04),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(62,39,35,0.06)',
            border: `1px solid ${isDark ? 'rgba(196,149,106,0.12)' : brand.sandstone[100]}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(62,39,35,0.12)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500, fontSize: '0.75rem' } },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '&:hover fieldset': { borderColor: brand.sandstone[400] },
              '&.Mui-focused fieldset': { borderColor: brand.clay.main },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: 16, backgroundImage: 'none' } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(62,39,35,0.06)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${isDark ? 'rgba(196,149,106,0.12)' : brand.sandstone[100]}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 20, backgroundImage: 'none' } },
      },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 600 } },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: { backgroundColor: isDark ? 'rgba(196,149,106,0.08)' : brand.sandstone[100] },
        },
      },
      MuiBadge: {
        styleOverrides: { badge: { fontWeight: 600 } },
      },
    },
  });

  return responsiveFontSizes(theme);
}

// Default export for backward compatibility
export default createAppTheme('light');
