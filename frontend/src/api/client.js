import axios from 'axios';
import { supabase } from '../lib/supabase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000,
});

// Request interceptor to attach Supabase JWT and User ID header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. Check Supabase auth session
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const supabaseUser = data?.session?.user;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Priority 1: Supabase Authenticated User
      if (supabaseUser?.id) {
        config.headers['X-User-Id'] = supabaseUser.id;
        if (supabaseUser.email) {
          config.headers['X-User-Email'] = supabaseUser.email;
        }
        if (supabaseUser.user_metadata?.full_name) {
          config.headers['X-User-Name'] = supabaseUser.user_metadata.full_name;
        }
        if (supabaseUser.user_metadata?.abha_id) {
          config.headers['X-User-Abha'] = supabaseUser.user_metadata.abha_id;
        }
      } else {
        // Priority 2: Saved user session
        const savedUser = localStorage.getItem('clarimed_user') || localStorage.getItem('demo_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed.id) {
              config.headers['X-User-Id'] = parsed.id;
            }
            if (parsed.email) {
              config.headers['X-User-Email'] = parsed.email;
            }
            if (parsed.user_metadata?.full_name) {
              config.headers['X-User-Name'] = parsed.user_metadata.full_name;
            }
            if (parsed.user_metadata?.abha_id) {
              config.headers['X-User-Abha'] = parsed.user_metadata.abha_id;
            }
          } catch {
            config.headers['X-User-Id'] = 'demo-user-123';
          }
        } else {
          config.headers['X-User-Id'] = 'demo-user-123';
        }

        if (!token) {
          config.headers.Authorization = `Bearer demo-token-12345`;
        }
      }
    } catch (err) {
      console.warn('Auth interceptor note:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized API access (401)');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
