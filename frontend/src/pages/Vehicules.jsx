import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatDate, formatMAD, formatNumber } from '../lib/formatters';
import { carburantLabel, categorieLabel } from '../lib/vehiculeLabels';
import {
  AlertTriangle, ArrowUpDown, Calendar, Check, ChevronDown, ChevronRight,
  Fuel, GitCompareArrows, Headphones, MapPin, RefreshCw, Search, Settings2,
  ShieldCheck, SlidersHorizontal, Star, Users, X,
} from 'lucide-react';
import FavoriButton from '../components/FavoriButton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

const SELECT_CLASS =
  'min-h-11 w-full appearance-none rounded-xl border border-line-strong bg-neutral-800 pe-10 text-base text-white outline-none transition-colors hover:border-neutral-600 focus:border-primary sm:text-sm';

const TRANSMISSION_OPTIONS = [
  { value: '', labelKey: 'vehicules.filtres.toutes' },
  { value: 'automatique', labelKey: 'vehicules.filtres.automatique' },
  { value: 'manuelle', labelKey: 'vehicules.filtres.manuelle' },
];

const CARBURANT_OPTIONS = [
  { value: '', labelKey: 'vehicules.filtres.tous' },
  { value: 'essence', labelKey: 'vehicules.filtres.essence' },
  { value: 'diesel', labelKey: 'vehicules.filtres.diesel' },
  { value: 'hybride', labelKey: 'vehicules.filtres.hybride' },
];

const FILTER_LABELS = {
  agence_id: 'vehicules.filtres.agence',
  categorie: 'vehicules.filtres.categorie',
  marque: 'vehicules.filtres.marque',
  transmission: 'vehicules.filtres.transmission',
  carburant: 'vehicules.filtres.carburant',
  prix_max: 'vehicules.filtres.budget',
};

function formatFilterValue(key, value, agences, t) {
  if (key === 'prix_max') {
    return t('vehicules.filtres.prixMax', {
      prix: formatMAD(value, { suffix: t('unites.dh'), decimals: 0 }),
    });
  }
  if (key === 'transmission') return value === 'automatique' ? t('vehicules.filtres.automatique') : t('vehicules.filtres.manuelle');
  if (key === 'carburant') return carburantLabel(value, t);
  if (key === 'categorie') return categorieLabel(value, t);
  if (key === 'agence_id') {
    return agences.find((agence) => String(agence.id) === String(value))?.nom || t('vehicules.filtres.agenceSelectionnee');
  }
  return value;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-white/[0.04]" />
      <div className="space-y-4 p-4 md:p-5">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-white/[0.07]" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3.5 w-4/5 animate-pulse rounded bg-white/[0.04]" />
          ))}
        </div>
        <div className="flex items-end justify-between border-t border-line pt-4">
          <div className="h-7 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-11 w-20 animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon size={13} className="shrink-0 text-ink-subtle" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function VehicleCard({ v, isSelected, compareFull, onToggleCompare }) {
  const { t } = useTranslation();
  const photo = v.photos?.[0];
  const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
  const [imgSrc, setImgSrc] = useState(resolvedPhoto || FALLBACK_IMG);
  const [imgLoaded, setImgLoaded] = useState(false);
  const compareDisabled = compareFull && !isSelected;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-neutral-700">
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={t('vehicules.carte.comparer', { vehicule: `${v.marque} ${v.modele}` })}
        disabled={compareDisabled}
        title={compareDisabled ? t('vehicules.carte.maximum') : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleCompare(v);
        }}
        className={`absolute start-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-xl ${
          compareDisabled ? 'cursor-not-allowed opacity-40' : ''
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
            isSelected
              ? 'border-primary bg-primary'
              : 'border-white/70 bg-black/45 backdrop-blur-sm group-hover:border-white'
          }`}
        >
          {isSelected && <Check size={14} className="text-white" aria-hidden="true" />}
        </span>
      </button>

      <FavoriButton vehiculeId={v.id} className="absolute end-2 top-2 z-20" />

      <Link to={`/vehicules/${v.id}`} className="flex flex-1 flex-col">
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
            className={`h-full w-full object-cover transition-[opacity,transform] duration-200 group-hover:scale-[1.02] ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" aria-hidden="true" />

          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            <div>
              {v.populaire && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  <Star size={11} fill="currentColor" aria-hidden="true" />
                  {t('vehicules.carte.populaire')}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {t('etats.disponible')}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                {v.marque}
              </p>
              <h3 className="mt-1 truncate text-lg font-semibold leading-snug text-white transition-colors group-hover:text-primary-light">
                {v.modele}
              </h3>
            </div>
            {v.categorie && (
              <span className="mt-0.5 shrink-0 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-muted">
                {categorieLabel(v.categorie, t)}
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs text-muted">
            <Spec icon={Calendar} label={t('vehicules.carte.annee')} value={v.annee || '—'} />
            <Spec
              icon={Settings2}
              label={t('vehicules.carte.transmission')}
              value={v.transmission === 'automatique' ? t('vehicules.filtres.automatique') : t('vehicules.filtres.manuelle')}
            />
            <Spec
              icon={Fuel}
              label={t('vehicules.carte.carburant')}
              value={v.carburant ? carburantLabel(v.carburant, t) : '—'}
            />
            <Spec
              icon={Users}
              label={t('vehicules.carte.places')}
              value={v.places ? `${formatNumber(v.places)} ${t('unites.places')}` : '—'}
            />
          </dl>

          <div className="mt-auto pt-5">
            <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
                  {t('vehicules.carte.aPartirDe')}
                </p>
                <p className="mt-1 text-xl font-bold leading-none tabular-nums text-white">
                  {formatMAD(v.prix_jour, { suffix: t('unites.dh'), decimals: 0 })}
                  <span className="ms-1 text-xs font-normal text-muted">{t('vehicules.carte.parJour')}</span>
                </p>
              </div>
              <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] px-3.5 text-xs font-semibold text-white transition-colors group-hover:border-primary group-hover:bg-primary">
                {t('vehicules.carte.details')}
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function EmptyState({ onReset, hasFilters }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-white/[0.03]">
        <Search size={28} className="text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white">{t('vehicules.etats.aucunTitre')}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {t('vehicules.etats.aucunTexte')}
      </p>
      {hasFilters ? (
        <button
          onClick={onReset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          {t('vehicules.filtres.reinitialiserTous')}
        </button>
      ) : (
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-line-strong bg-neutral-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          {t('vehicules.etats.retourAccueil')}
        </Link>
      )}
    </div>
  );
}

function ErrorState({ onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/5 px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/20 bg-danger/10">
        <AlertTriangle size={28} className="text-danger" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white">{t('vehicules.etats.erreurTitre')}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {t('vehicules.etats.erreurTexte')}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-neutral-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        <RefreshCw size={16} aria-hidden="true" />
        {t('vehicules.etats.reessayer')}
      </button>
    </div>
  );
}

function SelectControl({ id, label, value, onChange, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={onChange} className={`${SELECT_CLASS} ps-3.5`}>
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

function OptionPill({ name, value, checked, onChange, className = '', children }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white ${
        checked
          ? 'border-primary bg-primary/10 text-white'
          : 'border-line bg-white/[0.02] text-muted hover:border-neutral-600 hover:text-white'
      } ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-primary-light' : 'bg-transparent'}`}
        aria-hidden="true"
      />
      {children}
    </label>
  );
}

function FiltersContent({ idPrefix, filters, agences, onChange }) {
  const { t } = useTranslation();
  const priceValue = filters.prix_max || 1500;

  return (
    <div className="space-y-6">
      <SelectControl
        id={`${idPrefix}-agence`}
        label={t('vehicules.filtres.agence')}
        value={filters.agence_id}
        onChange={(e) => onChange('agence_id', e.target.value)}
      >
        <option value="">{t('vehicules.filtres.toutesAgences')}</option>
        {agences.map((agence) => (
          <option key={agence.id} value={agence.id}>{agence.nom}</option>
        ))}
      </SelectControl>

      <SelectControl
        id={`${idPrefix}-categorie`}
        label={t('vehicules.filtres.categorie')}
        value={filters.categorie}
        onChange={(e) => onChange('categorie', e.target.value)}
      >
        <option value="">{t('vehicules.filtres.toutesCategories')}</option>
        <option value="Berline">{t('vehicules.categories.berline')}</option>
        <option value="Compacte">{t('vehicules.categories.compacte')}</option>
        <option value="Citadine">{t('vehicules.categories.citadine')}</option>
        <option value="SUV">{t('vehicules.categories.suv')}</option>
      </SelectControl>

      <SelectControl
        id={`${idPrefix}-marque`}
        label={t('vehicules.filtres.marque')}
        value={filters.marque}
        onChange={(e) => onChange('marque', e.target.value)}
      >
        <option value="">{t('vehicules.filtres.toutesMarques')}</option>
        <option value="BMW">BMW</option>
        <option value="Mercedes">Mercedes</option>
        <option value="Audi">Audi</option>
        <option value="Volkswagen">Volkswagen</option>
        <option value="Peugeot">Peugeot</option>
        <option value="Renault">Renault</option>
        <option value="Toyota">Toyota</option>
        <option value="Hyundai">Hyundai</option>
      </SelectControl>

      <fieldset>
        <legend className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('vehicules.filtres.transmission')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {TRANSMISSION_OPTIONS.map((opt, index) => (
            <OptionPill
              key={opt.value || 'all'}
              name={`${idPrefix}-transmission`}
              value={opt.value}
              checked={filters.transmission === opt.value}
              onChange={() => onChange('transmission', opt.value)}
              className={index === 0 ? 'col-span-2' : ''}
            >
              {t(opt.labelKey)}
            </OptionPill>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('vehicules.filtres.carburant')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {CARBURANT_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.value || 'all'}
              name={`${idPrefix}-carburant`}
              value={opt.value}
              checked={filters.carburant === opt.value}
              onChange={() => onChange('carburant', opt.value)}
            >
              {t(opt.labelKey)}
            </OptionPill>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor={`${idPrefix}-prix`} className="text-xs font-medium uppercase tracking-wider text-muted">
            {t('vehicules.filtres.budgetMax')}
          </label>
          <span className="text-sm font-semibold tabular-nums text-white">
            {filters.prix_max
              ? t('vehicules.filtres.prixMax', { prix: formatMAD(filters.prix_max, { suffix: t('unites.dh'), decimals: 0 }) })
              : t('vehicules.filtres.tousLesPrix')}
          </span>
        </div>
        <div className="py-1.5">
          <input
            id={`${idPrefix}-prix`}
            type="range"
            min="200"
            max="1500"
            step="50"
            value={priceValue}
            onChange={(e) => onChange('prix_max', e.target.value === '1500' ? '' : e.target.value)}
            aria-valuetext={
              filters.prix_max
                ? t('vehicules.filtres.prixMaxAria', { prix: formatMAD(filters.prix_max, { suffix: t('unites.dh'), decimals: 0 }) })
                : t('vehicules.filtres.tousLesPrix')
            }
            className="w-full cursor-pointer accent-primary"
          />
        </div>
        <div className="mt-1 flex justify-between text-xs tabular-nums text-ink-subtle">
          <span>{formatMAD(200, { suffix: t('unites.dh'), decimals: 0 })}</span>
          <span>{formatMAD(1500, { suffix: t('unites.dh'), decimals: 0 })}</span>
        </div>
      </div>
    </div>
  );
}

export default function Vehicules() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicules, setVehicules] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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

  const filtersTriggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const wasFiltersOpen = useRef(false);

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + Object.values(search).filter(Boolean).length;

  const loadVehicules = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(false);
      const params = { tri, disponibles: 1 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      Object.entries(search).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const { data } = await api.get('/vehicules', { params, signal });
      const list = data.data || data.vehicules || [];
      setVehicules(Array.isArray(list) ? list : []);
      setTotal(typeof data.total === 'number' ? data.total : list.length);
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      console.error(err);
      setError(true);
      setVehicules([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, search, tri]);

  useEffect(() => {
    const controller = new AbortController();
    loadVehicules(controller.signal);
    return () => controller.abort();
  }, [loadVehicules]);

  useEffect(() => {
    let cancelled = false;
    api.get('/agences')
      .then(({ data }) => {
        if (cancelled) return;
        setAgences(Array.isArray(data) ? data : data?.data || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFiltersOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (filtersOpen) {
      wasFiltersOpen.current = true;
    } else if (wasFiltersOpen.current) {
      wasFiltersOpen.current = false;
      filtersTriggerRef.current?.focus();
    }
  }, [filtersOpen]);

  const toggleCompare = (vehicule) => {
    setCompareList((prev) => {
      const exists = prev.find((v) => v.id === vehicule.id);
      if (exists) return prev.filter((v) => v.id !== vehicule.id);
      if (prev.length >= 3) return prev;
      return [...prev, vehicule];
    });
  };

  const removeFromCompare = (id) => {
    setCompareList((prev) => prev.filter((v) => v.id !== id));
  };

  const goToCompare = () => {
    const ids = compareList.map((v) => v.id).join(',');
    navigate(`/vehicules/compare?compare=${ids}`);
  };

  const resetFilters = useCallback(() => {
    setFilters({ categorie: '', marque: '', transmission: '', carburant: '', prix_max: '', agence_id: '' });
    setSearch({ date_debut: '', date_fin: '', populaire: '' });
    setTri('popularite');
  }, []);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeChip = (chip) => {
    if (chip.scope === 'filters') {
      updateFilter(chip.key, '');
    } else {
      setSearch((prev) => ({ ...prev, [chip.key]: '' }));
    }
  };

  const activeChips = [
    ...Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({
        key,
        scope: 'filters',
        label: t('vehicules.filtres.chip', {
          label: t(FILTER_LABELS[key]),
          value: formatFilterValue(key, value, agences, t),
        }),
      })),
    ...(search.date_debut ? [{ key: 'date_debut', scope: 'search', label: t('vehicules.filtres.du', { date: formatDate(search.date_debut) }) }] : []),
    ...(search.date_fin ? [{ key: 'date_fin', scope: 'search', label: t('vehicules.filtres.au', { date: formatDate(search.date_fin) }) }] : []),
    ...(search.populaire ? [{ key: 'populaire', scope: 'search', label: t('vehicules.filtres.populairesUniquement') }] : []),
  ];

  const compareFull = compareList.length >= 3;
  const resultLabel = loading
    ? t('vehicules.resultats.chargement')
    : error
      ? t('vehicules.resultats.indisponibles')
      : t('vehicules.resultats.vehiculesDisponibles', { count: total });

  return (
    <div className="min-h-dvh bg-dark-bg">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg via-dark-bg/95 to-dark-bg/50" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-32">
          <nav className="flex items-center gap-2 text-xs text-muted" aria-label={t('vehicules.filAriane')}>
            <Link to="/" className="transition-colors hover:text-white">{t('nav.accueil')}</Link>
            <ChevronRight size={12} aria-hidden="true" className="rtl:rotate-180" />
            <span className="text-white" aria-current="page">{t('nav.vehicules')}</span>
          </nav>

          <div className="mt-8 max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-light">
              <span className="h-px w-8 bg-primary" aria-hidden="true" />
              {t('vehicules.catalogue')}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              {t('vehicules.titre')}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {t('vehicules.sousTitre')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary-light" aria-hidden="true" />
                {t('vehicules.vehiculesRecents')}
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones size={16} className="text-primary-light" aria-hidden="true" />
                {t('vehicules.support')}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-primary-light" aria-hidden="true" />
                {t('vehicules.ville')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <div className={`mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10 ${compareList.length > 0 ? 'pb-44' : 'pb-16'}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Desktop filters */}
          <aside className="hidden lg:block lg:w-72 lg:shrink-0">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <SlidersHorizontal size={16} className="text-primary-light" aria-hidden="true" />
                  {t('vehicules.filtres.titre')}
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-white"
                  >
                    {t('vehicules.filtres.toutEffacer')}
                  </button>
                ) : (
                  <span className="text-xs text-ink-subtle">{t('vehicules.filtres.aucun')}</span>
                )}
              </div>
              <div className="overscroll-contain p-5 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto">
                <FiltersContent
                  idPrefix="desktop"
                  filters={filters}
                  agences={agences}
                  onChange={updateFilter}
                />
              </div>
            </div>
          </aside>

          {/* Mobile filters drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setFiltersOpen(false)}
                aria-hidden="true"
              />
              <div
                ref={dialogRef}
                id="filters-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="filters-title"
                className="modal-in absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
              >
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <h2 id="filters-title" className="text-base font-semibold text-white">{t('vehicules.filtres.titre')}</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {activeFilterCount > 0
                        ? t('vehicules.filtres.actifs', { count: activeFilterCount })
                        : t('vehicules.filtres.affiner')}
                    </p>
                  </div>
                  <button
                    ref={closeBtnRef}
                    onClick={() => setFiltersOpen(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white"
                    aria-label={t('vehicules.filtres.fermer')}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                  <FiltersContent
                    idPrefix="mobile"
                    filters={filters}
                    agences={agences}
                    onChange={updateFilter}
                  />
                </div>
                <div className="flex gap-2 border-t border-line p-4">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line bg-white/[0.03] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                    >
                      {t('vehicules.filtres.reinitialiser')}
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    {t('vehicules.filtres.voirResultats')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-subtle">
                  {t('vehicules.resultats.titre')}
                </p>
                <p className="mt-1 flex items-baseline gap-1.5 text-sm text-muted" aria-live="polite">
                  {!loading && !error && (
                    <span className="text-2xl font-bold tabular-nums text-white">{total}</span>
                  )}
                  {resultLabel}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  ref={filtersTriggerRef}
                  onClick={() => setFiltersOpen(true)}
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  aria-controls="filters-dialog"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-white transition-colors hover:border-neutral-600 lg:hidden"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  {t('vehicules.filtres.titre')}
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative flex-1 sm:w-56 sm:flex-none">
                  <ArrowUpDown
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <label htmlFor="tri" className="sr-only">{t('vehicules.resultats.trierPar')}</label>
                  <select
                    id="tri"
                    value={tri}
                    onChange={(e) => setTri(e.target.value)}
                    className={`${SELECT_CLASS} ps-9`}
                  >
                    <option value="popularite">{t('vehicules.resultats.popularite')}</option>
                    <option value="prix_asc">{t('vehicules.resultats.prixAsc')}</option>
                    <option value="prix_desc">{t('vehicules.resultats.prixDesc')}</option>
                    <option value="annee">{t('vehicules.resultats.annee')}</option>
                  </select>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                </div>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={`${chip.scope}-${chip.key}`}
                    onClick={() => removeChip(chip)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary-light transition-colors hover:bg-primary/20"
                  >
                    {chip.label}
                    <X size={13} aria-hidden="true" />
                    <span className="sr-only">{t('vehicules.filtres.retirer')}</span>
                  </button>
                ))}
                <button
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center px-2 text-xs text-muted underline underline-offset-2 transition-colors hover:text-white"
                >
                  {t('vehicules.filtres.toutEffacer')}
                </button>
              </div>
            )}

            <div className="mt-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="grid grid-cols-1">
                  <ErrorState onRetry={() => loadVehicules()} />
                </div>
              ) : vehicules.length === 0 ? (
                <div className="grid grid-cols-1">
                  <EmptyState onReset={resetFilters} hasFilters={activeFilterCount > 0} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {vehicules.map((v) => (
                    <VehicleCard
                      key={v.id}
                      v={v}
                      isSelected={compareList.some((c) => c.id === v.id)}
                      compareFull={compareFull}
                      onToggleCompare={toggleCompare}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-light">
                  <GitCompareArrows size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white" aria-live="polite">
                    {t('vehicules.comparaison.titre')} <span className="font-normal text-muted">({compareList.length}/3)</span>
                  </p>
                  <div className="mt-1 hidden items-center gap-1.5 overflow-x-auto sm:flex">
                    {compareList.map((v) => (
                      <span
                        key={v.id}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white/[0.04] ps-2.5 text-xs text-white"
                      >
                        {v.marque} {v.modele}
                        <button
                          onClick={() => removeFromCompare(v.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
                          aria-label={t('vehicules.comparaison.retirer', { vehicule: `${v.marque} ${v.modele}` })}
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    {compareList.length < 2 && (
                      <span className="text-xs text-muted">{t('vehicules.comparaison.ajouterSecond')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setCompareList([])}
                  className="hidden min-h-11 items-center px-2 text-xs text-muted transition-colors hover:text-white sm:inline-flex"
                >
                  {t('vehicules.comparaison.vider')}
                </button>
                <button
                  onClick={goToCompare}
                  disabled={compareList.length < 2}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors sm:px-5 ${
                    compareList.length >= 2
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'cursor-not-allowed bg-white/5 text-disabled'
                  }`}
                >
                  {t('actions.comparer')}
                  <span className="tabular-nums">({compareList.length})</span>
                  <ChevronRight size={16} aria-hidden="true" className="rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
