import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Calendar, Check, ChevronDown, ChevronRight, Fuel, GitCompareArrows,
  Search, Settings2, SlidersHorizontal, Users, X,
} from 'lucide-react';
import FavoriButton from '../components/FavoriButton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

const SELECT_CLASS =
  'min-h-11 w-full appearance-none rounded-xl border border-line-strong bg-neutral-800 px-4 pe-10 text-base text-white outline-none transition-colors focus:border-primary sm:text-sm';

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-white/[0.04]" />
      <div className="space-y-3 p-4 md:p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.04]" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-1/4 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/[0.04]" />
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
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-neutral-700">
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Comparer ${v.marque} ${v.modele}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleCompare(v);
        }}
        className="absolute start-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-xl"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
            isSelected
              ? 'border-primary bg-primary'
              : 'border-line-strong bg-black/50 hover:border-white'
          }`}
        >
          {isSelected && <Check size={14} className="text-white" aria-hidden="true" />}
        </span>
      </button>

      <FavoriButton vehiculeId={v.id} className="absolute end-1 top-1" />

      <Link to={`/vehicules/${v.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.02]">
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-white/[0.03]" aria-hidden="true" />
          )}
          <img
            src={imgSrc}
            alt={`${v.marque} ${v.modele}`}
            loading="lazy"
            onError={() => setImgSrc(FALLBACK_IMG)}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {v.populaire && (
            <span className="absolute bottom-3 start-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Populaire
            </span>
          )}
          <div className="absolute bottom-3 end-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
              <ChevronRight size={18} aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="p-4 md:p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-white transition-colors group-hover:text-primary-light">
              {v.marque} {v.modele}
            </h3>
            <span className="whitespace-nowrap text-lg font-bold tabular-nums text-primary-light">
              {v.prix_jour}
              <span className="ms-0.5 text-xs font-normal text-muted">DH</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} aria-hidden="true" />
              {v.annee}
            </span>
            <span className="flex items-center gap-1.5">
              <Settings2 size={12} aria-hidden="true" />
              {v.transmission === 'automatique' ? 'Auto' : 'Manuelle'}
            </span>
            <span className="flex items-center gap-1.5">
              <Fuel size={12} aria-hidden="true" />
              {v.carburant}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={12} aria-hidden="true" />
              {v.places} places
            </span>
          </div>
          {v.description && (
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted">
              {v.description}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface">
        <Search size={40} className="text-muted" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">Aucun véhicule trouvé</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted">
        Aucun véhicule ne correspond à vos critères de recherche. Essayez de modifier vos filtres.
      </p>
      <button
        onClick={onReset}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={onChange} className={SELECT_CLASS}>
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
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
  // Parametres issus de la barre de recherche d'accueil / liens du footer.
  // Sans etat, ils seraient ignores et la recherche perdrait ses criteres.
  const [search, setSearch] = useState({
    date_debut: searchParams.get('date_prise') || '',
    date_fin: searchParams.get('date_retour') || '',
    populaire: searchParams.get('populaire') || '',
  });
  const [tri, setTri] = useState('popularite');
  const [compareList, setCompareList] = useState([]);
  const [agences, setAgences] = useState([]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length + Object.values(search).filter(Boolean).length;

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
    navigate(`/vehicules/compare?compare=${ids}`);
  };

  useEffect(() => {
    fetchVehicules();
    fetchAgences();
  }, [filters, search, tri]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      const params = { tri, disponibles: 1 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      Object.entries(search).forEach(([k, v]) => {
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
    setSearch({ date_debut: '', date_fin: '', populaire: '' });
    setTri('popularite');
    setFiltersOpen(false);
  }, []);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const removeSearchParam = (key, scope) => {
    if (scope === 'filters') {
      setFilters(prev => ({ ...prev, [key]: '' }));
    } else {
      setSearch(prev => ({ ...prev, [key]: '' }));
    }
  };

  const searchChips = [
    search.date_debut && { key: 'date_debut', label: `Du : ${search.date_debut}`, scope: 'search' },
    search.date_fin && { key: 'date_fin', label: `Au : ${search.date_fin}`, scope: 'search' },
    search.populaire && { key: 'populaire', label: 'Populaires uniquement', scope: 'search' },
  ].filter(Boolean);

  const FiltersContent = () => (
    <div className="space-y-6">
      <FilterSelect
        id="f-agence"
        label="Agence"
        value={filters.agence_id}
        onChange={(e) => updateFilter('agence_id', e.target.value)}
      >
        <option value="">Toutes les agences</option>
        {agences.map((agence) => (
          <option key={agence.id} value={agence.id}>{agence.nom}</option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="f-categorie"
        label="Catégorie"
        value={filters.categorie}
        onChange={(e) => updateFilter('categorie', e.target.value)}
      >
        <option value="">Toutes catégories</option>
        <option value="Berline">Berline</option>
        <option value="Compacte">Compacte</option>
        <option value="Citadine">Citadine</option>
        <option value="SUV">SUV</option>
      </FilterSelect>

      <FilterSelect
        id="f-marque"
        label="Marque"
        value={filters.marque}
        onChange={(e) => updateFilter('marque', e.target.value)}
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
      </FilterSelect>

      <fieldset>
        <legend className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted">
          Transmission
        </legend>
        <div className="space-y-1">
          {[
            { value: '', label: 'Tous' },
            { value: 'automatique', label: 'Automatique' },
            { value: 'manuelle', label: 'Manuelle' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="group/radio flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted transition-colors hover:text-white"
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                filters.transmission === opt.value
                  ? 'border-primary bg-primary'
                  : 'border-line-strong group-hover/radio:border-white'
              }`}>
                {filters.transmission === opt.value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
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
      </fieldset>

      <fieldset>
        <legend className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted">
          Carburant
        </legend>
        <div className="space-y-1">
          {[
            { value: '', label: 'Tous' },
            { value: 'essence', label: 'Essence' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'hybride', label: 'Hybride' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="group/radio flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted transition-colors hover:text-white"
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                filters.carburant === opt.value
                  ? 'border-primary bg-primary'
                  : 'border-line-strong group-hover/radio:border-white'
              }`}>
                {filters.carburant === opt.value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
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
      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="f-prix" className="text-xs font-medium uppercase tracking-wider text-muted">
            Prix max / jour
          </label>
          <span className="text-xs font-semibold tabular-nums text-primary-light">
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
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
          <span>200 DH</span>
          <span>1500 DH</span>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Réinitialiser ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-dark-bg">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-dark-bg" aria-hidden="true" />

        <div className="relative z-10 pb-16 pt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-xs text-muted" aria-label="Fil d'Ariane">
              <Link to="/" className="transition-colors hover:text-white">Accueil</Link>
              <ChevronRight size={12} aria-hidden="true" className="rtl:rotate-180" />
              <span className="text-white" aria-current="page">Nos véhicules</span>
            </nav>

            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white md:text-3xl">Notre flotte</h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              Découvrez notre sélection de véhicules récents et bien entretenus.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 ${compareList.length > 0 ? 'pb-32' : ''}`}>
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Desktop Sidebar */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-28 rounded-2xl border border-line bg-surface p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Filtres</h2>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-white transition-colors hover:border-neutral-700"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Filters Drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setFiltersOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Filtres"
                className="absolute inset-y-0 end-0 w-80 max-w-[85vw] overflow-y-auto border-s border-line bg-surface p-6"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-semibold text-white">Filtres</h2>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Fermer les filtres"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <FiltersContent />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <span className="text-sm text-muted">
                {loading ? '...' : `${total} véhicule${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
              </span>
              <div className="relative">
                <label htmlFor="tri" className="sr-only">Trier par</label>
                <select
                  id="tri"
                  value={tri}
                  onChange={(e) => setTri(e.target.value)}
                  className={`${SELECT_CLASS} pe-10`}
                >
                  <option value="popularite">Popularité</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                  <option value="annee">Année</option>
                </select>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>

            {/* Criteria coming from the home search bar / footer links */}
            {searchChips.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {searchChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => removeSearchParam(chip.key, chip.scope)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary-light transition-colors hover:bg-primary/20"
                  >
                    {chip.label}
                    <X size={14} aria-hidden="true" />
                  </button>
                ))}
                <button
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center px-2 text-xs text-muted underline underline-offset-2 transition-colors hover:text-white"
                >
                  Tout effacer
                </button>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : vehicules.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
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
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface shadow-2xl shadow-black/50">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                <GitCompareArrows size={18} className="shrink-0 text-primary-light" aria-hidden="true" />
                <span className="shrink-0 text-sm text-muted">
                  {compareList.length}/3 sélectionnés
                </span>
                {compareList.map(v => (
                  <div key={v.id} className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-white/5 ps-3">
                    <span className="text-sm text-white">{v.marque} {v.modele}</span>
                    <button
                      onClick={() => removeFromCompare(v.id)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
                      aria-label={`Retirer ${v.marque} ${v.modele} de la comparaison`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={goToCompare}
                disabled={compareList.length < 2}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors ${
                  compareList.length >= 2
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'cursor-not-allowed bg-white/5 text-disabled'
                }`}
              >
                Comparer ({compareList.length})
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
