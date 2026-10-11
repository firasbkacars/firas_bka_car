import { CheckCircle2, Clock, XCircle, Ban, Hourglass, ShieldAlert, RotateCcw } from 'lucide-react';

const STYLES = {
  en_attente: {
    label: 'En attente',
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    Icon: Clock,
  },
  paye: {
    label: 'Paye',
    className: 'bg-green-500/10 border-green-500/20 text-green-400',
    Icon: CheckCircle2,
  },
  echoue: {
    label: 'Echoue',
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
    Icon: XCircle,
  },
  annule: {
    label: 'Annule',
    className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
    Icon: Ban,
  },
  expire: {
    label: 'Expire',
    className: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    Icon: Hourglass,
  },
  suspect: {
    label: 'A verifier',
    className: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Icon: ShieldAlert,
  },
  rembourse: {
    label: 'Rembourse',
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Icon: RotateCcw,
  },
  rembourse_partiel: {
    label: 'Rembourse partiel',
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Icon: RotateCcw,
  },
};

/**
 * Badge d'etat de paiement.
 *
 * Les valeurs proviennent de `statut` (base) ou de `statut_affichage`
 * (derive : "rembourse" / "rembourse_partiel" sans casser l'historique).
 */
export default function StatutPaiement({ statut, className = '', showIcon = true }) {
  const conf = STYLES[statut] || {
    label: statut || 'Inconnu',
    className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
    Icon: Clock,
  };

  const { Icon } = conf;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${conf.className} ${className}`}
    >
      {showIcon && <Icon size={11} />}
      {conf.label}
    </span>
  );
}

export function montantSigne(paiement) {
  const m = parseFloat(paiement?.montant) || 0;
  return paiement?.type === 'remboursement' ? -Math.abs(m) : m;
}
