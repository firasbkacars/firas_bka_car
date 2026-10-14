import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Loader2, BarChart3, Percent, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function CodesPromo() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    type: 'pourcentage',
    valeur: '',
    date_expiration: '',
    usage_max: '',
    actif: true,
  });

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    try {
      const { data } = await api.get('/codes-promo');
      setCodes(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStats = async (id) => {
    try {
      const { data } = await api.get(`/codes-promo/${id}/stats`);
      setStats(data);
      setShowStats(id);
    } catch (err) { console.error(err); }
  };

  const handleOpenModal = (code = null) => {
    if (code) {
      setEditCode(code);
      setForm({
        code: code.code,
        type: code.type,
        valeur: code.valeur,
        date_expiration: code.date_expiration?.split('T')[0] || '',
        usage_max: code.usage_max,
        actif: code.actif,
      });
    } else {
      setEditCode(null);
      setForm({ code: '', type: 'pourcentage', valeur: '', date_expiration: '', usage_max: '', actif: true });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, valeur: parseFloat(form.valeur), usage_max: parseInt(form.usage_max) };
      if (editCode) {
        await api.put(`/codes-promo/${editCode.id}`, payload);
      } else {
        await api.post('/codes-promo', payload);
      }
      setShowModal(false);
      toast.success(editCode ? 'Code promo mis à jour.' : 'Code promo créé.');
      fetchCodes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer le code promo',
      message: 'Supprimer ce code promo ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.delete(`/codes-promo/${id}`);
      toast.success('Code promo supprimé.');
      fetchCodes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const toggleActif = async (code) => {
    try {
      await api.put(`/codes-promo/${code.id}`, { actif: !code.actif });
      fetchCodes();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <Tag size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Codes Promo</h1>
            <p className="text-muted text-sm">{codes.length} code(s)</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={16} />
          Nouveau code
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Code</th>
                <th className="text-left py-3 px-5 font-medium">Type</th>
                <th className="text-left py-3 px-5 font-medium">Valeur</th>
                <th className="text-left py-3 px-5 font-medium">Expiration</th>
                <th className="text-left py-3 px-5 font-medium">Usage</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-right py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={7} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <Tag size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucun code promo</p>
                  </td>
                </tr>
              ) : codes.map((c) => (
                <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5">
                    <span className="text-white font-mono font-bold">{c.code}</span>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      c.type === 'pourcentage' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
                    }`}>
                      {c.type === 'pourcentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                      {c.type === 'pourcentage' ? 'Pourcentage' : 'Montant fixe'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-white font-medium">
                    {c.valeur}{c.type === 'pourcentage' ? '%' : ' DH'}
                  </td>
                  <td className="py-3 px-5 text-neutral-400 text-xs">
                    {c.date_expiration ? new Date(c.date_expiration).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="py-3 px-5 text-neutral-400">
                    {c.usage_actuel}/{c.usage_max}
                  </td>
                  <td className="py-3 px-5">
                    <button
                      onClick={() => toggleActif(c)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                        c.actif
                          ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          : 'bg-neutral-500/15 text-neutral-400 hover:bg-neutral-500/25'
                      }`}
                    >
                      {c.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => fetchStats(c.id)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                        title="Statistiques"
                      >
                        <BarChart3 size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                        title="Modifier"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition"
                        title="Supprimer"
                      >
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

      {/* Modal stats */}
      {showStats && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStats(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setShowStats(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-4">Statistiques - {stats.code.code}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{stats.nombre_utilisations}</p>
                <p className="text-neutral-400 text-sm">Utilisations</p>
              </div>
              <div className="bg-neutral-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary-light">{stats.total_remise} DH</p>
                <p className="text-neutral-400 text-sm">Total remise</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal creation/modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-4">{editCode ? 'Modifier le code' : 'Nouveau code promo'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-250">Code</label>
                <input id="ctl-250"
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 uppercase"
                  placeholder="EX: ETE2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-262">Type</label>
                  <select id="ctl-262"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="pourcentage">Pourcentage</option>
                    <option value="montant_fixe">Montant fixe</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-273">Valeur</label>
                  <input id="ctl-273"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valeur}
                    onChange={(e) => setForm({ ...form, valeur: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                    placeholder={form.type === 'pourcentage' ? '10' : '50'}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-288">Expiration</label>
                  <input id="ctl-288"
                    type="date"
                    value={form.date_expiration}
                    onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-298">Usage max</label>
                  <input id="ctl-298"
                    type="number"
                    min="1"
                    value={form.usage_max}
                    onChange={(e) => setForm({ ...form, usage_max: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                    placeholder="50"
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                  className="rounded border-gray-600 bg-neutral-800 text-red-400 focus:ring-red-600"
                />
                <span className="text-white text-sm">Actif</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {editCode ? 'Modifier' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
