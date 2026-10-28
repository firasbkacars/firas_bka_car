import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { XCircle, CheckCircle2, UploadCloud, Loader2, Calendar, Download, ChevronDown, Car, Award, Trophy, AlertTriangle, Clock, CreditCard, ReceiptText, Users, Copy, Link2, Landmark } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatutPaiement from '../../components/StatutPaiement';
import DocumentUpload from '../../components/DocumentUpload';
import { formatMAD, formatDate, formatDateTime } from '../../lib/formatters';

const STATUS_COLORS = {
  confirmee: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  en_cours: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  terminee: 'bg-green-500/10 border-green-500/20 text-green-400',
  annulee: 'bg-red-500/10 border-red-500/20 text-red-400',
};

/**
 * Extrait le message lisible d'une erreur API : erreur de validation
 * (422), message metier ou repli generique.
 */
function messageErreurApi(err, fallback) {
  const data = err?.response?.data;
  const premiere = Object.values(data?.errors || {}).flat().find(Boolean);
  return premiere || data?.message || fallback;
}

/**
 * Paliers de la politique d'annulation, reflets de RefundPolicy (backend).
 * Uniquement pour rendre l'apercu lisible : le montant affiche vient
 * toujours de /annulation-preview, calcule par le backend.
 */
const PALIERS_ANNULATION = [
  { cle: 'gratuit', heuresMin: 48, taux: 1 },
  { cle: 'partiel', heuresMin: 24, taux: 0.5 },
  { cle: 'tardif', heuresMin: 0, taux: 0 },
];

function palierApplicable(heures) {
  if (typeof heures !== 'number' || Number.isNaN(heures)) return null;
  return PALIERS_ANNULATION.find((p) => heures >= p.heuresMin) || null;
}

/** V1 : couleurs propres a chaque palier de fidelite. */
const TIER_STYLES = {
  bronze: {
    card: 'from-amber-800/20 to-orange-800/10 border-amber-700/30',
    icon: 'text-amber-700',
    badge: 'bg-amber-800/20 border-amber-700/40 text-amber-500',
    bar: 'from-amber-700 to-orange-600',
  },
  argent: {
    card: 'from-gray-400/15 to-slate-400/10 border-gray-400/30',
    icon: 'text-gray-300',
    badge: 'bg-gray-400/15 border-gray-400/40 text-gray-200',
    bar: 'from-gray-400 to-slate-300',
  },
  or: {
    card: 'from-yellow-500/15 to-amber-500/10 border-yellow-500/30',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
    bar: 'from-yellow-500 to-amber-400',
  },
  platine: {
    card: 'from-indigo-400/15 to-slate-300/10 border-indigo-300/30',
    icon: 'text-indigo-200',
    badge: 'bg-indigo-400/15 border-indigo-300/40 text-indigo-100',
    bar: 'from-indigo-300 to-slate-200',
  },
};

const TIER_FALLBACK = TIER_STYLES.bronze;

/** Encaissement = montant positif, remboursement = ecriture negative. */
function montantSignePaiement(p) {
  const m = parseFloat(p?.montant) || 0;
  return p?.type === 'remboursement' ? -Math.abs(m) : m;
}

/**
 * Etat du paiement d'une reservation, quel que soit le mode (especes ou CMI).
 *
 * `acompte_paye` est un attribut calcule toujours present (meme a 0), on ne
 * peut donc pas s'appuyer sur `!= null` pour savoir si un reglement existe.
 */
function statutPaiementReservation(res) {
  const paye = parseFloat(res?.acompte_paye || 0);
  const rembourse = parseFloat(res?.rembourse || 0);
  if (rembourse > 0 && paye <= 0) return 'rembourse';
  if (res?.est_paye_integralement) return 'paye';
  return 'en_attente';
}

export default function ClientProfil() {
  const { t } = useTranslation();
  const { client, token, loading: authLoading, logout, updateProfile, uploadPermis, uploadPhoto, uploadIdentityDocument } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nom_complet: '',
    telephone: '',
    email: '',
    cin: '',
    passeport: '',
    est_etranger: false,
    adresse: '',
    date_expiration_permis: '',
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [expandedReservation, setExpandedReservation] = useState(null);

  const [fidelite, setFidelite] = useState(null);
  const [fideliteLoading, setFideliteLoading] = useState(true);

  const [parrainage, setParrainage] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  const [prolongingId, setProlongingId] = useState(null);
  const [prolongDate, setProlongDate] = useState('');

  const [payingId, setPayingId] = useState(null);
  const [previews, setPreviews] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/client/login', { state: { from: '/client/profil' }, replace: true });
    }
  }, [authLoading, token, navigate]);

  useEffect(() => {
    if (client) {
      setForm({
        nom_complet: client.nom_complet || '',
        telephone: client.telephone || '',
        email: client.email || '',
        cin: client.cin || '',
        passeport: client.passeport || '',
        est_etranger: Boolean(client.est_etranger),
        adresse: client.adresse || '',
        date_expiration_permis: client.date_expiration_permis ? String(client.date_expiration_permis).split(' ')[0].split('T')[0] : '',
      });
    }
  }, [client]);

  // Les liens depuis la reservation pointent vers #documents-identite :
  // on amene l'utilisateur directement a la section concernee.
  useEffect(() => {
    if (!client || !window.location.hash) return;
    const cible = document.getElementById(window.location.hash.slice(1));
    if (cible) cible.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [client]);

  useEffect(() => {
    if (!token) return;
    fetchReservations();
    fetchFidelite();
    fetchParrainage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchReservations = async () => {
    try {
      setReservationsLoading(true);
      const { data } = await api.get('/client/reservations');
      setReservations(data);
      // Les reservations viennent d'etre affichees : on marque la
      // consultation et on rafraichit le badge du menu client.
      api.post('/client/notifications/reservations-vues')
        .then(() => window.dispatchEvent(new Event('client-notifications-refresh')))
        .catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setReservationsLoading(false);
    }
  };

  const fetchFidelite = async () => {
    try {
      setFideliteLoading(true);
      const { data } = await api.get('/client/fidelite');
      setFidelite(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFideliteLoading(false);
    }
  };

  const fetchParrainage = async () => {
    try {
      const { data } = await api.get('/client/parrainage');
      setParrainage(data);
    } catch (err) {
      console.error(err);
    }
  };

  const copierCode = async () => {
    if (!parrainage?.code_parrainage) return;
    try {
      await navigator.clipboard.writeText(parrainage.code_parrainage);
      showToast(t('profil.codeCopie'));
    } catch {
      showToast(t('profil.codeCopieErreur'), 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getInitial = () => {
    const name = client?.nom_complet || '';
    return name.charAt(0).toUpperCase() || '?';
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ ...form, est_etranger: Boolean(form.est_etranger) });
      showToast(t('profil.profilMisAJour'));
    } catch (err) {
      showToast(messageErreurApi(err, t('profil.erreurMiseAJour')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const envoyerDocumentIdentite = async (type, file) => {
    try {
      await uploadIdentityDocument(type, file);
      showToast(type === 'carte_nationale'
        ? t('profil.carteEnvoyee')
        : t('profil.passeportEnvoye'));
    } catch (err) {
      showToast(
        messageErreurApi(err, t('profil.erreurEnvoiDocument')),
        'error'
      );
      throw err;
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(t('profil.formatNonSupporte'), 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('profil.photoTropLourde'), 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadPhoto(file);
      showToast(t('profil.photoMiseAJour'));
    } catch (err) {
      showToast(messageErreurApi(err, t('profil.erreurUploadPhoto')), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photoSrc = client?.photo_profil
    ? (client.photo_profil.startsWith('http') || client.photo_profil.startsWith('/')
      ? client.photo_profil
      : `/storage/${client.photo_profil}`)
    : null;

  const estEtranger = Boolean(client?.est_etranger);
  const typeIdentite = estEtranger ? 'passeport' : 'carte_nationale';
  const libelleIdentite = estEtranger ? t('documents.piecePasseport') : t('documents.pieceCarteNationale');
  const cheminIdentite = estEtranger ? client?.passeport_document : client?.carte_nationale;
  const statutIdentite = estEtranger ? client?.passeport_statut : client?.carte_nationale_statut;
  const motifIdentite = estEtranger ? client?.passeport_rejet_motif : client?.carte_nationale_rejet_motif;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  /**
   * Apercu du remboursement, calcule par le BACKEND (RefundPolicy).
   *
   * L'ancienne version recalcloc cote client sur l'acompte theorique, ce
   * qui pouvait annoncer un montant different de celui reellement applique
   * (le backend part de l'acompte deja encaisse).
   */
  const fetchPreview = async (id) => {
    if (previews[id]) return previews[id];
    try {
      const { data } = await api.get(`/client/reservations/${id}/annulation-preview`);
      setPreviews((p) => ({ ...p, [id]: data }));
      return data;
    } catch {
      return null;
    }
  };

  const handleOpenCancel = async (id) => {
    setCancelConfirm(id);
    await fetchPreview(id);
  };

  /**
   * Ouvre la session de paiement CMI et redirige vers la page de carte.
   * Aucune donnee de carte n'est saisie ici ni transmise a nos serveurs.
   */
  const handlePayer = async (reservationId) => {
    setPayingId(reservationId);
    try {
      const { data } = await api.post('/client/payments/cmi/initialize', {
        reservation_id: reservationId,
      });

      if (data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }

      showToast(t('profil.reservations.paiementIndisponible'), 'error');
    } catch (err) {
      showToast(
        err.response?.data?.message || t('profil.reservations.erreurPaiement'),
        'error'
      );
      setPayingId(null);
    }
  };

  const handleProlonger = async (id) => {
    if (!prolongDate) return;
    setProlongingId(id);
    try {
      const { data } = await api.put(`/client/reservations/${id}/prolonger`, {
        date_fin: prolongDate,
      });
      setProlongingId(null);
      setProlongDate('');
      fetchReservations();
      showToast(t('profil.reservations.prolongee', {
        jours: data.jours_supplementaires,
        montant: formatMAD(data.prix_supplement),
      }));
    } catch (err) {
      showToast(err.response?.data?.message || t('profil.reservations.erreurProlongation'), 'error');
      setProlongingId(null);
    }
  };

  const downloadFacture = async (reservationId) => {
    try {
      const response = await api.get(`/client/reservations/${reservationId}/facture`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${reservationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast(t('profil.reservations.erreurFacture'), 'error');
    }
  };

  const downloadContrat = async (reservationId) => {
    try {
      const response = await api.get(`/client/reservations/${reservationId}/contrat`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrat-${reservationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast(t('profil.reservations.erreurContrat'), 'error');
    }
  };

  const handleAnnuler = async (id) => {
    setCancellingId(id);
    try {
      const { data } = await api.put(`/client/reservations/${id}/annuler`);
      setCancelConfirm(null);
      fetchReservations();
      const remb = parseFloat(data.montant_rembourse) || 0;
      showToast(
        remb > 0
          ? t('profil.reservations.annuleeRemboursement', { montant: formatMAD(remb) })
          : t('profil.reservations.annuleeSansRemboursement')
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('profil.reservations.erreurAnnulation'), 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader
        title={t('profil.titre')}
        breadcrumbs={[{ label: t('profil.titre') }]}
      />

      {toast && (
        <div className="fixed top-24 end-6 z-50 animate-in fade-in slide-in-from-right-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative w-16 h-16 rounded-full bg-[#dc2626] flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden group cursor-pointer disabled:opacity-60"
              aria-label={t('profil.changerPhoto')}
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={client.nom_complet}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitial()
              )}
              <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingPhoto ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <UploadCloud size={20} />
                )}
              </span>
              <input aria-label={t('profil.choisirPhoto')}
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </button>
            <div>
              <h2 className="text-white font-semibold text-lg">{client?.nom_complet || t('profil.titre')}</h2>
              <p className="text-muted text-sm">{client?.email}</p>
              <p className="text-muted text-xs mt-0.5">{t('profil.cliquerPhoto')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted hover:text-red-500 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            {t('profil.deconnexion')}
          </button>
        </div>

        {/* Historique des reservations */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-primary-light" />
            {t('profil.reservations.titre')}
          </h2>
          <p className="text-muted text-sm mb-5">
            {t('profil.reservations.sousTitre')}
          </p>

          {reservationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.06] rounded w-1/3" />
                      <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8">
              <Car size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted text-sm">{t('profil.reservations.aucune')}</p>
              <Link to="/vehicules" className="text-primary-light text-sm hover:underline mt-2 inline-block">
                {t('profil.reservations.parcourir')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <div key={res.id} className="bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={expandedReservation === res.id}
                    className="w-full flex items-center gap-4 p-4 text-start cursor-pointer hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#dc2626] transition-colors"
                    onClick={() => setExpandedReservation(expandedReservation === res.id ? null : res.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#dc2626]/10 flex items-center justify-center shrink-0">
                      <Car size={18} className="text-primary-light" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">
                          {res.vehicule?.marque} {res.vehicule?.modele}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[res.statut] || ''}`}>
                          {t(`statuts.reservation.${res.statut}`, { defaultValue: res.statut })}
                        </span>
                        <StatutPaiement
                          statut={statutPaiementReservation(res)}
                          showIcon={false}
                        />
                      </div>
                      <p className="text-muted text-xs mt-1">
                        {res.numero} - {t('profil.reservations.duAu', {
                          debut: formatDate(res.date_debut),
                          fin: formatDate(res.date_fin),
                        })}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-primary-light font-bold text-sm">{formatMAD(res.prix_total)}</div>
                      <div className={`text-xs ${parseFloat(res.acompte_paye || 0) > 0 ? 'text-green-400' : 'text-muted'}`}>
                        {parseFloat(res.acompte_paye || 0) > 0
                          ? t('profil.reservations.regle', { montant: formatMAD(res.acompte_paye) })
                          : t('profil.reservations.aRegler', { montant: formatMAD(res.acompte || 0) })}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`text-muted shrink-0 transition-transform ${expandedReservation === res.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expandedReservation === res.id && (
                    <div className="border-t border-white/[0.04] px-4 py-4 bg-white/[0.01]">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-muted text-xs uppercase tracking-wider">{t('profil.reservations.priseEnCharge')}</p>
                          <p className="text-white text-sm mt-1">{formatDateTime(res.date_debut)}</p>
                          {res.agence && (
                            <p className="text-white text-xs mt-0.5">
                              {res.agence.nom}
                              {res.agence.telephone ? ` · ${res.agence.telephone}` : ''}
                            </p>
                          )}
                          <p className="text-muted text-xs">{res.lieu_prise}</p>
                        </div>
                        <div>
                          <p className="text-muted text-xs uppercase tracking-wider">{t('profil.reservations.retour')}</p>
                          <p className="text-white text-sm mt-1">{formatDateTime(res.date_fin)}</p>
                          <p className="text-muted text-xs">{res.lieu_retour}</p>
                        </div>
                        <div>
                          <p className="text-muted text-xs uppercase tracking-wider">{t('profil.reservations.modePaiement')}</p>
                          <p className="text-white text-sm mt-1">
                            {res.mode_paiement === 'cmi' ? t('profil.reservations.carteBancaire') : t('profil.reservations.especes')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted text-xs uppercase tracking-wider">{t('profil.reservations.paiements')}</p>
                          <p className="text-white text-sm mt-1">
                            {t('profil.reservations.encaisseSur', {
                              paye: formatMAD(res.acompte_paye || 0),
                              total: formatMAD(res.acompte || 0),
                            })}
                          </p>
                          {parseFloat(res.rembourse || 0) > 0 && (
                            <p className="text-blue-400 text-xs mt-0.5">
                              {t('profil.reservations.dontRembourse', { montant: formatMAD(res.rembourse) })}
                            </p>
                          )}
                        </div>
                      </div>

                      <HistoriquePaiements paiements={res.paiements} />

                      <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04] flex-wrap">
                        {res.mode_paiement === 'cmi' &&
                          res.est_payable_en_ligne &&
                          (res.statut === 'confirmee' || res.statut === 'en_cours') && (
                          <button
                            onClick={() => handlePayer(res.id)}
                            disabled={payingId === res.id}
                            className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#dc2626]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {payingId === res.id
                              ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> {t('profil.reservations.ouverture')}</>
                              : <><CreditCard size={14} aria-hidden="true" /> {t('profil.reservations.payer', { montant: formatMAD(res.acompte_restant ?? res.acompte) })}</>}
                          </button>
                        )}
                        {res.mode_paiement !== 'cmi' &&
                          res.statut !== 'annulee' &&
                          parseFloat(res.acompte_restant ?? res.acompte ?? 0) > 0.009 && (
                          <Link
                            to={`/paiement/acompte/${encodeURIComponent(res.numero)}`}
                            className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#dc2626]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Landmark size={14} aria-hidden="true" />
                            {t('profil.reservations.payerAcompte', { montant: formatMAD(res.acompte_restant ?? res.acompte) })}
                          </Link>
                        )}
                        {parseFloat(res.acompte_paye || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => downloadFacture(res.id)}
                            className="flex items-center gap-2 bg-[#dc2626]/10 hover:bg-[#dc2626]/20 text-primary-light px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download size={14} aria-hidden="true" />
                            {t('profil.reservations.telechargerFacture')}
                          </button>
                        )}
                        {['confirmee', 'en_cours', 'terminee'].includes(res.statut) && (
                          <button
                            type="button"
                            onClick={() => downloadContrat(res.id)}
                            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download size={14} aria-hidden="true" />
                            {t('profil.reservations.contrat')}
                          </button>
                        )}
                        {res.statut === 'terminee' && (
                          <Link
                            to={`/vehicules/${res.vehicule_id}`}
                            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Car size={14} />
                            {t('profil.reservations.reserverNouveau')}
                          </Link>
                        )}
                        {['confirmee', 'en_cours'].includes(res.statut) && (
                          <div className="w-full">
                            {prolongingId === res.id ? (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <p className="text-blue-400 text-sm mb-2 flex items-center gap-2">
                                  <Clock size={14} />
                                  {t('profil.reservations.prolongerTitre')}
                                </p>
                                <p className="text-gray-400 text-xs mb-2">
                                  {t('profil.reservations.dateRetourActuelle', { date: formatDate(res.date_fin) })}
                                </p>
                                <div className="flex items-center gap-2">
                                  <input aria-label={t('profil.reservations.nouvelleDate')}
                                    type="date"
                                    value={prolongDate}
                                    min={new Date(res.date_fin).toISOString().split('T')[0]}
                                    onChange={(e) => setProlongDate(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#dc2626]"
                                  />
                                  <button
                                    onClick={() => handleProlonger(res.id)}
                                    disabled={!prolongDate}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                                  >
                                    {t('actions.confirmer')}
                                  </button>
                                  <button
                                    onClick={() => { setProlongingId(null); setProlongDate(''); }}
                                    className="text-muted hover:text-white px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/5"
                                  >
                                    {t('actions.annuler')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setProlongingId(res.id)}
                                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Clock size={14} />
                                {t('profil.reservations.prolonger')}
                              </button>
                            )}
                          </div>
                        )}
                        {(res.statut === 'confirmee' || res.statut === 'en_cours') && (
                          <>
                            {cancelConfirm === res.id ? (
                              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
                                <p className="text-red-400 text-sm mb-2 flex items-center gap-2">
                                  <AlertTriangle size={14} />
                                  {t('profil.reservations.confirmerAnnulation')}
                                </p>
                                {(() => {
                                  const remb = previews[res.id];
                                  const heures = remb?.heures_avant_debut;
                                  const palier = palierApplicable(heures);
                                  return (
                                    <div className="mb-3 space-y-2">
                                      <p className="text-gray-400 text-xs">
                                        {t('profil.reservations.acompteEncaisse')}{' '}
                                        <span className="text-white font-medium">
                                          {remb ? formatMAD(remb.acompte_paye) : '...'}
                                        </span>
                                      </p>
                                      {remb ? (
                                        <>
                                          <p className={`text-xs font-medium ${parseFloat(remb.montant_rembourse) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {parseFloat(remb.montant_rembourse) > 0 ? t('profil.reservations.remboursement') : t('profil.reservations.aucunRemboursement')} :{' '}
                                            <span className="font-bold">{formatMAD(remb.montant_rembourse)}</span>
                                          </p>

                                          {/* Les trois paliers de la politique, pour situer le cas courant.
                                              Le montant reste celui calcule par le backend. */}
                                          <ul className="space-y-1">
                                            {PALIERS_ANNULATION.map((p) => {
                                              const actif = palier?.cle === p.cle;
                                              return (
                                                <li
                                                  key={p.cle}
                                                  className={`flex items-start gap-2 rounded px-2 py-1 text-xs leading-snug ${
                                                    actif
                                                      ? 'bg-white/[0.06] text-white'
                                                      : 'text-muted'
                                                  }`}
                                                >
                                                  <span
                                                    aria-hidden="true"
                                                    className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${actif ? 'bg-[#dc2626]' : 'bg-gray-700'}`}
                                                  />
                                                  <span>
                                                    <span className="font-medium">{t(`profil.paliers.${p.cle}.libelle`)}</span>
                                                    {' — '}
                                                    {typeof heures === 'number'
                                                      ? `${t('profil.reservations.ilReste', { heures: heures.toFixed(1) })} `
                                                      : `${t(`profil.paliers.${p.cle}.detail`)} `}
                                                    {p.taux > 0 && remb.acompte_paye != null
                                                      ? t('profil.reservations.soit', { montant: formatMAD(parseFloat(remb.acompte_paye) * p.taux) })
                                                      : t(`profil.paliers.${p.cle}.detail`)}
                                                  </span>
                                                </li>
                                              );
                                            })}
                                          </ul>

                                          <p className="text-muted text-xs leading-snug">
                                            {remb.politique}
                                          </p>
                                        </>
                                      ) : (
                                        <p className="text-muted text-xs">{t('profil.reservations.calculEnCours')}</p>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleAnnuler(res.id)}
                                    disabled={cancellingId === res.id}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                                  >
                                    {cancellingId === res.id ? t('profil.reservations.annulationEnCours') : t('actions.confirmer')}
                                  </button>
                                  <button
                                    onClick={() => setCancelConfirm(null)}
                                    className="text-muted hover:text-white px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/5"
                                  >
                                    {t('actions.non')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenCancel(res.id)}
                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <XCircle size={14} />
                                {t('actions.annuler')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pièce d'identité obligatoire */}
        <div id="documents-identite" className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2">{t('documents.titreIdentite')}</h2>
          <p className="text-muted text-sm mb-5">
            {estEtranger
              ? t('documents.descIdentiteEtranger')
              : t('documents.descIdentiteMarocain')}
          </p>

          <DocumentUpload
            titre={estEtranger ? t('documents.titrePasseport') : t('documents.titreCarteNationale')}
            description={t('documents.descriptionIdentite', { piece: libelleIdentite })}
            documentPath={cheminIdentite}
            statut={statutIdentite}
            motif={motifIdentite}
            fieldName={estEtranger ? 'passeport_document' : 'carte_nationale'}
            inputId="profil-document-identite"
            onUpload={(file) => envoyerDocumentIdentite(typeIdentite, file)}
          />

          <p className="text-muted text-xs mt-4 leading-relaxed">
            {t('documents.noteIdentite')}
          </p>
        </div>

        {/* Permis de conduire */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2">{t('documents.titrePermis')}</h2>
          <p className="text-muted text-sm mb-5">
            {t('documents.descPermis')}
          </p>

          <DocumentUpload
            titre={t('documents.titrePermis')}
            description={t('documents.descriptionPermis')}
            documentPath={client?.permis_conduire}
            statut={client?.permis_statut}
            motif={client?.permis_rejet_motif}
            fieldName="permis_conduire"
            inputId="profil-permis-document"
            onUpload={async (file) => {
              try {
                await uploadPermis(file);
                showToast(t('profil.permisEnvoye'));
              } catch (err) {
                showToast(
                  messageErreurApi(err, t('profil.erreurEnvoiPermis')),
                  'error'
                );
                throw err;
              }
            }}
          />

          <p className="text-muted text-xs mt-4 leading-relaxed">
            {t('documents.notePermis')}
          </p>
        </div>

        {/* Programme de fidelite */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            {t('profil.fidelite.titre')}
          </h2>
          <p className="text-muted text-sm mb-5">
            {t('profil.fidelite.sousTitre')}
          </p>

          {fideliteLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                <div className="h-4 bg-white/[0.06] rounded w-1/3" />
              </div>
            </div>
          ) : fidelite ? (
            <div className="space-y-4">
              {/* Niveau actuel */}
              {(() => {
                const tier = TIER_STYLES[fidelite.niveau_actuel] || TIER_FALLBACK;
                return (
                  <div className={`bg-gradient-to-r ${tier.card} border rounded-xl p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy size={24} className={tier.icon} />
                        <div>
                          <p className="text-white font-medium text-lg capitalize">{t(`profil.fidelite.niveaux.${fidelite.niveau_actuel}`, { defaultValue: fidelite.niveau_actuel })}</p>
                          <p className="text-gray-400 text-sm">{t('profil.fidelite.reduction', { pourcent: fidelite.reduction_actuelle })}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-white font-semibold text-2xl">{fidelite.points_fidelite}</p>
                        <p className="text-muted text-xs">{t('profil.fidelite.points')}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-2xl">{fidelite.nombre_locations}</p>
                  <p className="text-muted text-sm">{t('profil.fidelite.locationsEffectuees')}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-2xl">{fidelite.points_fidelite}</p>
                  <p className="text-muted text-sm">{t('profil.fidelite.pointsCumules')}</p>
                </div>
              </div>

              {/* Prochain niveau */}
              {fidelite.prochain_niveau && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">{t('profil.fidelite.prochainNiveau')}</p>
                    <span className="text-white text-sm font-medium capitalize">{t(`profil.fidelite.niveaux.${fidelite.prochain_niveau.niveau}`, { defaultValue: fidelite.prochain_niveau.niveau })}</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${(TIER_STYLES[fidelite.prochain_niveau.niveau] || TIER_FALLBACK).bar} h-2 rounded-full transition-all`}
                      style={{
                        width: `${Math.min(100, ((fidelite.nombre_locations) / (fidelite.nombre_locations + fidelite.prochain_niveau.locations_restantes)) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-muted text-xs mt-2">
                    {t('profil.fidelite.plusQue', {
                      count: fidelite.prochain_niveau.locations_restantes,
                      pourcent: fidelite.prochain_niveau.reduction,
                    })}
                  </p>
                </div>
              )}

              {/* Niveaux disponibles */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">{t('profil.fidelite.niveauxTitre')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(fidelite.niveaux).map(([nom, config]) => {
                    const tier = TIER_STYLES[nom] || TIER_FALLBACK;
                    const actif = nom === fidelite.niveau_actuel;
                    return (
                      <div
                        key={nom}
                        className={`text-center p-2 rounded-lg border ${
                          actif ? `bg-white/[0.04] ${tier.badge}` : 'bg-white/[0.02] border-white/[0.04]'
                        }`}
                      >
                        <p className={`text-xs font-medium capitalize ${actif ? '' : 'text-white'}`}>{t(`profil.fidelite.niveaux.${nom}`, { defaultValue: nom })}</p>
                        <p className={`text-[10px] mt-0.5 ${actif ? '' : 'text-muted'}`}>{t('profil.fidelite.remise', { pourcent: config.reduction })}</p>
                        <p className={`text-[10px] ${actif ? '' : 'text-muted'}`}>{config.locations_min}+</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm">{t('profil.fidelite.erreur')}</p>
          )}
        </div>

        {/* V2 : parrainage */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Users size={18} className="text-primary-light" />
            {t('profil.parrainage.titre')}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('profil.parrainage.sousTitre')}
          </p>
          {parrainage ? (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-white text-lg tracking-widest">
                  {parrainage.code_parrainage}
                </div>
                <button
                  onClick={copierCode}
                  className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Copy size={14} />
                  {t('profil.parrainage.copier')}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(t('profil.parrainage.messagePartage', {
                    code: parrainage.code_parrainage,
                    url: `${window.location.origin}/client/register`,
                  }))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Link2 size={14} />
                  {t('profil.parrainage.partager')}
                </a>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-xl">{parrainage.nombre_filleuls}</p>
                  <p className="text-muted text-xs mt-1">{t('profil.parrainage.filleuls')}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-xl">{parrainage.filleuls_recompenses}</p>
                  <p className="text-muted text-xs mt-1">{t('profil.parrainage.premiereLocation')}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <p className="text-primary-light font-semibold text-xl">{parrainage.points_totaux}</p>
                  <p className="text-muted text-xs mt-1">{t('profil.parrainage.pointsGagnes')}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted text-sm">{t('profil.parrainage.chargement')}</p>
          )}
        </div>

        {/* Informations personnelles */}
        <form onSubmit={handleUpdate} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">{t('profil.infos.titre')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profil-nom" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.nomComplet')}</label>
              <input
                id="profil-nom"
                type="text"
                value={form.nom_complet}
                onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="profil-tel" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.telephone')}</label>
              <input
                id="profil-tel"
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="profil-email" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.email')}</label>
              <input
                id="profil-email"
                type="email"
                value={form.email}
                readOnly
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-white/70 text-sm cursor-not-allowed"
              />
              <p className="text-muted text-xs mt-1">{t('profil.infos.emailNonModifiable')}</p>
            </div>
            <div>
              <label htmlFor="profil-nationalite" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.nationalite')}</label>
              <select
                id="profil-nationalite"
                value={form.est_etranger ? 'etranger' : 'marocain'}
                onChange={(e) => setForm({ ...form, est_etranger: e.target.value === 'etranger' })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              >
                <option value="marocain">{t('profil.infos.optionMarocaine')}</option>
                <option value="etranger">{t('profil.infos.optionEtrangere')}</option>
              </select>
              <p className="text-muted text-xs mt-1">
                {t('profil.infos.pieceDependNationalite')}
              </p>
            </div>
            <div>
              {form.est_etranger ? (
                <>
                  <label htmlFor="profil-passeport" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.numeroPasseport')}</label>
                  <input
                    id="profil-passeport"
                    type="text"
                    value={form.passeport}
                    onChange={(e) => setForm({ ...form, passeport: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) })}
                    placeholder="X1234567"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626] outline-none transition"
                  />
                  <p className="text-muted text-xs mt-1">{t('profil.infos.passeportAide')}</p>
                </>
              ) : (
                <>
                  <label htmlFor="profil-cin" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.cin')}</label>
                  <input
                    id="profil-cin"
                    type="text"
                    value={form.cin}
                    onChange={(e) => setForm({ ...form, cin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })}
                    placeholder="AB123456"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626] outline-none transition"
                  />
                  <p className="text-muted text-xs mt-1">{t('profil.infos.cinAide')}</p>
                </>
              )}
            </div>
            <div>
              <label htmlFor="profil-permis-exp" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.expirationPermis')}</label>
              <input
                id="profil-permis-exp"
                type="date"
                value={form.date_expiration_permis}
                onChange={(e) => setForm({ ...form, date_expiration_permis: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
              <p className="text-muted text-xs mt-1">{t('profil.infos.expirationAide')}</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="profil-adresse" className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">{t('profil.infos.adresse')}</label>
              <input
                id="profil-adresse"
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link to="/" className="text-muted hover:text-white text-sm transition-colors">
              {t('profil.infos.retourAccueil')}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('profil.infos.enregistrement')}
                </>
              ) : (
                t('profil.infos.enregistrerModifs')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Historique des ecritures de paiement d'une reservation.
 *
 * Les remboursements sont presentes comme des lignes NEGATIVES : un
 * remboursement est une ecriture compensatrice, jamais un encaissement.
 */
function HistoriquePaiements({ paiements }) {
  const { t } = useTranslation();
  if (!paiements?.length) return null;

  const tries = [...paiements].sort((a, b) => {
    const da = a.date_paiement || a.created_at || '';
    const db = b.date_paiement || b.created_at || '';
    return da < db ? -1 : da > db ? 1 : 0;
  });

  return (
    <div className="border-t border-white/[0.04] pt-3">
      <p className="text-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <ReceiptText size={12} aria-hidden="true" />
        {t('profil.ecritures.titre')}
      </p>
      <ul className="space-y-1">
        {tries.map((p) => {
          const estRemboursement = p.type === 'remboursement';
          const signe = montantSignePaiement(p);
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 text-xs"
            >
              <span className="text-muted shrink-0 w-[92px]">
                {p.date_paiement ? formatDateTime(p.date_paiement) : '—'}
              </span>
              <span className={`flex-1 min-w-0 truncate ${estRemboursement ? 'text-blue-300' : 'text-white/80'}`}>
                {estRemboursement ? t('profil.ecritures.remboursement') : t('profil.ecritures.encaissement')}
                {p.transaction_id && (
                  <span className="text-muted font-mono text-[10px] ms-2">{p.transaction_id}</span>
                )}
              </span>
              <span className={`shrink-0 font-medium ${signe < 0 ? 'text-blue-400' : 'text-white'}`}>
                {signe < 0 ? `-${formatMAD(Math.abs(signe))}` : formatMAD(signe)}
              </span>
              <span className="shrink-0">
                <StatutPaiement statut={p.statut_affichage || p.statut} showIcon={false} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
