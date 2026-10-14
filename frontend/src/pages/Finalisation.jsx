import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMAD, formatDate } from '../lib/formatters';
import { Skeleton } from '../components/Skeleton';
import { AlertTriangle, CheckCircle2, XCircle, Banknote, CreditCard, Tag, Loader2, Shield, User, Info, ExternalLink } from 'lucide-react';

const EMPTY_PROMO = {
  checking: false,
  valid: false,
  remise: 0,
  nouveauMontant: 0,
  message: '',
  error: '',
  baseTotal: null,
};

export default function Finalisation() {
  const { vehiculeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { client, loading: authLoading, uploadPermis } = useAuth();
  const toast = useToast();
  const [vehicule, setVehicule] = useState(null);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [parametres, setParametres] = useState({});
  const [parametresError, setParametresError] = useState(false);

  const [form, setForm] = useState({
    agence_id: '',
    notes: '',
    mode_paiement: 'especes',
    code_promo: '',
    conducteur_additionnel_nom: '',
    conducteur_additionnel_telephone: '',
    conducteur_additionnel_permis: '',
  });

  const [promoState, setPromoState] = useState(EMPTY_PROMO);

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
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(
        err.response?.status === 404
          ? 'Ce vehicule n\'est plus disponible.'
          : 'Impossible de charger le vehicule. Verifiez votre connexion puis reessayez.'
      );
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
      setParametresError(false);
    } catch (err) {
      console.error(err);
      // Sans les parametres, le taux d'acompte affiche peut diverger de
      // celui calcule par le backend : on le signale plutot que de taire.
      setParametresError(true);
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

  // Agence retenue : celle choisie par le client, sinon celle de rattachement
  // du vehicule. Elle fournit le lieu de prise en charge / de retour.
  const agenceChoisie = useMemo(() => {
    if (!form.agence_id) return vehicule?.agence || null;
    return agences.find((a) => String(a.id) === String(form.agence_id)) || vehicule?.agence || null;
  }, [agences, form.agence_id, vehicule]);

  const lieu = useMemo(() => {
    if (!agenceChoisie) return 'Tanger';
    const adresse = (agenceChoisie.adresse || '').trim();
    const ville = (agenceChoisie.ville || '').trim();
    return [adresse, ville].filter(Boolean).join(', ') || 'Tanger';
  }, [agenceChoisie]);

  // Pre-remplissage : l'agence du vehicule est proposee par defaut, mais
  // seulement si elle figure bien dans la liste des agences actives.
  useEffect(() => {
    if (form.agence_id || !vehicule?.agence_id || agences.length === 0) return;
    if (agences.some((a) => a.id === vehicule.agence_id)) {
      setForm((prev) => (prev.agence_id ? prev : { ...prev, agence_id: String(vehicule.agence_id) }));
    }
  }, [agences, vehicule, form.agence_id]);

  const tauxAcompte = parseFloat(parametres.taux_acompte || 30);
  const penaliteRetard = parseFloat(parametres.penalite_retard_pourcentage || 50);
  const delaiGratuit = parseInt(parametres.delai_annulation_gratuit || 48);
  const delaiPartiel = parseInt(parametres.delai_annulation_partielle || 24);
  const supplementConducteur = parseFloat(parametres.supplement_conducteur_jour || 50);

  const hasConducteurAdditionnel = form.conducteur_additionnel_nom.trim().length > 0;

  const jours = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return 0;
    // On tronque a zero pour qu'une date de retour anterieure soit
    // signalée, et non convertie silencieusement en "1 jour".
    return Math.max(0, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
  }, [dateDebut, dateFin]);

  /** Total hors remise : c'est la base envoyee au backend pour verifier un code promo. */
  const baseTotal = useMemo(() => {
    if (!vehicule || jours <= 0) return 0;
    const sousTotal = vehicule.prix_jour * jours;
    const supplement = hasConducteurAdditionnel ? supplementConducteur * jours : 0;
    return Math.max(0, sousTotal + supplement);
  }, [vehicule, jours, hasConducteurAdditionnel, supplementConducteur]);

  const dateError = useMemo(() => {
    if (!dateDebut || !dateFin) return null;
    if (jours <= 0) return 'La date de retour doit etre posterieure a la date de prise en charge.';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${dateDebut}T00:00:00`) < today) {
      return 'La date de prise en charge est deja passee.';
    }
    return null;
  }, [dateDebut, dateFin, jours]);

  const details = useMemo(() => {
    const remise = promoState.valid ? promoState.remise : 0;
    const total = Math.max(0, baseTotal - remise);
    return {
      jours,
      sousTotal: vehicule ? vehicule.prix_jour * jours : 0,
      assurance: 0,
      remise,
      total,
      totalApresRemise: total,
      acompte: total * (tauxAcompte / 100),
      caution: vehicule?.montant_caution || 0,
      supplementConducteur: hasConducteurAdditionnel ? supplementConducteur * jours : 0,
    };
  }, [baseTotal, jours, promoState.valid, promoState.remise, tauxAcompte, vehicule, hasConducteurAdditionnel, supplementConducteur]);

  // Une remise verifiee sur un total devenu obsolete (dates ou conducteur
  // additionnel modifies) ne doit plus etre appliquee silencieusement.
  // Ajustement pendant le render (et non dans un effet) : ni double
  // execution en StrictMode, ni rendu parasite.
  const [lastBaseTotal, setLastBaseTotal] = useState(baseTotal);
  if (baseTotal !== lastBaseTotal) {
    setLastBaseTotal(baseTotal);
    if (promoState.valid || promoState.baseTotal != null) {
      setPromoState({
        ...EMPTY_PROMO,
        error: baseTotal > 0 ? 'Code promo retire : le total a change. Reappliquez-le.' : '',
      });
    }
  }

  const verifyPromoCode = async () => {
    const code = form.code_promo.trim();
    if (!code || !baseTotal) return;
    setPromoState({ ...EMPTY_PROMO, checking: true });
    try {
      const { data } = await api.post('/code-promo/verify', {
        code,
        montant: baseTotal,
      });
      setPromoState({
        checking: false,
        valid: true,
        remise: data.remise,
        nouveauMontant: data.nouveau_montant,
        message: data.message,
        error: '',
        baseTotal,
      });
    } catch (err) {
      setPromoState({
        ...EMPTY_PROMO,
        error: err.response?.data?.message || 'Code promo invalide',
      });
    }
  };

  const handleUploadPermis = async () => {
    if (!permisFile) return;
    setUploadingPermis(true);
    try {
      await uploadPermis(permisFile);
      setPermisFile(null);
      toast.success('Permis transmis. Il sera verifie par un agent.');
    } catch {
      toast.error("Erreur lors de l'envoi du permis. Reessayez.");
    } finally {
      setUploadingPermis(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptConditions || dateError) return;
    setSubmitting(true);
    setSubmitError(null);

    let reservation;
    try {
      const { data } = await api.post('/reservations', {
        vehicule_id: parseInt(vehiculeId),
        agence_id: form.agence_id || null,
        date_debut: dateDebut,
        date_fin: dateFin,
        lieu_prise: lieu,
        lieu_retour: lieu,
        mode_paiement: form.mode_paiement,
        notes: form.notes,
        code_promo: form.code_promo || null,
        conducteur_additionnel_nom: form.conducteur_additionnel_nom || null,
        conducteur_additionnel_telephone: form.conducteur_additionnel_telephone || null,
        conducteur_additionnel_permis: form.conducteur_additionnel_permis || null,
      });
      reservation = data;
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur lors de la reservation. Veuillez reessayer.';
      setSubmitError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    if (form.mode_paiement !== 'cmi') {
      navigate(`/confirmation?numero=${encodeURIComponent(reservation.numero)}`, {
        state: { reservation, vehicule, dateDebut, dateFin },
      });
      return;
    }

    try {
      const { data: paymentData } = await api.post('/client/payments/cmi/initialize', {
        reservation_id: reservation.id,
      });

      if (paymentData.payment_url) {
        // Sortie de la SPA : on garde submitting=true pour interdire tout
        // double clic pendant la redirection vers la page de carte.
        window.location.href = paymentData.payment_url;
        return;
      }

      if (paymentData.iframe_data) {
        setCmiPaymentUrl(paymentData.iframe_data);
        toast.success('Reservation creee. Finalisez le paiement dans le cadre ci-dessous.');
        setSubmitting(false);
        return;
      }

      throw new Error('missing_payment_url');
    } catch (payErr) {
      // La reservation est deja creee : on ne doit surtout pas renvoyer vers
      // une seconde creation. On oriente vers la confirmation, d'ou le
      // client pourra payer plus tard depuis son profil.
      const message = payErr.response?.data?.message || 'Initialisation du paiement impossible.';
      setSubmitError(`${message} Votre reservation a bien ete creee : vous pourrez payer depuis votre profil.`);
      toast.warning(`${message} Votre reservation a ete creee.`);
      navigate(`/confirmation?numero=${encodeURIComponent(reservation.numero)}`, {
        state: { reservation, vehicule, dateDebut, dateFin },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16" aria-busy="true">
        <span className="sr-only">Chargement de la reservation...</span>
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-9 w-72 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !vehicule) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-lg mx-auto">
          <XCircle size={32} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-white font-semibold text-lg mb-2">
            {loadError?.startsWith('Ce vehicule') ? 'Vehicule indisponible' : 'Chargement impossible'}
          </h1>
          <p className="text-gray-400 text-sm mb-5">
            {loadError || 'Vehicule non trouve.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setLoading(true); setLoadError(null); fetchVehicule(); }}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Reessayer
            </button>
            <Link
              to="/vehicules"
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Voir les vehicules
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      {submitError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-200/90 text-sm leading-relaxed">{submitError}</p>
        </div>
      )}

      {dateError && (
        <div role="alert" className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-200/90 text-sm leading-relaxed">{dateError}</p>
        </div>
      )}

      {parametresError && (
        <div role="status" className="bg-neutral-500/10 border border-neutral-500/25 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info size={18} className="text-neutral-400 shrink-0 mt-0.5" />
          <p className="text-neutral-300 text-sm leading-relaxed">
            Les tarifs parametres n'ont pas pu etre charges. Les montants affiches
            sont des estimations : le total exact est recalcule par le serveur au
            moment de la validation.
          </p>
        </div>
      )}

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
                <input aria-label="Téléverser le permis de conduire"
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
                <input aria-label="Téléverser le permis de conduire"
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
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-493">Nom complet</label>
                  <input id="ctl-493" type="text" value={client?.nom_complet || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-muted text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-498">Telephone</label>
                  <input id="ctl-498" type="tel" value={client?.telephone || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-muted text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-503">Email</label>
                  <input id="ctl-503" type="email" value={client?.email || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-muted text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-508">CIN</label>
                  <input id="ctl-508" type="text" value={client?.cin || ''} disabled
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-muted text-sm cursor-not-allowed" />
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
                  <label htmlFor="agence-id" className="text-gray-400 text-xs mb-1 block">Agence de prise en charge</label>
                  <select
                    id="agence-id"
                    value={form.agence_id}
                    onChange={(e) => setForm({ ...form, agence_id: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                  >
                    <option value="">Selectionnez une agence</option>
                    {agences.map((agence) => (
                      <option key={agence.id} value={agence.id}>{agence.nom} - {agence.ville}</option>
                    ))}
                  </select>
                  <p className="text-muted text-xs mt-1.5">
                    {form.agence_id
                      ? `Prise en charge et retour : ${lieu}`
                      : vehicule?.agence
                        ? `Par defaut : ${vehicule.agence.nom} - ${lieu}`
                        : 'Selectionnez une agence de prise en charge.'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="notes" className="text-gray-400 text-xs mb-1 block">Notes (optionnel)</label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none resize-none"
                    placeholder="Demandes speciales, siege bebe, etc."
                  />
                </div>
              </div>
            </div>

            {/* Conducteur additionnel */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} className="text-primary-light" />
                <h2 className="text-white font-semibold text-lg">Conducteur additionnel (optionnel)</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Supplement de {supplementConducteur} DH/jour si un conducteur additionnel est ajoute.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-573">Nom du conducteur</label>
                  <input id="ctl-573"
                    type="text"
                    value={form.conducteur_additionnel_nom}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_nom: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-583">Telephone</label>
                  <input id="ctl-583"
                    type="tel"
                    value={form.conducteur_additionnel_telephone}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_telephone: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
                    placeholder="06XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" htmlFor="ctl-593">N° Permis</label>
                  <input id="ctl-593"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Mode de paiement">
                {[
                  { value: 'especes', label: 'Especes', icon: Banknote, desc: 'Paiement a la prise en charge' },
                  { value: 'cmi', label: 'Carte bancaire', icon: CreditCard, desc: 'Visa / Mastercard via CMI' },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`border rounded-lg p-3 cursor-pointer transition text-center focus-within:ring-2 focus-within:ring-[#dc2626] focus-within:ring-offset-2 focus-within:ring-offset-[#0a0a0a] ${
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
                      <m.icon size={18} className="text-gray-400" aria-hidden="true" />
                      <div className="text-sm font-medium text-white">{m.label}</div>
                      <div className="text-xs text-muted">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              {form.mode_paiement === 'cmi' && (
                <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
                  <Shield size={13} className="text-primary-light shrink-0" />
                  Paiement securise via le Centre Monetique Interbancaire. Votre
                  carte n'est jamais stockee par nos serveurs.
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          {/* self-start est indispensable : sans lui l'element occupe toute
              la hauteur de la ligne et le sticky n'a aucun effet. */}
          <div className="space-y-6 self-start lg:sticky lg:top-24">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Resume de la commande</h2>

              <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={vehiculePhotoSrc || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=200&q=80'}
                    alt={`${vehicule.marque} ${vehicule.modele}`}
                    loading="lazy"
                    className="w-20 h-14 object-cover rounded"
                  />
                  <div>
                    <h4 className="text-white font-medium text-sm">{vehicule.marque} {vehicule.modele}</h4>
                    <p className="text-gray-400 text-xs">{vehicule.transmission} • {vehicule.carburant} • {vehicule.places} places</p>
                    <p className="text-primary-light font-bold text-sm mt-1">{formatMAD(vehicule.prix_jour)} / jour</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Date de prise en charge</span>
                  <span className="text-white">{formatDate(dateDebut)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Date de retour</span>
                  <span className="text-white">{formatDate(dateFin)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Duree</span>
                  <span className={`text-white ${dateError ? 'text-amber-400' : ''}`}>
                    {details.jours > 0 ? `${details.jours} jour${details.jours > 1 ? 's' : ''}` : '—'}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>{formatMAD(vehicule.prix_jour)} x {details.jours} jour{details.jours > 1 ? 's' : ''}</span>
                  <span className="text-white">{formatMAD(details.sousTotal)}</span>
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
                  <label htmlFor="code-promo" className="text-gray-400 text-xs mb-2 block">Code promo</label>
                  <div className="flex gap-2">
                    <input
                      id="code-promo"
                      type="text"
                      value={form.code_promo}
                      onChange={(e) => setForm({ ...form, code_promo: e.target.value.toUpperCase() })}
                      placeholder="Entrez votre code"
                      autoComplete="off"
                      className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:border-[#dc2626] outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={verifyPromoCode}
                      disabled={promoState.checking || !form.code_promo.trim() || !baseTotal}
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
                  <h3 className="text-white font-semibold text-sm mb-1">Paiement securise CMI</h3>
                  <p className="text-muted text-xs mb-3">
                    Saisissez les informations de votre carte dans le cadre ci-dessous.
                  </p>
                  <iframe
                    src={cmiPaymentUrl}
                    className="w-full border-0 rounded-lg bg-white"
                    style={{ minHeight: '460px' }}
                    title="Formulaire de paiement CMI"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {details.remise > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Remise promo</span>
                  <span className="font-semibold">-{formatMAD(details.remise)}</span>
                </div>
              )}

              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-[#2a2a2a]">
                <span>Total</span>
                <span className="text-primary-light">{formatMAD(details.totalApresRemise)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Acompte a payer maintenant ({tauxAcompte}%)</span>
                <span className="text-primary-light font-semibold">{formatMAD(details.acompte)}</span>
              </div>
              {details.totalApresRemise > 0 && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Reste a payer a la prise en charge</span>
                  <span className="text-white font-medium">
                    {formatMAD(Math.max(0, details.totalApresRemise - details.acompte))}
                  </span>
                </div>
              )}
              {details.caution > 0 && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Caution (remboursable)</span>
                  <span className="text-yellow-400 font-semibold">{formatMAD(details.caution)}</span>
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
                      <li>• Caution de {formatMAD(details.caution)} remboursee apres verification de l'etat du vehicule</li>
                    )}
                  </ul>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptConditions}
                  onChange={(e) => setAcceptConditions(e.target.checked)}
                  className="mt-0.5 rounded border-gray-600 bg-[#0a0a0a] text-primary-light focus:ring-[#dc2626]"
                />
                <span className="text-white text-sm">
                  J'ai lu et j'accepte les conditions de location et la politique d'annulation
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !hasPermis || !acceptConditions || !!dateError || details.jours <= 0}
              aria-busy={submitting}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {dateError || details.jours <= 0
                ? 'Dates invalides pour reserver'
                : !hasPermis
                  ? 'Permis requis pour reserver'
                  : !acceptConditions
                    ? 'Acceptez les conditions'
                    : submitting
                      ? (form.mode_paiement === 'cmi'
                          ? 'Ouverture du paiement...'
                          : 'Reservation en cours...')
                      : form.mode_paiement === 'cmi'
                        ? <>Payer {formatMAD(details.acompte)} via CMI <ExternalLink size={16} /></>
                        : `Payer l'acompte ${formatMAD(details.acompte)}`
              }
            </button>

            <p className="text-center text-muted text-xs">
              Acompte de {tauxAcompte}% requis pour confirmer la reservation. Le reste est paye a la prise en charge.
            </p>
        </div>
      </form>
    </div>
  );
}
