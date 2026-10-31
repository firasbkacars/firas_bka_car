/**
 * Données initiales injectées par Laravel (`Seo::injectIntoHtml`).
 *
 * Elles permettent aux pages publiques de rendre leur contenu dès le premier
 * rendu React, sans attendre l'aller-retour API. Le script est supprimé du DOM
 * une fois lu pour ne pas exposer de données inutiles dans le HTML.
 */
let cached;

export function readInitialData() {
  if (typeof document === 'undefined') return null;

  if (cached !== undefined) return cached;

  const element = document.getElementById('seo-initial-data');
  if (!element) {
    cached = null;
    return cached;
  }

  try {
    const data = JSON.parse(element.textContent || '{}');
    element.remove();
    cached = data && typeof data === 'object' ? data : null;

    return cached;
  } catch {
    cached = null;
    return cached;
  }
}
