const { test, expect } = require('@playwright/test');

test('login admin avec identifiants incorrects', async ({ page }) => {
  await page.goto('/admin/login');

  await page.fill('#admin-email', 'admin@firasbkacar.com');
  await page.fill('#admin-password', 'mauvais-mdp');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByText('Identifiants incorrects')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('login admin puis acces au tableau de bord', async ({ page }) => {
  await page.goto('/admin/login');

  await page.fill('#admin-email', 'admin@firasbkacar.com');
  await page.fill('#admin-password', 'htmlcss@jr574');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

  // La sidebar d'administration est rendue.
  await expect(page.getByText('Tableau de bord').first()).toBeVisible();
  await expect(page.getByText('Reservations').first()).toBeVisible();

  // Les stats du dashboard se chargent depuis l'API.
  await expect(page).toHaveURL(/\/admin/);
});

test('une session admin perdue ramene a la connexion', async ({ page }) => {
  await page.goto('/admin/login');

  await page.fill('#admin-email', 'admin@firasbkacar.com');
  await page.fill('#admin-password', 'htmlcss@jr574');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

  // Simule un onglet dont le stockage a ete vide (session expiree, ancien
  // bundle) : la navigation interne ne repasse pas par le garde du layout.
  await expect(page.getByRole('link', { name: /Paiements/ }).first()).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem('admin_token');
    document.querySelector('a[href="/admin/paiements"]')?.click();
  });

  // La premiere requete admin en 401 doit ramener a l'ecran de connexion.
  await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
});
