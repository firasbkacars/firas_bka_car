import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Fil d'Ariane visible, aligné sur le `BreadcrumbList` JSON-LD injecté côté
 * serveur (backend/app/Support/Seo.php). Le dernier élément représente la page
 * courante : il n'est jamais un lien et porte `aria-current="page"`.
 */
export default function Breadcrumbs({ items = [], className = '' }) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={t('header.filAriane')}
      className={`flex flex-wrap items-center gap-1.5 text-xs text-muted ${className}`.trim()}
    >
      <Link to="/" className="flex items-center gap-1 py-1 transition-colors hover:text-white">
        <Home size={12} aria-hidden="true" />
        {t('nav.accueil')}
      </Link>
      {items.map((item, index) => {
        const last = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight size={12} aria-hidden="true" className="text-muted rtl:rotate-180" />
            {item.path && !last ? (
              <Link to={item.path} className="py-1 transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span className="py-1 text-white" aria-current={last ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
