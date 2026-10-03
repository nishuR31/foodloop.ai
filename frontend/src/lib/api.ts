import axios from 'axios';

// NEXT_PUBLIC_ prefix required for Next.js to expose this to the browser bundle
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive HTTP-only cookies on every request
});

// Request interceptor - No longer need to set Authorization header manually
// Cookies are automatically sent with each request
api.interceptors.request.use(
  (config) => {
    return config;
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and we haven't already retried, and it's not the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        // Attempt to refresh token using the cookie
        await api.post('/auth/refresh');
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — cookies expired, send user back to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
