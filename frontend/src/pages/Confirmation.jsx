import { useEffect, useState } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Phone, MessageCircle, Wallet } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { formatMAD, formatDate } from '../lib/formatters';

export default function Confirmation() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { token } = useAuth();

  const [reservation, setReservation] = useState(state?.reservation ?? null);
  const [vehicule, setVehicule] = useState(state?.vehicule ?? null);
  const [loading, setLoading] = useState(!state?.reservation);
  const [error, setError] = useState('');

  const numero = state?.reservation?.numero || searchParams.get('numero');

  useEffect(() => {
    if (state?.reservation) {
      setLoading(false);
      return;
    }

    if (!numero || !token) {
      setLoading(false);
      setError(numero
        ? t('confirmation.erreurs.connectezVous')
        : t('confirmation.erreurs.aucuneReservation'));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get(`/reservations/${encodeURIComponent(numero)}`);
        if (cancelled) return;
        setReservation(data);
        setVehicule(data.vehicule ?? null);
      } catch {
        if (!cancelled) setError(t('confirmation.erreurs.introuvable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state, numero, token, t]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16" aria-busy="true">
        <div className="text-center mb-8">
          <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>

        <Skeleton className="rounded-xl p-6 mb-6 h-28" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="rounded-xl h-44" />
          <Skeleton className="rounded-xl h-44" />
        </div>

        <Skeleton className="rounded-xl h-32 mb-6" />
        <Skeleton className="rounded-xl h-40" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <p className="text-gray-400 mb-4">{error || t('confirmation.erreurs.aucuneReservation')}</p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link to="/" className="text-primary-light hover:underline">{t('confirmation.retourAccueil')}</Link>
          <Link to="/vehicules" className="text-primary-light hover:underline">{t('confirmation.voirVehicules')}</Link>
        </div>
      </div>
    );
  }

  const vehiculePhoto = vehicule?.photos?.[0];
  const vehiculePhotoSrc = vehiculePhoto && !vehiculePhoto.startsWith('http') && !vehiculePhoto.startsWith('/')
    ? `/storage/${vehiculePhoto}`
    : vehiculePhoto;

  const acompteTotal = parseFloat(reservation.acompte ?? 0);
  const acomptePaye = parseFloat(reservation.acompte_paye ?? 0);
  const acompteRestant = parseFloat(
    reservation.acompte_restant ?? Math.max(0, acompteTotal - acomptePaye)
  );
  const paiementAcompteAttendu =
    reservation.mode_paiement !== 'cmi'
    && reservation.statut !== 'annulee'
    && acompteRestant > 0.009;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('confirmation.titre')}</h1>
        <p className="text-gray-400">{t('confirmation.sousTitre')}</p>
      </div>

      {/* Reservation Number */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center mb-6">
        <p className="text-gray-400 text-sm mb-2">{t('confirmation.numero.titre')}</p>
        <p className="text-primary-light font-bold text-3xl tracking-wider">{reservation.numero}</p>
        <p className="text-muted text-xs mt-2">{t('confirmation.numero.note')}</p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">{t('confirmation.details.titre')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>{t('confirmation.details.priseEnCharge')}</span>
              <span className="text-end text-white">{formatDate(reservation.date_debut, { withTime: true })}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('confirmation.details.retour')}</span>
              <span className="text-end text-white">{formatDate(reservation.date_fin, { withTime: true })}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('confirmation.details.lieu')}</span>
              <span className="text-end text-white">{reservation.lieu_prise}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">{t('confirmation.vehicule.titre')}</h3>
          {vehicule && (
            <div className="flex items-center gap-3">
              <img
                src={vehiculePhotoSrc || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=200&q=80'}
                alt={vehicule.modele}
                loading="lazy"
                className="w-20 h-14 object-cover rounded"
              />
              <div>
                <h4 className="text-white font-medium">{vehicule.marque} {vehicule.modele}</h4>
                <p className="text-gray-400 text-xs">{vehicule.transmission} • {vehicule.carburant}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-3">{t('confirmation.paiement.titre')}</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('confirmation.paiement.total')}</span>
          <span className="text-primary-light font-bold text-2xl">{formatMAD(reservation.prix_total)}</span>
        </div>
        {acompteTotal > 0 && (
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">{t('confirmation.paiement.acompte')}</span>
            <span className={acompteRestant > 0.009 ? 'text-amber-400 font-semibold' : 'text-green-500 font-semibold'}>
              {acompteRestant > 0.009
                ? t('confirmation.paiement.regleSur', {
                    paye: formatMAD(acomptePaye),
                    total: formatMAD(acompteTotal),
                  })
                : t('confirmation.paiement.valide', { total: formatMAD(acompteTotal) })}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400">{t('confirmation.paiement.statut')}</span>
          <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm font-medium">{t('confirmation.paiement.confirmee')}</span>
        </div>
      </div>

      {paiementAcompteAttendu && (
        <div className="bg-[#1a1a1a] border border-primary/30 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Wallet size={20} className="text-primary-light" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-semibold">{t('confirmation.acompte.titre')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                {t('confirmation.acompte.description', { montant: formatMAD(acompteRestant) })}
              </p>
              <Link
                to={`/paiement/acompte/${encodeURIComponent(reservation.numero)}`}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {t('confirmation.acompte.payer')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
        <h3 className="text-white font-semibold mb-3">{t('confirmation.aide.titre')}</h3>
        <p className="text-gray-400 text-sm mb-4">{t('confirmation.aide.texte')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="tel:+212603477786" className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#333] transition">
            <Phone size={14} /> +212 603 477 786
          </a>
          <a
            href="https://wa.me/212603477786"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            <MessageCircle size={14} /> {t('confirmation.aide.whatsapp')}
          </a>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-primary-light hover:underline">
          <ArrowLeft size={14} aria-hidden="true" className="rtl:rotate-180" />
          {t('confirmation.retourAccueil')}
        </Link>
      </div>
    </div>
  );
}
