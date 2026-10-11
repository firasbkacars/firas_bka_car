const MAD = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat('fr-FR');

export function formatNumber(value, { decimals } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return decimals === undefined ? NUM.format(n) : MAD.format(n);
}

export function formatMAD(value, { suffix = 'DH', decimals = 2, withSuffix = true } = {}) {
  const n = Number(value);
  const formatted = Number.isFinite(n)
    ? new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n)
    : '0';
  return withSuffix ? `${formatted} ${suffix}` : formatted;
}

export function formatMADCompact(value, { suffix = 'DH' } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `0 ${suffix}`;
  if (Math.abs(n) >= 10000) {
    return `${new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)} ${suffix}`;
  }
  return formatMAD(n, { suffix });
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

export function formatDuration(jours) {
  const n = Number(jours) || 0;
  return `${formatNumber(n)} jour${n > 1 ? 's' : ''}`;
}
