import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useFavoris } from '../../context/FavorisContext';
import api from '../../services/api';
import { formatMAD, formatDate } from '../../lib/formatters';
import { Heart, Car, Wallet, Calendar, Trash2, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

export default function TableauDeBord() {
  const { t } = useTranslation();
  const { token, loading: authLoading } = useAuth();
  const { remove } = useFavoris();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [favoris, setFavoris] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/client/login', { state: { from: '/client/tableau-de-bord' }, replace: true });
    }
  }, [authLoading, token, navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [resRes, favRes] = await Promise.all([
          api.get('/client/reservations'),
          api.get('/client/favoris'),
        ]);
        if (cancelled) return;
        setReservations(resRes.data || []);
        setFavoris(favRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const totalDepense = reservations
    .filter((r) => r.statut !== 'annulee')
    .reduce((sum, r) => sum + (parseFloat(r.prix_total) || 0), 0);

  const reservationsActives = reservations.filter((r) => ['confirmee', 'en_cours'].includes(r.statut)).length;

  const stats = [
    { label: t('dashboard.stats.totalDepense'), value: formatMAD(totalDepense), icon: <Wallet size={18} className="text-primary-light" /> },
    { label: t('dashboard.stats.reservations'), value: reservations.length, icon: <Calendar size={18} className="text-primary-light" /> },
    { label: t('dashboard.stats.enCours'), value: reservationsActives, icon: <Car size={18} className="text-primary-light" /> },
    { label: t('dashboard.stats.favoris'), value: favoris.length, icon: <Heart size={18} className="text-primary-light" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader title={t('dashboard.titre')} breadcrumbs={[{ label: t('dashboard.filAriane') }]} />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="rounded-2xl h-24" />)
            : stats.map((s) => (
              <div key={s.label} className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2 text-muted text-xs uppercase tracking-wider">
                  {s.icon}
                  {s.label}
                </div>
                <p className="text-white font-bold text-2xl">{s.value}</p>
              </div>
            ))}
        </div>

        {/* Favoris */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Heart size={18} className="text-primary-light" />
              {t('dashboard.favoris.titre')}
            </h2>
            <Link to="/vehicules" className="text-primary-light text-sm hover:underline flex items-center gap-1">
              {t('dashboard.favoris.parcourir')} <ChevronRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="rounded-2xl h-48" />)}
            </div>
          ) : favoris.length === 0 ? (
            <div className="text-center py-10">
              <Heart size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted text-sm">{t('dashboard.favoris.aucun')}</p>
              <p className="text-muted text-xs mt-1">{t('dashboard.favoris.aide')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoris.map((f) => {
                const v = f.vehicule;
                if (!v) return null;
                const photo = v.photos?.[0];
                const src = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
                return (
                  <div key={f.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden group">
                    <Link to={`/vehicules/${v.id}`} className="block relative h-36 overflow-hidden">
                      <img
                        src={src || FALLBACK_IMG}
                        alt={`${v.marque} ${v.modele}`}
                        loading="lazy"
                        onError={(e) => { e.target.src = FALLBACK_IMG; }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-white text-sm font-semibold">{v.marque} {v.modele}</h3>
                        <p className="text-primary-light font-bold text-sm mt-0.5">{formatMAD(v.prix_jour)}<span className="text-muted text-xs font-normal">{t('dashboard.favoris.parJour')}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(v.id)}
                        aria-label={t('dashboard.favoris.retirer')}
                        className="text-muted hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières réservations */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Calendar size={18} className="text-primary-light" />
              {t('dashboard.reservations.titre')}
            </h2>
            <Link to="/client/profil" className="text-primary-light text-sm hover:underline flex items-center gap-1">
              {t('dashboard.reservations.toutVoir')} <ChevronRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="rounded-xl h-16" />)}
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-10">
              <Calendar size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted text-sm">{t('dashboard.reservations.aucune')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.slice(0, 5).map((res) => (
                <div key={res.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                  <div>
                    <p className="text-white text-sm font-medium">{res.vehicule ? `${res.vehicule.marque} ${res.vehicule.modele}` : t('dashboard.reservations.libelle')}</p>
                    <p className="text-muted text-xs mt-0.5">{res.numero} · {formatDate(res.date_debut)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-white font-bold text-sm">{formatMAD(res.prix_total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      res.statut === 'annulee' ? 'bg-red-500/10 text-red-400'
                        : res.statut === 'terminee' ? 'bg-green-500/10 text-green-400'
                          : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {t(`statuts.reservation.${res.statut}`, { defaultValue: res.statut })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
