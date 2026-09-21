import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Car,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wrench,
  CalendarOff,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../services/api';

const PIE_COLORS = {
  disponible: '#22c55e',
  louee: '#eab308',
  en_location: '#eab308',
  maintenance: '#ef4444',
};

const PIE_LABELS = {
  disponible: 'Disponibles',
  louee: 'En location',
  en_location: 'En location',
  maintenance: 'Maintenance',
};

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse" />
        <div className="h-10 w-10 bg-neutral-800 rounded-xl animate-pulse" />
      </div>
      <div className="h-8 w-20 bg-neutral-800 rounded animate-pulse mb-2" />
      <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
    </div>
  );
}

function SkeletonTable({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-4 w-24 bg-neutral-800 rounded" />
          <div className="h-4 w-32 bg-neutral-800 rounded" />
          <div className="h-4 w-28 bg-neutral-800 rounded" />
          <div className="h-5 w-16 bg-neutral-800 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="h-48 bg-neutral-800/50 rounded-xl animate-pulse flex items-center justify-center">
      <div className="h-4 w-32 bg-neutral-700 rounded" />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-neutral-400 text-xs">{MOIS[label - 1] || label}</p>
      <p className="text-red-400 font-semibold text-sm">{payload[0].value.toLocaleString()} DH</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [revenus, setRevenus] = useState([]);
  const [repartition, setRepartition] = useState([]);
  const [rappels, setRappels] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, recentesRes, revenusRes, repartitionRes, rappelsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/reservations-recentes'),
        api.get('/dashboard/revenus'),
        api.get('/dashboard/repartition-vehicules'),
        api.get('/dashboard/rappels'),
      ]);
      setStats(statsRes.data);
      setRecentes(recentesRes.data);
      setRevenus(revenusRes.data);
      setRepartition(repartitionRes.data);
      setRappels(rappelsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statutBadge = (statut) => {
    const colors = {
      confirmee: 'bg-blue-500/15 text-blue-400',
      en_cours: 'bg-yellow-500/15 text-yellow-400',
      terminee: 'bg-green-500/15 text-green-400',
      annulee: 'bg-red-500/15 text-red-400',
    };
    return colors[statut] || 'bg-neutral-500/15 text-neutral-400';
  };

  const statutLabel = {
    confirmee: 'Confirmée',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  const cards = [
    {
      label: 'Réservations totales',
      value: stats?.total_reservations ?? null,
      icon: ClipboardList,
      trend: stats?.evolution_reservations,
      trendLabel: 'ce mois',
    },
    {
      label: 'Véhicules disponibles',
      value: stats?.vehicules_disponibles ?? null,
      icon: Car,
      trend: null,
      trendLabel: null,
    },
    {
      label: 'Nombre de clients',
      value: stats?.total_clients ?? null,
      icon: Users,
      trend: null,
      trendLabel: null,
    },
    {
      label: 'Revenus du mois',
      value: stats?.revenus_mois != null ? `${stats.revenus_mois.toLocaleString()} DH` : null,
      icon: Wallet,
      trend: stats?.evolution_revenus,
      trendLabel: 'ce mois',
    },
  ];

  const chartData = revenus.map((r) => ({
    mois: r.mois,
    total: r.total,
  }));

  const pieData = repartition.map((r) => ({
    name: PIE_LABELS[r.statut] || r.statut,
    value: r.total,
    statut: r.statut,
  }));

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-neutral-400 text-sm">{s.label}</span>
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
                      <Icon size={20} className="text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {s.value ?? '—'}
                  </p>
                  {s.trend != null && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {s.trend >= 0 ? (
                        <TrendingUp size={14} className="text-green-400" />
                      ) : (
                        <TrendingDown size={14} className="text-red-400" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          s.trend >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {s.trend >= 0 ? '+' : ''}{s.trend}% {s.trendLabel}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Reservations + Revenue chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservations table */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Réservations récentes</h3>
            <Link
              to="/admin/reservations"
              className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1 transition"
            >
              Voir tout <ArrowUpRight size={12} />
            </Link>
          </div>
          {loading ? (
            <SkeletonTable rows={5} />
          ) : recentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Inbox size={40} className="mb-3 text-neutral-600" />
              <p className="text-sm">Aucune réservation pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800">
                    <th className="text-left py-2.5 font-medium">#</th>
                    <th className="text-left py-2.5 font-medium">Client</th>
                    <th className="text-left py-2.5 font-medium">Véhicule</th>
                    <th className="text-left py-2.5 font-medium">Dates</th>
                    <th className="text-left py-2.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                      <td className="py-3 text-white font-mono text-xs">{r.numero}</td>
                      <td className="py-3 text-neutral-300">{r.client?.nom_complet}</td>
                      <td className="py-3 text-neutral-300">
                        {r.vehicule?.marque} {r.vehicule?.modele}
                      </td>
                      <td className="py-3 text-neutral-500 text-xs whitespace-nowrap">
                        {new Date(r.date_debut).toLocaleDateString('fr-FR')} —{' '}
                        {new Date(r.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3">
                        <span
                          className={`${statutBadge(r.statut)} px-2.5 py-1 rounded-full text-xs font-medium`}
                        >
                          {statutLabel[r.statut] || r.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Revenus (mois)</h3>
          {loading ? (
            <SkeletonChart />
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Inbox size={40} className="mb-3 text-neutral-600" />
              <p className="text-sm">Aucune donnée de revenus</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-red-500 font-bold text-2xl">
                  {(stats?.revenus_mois || 0).toLocaleString()} DH
                </p>
                {stats?.evolution_revenus != null && (
                  <div className="flex items-center gap-1 mt-1">
                    {stats.evolution_revenus >= 0 ? (
                      <TrendingUp size={14} className="text-green-400" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400" />
                    )}
                    <span
                      className={`text-xs ${
                        stats.evolution_revenus >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {stats.evolution_revenus >= 0 ? '+' : ''}{stats.evolution_revenus}% vs mois dernier
                    </span>
                  </div>
                )}
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="mois"
                      tickFormatter={(v) => MOIS[v - 1]}
                      tick={{ fill: '#737373', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#737373', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#dc2626"
                      strokeWidth={2}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Pie chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Répartition des véhicules</h3>
          {loading ? (
            <SkeletonChart />
          ) : pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Inbox size={40} className="mb-3 text-neutral-600" />
              <p className="text-sm">Aucune donnée</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[entry.statut] || '#737373'}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {pieData.map((entry, i) => {
                  const total = pieData.reduce((a, b) => a + b.value, 0);
                  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[entry.statut] || '#737373' }}
                      />
                      <span className="text-neutral-300 text-sm flex-1">{entry.name}</span>
                      <span className="text-white text-sm font-medium">{entry.value}</span>
                      <span className="text-neutral-500 text-xs w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Rappels & Alertes</h3>
          <div className="space-y-3">
            {loading ? (
              <SkeletonTable rows={3} />
            ) : (
              <>
                {rappels?.retours_jour?.length > 0 &&
                  rappels.retours_jour.map((r, i) => (
                    <div
                      key={`retour-${i}`}
                      className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                        <CalendarOff size={16} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          Retour aujourd'hui : {r.vehicule?.marque} {r.vehicule?.modele}
                        </p>
                        <p className="text-neutral-500 text-xs">Client : {r.client?.nom_complet}</p>
                      </div>
                    </div>
                  ))}
                {rappels?.maintenance?.length > 0 &&
                  rappels.maintenance.map((v, i) => (
                    <div
                      key={`maint-${i}`}
                      className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                        <Wrench size={16} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          En maintenance : {v.marque} {v.modele}
                        </p>
                      </div>
                    </div>
                  ))}
                {!rappels?.retours_jour?.length && !rappels?.maintenance?.length && (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
                    <AlertTriangle size={36} className="mb-3 text-neutral-600" />
                    <p className="text-sm">Aucune alerte pour le moment</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
