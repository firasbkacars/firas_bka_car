import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { Check, ArrowLeft } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

const SPECS = [
  { key: 'marque', label: 'Marque' },
  { key: 'modele', label: 'Modele' },
  { key: 'categorie', label: 'Categorie' },
  { key: 'annee', label: 'Annee' },
  { key: 'transmission', label: 'Transmission', format: (v) => v === 'automatique' ? 'Automatique' : 'Manuelle' },
  { key: 'carburant', label: 'Carburant', format: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'places', label: 'Places' },
  { key: 'puissance', label: 'Puissance', format: (v) => v || 'N/A' },
  { key: 'kilometrage', label: 'Kilometrage', format: (v) => v ? `${v.toLocaleString()} km` : 'N/A' },
  { key: 'prix_jour', label: 'Prix / jour', format: (v) => `${v} DH`, highlight: true },
];

export default function Compare() {
  const [searchParams] = useSearchParams();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);

  const ids = searchParams.get('compare')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    if (ids.length >= 2) {
      fetchVehicules();
    }
  }, [ids.join(',')]);

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

  if (ids.length < 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PageHeader
          title="Comparateur de vehicules"
          breadcrumbs={[{ label: 'Comparateur', path: '/vehicules' }]}
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-white/40 text-sm mb-6">
            Selectionnez au moins 2 vehicules a comparer depuis le catalogue.
          </p>
          <Link
            to="/vehicules"
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Retour au catalogue
          </Link>
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
