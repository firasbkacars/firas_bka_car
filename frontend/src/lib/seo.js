/**
 * Métadonnées SEO côté client.
 *
 * Le serveur injecte déjà les balises dans le HTML initial (voir
 * backend/app/Support/Seo.php) pour les crawlers qui n'exécutent pas
 * JavaScript. Ce module met à jour ces mêmes balises lors de la navigation
 * React et du changement de langue, sans jamais créer de doublons.
 */

export const SITE_URL = 'https://firasbkacar.com';
export const DEFAULT_IMAGE = `${SITE_URL}/images/og-default.jpg`;

const OG_LOCALES = {
  fr: 'fr_MA',
  ar: 'ar_MA',
  en: 'en_US',
};

export function ogLocale(langue) {
  return OG_LOCALES[langue] || OG_LOCALES.fr;
}

/** Routes privées ou transactionnelles : jamais indexées. */
export function isPrivatePath(pathname = '/') {
  const path = pathname.replace(/\/+$/, '') || '/';

  return (
    path === '/confirmation'
    || path === '/admin'
    || path.startsWith('/admin/')
    || path === '/client'
    || path.startsWith('/client/')
    || path.startsWith('/reservation/')
    || path.startsWith('/paiement/')
  );
}

/** URL canonique absolue, sans query string ni slash final. */
export function canonicalFor(pathname = '/') {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${path}`;
}

/** Rend une URL d'asset absolue (les photos véhicules sont relatives). */
export function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function setMeta(attribute, key, content) {
  const nodes = document.head.querySelectorAll(`meta[${attribute}="${key}"]`);

  if (content === null || content === undefined || content === '') {
    nodes.forEach((node) => node.remove());
    return;
  }

  let node = nodes[0];
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);

  for (let i = 1; i < nodes.length; i += 1) {
    nodes[i].remove();
  }
}

function setCanonical(href) {
  const nodes = document.head.querySelectorAll('link[rel="canonical"]');

  if (!href) {
    nodes.forEach((node) => node.remove());
    return;
  }

  let node = nodes[0];
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);

  for (let i = 1; i < nodes.length; i += 1) {
    nodes[i].remove();
  }
}

/**
 * Applique les métadonnées d'une page.
 *
 * @param {object} meta
 * @param {string} meta.title
 * @param {string} [meta.description]
 * @param {string|null} [meta.canonical] - null retire le canonical (page privée).
 * @param {string} [meta.robots]
 * @param {string|null} [meta.image] - null retire les images sociales.
 * @param {string} [meta.type]
 * @param {string} [meta.locale]
 */
export function applySeo({
  title,
  description,
  canonical,
  robots = 'index, follow',
  image = DEFAULT_IMAGE,
  type = 'website',
  locale = OG_LOCALES.fr,
}) {
  if (typeof document === 'undefined' || !title) return;

  document.title = title;
  setMeta('name', 'description', description);
  setCanonical(canonical);
  setMeta('name', 'robots', robots);

  setMeta('property', 'og:site_name', 'FIRAS BKA CAR');
  setMeta('property', 'og:locale', locale);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:image', image);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
}
