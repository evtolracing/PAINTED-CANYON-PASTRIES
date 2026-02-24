import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarContext = createContext(null);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar must be used within SnackbarProvider');
  return context;
};

export const SnackbarProvider = ({ children }) => {
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnack((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={hideSnackbar} severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
