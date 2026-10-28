import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Traductions chargees automatiquement depuis src/locales/<langue>/<page>.json.
 *
 * Chaque fichier expose un objet dont les cles de premier niveau sont le
 * namespace de la page ("home", "vehicules", "acompte"...). Tous les
 * namespaces sont fusionnes dans la ressource "translation" : on ecrit donc
 * simplement t('acompte.titre') partout, sans gerer de namespace i18next.
 *
 * Ajouter une langue = ajouter un dossier src/locales/<code>/ et le declarer
 * dans LANGUES ci-dessous.
 */
export const LANGUES = ['fr', 'ar', 'en'];
export const LANGUE_DEFAUT = 'fr';

const modules = import.meta.glob('./locales/*/*.json', { eager: true });

const resources = Object.fromEntries(
  LANGUES.map((lng) => [lng, { translation: {} }])
);

/**
 * Fusion profonde : deux fichiers peuvent enrichir le meme namespace (par
 * exemple `favoris` cote commun et cote flotte) sans s'ecraser mutuellement.
 */
function fusionner(base, ajout) {
  for (const [cle, valeur] of Object.entries(ajout)) {
    if (
      valeur
      && typeof valeur === 'object'
      && !Array.isArray(valeur)
      && base[cle]
      && typeof base[cle] === 'object'
      && !Array.isArray(base[cle])
    ) {
      fusionner(base[cle], valeur);
    } else {
      base[cle] = valeur;
    }
  }
}

for (const [path, module] of Object.entries(modules)) {
  const match = path.match(/\.\/locales\/([a-z]{2})\/([a-z0-9-]+)\.json$/i);
  if (!match) continue;

  const [, lng] = match;
  if (!resources[lng]) continue;

  const contenu = module.default ?? module;
  fusionner(resources[lng].translation, contenu);
}

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('langue') : null;
const initial = LANGUES.includes(saved) ? saved : LANGUE_DEFAUT;

function appliquerDirection(lng) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: LANGUE_DEFAUT,
  supportedLngs: LANGUES,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

appliquerDirection(initial);

i18n.on('languageChanged', (lng) => {
  if (!LANGUES.includes(lng)) return;
  appliquerDirection(lng);
  if (typeof localStorage !== 'undefined') localStorage.setItem('langue', lng);
});

export function setLangue(lng) {
  if (!LANGUES.includes(lng)) return undefined;
  return i18n.changeLanguage(lng);
}

export default i18n;
