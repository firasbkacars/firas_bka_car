import { beforeEach, describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  applySeo,
  canonicalFor,
  DEFAULT_IMAGE,
  isPrivatePath,
  SITE_URL,
} from './seo';

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('isPrivatePath', () => {
  it('reconnait les espaces prives et transactionnels', () => {
    for (const path of [
      '/admin',
      '/admin/login',
      '/client/profil',
      '/reservation/9',
      '/confirmation',
      '/paiement/acompte/1',
      '/paiement/retour',
    ]) {
      expect(isPrivatePath(path), path).toBe(true);
    }
  });

  it('laisse les pages publiques indexables', () => {
    for (const path of ['/', '/vehicules', '/vehicules/9', '/services', '/contact', '/a-propos', '/vehicules/compare']) {
      expect(isPrivatePath(path), path).toBe(false);
    }
  });
});

describe('canonicalFor', () => {
  it('construit une URL absolue sans slash final', () => {
    expect(canonicalFor('/')).toBe(`${SITE_URL}/`);
    expect(canonicalFor('/vehicules/')).toBe(`${SITE_URL}/vehicules`);
    expect(canonicalFor('/vehicules/9')).toBe(`${SITE_URL}/vehicules/9`);
  });
});

describe('absoluteUrl', () => {
  it('convertit les chemins relatifs et conserve les URL absolues', () => {
    expect(absoluteUrl('/storage/vehicules/a.jpg')).toBe(`${SITE_URL}/storage/vehicules/a.jpg`);
    expect(absoluteUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(absoluteUrl(null)).toBeNull();
  });
});

describe('applySeo', () => {
  it('pose les balises attendues sans doublon', () => {
    document.head.innerHTML = `
      <title>Ancien titre</title>
      <meta name="description" content="ancienne description">
      <link rel="canonical" href="https://firasbkacar.com/ancienne">
    `;

    applySeo({
      title: 'Location de voiture à Tanger — FIRAS BKA CAR',
      description: 'Description de test.',
      canonical: `${SITE_URL}/vehicules`,
      robots: 'index, follow',
      image: DEFAULT_IMAGE,
      locale: 'fr_MA',
    });

    expect(document.title).toBe('Location de voiture à Tanger — FIRAS BKA CAR');
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]').content).toBe('Description de test.');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]').href).toBe(`${SITE_URL}/vehicules`);
    expect(document.querySelector('meta[property="og:title"]').content).toBe(document.title);
    expect(document.querySelector('meta[property="og:url"]').content).toBe(`${SITE_URL}/vehicules`);
    expect(document.querySelector('meta[name="twitter:card"]').content).toBe('summary_large_image');
    expect(document.querySelector('meta[name="robots"]').content).toBe('index, follow');
  });

  it('retire canonical et image sur une page privee', () => {
    document.head.innerHTML = `
      <link rel="canonical" href="https://firasbkacar.com/">
      <meta property="og:image" content="https://firasbkacar.com/images/hero-bg.jpg">
    `;

    applySeo({
      title: 'Espace privé — FIRAS BKA CAR',
      description: 'Espace réservé.',
      canonical: null,
      robots: 'noindex, nofollow',
      image: null,
      locale: 'fr_MA',
    });

    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:image"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:image"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
  });
});
