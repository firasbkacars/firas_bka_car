import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { Icon: CheckCircle2, className: 'bg-green-500/10 border-green-500/25 text-green-400' },
  error: { Icon: XCircle, className: 'bg-red-500/10 border-red-500/25 text-red-400' },
  warning: { Icon: AlertTriangle, className: 'bg-amber-500/10 border-amber-500/25 text-amber-400' },
  info: { Icon: Info, className: 'bg-blue-500/10 border-blue-500/25 text-blue-400' },
  loading: { Icon: Loader2, className: 'bg-neutral-500/10 border-neutral-500/25 text-neutral-300' },
};

const DEFAULT_DURATION = { success: 3500, info: 3500, warning: 5000, error: 6000, loading: 0 };

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 180);
  }, []);

  const push = useCallback((message, { type = 'success', duration, id } = {}) => {
    const toastId = id ?? ++nextId;
    const ttl = duration ?? DEFAULT_DURATION[type] ?? 3500;

    setToasts((list) => {
      const existing = list.filter((t) => t.id !== toastId);
      const next = [...existing, { id: toastId, message, type, leaving: false }];
      return next.slice(-4);
    });

    if (ttl > 0) {
      setTimeout(() => dismiss(toastId), ttl);
    }
    return toastId;
  }, [dismiss]);

  const api = useMemo(() => ({
    toast: push,
    success: (m, o) => push(m, { ...o, type: 'success' }),
    error: (m, o) => push(m, { ...o, type: 'error' }),
    warning: (m, o) => push(m, { ...o, type: 'warning' }),
    info: (m, o) => push(m, { ...o, type: 'info' }),
    loading: (m, o) => push(m, { ...o, type: 'loading' }),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      loading: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!toasts.length) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') toasts.forEach((t) => onDismiss(t.id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toasts, onDismiss]);

  return (
    <div
      className="fixed top-20 end-4 sm:end-6 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const { Icon, className } = VARIANTS[toast.type] || VARIANTS.info;
        const assertive = toast.type === 'error';
        return (
          <div
            key={toast.id}
            role={assertive ? 'alert' : 'status'}
            aria-live={assertive ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm text-sm font-medium toast-in ${toast.leaving ? 'toast-out' : ''} ${className}`}
          >
            <Icon size={16} className={`shrink-0 mt-0.5 ${toast.type === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 -me-1 -mt-0.5 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
              aria-label={t('toast.fermer')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
