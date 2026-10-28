import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, Shield, Headphones, MapPin, Calendar, ChevronRight, Star, Fuel, Users, Settings2 } from 'lucide-react';
import api from '../services/api';
import { Skeleton } from '../components/Skeleton';
import FavoriButton from '../components/FavoriButton';
import { formatNumber } from '../lib/formatters';
import { carburantLabel } from '../lib/vehiculeLabels';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

const BRANDS = [
  { name: 'Renault', logo: '/images/brands/renault.svg' },
  { name: 'Peugeot', logo: '/images/brands/peugeot.svg' },
  { name: 'Volkswagen', logo: '/images/brands/volkswagen.svg' },
  { name: 'BMW', logo: '/images/brands/bmw.svg' },
  { name: 'Mercedes-Benz', logo: '/images/brands/mercedes.svg' },
  { name: 'Audi', logo: '/images/brands/audi.svg', w: 'w-24' },
  { name: 'Toyota', logo: '/images/brands/toyota.svg', w: 'w-20' },
  { name: 'Hyundai', logo: '/images/brands/hyundai.svg', w: 'w-20' },
  { name: 'Dacia', logo: '/images/brands/dacia.svg', w: 'w-28' },
];

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-line-strong bg-neutral-800 px-3 text-base text-white outline-none transition-colors placeholder:text-placeholder focus:border-primary sm:text-sm';

function VehicleCard({ v }) {
  const { t } = useTranslation();
  const photo = v.photos?.[0];
  const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
  const [imgSrc, setImgSrc] = useState(resolvedPhoto || FALLBACK_IMG);

  return (
    <Link
      to={`/vehicules/${v.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-neutral-700"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={imgSrc}
          alt={`${v.marque} ${v.modele}`}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_IMG)}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden="true" />
        <FavoriButton vehiculeId={v.id} className="absolute end-1 top-1" />
        {v.populaire && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            <Star size={12} fill="currentColor" aria-hidden="true" /> {t('home.vehicule.populaire')}
          </span>
        )}
        <div className="absolute bottom-3 end-3 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-base font-bold tabular-nums text-primary-light">{formatNumber(v.prix_jour)}</span>
          <span className="ms-0.5 text-xs text-muted">{t('unites.dhParJour')}</span>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <h3 className="text-base font-semibold text-white transition-colors group-hover:text-primary-light">
          {v.marque} {v.modele}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" /> {v.annee}</span>
          <span className="flex items-center gap-1"><Settings2 size={12} aria-hidden="true" /> {v.transmission === 'automatique' ? t('home.vehicule.auto') : t('home.vehicule.manuelle')}</span>
          <span className="flex items-center gap-1"><Fuel size={12} aria-hidden="true" /> {carburantLabel(v.carburant, t)}</span>
          <span className="flex items-center gap-1"><Users size={12} aria-hidden="true" /> {v.places}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted">{t('etats.disponible')}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary-light">
            {t('home.vehicule.details')} <ChevronRight size={12} aria-hidden="true" className="rtl:rotate-180" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4 md:p-5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [vehiculesPopulaires, setVehiculesPopulaires] = useState([]);
  const [populairesLoading, setPopulairesLoading] = useState(true);
  const [search, setSearch] = useState({
    datePrise: '',
    heurePrise: '10:00',
    dateRetour: '',
    heureRetour: '10:00',
  });

  useEffect(() => {
    api.get('/vehicules', { params: { tri: 'popularite', per_page: 4 } })
      .then(({ data }) => {
        const list = data.vehicules || data.data || data || [];
        setVehiculesPopulaires(Array.isArray(list) ? list.slice(0, 4) : []);
      })
      .catch(() => {})
      .finally(() => setPopulairesLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      lieu_prise: 'Tanger',
      lieu_retour: 'Tanger',
      date_prise: `${search.datePrise} ${search.heurePrise}`,
      date_retour: `${search.dateRetour} ${search.heureRetour}`,
    });
    navigate(`/vehicules?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[90dvh] items-end overflow-hidden">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/70 to-dark-bg/30" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="mb-6 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-light">
              {t('home.hero.badge')}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
              {t('home.hero.titreLigne1')}
              <br />
              <span className="text-primary-light">{t('home.hero.titreAccent')}</span>
              <br />
              {t('home.hero.titreLigne2')}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted md:text-lg">
              {t('home.hero.sousTitre')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/vehicules"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {t('home.hero.ctaVehicules')}
              </Link>
              <a
                href="#recherche"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                {t('home.hero.ctaReserver')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar - Overlapping */}
      <section id="recherche" className="relative z-20 -mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearch}
            className="rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/40 md:p-6"
          >
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div>
                <span className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                  <MapPin size={12} className="text-primary-light" aria-hidden="true" /> {t('home.recherche.lieuPrise')}
                </span>
                <div className="flex min-h-11 w-full items-center rounded-xl border border-line-strong bg-neutral-800 px-3 text-sm text-white">
                  {t('home.recherche.ville')}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                  <Calendar size={12} className="text-primary-light" aria-hidden="true" /> {t('home.recherche.dateHeure')}
                </label>
                <div className="flex gap-2">
                  <input
                    aria-label={t('home.recherche.ariaDatePrise')}
                    type="date"
                    value={search.datePrise}
                    onChange={(e) => setSearch({ ...search, datePrise: e.target.value })}
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <input
                    aria-label={t('home.recherche.ariaHeurePrise')}
                    type="time"
                    value={search.heurePrise}
                    onChange={(e) => setSearch({ ...search, heurePrise: e.target.value })}
                    className={`${FIELD_CLASS} w-28`}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                  <MapPin size={12} className="text-muted" aria-hidden="true" /> {t('home.recherche.retour')}
                </label>
                <div className="flex gap-2">
                  <input
                    aria-label={t('home.recherche.ariaDateRetour')}
                    type="date"
                    value={search.dateRetour}
                    onChange={(e) => setSearch({ ...search, dateRetour: e.target.value })}
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <input
                    aria-label={t('home.recherche.ariaHeureRetour')}
                    type="time"
                    value={search.heureRetour}
                    onChange={(e) => setSearch({ ...search, heureRetour: e.target.value })}
                    className={`${FIELD_CLASS} w-28`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {t('actions.rechercher')}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Brands */}
      <section className="px-4 py-14 sm:px-6 md:pt-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted">{t('home.marques.titre')}</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {BRANDS.map((brand, i) => (
              <div
                key={i}
                className={`group flex h-14 shrink-0 items-center justify-center opacity-60 transition-opacity hover:opacity-100 ${brand.w || 'w-16'}`}
                title={brand.name}
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  loading="lazy"
                  className="max-h-11 max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                  }}
                />
                <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Car, titre: 'home.avantages.prixTitre', desc: 'home.avantages.prixDesc' },
            { icon: Shield, titre: 'home.avantages.vehiculesTitre', desc: 'home.avantages.vehiculesDesc' },
            { icon: Headphones, titre: 'home.avantages.supportTitre', desc: 'home.avantages.supportDesc' },
          ].map((f) => (
            <div key={f.titre} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-neutral-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <f.icon size={20} className="text-primary-light" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t(f.titre)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t(f.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Vehicles */}
      {(populairesLoading || vehiculesPopulaires.length > 0) && (
        <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-8" aria-busy={populairesLoading}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-light">{t('home.flotte.badge')}</span>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">{t('home.flotte.titre')}</h2>
              </div>
              <Link
                to="/vehicules"
                className="hidden items-center gap-1.5 text-sm font-semibold text-primary-light transition-colors hover:text-white sm:flex"
              >
                {t('actions.toutVoir')} <ChevronRight size={16} aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {populairesLoading
                ? Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={i} />)
                : vehiculesPopulaires.slice(0, 4).map((v) => <VehicleCard key={v.id} v={v} />)}
            </div>

            <Link
              to="/vehicules"
              className="mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-light sm:hidden"
            >
              {t('actions.toutVoir')} <ChevronRight size={16} aria-hidden="true" className="rtl:rotate-180" />
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6 md:pb-24 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 p-10 text-center md:p-14">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{t('home.cta.titre')}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
              {t('home.cta.desc')}
            </p>
            <Link
              to="/vehicules"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-primary-dark transition-colors hover:bg-neutral-100"
            >
              {t('home.cta.bouton')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
