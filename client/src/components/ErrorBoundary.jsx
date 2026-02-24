import React from 'react';
import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
          <Container maxWidth="sm">
            <Paper elevation={2} sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
              <ErrorOutline sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                We're sorry for the inconvenience. Please try again or return to the homepage.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                  sx={{ borderRadius: 2 }}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Home />}
                  onClick={this.handleGoHome}
                  sx={{ borderRadius: 2 }}
                >
                  Go Home
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
