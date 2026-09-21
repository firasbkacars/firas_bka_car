import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
const Hyperspeed = lazy(() => import('../components/Hyperspeed'));
import StrokeText from '../components/StrokeText';
import GradientText from '../components/GradientText';
import api from '../services/api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80';

const BRANDS = [
  { name: 'Renault', logo: '/images/brands/renault.svg' },
  { name: 'Peugeot', logo: '/images/brands/peugeot.svg' },
  { name: 'Volkswagen', logo: '/images/brands/volkswagen.svg' },
  { name: 'BMW', logo: '/images/brands/bmw.svg' },
  { name: 'Mercedes-Benz', logo: '/images/brands/mercedes.svg' },
  { name: 'Audi', logo: '/images/brands/audi.svg' },
  { name: 'Toyota', logo: '/images/brands/toyota.svg' },
  { name: 'Hyundai', logo: '/images/brands/hyundai.svg' },
  { name: 'Dacia', logo: '/images/brands/dacia.svg' },
];

function HomeVehicleCard({ v }) {
  const photo = v.photos?.[0];
  const resolvedPhoto = photo && !photo.startsWith('http') && !photo.startsWith('/') ? `/storage/${photo}` : photo;
  const [imgSrc, setImgSrc] = useState(resolvedPhoto || FALLBACK_IMG);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Link
      to={`/vehicules/${v.id}`}
      className="group relative rounded-2xl overflow-hidden bg-[#111] border border-white/[0.06] hover:border-[#dc2626]/50 transition-all duration-300"
    >
      <div className="relative h-64 overflow-hidden">
        {!imgLoaded && <div className="absolute inset-0 bg-white/[0.03] animate-pulse" />}
        <img
          src={imgSrc}
          alt={`${v.marque} ${v.modele}`}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_IMG)}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {v.populaire && (
          <span className="absolute top-4 left-4 bg-[#dc2626] text-white text-xs px-3 py-1.5 rounded-full font-bold tracking-wide uppercase">
            Populaire
          </span>
        )}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl">
          <span className="text-[#dc2626] font-bold text-lg">{v.prix_jour}</span>
          <span className="text-white/50 text-sm ml-1">DH/jour</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-white font-bold text-lg group-hover:text-[#dc2626] transition-colors">
          {v.marque} {v.modele}
        </h3>
        <p className="text-white/40 text-sm mt-1.5">
          {v.annee} · {v.transmission === 'automatique' ? 'Automatique' : 'Manuelle'} · {v.carburant} · {v.places} places
        </p>
        <div className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm font-medium text-center group-hover:bg-[#dc2626] group-hover:text-white transition-all duration-300">
          Voir le véhicule
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [vehiculesPopulaires, setVehiculesPopulaires] = useState([]);
  const [search, setSearch] = useState({
    lieuPrise: 'Tanger',
    lieuRetour: 'Tanger',
    datePrise: '',
    heurePrise: '10:00',
    dateRetour: '',
    heureRetour: '10:00',
  });

  useEffect(() => {
    api.get('/vehicules', { params: { tri: 'popularite', limit: 4 } })
      .then(({ data }) => {
        const list = data.vehicules || data.data || data || [];
        setVehiculesPopulaires(Array.isArray(list) ? list.slice(0, 4) : []);
      })
      .catch(() => {});
  }, []);

  const hyperspeedOptions = useMemo(() => ({
    distortion: 'turbulentDistortion',
    length: 200,
    roadWidth: 8,
    islandWidth: 1.5,
    lanesPerRoad: 3,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 12,
    lightPairsPerRoadWay: 16,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],
    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],
    carLightsLength: [200 * 0.03, 200 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],
    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x000000,
      shoulderLines: 0xDC2626,
      brokenLines: 0xDC2626,
      leftCars: [0xDC2626, 0xB91C1C, 0xEF4444],
      rightCars: [0xDC2626, 0xB91C1C, 0xEF4444],
      sticks: 0xDC2626
    }
  }), []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      lieu_prise: search.lieuPrise,
      lieu_retour: search.lieuRetour,
      date_prise: `${search.datePrise} ${search.heurePrise}`,
      date_retour: `${search.dateRetour} ${search.heureRetour}`,
    });
    navigate(`/vehicules?${params.toString()}`);
  };

  const features = [
    {
      icon: <svg className="w-6 h-6 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      title: 'Meilleurs prix',
      description: 'Tarifs compétitifs toute l\'année',
    },
    {
      icon: <svg className="w-6 h-6 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      title: 'Véhicules récents',
      description: 'Confort, sécurité et performance',
    },
    {
      icon: <svg className="w-6 h-6 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>,
      title: 'Service client 7/7',
      description: 'Nous sommes à votre écoute',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <Hyperspeed effectOptions={hyperspeedOptions} />
          </Suspense>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
          <div>
            <StrokeText
              text="Louez la voiture"
              strokeColor="#dc2626"
              fillColor="#ffffff"
              strokeWidth={1.2}
              drawDuration={1.6}
              fillDelay={0.3}
              stagger={0.04}
              ease="power2.out"
              trigger="mount"
              fillMode="fade"
              fontSize={72}
              fontWeight={800}
              letterSpacing={-2}
            />
            <StrokeText
              text="qui vous correspond"
              strokeColor="#a16a6a"
              fillColor="#ff0000"
              strokeWidth={0.5}
              drawDuration={1}
              fillDelay={0.2}
              stagger={0.055}
              ease="expo.out"
              trigger="mount"
              fillMode="fade"
              fontSize={52}
              fontWeight={800}
              letterSpacing={0.5}
              reverse
              className="-mt-4"
            />
            <div className="text-lg mt-6">
              <GradientText
                colors={["#ff2727", "#FF9FFC", "#b1b1b1"]}
                animationSpeed={3}
                showBorder={false}
              >
                Des véhicules premium, un service fiable et des prix transparents.
              </GradientText>
            </div>
          </div>

          <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-6">Réservez votre voiture</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Lieu de prise en charge</label>
                <select
                  value={search.lieuPrise}
                  onChange={(e) => setSearch({ ...search, lieuPrise: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
                >
                  <option value="Tanger">Tanger</option>
                  <option value="Casablanca">Casablanca</option>
                  <option value="Rabat">Rabat</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Date</label>
                  <input type="date" value={search.datePrise} onChange={(e) => setSearch({ ...search, datePrise: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Heure</label>
                  <input type="time" value={search.heurePrise} onChange={(e) => setSearch({ ...search, heurePrise: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Retour</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Lieu de retour</label>
                    <select
                      value={search.lieuRetour}
                      onChange={(e) => setSearch({ ...search, lieuRetour: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
                    >
                      <option value="Tanger">Tanger</option>
                      <option value="Casablanca">Casablanca</option>
                      <option value="Rabat">Rabat</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Date retour</label>
                      <input type="date" value={search.dateRetour} onChange={(e) => setSearch({ ...search, dateRetour: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Heure retour</label>
                      <input type="time" value={search.heureRetour} onChange={(e) => setSearch({ ...search, heureRetour: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold py-3 rounded-lg transition text-sm tracking-wide mt-2"
              >
                Réserver maintenant
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Brand Marquee */}
      <section className="py-10 border-y border-white/[0.06] overflow-hidden bg-[#080808]">
        <p className="text-center text-white/30 text-xs uppercase tracking-widest mb-6">Ils font partie de notre flotte</p>
        <div className="flex animate-marquee gap-16 sm:gap-20 items-center whitespace-nowrap">
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <div key={i} className="flex items-center justify-center h-10 w-28 shrink-0">
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-h-8 max-w-full object-contain grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition duration-300"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Features - Horizontal Compact */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] bg-white/[0.02] rounded-2xl border border-white/[0.06]">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-4 p-6">
              <div className="shrink-0 w-12 h-12 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/30 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                <p className="text-white/40 text-xs mt-0.5">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Vehicles */}
      {vehiculesPopulaires.length > 0 && (
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">Nos véhicules populaires</h2>
                <p className="text-white/40 mt-2 text-base">Une sélection de nos voitures les plus demandées</p>
              </div>
              <Link to="/vehicules" className="text-[#dc2626] font-semibold text-sm hover:underline hidden sm:block">
                Voir toute la flotte →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {vehiculesPopulaires.slice(0, 4).map((v) => (
                <HomeVehicleCard key={v.id} v={v} />
              ))}
            </div>

            <Link to="/vehicules" className="sm:hidden block text-center text-[#dc2626] font-semibold text-sm mt-8 hover:underline">
              Voir toute la flotte →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
