import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

const POSLayout = () => {
  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Outlet />
    </Box>
  );
};

export default POSLayout;
