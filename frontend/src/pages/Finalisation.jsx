import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle2, XCircle, Banknote, CreditCard, Building2, Tag, Loader2, Shield, User, Info, ExternalLink } from 'lucide-react';

export default function Finalisation() {
  const { vehiculeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { client, loading: authLoading, uploadPermis } = useAuth();
  const [vehicule, setVehicule] = useState(null);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parametres, setParametres] = useState({});

  const [form, setForm] = useState({
    agence_id: '',
    notes: '',
    mode_paiement: 'especes',
    code_promo: '',
    conducteur_additionnel_nom: '',
    conducteur_additionnel_telephone: '',
    conducteur_additionnel_permis: '',
  });

  const [promoState, setPromoState] = useState({
    checking: false,
    valid: false,
    remise: 0,
    nouveauMontant: 0,
    message: '',
    error: '',
  });

  const [permisFile, setPermisFile] = useState(null);
  const [uploadingPermis, setUploadingPermis] = useState(false);
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [cmiPaymentUrl, setCmiPaymentUrl] = useState(null);

  const dateDebut = searchParams.get('date_debut') || '';
  const dateFin = searchParams.get('date_fin') || '';

  useEffect(() => {
    // Tant que le profil n'est pas charge, client est null : ne pas rediriger
    // sinon un rafraichissement de la page renvoie vers la connexion.
    if (authLoading) return;
    if (!client) {
      navigate('/client/login', { state: { from: `/reservation/${vehiculeId}?${searchParams.toString()}` } });
      return;
    }
    fetchVehicule();
    fetchParametres();
    fetchAgences();
  }, [vehiculeId, client, authLoading]);

  const fetchVehicule = async () => {
    try {
      const { data } = await api.get(`/vehicules/${vehiculeId}`);
      setVehicule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParametres = async () => {
    try {
      const { data } = await api.get('/parametres');
      const map = {};
      data.forEach(p => { map[p.cle] = p.valeur; });
      setParametres(map);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgences = async () => {
    try {
      const { data } = await api.get('/agences');
      setAgences(data);
    } catch (err) {
      console.error(err);
    }
  };

  const tauxAcompte = parseFloat(parametres.taux_acompte || 30);
  const penaliteRetard = parseFloat(parametres.penalite_retard_pourcentage || 50);
  const delaiGratuit = parseInt(parametres.delai_annulation_gratuit || 48);
  const delaiPartiel = parseInt(parametres.delai_annulation_partielle || 24);
  const supplementConducteur = parseFloat(parametres.supplement_conducteur_jour || 50);

  const calculerDetails = () => {
    if (!vehicule || !dateDebut || !dateFin) return { jours: 0, sousTotal: 0, assurance: 0, total: 0, acompte: 0, remise: 0, totalApresRemise: 0, caution: 0, supplementConducteur: 0 };
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const jours = Math.max(1, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
    const sousTotal = vehicule.prix_jour * jours;
    const assurance = 0;
    let total = sousTotal + assurance;
    const remise = promoState.valid ? promoState.remise : 0;
    total = Math.max(0, total - remise);
    const hasConducteurAdditionnel = form.conducteur_additionnel_nom.trim().length > 0;
    const supplement = hasConducteurAdditionnel ? supplementConducteur * jours : 0;
    total += supplement;
    const acompte = total * (tauxAcompte / 100);
    const caution = vehicule.montant_caution || 0;
    return { jours, sousTotal, assurance, total, acompte, remise, totalApresRemise: total, caution, supplementConducteur: supplement };
  };

  const verifyPromoCode = async () => {
    if (!form.code_promo.trim()) return;
    setPromoState({ checking: true, valid: false, remise: 0, nouveauMontant: 0, message: '', error: '' });
    try {
      const details = calculerDetails();
      const { data } = await api.post('/code-promo/verify', {
        code: form.code_promo.trim(),
        montant: details.total,
      });
      setPromoState({
        checking: false,
        valid: true,
        remise: data.remise,
        nouveauMontant: data.nouveau_montant,
        message: data.message,
        error: '',
      });
    } catch (err) {
      setPromoState({
        checking: false,
        valid: false,
        remise: 0,
        nouveauMontant: 0,
        message: '',
        error: err.response?.data?.message || 'Code promo invalide',
      });
    }
  };

  const handleUploadPermis = async () => {
    if (!permisFile) return;
    setUploadingPermis(true);
    try {
      await uploadPermis(permisFile);
    } catch {
      alert('Erreur lors de l\'upload du permis');
    } finally {
      setUploadingPermis(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptConditions) return;
    setSubmitting(true);

    try {
      const { data } = await api.post('/reservations', {
        vehicule_id: parseInt(vehiculeId),
        agence_id: form.agence_id || null,
        date_debut: dateDebut,
        date_fin: dateFin,
        lieu_prise: 'Tanger',
        lieu_retour: 'Tanger',
        mode_paiement: form.mode_paiement,
        notes: form.notes,
        code_promo: form.code_promo || null,
        conducteur_additionnel_nom: form.conducteur_additionnel_nom || null,
        conducteur_additionnel_telephone: form.conducteur_additionnel_telephone || null,
        conducteur_additionnel_permis: form.conducteur_additionnel_permis || null,
      });

      if (form.mode_paiement === 'cmi') {
        try {
          const { data: paymentData } = await api.post('/client/payments/cmi/initialize', {
            reservation_id: data.id,
          });

          if (paymentData.payment_url) {
            window.location.href = paymentData.payment_url;
            return;
          } else if (paymentData.iframe_data) {
            setCmiPaymentUrl(paymentData.iframe_data);
            setSubmitting(false);
            return;
          }
        } catch (payErr) {
          alert(payErr.response?.data?.message || 'Erreur lors de l\'initialisation du paiement CMI. Votre reservation a ete creee, vous pourrez payer plus tard.');
        }
      }

      navigate(`/confirmation?numero=${encodeURIComponent(data.numero)}`, {
        state: {
          reservation: data,
          vehicule,
          dateDebut,
          dateFin,
        },
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la reservation. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  if (!vehicule) return <div className="text-center py-20 text-gray-400">Vehicule non trouve</div>;

  const details = calculerDetails();
  const hasPermis = client?.permis_conduire && client?.permis_statut === 'valide';
  const permisEnAttente = client?.permis_conduire && client?.permis_statut === 'en_attente';
  const permisRejete = client?.permis_statut === 'rejete';

  const vehiculePhoto = vehicule.photos?.[0];
  const vehiculePhotoSrc = vehiculePhoto && !vehiculePhoto.startsWith('http') && !vehiculePhoto.startsWith('/')
    ? `/storage/${vehiculePhoto}`
    : vehiculePhoto;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
      <nav className="text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-white">Accueil</Link>
        <span className="mx-2">/</span>
        <Link to="/vehicules" className="hover:text-white">Nos vehicules</Link>
        <span className="mx-2">/</span>
        <span className="text-white">Finaliser la reservation</span>
      </nav>

      <h1 className="text-3xl font-bold text-white mb-8">Finalisez votre reservation</h1>

      {/* Permis Warning */}
      {permisRejete && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <XCircle size={24} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-500 font-semibold mb-1">Permis rejete</h3>
              <p className="text-gray-400 text-sm mb-2">
                Votre permis a ete rejete. Veuillez re-uploader un nouveau document.
              </p>
              {client?.permis_rejet_motif && (
                <p className="text-red-400 text-sm mb-3">Motif : {client.permis_rejet_motif}</p>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPermisFile(e.target.files[0])}
                  className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#dc2626] file:text-white hover:file:bg-[#b91c1c] file:cursor-pointer"
                />
                {permisFile && (
                  <button onClick={handleUploadPermis} disabled={uploadingPermis}
                    className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:bg-gray-600">
                    {uploadingPermis ? 'Envoi...' : 'Uploader le permis'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {permisEnAttente && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <Info size={24} className="text-yellow-500 shrink-0" />
            <div>
              <h3 className="text-yellow-500 font-semibold mb-1">Permis en cours de verification</h3>
              <p className="text-gray-400 text-sm">
                Votre permis est en attente de validation par un agent. Vous pourrez reserver une fois valide.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasPermis && !permisEnAttente && !permisRejete && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-500 font-semibold mb-1">Permis de conduire requis</h3>
              <p className="text-gray-400 text-sm mb-3">
                Vous devez telecharger une photo de votre permis de conduire avant de pouvoir reserver.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPermisFile(e.target.files[0])}
                  className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#dc2626] file:text-white hover:file:bg-[#b91c1c] file:cursor-pointer"
                />
                {permisFile && (
                  <button onClick={handleUploadPermis} disabled={uploadingPermis}
                    className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:bg-gray-600">
                    {uploadingPermis ? 'Envoi...' : 'Uploader le permis'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Vos informations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nom complet</label>
                  <input type="text" value={client?.nom_complet || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Telephone</label>
                  <input type="tel" value={client?.telephone || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Email</label>
                  <input type="email" value={client?.email || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">CIN</label>
                  <input type="text" value={client?.cin || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Permis de conduire</label>
                  <div className="flex items-center gap-2">
                    {client?.permis_statut === 'valide' ? (
                      <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm"><CheckCircle2 size={14} /> Permis valide</span>
                    ) : client?.permis_statut === 'rejete' ? (
                      <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm"><XCircle size={14} /> Permis rejete</span>
                    ) : permisEnAttente ? (
                      <span className="inline-flex items-center gap-1.5 bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm"><Info size={14} /> En attente</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm"><XCircle size={14} /> Non uploadé</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Agence de prise en charge</label>
                  <select
                    value={form.agence_id}
                    onChange={(e) => setForm({ ...form, agence_id: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                  >
                    <option value="">Selectionnez une agence</option>
                    {agences.map((agence) => (
                      <option key={agence.id} value={agence.id}>{agence.nom} - {agence.ville}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Notes (optionnel)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none resize-none"
                    placeholder="Demandes speciales, siege bebe, etc."
                  />
                </div>
              </div>
            </div>

            {/* Conducteur additionnel */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} className="text-[#dc2626]" />
                <h2 className="text-white font-semibold text-lg">Conducteur additionnel (optionnel)</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Supplement de {supplementConducteur} DH/jour si un conducteur additionnel est ajoute.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nom du conducteur</label>
                  <input
                    type="text"
                    value={form.conducteur_additionnel_nom}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_nom: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Telephone</label>
                  <input
                    type="tel"
                    value={form.conducteur_additionnel_telephone}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_telephone: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="06XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">N° Permis</label>
                  <input
                    type="text"
                    value={form.conducteur_additionnel_permis}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_permis: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="Numero de permis"
                  />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Mode de paiement</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'especes', label: 'Especes', icon: Banknote, desc: 'Paiement a la prise en charge' },
                  { value: 'visa', label: 'Visa', icon: CreditCard, desc: 'Paiement en ligne' },
                  { value: 'mastercard', label: 'Mastercard', icon: CreditCard, desc: 'Paiement en ligne' },
                  { value: 'cmi', label: 'CMI', icon: Building2, desc: 'Centre Monetique Interbancaire' },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`border rounded-lg p-3 cursor-pointer transition text-center ${
                      form.mode_paiement === m.value
                        ? 'border-[#dc2626] bg-[#dc2626]/10'
                        : 'border-[#2a2a2a] hover:border-[#444]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode_paiement"
                      value={m.value}
                      checked={form.mode_paiement === m.value}
                      onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <m.icon size={18} className="text-gray-400" />
                      <div className="text-sm font-medium text-white">{m.label}</div>
                      <div className="text-xs text-gray-500">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Resume de la commande</h2>

              <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={vehiculePhotoSrc || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=200&q=80'}
                    alt={vehicule.modele}
                    className="w-20 h-14 object-cover rounded"
                  />
                  <div>
                    <h4 className="text-white font-medium text-sm">{vehicule.marque} {vehicule.modele}</h4>
                    <p className="text-gray-400 text-xs">{vehicule.transmission} • {vehicule.carburant} • {vehicule.places} places</p>
                    <p className="text-[#dc2626] font-bold text-sm mt-1">{vehicule.prix_jour} DH/jour</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Date de prise en charge</span>
                  <span className="text-white">{dateDebut ? new Date(dateDebut).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Date de retour</span>
                  <span className="text-white">{dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Duree</span>
                  <span className="text-white">{details.jours} jours</span>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>{vehicule.prix_jour} DH x {details.jours} jours</span>
                  <span className="text-white">{details.sousTotal} DH</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Assurance tous risques</span>
                  <span className="text-green-500">Incluse</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Kilometrage illimite</span>
                  <span className="text-green-500">Inclus</span>
                </div>

                {details.supplementConducteur > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Conducteur additionnel ({details.jours}j x {supplementConducteur} DH)</span>
                    <span className="text-yellow-400">+{details.supplementConducteur} DH</span>
                  </div>
                )}

                {/* Code Promo */}
                <div className="pt-3 border-t border-[#2a2a2a]">
                  <label className="text-gray-400 text-xs mb-2 block">Code promo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.code_promo}
                      onChange={(e) => setForm({ ...form, code_promo: e.target.value.toUpperCase() })}
                      placeholder="Entrez votre code"
                      className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:border-[#dc2626] outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={verifyPromoCode}
                      disabled={promoState.checking || !form.code_promo.trim()}
                      className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {promoState.checking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Tag size={14} />
                      )}
                      Appliquer
                    </button>
                  </div>
                  {promoState.valid && (
                    <p className="text-green-400 text-xs mt-2">{promoState.message}</p>
                  )}
                  {promoState.error && (
                    <p className="text-red-400 text-xs mt-2">{promoState.error}</p>
                  )}
                </div>
              </div>

              {/* CMI iframe */}
              {cmiPaymentUrl && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mt-4">
                  <h3 className="text-white font-semibold text-sm mb-3">Paiement securise CMI</h3>
                  <iframe
                    src={cmiPaymentUrl}
                    className="w-full border-0 rounded-lg"
                    style={{ minHeight: '400px' }}
                    title="Paiement CMI"
                  />
                </div>
              )}

              {details.remise > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Remise promo</span>
                  <span className="font-semibold">-{details.remise} DH</span>
                </div>
              )}

              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-[#2a2a2a]">
                <span>Total</span>
                <span className="text-[#dc2626]">{details.totalApresRemise} DH</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Acompte ({tauxAcompte}%)</span>
                <span className="text-[#dc2626] font-semibold">{details.acompte.toFixed(2)} DH</span>
              </div>
              {details.caution > 0 && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Caution (remboursable)</span>
                  <span className="text-yellow-400 font-semibold">{details.caution} DH</span>
                </div>
              )}
            </div>
          </div>

          {/* Conditions et penalites */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Shield size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-yellow-500 font-semibold text-sm mb-2">Conditions de location</h3>
                  <ul className="text-gray-400 text-xs space-y-1.5">
                    <li>• Penalite de retard : {penaliteRetard}% du prix journalier par jour de retard</li>
                    <li>• Annulation gratuite si &gt; {delaiGratuit}h avant la prise en charge</li>
                    <li>• Remboursement 50% si entre {delaiPartiel}h et {delaiGratuit}h avant</li>
                    <li>• Acompte non remboursable si &lt; {delaiPartiel}h avant</li>
                    {details.caution > 0 && (
                      <li>• Caution de {details.caution} DH remboursee apres verification de l'état du vehicule</li>
                    )}
                  </ul>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptConditions}
                  onChange={(e) => setAcceptConditions(e.target.checked)}
                  className="mt-0.5 rounded border-gray-600 bg-[#0a0a0a] text-[#dc2626] focus:ring-[#dc2626]"
                />
                <span className="text-white text-sm">
                  J'ai lu et j'accepte les conditions de location et la politique d'annulation
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !hasPermis || !acceptConditions}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {!hasPermis
                ? 'Permis requis pour reserver'
                : !acceptConditions
                  ? 'Acceptez les conditions'
                  : submitting
                    ? 'Reservation en cours...'
                    : form.mode_paiement === 'cmi'
                      ? <>Payer {details.acompte.toFixed(2)} DH via CMI <ExternalLink size={16} /></>
                      : `Payer l'acompte ${details.acompte.toFixed(2)} DH`
              }
            </button>

            <p className="text-center text-gray-500 text-xs">
              Acompte de {tauxAcompte}% requis pour confirmer la reservation. Le reste est paye a la prise en charge.
            </p>
        </div>
      </form>
    </div>
  );
}
