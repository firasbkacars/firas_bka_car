import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.multiGet(['client_token', 'client_data'])
      .then(async ([tokenPair, dataPair]) => {
        const token = tokenPair[1];
        const cached = dataPair[1];
        if (!token) return;
        if (cached) {
          try {
            if (alive) setClient(JSON.parse(cached));
          } catch {}
        }
        try {
          const { data } = await api.get('/client/profile');
          if (!alive) return;
          setClient(data);
          await AsyncStorage.setItem('client_data', JSON.stringify(data));
        } catch {
          if (!alive) return;
          await AsyncStorage.multiRemove(['client_token', 'client_data']);
          setClient(null);
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persistir = useCallback(async (token, clientData) => {
    await AsyncStorage.multiSet([
      ['client_token', token],
      ['client_data', JSON.stringify(clientData)],
    ]);
    setClient(clientData);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/client/login', { email, password });
      await persistir(data.token, data.client);
      return data.client;
    },
    [persistir],
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/client/register', payload);
      if (data.token) await persistir(data.token, data.client);
      return data;
    },
    [persistir],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/client/logout');
    } catch {}
    await AsyncStorage.multiRemove(['client_token', 'client_data']);
    setClient(null);
  }, []);

  const setProfile = useCallback((prof) => {
    setClient(prof);
    AsyncStorage.setItem('client_data', JSON.stringify(prof)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ client, ready, login, register, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
