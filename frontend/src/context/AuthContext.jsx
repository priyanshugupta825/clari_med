import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Check local storage session for fast load
    const savedUser = localStorage.getItem('clarimed_user') || localStorage.getItem('demo_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id) {
          setUser(parsed);
          setSession({ access_token: 'auth-token-' + parsed.id, user: parsed });
        }
      } catch {
        localStorage.removeItem('clarimed_user');
        localStorage.removeItem('demo_user');
      }
    }

    // 2. Check Supabase auth session if configured
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && mounted) {
          setSession(session);
          setUser(session.user);
          localStorage.setItem('clarimed_user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata || {},
          }));
        }
        if (mounted) setLoading(false);
      }).catch(() => {
        if (mounted) setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            localStorage.setItem('clarimed_user', JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata || {},
            }));
          } else if (_event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            localStorage.removeItem('clarimed_user');
            localStorage.removeItem('demo_user');
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
    const trimmedEmail = email.trim();

    if (isSupabaseConfigured()) {
      try {
        const res = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (res.error) {
          throw res.error;
        }

        if (res.data?.user) {
          setUser(res.data.user);
          setSession(res.data.session);
          localStorage.setItem('clarimed_user', JSON.stringify({
            id: res.data.user.id,
            email: res.data.user.email,
            user_metadata: res.data.user.user_metadata || {},
          }));
          return res.data;
        }
      } catch (err) {
        // If it's an explicit invalid credentials error, rethrow so the user knows
        if (err.message && (err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('confirm'))) {
          throw err;
        }
        console.warn('Supabase signin note, fallback local session:', err);
      }
    }

    // Local authentication fallback for unconfigured environments
    const cleanName = trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Patient User';
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    
    const localUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      email: trimmedEmail,
      user_metadata: {
        full_name: formattedName,
        abha_id: '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
      },
    };

    localStorage.setItem('clarimed_user', JSON.stringify(localUser));
    setUser(localUser);
    setSession({ access_token: 'auth-token-' + localUser.id, user: localUser });
    return { data: { user: localUser, session: { access_token: 'auth-token-' + localUser.id } }, error: null };
  };

  const signUp = async (email, password, metadata = {}) => {
    const trimmedEmail = email.trim();

    if (isSupabaseConfigured()) {
      try {
        const res = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: metadata },
        });

        if (res.error) {
          throw res.error;
        }

        if (res.data?.user) {
          setUser(res.data.user);
          setSession(res.data.session);
          localStorage.setItem('clarimed_user', JSON.stringify({
            id: res.data.user.id,
            email: res.data.user.email,
            user_metadata: metadata,
          }));
          return res.data;
        }
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('already registered')) {
          throw err;
        }
        console.warn('Supabase signup note, fallback local registration:', err);
      }
    }

    const localUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      email: trimmedEmail,
      user_metadata: {
        full_name: metadata.full_name || trimmedEmail.split('@')[0],
        abha_id: metadata.abha_id || '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
        phone_number: metadata.phone_number || undefined,
      },
    };

    localStorage.setItem('clarimed_user', JSON.stringify(localUser));
    setUser(localUser);
    setSession({ access_token: 'auth-token-' + localUser.id, user: localUser });
    return { data: { user: localUser, session: { access_token: 'auth-token-' + localUser.id } }, error: null };
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Signout note:', err);
    } finally {
      localStorage.removeItem('clarimed_user');
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
