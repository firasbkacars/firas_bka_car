const { test, expect } = require('@playwright/test');

const SITE = 'https://firasbkacar.com';

test.describe('metadonnees SEO', () => {
  test('accueil : titre, canonical, robots et H1 lisible', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Location de voiture à Tanger — FIRAS BKA CAR');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Location de voiture à Tanger — FIRAS BKA CAR'
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${SITE}/`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

    const h1 = await page.locator('h1').first().evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
    expect(h1).toBe('Louez la voiture qui vous correspond');
  });

  test('chaque page publique a un titre et un canonical uniques', async ({ page }) => {
    const pages = [
      { path: '/vehicules', title: 'Nos véhicules de location à Tanger — FIRAS BKA CAR', canonical: `${SITE}/vehicules` },
      { path: '/services', title: 'Services de location de voiture à Tanger — FIRAS BKA CAR', canonical: `${SITE}/services` },
      { path: '/a-propos', title: 'À propos de FIRAS BKA CAR — Agence de location à Tanger', canonical: `${SITE}/a-propos` },
      { path: '/contact', title: 'Contact — FIRAS BKA CAR Tanger', canonical: `${SITE}/contact` },
    ];

    for (const { path, title, canonical } of pages) {
      await page.goto(path);
      await expect(page, path).toHaveTitle(title);
      await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute('href', canonical);
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'index, follow');
    }
  });

  test('la fiche vehicule expose les faits de l API', async ({ page }) => {
    await page.goto('/vehicules/1');

    await expect(page).toHaveTitle('Location Dacia Duster à Tanger — 400 MAD/jour');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/vehicules/1`);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Dacia Duster 2023');
    expect(description).toContain('400 MAD/jour');
  });

  test('le comparateur est noindex mais suivi', async ({ page }) => {
    await page.goto('/vehicules/compare');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

  test('les espaces prives sont noindex et sans canonical', async ({ page }) => {
    for (const path of ['/admin/login', '/client/login', '/client/profil']) {
      await page.goto(path);

      await expect(page, path).toHaveTitle('Espace privé — FIRAS BKA CAR');
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex, nofollow');
      await expect(page.locator('link[rel="canonical"]'), path).toHaveCount(0);
    }
  });

  test('une route inconnue est noindex', async ({ page }) => {
    await page.goto('/route-qui-nexiste-pas');

    await expect(page).toHaveTitle('Page introuvable — FIRAS BKA CAR');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('les metadonnees suivent la langue arabe', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('langue', 'ar'));
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page).toHaveTitle('كراء السيارات في طنجة — FIRAS BKA CAR');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ar_MA');
  });
});
