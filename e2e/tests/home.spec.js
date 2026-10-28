const { test, expect } = require('@playwright/test');

test('la page d\'accueil affiche le hero et les vehicules populaires', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Louez la');
  await expect(page.getByRole('heading', { name: 'Véhicules populaires' })).toBeVisible();

  // Au moins un vehicule du seed est affiche.
  await expect(page.getByRole('heading', { name: 'Duster' }).first()).toBeVisible();
});

test('le catalogue liste les vehicules', async ({ page }) => {
  await page.goto('/vehicules');

  await expect(page.getByRole('heading', { name: 'Duster' }).first()).toBeVisible();
  await expect(page.getByText('SEAT').first()).toBeVisible();
});

test('le selecteur de langue applique l arabe en RTL', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Langue' }).first().click();
  await page.getByRole('menuitemradio', { name: 'العربية' }).click();

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('استأجر');
});
