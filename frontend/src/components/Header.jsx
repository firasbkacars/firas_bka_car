import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LangueSwitcher from './LangueSwitcher';
import {
  ChevronDown, LayoutDashboard, LogOut, Menu, MessageSquare, Phone, User, X,
} from 'lucide-react';
import api from '../services/api';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { client, loading, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  // Indices de nouveaute client : messages non lus + reservations modifiees.
  const [notifs, setNotifs] = useState({ messages: 0, reservations: 0 });
  const lastScroll = useRef(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Badges client : rafraichis toutes les 30 s et a la demande via
  // l'evenement 'client-notifications-refresh' (messagerie ou page
  // reservations ouverte).
  useEffect(() => {
    if (!client) return undefined;

    let cancelled = false;

    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/client/notifications');
        if (!cancelled) setNotifs(data);
      } catch {
        // silencieux : un badge manquant ne doit pas casser la page
      }
    };

    fetchNotifs();
    const timer = setInterval(fetchNotifs, 30000);
    window.addEventListener('client-notifications-refresh', fetchNotifs);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('client-notifications-refresh', fetchNotifs);
    };
  }, [client]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) {
        setVisible(true);
      } else if (y < lastScroll.current) {
        setVisible(true);
      } else {
        setVisible(false);
        setMobileOpen(false);
      }
      lastScroll.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { path: '/', label: t('nav.accueil') },
    { path: '/vehicules', label: t('nav.vehicules') },
    { path: '/services', label: t('nav.services') },
    { path: '/a-propos', label: t('nav.apropos') },
    { path: '/contact', label: t('nav.contact') },
  ];

  const totalNotifs = (notifs.messages || 0) + (notifs.reservations || 0);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="shrink-0">
            <picture>
              <source srcSet="/images/logo.webp" type="image/webp" />
              <img src="/images/logo.png" alt="FIRAS BKA CAR" width="264" height="88" decoding="async" className="h-11 w-auto" />
            </picture>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative inline-flex min-h-11 items-center rounded-full px-4 text-xs font-medium uppercase tracking-wide transition-colors ${
                  location.pathname === link.path
                    ? 'text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                {location.pathname === link.path && (
                  <span className="absolute inset-0 rounded-full bg-surface-hover" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LangueSwitcher key={location.pathname} />
            {!loading && (
              client ? (
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    data-user-menu
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {client.nom_complet?.charAt(0)}
                      </div>
                      {totalNotifs > 0 && (
                        <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-dark-bg bg-danger" aria-hidden="true" data-notif-dot />
                      )}
                    </div>
                    <span className="max-w-[100px] truncate">{client.nom_complet?.split(' ')[0]}</span>
                    <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {menuOpen && (
                    <div className="absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-2xl shadow-black/50">
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate text-sm font-semibold text-white">{client.nom_complet}</p>
                        <p className="truncate text-xs text-muted">{client.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { to: '/client/tableau-de-bord', icon: LayoutDashboard, label: t('nav.tableauDeBord') },
                          { to: '/client/messagerie', icon: MessageSquare, label: t('nav.messagerie'), badge: notifs.messages },
                          { to: '/client/profil', icon: User, label: t('nav.profil'), badge: notifs.reservations },
                        ].map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className={`flex min-h-11 items-center gap-3 px-4 text-sm transition-colors ${
                              location.pathname === item.to
                                ? 'bg-primary/10 font-semibold text-white'
                                : 'text-muted hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <item.icon size={16} aria-hidden="true" />
                            {item.label}
                            {item.badge > 0 && (
                              <span className="ms-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white" data-notif-badge={item.badge}>
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-line py-1">
                        <button
                          onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                          className="flex min-h-11 w-full items-center gap-3 px-4 text-sm text-danger transition-colors hover:bg-danger/10"
                        >
                          <LogOut size={16} aria-hidden="true" />
                          {t('nav.deconnexion')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/client/login" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-white">
                  <User size={16} aria-hidden="true" />
                  {t('nav.connexion')}
                </Link>
              )
            )}
            <div className="h-6 w-px bg-line" />

            <a
              href="tel:+212603477786"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20"
            >
              <Phone size={16} aria-hidden="true" />
              +212 603 477 786
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5 lg:hidden"
            aria-label={mobileOpen ? t('header.fermerMenu') : t('header.ouvrirMenu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X size={24} aria-hidden="true" />
            ) : (
              <Menu size={24} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-dark-bg/95 backdrop-blur-xl lg:hidden">
          <div className="space-y-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-surface-hover text-white'
                    : 'text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              <div className="px-4">
                <LangueSwitcher key={location.pathname} />
              </div>
              {!loading && client && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="relative shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {client.nom_complet?.charAt(0)}
                      </div>
                      {totalNotifs > 0 && (
                        <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-dark-bg bg-danger" aria-hidden="true" data-notif-dot />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{client.nom_complet}</p>
                      <p className="truncate text-xs text-muted">{client.email}</p>
                    </div>
                  </div>
                  {[
                    { to: '/client/tableau-de-bord', icon: LayoutDashboard, label: t('nav.tableauDeBord') },
                    { to: '/client/messagerie', icon: MessageSquare, label: t('nav.messagerie'), badge: notifs.messages },
                    { to: '/client/profil', icon: User, label: t('nav.profil'), badge: notifs.reservations },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        location.pathname === item.to
                          ? 'bg-surface-hover text-white'
                          : 'text-muted hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon size={16} aria-hidden="true" />
                      {item.label}
                      {item.badge > 0 && (
                        <span className="ms-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white" data-notif-badge={item.badge}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setMobileOpen(false); logout(); navigate('/'); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {t('nav.deconnexion')}
                  </button>
                </div>
              )}
              {!loading && !client && (
                <Link to="/client/login" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-muted hover:bg-white/5 hover:text-white">
                  {t('nav.connexion')}
                </Link>
              )}
              <a href="tel:+212603477786" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                <Phone size={16} aria-hidden="true" />
                +212 603 477 786
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
