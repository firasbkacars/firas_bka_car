import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import LangueSwitcher from './LangueSwitcher';

export default function AuthLayout({ children, title, subtitle, image }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {image && (
        <div className="relative hidden w-1/2 md:block">
          <div className="sticky top-0 h-screen p-4 lg:p-6">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 lg:rounded-3xl">
              <img
                src={image}
                alt=""
                aria-hidden="true"
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 lg:p-8">
                <Link to="/" className="inline-block">
                  <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-10" />
                </Link>
                <p className="text-white/80 text-sm mt-3 max-w-xs leading-relaxed">
                  {t('authLayout.tagline')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex w-full items-center justify-center px-6 py-10 sm:px-8 md:w-1/2">
        <div className="absolute end-4 top-4 z-20 sm:end-6 sm:top-6">
          <LangueSwitcher />
        </div>
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-muted hover:text-white/60 text-xs mb-6 transition-colors"
          >
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {t('authLayout.retourAccueil')}
          </Link>

          <div className="md:hidden text-center mb-8">
            <Link to="/">
              <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-11 mx-auto" />
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-muted text-sm mt-1.5">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
