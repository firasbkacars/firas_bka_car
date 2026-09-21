import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Car, Users, Wallet, Calendar, ArrowUpDown } from 'lucide-react';
import api from '../../services/api';

export default function Rapports() {
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [occupationData, setOccupationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOccupation, setSortOccupation] = useState({ field: 'revenu_total', dir: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, resRes, vehRes, occRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/reservations'),
        api.get('/vehicules'),
        api.get('/dashboard/taux-occupation'),
      ]);
      setStats(statsRes.data);
      setReservations(resRes.data);
      setVehicules(vehRes.data.data || vehRes.data.vehicules || []);
      setOccupationData(occRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sortOccupationData = (field) => {
    setSortOccupation(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedOccupation = occupationData?.vehicules
    ? [...occupationData.vehicules].sort((a, b) => {
        const aVal = a[sortOccupation.field] || 0;
        const bVal = b[sortOccupation.field] || 0;
        return sortOccupation.dir === 'asc' ? aVal - bVal : bVal - aVal;
      })
    : [];

  const reservationsByStatut = reservations.reduce((acc, r) => {
    acc[r.statut] = (acc[r.statut] || 0) + 1;
    return acc;
  }, {});

  const reservationsByMonth = reservations.reduce((acc, r) => {
    const m = new Date(r.date_debut).getMonth();
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
          <BarChart3 size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Rapports</h1>
          <p className="text-neutral-500 text-sm">Vue d'ensemble de l'activité</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Réservations', value: stats?.total_reservations || 0, icon: Calendar, color: 'text-blue-400' },
          { label: 'Véhicules', value: vehicules.length, icon: Car, color: 'text-green-400' },
          { label: 'Clients', value: stats?.total_clients || 0, icon: Users, color: 'text-purple-400' },
          { label: 'Revenus', value: `${(stats?.revenus_mois || 0).toLocaleString()} DH`, icon: Wallet, color: 'text-red-400' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
                  <Icon size={20} className={s.color} />
                </div>
                <div>
                  <p className="text-neutral-400 text-xs">{s.label}</p>
                  <p className="text-white font-bold text-lg">{loading ? '...' : s.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Répartition par statut</h3>
          <div className="space-y-3">
            {[
              { key: 'confirmee', label: 'Confirmées', color: 'bg-blue-500' },
              { key: 'en_cours', label: 'En cours', color: 'bg-yellow-500' },
              { key: 'terminee', label: 'Terminées', color: 'bg-green-500' },
              { key: 'annulee', label: 'Annulées', color: 'bg-red-500' },
            ].map(s => {
              const count = reservationsByStatut[s.key] || 0;
              const pct = reservations.length > 0 ? Math.round((count / reservations.length) * 100) : 0;
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-300">{s.label}</span>
                    <span className="text-white">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2">
                    <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Réservations par mois</h3>
          <div className="space-y-2">
            {MOIS.map((m, i) => {
              const count = reservationsByMonth[i] || 0;
              const max = Math.max(...Object.values(reservationsByMonth), 1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-neutral-500 text-xs w-8">{m}</span>
                  <div className="flex-1 bg-neutral-800 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-neutral-400 text-xs w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Taux d'occupation et rentabilite par vehicule */}
      {occupationData && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Taux d'occupation et rentabilite</h3>
              <p className="text-neutral-500 text-xs mt-1">
                Periode : {new Date(occupationData.periode.debut).toLocaleDateString('fr-FR')} au {new Date(occupationData.periode.fin).toLocaleDateString('fr-FR')} ({occupationData.periode.total_jours} jours)
              </p>
            </div>
          </div>

          {sortedOccupation.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">Aucune donnee disponible</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800">
                    <th className="text-left py-2 px-3 font-medium">Vehicule</th>
                    <th className="text-left py-2 px-3 font-medium">Categorie</th>
                    <th className="text-right py-2 px-3 font-medium cursor-pointer hover:text-neutral-300" onClick={() => sortOccupationData('jours_loues')}>
                      Jours loues {sortOccupation.field === 'jours_loues' ? (sortOccupation.dir === 'asc' ? '\u2191' : '\u2193') : ''}
                    </th>
                    <th className="text-right py-2 px-3 font-medium">Disponibles</th>
                    <th className="text-right py-2 px-3 font-medium cursor-pointer hover:text-neutral-300" onClick={() => sortOccupationData('taux_occupation')}>
                      Taux {sortOccupation.field === 'taux_occupation' ? (sortOccupation.dir === 'asc' ? '\u2191' : '\u2193') : ''}
                    </th>
                    <th className="text-right py-2 px-3 font-medium cursor-pointer hover:text-neutral-300" onClick={() => sortOccupationData('revenu_total')}>
                      Revenu {sortOccupation.field === 'revenu_total' ? (sortOccupation.dir === 'asc' ? '\u2191' : '\u2193') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOccupation.map((v) => (
                    <tr key={v.vehicule_id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                      <td className="py-2 px-3 text-white font-medium">{v.marque} {v.modele}</td>
                      <td className="py-2 px-3 text-neutral-400 text-xs">{v.categorie}</td>
                      <td className="py-2 px-3 text-right text-white">{v.jours_loues}j</td>
                      <td className="py-2 px-3 text-right text-neutral-400">{v.jours_disponibles}j</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-neutral-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                v.taux_occupation >= 70 ? 'bg-green-500' : v.taux_occupation >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, v.taux_occupation)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            v.taux_occupation >= 70 ? 'text-green-400' : v.taux_occupation >= 40 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{v.taux_occupation}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-[#dc2626] font-bold">{v.revenu_total.toLocaleString('fr-FR')} DH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
