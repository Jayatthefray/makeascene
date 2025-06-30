import React, { createContext, useContext, useState, useEffect } from 'react';
import { signUp, signIn, signOut, getCurrentUser } from '../../lib/supabase/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const { user } = await getCurrentUser();
      setUser(user);
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleSignUp = async (email, password) => {
    const { data, error } = await signUp(email, password);
    if (!error) setUser(data?.user || null);
    setError(error);
    return { data, error };
  };

  const handleSignIn = async (email, password) => {
    const { data, error } = await signIn(email, password);
    if (!error) setUser(data?.user || null);
    setError(error);
    return { data, error };
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) setUser(null);
    setError(error);
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signUp: handleSignUp, signIn: handleSignIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 