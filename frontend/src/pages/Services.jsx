import { useTranslation } from 'react-i18next';
import { Car, CalendarRange, Plane, Wrench, Baby, Smartphone } from 'lucide-react';
import { useSeo } from '../lib/useSeo';
import { canonicalFor } from '../lib/seo';

const services = [
  { icon: Car, key: 'courteDuree' },
  { icon: CalendarRange, key: 'longueDuree' },
  { icon: Plane, key: 'transfert' },
  { icon: Wrench, key: 'remplacement' },
  { icon: Baby, key: 'siegesBebe' },
  { icon: Smartphone, key: 'reservation' },
];

export default function Services() {
  const { t } = useTranslation();
  useSeo({
    title: t('seo.services.titre'),
    description: t('seo.services.description'),
    canonical: canonicalFor('/services'),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <h1 className="text-3xl font-bold text-white mb-2">{t('services.titre')}</h1>
      <p className="text-gray-400 mb-8">{t('services.sousTitre')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-red-600/40 transition">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4">
                <Icon size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{t(`services.items.${s.key}.titre`)}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{t(`services.items.${s.key}.desc`)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
