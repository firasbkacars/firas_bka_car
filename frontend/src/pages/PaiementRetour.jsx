import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatMAD, formatDateTime } from '../lib/formatters';
import {
  CheckCircle2, XCircle, Ban, Hourglass, ShieldAlert, Loader2, ArrowRight, RefreshCw,
  RotateCcw, Phone, Download,
} from 'lucide-react';

const AGENCY_PHONE = '+212774623448';
const AGENCY_PHONE_HREF = 'tel:+212774623448';

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
    description: 'La confirmation de votre banque n\'est pas encore arrivee. Patientez quelques instants.',
    Icon: Hourglass,
    tone: 'text-yellow-400',
    ring: 'border-yellow-500/20 bg-yellow-500/5',
  },
  rembourse: {
    title: 'Paiement rembourse',
    description: 'Cet encaissement a ete rembourse. Le montant vous sera restitue selon le moyen de paiement utilise.',
    Icon: RotateCcw,
    tone: 'text-blue-400',
    ring: 'border-blue-500/20 bg-blue-500/5',
  },
  rembourse_partiel: {
    title: 'Paiement rembourse partiellement',
    description: 'Une partie de cet encaissement a ete rembourse. Le detail est disponible dans votre profil.',
    Icon: RotateCcw,
    tone: 'text-blue-400',
    ring: 'border-blue-500/20 bg-blue-500/5',
  },
  unknown: {
    title: 'Resultat indisponible',
    description: 'Nous n\'avons pas pu determiner l\'issue du paiement.',
    Icon: ShieldAlert,
    tone: 'text-neutral-400',
    ring: 'border-neutral-500/20 bg-neutral-500/5',
  },
};

const STATUS_ALIASES = {
  cancelled: 'annule',
  canceled: 'annule',
  declined: 'echoue',
  failed: 'echoue',
  failure: 'echoue',
  success: 'paye',
  paid: 'paye',
  expired: 'expire',
  pending: 'en_attente',
  processing: 'en_attente',
  refunded: 'rembourse',
  partially_refunded: 'rembourse_partiel',
};

function normalizeStatus(value) {
  if (!value) return 'unknown';
  return STATUS_ALIASES[value] || value;
}


const TERMINAL_STATUSES = [
  'paye', 'echoue', 'annule', 'expire', 'suspect',
  'rembourse', 'rembourse_partiel',
];
const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3000;

export default function PaiementRetour() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const transactionId = searchParams.get('tx');
  const statusFromUrl = normalizeStatus(searchParams.get('status'));

  const [status, setStatus] = useState(statusFromUrl);
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const outcome = OUTCOMES[status] || OUTCOMES.unknown;
  const { Icon } = outcome;

  const isTerminal = TERMINAL_STATUSES.includes(status);
  const canRetry = ['echoue', 'expire', 'annule'].includes(status);

  const checkStatus = useCallback(async () => {
    if (!transactionId) return;
    setChecking(true);
    try {
      const { data } = await api.get(`/client/payments/cmi/status/${transactionId}`);
      setDetail(data);
      // statut_affichage fait foi : il reflete l'etat courant (dont un
      // remboursement eventuel), la ou le statut brut reste "paye".
      setStatus(normalizeStatus(data.statut_affichage || data.status) || statusFromUrl);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || null);
    } finally {
      setChecking(false);
    }
  }, [transactionId, statusFromUrl]);

  // Verification initiale au montage : le serveur a deja verifie et persiste
  // le statut au moment du retour navigateur.
  useEffect(() => {
    if (!token || !transactionId) return;
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, transactionId]);

  // Polling court tant que la passerelle n'a pas tranche (webhook parfois
  // plus lent que le retour navigateur). Arret des la resolution ou au
  // bout de MAX_POLL_ATTEMPTS pour ne jamais boucler.
  useEffect(() => {
    if (!token || !transactionId || isTerminal || attempts >= MAX_POLL_ATTEMPTS) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setAttempts((a) => a + 1);
      checkStatus();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [token, transactionId, isTerminal, attempts, checkStatus]);

  /**
   * Rouvre reellement une session de paiement pour la reservation liee.
   * navigate(-1) ne fonctionne pas ici : l'aller vers la passerelle est une
   * redirection hors SPA, l'historique ne contient donc pas la page utile.
   */
  const handleRetry = async () => {
    const reservationId = detail?.reservation_id;
    if (!reservationId) {
      navigate('/client/profil');
      return;
    }
    setRetrying(true);
    try {
      const { data } = await api.post('/client/payments/cmi/initialize', {
        reservation_id: reservationId,
      });
      if (data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }
      navigate('/client/profil');
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de relancer le paiement.');
      setRetrying(false);
    }
  };

  const downloadFacture = async () => {
    if (!detail?.reservation_id) return;
    setDownloading(true);
    try {
      const response = await api.get(
        `/client/reservations/${detail.reservation_id}/facture`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${detail.reservation_numero || detail.reservation_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Telechargement de la facture impossible.');
    } finally {
      setDownloading(false);
    }
  };

  if (!transactionId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md border border-neutral-500/20 bg-neutral-500/5 rounded-2xl p-8 text-center">
          <ShieldAlert size={30} className="text-neutral-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-white font-semibold text-xl mb-2">Lien de paiement invalide</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Ce lien ne contient pas de reference de transaction. Consultez vos
            reservations pour verifier l'etat de votre paiement.
          </p>
          <Link
            to="/client/profil"
            className="inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Voir mes reservations
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div
          role="status"
          aria-live="polite"
          className={`border rounded-2xl p-8 text-center ${outcome.ring}`}
        >
          <div className={`mx-auto w-16 h-16 rounded-full border ${outcome.ring} flex items-center justify-center mb-5`}>
            <Icon size={30} className={outcome.tone} aria-hidden="true" />
          </div>

          <h1 className={`text-white font-semibold text-xl mb-2 ${outcome.tone}`}>
            {outcome.title}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {outcome.description}
          </p>

          {(checking || (!isTerminal && attempts < MAX_POLL_ATTEMPTS)) && (
            <p className="text-muted text-xs flex items-center justify-center gap-2 mb-4">
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              {checking
                ? 'Verification en cours...'
                : 'Confirmation de la banque en attente...'}
            </p>
          )}

          {!isTerminal && attempts >= MAX_POLL_ATTEMPTS && !checking && (
            <p className="text-amber-400/90 text-xs mb-4 leading-relaxed">
              La confirmation prend plus de temps que prevu. Elle sera appliquee
              automatiquement ; vous pouvez recontacter l'agence si besoin.
            </p>
          )}

          {detail && (
            <div className="bg-black/30 rounded-xl p-4 text-left space-y-2 mb-6">
              {detail.reservation_numero && (
                <Row label="Reservation" value={detail.reservation_numero} />
              )}
              <Row label="Montant" value={formatMAD(detail.montant || 0)} />
              {detail.rembourse_sur > 0 && (
                <Row label="Dont rembourse" value={formatMAD(detail.rembourse_sur)} />
              )}
              {detail.carte && <Row label="Carte" value={detail.carte} />}
              {detail.date_paiement && (
                <Row label="Date" value={formatDateTime(detail.date_paiement)} />
              )}
              <Row label="Transaction" value={transactionId} mono />
            </div>
          )}

          {error && (
            <p role="alert" className="text-red-400 text-xs mb-4">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            {status === 'paye' && detail?.reservation_id && (
              <button
                type="button"
                onClick={downloadFacture}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {downloading
                  ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  : <Download size={15} aria-hidden="true" />}
                Telecharger la facture
              </button>
            )}

            {canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="w-full flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#dc2626]/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {retrying
                  ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  : <RefreshCw size={15} aria-hidden="true" />}
                {retrying ? 'Ouverture du paiement...' : 'Reessayer le paiement'}
              </button>
            )}

            <Link
              to="/client/profil"
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Voir mes reservations
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <a
              href={AGENCY_PHONE_HREF}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Phone size={15} aria-hidden="true" />
              Contacter l'agence - {AGENCY_PHONE}
            </a>
          </div>
        </div>

        <p className="text-muted text-xs text-center mt-5 leading-relaxed">
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
      <span className="text-muted">{label}</span>
      <span className={`text-white font-medium text-right ${mono ? 'font-mono text-[10px] break-all' : ''}`}>
        {value}
      </span>
    </div>
  );
}
