import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle, image }) {
  return (
    <div className="flex min-h-screen">
      {image && (
        <div className="hidden md:block w-1/2 relative">
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-8 left-8 z-10">
            <Link to="/">
              <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-10" />
            </Link>
            <p className="text-white/80 text-sm mt-2 max-w-xs leading-relaxed">
              Location de véhicules premium à Tanger. Réservez en quelques clics.
            </p>
          </div>
        </div>
      )}

      <div className="w-full md:w-1/2 flex items-center justify-center px-6 sm:px-8 py-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            Retour à l'accueil
          </Link>

          <div className="md:hidden text-center mb-8">
            <Link to="/">
              <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-11 mx-auto" />
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-white/40 text-sm mt-1.5">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
