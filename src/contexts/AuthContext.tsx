import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// A generic user type for your SQL Server authentication
interface AppUser {
  id: string;
  email: string;
  // Add any other user properties you need
}

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
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

const backend = import.meta.env.VITE_BACKEND_TYPE;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (backend === 'sqlserver') {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            // In a real app, you would verify the token with your backend
            // For now, we'll decode it to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email } as AppUser);
          } catch (e) {
            console.error('Invalid token:', e);
            localStorage.removeItem('authToken');
          }
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      }
      setLoading(false);
    };

    initializeAuth();

    if (backend === 'supabase') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const signUp = async (email: string, password: string) => {
    if (backend === 'sqlserver') {
      // Replace with your actual API endpoint
      const response = await fetch('/api/auth/signup', {
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
    if (backend === 'sqlserver') {
      // Replace with your actual API endpoint
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const { token, user } = await response.json();
        localStorage.setItem('authToken', token);
        setUser(user);
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
    if (backend === 'sqlserver') {
      localStorage.removeItem('authToken');
      setUser(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  const resetPassword = async (email: string) => {
    if (backend === 'sqlserver') {
      // Replace with your actual API endpoint
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: { message: error.message || 'Password reset failed' } };
      }
      return { error: null };
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};