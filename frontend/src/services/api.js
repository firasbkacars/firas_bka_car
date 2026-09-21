import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const clientToken = localStorage.getItem('client_token');
    const adminToken = localStorage.getItem('admin_token');
    const token = clientToken || adminToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const clientToken = localStorage.getItem('client_token');
      const adminToken = localStorage.getItem('admin_token');

      if (clientToken) {
        localStorage.removeItem('client_token');
        window.location.href = '/client/login';
      } else if (adminToken) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
