import i18n from '../i18n';

export const DOCUMENT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

export const DOCUMENT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const TAILLE_MIN = 10 * 1024;
const COTE_COURT_MIN = 350;
const COTE_LONG_MIN = 500;

/**
 * Controle cote navigateur, avant l'envoi. Le backend refait tous les
 * controles (et ajoute la nettete / la luminosite) : ceci sert uniquement a
 * guider l'utilisateur plus vite.
 */
export function validateDocumentPhotoFile(file, options = {}) {
  const {
    maxSizeMb = 5,
    minShortSide = COTE_COURT_MIN,
    minLongSide = COTE_LONG_MIN,
  } = options;

  if (!file) {
    return Promise.resolve({ valid: false, message: i18n.t('documents.validation.selectionner') });
  }

  if (!DOCUMENT_PHOTO_TYPES.includes(file.type)) {
    return Promise.resolve({
      valid: false,
      message: i18n.t('documents.validation.format'),
    });
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return Promise.resolve({
      valid: false,
      message: i18n.t('documents.validation.tailleMax', { taille: maxSizeMb }),
    });
  }

  if (file.size < TAILLE_MIN) {
    return Promise.resolve({
      valid: false,
      message: i18n.t('documents.validation.tropCompressee'),
    });
  }

  if (typeof Image === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return Promise.resolve({ valid: true, file });
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const shortSide = Math.min(image.naturalWidth, image.naturalHeight);
      const longSide = Math.max(image.naturalWidth, image.naturalHeight);

      if (shortSide < minShortSide || longSide < minLongSide) {
        resolve({
          valid: false,
          message: i18n.t('documents.validation.resolution', {
            largeur: minLongSide,
            hauteur: minShortSide,
          }),
        });
        return;
      }

      resolve({ valid: true, file, width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        message: i18n.t('documents.validation.illisible'),
      });
    };

    image.src = url;
  });
}
