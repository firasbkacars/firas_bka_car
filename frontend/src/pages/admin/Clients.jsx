import { useState, useEffect } from 'react';
import { Users, Search, Edit2, Trash2, X, CheckCircle2, XCircle, Eye } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function Clients() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPermisModal, setShowPermisModal] = useState(null);
  const [rejetMotif, setRejetMotif] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/clients');
      setClients(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer le client',
      message: 'Supprimer ce client ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client supprimé.');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.put(`/clients/${editClient.id}`, editClient);
      setShowModal(false);
      toast.success('Client mis à jour.');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
    finally { setSaving(false); }
  };

  const handleValiderPermis = async (id) => {
    try {
      await api.put(`/clients/${id}/permis`, { statut: 'valide' });
      toast.success('Permis validé.');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de valider le permis');
    }
  };

  const handleRejeterPermis = async (id) => {
    try {
      await api.put(`/clients/${id}/permis`, { statut: 'rejete', motif: rejetMotif });
      setShowPermisModal(null);
      setRejetMotif('');
      toast.success('Permis rejeté.');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du rejet');
    }
  };

  const filtered = clients.filter(c =>
    c.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.telephone?.includes(search)
  );

  const getPermisBadge = (c) => {
    if (!c.permis_conduire) {
      return <span className="text-muted bg-neutral-800 px-2 py-1 rounded-full text-xs font-medium">Non uploade</span>;
    }
    switch (c.permis_statut) {
      case 'valide':
        return <span className="text-green-400 bg-green-500/15 px-2 py-1 rounded-full text-xs font-medium">Valide</span>;
      case 'rejete':
        return <span className="text-red-400 bg-red-500/15 px-2 py-1 rounded-full text-xs font-medium">Rejete</span>;
      default:
        return <span className="text-yellow-400 bg-yellow-500/15 px-2 py-1 rounded-full text-xs font-medium">En attente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <Users size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Clients</h1>
            <p className="text-muted text-sm">{clients.length} client(s)</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Rechercher un client..."
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-placeholder focus:outline-none focus:border-red-600 transition"
          />
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Nom</th>
                <th className="text-left py-3 px-5 font-medium">Email</th>
                <th className="text-left py-3 px-5 font-medium">Telephone</th>
                <th className="text-left py-3 px-5 font-medium">CIN</th>
                <th className="text-left py-3 px-5 font-medium">Permis</th>
                <th className="text-right py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={6} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted">
                    <Users size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucun client trouve</p>
                  </td>
                </tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600/15 flex items-center justify-center text-red-400 text-xs font-bold">
                        {c.nom_complet?.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{c.nom_complet}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-neutral-400">{c.email}</td>
                  <td className="py-3 px-5 text-neutral-400">{c.telephone}</td>
                  <td className="py-3 px-5 text-neutral-400 font-mono text-xs">{c.cin}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      {getPermisBadge(c)}
                      {c.permis_conduire && c.permis_statut !== 'valide' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleValiderPermis(c.id)}
                            className="p-1 rounded hover:bg-green-500/10 text-green-400 transition"
                            title="Valider le permis"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => setShowPermisModal(c)}
                            className="p-1 rounded hover:bg-red-500/10 text-red-400 transition"
                            title="Rejeter le permis"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.permis_conduire && (
                        <button
                          onClick={() => window.open(`/storage/${c.permis_conduire}`, '_blank')}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                          title="Voir le permis"
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      <button onClick={() => { setEditClient(c); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal modification client */}
      {showModal && editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-4">Modifier le client</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input aria-label="Nom complet" type="text" value={editClient.nom_complet || ''} onChange={e => setEditClient({ ...editClient, nom_complet: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600" placeholder="Nom complet" />
              <input aria-label="Email" type="email" value={editClient.email || ''} onChange={e => setEditClient({ ...editClient, email: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600" placeholder="Email" />
              <input aria-label="Telephone" type="text" value={editClient.telephone || ''} onChange={e => setEditClient({ ...editClient, telephone: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600" placeholder="Telephone" />
              <input aria-label="CIN" type="text" value={editClient.cin || ''} onChange={e => setEditClient({ ...editClient, cin: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600" placeholder="CIN" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal rejet permis */}
      {showPermisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPermisModal(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setShowPermisModal(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">Rejeter le permis</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Client : <span className="text-white">{showPermisModal.nom_complet}</span>
            </p>
            <textarea aria-label="Motif du rejet du permis"
              value={rejetMotif}
              onChange={(e) => setRejetMotif(e.target.value)}
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 resize-none mb-4"
              placeholder="Motif du rejet (obligatoire)..."
            />
            <div className="flex gap-3">
              <button onClick={() => setShowPermisModal(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
              <button
                onClick={() => handleRejeterPermis(showPermisModal.id)}
                disabled={!rejetMotif.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
