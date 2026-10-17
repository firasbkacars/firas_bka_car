import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const ADMIN_PREFIXES = [
  '/admin',
  '/dashboard',
  '/vehicules-admin',
  '/reservations-admin',
  '/agences-admin',
  '/clients',
  '/maintenances',
  '/codes-promo',
  '/etats-lieux',
  '/whatsapp',
  '/upload',
  '/contrats-fournisseurs',
  '/messages-admin',
  '/notifications-admin',
];

// Routes ambigues : le meme chemin sert l'admin et le client.
// La selection du token depend donc de la methode (et du sous-chemin).
const ADMIN_METHOD_PATHS = [
  { path: '/reservations', methods: ['GET', 'PUT', 'DELETE', 'PATCH'] },
  { path: '/paiements', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
  { path: '/avis', methods: ['GET', 'PUT', 'PATCH', 'DELETE'] },
  { path: '/parametres', methods: ['PUT', 'PATCH'] },
  { path: '/agences', methods: ['POST', 'PUT', 'PATCH', 'DELETE'] },
];

// Detail d'une reservation : proprietaire (client) ou admin.
// Prefere le token client, l'admin reste accepte en secours.
const SHARED_READ_PREFIXES = ['/reservations/'];

function isAdminPath(url = '', method = 'GET') {
  const path = url.split('?')[0];
  const upper = (method || 'GET').toUpperCase();

  if (SHARED_READ_PREFIXES.some((prefix) => path.startsWith(prefix) && upper === 'GET')) {
    return false;
  }

  const exact = ADMIN_METHOD_PATHS.find(
    (rule) => path === rule.path || path.startsWith(`${rule.path}/`)
  );
  if (exact) return exact.methods.includes(upper);

  return ADMIN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const clientToken = localStorage.getItem('client_token');
    const adminToken = localStorage.getItem('admin_token');
    const admin = isAdminPath(config.url, config.method);
    const token = admin ? adminToken : (clientToken || adminToken);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onAdminLogin = window.location.pathname === '/admin/login';
    const onClientLogin = window.location.pathname === '/client/login';

    if (status === 401 || (status === 403 && isAdminPath(error.config?.url, error.config?.method))) {
      const adminRequest = isAdminPath(error.config?.url, error.config?.method);
      const clientToken = localStorage.getItem('client_token');
      const adminToken = localStorage.getItem('admin_token');

      if (adminRequest && adminToken) {
        localStorage.removeItem('admin_token');
        if (!onAdminLogin) window.location.href = '/admin/login';
      } else if (clientToken && !adminRequest) {
        localStorage.removeItem('client_token');
        if (!onClientLogin) window.location.href = '/client/login';
      } else if (adminToken && !adminRequest && !onAdminLogin) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
