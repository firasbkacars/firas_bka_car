import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatMAD, formatDateTime } from '../lib/formatters';
import {
  CheckCircle2, XCircle, Ban, Hourglass, ShieldAlert, Loader2, ArrowRight, RefreshCw,
  RotateCcw, Phone, Download,
} from 'lucide-react';

const AGENCY_PHONE = '+212603477786';
const AGENCY_PHONE_HREF = 'tel:+212603477786';

const OUTCOMES = {
  paye: {
    titre: 'paiementRetour.resultats.paye.titre',
    description: 'paiementRetour.resultats.paye.description',
    Icon: CheckCircle2,
    tone: 'text-green-400',
    ring: 'border-green-500/20 bg-green-500/5',
  },
  echoue: {
    titre: 'paiementRetour.resultats.echoue.titre',
    description: 'paiementRetour.resultats.echoue.description',
    Icon: XCircle,
    tone: 'text-red-400',
    ring: 'border-red-500/20 bg-red-500/5',
  },
  annule: {
    titre: 'paiementRetour.resultats.annule.titre',
    description: 'paiementRetour.resultats.annule.description',
    Icon: Ban,
    tone: 'text-neutral-400',
    ring: 'border-neutral-500/20 bg-neutral-500/5',
  },
  expire: {
    titre: 'paiementRetour.resultats.expire.titre',
    description: 'paiementRetour.resultats.expire.description',
    Icon: Hourglass,
    tone: 'text-orange-400',
    ring: 'border-orange-500/20 bg-orange-500/5',
  },
  suspect: {
    titre: 'paiementRetour.resultats.suspect.titre',
    description: 'paiementRetour.resultats.suspect.description',
    Icon: ShieldAlert,
    tone: 'text-amber-400',
    ring: 'border-amber-500/20 bg-amber-500/5',
  },
  en_attente: {
    titre: 'paiementRetour.resultats.en_attente.titre',
    description: 'paiementRetour.resultats.en_attente.description',
    Icon: Hourglass,
    tone: 'text-yellow-400',
    ring: 'border-yellow-500/20 bg-yellow-500/5',
  },
  rembourse: {
    titre: 'paiementRetour.resultats.rembourse.titre',
    description: 'paiementRetour.resultats.rembourse.description',
    Icon: RotateCcw,
    tone: 'text-blue-400',
    ring: 'border-blue-500/20 bg-blue-500/5',
  },
  rembourse_partiel: {
    titre: 'paiementRetour.resultats.rembourse_partiel.titre',
    description: 'paiementRetour.resultats.rembourse_partiel.description',
    Icon: RotateCcw,
    tone: 'text-blue-400',
    ring: 'border-blue-500/20 bg-blue-500/5',
  },
  unknown: {
    titre: 'paiementRetour.resultats.unknown.titre',
    description: 'paiementRetour.resultats.unknown.description',
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
  const { t } = useTranslation();
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
      setError(err.response?.data?.message || t('paiementRetour.erreurs.relancer'));
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
      setError(t('paiementRetour.erreurs.facture'));
    } finally {
      setDownloading(false);
    }
  };

  if (!transactionId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md border border-neutral-500/20 bg-neutral-500/5 rounded-2xl p-8 text-center">
          <ShieldAlert size={30} className="text-neutral-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-white font-semibold text-xl mb-2">{t('paiementRetour.invalide.titre')}</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {t('paiementRetour.invalide.description')}
          </p>
          <Link
            to="/client/profil"
            className="inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {t('paiementRetour.invalide.voirReservations')}
            <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
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
            {t(outcome.titre)}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {t(outcome.description)}
          </p>

          {(checking || (!isTerminal && attempts < MAX_POLL_ATTEMPTS)) && (
            <p className="text-muted text-xs flex items-center justify-center gap-2 mb-4">
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              {checking
                ? t('paiementRetour.verification.enCours')
                : t('paiementRetour.verification.attenteBanque')}
            </p>
          )}

          {!isTerminal && attempts >= MAX_POLL_ATTEMPTS && !checking && (
            <p className="text-amber-400/90 text-xs mb-4 leading-relaxed">
              {t('paiementRetour.verification.delai')}
            </p>
          )}

          {detail && (
            <div className="bg-black/30 rounded-xl p-4 text-start space-y-2 mb-6">
              {detail.reservation_numero && (
                <Row label={t('paiementRetour.detail.reservation')} value={detail.reservation_numero} />
              )}
              <Row label={t('paiementRetour.detail.montant')} value={formatMAD(detail.montant || 0)} />
              {detail.rembourse_sur > 0 && (
                <Row label={t('paiementRetour.detail.rembourse')} value={formatMAD(detail.rembourse_sur)} />
              )}
              {detail.carte && <Row label={t('paiementRetour.detail.carte')} value={detail.carte} />}
              {detail.date_paiement && (
                <Row label={t('paiementRetour.detail.date')} value={formatDateTime(detail.date_paiement)} />
              )}
              <Row label={t('paiementRetour.detail.transaction')} value={transactionId} mono />
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
                {t('paiementRetour.actions.telechargerFacture')}
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
                {retrying ? t('paiementRetour.actions.ouverturePaiement') : t('paiementRetour.actions.reessayer')}
              </button>
            )}

            <Link
              to="/client/profil"
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {t('paiementRetour.actions.voirReservations')}
              <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
            </Link>

            <a
              href={AGENCY_PHONE_HREF}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Phone size={15} aria-hidden="true" />
              {t('paiementRetour.actions.contacter', { telephone: AGENCY_PHONE })}
            </a>
          </div>
        </div>

        <p className="text-muted text-xs text-center mt-5 leading-relaxed">
          {t('paiementRetour.note')}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`text-white font-medium text-end ${mono ? 'font-mono text-[10px] break-all' : ''}`}>
        {value}
      </span>
    </div>
  );
}
