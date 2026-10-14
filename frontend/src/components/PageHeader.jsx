import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, breadcrumbs = [] }) {
  return (
    <div className="pt-24 pb-8 px-6 md:px-12 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-muted mb-3">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={12} />
              Accueil
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted" />
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-white transition-colors">{crumb.label}</Link>
                ) : (
                  <span className="text-white/70">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
      </div>
    </div>
  );
}
