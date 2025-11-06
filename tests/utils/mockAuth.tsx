import { vi } from 'vitest';
import type { ReactNode } from 'react';

/**
 * Mock AuthContext for testing
 * Provides a logged-in user by default
 */

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User'
  }
};

// Mock AuthContext value
export const mockAuthContextValue = {
  user: mockUser,
  session: {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser
  },
  loading: false,
  signIn: vi.fn().mockResolvedValue({ data: { user: mockUser, session: null }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { user: mockUser, session: null }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
};

// Mock AuthContext not logged in
export const mockAuthContextValueLoggedOut = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn().mockResolvedValue({ data: { user: mockUser, session: null }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { user: mockUser, session: null }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
};

/**
 * Mock the AuthContext module
 * Call this before rendering components that use authentication
 */
export function mockAuthContext(loggedIn = true) {
  vi.mock('../../src/contexts/AuthContext', () => ({
    AuthProvider: ({ children }: { children: ReactNode }) => children,
    useAuth: () => loggedIn ? mockAuthContextValue : mockAuthContextValueLoggedOut,
  }));
}

/**
 * Reset auth mocks
 */
export function resetAuthMocks() {
  vi.clearAllMocks();
}
