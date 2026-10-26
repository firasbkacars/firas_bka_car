import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMAD, formatDate } from '../lib/formatters';
import { validateDocumentPhotoFile } from '../lib/documentPhoto';
import { Skeleton } from '../components/Skeleton';
import { AlertTriangle, CheckCircle2, XCircle, Banknote, CreditCard, Tag, Loader2, Shield, User, Info, ExternalLink, ChevronRight } from 'lucide-react';

const EMPTY_PROMO = {
  checking: false,
  valid: false,
  remise: 0,
  nouveauMontant: 0,
  message: '',
  error: '',
  baseTotal: null,
};

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-line-strong bg-neutral-800 px-3 text-base text-white outline-none transition-colors placeholder:text-placeholder focus:border-primary sm:text-sm';

const DISABLED_FIELD_CLASS =
  'min-h-11 w-full cursor-not-allowed rounded-xl border border-line bg-neutral-800/50 px-3 text-sm text-muted';

const FILE_CLASS =
  'block w-full text-sm text-muted file:me-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-primary file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark';

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
  const [documentManquant, setDocumentManquant] = useState(null);
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

    const controle = await validateDocumentPhotoFile(permisFile);
    if (!controle.valid) {
      toast.error(controle.message);
      return;
    }

    setUploadingPermis(true);
    try {
      await uploadPermis(permisFile);
      setPermisFile(null);
      toast.success('Permis transmis. Il sera verifie par un agent.');
    } catch (err) {
      const erreurs = err.response?.data?.errors || {};
      const premiere = Object.values(erreurs).flat().find(Boolean);
      toast.error(premiere || err.response?.data?.message || "Erreur lors de l'envoi du permis. Reessayez.");
    } finally {
      setUploadingPermis(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptConditions || dateError) return;
    setSubmitting(true);
    setSubmitError(null);
    setDocumentManquant(null);

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
      setDocumentManquant(err.response?.data?.document_manquant || null);
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
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8" aria-busy="true">
        <span className="sr-only">Chargement de la reservation...</span>
        <Skeleton className="mb-6 h-4 w-64" />
        <Skeleton className="mb-8 h-9 w-72" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
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
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-danger/10 p-8 text-center">
          <XCircle size={32} className="mx-auto mb-3 text-danger" aria-hidden="true" />
          <h1 className="mb-2 text-lg font-semibold text-white">
            {loadError?.startsWith('Ce vehicule') ? 'Vehicule indisponible' : 'Chargement impossible'}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            {loadError || 'Vehicule non trouve.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { setLoading(true); setLoadError(null); fetchVehicule(); }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Reessayer
            </button>
            <Link
              to="/vehicules"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
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

  const estEtranger = Boolean(client?.est_etranger);
  const libelleIdentite = estEtranger ? 'passeport' : 'carte nationale';
  const cheminIdentite = estEtranger ? client?.passeport_document : client?.carte_nationale;
  const statutIdentite = estEtranger ? client?.passeport_statut : client?.carte_nationale_statut;
  const motifIdentite = estEtranger ? client?.passeport_rejet_motif : client?.carte_nationale_rejet_motif;
  const hasIdentite = Boolean(cheminIdentite) && statutIdentite === 'valide';
  const identiteEnAttente = Boolean(cheminIdentite) && statutIdentite === 'en_attente';
  const identiteRejetee = statutIdentite === 'rejete';

  const vehiculePhoto = vehicule.photos?.[0];
  const vehiculePhotoSrc = vehiculePhoto && !vehiculePhoto.startsWith('http') && !vehiculePhoto.startsWith('/')
    ? `/storage/${vehiculePhoto}`
    : vehiculePhoto;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Fil d'Ariane">
        <Link to="/" className="transition-colors hover:text-white">Accueil</Link>
        <ChevronRight size={12} aria-hidden="true" className="rtl:rotate-180" />
        <Link to="/vehicules" className="transition-colors hover:text-white">Nos vehicules</Link>
        <ChevronRight size={12} aria-hidden="true" className="rtl:rotate-180" />
        <span className="text-white" aria-current="page">Finaliser la reservation</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight text-white md:text-3xl">Finalisez votre reservation</h1>

      {submitError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          <div className="text-sm leading-relaxed">
            <p className="text-white">{submitError}</p>
            {documentManquant && (
              <Link
                to="/client/profil#documents-identite"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary-light hover:underline"
              >
                Mettre à jour ma pièce d'identité
              </Link>
            )}
          </div>
        </div>
      )}

      {dateError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-white">{dateError}</p>
        </div>
      )}

      {parametresError && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-info/20 bg-info/10 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted">
            Les tarifs parametres n'ont pas pu etre charges. Les montants affiches
            sont des estimations : le total exact est recalcule par le serveur au
            moment de la validation.
          </p>
        </div>
      )}

      {/* Pièce d'identité obligatoire */}
      {identiteRejetee && (
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 p-6">
          <div className="flex items-start gap-4">
            <XCircle size={24} className="shrink-0 text-danger" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="mb-1 font-semibold text-danger">
                {estEtranger ? 'Passeport rejeté' : 'Carte nationale rejetée'}
              </h2>
              <p className="mb-2 text-sm leading-relaxed text-muted">
                Votre {libelleIdentite} a été rejetée. Téléversez une nouvelle photo nette
                et lisible depuis votre profil.
              </p>
              {motifIdentite && (
                <p className="mb-3 text-sm text-danger">Motif : {motifIdentite}</p>
              )}
              <Link
                to="/client/profil#documents-identite"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Mettre à jour ma pièce d'identité
              </Link>
            </div>
          </div>
        </div>
      )}

      {identiteEnAttente && (
        <div className="mb-6 rounded-2xl border border-warning/20 bg-warning/10 p-6">
          <div className="flex items-start gap-4">
            <Info size={24} className="shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className="mb-1 font-semibold text-warning">
                {estEtranger ? 'Passeport en cours de vérification' : 'Carte nationale en cours de vérification'}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Votre {libelleIdentite} est en attente de validation par un agent.
                Vous pourrez réserver une fois le document validé.
              </p>
            </div>
          </div>
        </div>
      )}

      {!cheminIdentite && (
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="shrink-0 text-danger" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="mb-1 font-semibold text-danger">
                {estEtranger ? 'Passeport requis' : 'Carte nationale requise'}
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                Vous devez téléverser une photo de votre {libelleIdentite} avant de pouvoir réserver.
                Seules les photos JPG, PNG ou WebP nettes et lisibles sont acceptées.
              </p>
              <Link
                to="/client/profil#documents-identite"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Téléverser ma pièce d'identité
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Permis Warning */}
      {permisRejete && (
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 p-6">
          <div className="flex items-start gap-4">
            <XCircle size={24} className="shrink-0 text-danger" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="mb-1 font-semibold text-danger">Permis rejete</h2>
              <p className="mb-2 text-sm leading-relaxed text-muted">
                Votre permis a ete rejete. Veuillez re-uploader un nouveau document.
              </p>
              {client?.permis_rejet_motif && (
                <p className="mb-3 text-sm text-danger">Motif : {client.permis_rejet_motif}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label="Téléverser le permis de conduire"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPermisFile(e.target.files[0])}
                  className={FILE_CLASS}
                />
                {permisFile && (
                  <button onClick={handleUploadPermis} disabled={uploadingPermis}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50">
                    {uploadingPermis ? 'Envoi...' : 'Uploader le permis'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {permisEnAttente && (
        <div className="mb-6 rounded-2xl border border-warning/20 bg-warning/10 p-6">
          <div className="flex items-start gap-4">
            <Info size={24} className="shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className="mb-1 font-semibold text-warning">Permis en cours de verification</h2>
              <p className="text-sm leading-relaxed text-muted">
                Votre permis est en attente de validation par un agent. Vous pourrez reserver une fois valide.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasPermis && !permisEnAttente && !permisRejete && (
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="shrink-0 text-danger" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="mb-1 font-semibold text-danger">Permis de conduire requis</h2>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                Vous devez telecharger une photo de votre permis de conduire avant de pouvoir reserver.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label="Téléverser le permis de conduire"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPermisFile(e.target.files[0])}
                  className={FILE_CLASS}
                />
                {permisFile && (
                  <button onClick={handleUploadPermis} disabled={uploadingPermis}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50">
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
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Vos informations</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="client-nom">Nom complet</label>
                  <input id="client-nom" type="text" value={client?.nom_complet || ''} disabled
                    className={DISABLED_FIELD_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="client-telephone">Telephone</label>
                  <input id="client-telephone" type="tel" value={client?.telephone || ''} disabled
                    className={DISABLED_FIELD_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="client-email">Email</label>
                  <input id="client-email" type="email" value={client?.email || ''} disabled
                    className={DISABLED_FIELD_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="client-identite">
                    {estEtranger ? 'Passeport' : 'CIN'}
                  </label>
                  <input id="client-identite" type="text" value={(estEtranger ? client?.passeport : client?.cin) || ''} disabled
                    className={DISABLED_FIELD_CLASS} />
                </div>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs text-muted">
                    Pièce d'identité ({estEtranger ? 'passeport' : 'carte nationale'})
                  </span>
                  <div className="flex items-center gap-2">
                    {hasIdentite ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 size={14} aria-hidden="true" /> Validée</span>
                    ) : identiteRejetee ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><XCircle size={14} aria-hidden="true" /> Rejetée</span>
                    ) : identiteEnAttente ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"><Info size={14} aria-hidden="true" /> En attente</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><XCircle size={14} aria-hidden="true" /> Non fournie</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs text-muted">Permis de conduire</span>
                  <div className="flex items-center gap-2">
                    {client?.permis_statut === 'valide' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 size={14} aria-hidden="true" /> Permis valide</span>
                    ) : client?.permis_statut === 'rejete' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><XCircle size={14} aria-hidden="true" /> Permis rejete</span>
                    ) : permisEnAttente ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"><Info size={14} aria-hidden="true" /> En attente</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><XCircle size={14} aria-hidden="true" /> Non uploadé</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="agence-id" className="mb-1 block text-xs text-muted">Agence de prise en charge</label>
                  <select
                    id="agence-id"
                    value={form.agence_id}
                    onChange={(e) => setForm({ ...form, agence_id: e.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="">Selectionnez une agence</option>
                    {agences.map((agence) => (
                      <option key={agence.id} value={agence.id}>{agence.nom} - {agence.ville}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {form.agence_id
                      ? `Prise en charge et retour : ${lieu}`
                      : vehicule?.agence
                        ? `Par defaut : ${vehicule.agence.nom} - ${lieu}`
                        : 'Selectionnez une agence de prise en charge.'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="notes" className="mb-1 block text-xs text-muted">Notes (optionnel)</label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    className={`${FIELD_CLASS} min-h-24 resize-none py-3`}
                    placeholder="Demandes speciales, siege bebe, etc."
                  />
                </div>
              </div>
            </div>

            {/* Conducteur additionnel */}
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <User size={18} className="text-primary-light" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-white">Conducteur additionnel (optionnel)</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                Supplement de {supplementConducteur} DH/jour si un conducteur additionnel est ajoute.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="conducteur-nom">Nom du conducteur</label>
                  <input id="conducteur-nom"
                    type="text"
                    value={form.conducteur_additionnel_nom}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_nom: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="conducteur-telephone">Telephone</label>
                  <input id="conducteur-telephone"
                    type="tel"
                    value={form.conducteur_additionnel_telephone}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_telephone: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="06XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted" htmlFor="conducteur-permis">N° Permis</label>
                  <input id="conducteur-permis"
                    type="text"
                    value={form.conducteur_additionnel_permis}
                    onChange={(e) => setForm({ ...form, conducteur_additionnel_permis: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Numero de permis"
                  />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Mode de paiement</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de paiement">
                {[
                  { value: 'especes', label: 'Especes', icon: Banknote, desc: 'Paiement a la prise en charge' },
                  { value: 'cmi', label: 'Carte bancaire', icon: CreditCard, desc: 'Visa / Mastercard via CMI' },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`cursor-pointer rounded-xl border p-4 text-center transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                      form.mode_paiement === m.value
                        ? 'border-primary bg-primary/10'
                        : 'border-line hover:border-line-strong'
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
                      <m.icon size={20} className={form.mode_paiement === m.value ? 'text-primary-light' : 'text-muted'} aria-hidden="true" />
                      <div className="text-sm font-semibold text-white">{m.label}</div>
                      <div className="text-xs leading-relaxed text-muted">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              {form.mode_paiement === 'cmi' && (
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                  <Shield size={14} className="mt-0.5 shrink-0 text-primary-light" aria-hidden="true" />
                  Paiement securise via le Centre Monetique Interbancaire. Votre
                  carte n'est jamais stockee par nos serveurs.
                </p>
              )}
            </div>
          </div>

          {/* Summary, conditions et CTA */}
          {/* Pas de sticky ici : conditions + CTA rendent le bloc plus haut que
              la plupart des viewports, le sticky n'apporterait rien. */}
          <div className="space-y-6 self-start">
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Resume de la commande</h2>

              <div className="mb-4 rounded-xl border border-line bg-neutral-900 p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={vehiculePhotoSrc || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=200&q=80'}
                    alt={`${vehicule.marque} ${vehicule.modele}`}
                    loading="lazy"
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-white">{vehicule.marque} {vehicule.modele}</h3>
                    <p className="truncate text-xs text-muted">{vehicule.transmission} • {vehicule.carburant} • {vehicule.places} places</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-primary-light">{formatMAD(vehicule.prix_jour)} / jour</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3 text-muted">
                  <span>Date de prise en charge</span>
                  <span className="text-end text-white">{formatDate(dateDebut)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>Date de retour</span>
                  <span className="text-end text-white">{formatDate(dateFin)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>Duree</span>
                  <span className={dateError ? 'font-medium text-warning' : 'text-white'}>
                    {details.jours > 0 ? `${details.jours} jour${details.jours > 1 ? 's' : ''}` : '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-3 text-muted">
                  <span>{formatMAD(vehicule.prix_jour)} x {details.jours} jour{details.jours > 1 ? 's' : ''}</span>
                  <span className="text-end tabular-nums text-white">{formatMAD(details.sousTotal)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>Assurance tous risques</span>
                  <span className="text-success">Incluse</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>Kilometrage illimite</span>
                  <span className="text-success">Inclus</span>
                </div>

                {details.supplementConducteur > 0 && (
                  <div className="flex justify-between gap-3 text-muted">
                    <span>Conducteur additionnel ({details.jours}j x {supplementConducteur} DH)</span>
                    <span className="text-end tabular-nums text-warning">+{details.supplementConducteur} DH</span>
                  </div>
                )}

                {/* Code Promo */}
                <div className="border-t border-line pt-3">
                  <label htmlFor="code-promo" className="mb-2 block text-xs text-muted">Code promo</label>
                  <div className="flex gap-2">
                    <input
                      id="code-promo"
                      type="text"
                      value={form.code_promo}
                      onChange={(e) => setForm({ ...form, code_promo: e.target.value.toUpperCase() })}
                      placeholder="Entrez votre code"
                      autoComplete="off"
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-neutral-800 px-3 text-base uppercase text-white outline-none transition-colors placeholder:text-placeholder focus:border-primary sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={verifyPromoCode}
                      disabled={promoState.checking || !form.code_promo.trim() || !baseTotal}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {promoState.checking ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Tag size={14} aria-hidden="true" />
                      )}
                      Appliquer
                    </button>
                  </div>
                  {promoState.valid && (
                    <p className="mt-2 text-xs text-success">{promoState.message}</p>
                  )}
                  {promoState.error && (
                    <p role="alert" className="mt-2 text-xs text-danger">{promoState.error}</p>
                  )}
                </div>
              </div>

              {/* CMI iframe */}
              {cmiPaymentUrl && (
                <div className="mt-4 rounded-xl border border-line bg-neutral-900 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-white">Paiement securise CMI</h3>
                  <p className="mb-3 text-xs leading-relaxed text-muted">
                    Saisissez les informations de votre carte dans le cadre ci-dessous.
                  </p>
                  <iframe
                    src={cmiPaymentUrl}
                    className="w-full rounded-lg border-0 bg-white"
                    style={{ minHeight: '460px' }}
                    title="Formulaire de paiement CMI"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {details.remise > 0 && (
                  <div className="flex justify-between gap-3 text-sm text-success">
                    <span>Remise promo</span>
                    <span className="font-semibold tabular-nums">-{formatMAD(details.remise)}</span>
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-3 text-lg font-bold text-white">
                  <span>Total</span>
                  <span className="tabular-nums text-primary-light">{formatMAD(details.totalApresRemise)}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs text-muted">
                  <span>Acompte a payer maintenant ({tauxAcompte}%)</span>
                  <span className="text-end font-semibold tabular-nums text-primary-light">{formatMAD(details.acompte)}</span>
                </div>
                {details.totalApresRemise > 0 && (
                  <div className="flex justify-between gap-3 text-xs text-muted">
                    <span>Reste a payer a la prise en charge</span>
                    <span className="text-end font-medium tabular-nums text-white">
                      {formatMAD(Math.max(0, details.totalApresRemise - details.acompte))}
                    </span>
                  </div>
                )}
                {details.caution > 0 && (
                  <div className="flex justify-between gap-3 text-xs text-muted">
                    <span>Caution (remboursable)</span>
                    <span className="text-end font-semibold tabular-nums text-warning">{formatMAD(details.caution)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Conditions et penalites */}
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
              <div className="mb-3 flex items-start gap-3">
                <Shield size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-warning">Conditions de location</h2>
                  <ul className="list-disc space-y-1.5 ps-4 text-xs leading-relaxed text-muted">
                    <li>Penalite de retard : {penaliteRetard}% du prix journalier par jour de retard</li>
                    <li>Annulation gratuite si &gt; {delaiGratuit}h avant la prise en charge</li>
                    <li>Remboursement 50% si entre {delaiPartiel}h et {delaiGratuit}h avant</li>
                    <li>Acompte non remboursable si &lt; {delaiPartiel}h avant</li>
                    {details.caution > 0 && (
                      <li>Caution de {formatMAD(details.caution)} remboursee apres verification de l'etat du vehicule</li>
                    )}
                  </ul>
                </div>
              </div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={acceptConditions}
                  onChange={(e) => setAcceptConditions(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-neutral-800 accent-primary focus:ring-primary"
                />
                <span className="text-sm leading-relaxed text-white">
                  J'ai lu et j'accepte les conditions de location et la politique d'annulation
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !hasPermis || !hasIdentite || !acceptConditions || !!dateError || details.jours <= 0}
              aria-busy={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-disabled"
            >
              {dateError || details.jours <= 0
                ? 'Dates invalides pour reserver'
                : !hasIdentite
                  ? (identiteEnAttente
                      ? 'Pièce d\'identité en attente de validation'
                      : `Pièce d'identité requise (${estEtranger ? 'passeport' : 'CIN'})`)
                  : !hasPermis
                    ? 'Permis requis pour reserver'
                    : !acceptConditions
                      ? 'Acceptez les conditions'
                      : submitting
                        ? (form.mode_paiement === 'cmi'
                            ? 'Ouverture du paiement...'
                            : 'Reservation en cours...')
                        : form.mode_paiement === 'cmi'
                          ? <>Payer {formatMAD(details.acompte)} via CMI <ExternalLink size={16} aria-hidden="true" /></>
                          : `Payer l'acompte ${formatMAD(details.acompte)}`
              }
            </button>

            <p className="text-center text-xs leading-relaxed text-muted">
              Acompte de {tauxAcompte}% requis pour confirmer la reservation. Le reste est paye a la prise en charge.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
