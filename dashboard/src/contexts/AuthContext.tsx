import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/client';
import type { User, Plan } from '../types';

interface AuthContextType {
  user: User | null;
  plan: Plan | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires_totp?: boolean; pending_token?: string }>;
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('n2f_token');
    if (!token) {
      setUser(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    const response = await authApi.me();
    if (response.success && response.data) {
      setUser(response.data.user);
      setPlan(response.data.plan);
    } else {
      localStorage.removeItem('n2f_token');
      setUser(null);
      setPlan(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (response.success && response.data) {
      if (response.data.requires_totp) {
        return {
          success: false,
          requires_totp: true,
          pending_token: response.data.token,
        };
      }
      localStorage.setItem('n2f_token', response.data.token);
      setUser(response.data.user);
      await refreshUser(); // Get plan info
      return { success: true };
    }
    return { success: false, error: response.error?.message || 'Login failed' };
  };

  const loginWithToken = async (token: string) => {
    localStorage.setItem('n2f_token', token);
    const response = await authApi.me();
    if (response.success && response.data) {
      setUser(response.data.user);
      setPlan(response.data.plan);
      return { success: true };
    }
    localStorage.removeItem('n2f_token');
    return { success: false, error: 'Invalid token' };
  };

  const register = async (email: string, password: string) => {
    const response = await authApi.register(email, password);
    if (response.success && response.data) {
      localStorage.setItem('n2f_token', response.data.token);
      setUser(response.data.user);
      await refreshUser(); // Get plan info
      return { success: true };
    }
    return { success: false, error: response.error?.message || 'Registration failed' };
  };

  const logout = () => {
    localStorage.removeItem('n2f_token');
    setUser(null);
    setPlan(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        loading,
        isAdmin: user?.is_admin === 1,
        login,
        loginWithToken,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
