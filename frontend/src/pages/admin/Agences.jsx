import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, Mail, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const EMPTY_FORM = {
  nom: '',
  adresse: '',
  ville: '',
  telephone: '',
  email: '',
  active: true,
};

export default function Agences() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAgence, setEditAgence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchAgences(); }, []);

  const fetchAgences = async () => {
    try {
      const { data } = await api.get('/agences-admin');
      setAgences(data);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les agences.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (agence = null) => {
    if (agence) {
      setEditAgence(agence);
      setForm({
        nom: agence.nom,
        adresse: agence.adresse,
        ville: agence.ville,
        telephone: agence.telephone || '',
        email: agence.email || '',
        active: agence.active,
      });
    } else {
      setEditAgence(null);
      setForm(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editAgence) {
        await api.put(`/agences/${editAgence.id}`, form);
        toast.success('Agence mise a jour.');
      } else {
        await api.post('/agences', form);
        toast.success('Agence creee.');
      }
      setShowModal(false);
      fetchAgences();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()[0] ||
        'Erreur lors de la sauvegarde';
      toast.error(message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (agence) => {
    const ok = await confirm({
      title: "Supprimer l'agence",
      message: `Supprimer l'agence « ${agence.nom} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    setDeletingId(agence.id);
    try {
      await api.delete(`/agences/${agence.id}`);
      toast.success('Agence supprimee.');
      fetchAgences();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally { setDeletingId(null); }
  };

  const toggleActive = async (agence) => {
    try {
      await api.put(`/agences/${agence.id}`, { active: !agence.active });
      toast.success(agence.active ? 'Agence desactivee.' : 'Agence activee.');
      fetchAgences();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const inputClass =
    'w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition';

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Chargement des agences...</span>
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agences</h1>
          <p className="text-neutral-500 text-sm mt-1">{agences.length} agence(s)</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle agence
        </button>
      </div>

      {agences.length === 0 && (
        <p className="text-neutral-500 text-sm">Aucune agence pour le moment.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agences.map((agence) => (
          <div key={agence.id} className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{agence.nom}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${agence.active ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700/40 text-neutral-400'}`}>
                    {agence.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(agence)} className="p-1.5 text-neutral-400 hover:text-white" title={agence.active ? 'Desactiver' : 'Activer'}>
                  {agence.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => handleOpenModal(agence)} className="p-1.5 text-neutral-400 hover:text-white" aria-label={`Modifier ${agence.nom}`}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(agence)}
                  disabled={deletingId === agence.id}
                  className="p-1.5 text-neutral-400 hover:text-red-400 disabled:opacity-50"
                  aria-label={`Supprimer ${agence.nom}`}
                >
                  {deletingId === agence.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-neutral-400">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{agence.adresse}, {agence.ville}</span>
              </div>
              {agence.telephone && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{agence.telephone}</span>
                </div>
              )}
              {agence.email && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{agence.email}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-800">
              <span className="text-xs text-neutral-500">{agence.vehicules_count} vehicule(s)</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editAgence ? 'Modifier l\'agence' : 'Nouvelle agence'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="agence-form"
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editAgence ? 'Modifier' : 'Creer'}
            </button>
          </>
        }
      >
        <form id="agence-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="agence-nom" className="block text-neutral-400 text-xs mb-1">Nom *</label>
            <input
              id="agence-nom"
              data-autofocus
              type="text"
              value={form.nom}
              onChange={setField('nom')}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="agence-adresse" className="block text-neutral-400 text-xs mb-1">Adresse *</label>
            <input
              id="agence-adresse"
              type="text"
              value={form.adresse}
              onChange={setField('adresse')}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="agence-ville" className="block text-neutral-400 text-xs mb-1">Ville *</label>
            <input
              id="agence-ville"
              type="text"
              value={form.ville}
              onChange={setField('ville')}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="agence-telephone" className="block text-neutral-400 text-xs mb-1">Telephone</label>
              <input
                id="agence-telephone"
                type="text"
                value={form.telephone}
                onChange={setField('telephone')}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="agence-email" className="block text-neutral-400 text-xs mb-1">Email</label>
              <input
                id="agence-email"
                type="email"
                value={form.email}
                onChange={setField('email')}
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              className="w-4 h-4 accent-red-600 rounded"
            />
            Agence active
          </label>
        </form>
      </Modal>
    </div>
  );
}
