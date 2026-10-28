import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-16">
      <div className="text-center max-w-md">
        <div className="text-[120px] font-bold text-white/10 leading-none select-none" aria-hidden="true">404</div>
        <h1 className="text-2xl font-bold text-white -mt-8 mb-3">{t('notFound.titre')}</h1>
        <p className="text-muted text-sm mb-8">
          {t('notFound.description')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {t('actions.retour')}
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Home size={16} />
            {t('nav.accueil')}
          </Link>
        </div>
      </div>
    </div>
  );
}
