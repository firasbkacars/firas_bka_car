import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Wrench, Plus, X, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const TYPE_OPTIONS = [
  'Vidange',
  'Controle technique',
  'Assurance',
  'Pneus',
  'Freins',
  'Courroie',
  'Batterie',
  'Revision generale',
  'Autre',
];

const STATUT_COLORS = {
  prevue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  en_cours: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  terminee: 'bg-green-500/10 border-green-500/20 text-green-400',
};

const STATUT_LABELS = {
  prevue: 'Prevue',
  en_cours: 'En cours',
  terminee: 'Terminee',
};

export default function AdminMaintenances() {
  const toast = useToast();
  const [maintenances, setMaintenances] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicule_id: '',
    type: '',
    description: '',
    date_prevue: '',
    cout: '',
    statut: 'prevue',
    notes: '',
  });

  useEffect(() => {
    fetchMaintenances();
    fetchVehicules();
  }, []);

  const fetchMaintenances = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/maintenances');
      setMaintenances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicules = async () => {
    try {
      const { data } = await api.get('/vehicules-admin');
      setVehicules(data.vehicules || data.data || data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/maintenances', form);
      setShowModal(false);
      setForm({ vehicule_id: '', type: '', description: '', date_prevue: '', cout: '', statut: 'prevue', notes: '' });
      toast.success('Maintenance créée.');
      fetchMaintenances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la creation');
    } finally {
      setSaving(false);
    }
  };

  const updateStatut = async (id, statut) => {
    try {
      await api.put(`/maintenances/${id}`, {
        statut,
        date_realisee: statut === 'terminee' ? new Date().toISOString().split('T')[0] : null,
      });
      fetchMaintenances();
    } catch (err) {
      console.error(err);
    }
  };

  const isEnRetard = (datePrevu, statut) => {
    return statut !== 'terminee' && new Date(datePrevu) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Maintenances</h1>
          <p className="text-neutral-400 text-sm mt-1">Gestion de la maintenance des vehicules</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nouvelle maintenance
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neutral-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-1/3" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : maintenances.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <Wrench size={40} className="mx-auto text-neutral-700 mb-3" />
          <p className="text-neutral-500 text-sm">Aucune maintenance enregistree.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {maintenances.map(m => (
            <div
              key={m.id}
              className={`bg-neutral-900 border rounded-xl p-4 ${
                isEnRetard(m.date_prevue, m.statut) ? 'border-red-500/30' : 'border-neutral-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isEnRetard(m.date_prevue, m.statut) ? 'bg-red-500/10' : 'bg-neutral-800'
                }`}>
                  {isEnRetard(m.date_prevue, m.statut) ? (
                    <AlertTriangle size={18} className="text-red-400" />
                  ) : (
                    <Wrench size={18} className="text-neutral-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">
                      {m.vehicule?.marque} {m.vehicule?.modele}
                    </span>
                    <span className="text-neutral-500 text-xs">-</span>
                    <span className="text-white/70 text-sm">{m.type}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUT_COLORS[m.statut]}`}>
                      {STATUT_LABELS[m.statut]}
                    </span>
                    {isEnRetard(m.date_prevue, m.statut) && (
                      <span className="text-red-400 text-xs font-medium">En retard</span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-neutral-500 text-xs mt-1">{m.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Prevu le {new Date(m.date_prevue).toLocaleDateString('fr-FR')}
                    </span>
                    {m.cout && <span>{m.cout} DH</span>}
                    {m.date_realisee && (
                      <span className="text-green-400">
                        Realise le {new Date(m.date_realisee).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.statut === 'prevue' && (
                    <button
                      onClick={() => updateStatut(m.id, 'en_cours')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors"
                    >
                      Commencer
                    </button>
                  )}
                  {m.statut === 'en_cours' && (
                    <button
                      onClick={() => updateStatut(m.id, 'terminee')}
                      className="text-green-400 hover:text-green-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-colors"
                    >
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h3 className="text-white font-semibold">Nouvelle maintenance</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-neutral-400 text-xs mb-1.5 block">Vehicule</label>
                <select
                  value={form.vehicule_id}
                  onChange={(e) => setForm({ ...form, vehicule_id: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                >
                  <option value="">Selectionner un vehicule</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>{v.marque} {v.modele}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-neutral-400 text-xs mb-1.5 block">Type de maintenance</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                >
                  <option value="">Selectionner un type</option>
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-neutral-400 text-xs mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none resize-none"
                  placeholder="Details optionnels..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 text-xs mb-1.5 block">Date prevue</label>
                  <input
                    type="date"
                    value={form.date_prevue}
                    onChange={(e) => setForm({ ...form, date_prevue: e.target.value })}
                    required
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1.5 block">Cout (DH)</label>
                  <input
                    type="number"
                    value={form.cout}
                    onChange={(e) => setForm({ ...form, cout: e.target.value })}
                    min="0"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-neutral-400 text-xs mb-1.5 block">Statut</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                >
                  <option value="prevue">Prevue</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminee">Terminee</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-400 text-xs mb-1.5 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none resize-none"
                  placeholder="Notes additionnelles..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-white px-4 py-2.5 text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
