import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-16">
      <div className="text-center max-w-md">
        <div className="text-[120px] font-bold text-white/10 leading-none select-none" aria-hidden="true">404</div>
        <h1 className="text-2xl font-bold text-white -mt-8 mb-3">Page introuvable</h1>
        <p className="text-muted text-sm mb-8">
          La page que vous recherchez n'existe pas ou a ete deplacee.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Home size={16} />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
