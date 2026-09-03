import axios from 'axios';

const api = axios.create({
  baseURL: '', // Uses Vite proxy to http://localhost:8000
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto inject Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('g9_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Global error handler
api.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    // Token expired or invalid
    const token = localStorage.getItem('g9_access_token');
    if (token) {
      localStorage.removeItem('g9_access_token');
      window.location.reload();
    }
  }
  return Promise.reject(error);
});

export default api;
