import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { api } from '../services/api';

const RegistryDashboard: React.FC = () => {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    console.log('Component mounted, calling API...');
    const loadData = async () => {
      try {
        const registries = await api.getRegistries();
        console.log('API response:', registries);
        setMessage(`Found ${registries.length} registries`);
      } catch (err) {
        console.error('API error:', err);
        setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    loadData();
  }, []);

  console.log('Rendering dashboard with message:', message);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Registry Management - Test
      </Typography>
      <Typography variant="body1">
        {message}
      </Typography>
    </Box>
  );
};

export default RegistryDashboard;