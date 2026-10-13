import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  fr: {
    translation: {
      nav: {
        accueil: 'Accueil',
        vehicules: 'Nos véhicules',
        services: 'Services',
        apropos: 'À propos',
        contact: 'Contact',
        tableauDeBord: 'Tableau de bord',
        messagerie: 'Messagerie',
        profil: 'Profil',
        deconnexion: 'Déconnexion',
        connexion: 'Connexion',
        inscription: 'Inscription',
      },
      hero: {
        titre: 'Louez la voiture idéale',
        sousTitre: 'Flotte rénovée, tarifs transparents, réservation en ligne en 2 minutes.',
        cta: 'Voir les véhicules',
      },
      footer: {
        tagline: 'Location de voitures de confiance au Maroc.',
        droits: 'Tous droits réservés.',
      },
      communs: {
        rechercher: 'Rechercher',
        filtrer: 'Filtrer',
        comparer: 'Comparer',
        reserver: 'Réserver',
        voirDetails: 'Voir les détails',
        charger: 'Chargement...',
      },
      langue: {
        label: 'Langue',
        fr: 'Français',
        ar: 'العربية',
        en: 'English',
      },
    },
  },
  ar: {
    translation: {
      nav: {
        accueil: 'الرئيسية',
        vehicules: 'سياراتنا',
        services: 'الخدمات',
        apropos: 'من نحن',
        contact: 'اتصل بنا',
        tableauDeBord: 'لوحة التحكم',
        messagerie: 'الرسائل',
        profil: 'الملف الشخصي',
        deconnexion: 'تسجيل الخروج',
        connexion: 'تسجيل الدخول',
        inscription: 'إنشاء حساب',
      },
      hero: {
        titre: 'استأجر السيارة المثالية',
        sousTitre: 'أسطول مجدد، أسعار شفافة، حجز إلكتروني في دقيقتين.',
        cta: 'تصفح السيارات',
      },
      footer: {
        tagline: 'تأجير سيارات موثوقة في المغرب.',
        droits: 'جميع الحقوق محفوظة.',
      },
      communs: {
        rechercher: 'بحث',
        filtrer: 'تصفية',
        comparer: 'مقارنة',
        reserver: 'حجز',
        voirDetails: 'التفاصيل',
        charger: 'جاري التحميل...',
      },
      langue: {
        label: 'اللغة',
        fr: 'Français',
        ar: 'العربية',
        en: 'English',
      },
    },
  },
  en: {
    translation: {
      nav: {
        accueil: 'Home',
        vehicules: 'Our cars',
        services: 'Services',
        apropos: 'About',
        contact: 'Contact',
        tableauDeBord: 'Dashboard',
        messagerie: 'Messages',
        profil: 'Profile',
        deconnexion: 'Log out',
        connexion: 'Log in',
        inscription: 'Sign up',
      },
      hero: {
        titre: 'Rent the perfect car',
        sousTitre: 'Renewed fleet, transparent prices, online booking in 2 minutes.',
        cta: 'Browse cars',
      },
      footer: {
        tagline: 'Trusted car rental in Morocco.',
        droits: 'All rights reserved.',
      },
      communs: {
        rechercher: 'Search',
        filtrer: 'Filter',
        comparer: 'Compare',
        reserver: 'Book',
        voirDetails: 'View details',
        charger: 'Loading...',
      },
      langue: {
        label: 'Language',
        fr: 'Français',
        ar: 'العربية',
        en: 'English',
      },
    },
  },
};

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('langue') : null;
const initial = ['fr', 'ar', 'en'].includes(saved) ? saved : 'fr';

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

// V5 : le arabe se lit de droite a gauche.
if (typeof document !== 'undefined') {
  document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = initial;
}

export function setLangue(lng) {
  i18n.changeLanguage(lng);
  if (typeof localStorage !== 'undefined') localStorage.setItem('langue', lng);
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  }
}

export default i18n;
