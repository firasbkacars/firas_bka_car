import { Car, CalendarRange, Plane, Wrench, Baby, Smartphone } from 'lucide-react';

const services = [
  { icon: Car, title: 'Location courte durée', desc: 'Louez pour un jour, un week-end ou une semaine. Idéal pour des trajets ponctuels.' },
  { icon: CalendarRange, title: 'Location longue durée', desc: 'Contrats mensuels avantageux pour les particuliers et les entreprises.' },
  { icon: Plane, title: 'Transfert aéroport', desc: 'Service de navette entre l\'aéroport de Tanger et votre destination.' },
  { icon: Wrench, title: 'Véhicule de remplacement', desc: 'En cas de panne, nous vous fournissons un véhicule de courtoisie.' },
  { icon: Baby, title: 'Sièges bébé', desc: 'Sièges homologuées disponibles gratuitement sur demande.' },
  { icon: Smartphone, title: 'Réservation en ligne', desc: 'Réservez en quelques clics depuis votre téléphone ou ordinateur.' },
];

export default function Services() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <h1 className="text-3xl font-bold text-white mb-2">Nos services</h1>
      <p className="text-gray-400 mb-8">Des services complets pour une expérience sans stress.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-red-600/40 transition">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4">
                <Icon size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
