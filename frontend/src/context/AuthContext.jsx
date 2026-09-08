import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.auth.getSession();
          if (data?.session?.user && mounted) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.warn('Session init warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase authentication is not configured in environment variables.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
    }

    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase authentication is not configured in environment variables.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
    }

    return data;
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Signout warning:', err);
    } finally {
      localStorage.removeItem('demo_user');
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
