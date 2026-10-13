import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * V4 : point d'entree API de l'application mobile.
 * En developpement, remplacer BASE_URL par l'adresse de la machine
 * (ex : http://192.168.1.10:8000/api) ou par l'URL Fly.io.
 */
export const BASE_URL = 'https://firasbkacar.fly.dev/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('client_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
