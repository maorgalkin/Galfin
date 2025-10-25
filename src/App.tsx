import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import BudgetSettings from './components/BudgetSettings';
import FamilyMembersModal from './components/FamilyMembersModal';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { Plus, Settings, LogOut, Loader2 } from 'lucide-react';
import './App.css';
import OlderTransactions from './pages/OlderTransactions';

// Protected Route Component - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
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
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);
  const [isFamilyMembersOpen, setIsFamilyMembersOpen] = useState(false);
  const { setBudgetConfig, familyMembers } = useFinance();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Galfin</h1>
              <span className="hidden sm:inline ml-2 text-sm text-gray-500">Family Finance Tracker</span>
              {user && (
                <span className="hidden md:inline ml-4 text-xs text-gray-400">
                  {user.email}
                </span>
              )}
            </div>
            
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
                onClick={() => setIsBudgetSettingsOpen(true)}
                className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium min-h-[38px]"
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="ml-2 max-md:hidden">Personalize Budget</span>
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
      <main className="px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/older-transactions" element={<OlderTransactions />} />
        </Routes>
      </main>
      <AddTransaction
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
      />
      <BudgetSettings
        isOpen={isBudgetSettingsOpen}
        onClose={() => setIsBudgetSettingsOpen(false)}
        onSave={setBudgetConfig}
        onOpenFamilyMembers={() => {
          setIsBudgetSettingsOpen(false);
          setIsFamilyMembersOpen(true);
        }}
        familyMembersCount={familyMembers.length}
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
  );
}

export default App;
