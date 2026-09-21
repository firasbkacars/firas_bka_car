import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('client_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/client/profile');
      setClient(data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/client/login', { email, password });
    localStorage.removeItem('admin_token');
    localStorage.setItem('client_token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setClient(data.client);
    return data;
  };

  const register = async (form) => {
    const { data } = await api.post('/client/register', {
      ...form,
      password_confirmation: form.password_confirmation,
    });
    localStorage.removeItem('admin_token');
    localStorage.setItem('client_token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setClient(data.client);
    return data;
  };

  const logout = async () => {
    try {
      if (token) await api.post('/client/logout');
    } catch {}
    localStorage.removeItem('client_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setClient(null);
  };

  const updateProfile = async (form) => {
    const { data } = await api.put('/client/profile', form);
    setClient(data);
    return data;
  };

  const uploadPermis = async (file) => {
    const formData = new FormData();
    formData.append('permis_conduire', file);
    const { data } = await api.post('/client/permis', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setClient((prev) => ({ ...prev, permis_conduire: data.permis_conduire }));
    return data;
  };

  return (
    <AuthContext.Provider value={{
      client, token, loading,
      login, register, logout, updateProfile, uploadPermis,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
