import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  History,
  Loader2,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const STATUT_LABELS = {
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const STATUT_STYLES = {
  confirmee: 'bg-blue-500/15 text-blue-400',
  en_cours: 'bg-yellow-500/15 text-yellow-400',
  terminee: 'bg-green-500/15 text-green-400',
  annulee: 'bg-red-500/15 text-red-400',
};

const PER_PAGE_OPTIONS = [10, 20, 50];

function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800/50">
      <td colSpan={8} className="px-5 py-4">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-4 w-28 bg-neutral-800 rounded" />
          <div className="h-4 w-24 bg-neutral-800 rounded" />
          <div className="h-4 w-32 bg-neutral-800 rounded" />
          <div className="h-4 w-28 bg-neutral-800 rounded" />
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-5 w-16 bg-neutral-800 rounded-full" />
        </div>
      </td>
    </tr>
  );
}

function SortButton({ field, sort, onSort, children }) {
  const active = sort.field === field;
  const dir = active ? sort.dir : null;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 font-medium transition ${active ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
    >
      {children}
      {active ? (
        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

export default function AdminReservations() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterVehicule, setFilterVehicule] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [cautionModal, setCautionModal] = useState(null);
  const [cautionStatut, setCautionStatut] = useState('');
  const [cautionMotif, setCautionMotif] = useState('');
  const [cautionRetenu, setCautionRetenu] = useState('');
  const [cautionHist, setCautionHist] = useState(null);
  const [cautionHistLoading, setCautionHistLoading] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reservations');
      setReservations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnuler = async (id) => {
    const ok = await confirm({
      title: 'Annuler la réservation',
      message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
      confirmLabel: 'Annuler la réservation',
    });
    if (!ok) return;
    try {
      await api.put(`/reservations/${id}/annuler`);
      toast.success('Réservation annulée.');
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    }
  };

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleUpdateCaution = async () => {
    if (!cautionModal || !cautionStatut) return;
    if (cautionStatut === 'retenue_partiellement' && (!cautionMotif || !cautionRetenu || Number(cautionRetenu) <= 0)) {
      toast.error('Le motif et un montant retenu positif sont obligatoires.');
      return;
    }
    try {
      await api.put(`/reservations/${cautionModal.id}/caution`, {
        caution_statut: cautionStatut,
        montant_retenu: cautionStatut === 'retenue_partiellement' ? Number(cautionRetenu) : 0,
        motif_rejet_caution: cautionStatut === 'retenue_partiellement' ? cautionMotif : null,
      });
      setCautionModal(null);
      setCautionStatut('');
      setCautionMotif('');
      setCautionRetenu('');
      fetchReservations();
      toast.success('Caution mise a jour.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise a jour de la caution.');
    }
  };

  const showCautionHistorique = async (reservation) => {
    setCautionHistLoading(true);
    setCautionHist({ reservation, entries: [] });
    try {
      const { data } = await api.get(`/reservations/${reservation.id}/caution-historique`);
      setCautionHist({ reservation, entries: data });
    } catch {
      toast.error('Impossible de charger l\'historique des cautions');
      setCautionHist(null);
    } finally {
      setCautionHistLoading(false);
    }
  };

  const uniqueVehicules = useMemo(() => {
    const map = new Map();
    reservations.forEach(r => {
      if (r.vehicule) {
        map.set(r.vehicule.id, `${r.vehicule.marque} ${r.vehicule.modele}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [reservations]);

  const filtered = useMemo(() => {
    let result = [...reservations];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.numero?.toLowerCase().includes(q) ||
        r.client?.nom_complet?.toLowerCase().includes(q)
      );
    }

    if (filterStatut) {
      result = result.filter(r => r.statut === filterStatut);
    }

    if (filterVehicule) {
      result = result.filter(r => String(r.vehicule_id) === filterVehicule);
    }

    if (filterDateStart) {
      result = result.filter(r => new Date(r.date_debut) >= new Date(filterDateStart));
    }

    if (filterDateEnd) {
      result = result.filter(r => new Date(r.date_fin) <= new Date(filterDateEnd));
    }

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sort.field) {
        case 'numero': aVal = a.numero; bVal = b.numero; break;
        case 'client': aVal = a.client?.nom_complet || ''; bVal = b.client?.nom_complet || ''; break;
        case 'vehicule': aVal = `${a.vehicule?.marque} ${a.vehicule?.modele}`; bVal = `${b.vehicule?.marque} ${b.vehicule?.modele}`; break;
        case 'date_debut': aVal = new Date(a.date_debut); bVal = new Date(b.date_debut); break;
        case 'prix_total': aVal = Number(a.prix_total); bVal = Number(b.prix_total); break;
        case 'statut': aVal = a.statut; bVal = b.statut; break;
        default: aVal = new Date(a.created_at); bVal = new Date(b.created_at);
      }
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [reservations, search, filterStatut, filterVehicule, filterDateStart, filterDateEnd, sort]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatut, filterVehicule, filterDateStart, filterDateEnd, perPage]);

  const totalMontant = filtered.reduce((a, r) => a + Number(r.prix_total || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Réservations</h1>
          <p className="text-neutral-500 text-sm">
            {filtered.length} réservation(s) — {totalMontant.toLocaleString('fr-FR')} DH
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher par client ou n°..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition"
            />
          </div>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition appearance-none cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="confirmee">Confirmée</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>

          <select
            value={filterVehicule}
            onChange={(e) => setFilterVehicule(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition appearance-none cursor-pointer"
          >
            <option value="">Tous les véhicules</option>
            {uniqueVehicules.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
            />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5"><SortButton field="numero" sort={sort} onSort={handleSort}>N° Réservation</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="client" sort={sort} onSort={handleSort}>Client</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="vehicule" sort={sort} onSort={handleSort}>Véhicule</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="date_debut" sort={sort} onSort={handleSort}>Dates</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="prix_total" sort={sort} onSort={handleSort}>Montant</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="statut" sort={sort} onSort={handleSort}>Statut</SortButton></th>
                <th className="text-left py-3 px-5 font-medium text-neutral-500">Caution</th>
                <th className="text-right py-3 px-5 font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-neutral-500">
                    <Inbox size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucune réservation trouvée</p>
                  </td>
                </tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5 text-white font-mono text-xs">{r.numero}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-600/15 flex items-center justify-center text-red-400 text-[10px] font-bold flex-shrink-0">
                        {r.client?.nom_complet?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="text-neutral-300">{r.client?.nom_complet}</span>
                        {r.conducteur_additionnel_nom && (
                          <p className="text-[10px] text-purple-400 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            + {r.conducteur_additionnel_nom}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-neutral-300">
                    {r.vehicule?.marque} {r.vehicule?.modele}
                  </td>
                  <td className="py-3 px-5 text-neutral-500 text-xs whitespace-nowrap">
                    {new Date(r.date_debut).toLocaleDateString('fr-FR')} — {new Date(r.date_fin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-5 text-white font-medium">
                    {Number(r.prix_total).toLocaleString('fr-FR')} DH
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[r.statut] || 'bg-neutral-500/15 text-neutral-400'}`}>
                      {STATUT_LABELS[r.statut] || r.statut}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    {r.montant_caution > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCautionModal(r);
                            setCautionStatut(r.caution_statut || 'bloquee');
                            setCautionMotif(r.motif_rejet_caution || '');
                            setCautionRetenu(r.montant_retenu_caution || '');
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition hover:opacity-80 ${
                            r.caution_statut === 'restituee'
                              ? 'bg-green-500/15 text-green-400'
                              : r.caution_statut === 'retenue_partiellement'
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'bg-blue-500/15 text-blue-400'
                          }`}
                          title="Gerer la caution"
                        >
                          <Shield size={10} className="inline mr-1" />
                          {r.caution_statut === 'restituee' ? 'Restituee' : r.caution_statut === 'retenue_partiellement' ? 'retenue' : 'Bloquee'}
                        </button>
                        <button
                          onClick={() => showCautionHistorique(r)}
                          className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition"
                          title="Historique des caution"
                        >
                          <History size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.statut !== 'annulee' && r.statut !== 'terminee' && (
                        <button
                          onClick={() => handleAnnuler(r.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition"
                          title="Annuler"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span>Afficher</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-red-600 cursor-pointer"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>sur {filtered.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                      page === pageNum
                        ? 'bg-red-600 text-white'
                        : 'text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {cautionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCautionModal(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setCautionModal(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">Gerer la caution</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Reservation {cautionModal.numero} | {cautionModal.montant_caution} DH
            </p>
            <div className="space-y-3">
              <label className="text-neutral-400 text-sm block">Statut de la caution</label>
              <select
                value={cautionStatut}
                onChange={(e) => setCautionStatut(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
              >
                <option value="bloquee">Bloquee (en attente)</option>
                <option value="restituee">Restituee (remboursee)</option>
                <option value="retenue_partiellement">Retenue partiellement</option>
              </select>
              {cautionStatut === 'retenue_partiellement' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-neutral-400 text-sm mb-1 block">Montant retenu (DH)</label>
                    <input
                      type="number"
                      min="0"
                      max={cautionModal.montant_caution}
                      step="0.01"
                      value={cautionRetenu}
                      onChange={(e) => setCautionRetenu(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                      placeholder="Ex: 500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm mb-1 block">Motif de la retenue</label>
                    <textarea
                      value={cautionMotif}
                      onChange={(e) => setCautionMotif(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 resize-none"
                      placeholder="Description des dommages ou motifs..."
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCautionModal(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
                <button onClick={handleUpdateCaution} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">Confirmer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cautionHist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCautionHist(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <button onClick={() => setCautionHist(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">Historique des cautions</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Reservation {cautionHist.reservation.numero} | {cautionHist.reservation.montant_caution} DH
            </p>
            {cautionHistLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-neutral-400" />
              </div>
            ) : cautionHist.entries.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">Aucune modification de caution enregistree.</p>
            ) : (
              <div className="space-y-3">
                {cautionHist.entries.map((h) => (
                  <div key={h.id} className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">{h.ancien_statut || '-'}</span>
                        <span className="text-neutral-600">→</span>
                        <span className="text-white font-medium">{h.nouveau_statut}</span>
                      </div>
                      <span className="text-neutral-500 text-xs">
                        {new Date(h.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {Number(h.montant_retenu) > 0 && (
                      <p className="text-yellow-400 text-xs mb-1">Retenu : {Number(h.montant_retenu).toLocaleString('fr-FR')} DH</p>
                    )}
                    {h.motif && <p className="text-neutral-400 text-xs mb-1">Motif : {h.motif}</p>}
                    <p className="text-neutral-500 text-xs">Par : {h.agent?.name || 'Système'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
