import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { CLIENT_SESSION_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('client_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // api.js supprime le token expire et emet cet evenement. On remet l'etat
    // React a zero pour stopper les composants qui interrogent /client/*.
    const handleSessionExpired = () => {
      setToken(null);
      setClient(null);
      setLoading(false);

      const { pathname, search } = window.location;
      const protectedClientPage = pathname.startsWith('/client/')
        && !pathname.startsWith('/client/login')
        && !pathname.startsWith('/client/register')
        && !pathname.startsWith('/client/activer');

      if (protectedClientPage) {
        navigate('/client/login', {
          replace: true,
          state: { from: `${pathname}${search}` },
        });
      }
    };

    window.addEventListener(CLIENT_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(CLIENT_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [navigate]);

  useEffect(() => {
    // Un ancien build pouvait laisser un Authorization global qui court-circuite
    // la selection de token par route (api.js). On le nettoie au demarrage.
    delete api.defaults.headers.common['Authorization'];

    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    const requestToken = token;
    try {
      const { data } = await api.get('/client/profile');
      // La session a pu changer pendant la requete (connexion admin, logout).
      if (!requestToken || localStorage.getItem('client_token') !== requestToken) return;
      setClient(data);
    } catch (err) {
      // Ne pas déconnecter sur erreur réseau, uniquement sur session invalide.
      // On ne rappelle pas /client/logout : le token est deja invalide.
      if (err.response?.status === 401 || err.response?.status === 403) {
        const currentToken = localStorage.getItem('client_token');
        // Si une nouvelle session a demarre entre-temps, ne pas l'effacer.
        if (currentToken === null || currentToken === requestToken) {
          localStorage.removeItem('client_token');
          setToken(null);
          setClient(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/client/login', { email, password });
    localStorage.removeItem('admin_token');
    localStorage.setItem('client_token', data.token);
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
    setToken(data.token);
    setClient(data.client);
    return data;
  };

  /**
   * Activation d'un compte cree par l'agence (reservation telephone) :
   * le client definit son mot de passe via le lien recu par email.
   */
  const activerCompte = async (invitationToken, password, passwordConfirmation) => {
    const { data } = await api.post(`/client/activer/${invitationToken}`, {
      password,
      password_confirmation: passwordConfirmation,
    });
    localStorage.removeItem('admin_token');
    localStorage.setItem('client_token', data.token);
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
    setClient((prev) => ({
      ...prev,
      permis_conduire: data.permis_conduire,
      permis_statut: data.permis_statut || 'en_attente',
      permis_rejet_motif: null,
    }));
    return data;
  };

  const uploadIdentityDocument = async (type, file) => {
    const carteNationale = type === 'carte_nationale';
    const champ = carteNationale ? 'carte_nationale' : 'passeport_document';
    const endpoint = carteNationale ? '/client/carte-nationale' : '/client/passeport';
    const statutChamp = carteNationale ? 'carte_nationale_statut' : 'passeport_statut';
    const motifChamp = carteNationale ? 'carte_nationale_rejet_motif' : 'passeport_rejet_motif';

    const formData = new FormData();
    formData.append(champ, file);
    const { data } = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setClient((prev) => ({
      ...prev,
      [champ]: data[champ],
      [statutChamp]: data[statutChamp] || 'en_attente',
      [motifChamp]: null,
    }));

    return data;
  };

  const uploadPhoto = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await api.post('/client/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setClient((prev) => ({ ...prev, photo_profil: data.photo_profil }));
    return data;
  };

  return (
    <AuthContext.Provider value={{
      client, token, loading,
      login, register, logout, updateProfile, uploadPermis, uploadPhoto, uploadIdentityDocument,
      activerCompte,
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
