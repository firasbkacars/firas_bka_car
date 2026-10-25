import axios from 'axios';

export const CLIENT_SESSION_EXPIRED_EVENT = 'client-session-expired';

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

// Routes strictement reservees aux clients : un token admin y provoquerait
// un 403 (middleware EnsureClient), il ne doit donc jamais servir de secours.
function isClientPath(url = '') {
  const path = url.split('?')[0];
  return path === '/client' || path.startsWith('/client/');
}

function requestAuthHeader(config) {
  const headers = config?.headers;
  if (typeof headers?.get === 'function') {
    return headers.get('Authorization') ?? headers.get('authorization') ?? null;
  }
  return headers?.Authorization ?? headers?.authorization ?? null;
}

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
    const client = isClientPath(config.url);

    let token = clientToken || adminToken;
    if (admin) token = adminToken;
    else if (client) token = clientToken;

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

    const adminRequest = isAdminPath(error.config?.url, error.config?.method);
    const clientRequest = isClientPath(error.config?.url);

    if (status === 401 || status === 403) {
      const clientToken = localStorage.getItem('client_token');
      const adminToken = localStorage.getItem('admin_token');
      const requestAuth = requestAuthHeader(error.config);
      // Ne pas deconnecter une session plus recente si une ancienne requete
      // echoue apres une reconnexion.
      const usedClientToken = !!clientToken && requestAuth === `Bearer ${clientToken}`;
      const usedAdminToken = !!adminToken && requestAuth === `Bearer ${adminToken}`;

      // Un 403 avec un token client valide est un refus de droits (ex. facture
      // d'un autre client), pas une session expiree. En revanche un 401, ou un
      // 403 sur /client/* sans token client, signifie que l'etat React est
      // obsolete : on le vide pour arreter les requetes repetitives.
      const clientSessionExpired =
        (status === 401 && !adminRequest && usedClientToken)
        || (clientRequest && !clientToken && (status === 401 || status === 403));

      if (adminRequest && usedAdminToken) {
        localStorage.removeItem('admin_token');
        if (!onAdminLogin) window.location.href = '/admin/login';
      } else if (clientSessionExpired) {
        localStorage.removeItem('client_token');
        delete api.defaults.headers.common['Authorization'];
        window.dispatchEvent(new Event(CLIENT_SESSION_EXPIRED_EVENT));
      } else if (!adminRequest && !clientRequest && status === 401 && usedAdminToken && !onAdminLogin) {
        // Route partagee servie avec le token admin en secours.
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
