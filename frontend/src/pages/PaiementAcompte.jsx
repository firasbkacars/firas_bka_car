import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertCircle, Banknote, Car, Check, CheckCircle2, Copy, FileText,
  Landmark, Loader2, Lock, MapPin, MessageCircle, Phone, Send, UploadCloud, Wallet,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMAD } from '../lib/formatters';

const AGENCY_PHONE = '+212774623448';
const AGENCY_PHONE_LABEL = '+212 774 623 448';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];

function formatTaille(octets) {
  const n = Number(octets);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function messageErreur(err) {
  const data = err.response?.data;
  const premiereErreur = data?.errors ? Object.values(data.errors)[0]?.[0] : null;

  return premiereErreur || data?.message || 'Envoi impossible. Verifiez votre connexion et reessayez.';
}

function SquelettePaiement() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only">Chargement du paiement de l'acompte...</span>
      <div className="mb-8 animate-pulse space-y-3">
        <div className="h-3 w-28 rounded bg-white/[0.06]" />
        <div className="h-10 w-72 rounded bg-white/[0.06]" />
        <div className="h-4 w-full max-w-xl rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface" />
        </div>
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
          <div className="h-80 animate-pulse rounded-2xl border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}

/** Bandeau d'etat : repond immediatement a "combien dois-je payer ?". */
function BandeauEtat({ etat, montant }) {
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${etat.classes}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <etat.icone size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">{etat.surtitre}</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{etat.titre}</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{etat.description}</p>
          </div>
        </div>
        {montant !== null && (
          <div className="shrink-0 sm:text-right">
            <p className="text-xs text-muted">{etat.legendeMontant}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{formatMAD(montant)}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function BoutonsAgence({ telephone, telephoneAffiche }) {
  const tel = String(telephone || AGENCY_PHONE).replace(/\s+/g, '');

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`tel:${tel}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface-raised px-4 text-sm font-semibold text-white transition-colors hover:bg-surface-hover"
      >
        <Phone size={16} aria-hidden="true" />
        {telephoneAffiche || telephone || AGENCY_PHONE_LABEL}
      </a>
      <a
        href={`https://wa.me/${tel.replace(/^\+/, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 text-sm font-semibold text-success transition-colors hover:bg-success/15"
      >
        <MessageCircle size={16} aria-hidden="true" />
        WhatsApp
      </a>
    </div>
  );
}

/**
 * Aucun moyen en ligne configure : une seule action claire, le reglement a
 * l'agence. Aucun champ d'envoi ni bouton desactive n'est affiche.
 */
function PaiementAgence({ reservation, montant, taux, agence }) {
  const adresse = [agence?.adresse, agence?.ville].filter(Boolean).join(', ');

  return (
    <section
      id="paiement-agence"
      aria-labelledby="titre-paiement-agence"
      className="rounded-2xl border border-warning/25 bg-surface p-5 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <Wallet size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id="titre-paiement-agence" className="text-lg font-semibold text-white sm:text-xl">
            Régler l'acompte à l'agence
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Votre réservation est bien enregistrée. Aucun paiement en ligne n'est disponible
            pour le moment : présentez-vous à l'agence pour régler l'acompte et confirmer
            votre réservation.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-dark-bg p-4">
          <p className="text-xs text-muted">Montant à régler</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary-light">{formatMAD(montant)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {taux > 0 ? `Acompte de ${taux} % du total. ` : ''}
            Le reste de la location se règle à la prise en charge.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-dark-bg p-4">
          <p className="text-xs text-muted">Agence</p>
          <p className="mt-1 text-sm font-semibold text-white">{agence?.nom || 'FIRAS BKA CAR'}</p>
          {adresse && (
            <p className="mt-1 flex items-start gap-1.5 text-sm leading-relaxed text-muted">
              <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {adresse}
            </p>
          )}
          <p className="mt-2 font-mono text-xs text-muted">Réservation {reservation.numero}</p>
        </div>
      </div>

      <ol className="mt-5 space-y-2.5 text-sm leading-relaxed text-muted">
        <li className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-white">1</span>
          Présentez-vous à l'agence avec votre numéro de réservation.
        </li>
        <li className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-white">2</span>
          Réglez l'acompte de {formatMAD(montant)} directement sur place.
        </li>
        <li className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-white">3</span>
          L'agence enregistre le paiement : votre acompte passe en « validé ».
        </li>
      </ol>

      <div className="mt-5">
        <BoutonsAgence
          telephone={agence?.telephone}
          telephoneAffiche={agence?.telephone || AGENCY_PHONE_LABEL}
        />
      </div>
    </section>
  );
}

function CarteMoyen({ actif, icone: Icone, titre, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex min-h-11 flex-1 flex-col gap-2 rounded-2xl border p-5 text-left transition-colors ${
        actif
          ? 'border-primary bg-primary/10'
          : 'border-line bg-dark-bg hover:border-line-strong'
      }`}
    >
      <Icone size={24} className={actif ? 'text-primary-light' : 'text-muted'} aria-hidden="true" />
      <span className="text-base font-semibold text-white">{titre}</span>
      <span className="text-sm leading-snug text-muted">{description}</span>
    </button>
  );
}

function CoordonneesVirement({ coordonnees, montant, numero, onCopier, copie }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-white sm:text-xl">Coordonnées bancaires de l'agence</h2>

      <div className="mt-5 rounded-xl border border-line bg-dark-bg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">RIB (24 chiffres)</p>
            <p className="mt-1 break-all font-mono text-lg font-semibold tracking-wider text-white sm:text-xl">
              {coordonnees.rib}
            </p>
          </div>
          <button
            type="button"
            onClick={onCopier}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface-raised px-4 text-sm font-semibold text-white transition-colors hover:bg-surface-hover"
          >
            {copie ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copie ? 'Copié' : 'Copier le RIB'}
          </button>
          <span className="sr-only" aria-live="polite">
            {copie ? 'RIB copié dans le presse-papiers.' : ''}
          </span>
        </div>

        <div className="my-4 h-px bg-line" />

        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Bénéficiaire</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{coordonnees.beneficiaire}</dd>
          </div>
          {coordonnees.banque && (
            <div>
              <dt className="text-xs text-muted">Banque</dt>
              <dd className="mt-1 text-sm font-semibold text-white">{coordonnees.banque}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted">Montant exact</dt>
            <dd className="mt-1 text-sm font-semibold text-primary-light">{formatMAD(montant)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-semibold text-danger">Motif du virement obligatoire</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Indiquez votre numéro de réservation{' '}
          <strong className="font-mono text-white">{numero}</strong>{' '}
          dans le motif pour que l'agence retrouve votre paiement.
        </p>
      </div>
    </section>
  );
}

function CoordonneesWafacash({ coordonnees, montant, numero }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-white sm:text-xl">
        Transfert en agence Wafacash ou Cash Plus
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Aucun compte bancaire nécessaire : déposez l'espèces dans n'importe quelle agence
        de transfert avec les informations ci-dessous.
      </p>

      <dl className="mt-5 grid gap-4 rounded-xl border border-line bg-dark-bg p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Bénéficiaire</dt>
          <dd className="mt-1 text-sm font-semibold text-white">{coordonnees.beneficiaire}</dd>
        </div>
        {coordonnees.cin && (
          <div>
            <dt className="text-xs text-muted">N° CIN</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{coordonnees.cin}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Téléphone</dt>
          <dd className="mt-1 text-sm font-semibold text-white">{coordonnees.telephone}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Montant exact</dt>
          <dd className="mt-1 text-sm font-semibold text-primary-light">{formatMAD(montant)}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-semibold text-danger">Conservez le reçu papier</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Prenez-le en photo et envoyez-le ci-dessous avec votre numéro de réservation{' '}
          <strong className="font-mono text-white">{numero}</strong>.
        </p>
      </div>
    </section>
  );
}

export default function PaiementAcompte() {
  const { numero } = useParams();
  const { token } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [methode, setMethode] = useState('');
  const [fichier, setFichier] = useState(null);
  const [fileError, setFileError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get(`/client/reservations/${encodeURIComponent(numero)}/acompte`)
      .then(({ data: payload }) => {
        if (cancelled) return;
        setData(payload);

        // On ne selectionne qu'un moyen reellement disponible. L'ancien
        // comportement forcait "virement" meme quand rien n'etait configure,
        // ce qui affichait un bouton d'envoi desactive en bas de page.
        const disponibles = Array.isArray(payload.paiement?.moyens_disponibles)
          ? payload.paiement.moyens_disponibles
          : [
            payload.coordonnees?.virement?.disponible ? 'virement' : null,
            payload.coordonnees?.wafacash?.disponible ? 'wafacash' : null,
          ].filter(Boolean);

        const methodeRecu = payload.recu?.methode;
        setMethode(
          methodeRecu && disponibles.includes(methodeRecu)
            ? methodeRecu
            : (disponibles[0] || '')
        );
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setError('Réservation introuvable. Vérifiez le numéro ou connectez-vous avec le compte qui a réservé.');
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Connectez-vous avec le compte qui a effectué cette réservation pour payer l\'acompte.');
        } else {
          setError('Impossible de charger cette réservation pour le moment.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [numero, token]);

  const reservation = data?.reservation;
  const coordonnees = data?.coordonnees;
  const recu = data?.recu;
  const agence = data?.paiement?.agence || null;

  const moyensDisponibles = useMemo(() => {
    if (Array.isArray(data?.paiement?.moyens_disponibles)) {
      return data.paiement.moyens_disponibles;
    }

    return [
      data?.coordonnees?.virement?.disponible ? 'virement' : null,
      data?.coordonnees?.wafacash?.disponible ? 'wafacash' : null,
    ].filter(Boolean);
  }, [data]);

  const aucunMoyenEnLigne = moyensDisponibles.length === 0;
  const methodeDisponible = moyensDisponibles.includes(methode);

  const acomptePaye = Number(reservation?.acompte_paye || 0);
  const acompteTotal = Number(reservation?.acompte || 0);
  const acompteRestant = Number(reservation?.acompte_restant || 0);
  const reservationAnnulee = reservation?.statut === 'annulee';
  const sansAcompte = Boolean(reservation) && acompteTotal <= 0;
  const acompteRegle = Boolean(reservation) && !sansAcompte && acompteRestant <= 0.009;
  const paiementPartiel = acomptePaye > 0 && !acompteRegle;

  // Montant reellement du : le restant, jamais le total deja regle.
  const montantACompleter = acompteRestant;
  const montantAffiche = acompteRegle ? acompteTotal : montantACompleter;
  const tauxAcompte = Number(reservation?.taux_acompte || 0);
  const resteApresAcompte = Number(reservation?.reste_apres_acompte || 0);

  const photo = reservation?.vehicule?.photo;
  const photoSrc = photo && !photo.startsWith('http') && !photo.startsWith('/')
    ? `/storage/${photo}`
    : photo;

  const etat = useMemo(() => {
    if (!reservation) return null;

    if (reservationAnnulee) {
      return {
        surtitre: 'Paiement clos',
        titre: 'Réservation annulée',
        description: 'Aucun acompte ne peut être réglé pour cette réservation. Contactez l\'agence si un paiement a déjà été effectué.',
        legendeMontant: '',
        classes: 'border-danger/20 bg-danger/10 text-danger',
        icone: AlertCircle,
      };
    }

    if (sansAcompte) {
      return {
        surtitre: 'Aucun montant à régler',
        titre: 'Aucun acompte requis',
        description: 'Cette réservation ne demande pas d\'acompte. Le règlement se fait à la prise en charge.',
        legendeMontant: 'Acompte',
        classes: 'border-success/20 bg-success/10 text-success',
        icone: CheckCircle2,
      };
    }

    if (acompteRegle) {
      return {
        surtitre: 'Paiement confirmé',
        titre: 'Acompte validé',
        description: 'Votre acompte a été confirmé par l\'agence. Le reste de la location est à régler à la prise en charge.',
        legendeMontant: 'Acompte validé',
        classes: 'border-success/20 bg-success/10 text-success',
        icone: CheckCircle2,
      };
    }

    if (recu) {
      return {
        surtitre: 'Vérification en cours',
        titre: 'Reçu en cours de vérification',
        description: 'Votre justificatif a bien été reçu. L\'agence contrôle le paiement avant de valider l\'acompte.',
        legendeMontant: paiementPartiel ? 'Reste à vérifier' : 'Acompte déclaré',
        classes: 'border-info/20 bg-info/10 text-info',
        icone: FileText,
      };
    }

    if (aucunMoyenEnLigne) {
      return {
        surtitre: 'Action requise',
        titre: 'Acompte à régler à l\'agence',
        description: 'Aucun paiement en ligne n\'est disponible. Présentez-vous à l\'agence pour régler l\'acompte et confirmer votre réservation.',
        legendeMontant: 'Montant à régler',
        classes: 'border-warning/20 bg-warning/10 text-warning',
        icone: Wallet,
      };
    }

    return {
      surtitre: 'Action requise',
      titre: 'Acompte à payer',
      description: 'Choisissez un mode de paiement, effectuez le règlement puis envoyez votre justificatif.',
      legendeMontant: paiementPartiel ? 'Reste à payer' : 'Acompte à payer',
      classes: 'border-warning/20 bg-warning/10 text-warning',
      icone: AlertCircle,
    };
  }, [reservation, reservationAnnulee, sansAcompte, acompteRegle, recu, aucunMoyenEnLigne, paiementPartiel]);

  const etapes = useMemo(() => {
    const etatCourant = acompteRegle ? 3 : recu ? 2 : 1;

    return [
      {
        titre: 'Réservation enregistrée',
        description: 'Vos informations et votre véhicule sont enregistrés.',
      },
      {
        titre: aucunMoyenEnLigne
          ? 'Paiement à l\'agence'
          : recu
            ? 'Reçu en cours de vérification'
            : 'Reçu à envoyer',
        description: aucunMoyenEnLigne
          ? 'Présentez-vous à l\'agence pour régler l\'acompte.'
          : recu
            ? 'L\'agence contrôle votre paiement.'
            : 'Ajoutez votre justificatif de paiement.',
      },
      {
        titre: 'Acompte validé par l\'agence',
        description: 'Le paiement est confirmé et rattaché à votre réservation.',
      },
      {
        titre: 'Prise en charge du véhicule',
        description: 'Le reste de la location est réglé à l\'agence.',
      },
    ].map((etape, index) => ({
      ...etape,
      etat: index < etatCourant ? 'fait' : index === etatCourant ? 'courant' : 'a_venir',
    }));
  }, [acompteRegle, recu, aucunMoyenEnLigne]);

  const copierRib = async () => {
    const rib = coordonnees?.virement?.rib;
    if (!rib) return;

    try {
      await navigator.clipboard.writeText(String(rib).replace(/\s+/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponible (contexte non securise) : le RIB reste lisible
      // a l'ecran, aucune action bloquante.
    }
  };

  const choisirFichier = (event) => {
    const fichierChoisi = event.target.files?.[0];
    setFileError('');
    setSubmitError('');
    setSent(false);

    if (!fichierChoisi) {
      setFichier(null);
      return;
    }

    const extension = fichierChoisi.name.split('.').pop()?.toLowerCase() || '';
    const typeAccepte = ACCEPTED_MIME.includes(fichierChoisi.type)
      || ACCEPTED_EXTENSIONS.includes(extension);

    if (!typeAccepte) {
      setFichier(null);
      setFileError('Format non accepté : envoyez un JPG, PNG ou PDF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (fichierChoisi.size > MAX_FILE_SIZE) {
      setFichier(null);
      setFileError('Le justificatif dépasse 5 Mo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFichier(fichierChoisi);
  };

  const envoyerRecu = async (event) => {
    event.preventDefault();

    if (!fichier || submitting || acompteRegle || sansAcompte || reservationAnnulee) return;

    if (!methodeDisponible) {
      setSubmitError('Choisissez un mode de paiement disponible. Contactez l\'agence si besoin.');
      return;
    }

    const formData = new FormData();
    formData.append('recu', fichier);
    formData.append('methode', methode);

    setSubmitting(true);
    setSubmitError('');

    try {
      const { data: payload } = await api.post(
        `/client/reservations/${encodeURIComponent(numero)}/acompte/recu`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setData(payload.acompte);
      setFichier(null);
      setSent(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setSubmitError(messageErreur(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface">
          <Lock size={28} className="text-primary-light" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-white">Payer l'acompte</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Connectez-vous avec le compte qui a effectué la réservation
          {numero ? <> <span className="font-mono text-white">{numero}</span></> : null} pour
          consulter le montant et envoyer votre justificatif.
        </p>
        <Link
          to="/client/login"
          state={{ from: `${location.pathname}${location.search}` }}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Se connecter
        </Link>
        <Link to="/vehicules" className="mt-3 text-sm text-muted transition-colors hover:text-white">
          Retour aux véhicules
        </Link>
      </div>
    );
  }

  if (loading) {
    return <SquelettePaiement />;
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-24 text-center">
        <div className="rounded-2xl border border-danger/20 bg-danger/10 p-8">
          <AlertCircle size={32} className="mx-auto mb-3 text-danger" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-white">Paiement indisponible</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {error || 'Réservation introuvable.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/client/profil"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Mes réservations
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-white transition-colors hover:bg-surface-hover"
            >
              Contacter l'agence
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const afficherFormulaire = !reservationAnnulee && !sansAcompte && !acompteRegle && !aucunMoyenEnLigne;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Fil d'Ariane">
        <Link to="/" className="transition-colors hover:text-white">Accueil</Link>
        <span aria-hidden="true">/</span>
        <Link to="/client/profil" className="transition-colors hover:text-white">Mes réservations</Link>
        <span aria-hidden="true">/</span>
        <span className="text-white" aria-current="page">Payer l'acompte</span>
      </nav>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-light">
          Étape 3 sur 3
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Payer l'acompte
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          L'acompte confirme votre réservation. Le reste de la location et la caution
          se règlent à la prise en charge.
        </p>
      </header>

      <div className="mb-6">
        <BandeauEtat etat={etat} montant={etat.legendeMontant && !sansAcompte ? montantAffiche : null} />
      </div>

      <form onSubmit={envoyerRecu}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            {reservationAnnulee && (
              <section className="rounded-2xl border border-danger/20 bg-surface p-5 sm:p-7">
                <h2 className="text-lg font-semibold text-white">Réservation annulée</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Le suivi de l'acompte est clos pour cette réservation. Si un paiement a déjà
                  été effectué, contactez l'agence pour connaître les modalités de remboursement.
                </p>
                <div className="mt-5">
                  <BoutonsAgence
                    telephone={agence?.telephone}
                    telephoneAffiche={agence?.telephone || AGENCY_PHONE_LABEL}
                  />
                </div>
              </section>
            )}

            {!reservationAnnulee && sansAcompte && (
              <section className="rounded-2xl border border-success/20 bg-surface p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Aucun acompte à payer</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Cette réservation ne demande pas d'acompte. Présentez-vous à l'agence
                      à la date prévue : le règlement se fait à la prise en charge.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {!reservationAnnulee && acompteRegle && (
              <section className="rounded-2xl border border-success/20 bg-surface p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Acompte validé</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Votre acompte a été confirmé par l'agence. Le reste de la location
                      est à régler à la prise en charge.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {!reservationAnnulee && !sansAcompte && !acompteRegle && aucunMoyenEnLigne && (
              <PaiementAgence
                reservation={reservation}
                montant={montantACompleter}
                taux={tauxAcompte}
                agence={agence}
              />
            )}

            {afficherFormulaire && (
              <>
                <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
                  <h2 className="text-lg font-semibold text-white sm:text-xl">Mode de paiement de l'acompte</h2>
                  <p className="mt-1 text-sm text-muted">
                    Seuls les moyens disponibles pour cette réservation sont affichés.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {moyensDisponibles.includes('virement') && (
                      <CarteMoyen
                        actif={methode === 'virement'}
                        icone={Landmark}
                        titre="Virement bancaire"
                        description="Depuis votre application bancaire"
                        onClick={() => { setMethode('virement'); setSubmitError(''); }}
                      />
                    )}
                    {moyensDisponibles.includes('wafacash') && (
                      <CarteMoyen
                        actif={methode === 'wafacash'}
                        icone={Banknote}
                        titre="Wafacash / Cash Plus"
                        description="Dépôt en espèces en agence de transfert"
                        onClick={() => { setMethode('wafacash'); setSubmitError(''); }}
                      />
                    )}
                  </div>
                </section>

                {methode === 'virement' && coordonnees?.virement?.disponible && (
                  <CoordonneesVirement
                    coordonnees={coordonnees.virement}
                    montant={montantACompleter}
                    numero={reservation.numero}
                    onCopier={copierRib}
                    copie={copied}
                  />
                )}

                {methode === 'wafacash' && coordonnees?.wafacash?.disponible && (
                  <CoordonneesWafacash
                    coordonnees={coordonnees.wafacash}
                    montant={montantACompleter}
                    numero={reservation.numero}
                  />
                )}

                <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">Justificatif de paiement</h2>
                      <p className="mt-1 text-sm text-muted">JPG, PNG ou PDF, 5 Mo maximum.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-medium text-info">
                      {recu ? 'Reçu en vérification' : 'Reçu à envoyer'}
                    </span>
                  </div>

                  <label
                    className={`relative mt-5 flex min-h-[140px] cursor-pointer items-center justify-center rounded-2xl p-6 transition-colors ${
                      fichier || recu
                        ? 'border border-success/40 bg-success/10'
                        : 'border-2 border-dashed border-line-strong bg-dark-bg hover:border-primary/60'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={choisirFichier}
                      aria-label="Choisir le reçu de paiement"
                      aria-describedby={fileError ? 'recu-erreur' : undefined}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />

                    {fichier ? (
                      <span className="flex min-w-0 items-center gap-3">
                        <FileText size={28} className="shrink-0 text-success" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{fichier.name}</span>
                          <span className="block text-sm text-muted">
                            {formatTaille(fichier.size)} · Touchez pour remplacer le fichier
                          </span>
                        </span>
                      </span>
                    ) : recu ? (
                      <span className="flex min-w-0 items-center gap-3">
                        <CheckCircle2 size={28} className="shrink-0 text-success" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{recu.nom}</span>
                          <span className="block text-sm text-muted">
                            Reçu envoyé le {formatDate(recu.envoye_le, { withTime: true })} · Touchez pour remplacer
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-center">
                        <UploadCloud size={32} className="text-primary-light" aria-hidden="true" />
                        <span className="text-sm font-semibold text-white sm:text-base">
                          Ajouter la photo ou le PDF du reçu
                        </span>
                        <span className="text-sm text-muted">JPG, PNG ou PDF, 5 Mo maximum</span>
                      </span>
                    )}
                  </label>

                  {fileError && (
                    <p id="recu-erreur" role="alert" className="mt-2 text-sm text-danger">
                      {fileError}
                    </p>
                  )}
                  {recu && !fichier && (
                    <p className="mt-2 text-xs text-muted">
                      Un reçu est déjà enregistré. Sélectionnez un fichier pour le remplacer.
                    </p>
                  )}

                  {sent && (
                    <div
                      className="mt-4 rounded-xl border border-success/20 bg-success/10 p-4"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="text-sm font-semibold text-success">Reçu envoyé</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        Votre justificatif est en attente de validation. Vous pouvez
                        remplacer le fichier tant que l'acompte n'est pas confirmé.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                      {submitError}
                    </p>
                  )}

                  {/* L'action principale est ici, juste sous le fichier : plus de
                      bouton grise tout en bas de la page. */}
                  <button
                    type="submit"
                    disabled={!fichier || submitting || !methodeDisponible}
                    className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send size={18} aria-hidden="true" />
                        {recu ? 'Envoyer un nouveau reçu' : 'Envoyer le reçu'}
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                    Un reçu envoyé ne vaut pas paiement : l'agence vérifie l'opération avant
                    de valider l'acompte.
                  </p>
                </section>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Récapitulatif</h2>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${etat.classes}`}>
                  {etat.titre}
                </span>
              </div>

              {reservation.vehicule && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-dark-bg p-3">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={`${reservation.vehicule.marque} ${reservation.vehicule.modele}`}
                      loading="lazy"
                      className="h-14 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                      <Car size={22} className="text-muted" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {reservation.vehicule.marque} {reservation.vehicule.modele}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(reservation.date_debut)} → {formatDate(reservation.date_fin)}
                    </p>
                  </div>
                </div>
              )}

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Réservation</dt>
                  <dd className="text-right font-mono font-semibold text-white">{reservation.numero}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Total de la location</dt>
                  <dd className="text-right font-semibold text-white">{formatMAD(reservation.prix_total)}</dd>
                </div>
                <div className="h-px bg-line" />
                {paiementPartiel && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-success">Déjà réglé</dt>
                    <dd className="text-right font-semibold text-success">-{formatMAD(acomptePaye)}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-white">
                    {paiementPartiel
                      ? 'Reste de l\'acompte'
                      : `Acompte${tauxAcompte > 0 ? ` (${tauxAcompte} %)` : ''}`}
                  </dt>
                  <dd className="text-right text-base font-bold text-primary-light">
                    {formatMAD(montantAffiche)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Reste à payer à la prise en charge</dt>
                  <dd className="text-right font-semibold text-white">{formatMAD(resteApresAcompte)}</dd>
                </div>
              </dl>
            </section>

            {!reservationAnnulee && !sansAcompte && (
              <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
                <h2 className="text-lg font-semibold text-white">Statut de la réservation</h2>
                <ol className="mt-5 space-y-5" aria-label="Étapes de la réservation">
                  {etapes.map((etape, index) => (
                    <li
                      key={etape.titre}
                      className="flex items-start gap-3.5"
                      aria-current={etape.etat === 'courant' ? 'step' : undefined}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          etape.etat === 'fait'
                            ? 'bg-success text-white'
                            : etape.etat === 'courant'
                              ? 'bg-primary text-white'
                              : 'border border-line-strong bg-surface-raised text-muted'
                        }`}
                        aria-hidden="true"
                      >
                        {etape.etat === 'fait' ? <Check size={14} /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold ${
                          etape.etat === 'a_venir' ? 'text-muted' : 'text-white'
                        }`}>
                          {etape.titre}
                        </span>
                        <span className="mt-0.5 block text-sm leading-snug text-muted">
                          {etape.description}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
