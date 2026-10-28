import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Mail, Clock, ChevronRight, ArrowUpRight, Lock } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: t('nav.accueil'), path: '/' },
    { label: t('nav.vehicules'), path: '/vehicules' },
    { label: t('nav.services'), path: '/services' },
    { label: t('nav.apropos'), path: '/a-propos' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  const vehicleCategories = [
    { label: t('footer.categories.berlines'), path: '/vehicules?categorie=berline' },
    { label: t('footer.categories.suv'), path: '/vehicules?categorie=suv' },
    { label: t('footer.categories.citadines'), path: '/vehicules?categorie=citadine' },
    { label: t('footer.categories.utilitaires'), path: '/vehicules?categorie=utilitaire' },
    { label: t('footer.categories.populaires'), path: '/vehicules?populaire=true' },
  ];

  const services = [
    t('footer.services.courteDuree'),
    t('footer.services.longueDuree'),
    t('footer.services.transfert'),
    t('footer.services.conducteur'),
    t('footer.services.assurance'),
  ];

  return (
    <footer className="border-t border-line bg-dark-bg">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="mb-5 inline-block">
              <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-10" />
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary-light"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary-light"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://wa.me/212774623448"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all hover:border-success/30 hover:bg-success/5 hover:text-success"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('footer.navigation')}</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-2 py-1 text-sm text-muted transition-colors hover:text-white"
                  >
                    <ChevronRight size={14} aria-hidden="true" className="text-muted transition-colors group-hover:text-primary-light rtl:rotate-180" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Vehicle Categories */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('footer.vehicules')}</h3>
            <ul className="space-y-3">
              {vehicleCategories.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-2 py-1 text-sm text-muted transition-colors hover:text-white"
                  >
                    <ChevronRight size={14} aria-hidden="true" className="text-muted transition-colors group-hover:text-primary-light rtl:rotate-180" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('footer.contact')}</h3>
            <ul className="space-y-4">
              <li>
                <a href="tel:+212774623448" className="group flex items-start gap-3 py-1">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Phone size={14} aria-hidden="true" className="text-primary-light" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-primary-light transition-colors">+212 774 623 448</p>
                  </div>
                </a>
              </li>
              <li>
                <a href="mailto:firasbkacars@gmail.com" className="group flex items-start gap-3 py-1">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Mail size={14} aria-hidden="true" className="text-primary-light" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-primary-light transition-colors">firasbkacars@gmail.com</p>
                  </div>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin size={14} aria-hidden="true" className="text-primary-light" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Lot 583N, Rue 50, Branes 1</p>
                    <p className="text-muted text-xs">{t('footer.ville')}</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Clock size={14} aria-hidden="true" className="text-primary-light" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{t('footer.horaires')}</p>
                    <p className="text-muted text-xs">{t('footer.dimanche')}</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Services Bar */}
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {services.map((service, i) => (
              <span key={i} className="flex items-center gap-2 text-xs text-muted">
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                {service}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-line bg-dark-bg">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted">
              &copy; {currentYear} FIRAS BKA CAR. {t('footer.droits')}
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/admin/login"
                className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted transition-colors hover:text-white"
              >
                <Lock size={12} aria-hidden="true" />
                {t('footer.espaceAdmin')}
              </Link>
              <a
                href="https://wa.me/212774623448"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary-light transition-colors hover:bg-primary/20"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('footer.contactezNous')}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
