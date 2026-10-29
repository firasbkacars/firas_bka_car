import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatMAD, formatNumber } from '../lib/formatters';
import { carburantLabel, categorieLabel, equipementLabel } from '../lib/vehiculeLabels';
import { useSeo } from '../lib/useSeo';
import { canonicalFor } from '../lib/seo';
import PageHeader from '../components/PageHeader';
import { Check, ArrowLeft, SlidersHorizontal, Plus } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

const SPECS = [
  { key: 'marque', labelKey: 'compare.specs.marque' },
  { key: 'modele', labelKey: 'compare.specs.modele' },
  { key: 'categorie', labelKey: 'compare.specs.categorie', format: (v, t) => categorieLabel(v, t) },
  { key: 'annee', labelKey: 'compare.specs.annee' },
  { key: 'transmission', labelKey: 'compare.specs.transmission', format: (v, t) => v === 'automatique' ? t('vehicules.filtres.automatique') : t('vehicules.filtres.manuelle') },
  { key: 'carburant', labelKey: 'compare.specs.carburant', format: (v, t) => v ? carburantLabel(v, t) : t('compare.nonRenseigne') },
  { key: 'places', labelKey: 'compare.specs.places', format: (v, t) => v ? `${formatNumber(v)} ${t('unites.places')}` : t('compare.nonRenseigne') },
  { key: 'puissance', labelKey: 'compare.specs.puissance', format: (v, t) => v || t('compare.nonRenseigne') },
  { key: 'kilometrage', labelKey: 'compare.specs.kilometrage', format: (v, t) => v ? `${formatNumber(v)} ${t('unites.km')}` : t('compare.nonRenseigne') },
  { key: 'prix_jour', labelKey: 'compare.specs.prixJour', format: (v, t) => formatMAD(v, { suffix: t('unites.dh'), decimals: 0 }), highlight: true },
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
  const { t } = useTranslation();
  useSeo({
    title: t('seo.compare.titre'),
    description: t('seo.compare.description'),
    canonical: canonicalFor('/vehicules/compare'),
    robots: 'noindex, follow',
  });
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

  const inputCls = 'bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 outline-none';

  if (ids.length < 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PageHeader
          title={t('compare.titre')}
          breadcrumbs={[{ label: t('compare.filAriane'), path: '/vehicules' }]}
        />
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-white/70 mb-2">
            <SlidersHorizontal size={18} className="text-primary-light" />
            <h2 className="font-semibold">{t('compare.selectionTitre')}</h2>
          </div>
          <p className="text-muted text-sm mb-6">
            {t('compare.selectionTexte')}
          </p>

          {/* V10 : filtres */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select aria-label={t('compare.filtres.categorie')} value={filtres.categorie} onChange={(e) => setFiltres({ ...filtres, categorie: e.target.value })} className={inputCls}>
              <option value="">{t('compare.filtres.categorie')}</option>
              <option value="Berline">{t('vehicules.categories.berline')}</option>
              <option value="SUV">{t('vehicules.categories.suv')}</option>
              <option value="Citadine">{t('vehicules.categories.citadine')}</option>
              <option value="Van">{t('vehicules.categories.van')}</option>
            </select>
            <select aria-label={t('compare.filtres.transmission')} value={filtres.transmission} onChange={(e) => setFiltres({ ...filtres, transmission: e.target.value })} className={inputCls}>
              <option value="">{t('compare.filtres.transmission')}</option>
              <option value="automatique">{t('vehicules.filtres.automatique')}</option>
              <option value="manuelle">{t('vehicules.filtres.manuelle')}</option>
            </select>
            <select aria-label={t('compare.filtres.carburant')} value={filtres.carburant} onChange={(e) => setFiltres({ ...filtres, carburant: e.target.value })} className={inputCls}>
              <option value="">{t('compare.filtres.carburant')}</option>
              <option value="essence">{t('vehicules.filtres.essence')}</option>
              <option value="diesel">{t('vehicules.filtres.diesel')}</option>
              <option value="hybride">{t('vehicules.filtres.hybride')}</option>
            </select>
            <input aria-label={t('compare.filtres.prixMin')} type="number" min="0" placeholder={t('compare.filtres.prixMin')} value={filtres.prix_min}
              onChange={(e) => setFiltres({ ...filtres, prix_min: e.target.value })} className={inputCls} />
            <input aria-label={t('compare.filtres.prixMax')} type="number" min="0" placeholder={t('compare.filtres.prixMax')} value={filtres.prix_max}
              onChange={(e) => setFiltres({ ...filtres, prix_max: e.target.value })} className={inputCls} />
            <input aria-label={t('compare.filtres.placesMin')} type="number" min="2" max="9" placeholder={t('compare.filtres.placesMin')} value={filtres.places}
              onChange={(e) => setFiltres({ ...filtres, places: e.target.value })} className={inputCls} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setFiltres(FILTRES_VIDES)}
              className="text-muted hover:text-white text-sm transition-colors"
            >
              {t('compare.filtres.reinitialiser')}
            </button>
            <button
              onClick={lancerComparaison}
              disabled={selectedIds.length < 2}
              className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('compare.comparerSelection', { current: selectedIds.length })}
            </button>
          </div>

          {catalogueLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-44 bg-white/[0.04] rounded-2xl animate-pulse" />)}
            </div>
          ) : catalogue.length === 0 ? (
            <p className="text-muted text-sm text-center py-12">{t('compare.aucunResultat')}</p>
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
                    className={`text-start bg-[#111] border rounded-2xl overflow-hidden transition-all ${
                      selected ? 'border-[#dc2626] ring-1 ring-[#dc2626]/50' : 'border-white/[0.06] hover:border-white/20'
                    } disabled:opacity-40`}
                  >
                    <div className="relative h-36 bg-white/[0.02]">
                      <img src={resolvedPhoto || FALLBACK_IMG} alt={`${v.marque} ${v.modele}`} loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                      <div className={`absolute top-2 end-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        selected ? 'bg-[#dc2626] text-white' : 'bg-black/60 text-white/60'
                      }`}>
                        {selected ? <Check size={14} /> : <Plus size={14} />}
                      </div>
                      <div className="absolute bottom-2 end-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg">
                        <span className="text-primary-light font-bold text-sm">{formatMAD(v.prix_jour, { suffix: t('unites.dh'), decimals: 0 })}</span>
                        <span className="text-white/70 text-xs ms-1">{t('vehicule.parJour')}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-white font-semibold text-sm">{v.marque} {v.modele}</h3>
                      <p className="text-muted text-xs mt-0.5">{v.annee} - {categorieLabel(v.categorie, t)}</p>
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
          title={t('compare.titre')}
          breadcrumbs={[{ label: t('compare.filAriane'), path: '/vehicules' }]}
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
        title={t('compare.titre')}
        breadcrumbs={[{ label: t('compare.filAriane'), path: '/vehicules' }]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <Link
          to="/vehicules"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t('compare.retourCatalogue')}
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
                  <div className="absolute bottom-2 end-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="text-primary-light font-bold">{formatMAD(v.prix_jour, { suffix: t('unites.dh'), decimals: 0 })}</span>
                    <span className="text-white/70 text-xs ms-1">{t('vehicule.parJour')}</span>
                  </div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-white font-semibold">{v.marque} {v.modele}</h3>
                  <p className="text-muted text-xs mt-1">{v.annee} - {categorieLabel(v.categorie, t)}</p>
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
                  <th className="text-start px-6 py-4 text-white/70 text-sm font-medium w-40">{t('compare.specs.caracteristique')}</th>
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
                    <td className="px-6 py-3.5 text-white/70 text-sm">{t(spec.labelKey)}</td>
                    {vehicules.map(v => {
                      const value = v[spec.key];
                      const formatted = spec.format ? spec.format(value, t) : value;
                      return (
                        <td key={v.id} className={`text-center px-6 py-3.5 text-sm ${spec.highlight ? 'text-primary-light font-bold' : 'text-white'}`}>
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Equipements row */}
                <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                  <td className="px-6 py-3.5 text-white/70 text-sm">{t('compare.equipements')}</td>
                  {vehicules.map(v => (
                    <td key={v.id} className="text-center px-6 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        {(v.equipements || []).slice(0, 4).map((eq, i) => (
                          <span key={i} className="text-white text-xs flex items-center gap-1">
                            <Check size={12} className="text-emerald-400" />
                            {equipementLabel(eq, t)}
                          </span>
                        ))}
                        {(!v.equipements || v.equipements.length === 0) && (
                          <span className="text-muted text-xs">{t('actions.aucun')}</span>
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
                        {t('compare.voirDetails')}
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
