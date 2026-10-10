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

const PHOTO_LIMIT = 8;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function VehicleImage({ src, alt, className = 'w-12 h-8', size = 16 }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fullSrc = src && !src.startsWith('http') && !src.startsWith('data:')
    ? `/storage/${src}`
    : src;

  if (!src || error) {
    return (
      <div className={`${className} bg-neutral-800 border border-neutral-700 rounded flex items-center justify-center flex-shrink-0`}>
        <Car size={size} className="text-neutral-500" />
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
  const [vehicules, setVehicules] = useState([]);
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
    prix_jour: 0,
    montant_caution: 0,
    statut: 'disponible',
    populaire: false,
  });

  useEffect(() => {
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data } = await api.get('/vehicules');
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
        prix_jour: v.prix_jour,
        montant_caution: v.montant_caution || 0,
        statut: v.statut,
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
        puissance: '', kilometrage: 0, prix_jour: 0, montant_caution: 0, statut: 'disponible', populaire: false,
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
      alert(`Maximum ${PHOTO_LIMIT} photos autorisées. Vous en avez déjà ${photos.length}.`);
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
    try {
      if (editVehicule) {
        await api.put(`/vehicules-admin/${editVehicule.id}`, form);
        await uploadNewPhotos();
        await reorderExistingPhotos();
      } else {
        const { data: created } = await api.post('/vehicules-admin', form);
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
      fetchVehicules();
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce véhicule ?')) return;
    try {
      await api.delete(`/vehicules-admin/${id}`);
      fetchVehicules();
    } catch (err) {
      console.error(err);
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
            <p className="text-neutral-500 text-sm">{vehicules.length} véhicule(s)</p>
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
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Véhicule</th>
                <th className="text-left py-3 px-5 font-medium">Catégorie</th>
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
                    <td colSpan={6} className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-neutral-800 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : vehicules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-500">
                    <Car size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucun véhicule</p>
                  </td>
                </tr>
              ) : vehicules.map((v) => {
                const badge = statutBadge(v.statut);
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
                          <p className="text-neutral-500 text-xs">{v.transmission} · {v.carburant} · {v.places}p</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-neutral-300">{v.categorie}</td>
                    <td className="py-3 px-5 text-neutral-300">{v.annee}</td>
                    <td className="py-3 px-5 text-red-500 font-semibold">{v.prix_jour} DH</td>
                    <td className="py-3 px-5">
                      <span className={`${badge.className} px-2.5 py-1 rounded-full text-xs font-medium`}>
                        {badge.label}
                      </span>
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
                  <label className="text-neutral-400 text-xs mb-1 block">Marque *</label>
                  <input required value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Modèle *</label>
                  <input required value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 text-xs mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Description du véhicule affichée sur la fiche publique"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Catégorie</label>
                  <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option>Berline</option>
                    <option>Compacte</option>
                    <option>SUV</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Année</label>
                  <input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value) || 2024 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Transmission</label>
                  <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="automatique">Automatique</option>
                    <option value="manuelle">Manuelle</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Carburant</label>
                  <select value={form.carburant} onChange={(e) => setForm({ ...form, carburant: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybride">Hybride</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Places</label>
                  <input type="number" value={form.places} onChange={(e) => setForm({ ...form, places: parseInt(e.target.value) || 5 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Prix/Jour (DH)</label>
                  <input type="number" value={form.prix_jour} onChange={(e) => setForm({ ...form, prix_jour: parseFloat(e.target.value) })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Caution (DH)</label>
                  <input type="number" value={form.montant_caution} onChange={(e) => setForm({ ...form, montant_caution: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition" />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs mb-1 block">Statut</label>
                  <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-red-600 outline-none transition">
                    <option value="disponible">Disponible</option>
                    <option value="en_location">En location</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Photos section */}
              <div>
                <label className="text-neutral-400 text-xs mb-1 block">
                  Photos du véhicule
                  <span className="text-neutral-600 ml-1">({photos.length}/{PHOTO_LIMIT})</span>
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
                  <UploadCloud size={28} className={`mx-auto mb-2 ${dragOver ? 'text-red-500' : 'text-neutral-500'}`} />
                  <p className="text-neutral-400 text-sm">
                    Glissez-déposez vos images ici ou{' '}
                    <span className="text-red-500 font-medium">parcourez vos fichiers</span>
                  </p>
                  <p className="text-neutral-600 text-xs mt-1">JPG, PNG, WebP — max 5 Mo — {PHOTO_LIMIT} max</p>
                  <input
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
                          <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
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
