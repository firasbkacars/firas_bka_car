const { test, expect } = require('@playwright/test');

let seq = 0;
function uniqueEmail() {
  seq += 1;
  return `e2e.client${Date.now()}${seq}@example.com`;
}
function uniquePhone() {
  seq += 1;
  // Les 10 dernieres chiffres : uniques, hors plages du seed (0612345678, 0698765432...).
  return `06${String(Date.now()).slice(-6)}${String(seq % 10)}0`.slice(0, 10);
}

test.describe('inscription client', () => {
  test('rejecte un CIN invalide (chiffres seuls)', async ({ page }) => {
    await page.goto('/client/register');

    await page.fill('#reg-nom', 'Client E2E');
    await page.fill('#reg-email', uniqueEmail());
    await page.fill('#reg-tel', '0612345678');
    await page.fill('#reg-pw', 'MotDePasse123');
    await page.fill('#reg-pw-conf', 'MotDePasse123');
    await page.fill('#reg-cin', '12345678');

    await expect(page.getByRole('alert').filter({ hasText: 'Le CIN doit contenir' })).toBeVisible();
    await expect(page.getByRole('button', { name: "S'inscrire" })).toBeDisabled();
  });

  test('accepte un CIN a lettre unique + 4 chiffres et cree le compte', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/client/register');

    await page.fill('#reg-nom', 'Client E2E');
    await page.fill('#reg-email', email);
    await page.fill('#reg-tel', uniquePhone());
    await page.fill('#reg-pw', 'MotDePasse123');
    await page.fill('#reg-pw-conf', 'MotDePasse123');
    await page.fill('#reg-cin', 'A1234');
    await page.locator('input[type="checkbox"]').check({ force: true });

    // Le CIN passe la validation client.
    await expect(page.getByRole('alert').filter({ hasText: 'Le CIN doit contenir' })).toHaveCount(0);

    await page.getByRole('button', { name: "S'inscrire" }).click();
    await expect(page.getByText('Compte créé avec succès')).toBeVisible();

    // Le backend a bien persiste le compte : connexion possible.
    await page.goto('/client/login');
    await page.fill('#login-email', email);
    await page.fill('#login-password', 'MotDePasse123');
    await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();
    await expect(page).toHaveURL(/\/client\/profil/, { timeout: 15_000 });
  });

  test('accepte l\'ancien format CIN AB123456', async ({ page }) => {
    await page.goto('/client/register');

    await page.fill('#reg-nom', 'Client E2E');
    await page.fill('#reg-email', uniqueEmail());
    await page.fill('#reg-tel', uniquePhone());
    await page.fill('#reg-pw', 'MotDePasse123');
    await page.fill('#reg-pw-conf', 'MotDePasse123');
    await page.fill('#reg-cin', 'AB123456');
    await page.locator('input[type="checkbox"]').check({ force: true });

    await expect(page.getByRole('alert').filter({ hasText: 'Le CIN doit contenir' })).toHaveCount(0);
    await page.getByRole('button', { name: "S'inscrire" }).click();
    await expect(page.getByText('Compte créé avec succès')).toBeVisible();
  });
});

test('le visuel auth reste visible dans la fenêtre sur login et register', async ({ page }) => {
  for (const path of ['/client/login', '/client/register']) {
    await page.goto(path);
    await expect(
      page.getByText('Location de véhicules premium à Tanger. Réservez en quelques clics.'),
    ).toBeInViewport();
  }
});

test('connexion du client seed', async ({ page }) => {
  await page.goto('/client/login');
  await page.fill('#login-email', 'mohammed@gmail.com');
  await page.fill('#login-password', 'password');
  await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();
  await expect(page).toHaveURL(/\/client\/profil/, { timeout: 15_000 });
});
