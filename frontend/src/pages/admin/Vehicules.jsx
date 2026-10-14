import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car,
  Plus,
  UploadCloud,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { contratExpire, joursRestants } from '../../lib/formatters';

const PHOTO_LIMIT = 8;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Le backend serialise les dates en 'YYYY-MM-DD 00:00:00'. */
function toInputDate(value) {
  if (!value) return '';
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function contratInfo(v) {
  if (contratExpire(v.date_expiration_assurance) || contratExpire(v.date_expiration_carte_grise)) {
    return { className: 'bg-red-500/15 text-red-400', label: 'Contrat expiré' };
  }

  const echeances = [joursRestants(v.date_expiration_assurance), joursRestants(v.date_expiration_carte_grise)]
    .filter((j) => j !== null && j >= 0);

  if (echeances.length > 0 && Math.min(...echeances) <= 30) {
    return { className: 'bg-orange-500/15 text-orange-400', label: `Contrat J-${Math.min(...echeances)}` };
  }

  return null;
}

function VehicleImage({ src, alt, className = 'w-12 h-8', size = 16 }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fullSrc = src && !src.startsWith('http') && !src.startsWith('data:')
    ? `/storage/${src}`
    : src;

  if (!src || error) {
    return (
      <div className={`${className} bg-neutral-800 border border-neutral-700 rounded flex items-center justify-center flex-shrink-0`}>
        <Car size={size} className="text-muted" />
      </div>
    );
  }

  return (
    <div className={`${className} relative flex-shrink-0`}>
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-800 rounded flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-neutral-600 border-t-red-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={fullSrc}
        alt={alt}
        className={`${className} object-cover rounded ${loaded ? '' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function AdminVehicules() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [vehicules, setVehicules] = useState([]);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVehicule, setEditVehicule] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    marque: '',
    modele: '',
    description: '',
    categorie: 'Berline',
    annee: 2024,
    transmission: 'automatique',
    carburant: 'essence',
    places: 5,
    puissance: '',
    kilometrage: 0,
    kilometrage_alerte: '',
    latitude: '',
    longitude: '',
    prix_jour: 0,
    montant_caution: 0,
    date_expiration_assurance: '',
    date_expiration_carte_grise: '',
    statut: 'disponible',
    agence_id: '',
    populaire: false,
  });

  useEffect(() => {
    fetchVehicules();
    fetchAgences();
  }, []);

  const fetchAgences = async () => {
    try {
      const { data } = await api.get('/agences-admin');
      setAgences(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicules = async () => {
    try {
      const { data } = await api.get('/vehicules-admin');
      setVehicules(data.data || data.vehicules || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (v = null) => {
    if (v) {
      setEditVehicule(v);
      setForm({
        marque: v.marque,
        modele: v.modele,
        description: v.description || '',
        categorie: v.categorie,
        annee: v.annee,
        transmission: v.transmission,
        carburant: v.carburant,
        places: v.places,
        puissance: v.puissance || '',
        kilometrage: v.kilometrage || 0,
        kilometrage_alerte: v.kilometrage_alerte ?? '',
        latitude: v.latitude ?? '',
        longitude: v.longitude ?? '',
        prix_jour: v.prix_jour,
        montant_caution: v.montant_caution || 0,
        date_expiration_assurance: toInputDate(v.date_expiration_assurance),
        date_expiration_carte_grise: toInputDate(v.date_expiration_carte_grise),
        statut: v.statut,
        agence_id: v.agence_id || '',
        populaire: v.populaire,
      });
      setPhotos((v.photos || []).map((p, i) => ({
        id: `existing-${i}`,
        path: p,
        preview: p.startsWith('http') ? p : `/storage/${p}`,
        existing: true,
      })));
    } else {
      setEditVehicule(null);
      setForm({
        marque: '', modele: '', description: '', categorie: 'Berline', annee: 2024,
        transmission: 'automatique', carburant: 'essence', places: 5,
        puissance: '', kilometrage: 0, kilometrage_alerte: '', latitude: '', longitude: '',
        prix_jour: 0, montant_caution: 0, statut: 'disponible',
        date_expiration_assurance: '', date_expiration_carte_grise: '',
        agence_id: agences.find((a) => a.active)?.id || '', populaire: false,
      });
      setPhotos([]);
    }
    setShowModal(true);
  };

  const processFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f =>
      ACCEPTED_TYPES.includes(f.type) && f.size <= 5 * 1024 * 1024
    );

    if (photos.length + valid.length > PHOTO_LIMIT) {
      toast.error(`Maximum ${PHOTO_LIMIT} photos autorisées. Vous en avez déjà ${photos.length}.`);
      return;
    }

    const newPhotos = valid.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      existing: false,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  }, [photos.length]);

  const handleFileInput = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removePhoto = async (photo) => {
    if (photo.existing && editVehicule) {
      try {
        await api.delete(`/vehicules-admin/${editVehicule.id}/photos`, {
          data: { photo_path: photo.path },
        });
      } catch (err) {
        console.error(err);
      }
    } else if (photo.preview && !photo.existing) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const movePhoto = (index, direction) => {
    setPhotos(prev => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const uploadNewPhotos = async () => {
    const newPhotos = photos.filter(p => !p.existing && p.file);
    if (newPhotos.length === 0) return;

    const formData = new FormData();
    newPhotos.forEach(p => formData.append('photos[]', p.file));

    try {
      await api.post(`/vehicules-admin/${editVehicule.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const reorderExistingPhotos = async () => {
    if (!editVehicule) return;
    const existingPaths = photos.filter(p => p.existing).map(p => p.path);
    if (existingPaths.length === 0) return;

    try {
      await api.put(`/vehicules-admin/${editVehicule.id}/photos/reorder`, {
        photos: existingPaths,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    const payload = {
      ...form,
      agence_id: form.agence_id === '' || form.agence_id == null ? null : Number(form.agence_id),
      kilometrage_alerte: form.kilometrage_alerte === '' || form.kilometrage_alerte == null ? null : parseInt(form.kilometrage_alerte),
      latitude: form.latitude === '' || form.latitude == null ? null : parseFloat(form.latitude),
      longitude: form.longitude === '' || form.longitude == null ? null : parseFloat(form.longitude),
    };
    try {
      if (editVehicule) {
        await api.put(`/vehicules-admin/${editVehicule.id}`, payload);
        await uploadNewPhotos();
        await reorderExistingPhotos();
      } else {
        const { data: created } = await api.post('/vehicules-admin', payload);
        if (photos.length > 0) {
          const formData = new FormData();
          photos.forEach(p => {
            if (p.file) formData.append('photos[]', p.file);
          });
          if (formData.has('photos[]')) {
            await api.post(`/vehicules-admin/${created.id}/photos`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
        }
      }
      setShowModal(false);
      toast.success(editVehicule ? 'Véhicule mis à jour.' : 'Véhicule créé.');
      fetchVehicules();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()[0] ||
        'Erreur lors de la sauvegarde';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer le véhicule',
      message: 'Supprimer ce véhicule ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.delete(`/vehicules-admin/${id}`);
      toast.success('Véhicule supprimé.');
      fetchVehicules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const statutBadge = (s) => {
    const c = {
      disponible: 'bg-green-500/15 text-green-400',
      en_location: 'bg-yellow-500/15 text-yellow-400',
      louee: 'bg-yellow-500/15 text-yellow-400',
      maintenance: 'bg-red-500/15 text-red-400',
    };
    const labels = {
      disponible: 'Disponible',
      en_location: 'En location',
      louee: 'Louée',
      maintenance: 'Maintenance',
    };
    return { className: c[s] || 'bg-neutral-500/15 text-neutral-400', label: labels[s] || s };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <Car size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Véhicules</h1>
            <p className="text-muted text-sm">{vehicules.length} véhicule(s)</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Véhicule</th>
                <th className="text-left py-3 px-5 font-medium">Catégorie</th>
                <th className="text-left py-3 px-5 font-medium">Agence</th>
                <th className="text-left py-3 px-5 font-medium">Année</th>
                <th className="text-left py-3 px-5 font-medium">Prix/Jour</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-right py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-neutral-800 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : vehicules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <Car size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucun véhicule</p>
                  </td>
                </tr>
              ) : vehicules.map((v) => {
                const badge = statutBadge(v.statut);
                const contrat = contratInfo(v);
                return (
                  <tr key={v.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <VehicleImage
                          src={v.photos?.[0]}
                          alt={v.modele}
                          className="w-12 h-8"
                          size={16}
                        />
                        <div>
                          <p className="text-white font-medium">{v.marque} {v.modele}</p>
                          <p className="text-muted text-xs">{v.transmission} · {v.carburant} · {v.places}p</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-neutral-300">{v.categorie}</td>
                    <td className="py-3 px-5 text-neutral-300">
                      {v.agence ? (
                        <span className="text-neutral-300">{v.agence.ville}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-neutral-300">{v.annee}</td>
                    <td className="py-3 px-5 text-red-500 font-semibold">{v.prix_jour} DH</td>
                    <td className="py-3 px-5">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`${badge.className} px-2.5 py-1 rounded-full text-xs font-medium`}>
                          {badge.label}
                        </span>
                        {contrat && (
                          <span className={`${contrat.className} px-2.5 py-1 rounded-full text-xs font-medium`}>
                            {contrat.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(v)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition">
                          <Trash2 size={15} />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">
                {editVehicule ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-480">Marque *</label>
                  <input id="ctl-480" required value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-485">Modèle *</label>
                  <input id="ctl-485" required value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-492">Description</label>
                <textarea id="ctl-492" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Description du véhicule affichée sur la fiche publique"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-501">Catégorie</label>
                  <select id="ctl-501" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option>Berline</option>
                    <option>Compacte</option>
                    <option>SUV</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-510">Année</label>
                  <input id="ctl-510" type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value) || 2024 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-518">Transmission</label>
                  <select id="ctl-518" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="automatique">Automatique</option>
                    <option value="manuelle">Manuelle</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-526">Carburant</label>
                  <select id="ctl-526" value={form.carburant} onChange={(e) => setForm({ ...form, carburant: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybride">Hybride</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-538">Places</label>
                  <input id="ctl-538" type="number" value={form.places} onChange={(e) => setForm({ ...form, places: parseInt(e.target.value) || 5 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-543">Prix/Jour (DH)</label>
                  <input id="ctl-543" type="number" value={form.prix_jour} onChange={(e) => setForm({ ...form, prix_jour: parseFloat(e.target.value) })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-548">Caution (DH)</label>
                  <input id="ctl-548" type="number" value={form.montant_caution} onChange={(e) => setForm({ ...form, montant_caution: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-553">Statut</label>
                  <select id="ctl-553" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="disponible">Disponible</option>
                    <option value="en_location">En location</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 text-xs mb-1 block" htmlFor="ctl-564">Agence</label>
                <select id="ctl-564"
                  value={form.agence_id}
                  onChange={(e) => setForm({ ...form, agence_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                >
                  <option value="">Aucune agence</option>
                  {agences.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.active}>
                      {a.nom} — {a.ville}{a.active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
                <p className="text-muted text-xs mt-1">
                  L'agence détermine le lieu de prise en charge et le filtre « Agence » du catalogue.
                </p>
              </div>

              <div>
                <label className="text-neutral-400 text-xs mb-1 block">Contrats</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted text-xs mb-1 block" htmlFor="ctl-586">Expiration assurance</label>
                    <input id="ctl-586"
                      type="date"
                      value={form.date_expiration_assurance}
                      onChange={(e) => setForm({ ...form, date_expiration_assurance: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-muted text-xs mb-1 block" htmlFor="ctl-595">Expiration carte grise</label>
                    <input id="ctl-595"
                      type="date"
                      value={form.date_expiration_carte_grise}
                      onChange={(e) => setForm({ ...form, date_expiration_carte_grise: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                    />
                  </div>
                </div>
                <p className="text-muted text-xs mt-1">
                  Un contrat expire retire le véhicule du catalogue public et bloque les réservations.
                  Un rappel est envoyé 30 jours avant l'échéance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-muted text-xs mb-1 block" htmlFor="ctl-612">Seuil kilométrage (alerte)</label>
                  <input id="ctl-612"
                    type="number"
                    min="0"
                    value={form.kilometrage_alerte}
                    onChange={(e) => setForm({ ...form, kilometrage_alerte: e.target.value })}
                    placeholder="Ex : 100000"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                  />
                  <p className="text-muted text-xs mt-1">Email admin une fois le seuil atteint (G4).</p>
                </div>
                <div>
                  <label className="text-muted text-xs mb-1 block" htmlFor="ctl-624">Latitude (GPS)</label>
                  <input id="ctl-624"
                    type="number"
                    step="0.0000001"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="Ex : 33.5731"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-muted text-xs mb-1 block" htmlFor="ctl-635">Longitude (GPS)</label>
                  <input id="ctl-635"
                    type="number"
                    step="0.0000001"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="Ex : -7.5898"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition"
                  />
                  <p className="text-muted text-xs mt-1">Affichée sur carte OpenStreetMap côté client (V6).</p>
                </div>
              </div>

              {/* Photos section */}
              <div>
                <label className="text-neutral-400 text-xs mb-1 block">
                  Photos du véhicule
                  <span className="text-muted ml-1">({photos.length}/{PHOTO_LIMIT})</span>
                </label>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    dragOver
                      ? 'border-red-600 bg-red-600/5'
                      : 'border-neutral-700 hover:border-red-600/50'
                  }`}
                >
                  <UploadCloud size={28} className={`mx-auto mb-2 ${dragOver ? 'text-red-500' : 'text-muted'}`} />
                  <p className="text-neutral-400 text-sm">
                    Glissez-déposez vos images ici ou{' '}
                    <span className="text-red-500 font-medium">parcourez vos fichiers</span>
                  </p>
                  <p className="text-muted text-xs mt-1">JPG, PNG, WebP — max 5 Mo — {PHOTO_LIMIT} max</p>
                  <input aria-label="Ajouter des photos du véhicule"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {photos.map((photo, i) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800"
                      >
                        <img
                          src={photo.preview}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Principale
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1">
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); movePhoto(i, -1); }}
                              className="bg-black/70 rounded-full p-1 hover:bg-black/90 transition"
                            >
                              <ChevronLeft size={12} className="text-white" />
                            </button>
                          )}
                          {i < photos.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); movePhoto(i, 1); }}
                              className="bg-black/70 rounded-full p-1 hover:bg-black/90 transition"
                            >
                              <ChevronRight size={12} className="text-white" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePhoto(photo); }}
                          className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={form.populaire} onChange={(e) => setForm({ ...form, populaire: e.target.checked })}
                  className="accent-red-600 rounded" />
                Populaire
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  {uploading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editVehicule ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-neutral-800 text-neutral-300 py-2.5 rounded-xl text-sm hover:bg-neutral-700 transition">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
