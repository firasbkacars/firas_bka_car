import {
  CheckCircle2, Clock, XCircle, Ban, Hourglass, ShieldAlert, RotateCcw, CircleDashed,
} from 'lucide-react';

const STYLES = {
  en_attente: {
    label: 'En attente',
    detail: 'Paiement en attente de confirmation par la banque.',
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    Icon: Clock,
  },
  paye: {
    label: 'Payé',
    detail: 'Paiement encaissé.',
    className: 'bg-green-500/10 border-green-500/20 text-green-400',
    Icon: CheckCircle2,
  },
  echoue: {
    label: 'Échoué',
    detail: 'Le paiement a été refusé. Un nouveau paiement peut être tenté.',
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
    Icon: XCircle,
  },
  annule: {
    label: 'Annulé',
    detail: 'Le paiement a été abandonné ou annulé avant confirmation.',
    className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
    Icon: Ban,
  },
  expire: {
    label: 'Expiré',
    detail: 'La session de paiement a expiré sans être confirmée.',
    className: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    Icon: Hourglass,
  },
  suspect: {
    label: 'À vérifier',
    detail: 'Le retour de la banque est incomplet ; le statut sera confirmé automatiquement.',
    className: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Icon: ShieldAlert,
  },
  rembourse: {
    label: 'Remboursé',
    detail: 'Montant intégralement remboursé au client.',
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Icon: RotateCcw,
  },
  rembourse_partiel: {
    label: 'Remboursé partiel',
    detail: 'Une partie du montant a été remboursée, le reste est conservé.',
    className: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    Icon: CircleDashed,
  },
};

const SIZES = {
  sm: { span: 'px-2 py-0.5 text-[10px] gap-1', icon: 11 },
  md: { span: 'px-2.5 py-1 text-xs gap-1.5', icon: 13 },
};

const UNKNOWN = {
  label: 'Statut inconnu',
  detail: "Statut non reconnu par l'interface.",
  className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
  Icon: Clock,
};

/**
 * Badge d'etat de paiement.
 *
 * Les valeurs proviennent de `statut` (base) ou de `statut_affichage`
 * (derive : "rembourse" / "rembourse_partiel" sans casser l'historique).
 *
 * L'icone est en aria-hidden : le libelle texte porte deja l'information
 * pour les lecteurs d'ecran, et `title` ajoute le detail au survol.
 */
export default function StatutPaiement({
  statut,
  className = '',
  showIcon = true,
  size = 'sm',
}) {
  const known = statut != null && Object.prototype.hasOwnProperty.call(STYLES, statut);
  const conf = known ? STYLES[statut] : UNKNOWN;
  const dim = SIZES[size] || SIZES.sm;

  const { Icon } = conf;
  const title = known ? conf.detail : `${conf.detail} (${statut || 'vide'})`;

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full font-medium border ${dim.span} ${conf.className} ${className}`}
    >
      {showIcon && <Icon size={dim.icon} aria-hidden="true" />}
      {conf.label}
    </span>
  );
}

export function montantSigne(paiement) {
  const m = parseFloat(paiement?.montant) || 0;
  return paiement?.type === 'remboursement' ? -Math.abs(m) : m;
}
