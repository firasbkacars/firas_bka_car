import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Car,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  Tag,
  Building2,
  ClipboardCheck,
  FileText,
  MessageSquare,
} from 'lucide-react';
import api from '../../services/api';

const sidebarLinks = [
  { path: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/admin/reservations', label: 'Reservations', icon: ClipboardList },
  { path: '/admin/vehicules', label: 'Vehicules', icon: Car },
  { path: '/admin/clients', label: 'Clients', icon: Users },
  { path: '/admin/agences', label: 'Agences', icon: Building2 },
  { path: '/admin/calendrier', label: 'Calendrier', icon: Calendar },
  { path: '/admin/paiements', label: 'Paiements', icon: CreditCard },
  { path: '/admin/maintenances', label: 'Maintenances', icon: Wrench },
  { path: '/admin/etats-lieux', label: 'Etats des lieux', icon: ClipboardCheck },
  { path: '/admin/rapports', label: 'Rapports', icon: BarChart3 },
  { path: '/admin/avis', label: 'Avis clients', icon: Star },
  { path: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { path: '/admin/contrats-fournisseurs', label: 'Contrats fournisseurs', icon: FileText },
  { path: '/admin/codes-promo', label: 'Codes promo', icon: Tag },
  { path: '/admin/parametres', label: 'Parametres', icon: Settings },
];

// Indices de nouveaute : compteur affiche en pastille par page de la sidebar.
const NOTIF_KEYS = {
  '/admin/reservations': 'reservations',
  '/admin/clients': 'clients',
  '/admin/paiements': 'paiements',
  '/admin/avis': 'avis',
  '/admin/messages': 'messages',
};

function SidebarContent({ isActive, onLogout, counts = {} }) {
  return (
    <>
      <div className="p-5 border-b border-neutral-800">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-9 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Navigation admin">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          const badge = counts[NOTIF_KEYS[link.path]] || 0;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                active
                  ? 'bg-red-600/10 text-red-500 border-r-2 border-red-600 font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Icon size={18} className={active ? 'text-red-500' : ''} />
              {link.label}
              {badge > 0 && (
                <span
                  className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
                  title={badge > 1 ? `${badge} nouveautés` : '1 nouveauté'}
                  data-notif-badge={badge}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-500 w-full transition"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  // Compteurs de nouveaute affiches en pastille dans la sidebar.
  const [notifications, setNotifications] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/admin/user');
        if (!cancelled) setAdminUser(data);
      } catch {
        if (cancelled) return;
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Badges de nouveaute (reservations, clients, messages, paiements, avis) :
  // rafraichis toutes les 30 s et a la demande via l'evenement
  // 'admin-notifications-refresh' emis par les pages qui marquent "vu".
  useEffect(() => {
    if (!adminUser) return undefined;

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications-admin');
        if (!cancelled) setNotifications(data);
      } catch {
        // silencieux : un badge manquant ne doit pas casser la page
      }
    };

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);
    window.addEventListener('admin-notifications-refresh', fetchNotifications);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('admin-notifications-refresh', fetchNotifications);
    };
  }, [adminUser]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/admin/logout');
    } catch {
      // token peut déjà être invalide
    }
    localStorage.removeItem('admin_token');
    delete api.defaults.headers.common['Authorization'];
    navigate('/admin/login');
  };

  const isActive = useCallback((path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="flex h-screen bg-neutral-950 items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Vérification de la session" />
      </div>
    );
  }

  if (!adminUser) return null;

  const pageTitle =
    sidebarLinks.find((l) => isActive(l.path))?.label ||
    sidebarLinks.find((l) => l.path !== '/admin' && location.pathname.startsWith(l.path))?.label ||
    'Admin';

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 border-r border-neutral-800 flex-col">
        <SidebarContent location={location} isActive={isActive} onLogout={handleLogout} counts={notifications} />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-neutral-900 border-r border-neutral-800 h-full flex flex-col z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
            <SidebarContent location={location} isActive={isActive} onLogout={handleLogout} counts={notifications} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-neutral-400 hover:text-white p-1"
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-white font-semibold text-sm sm:text-base">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 text-sm hidden sm:inline" title={adminUser?.email}>
              {adminUser?.name || 'Admin'}
            </span>
            <div
              className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              {(adminUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <Suspense
            fallback={(
              <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden="true" />
              </div>
            )}
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
