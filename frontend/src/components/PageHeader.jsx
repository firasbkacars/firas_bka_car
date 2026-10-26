import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, breadcrumbs = [] }) {
  return (
    <div className="border-b border-line pb-8 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-3 flex items-center gap-1.5 text-xs text-muted">
            <Link to="/" className="flex items-center gap-1 py-1 transition-colors hover:text-white">
              <Home size={12} aria-hidden="true" />
              Accueil
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight size={12} aria-hidden="true" className="text-muted rtl:rotate-180" />
                {crumb.path ? (
                  <Link to={crumb.path} className="py-1 transition-colors hover:text-white">{crumb.label}</Link>
                ) : (
                  <span className="py-1 text-white" aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1>
      </div>
    </div>
  );
}
