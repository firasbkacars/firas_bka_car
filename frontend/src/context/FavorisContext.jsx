import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const FavorisContext = createContext(null);

export function FavorisProvider({ children }) {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [ids, setIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      setIds(new Set());
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get('/client/favoris')
      .then(({ data }) => {
        if (cancelled) return;
        setIds(new Set((Array.isArray(data) ? data : []).map((f) => f.vehicule_id)));
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const isFavori = useCallback((vehiculeId) => ids.has(vehiculeId), [ids]);

  const toggle = useCallback(async (vehiculeId) => {
    if (!token) {
      toast.info('Connectez-vous pour ajouter des favoris.');
      navigate('/client/login', { state: { from: window.location.pathname } });
      return false;
    }
    const wasFavori = ids.has(vehiculeId);
    setIds((prev) => {
      const next = new Set(prev);
      if (wasFavori) next.delete(vehiculeId);
      else next.add(vehiculeId);
      return next;
    });
    try {
      const { data } = await api.post('/client/favoris', { vehicule_id: vehiculeId });
      const isNow = !!data.favori;
      toast.success(isNow ? 'Ajouté aux favoris.' : 'Retiré des favoris.');
      return isNow;
    } catch {
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavori) next.add(vehiculeId);
        else next.delete(vehiculeId);
        return next;
      });
      toast.error('Erreur lors de la mise à jour des favoris.');
      return wasFavori;
    }
  }, [token, ids, toast, navigate]);

  const remove = useCallback(async (vehiculeId) => {
    setIds((prev) => {
      const next = new Set(prev);
      next.delete(vehiculeId);
      return next;
    });
    try {
      await api.delete(`/client/favoris/${vehiculeId}`);
      toast.success('Retiré des favoris.');
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }, [toast]);

  const value = useMemo(() => ({
    ids, loading, loaded, isFavori, toggle, remove, count: ids.size,
  }), [ids, loading, loaded, isFavori, toggle, remove]);

  return (
    <FavorisContext.Provider value={value}>
      {children}
    </FavorisContext.Provider>
  );
}

export function useFavoris() {
  const ctx = useContext(FavorisContext);
  if (!ctx) {
    return {
      ids: new Set(), loading: false, loaded: true, count: 0,
      isFavori: () => false, toggle: async () => false, remove: async () => {},
    };
  }
  return ctx;
}
