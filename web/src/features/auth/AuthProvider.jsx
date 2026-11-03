import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

// Sesión de Supabase + rol. El rol de admin lo decide SOLO la base de datos (is_super_admin()).
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolveRole = useCallback(async (sess) => {
    if (!sess) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase.rpc('is_super_admin');
    setIsAdmin(data === true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await resolveRole(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      await resolveRole(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, [resolveRole]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
