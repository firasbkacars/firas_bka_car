export const colors = {
  bg: '#0a0a0a',
  card: '#111',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  sub: '#888',
  dim: '#666',
  danger: '#dc2626',
  dangerLight: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const STATUS_COLORS = {
  confirmee: colors.warning,
  en_cours: colors.info,
  terminee: colors.success,
  annulee: colors.dangerLight,
};

export const STATUS_LABELS = {
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

export const PERMIS_COLORS = {
  en_attente: colors.warning,
  valide: colors.success,
  rejete: colors.dangerLight,
  expire: colors.dangerLight,
};

export const PERMIS_LABELS = {
  en_attente: 'En attente de validation',
  valide: 'Validé',
  rejete: 'Rejeté',
  expire: 'Expiré',
};
