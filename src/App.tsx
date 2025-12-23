import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthProvider from './components/AuthProvider';
import LoginForm from './components/LoginForm';
import Header from './components/Header';
import EmployeeDashboard from './components/employee/EmployeeDashboardAPI';
import ManagerDashboard from './components/manager/ManagerDashboardAPI';
import ResetPasswordPage from './components/ResetPasswordPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Reset password page - public route */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      {!user ? (
        <>
          <Route path="/" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-gray-50 overflow-x-hidden" dir="rtl">
                <Header
                  onMobileMenuToggle={user.role === 'manager' ? () => setIsMobileMenuOpen(!isMobileMenuOpen) : undefined}
                />
                <main>
                  {user.role === 'manager' ? (
                    <ManagerDashboard
                      isMobileMenuOpen={isMobileMenuOpen}
                      onMobileMenuClose={() => setIsMobileMenuOpen(false)}
                    />
                  ) : (
                    <EmployeeDashboard />
                  )}
                </main>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;