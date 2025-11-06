import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinanceProvider } from './context/FinanceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import FamilyMembersModal from './components/FamilyMembersModal';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { DevTools } from './pages/DevTools';
import { Plus, LogOut, Loader2 } from 'lucide-react';
import './App.css';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isFamilyMembersOpen, setIsFamilyMembersOpen] = useState(false);
  const { signOut, user } = useAuth();

  const textureStyle = {
    backgroundImage: `
      linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
  };

  return (
    <div 
      className="min-h-screen dark:bg-gray-900 transition-colors duration-500"
      style={textureStyle}
    >
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Galfin</h1>
              <span className="hidden sm:inline ml-2 text-sm text-gray-500 dark:text-gray-400">Family Finance Tracker</span>
              {user && (
                <span className="hidden md:inline ml-4 text-xs text-gray-400 dark:text-gray-500">
                  {user.email}
                </span>
              )}
            </Link>
            
            {/* Desktop & Mobile Buttons - Always visible */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsAddTransactionOpen(true)}
                className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium min-h-[38px]"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="ml-2 max-md:hidden">Add Transaction</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium min-h-[38px]"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span className="ml-2 max-md:hidden">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dev-tools" element={<DevTools />} />
        </Routes>
      </main>
      <AddTransaction
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
      />
      <FamilyMembersModal
        isOpen={isFamilyMembersOpen}
        onClose={() => setIsFamilyMembersOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <FinanceProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </FinanceProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
