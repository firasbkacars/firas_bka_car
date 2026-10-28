/**
 * Libelles des donnees vehicule (categories, carburants, equipements).
 *
 * L'API renvoie des valeurs francaises ; ces fonctions les traduisent quand
 * elles sont connues et laissent la valeur d'origine sinon.
 */
const CATEGORIES = ['berline', 'compacte', 'citadine', 'suv', 'van'];
const CARBURANTS = ['essence', 'diesel', 'hybride'];

export function categorieLabel(value, t) {
  if (!value) return value;
  const key = String(value).toLowerCase();
  return CATEGORIES.includes(key) ? t(`vehicules.categories.${key}`) : value;
}

export function carburantLabel(value, t) {
  if (!value) return value;
  const key = String(value).toLowerCase();
  return CARBURANTS.includes(key) ? t(`vehicules.filtres.${key}`) : value;
}

const EQUIPEMENTS = {
  climatisation: 'climatisation',
  bluetooth: 'bluetooth',
  'caméra de recul': 'cameraRecul',
  gps: 'gps',
  'barres de toit': 'barresToit',
  'vitres électriques': 'vitresElectriques',
  'direction assistée': 'directionAssistee',
  'régulateur de vitesse': 'regulateurVitesse',
  'apple carplay / android auto': 'carplay',
  'sièges sport': 'siegesSport',
  'jantes alliage': 'jantesAlliage',
  'sièges cuir': 'siegesCuir',
  'démarrage sans clé': 'demarrageSansCle',
  'écran tactile': 'ecranTactile',
  'boîte dsg': 'boiteDsg',
  'climatisation bi-zone': 'climatisationBiZone',
  'sièges chauffants': 'siegesChauffants',
  'boîte eat8': 'boiteEat8',
  'i-cockpit 3d': 'icockpit',
  'climatisation automatique': 'climatisationAuto',
};

export function equipementLabel(value, t) {
  const key = EQUIPEMENTS[String(value ?? '').trim().toLowerCase()];
  return key ? t(`vehicule.equipementsListe.${key}`) : value;
}
