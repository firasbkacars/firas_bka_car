import { Check } from 'lucide-react';

export default function APropos() {
  const engagements = [
    'Véhicules récents et bien entretenus',
    'Prix transparents, sans frais cachés',
    'Assurance tous risques incluse',
    'Kilométrage illimité',
    'Service client disponible 7j/7',
    'Livraison et retour à l\'aéroport',
    'Réception de paiement par carte bancaire',
  ];

  const faq = [
    { q: 'Quels documents sont nécessaires pour louer ?', a: 'Vous devez présenter un permis de conduire valide, une pièce d\'identité (CIN ou passeport) et un justificatif de domicile.' },
    { q: 'Quel est le kilométrage autorisé ?', a: 'Toutes nos locations incluent un kilométrage illimité. Vous pouvez rouler sans vous soucier des kms.' },
    { q: 'L\'assurance est-elle incluse ?', a: 'Oui, une assurance tous risques est incluse dans chaque location. Vous êtes couvert en cas de dommages.' },
    { q: 'Peut-on récupérer le véhicule à l\'aéroport ?', a: 'Oui, nous assurons un service de navette depuis et vers l\'aéroport Ibn Battouta de Tanger.' },
    { q: 'Comment puis-je payer ?', a: 'Nous acceptons les espèces, Visa, Mastercard et le paiement CMI. L\'acompte de 30% est requis à la réservation.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <h1 className="text-3xl font-bold text-white mb-2">À propos de nous</h1>
      <p className="text-gray-400 mb-8">FIRAS BKA CAR, votre partenaire de confiance à Tanger.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Notre histoire</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Fondée à Tanger, FIRAS BKA CAR est née de la volonté d'offrir un service de location de véhicules
            de qualité à des prix honnêtes. Notre agence, située dans le quartier de Branes, dessert les clients
            depuis plusieurs années avec professionnalisme et passion.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Notre flotte est soigneusement sélectionnée et régulièrement entretenue pour vous garantir
            sécurité et confort à chaque déplacement.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Nos engagements</h3>
          <div className="space-y-3">
            {engagements.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <Check size={16} className="text-[#dc2626] shrink-0" />
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Questions fréquentes</h2>
      <p className="text-gray-400 mb-6">Trouvez rapidement les réponses à vos questions.</p>
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
