import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDuration, formatMAD, formatNumber } from '../lib/formatters';
import { carburantLabel, equipementLabel } from '../lib/vehiculeLabels';
import { useSeo } from '../lib/useSeo';
import { absoluteUrl, canonicalFor } from '../lib/seo';
import { Calendar, Gauge, Settings, Droplet, Zap, Users, Check, Clock, MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, Star, Send } from 'lucide-react';
import FavoriButton from '../components/FavoriButton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800&q=80';

const IC = {
  calendar: (cls) => <Calendar className={cls} aria-hidden="true" />,
  gauge: (cls) => <Gauge className={cls} aria-hidden="true" />,
  cog: (cls) => <Settings className={cls} aria-hidden="true" />,
  droplet: (cls) => <Droplet className={cls} aria-hidden="true" />,
  bolt: (cls) => <Zap className={cls} aria-hidden="true" />,
  users: (cls) => <Users className={cls} aria-hidden="true" />,
  check: (cls) => <Check className={cls} aria-hidden="true" />,
  clock: (cls) => <Clock className={cls} aria-hidden="true" />,
  whatsapp: (cls) => <MessageCircle className={cls} aria-hidden="true" />,
  chevronL: (cls) => <ChevronLeft className={cls} aria-hidden="true" />,
  chevronR: (cls) => <ChevronRight className={cls} aria-hidden="true" />,
};

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-line-strong bg-neutral-800 px-4 text-base text-white outline-none transition-colors placeholder:text-placeholder focus:border-primary sm:text-sm';

function Thumbnail({ src, alt, active, onClick }) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={t('vehicule.voirImage', { alt })}
      aria-pressed={active}
      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:h-24 sm:w-24 ${
        active ? 'border-primary' : 'border-transparent opacity-60 hover:border-neutral-700 hover:opacity-100'
      }`}
    >
      {!loaded && !err && <div className="absolute inset-0 animate-pulse bg-white/[0.04]" aria-hidden="true" />}
      <img
        src={err ? FALLBACK_IMG : src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </button>
  );
}

function DatePicker({ label, id, value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T00:00:00') : new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const dayNames = t('vehicule.calendrier.jours', { returnObjects: true });
  const monthNames = t('vehicule.calendrier.mois', { returnObjects: true });

  const selectDay = (d) => {
    const selected = new Date(year, month, d);
    const iso = selected.toISOString().split('T')[0];
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`${FIELD_CLASS} flex items-center justify-between text-start`}
      >
        <span className={value ? 'text-white' : 'text-muted'}>{value ? formatDate(value) : t('vehicule.calendrier.selectionner')}</span>
        <span className="text-muted">{IC.calendar('h-4 w-4')}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-line bg-surface-raised p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setViewDate(new Date(year, month - 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white" aria-label={t('vehicule.calendrier.moisPrecedent')}>
              {IC.chevronL('h-4 w-4 rtl:rotate-180')}
            </button>
            <span className="text-sm font-medium text-white">{monthNames[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white" aria-label={t('vehicule.calendrier.moisSuivant')}>
              {IC.chevronR('h-4 w-4 rtl:rotate-180')}
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {dayNames.map(d => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const cellDate = new Date(year, month, d);
              const isPast = cellDate < today;
              const isSelected = value === cellDate.toISOString().split('T')[0];
              const isToday = cellDate.getTime() === today.getTime();
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDay(d)}
                  className={`h-10 rounded-lg text-xs font-medium transition-colors ${
                    isPast ? 'cursor-not-allowed text-disabled' :
                    isSelected ? 'bg-primary text-white' :
                    isToday ? 'bg-white/10 text-white' :
                    'text-muted hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCalendar({ bookedDates = [] }) {
  const { t } = useTranslation();
  const now = new Date();
  const [view, setView] = useState(new Date(now.getFullYear(), now.getMonth()));
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const dayNames = t('vehicule.calendrier.jours', { returnObjects: true });
  const monthNames = t('vehicule.calendrier.mois', { returnObjects: true });

  const isBooked = (d) => {
    if (!d) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return bookedDates.some(bd => {
      const start = bd.date_debut?.split(' ')[0] || bd.date_debut;
      const end = bd.date_fin?.split(' ')[0] || bd.date_fin;
      return dateStr >= start && dateStr <= end;
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setView(new Date(year, month - 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white" aria-label={t('vehicule.calendrier.moisPrecedent')}>
          {IC.chevronL('h-4 w-4 rtl:rotate-180')}
        </button>
        <span className="text-sm font-medium text-white">{monthNames[month]} {year}</span>
        <button onClick={() => setView(new Date(year, month + 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white" aria-label={t('vehicule.calendrier.moisSuivant')}>
          {IC.chevronR('h-4 w-4 rtl:rotate-180')}
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const booked = isBooked(d);
          const isToday = new Date(year, month, d).getTime() === new Date().setHours(0, 0, 0, 0);
          return (
            <div
              key={d}
              className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium ${
                booked ? 'bg-primary/15 text-primary-light line-through' :
                isToday ? 'bg-white/10 text-white' :
                'text-muted'
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-line pt-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded border border-primary/50 bg-primary/30" aria-hidden="true" />
          {t('vehicule.calendrier.reserve')}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded border border-line-strong bg-white/10" aria-hidden="true" />
          {t('vehicule.calendrier.aujourdhui')}
        </div>
      </div>
    </div>
  );
}

export default function VehiculeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { client } = useAuth();
  const [vehicule, setVehicule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [dates, setDates] = useState({ dateDebut: '', heureDebut: '10:00', dateFin: '', heureFin: '10:00' });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [avisData, setAvisData] = useState({ avis: [], moyenne: 0, nombre: 0 });
  const [avisLoading, setAvisLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ note: 5, commentaire: '' });
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    fetchVehicule();
    fetchAvis();
    setActiveImg(0);
    setImgLoaded(false);
  }, [id]);

  const fetchVehicule = async () => {
    try {
      const { data } = await api.get(`/vehicules/${id}`);
      setVehicule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvis = async () => {
    try {
      setAvisLoading(true);
      const { data } = await api.get(`/vehicules/${id}/avis`);
      setAvisData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAvisLoading(false);
    }
  };

  const submitReview = async () => {
    if (!client) {
      navigate('/client/login', { state: { from: `/vehicules/${id}` } });
      return;
    }
    setReviewError('');
    setReviewSuccess('');
    setSubmittingReview(true);
    try {
      // V9 : photo facultative -> FormData (multipart).
      const payload = new FormData();
      payload.append('vehicule_id', parseInt(id));
      payload.append('note', reviewForm.note);
      if (reviewForm.commentaire) payload.append('commentaire', reviewForm.commentaire);
      if (reviewPhoto) payload.append('photo', reviewPhoto);
      await api.post('/avis', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReviewSuccess(t('vehicule.avis.envoye'));
      setReviewForm({ note: 5, commentaire: '' });
      setReviewPhoto(null);
      fetchAvis();
    } catch (err) {
      setReviewError(err.response?.data?.message || t('vehicule.avis.erreur'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const images = vehicule?.photos?.length
    ? vehicule.photos.map(p => p && !p.startsWith('http') && !p.startsWith('/') ? `/storage/${p}` : p)
    : [FALLBACK_IMG];
  const hasDates = dates.dateDebut && dates.dateFin;

  const nomVehicule = vehicule ? `${vehicule.marque} ${vehicule.modele}` : '';
  useSeo({
    title: vehicule
      ? t('seo.vehicule.titre', { nom: nomVehicule, prix: formatNumber(vehicule.prix_jour) })
      : (loading ? null : t('seo.notFound.titre')),
    description: vehicule
      ? [
          t('seo.vehicule.description', {
            nom: nomVehicule,
            annee: vehicule.annee,
            carburant: carburantLabel(vehicule.carburant, t),
            transmission: vehicule.transmission === 'automatique'
              ? t('vehicules.filtres.automatique')
              : t('vehicules.filtres.manuelle'),
            places: vehicule.places,
            prix: formatNumber(vehicule.prix_jour),
          }),
          Number(vehicule.montant_caution) > 0
            ? t('seo.vehicule.caution', { caution: formatNumber(vehicule.montant_caution) })
            : '',
        ].filter(Boolean).join(' ')
      : (loading ? undefined : t('seo.notFound.description')),
    canonical: vehicule ? canonicalFor(`/vehicules/${vehicule.id}`) : null,
    robots: vehicule ? 'index, follow' : 'noindex, nofollow',
    image: vehicule ? (vehicule.photos?.[0] ? absoluteUrl(images[0]) : undefined) : null,
  });

  const { duree, total } = useMemo(() => {
    if (!hasDates || !vehicule) return { duree: null, total: null };
    const debut = new Date(`${dates.dateDebut}T${dates.heureDebut}`);
    const fin = new Date(`${dates.dateFin}T${dates.heureFin}`);
    const j = Math.max(1, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
    return { duree: j, total: vehicule.prix_jour * j };
  }, [dates.dateDebut, dates.dateFin, dates.heureDebut, dates.heureFin, vehicule]);

  const handleReserver = () => {
    navigate(`/reservation/${vehicule.id}?date_debut=${encodeURIComponent(dates.dateDebut + ' ' + dates.heureDebut)}&date_fin=${encodeURIComponent(dates.dateFin + ' ' + dates.heureFin)}`);
  };

  if (loading) {
    return (
      <div className="min-h-dvh pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-64 rounded bg-white/[0.06]" />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="h-96 rounded-2xl bg-white/[0.04]" />
                <div className="h-6 w-1/2 rounded bg-white/[0.06]" />
                <div className="h-40 rounded-2xl bg-white/[0.04]" />
              </div>
              <div className="h-80 rounded-2xl bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface">
          <AlertTriangle size={40} className="text-muted" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-white">{t('vehicule.nonTrouve')}</h1>
        <p className="mb-6 text-sm text-muted">{t('vehicule.nonTrouveTexte')}</p>
        <Link to="/vehicules" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
          {t('vehicule.retourCatalogue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label={t('vehicule.filAriane')}>
          <Link to="/" className="transition-colors hover:text-white">{t('nav.accueil')}</Link>
          {IC.chevronR('h-3 w-3 rtl:rotate-180')}
          <Link to="/vehicules" className="transition-colors hover:text-white">{t('nav.vehicules')}</Link>
          {IC.chevronR('h-3 w-3 rtl:rotate-180')}
          <span className="text-white" aria-current="page">{vehicule.marque} {vehicule.modele}</span>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Column */}
          <div className="min-w-0 flex-1">
            {/* Main Image */}
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-line bg-surface">
              {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-white/[0.03]" aria-hidden="true" />}
              <img
                src={images[activeImg]}
                alt={t('vehicule.imageVue', { vehicule: `${vehicule.marque} ${vehicule.modele}`, index: activeImg + 1 })}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => { e.target.src = FALLBACK_IMG; setImgLoaded(true); }}
                className={`h-[280px] w-full object-cover transition-opacity duration-300 sm:h-[400px] lg:h-[460px] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
              <FavoriButton vehiculeId={vehicule.id} className="absolute end-1 top-1" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => { setActiveImg(i => (i - 1 + images.length) % images.length); setImgLoaded(false); }}
                    className="absolute start-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    aria-label={t('vehicule.imagePrecedente')}
                  >
                    {IC.chevronL('h-5 w-5 rtl:rotate-180')}
                  </button>
                  <button
                    onClick={() => { setActiveImg(i => (i + 1) % images.length); setImgLoaded(false); }}
                    className="absolute end-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    aria-label={t('vehicule.imageSuivante')}
                  >
                    {IC.chevronR('h-5 w-5 rtl:rotate-180')}
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((src, i) => (
                  <Thumbnail
                    key={i}
                    src={src}
                    alt={t('vehicule.vignetteVue', { vehicule: `${vehicule.marque} ${vehicule.modele}`, index: i + 1 })}
                    active={i === activeImg}
                    onClick={() => { setActiveImg(i); setImgLoaded(false); }}
                  />
                ))}
              </div>
            )}

            {/* Title & Tags */}
            <div className="mb-6 mt-6">
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {vehicule.marque} {vehicule.modele}
              </h1>
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  vehicule.transmission === 'automatique' ? t('vehicule.automatique') : t('vehicule.manuelle'),
                  carburantLabel(vehicule.carburant, t),
                  `${formatNumber(vehicule.places)} ${t('unites.places')}`,
                ].map((tag, i) => (
                  <span key={i} className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-primary-light">{formatMAD(vehicule.prix_jour, { suffix: t('unites.dh'), decimals: 0 })}</span>
                <span className="text-sm font-normal text-muted">{t('vehicule.parJour')}</span>
              </div>
              {vehicule.montant_caution > 0 && (
                <p className="mt-1 text-xs text-warning">
                  {t('vehicule.caution', { montant: formatMAD(vehicule.montant_caution, { suffix: t('unites.dh'), decimals: 0 }) })}
                </p>
              )}
              {vehicule.description && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  {vehicule.description}
                </p>
              )}
            </div>

            {/* Specifications */}
            <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 font-semibold text-white">{t('vehicule.specifications')}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { icon: IC.calendar, label: t('vehicule.annee'), value: vehicule.annee },
                  { icon: IC.gauge, label: t('vehicule.kilometrage'), value: `${formatNumber(vehicule.kilometrage)} ${t('unites.km')}` },
                  { icon: IC.cog, label: t('vehicule.transmission'), value: vehicule.transmission === 'automatique' ? t('vehicule.automatique') : t('vehicule.manuelle'), wide: true },
                  { icon: IC.droplet, label: t('vehicule.carburant'), value: carburantLabel(vehicule.carburant, t) },
                  { icon: IC.bolt, label: t('vehicule.puissance'), value: vehicule.puissance },
                  { icon: IC.users, label: t('vehicule.places'), value: vehicule.places },
                ].map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3 ${s.wide ? 'col-span-2 sm:col-span-1' : ''}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      {s.icon('h-4 w-4 text-primary-light')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                      <div className="truncate text-sm font-medium text-white">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 font-semibold text-white">{t('vehicule.equipements')}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(vehicule.equipements || []).map((eq, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                      {IC.check('h-3 w-3 text-success')}
                    </div>
                    <span className="text-sm text-muted">{equipementLabel(eq, t)}</span>
                  </div>
                ))}
                {(!vehicule.equipements || vehicule.equipements.length === 0) && (
                  <p className="col-span-full text-sm text-muted">{t('vehicule.aucunEquipement')}</p>
                )}
              </div>
            </div>

            {/* V6 : position GPS sur carte OpenStreetMap */}
            {(vehicule.latitude != null && vehicule.longitude != null) && (
              <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
                <h2 className="mb-4 font-semibold text-white">{t('vehicule.position')}</h2>
                <iframe
                  title={t('vehicule.carteTitre')}
                  className="h-64 w-full rounded-xl border border-line"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(vehicule.longitude) - 0.01}%2C${Number(vehicule.latitude) - 0.01}%2C${Number(vehicule.longitude) + 0.01}%2C${Number(vehicule.latitude) + 0.01}&layer=mapnik&marker=${vehicule.latitude}%2C${vehicule.longitude}`}
                />
                <a
                  href={`https://www.openstreetmap.org/?mlat=${vehicule.latitude}&mlon=${vehicule.longitude}#map=15/${vehicule.latitude}/${vehicule.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center text-xs text-primary-light hover:underline"
                >
                  {t('vehicule.agrandirCarte')}
                </a>
              </div>
            )}

            {/* Disponibilité */}
            <div className="mb-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                {IC.calendar('h-5 w-5 text-primary-light')}
                {t('vehicule.disponibilite')}
              </h2>
              <MiniCalendar bookedDates={vehicule.reservations || []} />
            </div>

            {/* Avis clients */}
            <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <Star className="h-5 w-5 text-primary-light" aria-hidden="true" />
                {t('vehicule.avis.titre')}
              </h2>

              {avisLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-xl border border-line bg-white/[0.02] p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
                        <div className="h-4 w-24 rounded bg-white/[0.06]" />
                      </div>
                      <div className="h-3 w-full rounded bg-white/[0.04]" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {avisData.nombre > 0 && (
                    <div className="mb-5 flex items-center gap-4 border-b border-line pb-5">
                      <div className="text-center">
                        <div className="text-3xl font-bold tabular-nums text-white">{avisData.moyenne}</div>
                        <div className="mt-1 flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={14}
                              aria-hidden="true"
                              className={s <= Math.round(avisData.moyenne) ? 'fill-warning text-warning' : 'text-muted'}
                            />
                          ))}
                        </div>
                        <div className="mt-1 text-xs text-muted">{t('vehicule.avis.nombre', { count: avisData.nombre })}</div>
                      </div>
                    </div>
                  )}

                  {avisData.avis.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">{t('vehicule.avis.aucun')}</p>
                  ) : (
                    <div className="mb-5 space-y-3">
                      {avisData.avis.slice(0, 5).map((avi) => (
                        <div key={avi.id} className="rounded-xl border border-line bg-white/[0.02] p-4">
                          <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">
                              {avi.client_initiale}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{avi.client_prenom}</div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star
                                    key={s}
                                    size={12}
                                    aria-hidden="true"
                                    className={s <= avi.note ? 'fill-warning text-warning' : 'text-muted'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="ms-auto text-xs text-muted">
                              {formatDate(avi.created_at)}
                            </span>
                          </div>
                          {avi.commentaire && (
                            <p className="text-sm leading-relaxed text-muted">{avi.commentaire}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire d'avis */}
                  <div className="border-t border-line pt-5">
                    <h3 className="mb-3 text-sm font-medium text-white">{t('vehicule.avis.laisser')}</h3>
                    {!client ? (
                      <p className="text-sm text-muted">
                        <Link to="/client/login" className="text-primary-light hover:underline">{t('vehicule.avis.seConnecter')}</Link> {t('vehicule.avis.pourLaisser')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <span className="mb-2 block text-xs font-medium text-muted">{t('vehicule.avis.note')}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setReviewForm(p => ({ ...p, note: s }))}
                                aria-label={t('vehicule.avis.noter', { count: s })}
                                aria-pressed={s <= reviewForm.note}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
                              >
                                <Star
                                  size={20}
                                  aria-hidden="true"
                                  className={`transition-colors ${s <= reviewForm.note ? 'fill-warning text-warning' : 'text-muted'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium text-muted" htmlFor="avis-commentaire">{t('vehicule.avis.commentaire')}</label>
                          <textarea
                            id="avis-commentaire"
                            value={reviewForm.commentaire}
                            onChange={(e) => setReviewForm(p => ({ ...p, commentaire: e.target.value }))}
                            rows={3}
                            maxLength={1000}
                            placeholder={t('vehicule.avis.commentairePlaceholder')}
                            className={`${FIELD_CLASS} min-h-28 resize-none py-3`}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium text-muted" htmlFor="avis-photo">{t('vehicule.avis.photo')}</label>
                          <input
                            id="avis-photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setReviewPhoto(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-muted file:me-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:text-xs file:font-medium file:text-white hover:file:bg-white/15"
                          />
                        </div>
                        {reviewError && <p role="alert" className="text-xs text-danger">{reviewError}</p>}
                        {reviewSuccess && <p role="status" className="text-xs text-success">{reviewSuccess}</p>}
                        <button
                          onClick={submitReview}
                          disabled={submittingReview}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                        >
                          <Send size={14} aria-hidden="true" />
                          {submittingReview ? t('vehicule.avis.envoi') : t('actions.envoyer')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column — Booking Widget */}
          <aside className="w-full shrink-0 lg:w-96">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h2 className="mb-5 flex items-center gap-2 font-semibold text-white">
                  {IC.calendar('h-5 w-5 text-primary-light')}
                  {t('vehicule.reserver')}
                </h2>

                <div className="mb-5 space-y-3">
                  <DatePicker
                    label={t('vehicule.datePrise')}
                    id="date-debut"
                    value={dates.dateDebut}
                    onChange={(v) => setDates(p => ({ ...p, dateDebut: v }))}
                  />
                  <div>
                    <label htmlFor="heure-debut" className="mb-1.5 block text-xs font-medium text-muted">
                      {t('vehicule.heure')}
                    </label>
                    <input
                      id="heure-debut"
                      type="time"
                      value={dates.heureDebut}
                      onChange={(e) => setDates(p => ({ ...p, heureDebut: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <DatePicker
                    label={t('vehicule.dateRetour')}
                    id="date-fin"
                    value={dates.dateFin}
                    onChange={(v) => setDates(p => ({ ...p, dateFin: v }))}
                  />
                  <div>
                    <label htmlFor="heure-fin" className="mb-1.5 block text-xs font-medium text-muted">
                      {t('vehicule.heure')}
                    </label>
                    <input
                      id="heure-fin"
                      type="time"
                      value={dates.heureFin}
                      onChange={(e) => setDates(p => ({ ...p, heureFin: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                {/* Price Summary */}
                <div className="mb-5 space-y-2 border-t border-line pt-4" aria-live="polite">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">{t('vehicule.prixParJour')}</span>
                    <span className="font-medium tabular-nums text-white">{formatMAD(vehicule.prix_jour, { suffix: t('unites.dh'), decimals: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted">
                      {IC.clock('h-3.5 w-3.5')}
                      {t('vehicule.duree')}
                    </span>
                    <span className={`font-medium tabular-nums ${duree ? 'text-white' : 'text-muted'}`}>
                      {duree ? formatDuration(duree) : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-line pt-2">
                    <span className="font-semibold text-white">{t('vehicule.total')}</span>
                    <span className={`text-2xl font-bold tabular-nums ${total ? 'text-primary-light' : 'text-muted'}`}>
                      {total ? formatMAD(total, { suffix: t('unites.dh'), decimals: 0 }) : '—'}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <button
                  onClick={handleReserver}
                  disabled={!hasDates}
                  className="mb-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-disabled"
                >
                  {t('vehicule.reserverMaintenant')}
                </button>
                {!hasDates && (
                  <p className="mb-3 text-center text-xs text-muted">{t('vehicule.selectionnezDates')}</p>
                )}

                <a
                  href={`https://wa.me/212603477786?text=${t('vehicule.whatsappMessage', { vehicule: `${vehicule.marque} ${vehicule.modele}` })}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-5 text-sm font-semibold text-success transition-colors hover:bg-success/15"
                >
                  {IC.whatsapp('h-5 w-5')}
                  {t('vehicule.whatsapp')}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
