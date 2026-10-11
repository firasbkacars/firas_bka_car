import { Heart } from 'lucide-react';
import { useFavoris } from '../context/FavorisContext';

export default function FavoriButton({ vehiculeId, className = '' }) {
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
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 ${active ? 'text-[#dc2626]' : 'text-white/70'} ${className}`}
    >
      <Heart size={16} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
