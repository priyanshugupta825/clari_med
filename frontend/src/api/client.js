import axios from 'axios';
import { supabase } from '../lib/supabase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach Supabase JWT and User ID header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. Check Supabase auth session
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. Attach User ID & Email from local session for consistency
      const savedUser = localStorage.getItem('demo_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.id) {
          config.headers['X-User-Id'] = parsed.id;
        }
        if (parsed.email) {
          config.headers['X-User-Email'] = parsed.email;
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
