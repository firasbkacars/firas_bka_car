import { useState } from 'react';

export const FALLBACK_VEHICLE_IMAGE = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800&q=80';

/** Largeurs générées côté serveur par App\Support\VehicleImage. */
const WIDTHS = [320, 640, 960, 1280];

export function storagePhotoUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('/')) return path;

  return `/storage/${path}`;
}

export function photoSrcSet(path) {
  if (!path || path.startsWith('http') || path.startsWith('/')) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return null;

  const base = path.replace(/\.(jpe?g|png|webp)$/i, '');

  return WIDTHS
    .map((width) => `${storagePhotoUrl(`${base}-${width}.webp`)} ${width}w`)
    .join(', ');
}

/**
 * Photo de véhicule servie en WebP responsive.
 *
 * Le serveur génère les variantes 320/640/960/1280 à l'upload ; le navigateur
 * choisit la plus adaptée via `srcset`. Si les variantes manquent (poste local,
 * ancienne photo), l'image d'origine est utilisée. Un échec de chargement
 * bascule sur le visuel de secours, sans jamais casser la carte.
 *
 * `stage` : 0 = WebP, 1 = JPEG d'origine, 2 = visuel de secours. Les appelants
 * qui changent de photo doivent passer une `key` pour réinitialiser l'état.
 */
export default function VehiclePhoto({
  path,
  alt,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  loading = 'lazy',
  fetchPriority,
  onLoad,
}) {
  const [stage, setStage] = useState(0);

  const original = storagePhotoUrl(path);
  const src = stage >= 2 || !original ? FALLBACK_VEHICLE_IMAGE : original;
  const srcSet = stage === 0 ? photoSrcSet(path) : null;

  const handleError = () => setStage((current) => (current < 2 ? current + 1 : current));

  if (!srcSet) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        className={className}
        onLoad={onLoad}
        onError={handleError}
      />
    );
  }

  return (
    <picture className="contents">
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        className={className}
        onLoad={onLoad}
        onError={handleError}
      />
    </picture>
  );
}
