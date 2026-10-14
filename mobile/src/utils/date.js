export function parseDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  let d = null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

export function toISO(d) {
  if (!d) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(input) {
  const d = input instanceof Date ? input : parseDate(input);
  if (!d) return String(input ?? '');
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function joursEntre(debut, fin) {
  const a = debut instanceof Date ? debut : parseDate(debut);
  const b = fin instanceof Date ? fin : parseDate(fin);
  if (!a || !b) return 0;
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  if (ms <= 0) return 0;
  return Math.round(ms / 86400000);
}

export function formatMAD(valeur) {
  const n = Number(valeur ?? 0);
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`;
}
