import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Shield, Headphones, MapPin, Calendar, ChevronRight, Star, Fuel, Users, Settings2 } from 'lucide-react';
import api from '../services/api';
import { Skeleton } from '../components/Skeleton';
import FavoriButton from '../components/FavoriButton';

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

function VehicleCard({ v }) {
  const photo = v.photos?.[0];
  const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
  const [imgSrc, setImgSrc] = useState(resolvedPhoto || FALLBACK_IMG);

  return (
    <Link
      to={`/vehicules/${v.id}`}
      className="group bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#dc2626]/40 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={imgSrc}
          alt={`${v.marque} ${v.modele}`}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_IMG)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <FavoriButton vehiculeId={v.id} className="absolute top-1 right-1" />
        {v.populaire && (
          <span className="absolute top-3 left-3 bg-[#dc2626] text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
            <Star size={10} fill="currentColor" /> Populaire
          </span>
        )}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <span className="text-primary-light font-bold text-base">{v.prix_jour}</span>
          <span className="text-muted text-xs ml-0.5">DH/j</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-base group-hover:text-primary-light transition-colors">
          {v.marque} {v.modele}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-muted text-xs">
          <span className="flex items-center gap-1"><Calendar size={12} /> {v.annee}</span>
          <span className="flex items-center gap-1"><Settings2 size={12} /> {v.transmission === 'automatique' ? 'Auto' : 'Manuelle'}</span>
          <span className="flex items-center gap-1"><Fuel size={12} /> {v.carburant}</span>
          <span className="flex items-center gap-1"><Users size={12} /> {v.places}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted text-xs">Disponible</span>
          <span className="text-primary-light text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Details <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function VehicleCardSkeleton() {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden" aria-hidden="true">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export default function Home() {
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
      <section className="relative min-h-[90vh] flex items-end overflow-hidden">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pb-20 pt-32">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#dc2626]/10 border border-[#dc2626]/30 text-primary-light text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
              Location de vehicules au Maroc
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[0.95] tracking-tight">
              Louez la
              <br />
              <span className="text-primary-light">voiture</span>
              <br />
              qui vous correspond
            </h1>
            <p className="text-white/70 text-lg mt-6 max-w-md leading-relaxed">
              Des vehicules premium, un service fiable et des prix transparents. Reservez en quelques clics.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Link
                to="/vehicules"
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold px-8 py-3.5 rounded-xl transition text-sm"
              >
                Voir les vehicules
              </Link>
              <a
                href="#recherche"
                className="bg-white/[0.06] hover:bg-white/[0.1] text-white/70 font-semibold px-8 py-3.5 rounded-xl transition text-sm border border-white/[0.06]"
              >
                Reserver maintenant
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar - Overlapping */}
      <section id="recherche" className="relative z-20 -mt-8 px-6 md:px-12">
        <form onSubmit={handleSearch} className="max-w-7xl mx-auto bg-[#111] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <span className="text-muted text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-primary-light" /> Lieu de prise
              </span>
              <div id="ctl-174" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white/80 text-sm">
                Tanger
              </div>
            </div>
            <div>
              <label className="text-muted text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={12} className="text-primary-light" /> Date & Heure
              </label>
              <div className="flex gap-2">
                <input aria-label="Date & Heure de prise en charge" type="date" value={search.datePrise} onChange={(e) => setSearch({ ...search, datePrise: e.target.value })}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-3 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                <input aria-label="Heure de prise en charge" type="time" value={search.heurePrise} onChange={(e) => setSearch({ ...search, heurePrise: e.target.value })}
                  className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-3 text-white text-sm focus:border-[#dc2626] outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-muted text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-muted" /> Retour
              </label>
              <div className="flex gap-2">
                <input aria-label="Date & Heure de retour" type="date" value={search.dateRetour} onChange={(e) => setSearch({ ...search, dateRetour: e.target.value })}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-3 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                <input aria-label="Heure de retour" type="time" value={search.heureRetour} onChange={(e) => setSearch({ ...search, heureRetour: e.target.value })}
                  className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-3 text-white text-sm focus:border-[#dc2626] outline-none transition" />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold py-3 rounded-lg transition text-sm tracking-wide h-[46px]"
            >
              Rechercher
            </button>
          </div>
        </form>
      </section>

      {/* Brands */}
      <section className="py-14 px-6 md:px-12 mt-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-muted text-[10px] uppercase tracking-[0.3em] font-medium mb-8">Nos marques partenaires</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {BRANDS.map((brand, i) => (
              <div
                key={i}
                className={`group flex items-center justify-center h-14 ${brand.w || 'w-16'} shrink-0 opacity-55 hover:opacity-100 transition-all duration-300`}
                title={brand.name}
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  loading="lazy"
                  className="max-h-11 max-w-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] transition duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                  }}
                />
                <span className="hidden text-white/60 text-xs font-semibold uppercase tracking-widest">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Car size={20} className="text-primary-light" />, title: 'Meilleurs prix', desc: 'Tarifs competitifs toute l\'annee, sans frais caches.' },
            { icon: <Shield size={20} className="text-primary-light" />, title: 'Vehicules recents', desc: 'Confort, securite et performance garantis.' },
            { icon: <Headphones size={20} className="text-primary-light" />, title: 'Support 7j/7', desc: 'Une equipe disponible pour vous accompagner.' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-[#dc2626]/20 transition">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#dc2626]/10 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                <p className="text-muted text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Vehicles */}
      {(populairesLoading || vehiculesPopulaires.length > 0) && (
        <section className="py-16 px-6 md:px-12" aria-busy={populairesLoading}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-primary-light text-xs font-bold uppercase tracking-wider">Flotte</span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">Vehicules populaires</h2>
              </div>
              <Link
                to="/vehicules"
                className="hidden sm:flex items-center gap-1.5 text-primary-light font-semibold text-sm hover:gap-2.5 transition-all"
              >
                Tout voir <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {populairesLoading
                ? Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={i} />)
                : vehiculesPopulaires.slice(0, 4).map((v) => <VehicleCard key={v.id} v={v} />)}
            </div>

            <Link
              to="/vehicules"
              className="sm:hidden flex items-center justify-center gap-1.5 text-primary-light font-semibold text-sm mt-8"
            >
              Tout voir <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-[#dc2626] to-[#991b1b] rounded-2xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover opacity-10 mix-blend-overlay" />
          <div className="relative z-10">
            <h2 className="text-white text-3xl md:text-4xl font-black">Pret a rouler ?</h2>
            <p className="text-white/70 mt-3 max-w-md mx-auto">
              Parcourez notre flotte et trouvez le vehicule ideal pour votre prochain trajet.
            </p>
            <Link
              to="/vehicules"
              className="inline-block bg-white text-primary-light font-bold px-10 py-3.5 rounded-xl mt-8 hover:bg-gray-100 transition text-sm"
            >
              Explorer la flotte
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
