import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Clock, MessageCircle, Send, Navigation, Shield, Headphones, FileCheck, Loader2 } from 'lucide-react';
import api from '../services/api';
import Breadcrumbs from '../components/Breadcrumbs';
import { useSeo } from '../lib/useSeo';
import { canonicalFor } from '../lib/seo';

const AGENCE_GPS = { lat: 35.7650625, lng: -5.8305469 };
const GOOGLE_MAPS_EMBED = `https://www.google.com/maps?q=${AGENCE_GPS.lat},${AGENCE_GPS.lng}&z=17&output=embed`;
const GOOGLE_MAPS_directions = `https://www.google.com/maps/dir/?api=1&destination=${AGENCE_GPS.lat},${AGENCE_GPS.lng}`;
const WAZE_url = `https://waze.com/ul?ll=${AGENCE_GPS.lat},${AGENCE_GPS.lng}&navigate=yes`;

function InputField({ label, type = 'text', name, placeholder, required, rows }) {
  const id = `contact-${name}`;
  const base = 'w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#dc2626]/60 focus:ring-1 focus:ring-[#dc2626]/30 transition-colors text-sm';
  if (rows) {
    return (
      <div>
        <label htmlFor={id} className="block text-white/60 text-sm mb-1.5">{label}</label>
        <textarea id={id} name={name} placeholder={placeholder} required={required} rows={rows} className={`${base} resize-none`} />
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="block text-white/60 text-sm mb-1.5">{label}</label>
      <input id={id} type={type} name={name} placeholder={placeholder} required={required} className={base} />
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#dc2626]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} className="text-primary-light" />
      </div>
      <div>
        <p className="text-white font-medium text-sm">{title}</p>
        <div className="text-white/70 text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
  const { t } = useTranslation();
  useSeo({
    title: t('seo.contact.titre'),
    description: t('seo.contact.description'),
    canonical: canonicalFor('/contact'),
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const form = new FormData(e.currentTarget);
    const payload = {
      nom: form.get('nom'),
      contact: form.get('contact'),
      sujet: form.get('sujet'),
      message: form.get('message'),
    };

    setSending(true);
    setError('');

    try {
      await api.post('/contact', payload);
      setSubmitted(true);
      e.target.reset();
      setTimeout(() => setSubmitted(false), 6000);
    } catch (err) {
      setError(err.response?.data?.message || t('contact.form.erreurEnvoi'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#dc2626]/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <Breadcrumbs items={[{ label: t('nav.contact') }]} className="mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('contact.hero.titreDebut')}<span className="text-primary-light">{t('contact.hero.titreFin')}</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl">
            {t('contact.hero.sousTitre')}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left Column — Coordonnées + Carte (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coordonnées */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">{t('contact.coordonnees.titre')}</h2>
              <div className="space-y-5">
                <InfoCard icon={MapPin} title={t('contact.coordonnees.adresse')}>
                  <p>{t('contact.coordonnees.adresseValeur')}</p>
                </InfoCard>
                <InfoCard icon={Phone} title={t('contact.coordonnees.telephone')}>
                  <p>+212 603 477 786</p>
                </InfoCard>
                <InfoCard icon={Clock} title={t('contact.coordonnees.horaires')}>
                  <p>{t('contact.coordonnees.lunSam')}</p>
                  <p>{t('contact.coordonnees.dimanche')}</p>
                </InfoCard>
              </div>
            </div>

            {/* Carte */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="h-72 w-full">
                <iframe
                  src={GOOGLE_MAPS_EMBED}
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.5) brightness(0.8)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('contact.carte.titre')}
                />
              </div>
              <div className="p-4 flex gap-3">
                <a
                  href={GOOGLE_MAPS_directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <Navigation size={15} />
                  {t('contact.carte.itineraire')}
                </a>
                <a
                  href={WAZE_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {t('contact.carte.waze')}
                </a>
              </div>
            </div>
          </div>

          {/* Right Column — Formulaire (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Formulaire */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 md:p-8">
              <h2 className="text-white font-semibold text-lg mb-1">{t('contact.form.titre')}</h2>
              <p className="text-muted text-sm mb-6">{t('contact.form.sousTitre')}</p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Send size={22} className="text-green-500" />
                  </div>
                  <p className="text-white font-semibold text-lg">{t('contact.form.succesTitre')}</p>
                  <p className="text-muted text-sm mt-1">{t('contact.form.succesDesc')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div role="alert" className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-primary-light text-sm px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label={t('contact.form.nom')} name="nom" placeholder={t('contact.form.nomPlaceholder')} required />
                    <InputField label={t('contact.form.contact')} name="contact" placeholder={t('contact.form.contactPlaceholder')} required />
                  </div>
                  <InputField label={t('contact.form.sujet')} name="sujet" placeholder={t('contact.form.sujetPlaceholder')} required />
                  <InputField label={t('contact.form.message')} name="message" placeholder={t('contact.form.messagePlaceholder')} required rows={4} />
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-disabled disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sending && <Loader2 size={16} className="animate-spin" />}
                    {sending ? t('contact.form.envoiEnCours') : t('contact.form.envoyer')}
                  </button>
                </form>
              )}

              {/* Séparateur WhatsApp */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#111] px-4 text-muted text-xs uppercase tracking-wider">{t('contact.form.ou')}</span>
                </div>
              </div>

              <a
                href="https://wa.me/212603477786?text=Bonjour, je souhaite avoir des informations."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-6 py-3 rounded-lg font-semibold hover:bg-[#25D366]/20 transition w-full text-sm"
              >
                <MessageCircle size={17} />
                {t('contact.form.whatsapp')}
              </a>
            </div>

            {/* Garanties */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <Headphones size={18} className="text-primary-light" />
                </div>
                <p className="text-white font-medium text-sm">{t('contact.garanties.reponseTitre')}</p>
                <p className="text-muted text-xs mt-1">{t('contact.garanties.reponseDesc')}</p>
              </div>
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <Shield size={18} className="text-primary-light" />
                </div>
                <p className="text-white font-medium text-sm">{t('contact.garanties.devisTitre')}</p>
                <p className="text-muted text-xs mt-1">{t('contact.garanties.devisDesc')}</p>
              </div>
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <FileCheck size={18} className="text-primary-light" />
                </div>
                <p className="text-white font-medium text-sm">{t('contact.garanties.supportTitre')}</p>
                <p className="text-muted text-xs mt-1">{t('contact.garanties.supportDesc')}</p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
