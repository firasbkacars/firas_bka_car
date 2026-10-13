const { test, expect } = require('@playwright/test');

test('la page d\'accueil affiche le hero et les vehicules populaires', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Louez la');
  await expect(page.getByRole('heading', { name: 'Vehicules populaires' })).toBeVisible();

  // Au moins un vehicule du seed est affiche.
  await expect(page.getByText('Dacia Duster').first()).toBeVisible();
});

test('le catalogue liste les vehicules', async ({ page }) => {
  await page.goto('/vehicules');

  await expect(page.getByText('Dacia Duster').first()).toBeVisible();
  await expect(page.getByText('SEAT').first()).toBeVisible();
});
