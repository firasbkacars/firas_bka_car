import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const statutContrat = (c) => {
  if (!c.date_expiration) return { label: 'Sans échéance', cls: 'bg-neutral-800 text-neutral-400' };
  const jours = Math.ceil((new Date(c.date_expiration) - new Date()) / 86400000);
  if (jours < 0) return { label: 'Expiré', cls: 'bg-red-500/10 text-red-400' };
  if (jours <= 30) return { label: `Expire dans ${jours} j`, cls: 'bg-yellow-500/10 text-yellow-400' };
  return { label: 'Valide', cls: 'bg-emerald-500/10 text-emerald-400' };
};

export default function ContratsFournisseurs() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContrat, setEditContrat] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    titre: '',
    fournisseur: '',
    reference: '',
    date_debut: '',
    date_expiration: '',
    montant: '',
    notes: '',
  });

  useEffect(() => { fetchContrats(); }, []);

  const fetchContrats = async () => {
    try {
      const { data } = await api.get('/contrats-fournisseurs');
      setContrats(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (contrat = null) => {
    if (contrat) {
      setEditContrat(contrat);
      setForm({
        titre: contrat.titre,
        fournisseur: contrat.fournisseur,
        reference: contrat.reference || '',
        date_debut: contrat.date_debut?.split('T')[0] || '',
        date_expiration: contrat.date_expiration?.split('T')[0] || '',
        montant: contrat.montant || '',
        notes: contrat.notes || '',
      });
    } else {
      setEditContrat(null);
      setForm({ titre: '', fournisseur: '', reference: '', date_debut: '', date_expiration: '', montant: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        reference: form.reference || null,
        date_expiration: form.date_expiration || null,
        montant: form.montant ? parseFloat(form.montant) : null,
        notes: form.notes || null,
      };
      if (editContrat) {
        await api.put(`/contrats-fournisseurs/${editContrat.id}`, payload);
      } else {
        await api.post('/contrats-fournisseurs', payload);
      }
      setShowModal(false);
      toast.success(editContrat ? 'Contrat mis à jour.' : 'Contrat créé.');
      fetchContrats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer le contrat',
      message: 'Supprimer ce contrat fournisseur ?',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.delete(`/contrats-fournisseurs/${id}`);
      toast.success('Contrat supprimé.');
      fetchContrats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <FileText size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Contrats fournisseurs</h1>
            <p className="text-muted text-sm">{contrats.length} contrat(s)</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={16} />
          Nouveau contrat
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Titre</th>
                <th className="text-left py-3 px-5 font-medium">Fournisseur</th>
                <th className="text-left py-3 px-5 font-medium">Référence</th>
                <th className="text-left py-3 px-5 font-medium">Début</th>
                <th className="text-left py-3 px-5 font-medium">Expiration</th>
                <th className="text-left py-3 px-5 font-medium">Montant</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-left py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={8} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : contrats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">
                    <FileText size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucun contrat fournisseur</p>
                  </td>
                </tr>
              ) : contrats.map((c) => {
                const st = statutContrat(c);
                return (
                  <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-5 text-white font-medium">{c.titre}</td>
                    <td className="py-3 px-5 text-neutral-400">{c.fournisseur}</td>
                    <td className="py-3 px-5 text-neutral-400">{c.reference || '—'}</td>
                    <td className="py-3 px-5 text-neutral-400">{c.date_debut?.split('T')[0]}</td>
                    <td className="py-3 px-5 text-neutral-400">{c.date_expiration?.split('T')[0] || '—'}</td>
                    <td className="py-3 px-5 text-neutral-300">{c.montant ? `${Number(c.montant).toLocaleString('fr-FR')} DH` : '—'}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                        {(st.label === 'Expiré' || st.label.startsWith('Expire')) && <AlertTriangle size={11} />}
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenModal(c)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Modifier">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editContrat ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input aria-label="Titre" required placeholder="Titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
              <input aria-label="Fournisseur" required placeholder="Fournisseur" value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
              <input aria-label="Référence (optionnel)" placeholder="Référence (optionnel)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block" htmlFor="ctl-204">Date de début</label>
                  <input id="ctl-204" required type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block" htmlFor="ctl-209">Expiration</label>
                  <input id="ctl-209" type="date" value={form.date_expiration} onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
                </div>
              </div>
              <input aria-label="Montant (DH)" type="number" step="0.01" min="0" placeholder="Montant (DH)" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
              <textarea aria-label="Notes" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm" />
              <button type="submit" disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editContrat ? 'Enregistrer' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
