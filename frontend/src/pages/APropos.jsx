import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { useSeo } from '../lib/useSeo';
import { canonicalFor } from '../lib/seo';

export default function APropos() {
  const { t } = useTranslation();
  useSeo({
    title: t('seo.apropos.titre'),
    description: t('seo.apropos.description'),
    canonical: canonicalFor('/a-propos'),
  });
  const engagements = t('apropos.engagements.items', { returnObjects: true });
  const faq = t('apropos.faq.items', { returnObjects: true });

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <Breadcrumbs items={[{ label: t('nav.apropos') }]} className="mb-4" />
      <h1 className="text-3xl font-bold text-white mb-2">{t('apropos.titre')}</h1>
      <p className="text-gray-400 mb-8">{t('apropos.sousTitre')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">{t('apropos.histoire.titre')}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            {t('apropos.histoire.p1')}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {t('apropos.histoire.p2')}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">{t('apropos.engagements.titre')}</h3>
          <div className="space-y-3">
            {engagements.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <Check size={16} className="text-primary-light shrink-0" />
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">{t('apropos.faq.titre')}</h2>
      <p className="text-gray-400 mb-6">{t('apropos.faq.sousTitre')}</p>
      <div className="space-y-4">
        {faq.map((item, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h4 className="text-white font-semibold mb-2">{item.q}</h4>
            <p className="text-gray-400 text-sm">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
