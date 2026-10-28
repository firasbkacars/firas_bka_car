import i18n from '../i18n';

/**
 * Formats dependants de la langue active.
 *
 * Les montants restent en dirhams (DH / MAD / درهم) ; seuls les separateurs,
 * l'ordre des dates et le libelle de la devise changent.
 */
const LOCALES = {
  fr: 'fr-FR',
  ar: 'ar-MA',
  en: 'en-GB',
};

function localeCourante() {
  return LOCALES[i18n.language] || LOCALES.fr;
}

export function formatNumber(value, { decimals } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(localeCourante(), decimals === undefined
    ? undefined
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function formatMAD(value, { suffix, decimals = 2, withSuffix = true } = {}) {
  const n = Number(value);
  const formatted = Number.isFinite(n)
    ? new Intl.NumberFormat(localeCourante(), {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n)
    : '0';
  const devise = suffix ?? i18n.t('unites.dh');
  return withSuffix ? `${formatted} ${devise}` : formatted;
}

export function formatMADCompact(value, { suffix } = {}) {
  const n = Number(value);
  const devise = suffix ?? i18n.t('unites.dh');
  if (!Number.isFinite(n)) return `0 ${devise}`;
  if (Math.abs(n) >= 10000) {
    return `${new Intl.NumberFormat(localeCourante(), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)} ${devise}`;
  }
  return formatMAD(n, { suffix: devise });
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(localeCourante(), withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

export function formatDuration(jours) {
  const n = Number(jours) || 0;
  return i18n.t('dureeJours', { count: n });
}

/** Jours restants avant echeance (negatif = deja expire). */
export function joursRestants(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Un contrat non renseigne n'est jamais considere expire. */
export function contratExpire(value) {
  const j = joursRestants(value);
  return j !== null && j < 0;
}
