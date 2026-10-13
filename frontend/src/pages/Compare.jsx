import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { Check, ArrowLeft, SlidersHorizontal, Plus } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

const SPECS = [
  { key: 'marque', label: 'Marque' },
  { key: 'modele', label: 'Modele' },
  { key: 'categorie', label: 'Categorie' },
  { key: 'annee', label: 'Annee' },
  { key: 'transmission', label: 'Transmission', format: (v) => v === 'automatique' ? 'Automatique' : 'Manuelle' },
  { key: 'carburant', label: 'Carburant', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : 'N/A' },
  { key: 'places', label: 'Places' },
  { key: 'puissance', label: 'Puissance', format: (v) => v || 'N/A' },
  { key: 'kilometrage', label: 'Kilometrage', format: (v) => v ? `${v.toLocaleString()} km` : 'N/A' },
  { key: 'prix_jour', label: 'Prix / jour', format: (v) => `${v} DH`, highlight: true },
];

const FILTRES_VIDES = {
  categorie: '',
  transmission: '',
  carburant: '',
  prix_min: '',
  prix_max: '',
  places: '',
};

export default function Compare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);

  // V10 : selection guidee avec filtres quand aucun comparatif en cours.
  const [catalogue, setCatalogue] = useState([]);
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  const ids = searchParams.get('compare')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    if (ids.length >= 2) {
      fetchVehicules();
    } else {
      fetchCatalogue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  useEffect(() => {
    if (ids.length < 2) fetchCatalogue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres]);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      const promises = ids.map(id => api.get(`/vehicules/${id}`));
      const results = await Promise.all(promises);
      setVehicules(results.map(r => r.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogue = async () => {
    try {
      setCatalogueLoading(true);
      const params = {};
      Object.entries(filtres).forEach(([k, v]) => { if (v !== '' && v != null) params[k] = v; });
      const { data } = await api.get('/vehicules', { params });
      setCatalogue(data.data || data.vehicules || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCatalogueLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const lancerComparaison = () => {
    if (selectedIds.length >= 2) {
      navigate(`/vehicules/compare?compare=${selectedIds.join(',')}`);
    }
  };

  const inputCls = 'bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/20 focus:border-[#dc2626]/50 outline-none';

  if (ids.length < 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PageHeader
          title="Comparateur de vehicules"
          breadcrumbs={[{ label: 'Comparateur', path: '/vehicules' }]}
        />
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-white/70 mb-2">
            <SlidersHorizontal size={18} className="text-[#dc2626]" />
            <h2 className="font-semibold">Selectionnez 2 a 3 vehicules</h2>
          </div>
          <p className="text-white/40 text-sm mb-6">
            Utilisez les filtres pour trouver les vehicules a comparer.
          </p>

          {/* V10 : filtres */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select value={filtres.categorie} onChange={(e) => setFiltres({ ...filtres, categorie: e.target.value })} className={inputCls}>
              <option value="">Catégorie</option>
              <option value="Berline">Berline</option>
              <option value="SUV">SUV</option>
              <option value="Citadine">Citadine</option>
              <option value="Van">Van</option>
            </select>
            <select value={filtres.transmission} onChange={(e) => setFiltres({ ...filtres, transmission: e.target.value })} className={inputCls}>
              <option value="">Transmission</option>
              <option value="automatique">Automatique</option>
              <option value="manuelle">Manuelle</option>
            </select>
            <select value={filtres.carburant} onChange={(e) => setFiltres({ ...filtres, carburant: e.target.value })} className={inputCls}>
              <option value="">Carburant</option>
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="hybride">Hybride</option>
            </select>
            <input type="number" min="0" placeholder="Prix min" value={filtres.prix_min}
              onChange={(e) => setFiltres({ ...filtres, prix_min: e.target.value })} className={inputCls} />
            <input type="number" min="0" placeholder="Prix max" value={filtres.prix_max}
              onChange={(e) => setFiltres({ ...filtres, prix_max: e.target.value })} className={inputCls} />
            <input type="number" min="2" max="9" placeholder="Places min" value={filtres.places}
              onChange={(e) => setFiltres({ ...filtres, places: e.target.value })} className={inputCls} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setFiltres(FILTRES_VIDES)}
              className="text-white/40 hover:text-white text-sm transition-colors"
            >
              Reinitialiser les filtres
            </button>
            <button
              onClick={lancerComparaison}
              disabled={selectedIds.length < 2}
              className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Comparer ({selectedIds.length}/3)
            </button>
          </div>

          {catalogueLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-44 bg-white/[0.04] rounded-2xl animate-pulse" />)}
            </div>
          ) : catalogue.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-12">Aucun vehicule ne correspond aux filtres.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogue.map((v) => {
                const photo = v.photos?.[0];
                const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
                const selected = selectedIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleSelect(v.id)}
                    disabled={!selected && selectedIds.length >= 3}
                    className={`text-left bg-[#111] border rounded-2xl overflow-hidden transition-all ${
                      selected ? 'border-[#dc2626] ring-1 ring-[#dc2626]/50' : 'border-white/[0.06] hover:border-white/20'
                    } disabled:opacity-40`}
                  >
                    <div className="relative h-36 bg-white/[0.02]">
                      <img src={resolvedPhoto || FALLBACK_IMG} alt={`${v.marque} ${v.modele}`} loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        selected ? 'bg-[#dc2626] text-white' : 'bg-black/60 text-white/60'
                      }`}>
                        {selected ? <Check size={14} /> : <Plus size={14} />}
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg">
                        <span className="text-[#dc2626] font-bold text-sm">{v.prix_jour}</span>
                        <span className="text-white/50 text-xs ml-1">DH/jour</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-white font-semibold text-sm">{v.marque} {v.modele}</h3>
                      <p className="text-white/40 text-xs mt-0.5">{v.annee} - {v.categorie}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PageHeader
          title="Comparateur de vehicules"
          breadcrumbs={[{ label: 'Comparateur', path: '/vehicules' }]}
        />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-white/[0.04] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader
        title="Comparateur de vehicules"
        breadcrumbs={[{ label: 'Comparateur', path: '/vehicules' }]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <Link
          to="/vehicules"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour au catalogue
        </Link>

        {/* Vehicle Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {vehicules.map(v => {
            const photo = v.photos?.[0];
            const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
            return (
              <div key={v.id} className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="relative h-40 bg-white/[0.02]">
                  <img
                    src={resolvedPhoto || FALLBACK_IMG}
                    alt={`${v.marque} ${v.modele}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = FALLBACK_IMG; }}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="text-[#dc2626] font-bold">{v.prix_jour}</span>
                    <span className="text-white/50 text-xs ml-1">DH/jour</span>
                  </div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-white font-semibold">{v.marque} {v.modele}</h3>
                  <p className="text-white/40 text-xs mt-1">{v.annee} - {v.categorie}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-4 text-white/50 text-sm font-medium w-40">Caracteristique</th>
                  {vehicules.map(v => (
                    <th key={v.id} className="text-center px-6 py-4 text-white text-sm font-semibold">
                      {v.marque} {v.modele}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SPECS.map((spec, i) => (
                  <tr key={spec.key} className={`border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-3.5 text-white/50 text-sm">{spec.label}</td>
                    {vehicules.map(v => {
                      const value = v[spec.key];
                      const formatted = spec.format ? spec.format(value) : value;
                      return (
                        <td key={v.id} className={`text-center px-6 py-3.5 text-sm ${spec.highlight ? 'text-[#dc2626] font-bold' : 'text-white'}`}>
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Equipements row */}
                <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                  <td className="px-6 py-3.5 text-white/50 text-sm">Equipements</td>
                  {vehicules.map(v => (
                    <td key={v.id} className="text-center px-6 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        {(v.equipements || []).slice(0, 4).map((eq, i) => (
                          <span key={i} className="text-white text-xs flex items-center gap-1">
                            <Check size={12} className="text-emerald-400" />
                            {eq}
                          </span>
                        ))}
                        {(!v.equipements || v.equipements.length === 0) && (
                          <span className="text-white/30 text-xs">Aucun</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* CTA row */}
                <tr>
                  <td className="px-6 py-5"></td>
                  {vehicules.map(v => (
                    <td key={v.id} className="text-center px-6 py-5">
                      <Link
                        to={`/vehicules/${v.id}`}
                        className="inline-block bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                      >
                        Voir details
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
