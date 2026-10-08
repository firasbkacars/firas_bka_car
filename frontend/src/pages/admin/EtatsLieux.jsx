import { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, X, Upload, Loader2, Eye } from 'lucide-react';
import api from '../../services/api';

export default function EtatsLieux() {
  const [etats, setEtats] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [selectedEtat, setSelectedEtat] = useState(null);

  const [form, setForm] = useState({
    reservation_id: '',
    type: 'depart',
    notes: '',
    photos: [],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [etatsRes, resRes] = await Promise.all([
        api.get('/etats-lieux'),
        api.get('/reservations'),
      ]);
      setEtats(etatsRes.data);
      setReservations(resRes.data.filter(r => r.statut !== 'annulee'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (form.photos.length + files.length > 6) {
      alert('Maximum 6 photos autorisees');
      return;
    }
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setForm({ ...form, photos: [...form.photos, ...newPhotos] });
  };

  const removePhoto = (index) => {
    const newPhotos = [...form.photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setForm({ ...form, photos: newPhotos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reservation_id) return;
    setSaving(true);

    try {
      const photoUrls = [];
      for (const photo of form.photos) {
        const formData = new FormData();
        formData.append('photo', photo.file);
        try {
          const { data } = await api.post('/upload/etat-lieu-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          photoUrls.push(data.url);
        } catch {
          photoUrls.push(photo.preview);
        }
      }

      await api.post('/etats-lieux', {
        reservation_id: parseInt(form.reservation_id),
        type: form.type,
        notes: form.notes,
        photos: photoUrls,
      });

      setShowModal(false);
      setForm({ reservation_id: '', type: 'depart', notes: '', photos: [] });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la creation');
    } finally { setSaving(false); }
  };

  const filtered = etats.filter(e => !filterType || e.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <ClipboardCheck size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Etats des lieux</h1>
            <p className="text-neutral-500 text-sm">{etats.length} etat(s) enregistre(s)</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={16} />
          Nouvel etat
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { value: '', label: 'Tous' },
          { value: 'depart', label: 'Depart' },
          { value: 'retour', label: 'Retour' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === f.value
                ? 'bg-red-600/15 text-red-400'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Reservation</th>
                <th className="text-left py-3 px-5 font-medium">Client</th>
                <th className="text-left py-3 px-5 font-medium">Vehicule</th>
                <th className="text-left py-3 px-5 font-medium">Type</th>
                <th className="text-left py-3 px-5 font-medium">Photos</th>
                <th className="text-left py-3 px-5 font-medium">Date</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    <ClipboardCheck size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucun etat des lieux</p>
                  </td>
                </tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5">
                    <span className="text-white font-mono text-xs">{e.reservation?.numero}</span>
                  </td>
                  <td className="py-3 px-5 text-neutral-300">{e.reservation?.client?.nom_complet}</td>
                  <td className="py-3 px-5 text-neutral-300">
                    {e.reservation?.vehicule?.marque} {e.reservation?.vehicule?.modele}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      e.type === 'depart'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-green-500/15 text-green-400'
                    }`}>
                      {e.type === 'depart' ? 'Depart' : 'Retour'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-neutral-400 text-xs">
                      {e.photos?.length || 0} photo(s)
                    </span>
                  </td>
                  <td className="py-3 px-5 text-neutral-400 text-xs">
                    {new Date(e.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => setSelectedEtat(e)}
                      className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                      title="Voir les details"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-4">Nouvel etat des lieux</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-neutral-400 text-sm mb-1 block">Reservation</label>
                <select
                  value={form.reservation_id}
                  onChange={(e) => setForm({ ...form, reservation_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                  required
                >
                  <option value="">Selectionnez une reservation</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.numero} - {r.client?.nom_complet} ({r.vehicule?.marque} {r.vehicule?.modele})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-neutral-400 text-sm mb-1 block">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                >
                  <option value="depart">Depart (remise du vehicule)</option>
                  <option value="retour">Retour (restitution du vehicule)</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-400 text-sm mb-1 block">Photos (max 6)</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {form.photos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover rounded-lg border border-neutral-700" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                {form.photos.length < 6 && (
                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-700 rounded-xl cursor-pointer hover:border-red-600/50 transition">
                    <Upload size={18} className="text-neutral-500" />
                    <span className="text-neutral-400 text-sm">Ajouter des photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <label className="text-neutral-400 text-sm mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 resize-none"
                  placeholder="Etat du vehicule, dommages observes, etc."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
                <button type="submit" disabled={saving || !form.reservation_id} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEtat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEtat(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <button onClick={() => setSelectedEtat(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">
              Etat des lieux - {selectedEtat.type === 'depart' ? 'Depart' : 'Retour'}
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Reservation {selectedEtat.reservation?.numero} | {selectedEtat.reservation?.vehicule?.marque} {selectedEtat.reservation?.vehicule?.modele}
            </p>
            <p className="text-neutral-500 text-xs mb-4">
              {new Date(selectedEtat.created_at).toLocaleString('fr-FR')} | Agent: {selectedEtat.agent?.name || 'N/A'}
            </p>
            {selectedEtat.photos && selectedEtat.photos.length > 0 && (
              <div className="mb-4">
                <p className="text-neutral-400 text-sm mb-2">Photos :</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedEtat.photos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover rounded-lg border border-neutral-700" />
                  ))}
                </div>
              </div>
            )}
            {selectedEtat.notes && (
              <div>
                <p className="text-neutral-400 text-sm mb-1">Notes :</p>
                <p className="text-white text-sm bg-neutral-800 rounded-lg p-3">{selectedEtat.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
