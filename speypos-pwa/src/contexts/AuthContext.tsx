import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Staff, AuthState } from '@/types/pos';

interface AuthContextType extends AuthState {
  login: (staff: Staff) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'speypos_admin_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Restore from localStorage on init
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          isAuthenticated: true,
          staff: parsed.staff,
          isAdmin: parsed.staff?.role === 'admin',
        };
      }
    } catch {
      // Invalid stored data
    }
    return {
      isAuthenticated: false,
      staff: null,
      isAdmin: false,
    };
  });

  const login = (staff: Staff) => {
    const newState: AuthState = {
      isAuthenticated: true,
      staff,
      isAdmin: staff.role === 'admin',
    };
    setAuthState(newState);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ staff }));
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      staff: null,
      isAdmin: false,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
