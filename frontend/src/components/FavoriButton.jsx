import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFavoris } from '../context/FavorisContext';

export default function FavoriButton({ vehiculeId, className = '' }) {
  const { t } = useTranslation();
  const { isFavori, toggle } = useFavoris();
  const active = isFavori(vehiculeId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(vehiculeId);
      }}
      aria-pressed={active}
      aria-label={active ? t('favoris.retirer') : t('favoris.ajouter')}
      className={`z-10 w-11 h-11 flex items-center justify-center transition-transform active:scale-95 ${className}`}
    >
      <span
        className={`w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 ${active ? 'text-primary-light' : 'text-white/70'}`}
      >
        <Heart size={16} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
      </span>
    </button>
  );
}
