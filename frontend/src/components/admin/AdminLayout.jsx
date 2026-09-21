import { useState, useEffect } from 'react';
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
  Bell,
  Wrench,
  Tag,
  Building2,
  ClipboardCheck,
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
  { path: '/admin/codes-promo', label: 'Codes promo', icon: Tag },
  { path: '/admin/parametres', label: 'Parametres', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) navigate('/admin/login');
  }, [token, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try { await api.post('/admin/logout'); } catch (e) {}
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (!token) return null;

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-neutral-800">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="FIRAS BKA CAR" className="h-9 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
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
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-500 w-full transition"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 border-r border-neutral-800 flex-col">
        <SidebarContent />
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
            >
              <X size={20} />
            </button>
            <SidebarContent />
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
            >
              <Menu size={22} />
            </button>
            <h2 className="text-white font-semibold text-sm sm:text-base">
              {sidebarLinks.find((l) => l.path === location.pathname)?.label || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-neutral-400 hover:text-white p-1">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
