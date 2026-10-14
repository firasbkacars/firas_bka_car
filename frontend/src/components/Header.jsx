import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { setLangue } from '../i18n';
import { Globe, LayoutDashboard, MessageSquare, User, LogOut, ChevronDown } from 'lucide-react';

function LangueSwitcher() {
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
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('langue.label')}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium transition-colors px-2 py-2"
      >
        <Globe size={15} aria-hidden="true" />
        <span className="uppercase text-xs">{i18n.language}</span>
      </button>
      <div
        role="menu"
        aria-label={t('langue.label')}
        className={`absolute right-0 top-full mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 ${open ? '' : 'hidden'}`}
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
            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
              i18n.language === lng ? 'text-primary-light bg-white/5' : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t(`langue.${lng}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { client, loading, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScroll = useRef(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

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

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="shrink-0">
            <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-11" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-2 text-[13px] font-medium tracking-wide uppercase transition-colors rounded-full ${
                  location.pathname === link.path
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {location.pathname === link.path && (
                  <span className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-full" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
                <LangueSwitcher key={location.pathname} />
            {!loading && (
              client ? (
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-full hover:bg-white/5"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-7 h-7 bg-[#dc2626] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {client.nom_complet?.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate">{client.nom_complet?.split(' ')[0]}</span>
                    <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white text-sm font-semibold truncate">{client.nom_complet}</p>
                        <p className="text-muted text-xs truncate">{client.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { to: '/client/tableau-de-bord', icon: LayoutDashboard, label: t('nav.tableauDeBord') },
                          { to: '/client/messagerie', icon: MessageSquare, label: t('nav.messagerie') },
                          { to: '/client/profil', icon: User, label: t('nav.profil') },
                        ].map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              location.pathname === item.to
                                ? 'text-primary-light bg-[#dc2626]/5'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-white/10 py-1">
                        <button
                          onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                        >
                          <LogOut size={16} />
                          {t('nav.deconnexion')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/client/login" className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors px-3 py-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  {t('nav.connexion')}
                </Link>
              )
            )}
            <div className="w-px h-6 bg-white/15" />

            <a
              href="tel:+212774623448"
              className="flex items-center gap-2 bg-[#dc2626] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#b91c1c] transition-all hover:shadow-lg hover:shadow-red-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              +212 774 623 448
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white/80 hover:text-white p-2"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? 'text-white bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
              <div className="px-4">
            <LangueSwitcher key={location.pathname} />
              </div>
              {!loading && client && (
                <div className="space-y-1">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#dc2626] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {client.nom_complet?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{client.nom_complet}</p>
                      <p className="text-muted text-xs truncate">{client.email}</p>
                    </div>
                  </div>
                  {[
                    { to: '/client/tableau-de-bord', icon: LayoutDashboard, label: t('nav.tableauDeBord') },
                    { to: '/client/messagerie', icon: MessageSquare, label: t('nav.messagerie') },
                    { to: '/client/profil', icon: User, label: t('nav.profil') },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        location.pathname === item.to
                          ? 'text-white bg-white/10'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setMobileOpen(false); logout(); navigate('/'); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg transition-colors"
                  >
                    <LogOut size={16} />
                    {t('nav.deconnexion')}
                  </button>
                </div>
              )}
              {!loading && !client && (
                <Link to="/client/login" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                  {t('nav.connexion')}
                </Link>
              )}
              <a href="tel:+212774623448" className="flex items-center justify-center gap-2 bg-[#dc2626] text-white px-4 py-3 rounded-lg text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                +212 774 623 448
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
