import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Phone, MessageCircle } from 'lucide-react';

export default function Confirmation() {
  const { state } = useLocation();
  const reservation = state?.reservation;
  const vehicule = state?.vehicule;

  if (!reservation) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <p className="text-gray-400 mb-4">Aucune réservation trouvée.</p>
        <Link to="/" className="text-[#dc2626] hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Réservation confirmée !</h1>
        <p className="text-gray-400">Merci pour votre confiance. Votre réservation a été effectuée avec succès.</p>
      </div>

      {/* Reservation Number */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center mb-6">
        <p className="text-gray-400 text-sm mb-2">Numéro de réservation</p>
        <p className="text-[#dc2626] font-bold text-3xl tracking-wider">{reservation.numero}</p>
        <p className="text-gray-500 text-xs mt-2">Conservez ce numéro pour toute référence future.</p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Détails de la location</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Prise en charge</span>
              <span className="text-white">{reservation.date_debut ? new Date(reservation.date_debut).toLocaleDateString('fr-FR') : '-'} à {reservation.date_debut ? new Date(reservation.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Retour</span>
              <span className="text-white">{reservation.date_fin ? new Date(reservation.date_fin).toLocaleDateString('fr-FR') : '-'} à {reservation.date_fin ? new Date(reservation.date_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Lieu</span>
              <span className="text-white">{reservation.lieu_prise}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Véhicule</h3>
          {vehicule && (
            <div className="flex items-center gap-3">
              <img
                src={vehicule.photos?.[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=200&q=80'}
                alt={vehicule.modele}
                className="w-20 h-14 object-cover rounded"
              />
              <div>
                <h4 className="text-white font-medium">{vehicule.marque} {vehicule.modele}</h4>
                <p className="text-gray-400 text-xs">{vehicule.transmission} • {vehicule.carburant}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-3">Montant payé</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total</span>
          <span className="text-[#dc2626] font-bold text-2xl">{reservation.prix_total} DH</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400">Statut</span>
          <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm font-medium">Confirmée</span>
        </div>
      </div>

      {/* Help */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
        <h3 className="text-white font-semibold mb-3">Besoin d'aide ?</h3>
        <p className="text-gray-400 text-sm mb-4">Notre équipe est à votre disposition pour toute question.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="tel:+212681181813" className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#333] transition">
            <Phone size={14} /> 06 81 18 18 13
          </a>
          <a href="tel:+212667511410" className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#333] transition">
            <Phone size={14} /> 06 67 51 14 10
          </a>
          <a
            href="https://wa.me/212681181813"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            <MessageCircle size={14} /> Discuter sur WhatsApp
          </a>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link to="/" className="text-[#dc2626] hover:underline">← Retour à l'accueil</Link>
      </div>
    </div>
  );
}
