import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  CheckCircle2, XCircle, Ban, Hourglass, ShieldAlert, Loader2, ArrowRight, RefreshCw,
} from 'lucide-react';

const OUTCOMES = {
  paye: {
    title: 'Paiement confirme',
    description: 'Votre acompte a bien ete encaisse. Votre reservation est validee.',
    Icon: CheckCircle2,
    tone: 'text-green-400',
    ring: 'border-green-500/20 bg-green-500/5',
  },
  echoue: {
    title: 'Paiement refuse',
    description: 'Votre banque a refuse l\'operation. Aucun montant n\'a ete debite.',
    Icon: XCircle,
    tone: 'text-red-400',
    ring: 'border-red-500/20 bg-red-500/5',
  },
  annule: {
    title: 'Paiement annule',
    description: 'Vous avez abandonne le paiement. Votre reservation reste en attente.',
    Icon: Ban,
    tone: 'text-neutral-400',
    ring: 'border-neutral-500/20 bg-neutral-500/5',
  },
  expire: {
    title: 'Session expiree',
    description: 'La session de paiement a expire. Vous pouvez retenter.',
    Icon: Hourglass,
    tone: 'text-orange-400',
    ring: 'border-orange-500/20 bg-orange-500/5',
  },
  suspect: {
    title: 'Paiement a verifier',
    description: 'Une anomalie a ete detectee. Notre equipe va verifier votre paiement.',
    Icon: ShieldAlert,
    tone: 'text-amber-400',
    ring: 'border-amber-500/20 bg-amber-500/5',
  },
  en_attente: {
    title: 'Paiement en cours',
    description: 'La confirmation de votre banque n\'est pas encore arrivee. patientez quelques instants.',
    Icon: Hourglass,
    tone: 'text-yellow-400',
    ring: 'border-yellow-500/20 bg-yellow-500/5',
  },
  unknown: {
    title: 'Resultat indisponible',
    description: 'Nous n\'avons pas pu determiner l\'issue du paiement.',
    Icon: ShieldAlert,
    tone: 'text-neutral-400',
    ring: 'border-neutral-500/20 bg-neutral-500/5',
  },
};

export default function PaiementRetour() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const transactionId = searchParams.get('tx');
  const statusFromUrl = searchParams.get('status') || 'unknown';

  const [status, setStatus] = useState(statusFromUrl);
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const outcome = OUTCOMES[status] || OUTCOMES.unknown;
  const { Icon } = outcome;

  // On reinterroge le backend une seule fois au montage : le serveur a deja
  // verifie et persiste le statut au moment du retour navigateur.
  useEffect(() => {
    if (!token || !transactionId) return;
    let cancelled = false;

    (async () => {
      try {
        setChecking(true);
        const { data } = await api.get(`/client/payments/cmi/status/${transactionId}`);
        if (!cancelled) {
          setDetail(data);
          setStatus(data.status || statusFromUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, transactionId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className={`border rounded-2xl p-8 text-center ${outcome.ring}`}>
          <div className={`mx-auto w-16 h-16 rounded-full border ${outcome.ring} flex items-center justify-center mb-5`}>
            <Icon size={30} className={outcome.tone} />
          </div>

          <h1 className={`text-white font-semibold text-xl mb-2 ${outcome.tone}`}>
            {outcome.title}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {outcome.description}
          </p>

          {checking && (
            <p className="text-gray-500 text-xs flex items-center justify-center gap-2 mb-4">
              <Loader2 size={13} className="animate-spin" />
              Verification en cours...
            </p>
          )}

          {detail && (
            <div className="bg-black/30 rounded-xl p-4 text-left space-y-2 mb-6">
              {detail.reservation_numero && (
                <Row label="Reservation" value={detail.reservation_numero} />
              )}
              <Row label="Montant" value={`${parseFloat(detail.montant || 0).toFixed(2)} DH`} />
              {detail.carte && <Row label="Carte" value={detail.carte} />}
              {detail.date_paiement && (
                <Row
                  label="Date"
                  value={new Date(detail.date_paiement).toLocaleString('fr-FR')}
                />
              )}
              {transactionId && <Row label="Transaction" value={transactionId} mono />}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs mb-4">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            {(status === 'echoue' || status === 'expire' || status === 'annule') && transactionId && (
              <button
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#dc2626]/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw size={15} />
                Reessayer le paiement
              </button>
            )}

            <Link
              to="/client/profil"
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Voir mes reservations
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <p className="text-gray-600 text-[11px] text-center mt-5 leading-relaxed">
          Aucune donnee bancaire n'est stockee par FIRAS BKA CAR.
          Le paiement est traite par le Centre Monetique Interbancaire.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`text-white font-medium text-right ${mono ? 'font-mono text-[10px] break-all' : ''}`}>
        {value}
      </span>
    </div>
  );
}
