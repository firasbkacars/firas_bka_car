import { useState, useEffect } from 'react';
import { CreditCard, Search, Download, RotateCcw, X, AlertTriangle, Loader2, Receipt } from 'lucide-react';
import api from '../../services/api';
import StatutPaiement, { montantSigne } from '../../components/StatutPaiement';

const TYPE_LABELS = {
  acompte: 'Acompte',
  solde: 'Solde',
  complement: 'Complement',
  caution: 'Caution',
  remboursement: 'Remboursement',
};

export default function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundMontant, setRefundMontant] = useState('');
  const [refundMotif, setRefundMotif] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async () => {
    try {
      const { data } = await api.get('/paiements');
      setPaiements(Array.isArray(data) ? data : data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = paiements.filter(p =>
    p.methode?.toLowerCase().includes(search.toLowerCase()) ||
    p.statut?.toLowerCase().includes(search.toLowerCase()) ||
    p.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    TYPE_LABELS[p.type]?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.montant).includes(search)
  );

  // Solde NET : un remboursement compense un encaissement, il ne s'y ajoute pas.
  const totalEncaisse = paiements
    .filter(p => p.statut === 'paye')
    .reduce((a, p) => a + montantSigne(p), 0);
  const totalRembourse = paiements
    .filter(p => p.type === 'remboursement' && p.statut === 'paye')
    .reduce((a, p) => a + Math.abs(Number(p.montant)), 0);
  const totalEnAttente = paiements
    .filter(p => p.statut === 'en_attente')
    .reduce((a, p) => a + Number(p.montant), 0);
  const aVerifier = paiements.filter(p => p.statut === 'suspect').length;

  const exportCSV = async () => {
    try {
      const response = await api.get('/paiements/export', { responseType: 'blob' });
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

  const openRefund = (p) => {
    setRefundTarget(p);
    setRefundMontant(String(p.montant));
    setRefundMotif('');
  };

  const submitRefund = async (e) => {
    e.preventDefault();
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await api.post(`/paiements/${refundTarget.id}/rembourser`, {
        montant: parseFloat(refundMontant),
        motif: refundMotif,
      });
      showToast(`Remboursement de ${parseFloat(refundMontant).toFixed(2)} DH enregistre.`);
      setRefundTarget(null);
      fetchPaiements();
    } catch (err) {
      showToast(err.response?.data?.message || 'Remboursement impossible.', 'error');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <CreditCard size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Paiements</h1>
            <p className="text-neutral-500 text-sm">{paiements.length} ecriture(s)</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">Solde net</p>
          <p className="text-2xl font-bold text-green-400">{totalEncaisse.toLocaleString('fr-FR')} DH</p>
          <p className="text-neutral-600 text-xs mt-1">Encaissements - remboursements</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">Rembourse</p>
          <p className="text-2xl font-bold text-blue-400">{totalRembourse.toLocaleString('fr-FR')} DH</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{totalEnAttente.toLocaleString('fr-FR')} DH</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">A verifier</p>
          <p className={`text-2xl font-bold ${aVerifier > 0 ? 'text-amber-400' : 'text-neutral-600'}`}>{aVerifier}</p>
          {aVerifier > 0 && (
            <p className="text-amber-500/70 text-xs mt-1">Montant divergent de la passerelle</p>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">#</th>
                <th className="text-left py-3 px-5 font-medium">Reservation</th>
                <th className="text-left py-3 px-5 font-medium">Type</th>
                <th className="text-left py-3 px-5 font-medium">Montant</th>
                <th className="text-left py-3 px-5 font-medium">Canal</th>
                <th className="text-left py-3 px-5 font-medium">Transaction / Carte</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-left py-3 px-5 font-medium">Date</th>
                <th className="text-right py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse w-24" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-neutral-500">
                    <CreditCard size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucun paiement trouve</p>
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const estRemboursement = p.type === 'remboursement';
                const signe = montantSigne(p);
                const peutRembourser =
                  p.statut === 'paye' && !estRemboursement && Number(p.montant) > 0;

                return (
                  <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-5 text-neutral-400 font-mono text-xs">#{p.id}</td>
                    <td className="py-3 px-5 text-neutral-300">
                      <div className="font-mono text-xs">{p.reservation?.numero || '—'}</div>
                      {p.reservation?.client?.nom_complet && (
                        <div className="text-neutral-500 text-xs">{p.reservation.client.nom_complet}</div>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`text-xs ${estRemboursement ? 'text-blue-400' : 'text-neutral-400'}`}>
                        {TYPE_LABELS[p.type] || p.type || 'Acompte'}
                      </span>
                    </td>
                    <td className={`py-3 px-5 font-medium ${signe < 0 ? 'text-blue-400' : 'text-white'}`}>
                      {signe < 0 ? '-' : ''}{Math.abs(signe).toLocaleString('fr-FR')} DH
                    </td>
                    <td className="py-3 px-5 text-neutral-400 capitalize">
                      {p.methode === 'cmi' ? 'Carte (CMI)' : p.methode === 'especes' ? 'Especes' : p.methode}
                    </td>
                    <td className="py-3 px-5">
                      {p.transaction_id ? (
                        <div>
                          <div className="font-mono text-[10px] text-neutral-500">{p.transaction_id}</div>
                          {p.carte_masquee && (
                            <div className="text-neutral-400 text-xs mt-0.5">{p.carte_masquee}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <StatutPaiement statut={p.statut_affichage || p.statut} showIcon={false} />
                      {p.code_erreur_gateway && (
                        <div className="text-[10px] text-neutral-600 mt-0.5 font-mono">
                          {p.code_erreur_gateway}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-5 text-neutral-500 text-xs">
                      {p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {peutRembourser && (
                        <button
                          onClick={() => openRefund(p)}
                          className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                        >
                          <RotateCcw size={12} />
                          Rembourser
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={submitRefund}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Receipt size={18} className="text-blue-400" />
                Rembourser l'encaissement #{refundTarget.id}
              </h2>
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="text-neutral-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-neutral-800/50 rounded-xl p-3 mb-4 text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Reservation</span>
                <span className="text-white font-mono">{refundTarget.reservation?.numero || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant encaisse</span>
                <span className="text-white">{Number(refundTarget.montant).toLocaleString('fr-FR')} DH</span>
              </div>
            </div>

            <label className="block text-xs text-neutral-400 mb-1">Montant a rembourser (DH)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={refundTarget.montant}
              required
              value={refundMontant}
              onChange={(e) => setRefundMontant(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-blue-500 outline-none"
            />

            <label className="block text-xs text-neutral-400 mb-1">Motif (obligatoire)</label>
            <textarea
              required
              maxLength={500}
              rows={3}
              value={refundMotif}
              onChange={(e) => setRefundMotif(e.target.value)}
              placeholder="Annulation client, litige, erreur de facturation..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 outline-none resize-none"
            />

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-200/80 text-xs leading-relaxed">
                Cette operation cree une ecriture de remboursement qui compense
                l'encaissement. Les revenus nets en seront diminues d'autant.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-neutral-400 hover:text-white transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={refunding}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {refunding && <Loader2 size={14} className="animate-spin" />}
                Confirmer le remboursement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
