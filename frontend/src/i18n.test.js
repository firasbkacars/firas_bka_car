import { afterEach, describe, expect, it } from 'vitest';
import i18n, { setLangue } from './i18n';

const frFiles = import.meta.glob('./locales/fr/*.json', { eager: true });
const arFiles = import.meta.glob('./locales/ar/*.json', { eager: true });
const enFiles = import.meta.glob('./locales/en/*.json', { eager: true });

function aplatir(objet, prefixe = '') {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      return aplatir(valeur, chemin);
    }
    return [chemin];
  });
}

function clesDe(modules) {
  const toutes = new Set();
  for (const module of Object.values(modules)) {
    for (const cle of aplatir(module.default ?? module)) toutes.add(cle);
  }
  return toutes;
}

afterEach(async () => {
  await setLangue('fr');
});

describe('i18n', () => {
  it('charge les traductions francaises par defaut', () => {
    expect(i18n.t('nav.accueil')).toBe('Accueil');
    expect(i18n.t('footer.droits')).toBe('Tous droits réservés.');
  });

  it('bascule en arabe et active le sens de lecture RTL', async () => {
    await setLangue('ar');

    expect(i18n.t('nav.accueil')).toBe('الرئيسية');
    expect(i18n.t('actions.reserver')).toBe('احجز');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem('langue')).toBe('ar');
  });

  it('bascule en anglais et repasse en LTR', async () => {
    await setLangue('en');

    expect(i18n.t('nav.accueil')).toBe('Home');
    expect(i18n.t('actions.reserver')).toBe('Book');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('langue')).toBe('en');
  });

  it('refuse une langue non supportee', async () => {
    await setLangue('de');
    expect(i18n.language).toBe('fr');
  });

  it('chaque fichier francais possede une version arabe et anglaise complete', () => {
    const fichiersFr = Object.keys(frFiles);

    expect(fichiersFr.length).toBeGreaterThan(0);

    for (const cheminFr of fichiersFr) {
      const nom = cheminFr.split('/').pop();
      const cheminAr = `./locales/ar/${nom}`;
      const cheminEn = `./locales/en/${nom}`;

      expect(arFiles[cheminAr], `fichier arabe manquant : ${nom}`).toBeDefined();
      expect(enFiles[cheminEn], `fichier anglais manquant : ${nom}`).toBeDefined();

      const clesFr = new Set(aplatir(frFiles[cheminFr].default ?? frFiles[cheminFr]));
      const clesAr = new Set(aplatir(arFiles[cheminAr].default ?? arFiles[cheminAr]));
      const clesEn = new Set(aplatir(enFiles[cheminEn].default ?? enFiles[cheminEn]));

      const manquantesAr = [...clesFr].filter((cle) => !clesAr.has(cle));
      const manquantesEn = [...clesFr].filter((cle) => !clesEn.has(cle));

      expect(manquantesAr, `cles arabes manquantes dans ${nom}`).toEqual([]);
      expect(manquantesEn, `cles anglaises manquantes dans ${nom}`).toEqual([]);
    }
  });
});
