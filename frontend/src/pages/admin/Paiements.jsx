import { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import api from '../../services/api';

export default function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async () => {
    try {
      const { data } = await api.get('/paiements');
      setPaiements(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const statutBadge = (statut) => {
    const map = {
      paye: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/15', label: 'Payé' },
      en_attente: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'En attente' },
      echoue: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Échoué' },
    };
    return map[statut] || { icon: Clock, color: 'text-neutral-400', bg: 'bg-neutral-500/15', label: statut };
  };

  const filtered = paiements.filter(p =>
    p.methode?.toLowerCase().includes(search.toLowerCase()) ||
    p.statut?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.montant).includes(search)
  );

  const totalPaye = paiements.filter(p => p.statut === 'paye').reduce((a, p) => a + Number(p.montant), 0);
  const totalEnAttente = paiements.filter(p => p.statut === 'en_attente').reduce((a, p) => a + Number(p.montant), 0);

  const exportCSV = async () => {
    try {
      const response = await api.get('/paiements/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paiements_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur lors de l\'export', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <CreditCard size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Paiements</h1>
            <p className="text-neutral-500 text-sm">{paiements.length} paiement(s)</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
          />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-neutral-800"
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">Total encaissé</p>
          <p className="text-2xl font-bold text-green-400">{totalPaye.toLocaleString()} DH</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{totalEnAttente.toLocaleString()} DH</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">ID</th>
                <th className="text-left py-3 px-5 font-medium">Montant</th>
                <th className="text-left py-3 px-5 font-medium">Méthode</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-left py-3 px-5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={5} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-24" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-neutral-500">
                    <CreditCard size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucun paiement trouvé</p>
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const s = statutBadge(p.statut);
                const Icon = s.icon;
                return (
                  <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-5 text-neutral-400 font-mono text-xs">#{p.id}</td>
                    <td className="py-3 px-5 text-white font-medium">{Number(p.montant).toLocaleString()} DH</td>
                    <td className="py-3 px-5 text-neutral-400 capitalize">{p.methode}</td>
                    <td className="py-3 px-5">
                      <span className={`${s.bg} ${s.color} px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1`}>
                        <Icon size={12} />
                        {s.label}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-neutral-500 text-xs">
                      {p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
