import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import './styles/tokens.css';
import './index.css';
import './App.css';
import AppRouter from './router.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutes
      retry: 1,
    },
  },
});

const theme = createTheme({
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  primaryColor: 'violet',
  colors: {
    violet: [
      '#F3ECFF',
      '#EFE0FF',
      '#C6B1F5',
      '#A67EED',
      '#8B5CF6',
      '#7C3AED',
      '#5922C7',
      '#4A1BA8',
      '#3B1589',
      '#2D106A',
    ],
  },
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} forceColorScheme="light">
          <AppRouter />
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
