import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applySeo, ogLocale } from './seo';

/**
 * Synchronise le titre, la description, le canonical et les balises sociales
 * avec la page active et la langue courante.
 *
 * Les valeurs restent factuelles : elles viennent des fichiers seo.json ou de
 * l'API véhicule, jamais de données inventées.
 */
export function useSeo({
  title,
  description,
  canonical,
  robots = 'index, follow',
  image,
  type = 'website',
}) {
  const { i18n } = useTranslation();
  const langue = i18n.language;

  useEffect(() => {
    if (!title) return;

    applySeo({
      title,
      description,
      canonical,
      robots,
      image,
      type,
      locale: ogLocale(langue),
    });
  }, [title, description, canonical, robots, image, type, langue]);
}
