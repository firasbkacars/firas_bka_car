import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GitCompareArrows, X, ChevronRight } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

function SkeletonCard() {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-52 bg-white/[0.04]" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/[0.06] rounded w-2/3" />
        <div className="h-4 bg-white/[0.04] rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-white/[0.06] rounded w-1/4" />
          <div className="h-8 bg-white/[0.04] rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ v, isSelected, onToggleCompare }) {
  const photo = v.photos?.[0];
  const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
  const [imgSrc, setImgSrc] = useState(resolvedPhoto || FALLBACK_IMG);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="group bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#dc2626]/40 hover:shadow-xl hover:shadow-[#dc2626]/5 transition-all duration-300 relative">
      <div
        onClick={(e) => {
          e.preventDefault();
          onToggleCompare(v);
        }}
        className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
          isSelected
            ? 'bg-[#dc2626] border-[#dc2626]'
            : 'bg-black/50 border-white/30 hover:border-white/60'
        }`}
      >
        {isSelected && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>

      <Link to={`/vehicules/${v.id}`} className="block">
        <div className="relative h-52 bg-white/[0.02] overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-white/[0.03] animate-pulse" />
          )}
          <img
            src={imgSrc}
            alt={`${v.marque} ${v.modele}`}
            loading="lazy"
            onError={() => setImgSrc(FALLBACK_IMG)}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {v.populaire && (
            <span className="absolute top-3 left-3 bg-[#dc2626] text-white text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase">
              Populaire
            </span>
          )}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-white font-semibold text-base group-hover:text-[#dc2626] transition-colors">
              {v.marque} {v.modele}
            </h3>
            <span className="text-[#dc2626] font-bold text-lg whitespace-nowrap">
              {v.prix_jour}
              <span className="text-xs text-white/40 font-normal ml-0.5">DH</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-white/40">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {v.annee}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{v.transmission === 'automatique' ? 'Auto' : 'Manuelle'}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{v.carburant}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{v.places} places</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">Aucun véhicule trouvé</h3>
      <p className="text-white/40 text-sm max-w-sm mb-6">
        Aucun véhicule ne correspond à vos critères de recherche. Essayez de modifier vos filtres.
      </p>
      <button
        onClick={onReset}
        className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

export default function Vehicules() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicules, setVehicules] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    categorie: searchParams.get('categorie') || '',
    marque: searchParams.get('marque') || '',
    transmission: searchParams.get('transmission') || '',
    carburant: searchParams.get('carburant') || '',
    prix_max: searchParams.get('prix_max') || '',
    agence_id: searchParams.get('agence_id') || '',
  });
  const [tri, setTri] = useState('popularite');
  const [compareList, setCompareList] = useState([]);
  const [agences, setAgences] = useState([]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const toggleCompare = (vehicule) => {
    setCompareList(prev => {
      const exists = prev.find(v => v.id === vehicule.id);
      if (exists) {
        return prev.filter(v => v.id !== vehicule.id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, vehicule];
    });
  };

  const removeFromCompare = (id) => {
    setCompareList(prev => prev.filter(v => v.id !== id));
  };

  const goToCompare = () => {
    const ids = compareList.map(v => v.id).join(',');
    navigate(`/vehicules?compare=${ids}`);
  };

  useEffect(() => {
    fetchVehicules();
    fetchAgences();
  }, [filters, tri]);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      const params = { tri, disponibles: 1 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const { data } = await api.get('/vehicules', { params });
      setVehicules(data.data || data.vehicules || []);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgences = async () => {
    try {
      const { data } = await api.get('/agences');
      setAgences(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetFilters = useCallback(() => {
    setFilters({ categorie: '', marque: '', transmission: '', carburant: '', prix_max: '', agence_id: '' });
    setTri('popularite');
    setFiltersOpen(false);
  }, []);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="f-agence" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-2 block">
          Agence
        </label>
        <select
          id="f-agence"
          value={filters.agence_id}
          onChange={(e) => updateFilter('agence_id', e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
        >
          <option value="">Toutes les agences</option>
          {agences.map((agence) => (
            <option key={agence.id} value={agence.id}>{agence.nom}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-categorie" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-2 block">
          Catégorie
        </label>
        <select
          id="f-categorie"
          value={filters.categorie}
          onChange={(e) => updateFilter('categorie', e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
        >
          <option value="">Toutes catégories</option>
          <option value="Berline">Berline</option>
          <option value="Compacte">Compacte</option>
          <option value="SUV">SUV</option>
        </select>
      </div>

      <div>
        <label htmlFor="f-marque" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-2 block">
          Marque
        </label>
        <select
          id="f-marque"
          value={filters.marque}
          onChange={(e) => updateFilter('marque', e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
        >
          <option value="">Toutes marques</option>
          <option value="BMW">BMW</option>
          <option value="Mercedes">Mercedes</option>
          <option value="Audi">Audi</option>
          <option value="Volkswagen">Volkswagen</option>
          <option value="Peugeot">Peugeot</option>
          <option value="Renault">Renault</option>
          <option value="Toyota">Toyota</option>
          <option value="Hyundai">Hyundai</option>
        </select>
      </div>

      <div>
        <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3 block">
          Transmission
        </span>
        <div className="space-y-2">
          {[
            { value: '', label: 'Tous' },
            { value: 'automatique', label: 'Automatique' },
            { value: 'manuelle', label: 'Manuelle' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 text-sm text-white/70 cursor-pointer group/radio"
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                filters.transmission === opt.value
                  ? 'border-[#dc2626] bg-[#dc2626]'
                  : 'border-white/20 group-hover/radio:border-white/40'
              }`}>
                {filters.transmission === opt.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <input
                type="radio"
                name="transmission"
                value={opt.value}
                checked={filters.transmission === opt.value}
                onChange={() => updateFilter('transmission', opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3 block">
          Carburant
        </span>
        <div className="space-y-2">
          {[
            { value: '', label: 'Tous' },
            { value: 'essence', label: 'Essence' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'hybride', label: 'Hybride' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 text-sm text-white/70 cursor-pointer group/radio"
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                filters.carburant === opt.value
                  ? 'border-[#dc2626] bg-[#dc2626]'
                  : 'border-white/20 group-hover/radio:border-white/40'
              }`}>
                {filters.carburant === opt.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <input
                type="radio"
                name="carburant"
                value={opt.value}
                checked={filters.carburant === opt.value}
                onChange={() => updateFilter('carburant', opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="f-prix" className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
            Prix max / jour
          </label>
          <span className="text-[#dc2626] text-xs font-semibold">
            {filters.prix_max ? `${filters.prix_max} DH` : '1500 DH'}
          </span>
        </div>
        <input
          id="f-prix"
          type="range"
          min="200"
          max="1500"
          step="50"
          value={filters.prix_max || 1500}
          onChange={(e) => updateFilter('prix_max', e.target.value === '1500' ? '' : e.target.value)}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#dc2626]"
        />
        <div className="flex justify-between text-[11px] text-white/30 mt-1">
          <span>200 DH</span>
          <span>1500 DH</span>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
        >
          Réinitialiser ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-black" />

        <div className="relative z-10 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="text-[13px] text-white/40 mb-6" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
                </li>
                <li>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </li>
                <li className="text-white/70">Nos véhicules</li>
              </ol>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Notre flotte</h1>
            <p className="text-white/50 text-sm sm:text-base max-w-lg">
              Découvrez notre sélection de véhicules récents et bien entretenus.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-28 bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-sm">Filtres</h3>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-[#dc2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <FiltersContent />
            </div>
          </aside>

          {/* Mobile Filters Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 bg-[#111] border border-white/[0.08] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:border-white/15 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filtres
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-[#dc2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Filters Drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#111] border-l border-white/[0.08] p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold">Filtres</h3>
                  <button onClick={() => setFiltersOpen(false)} className="text-white/40 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FiltersContent />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-white/40 text-sm">
                {loading ? '...' : `${total} véhicule${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
              </span>
              <div className="flex items-center gap-3">
                <label htmlFor="tri" className="sr-only">Trier par</label>
                <select
                  id="tri"
                  value={tri}
                  onChange={(e) => setTri(e.target.value)}
                  className="bg-[#111] border border-white/[0.08] rounded-xl px-4 py-2 text-white text-sm focus:border-[#dc2626]/50 outline-none transition-all appearance-none cursor-pointer pr-8"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  <option value="popularite">Popularité</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                  <option value="annee">Année</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : vehicules.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {vehicules.map((v) => (
                  <VehicleCard
                    key={v.id}
                    v={v}
                    isSelected={compareList.some(c => c.id === v.id)}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-white/[0.1] shadow-2xl shadow-black/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                <GitCompareArrows size={18} className="text-[#dc2626] shrink-0" />
                <span className="text-white/60 text-sm shrink-0">
                  {compareList.length}/3 selected
                </span>
                {compareList.map(v => (
                  <div key={v.id} className="flex items-center gap-2 bg-white/[0.06] px-3 py-1.5 rounded-full shrink-0">
                    <span className="text-white text-sm">{v.marque} {v.modele}</span>
                    <button
                      onClick={() => removeFromCompare(v.id)}
                      className="text-white/40 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={goToCompare}
                disabled={compareList.length < 2}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                  compareList.length >= 2
                    ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
                    : 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                }`}
              >
                Comparer ({compareList.length})
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
