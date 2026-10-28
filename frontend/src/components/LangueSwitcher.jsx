import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { setLangue } from '../i18n';

/**
 * Selecteur de langue partage par le header public et les pages
 * d'authentification (qui n'ont pas de header).
 */
export default function LangueSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        wrapRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('langue.label')}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted transition-colors hover:text-white"
      >
        <Globe size={15} aria-hidden="true" />
        <span className="text-xs">{i18n.language.toUpperCase()}</span>
      </button>

      <div
        role="menu"
        aria-label={t('langue.label')}
        className={`absolute end-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-2xl ${open ? '' : 'hidden'}`}
      >
        {['fr', 'ar', 'en'].map((lng) => (
          <button
            key={lng}
            type="button"
            role="menuitemradio"
            aria-checked={i18n.language === lng}
            onClick={() => {
              setLangue(lng);
              setOpen(false);
            }}
            className={`flex min-h-11 w-full items-center px-4 text-start text-sm transition-colors ${
              i18n.language === lng
                ? 'bg-primary/10 font-semibold text-white'
                : 'text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            {t(`langue.${lng}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
