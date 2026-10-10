import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Gauge, Settings, Droplet, Zap, Users, Check, Clock, MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, Star, Send } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800&q=80';

const IC = {
  calendar: (cls) => <Calendar className={cls} />,
  gauge: (cls) => <Gauge className={cls} />,
  cog: (cls) => <Settings className={cls} />,
  droplet: (cls) => <Droplet className={cls} />,
  bolt: (cls) => <Zap className={cls} />,
  users: (cls) => <Users className={cls} />,
  check: (cls) => <Check className={cls} />,
  clock: (cls) => <Clock className={cls} />,
  whatsapp: (cls) => <MessageCircle className={cls} />,
  chevronL: (cls) => <ChevronLeft className={cls} />,
  chevronR: (cls) => <ChevronRight className={cls} />,
};

function Thumbnail({ src, alt, active, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={`Voir ${alt}`}
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-black ${
        active ? 'border-[#dc2626] shadow-lg shadow-[#dc2626]/20' : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/20'
      }`}
    >
      {!loaded && !err && <div className="absolute inset-0 bg-white/[0.04] animate-pulse" />}
      <img
        src={err ? FALLBACK_IMG : src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </button>
  );
}

function DatePicker({ label, id, value, onChange }) {
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

  const dayNames = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const selectDay = (d) => {
    const selected = new Date(year, month, d);
    const iso = selected.toISOString().split('T')[0];
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-left text-sm transition-all hover:border-white/15 focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-white/30'}>{value || 'Sélectionner'}</span>
        <span className="text-white/30">{IC.calendar('w-4 h-4')}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 bg-[#111] border border-white/[0.1] rounded-2xl p-4 shadow-2xl shadow-black/60 w-72">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewDate(new Date(year, month - 1))} className="text-white/40 hover:text-white p-1 transition-colors" aria-label="Mois précédent">
              {IC.chevronL('w-4 h-4')}
            </button>
            <span className="text-white text-sm font-medium">{monthNames[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1))} className="text-white/40 hover:text-white p-1 transition-colors" aria-label="Mois suivant">
              {IC.chevronR('w-4 h-4')}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] text-white/30 font-medium py-1">{d}</div>
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
                  className={`h-9 rounded-lg text-xs font-medium transition-all ${
                    isPast ? 'text-white/15 cursor-not-allowed' :
                    isSelected ? 'bg-[#dc2626] text-white shadow-lg shadow-[#dc2626]/30' :
                    isToday ? 'bg-white/10 text-white' :
                    'text-white/60 hover:bg-white/[0.06] hover:text-white'
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
  const now = new Date();
  const [view, setView] = useState(new Date(now.getFullYear(), now.getMonth()));
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

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
    <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(year, month - 1))} className="text-white/40 hover:text-white p-1 transition-colors" aria-label="Mois précédent">
          {IC.chevronL('w-4 h-4')}
        </button>
        <span className="text-white text-sm font-medium">{monthNames[month]} {year}</span>
        <button onClick={() => setView(new Date(year, month + 1))} className="text-white/40 hover:text-white p-1 transition-colors" aria-label="Mois suivant">
          {IC.chevronR('w-4 h-4')}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
          <div key={d} className="text-center text-[10px] text-white/30 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const booked = isBooked(d);
          const isToday = new Date(year, month, d).getTime() === new Date().setHours(0,0,0,0);
          return (
            <div
              key={d}
              className={`h-8 rounded-lg text-xs flex items-center justify-center font-medium ${
                booked ? 'bg-[#dc2626]/20 text-[#dc2626] line-through' :
                isToday ? 'bg-white/10 text-white' :
                'text-white/50'
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="w-2.5 h-2.5 rounded bg-[#dc2626]/30 border border-[#dc2626]/50" />
          Réservé
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="w-2.5 h-2.5 rounded bg-white/10 border border-white/20" />
          Aujourd'hui
        </div>
      </div>
    </div>
  );
}

export default function VehiculeDetail() {
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
      await api.post('/avis', {
        vehicule_id: parseInt(id),
        note: reviewForm.note,
        commentaire: reviewForm.commentaire || null,
      });
      setReviewSuccess('Avis envoyé avec succès');
      setReviewForm({ note: 5, commentaire: '' });
      fetchAvis();
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmittingReview(false);
    }
  };

  const images = vehicule?.photos?.length
    ? vehicule.photos.map(p => p && !p.startsWith('http') && !p.startsWith('/') ? `/storage/${p}` : p)
    : [FALLBACK_IMG];
  const hasDates = dates.dateDebut && dates.dateFin;

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
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-white/[0.06] rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-white/[0.04] rounded-2xl" />
                <div className="h-6 bg-white/[0.06] rounded w-1/2" />
                <div className="h-40 bg-white/[0.04] rounded-2xl" />
              </div>
              <div className="h-80 bg-white/[0.04] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-white/20" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Véhicule non trouvé</h2>
        <p className="text-white/40 text-sm mb-6">Ce véhicule n'existe pas ou a été supprimé.</p>
        <Link to="/vehicules" className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="text-[13px] text-white/30 mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 flex-wrap">
            <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
            <li>{IC.chevronR('w-3.5 h-3.5')}</li>
            <li><Link to="/vehicules" className="hover:text-white transition-colors">Nos véhicules</Link></li>
            <li>{IC.chevronR('w-3.5 h-3.5')}</li>
            <li className="text-white/70">{vehicule.marque} {vehicule.modele}</li>
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="flex-1 min-w-0">
            {/* Main Image */}
            <div className="relative bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
              {!imgLoaded && <div className="absolute inset-0 bg-white/[0.03] animate-pulse" />}
              <img
                src={images[activeImg]}
                alt={`${vehicule.marque} ${vehicule.modele} — vue ${activeImg + 1}`}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => { e.target.src = FALLBACK_IMG; setImgLoaded(true); }}
                className={`w-full h-[280px] sm:h-[400px] lg:h-[460px] object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => { setActiveImg(i => (i - 1 + images.length) % images.length); setImgLoaded(false); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Image précédente"
                  >
                    {IC.chevronL('w-5 h-5')}
                  </button>
                  <button
                    onClick={() => { setActiveImg(i => (i + 1) % images.length); setImgLoaded(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Image suivante"
                  >
                    {IC.chevronR('w-5 h-5')}
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
                    alt={`${vehicule.marque} ${vehicule.modele} vue ${i + 1}`}
                    active={i === activeImg}
                    onClick={() => { setActiveImg(i); setImgLoaded(false); }}
                  />
                ))}
              </div>
            )}

            {/* Title & Tags */}
            <div className="mt-6 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                {vehicule.marque} {vehicule.modele}
              </h1>
              <div className="flex flex-wrap gap-2 mb-3">
                {[vehicule.transmission === 'automatique' ? 'Automatique' : 'Manuelle', vehicule.carburant, `${vehicule.places} places`].map((tag, i) => (
                  <span key={i} className="bg-white/[0.06] text-white/60 text-[12px] px-3 py-1 rounded-full border border-white/[0.06]">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[#dc2626] font-bold text-3xl">{vehicule.prix_jour}</span>
                <span className="text-white/30 text-sm font-normal">DH / jour</span>
              </div>
              {vehicule.montant_caution > 0 && (
                <p className="text-yellow-400/80 text-xs mt-1">
                  Caution remboursable : {vehicule.montant_caution} DH
                </p>
              )}
              {vehicule.description && (
                <p className="text-white/40 text-sm mt-3 max-w-xl leading-relaxed">
                  {vehicule.description}
                </p>
              )}
            </div>

            {/* Specifications */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-semibold mb-4">Spécifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: IC.calendar, label: 'Année', value: vehicule.annee },
                  { icon: IC.gauge, label: 'Kilométrage', value: `${vehicule.kilometrage?.toLocaleString()} km` },
                  { icon: IC.cog, label: 'Transmission', value: vehicule.transmission === 'automatique' ? 'Automatique' : 'Manuelle' },
                  { icon: IC.droplet, label: 'Carburant', value: vehicule.carburant },
                  { icon: IC.bolt, label: 'Puissance', value: vehicule.puissance },
                  { icon: IC.users, label: 'Places', value: vehicule.places },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg bg-[#dc2626]/10 flex items-center justify-center shrink-0">
                      {s.icon('w-4 h-4 text-[#dc2626]')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white/40 text-[11px] uppercase tracking-wider">{s.label}</div>
                      <div className="text-white text-sm font-medium truncate">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-semibold mb-4">Équipements</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(vehicule.equipements || []).map((eq, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-4 py-2.5 border border-white/[0.04]">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      {IC.check('w-3 h-3 text-emerald-400')}
                    </div>
                    <span className="text-white/70 text-sm">{eq}</span>
                  </div>
                ))}
                {(!vehicule.equipements || vehicule.equipements.length === 0) && (
                  <p className="text-white/30 text-sm col-span-full">Aucun équipement renseigné.</p>
                )}
              </div>
            </div>

            {/* Disponibilité */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                {IC.calendar('w-5 h-5 text-[#dc2626]')}
                Disponibilité
              </h3>
              <MiniCalendar bookedDates={vehicule.reservations || []} />
            </div>

            {/* Avis clients */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-[#dc2626]" />
                Avis clients
              </h3>

              {avisLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                        <div className="h-4 bg-white/[0.06] rounded w-24" />
                      </div>
                      <div className="h-3 bg-white/[0.04] rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {avisData.nombre > 0 && (
                    <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.06]">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">{avisData.moyenne}</div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={14}
                              className={s <= Math.round(avisData.moyenne) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                            />
                          ))}
                        </div>
                        <div className="text-white/40 text-xs mt-1">{avisData.nombre} avis</div>
                      </div>
                    </div>
                  )}

                  {avisData.avis.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-4">Aucun avis pour ce véhicule.</p>
                  ) : (
                    <div className="space-y-3 mb-5">
                      {avisData.avis.slice(0, 5).map((avi) => (
                        <div key={avi.id} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[#dc2626]/20 flex items-center justify-center text-[#dc2626] text-xs font-bold">
                              {avi.client_initiale}
                            </div>
                            <div>
                              <div className="text-white text-sm font-medium">{avi.client_prenom}</div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star
                                    key={s}
                                    size={10}
                                    className={s <= avi.note ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="ml-auto text-white/30 text-xs">
                              {new Date(avi.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {avi.commentaire && (
                            <p className="text-white/60 text-sm leading-relaxed">{avi.commentaire}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire d'avis */}
                  <div className="border-t border-white/[0.06] pt-5">
                    <h4 className="text-white/70 text-sm font-medium mb-3">Laisser un avis</h4>
                    {!client ? (
                      <p className="text-white/30 text-sm">
                        <Link to="/client/login" className="text-[#dc2626] hover:underline">Connectez-vous</Link> pour laisser un avis.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-white/50 text-xs mb-2 block">Note</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setReviewForm(p => ({ ...p, note: s }))}
                                className="p-0.5 transition-colors"
                              >
                                <Star
                                  size={20}
                                  className={`transition-colors ${s <= reviewForm.note ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 hover:text-white/40'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs mb-2 block">Commentaire (optionnel)</label>
                          <textarea
                            value={reviewForm.commentaire}
                            onChange={(e) => setReviewForm(p => ({ ...p, commentaire: e.target.value }))}
                            rows={3}
                            maxLength={1000}
                            placeholder="Partagez votre expérience..."
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all resize-none placeholder:text-white/20"
                          />
                        </div>
                        {reviewError && <p className="text-red-400 text-xs">{reviewError}</p>}
                        {reviewSuccess && <p className="text-emerald-400 text-xs">{reviewSuccess}</p>}
                        <button
                          onClick={submitReview}
                          disabled={submittingReview}
                          className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Send size={14} />
                          {submittingReview ? 'Envoi...' : 'Envoyer'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column — Booking Widget */}
          <aside className="w-full lg:w-96 shrink-0">
            <div className="lg:sticky lg:top-28">
              <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  {IC.calendar('w-5 h-5 text-[#dc2626]')}
                  Réserver ce véhicule
                </h3>

                <div className="space-y-3 mb-5">
                  <DatePicker
                    label="Date de prise en charge"
                    id="date-debut"
                    value={dates.dateDebut}
                    onChange={(v) => setDates(p => ({ ...p, dateDebut: v }))}
                  />
                  <div>
                    <label htmlFor="heure-debut" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                      Heure
                    </label>
                    <input
                      id="heure-debut"
                      type="time"
                      value={dates.heureDebut}
                      onChange={(e) => setDates(p => ({ ...p, heureDebut: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
                    />
                  </div>
                  <DatePicker
                    label="Date de retour"
                    id="date-fin"
                    value={dates.dateFin}
                    onChange={(v) => setDates(p => ({ ...p, dateFin: v }))}
                  />
                  <div>
                    <label htmlFor="heure-fin" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                      Heure
                    </label>
                    <input
                      id="heure-fin"
                      type="time"
                      value={dates.heureFin}
                      onChange={(e) => setDates(p => ({ ...p, heureFin: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Price Summary */}
                <div className="border-t border-white/[0.06] pt-4 mb-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Prix / jour</span>
                    <span className="text-white font-medium">{vehicule.prix_jour} DH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      {IC.clock('w-3.5 h-3.5')}
                      Durée
                    </span>
                    <span className={`font-medium transition-all duration-300 ${duree ? 'text-white' : 'text-white/20'}`}>
                      {duree ? `${duree} jour${duree > 1 ? 's' : ''}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.06]">
                    <span className="text-white font-semibold">Total</span>
                    <span className={`text-2xl font-bold transition-all duration-300 ${total ? 'text-[#dc2626] scale-100' : 'text-white/20'}`}>
                      {total ? `${total} DH` : '—'}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <button
                  onClick={handleReserver}
                  disabled={!hasDates}
                  className={`w-full font-semibold py-3.5 rounded-xl transition-all duration-300 mb-3 ${
                    hasDates
                      ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-lg shadow-[#dc2626]/20 hover:shadow-[#dc2626]/30'
                      : 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                  }`}
                >
                  Réserver maintenant
                </button>
                {!hasDates && (
                  <p className="text-center text-white/25 text-xs mb-3">Sélectionnez vos dates pour réserver</p>
                )}

                <a
                  href={`https://wa.me/212681181813?text=Je suis intéressé par le ${vehicule.marque} ${vehicule.modele}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1da851] text-white font-semibold py-3.5 rounded-xl transition-colors"
                >
                  {IC.whatsapp('w-5 h-5')}
                  Contacter par WhatsApp
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
