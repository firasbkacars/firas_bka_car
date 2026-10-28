import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, Clock, XCircle, Ban, Hourglass, ShieldAlert, RotateCcw, CircleDashed,
} from 'lucide-react';

const STYLES = {
  en_attente: {
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    Icon: Clock,
  },
  paye: {
    className: 'bg-green-500/10 border-green-500/20 text-green-400',
    Icon: CheckCircle2,
  },
  echoue: {
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
    Icon: XCircle,
  },
  annule: {
    className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
    Icon: Ban,
  },
  expire: {
    className: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    Icon: Hourglass,
  },
  suspect: {
    className: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Icon: ShieldAlert,
  },
  rembourse: {
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Icon: RotateCcw,
  },
  rembourse_partiel: {
    className: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    Icon: CircleDashed,
  },
};

const SIZES = {
  sm: { span: 'px-2 py-0.5 text-[10px] gap-1', icon: 11 },
  md: { span: 'px-2.5 py-1 text-xs gap-1.5', icon: 13 },
};

const UNKNOWN = {
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
  const { t } = useTranslation();
  const known = statut != null && Object.prototype.hasOwnProperty.call(STYLES, statut);
  const conf = known ? STYLES[statut] : UNKNOWN;
  const dim = SIZES[size] || SIZES.sm;
  const cle = known ? statut : 'inconnu';

  const { Icon } = conf;
  const label = t(`statuts.paiement.${cle}.label`);
  const detail = t(`statuts.paiement.${cle}.detail`);
  const title = known ? detail : `${detail} (${statut || t('statuts.vide')})`;

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full font-medium border ${dim.span} ${conf.className} ${className}`}
    >
      {showIcon && <Icon size={dim.icon} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function montantSigne(paiement) {
  const m = parseFloat(paiement?.montant) || 0;
  return paiement?.type === 'remboursement' ? -Math.abs(m) : m;
}
