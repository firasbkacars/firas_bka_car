import { useState } from 'react';
import { MapPin, Phone, Clock, MessageCircle, Send, Navigation, Shield, Headphones, FileCheck, Loader2 } from 'lucide-react';
import api from '../services/api';

const AGENCE_ADDRESS = 'Lot 583N, Rue 50, Branes 1, Tanger 90060, Maroc';
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
        <Icon size={16} className="text-[#dc2626]" />
      </div>
      <div>
        <p className="text-white font-medium text-sm">{title}</p>
        <div className="text-white/50 text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
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
      setError(err.response?.data?.message || "Impossible d'envoyer le message. Réessayez ou contactez-nous sur WhatsApp.");
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
          <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
            <span>Accueil</span>
            <span>/</span>
            <span className="text-white/70">Contact</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Contactez<span className="text-[#dc2626]">-nous</span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl">
            Nous sommes à votre disposition pour toute question. Notre équipe vous répond sous 24 heures.
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
              <h2 className="text-white font-semibold text-lg mb-5">Nos coordonnées</h2>
              <div className="space-y-5">
                <InfoCard icon={MapPin} title="Adresse">
                  <p>{AGENCE_ADDRESS}</p>
                </InfoCard>
                <InfoCard icon={Phone} title="Téléphones">
                  <p>06 81 18 18 13</p>
                  <p>06 67 51 14 10</p>
                </InfoCard>
                <InfoCard icon={Clock} title="Horaires">
                  <p>Lun – Sam : 8h00 – 20h00</p>
                  <p>Dimanche : 9h00 – 18h00</p>
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
                  title="Localisation FIRAS BKA CAR"
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
                  Itinéraire Google Maps
                </a>
                <a
                  href={WAZE_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Waze
                </a>
              </div>
            </div>
          </div>

          {/* Right Column — Formulaire (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Formulaire */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 md:p-8">
              <h2 className="text-white font-semibold text-lg mb-1">Envoyez-nous un message</h2>
              <p className="text-white/40 text-sm mb-6">Remplissez le formulaire et nous vous répondrons rapidement.</p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Send size={22} className="text-green-500" />
                  </div>
                  <p className="text-white font-semibold text-lg">Message envoyé !</p>
                  <p className="text-white/40 text-sm mt-1">Nous vous répondrons dans les plus brefs délais.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div role="alert" className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] text-sm px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Nom complet" name="nom" placeholder="Votre nom" required />
                    <InputField label="Téléphone ou email" name="contact" placeholder="06 XX XX XX XX" required />
                  </div>
                  <InputField label="Sujet" name="sujet" placeholder="Ex: Demande de réservation" required />
                  <InputField label="Message" name="message" placeholder="Décrivez votre demande..." required rows={4} />
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sending && <Loader2 size={16} className="animate-spin" />}
                    {sending ? 'Envoi en cours...' : 'Envoyer le message'}
                  </button>
                </form>
              )}

              {/* Séparateur WhatsApp */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#111] px-4 text-white/30 text-xs uppercase tracking-wider">ou</span>
                </div>
              </div>

              <a
                href="https://wa.me/212681181813?text=Bonjour, je souhaite avoir des informations."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-6 py-3 rounded-lg font-semibold hover:bg-[#25D366]/20 transition w-full text-sm"
              >
                <MessageCircle size={17} />
                Contactez-nous directement sur WhatsApp
              </a>
            </div>

            {/* Garanties */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <Headphones size={18} className="text-[#dc2626]" />
                </div>
                <p className="text-white font-medium text-sm">Réponse sous 24h</p>
                <p className="text-white/40 text-xs mt-1">Nous traitons chaque demande rapidement</p>
              </div>
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <Shield size={18} className="text-[#dc2626]" />
                </div>
                <p className="text-white font-medium text-sm">Devis gratuit</p>
                <p className="text-white/40 text-xs mt-1">Estimation sans engagement</p>
              </div>
              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-3">
                  <FileCheck size={18} className="text-[#dc2626]" />
                </div>
                <p className="text-white font-medium text-sm">Support complet</p>
                <p className="text-white/40 text-xs mt-1">Accompagnement de A à Z</p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
