import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let scrollLocks = 0;

/**
 * Modale accessible : role="dialog", aria-modal, piege au clavier (Tab /
 * Shift+Tab), fermeture par Echap, restoration du focus au precedent actif
 * et verrouillage du scroll du body (compteur pour les modales imbriquees).
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();
  const { t } = useTranslation();

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    scrollLocks += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const container = containerRef.current;
    const autofocus = container?.querySelector('[data-autofocus]');
    (autofocus || container)?.focus();

    return () => {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      containerRef.current?.querySelectorAll(FOCUSABLE) || []
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (!focusables.length) {
      e.preventDefault();
      containerRef.current?.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-in"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full ${sizes[size]} rounded-t-2xl border border-line bg-surface-raised p-6 shadow-2xl outline-none modal-in sm:rounded-2xl ${className}`}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-base font-semibold leading-snug text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-me-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white"
              aria-label={t('actions.fermer')}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        <div>{children}</div>

        {footer && <div className="mt-6 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
