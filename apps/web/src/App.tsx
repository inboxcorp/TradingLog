import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthGuard } from './components/AuthWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { TradingPage } from './pages/TradingPage';
import AnalyticsScreen from './pages/AnalyticsScreen';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AuthGuard>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<TradingPage />} />
                  <Route path="analytics" element={<AnalyticsScreen />} />
                </Route>
              </Routes>
            </AuthGuard>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;