import React, { createContext, useContext, useState, useEffect } from 'react';
import { signUp, signIn, signOut, getCurrentUser } from '../../lib/supabase/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const { user } = await getCurrentUser();
        setUser(user);
      } catch (err) {
        console.warn('Auth initialization failed:', err);
        setError('Authentication service unavailable');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleSignUp = async (email, password) => {
    try {
      const { data, error } = await signUp(email, password);
      if (!error) setUser(data?.user || null);
      setError(error);
      return { data, error };
    } catch (err) {
      const errorMsg = 'Authentication service unavailable';
      setError(errorMsg);
      return { data: null, error: { message: errorMsg } };
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      const { data, error } = await signIn(email, password);
      if (!error) setUser(data?.user || null);
      setError(error);
      return { data, error };
    } catch (err) {
      const errorMsg = 'Authentication service unavailable';
      setError(errorMsg);
      return { data: null, error: { message: errorMsg } };
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (!error) setUser(null);
      setError(error);
      return { error };
    } catch (err) {
      // Even if signout fails, clear local user state
      setUser(null);
      return { error: null };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      signUp: handleSignUp, 
      signIn: handleSignIn, 
      signOut: handleSignOut,
      logout: handleSignOut // Legacy alias
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 