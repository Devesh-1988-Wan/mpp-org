import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// A generic user type for your SQL Server authentication
interface AppUser {
  id: string;
  email: string;
  // Add any other user properties you need
}

// Define the type for the backend selection
type BackendType = 'supabase' | 'sqlserver';

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
  authBackend: BackendType;
  setAuthBackend: (backend: BackendType) => void;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Get the initial backend type from environment variables as a default
const initialBackend = (import.meta.env.VITE_BACKEND_TYPE as BackendType) || 'sqlserver';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // State to manage the selected backend, defaulting to the env variable
  const [authBackend, setAuthBackend] = useState<BackendType>(initialBackend);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      if (authBackend === 'sqlserver') {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email } as AppUser);
          } catch (e) {
            console.error('Invalid token:', e);
            localStorage.removeItem('authToken');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else { // supabase
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      }
      setLoading(false);
    };

    initializeAuth();

    if (authBackend === 'supabase') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      return () => subscription.unsubscribe();
    }
  }, [authBackend]); // Re-run this effect when the backend type changes

  const signUp = async (email: string, password: string) => {
    if (authBackend === 'sqlserver') {
      const response = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { error: { message: error.message || 'Sign-up failed' } };
      }
      return { error: null };
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (authBackend === 'sqlserver') {
      const response = await fetch('http://localhost:8080/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const { token, user: apiUser } = await response.json();
        localStorage.setItem('authToken', token);
        setUser(apiUser);
        return { error: null };
      } else {
        const error = await response.json();
        return { error: { message: error.message || 'Sign-in failed' } };
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    }
  };

  const signOut = async () => {
    if (authBackend === 'sqlserver') {
      localStorage.removeItem('authToken');
      setUser(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  const resetPassword = async (email: string) => {
    // ... implementation for resetPassword
    return { error: { message: 'Not implemented' } };
  };

  const value = {
    user,
    loading,
    authBackend,
    setAuthBackend,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};