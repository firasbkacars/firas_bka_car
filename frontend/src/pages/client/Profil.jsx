import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { XCircle, CheckCircle2, UploadCloud, X, FileText, Loader2, Calendar, Download, ChevronDown, ChevronUp, Car, Award, Trophy, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatutPaiement from '../../components/StatutPaiement';
import { formatMAD } from '../../lib/formatters';

const STATUS_COLORS = {
  confirmee: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  en_cours: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  terminee: 'bg-green-500/10 border-green-500/20 text-green-400',
  annulee: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const STATUS_LABELS = {
  confirmee: 'Confirmee',
  en_cours: 'En cours',
  terminee: 'Terminee',
  annulee: 'Annulee',
};

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
  const { client, token, loading: authLoading, logout, updateProfile, uploadPermis } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    nom_complet: '',
    telephone: '',
    email: '',
    cin: '',
    adresse: '',
  });

  const [permisFile, setPermisFile] = useState(null);
  const [permisPreview, setPermisPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [expandedReservation, setExpandedReservation] = useState(null);

  const [fidelite, setFidelite] = useState(null);
  const [fideliteLoading, setFideliteLoading] = useState(true);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  const [prolongingId, setProlongingId] = useState(null);
  const [prolongDate, setProlongDate] = useState('');

  const [payingId, setPayingId] = useState(null);
  const [previews, setPreviews] = useState({});

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
        adresse: client.adresse || '',
      });
    }
  }, [client]);

  useEffect(() => {
    if (!token) return;
    fetchReservations();
    fetchFidelite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchReservations = async () => {
    try {
      setReservationsLoading(true);
      const { data } = await api.get('/client/reservations');
      setReservations(data);
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
      await updateProfile(form);
      showToast('Profil mis a jour avec succes !');
    } catch {
      showToast('Erreur lors de la mise a jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Le fichier depasse 5 Mo', 'error');
      return;
    }
    setPermisFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPermisPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPermisPreview(null);
    }
  };

  const handleFileInput = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUploadPermis = async () => {
    if (!permisFile) return;
    setUploading(true);
    try {
      await uploadPermis(permisFile);
      setPermisFile(null);
      setPermisPreview(null);
      showToast('Permis uploade avec succes !');
    } catch {
      showToast("Erreur lors de l'upload du permis", 'error');
    } finally {
      setUploading(false);
    }
  };

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

      showToast('Le paiement en ligne n\'est pas disponible pour le moment.', 'error');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Impossible d\'initier le paiement',
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
      showToast(`Reservation prolongee de ${data.jours_supplementaires} jour(s). Supplement: ${data.prix_supplement} DH`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la prolongation', 'error');
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
      showToast('Erreur lors du telechargement de la facture', 'error');
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
          ? `Reservation annulee. Remboursement : ${remb.toFixed(2)} DH`
          : 'Reservation annulee. Aucun remboursement selon la politique.'
      );
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'annulation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader
        title="Mon profil"
        breadcrumbs={[{ label: 'Mon profil' }]}
      />

      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-right-4">
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
            <div className="w-16 h-16 rounded-full bg-[#dc2626] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {client?.photo_profil ? (
                <img
                  src={client.photo_profil}
                  alt={client.nom_complet}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitial()
              )}
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{client?.nom_complet || 'Mon profil'}</h2>
              <p className="text-gray-500 text-sm">{client?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Deconnexion
          </button>
        </div>

        {/* Historique des reservations */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-[#dc2626]" />
            Mes reservations
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Consultez l'historique de toutes vos reservations.
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
              <Car size={40} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/40 text-sm">Aucune reservation pour le moment.</p>
              <Link to="/vehicules" className="text-[#dc2626] text-sm hover:underline mt-2 inline-block">
                Parcourir nos vehicules
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <div key={res.id} className="bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedReservation(expandedReservation === res.id ? null : res.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#dc2626]/10 flex items-center justify-center shrink-0">
                      <Car size={18} className="text-[#dc2626]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">
                          {res.vehicule?.marque} {res.vehicule?.modele}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[res.statut] || ''}`}>
                          {STATUS_LABELS[res.statut] || res.statut}
                        </span>
                        <StatutPaiement
                          statut={statutPaiementReservation(res)}
                          showIcon={false}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {res.numero} - {new Date(res.date_debut).toLocaleDateString('fr-FR')} au {new Date(res.date_fin).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[#dc2626] font-bold text-sm">{formatMAD(res.prix_total)}</div>
                      <div className={`text-xs ${parseFloat(res.acompte_paye || 0) > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                        {parseFloat(res.acompte_paye || 0) > 0
                          ? `${formatMAD(res.acompte_paye)} regle`
                          : `${formatMAD(res.acompte || 0)} a regler`}
                      </div>
                    </div>
                    {expandedReservation === res.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>

                  {expandedReservation === res.id && (
                    <div className="border-t border-white/[0.04] px-4 py-4 bg-white/[0.01]">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">Prise en charge</p>
                          <p className="text-white text-sm mt-1">{new Date(res.date_debut).toLocaleString('fr-FR')}</p>
                          <p className="text-gray-500 text-xs">{res.lieu_prise}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">Retour</p>
                          <p className="text-white text-sm mt-1">{new Date(res.date_fin).toLocaleString('fr-FR')}</p>
                          <p className="text-gray-500 text-xs">{res.lieu_retour}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">Mode de paiement</p>
                          <p className="text-white text-sm mt-1 capitalize">
                            {res.mode_paiement === 'cmi' ? 'Carte bancaire (CMI)' : 'Especes'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">Paiements</p>
                          <p className="text-white text-sm mt-1">
                            {formatMAD(res.acompte_paye || 0)} encaisses sur {formatMAD(res.acompte || 0)}
                          </p>
                          {parseFloat(res.rembourse || 0) > 0 && (
                            <p className="text-blue-400 text-xs mt-0.5">
                              dont {formatMAD(res.rembourse)} rembourse(s)
                            </p>
                          )}
                          {res.paiements?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {res.paiements.map((p) => (
                                <StatutPaiement key={p.id} statut={p.statut_affichage || p.statut} showIcon={false} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

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
                              ? <><Loader2 size={14} className="animate-spin" /> Ouverture...</>
                              : <><CreditCard size={14} /> Payer {parseFloat(res.acompte_restant ?? res.acompte).toFixed(2)} DH</>}
                          </button>
                        )}
                        {res.statut === 'terminee' && (
                          <button
                            onClick={() => downloadFacture(res.id)}
                            className="flex items-center gap-2 bg-[#dc2626]/10 hover:bg-[#dc2626]/20 text-[#dc2626] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download size={14} />
                            Telecharger la facture
                          </button>
                        )}
                        {res.statut === 'terminee' && (
                          <Link
                            to={`/vehicules/${res.vehicule_id}`}
                            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Car size={14} />
                            Reserver a nouveau
                          </Link>
                        )}
                        {res.statut === 'en_cours' && (
                          <div className="w-full">
                            {prolongingId === res.id ? (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <p className="text-blue-400 text-sm mb-2 flex items-center gap-2">
                                  <Clock size={14} />
                                  Prolonger la reservation
                                </p>
                                <p className="text-gray-400 text-xs mb-2">
                                  Date de retour actuelle : {new Date(res.date_fin).toLocaleDateString('fr-FR')}
                                </p>
                                <div className="flex items-center gap-2">
                                  <input
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
                                    Confirmer
                                  </button>
                                  <button
                                    onClick={() => { setProlongingId(null); setProlongDate(''); }}
                                    className="text-gray-500 hover:text-white px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/5"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setProlongingId(res.id)}
                                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Clock size={14} />
                                Prolonger
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
                                  Confirmer l'annulation ?
                                </p>
                                {(() => {
                                  const remb = previews[res.id];
                                  return (
                                    <div className="mb-3 space-y-1">
                                      <p className="text-gray-400 text-xs">
                                        Acompte encaisse :{' '}
                                        <span className="text-white font-medium">
                                          {remb
                                            ? `${parseFloat(remb.acompte_paye).toFixed(2)} DH`
                                            : '...'}
                                        </span>
                                      </p>
                                      {remb ? (
                                        <>
                                          <p className={`text-xs font-medium ${parseFloat(remb.montant_rembourse) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {remb.montant_rembourse > 0 ? 'Remboursement' : 'Aucun remboursement'} :{' '}
                                            <span className="font-bold">{parseFloat(remb.montant_rembourse).toFixed(2)} DH</span>
                                          </p>
                                          <p className="text-gray-500 text-[11px] leading-snug">
                                            {remb.politique}
                                          </p>
                                        </>
                                      ) : (
                                        <p className="text-gray-500 text-[11px]">Calcul en cours...</p>
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
                                    {cancellingId === res.id ? 'Annulation...' : 'Confirmer'}
                                  </button>
                                  <button
                                    onClick={() => setCancelConfirm(null)}
                                    className="text-gray-500 hover:text-white px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/5"
                                  >
                                    Non
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenCancel(res.id)}
                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <XCircle size={14} />
                                Annuler
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

        {/* Permis de conduire */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2">Permis de conduire</h2>
          <p className="text-gray-500 text-sm mb-5">
            Vous devez telecharger une photo de votre permis pour pouvoir reserver.
          </p>

          <div className="mb-5">
            {client?.permis_conduire ? (
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
                <CheckCircle2 size={14} />
                Permis verifie
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-sm font-medium">
                <XCircle size={14} />
                Permis non uploadé
              </span>
            )}
          </div>

          {!permisFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-[#dc2626] bg-[#dc2626]/5'
                  : 'border-neutral-700 hover:border-[#dc2626]/50'
              }`}
            >
              <UploadCloud size={28} className={`mx-auto mb-2 ${dragOver ? 'text-[#dc2626]' : 'text-neutral-500'}`} />
              <p className="text-gray-400 text-sm">
                Glissez votre permis ici ou{' '}
                <span className="text-[#dc2626] font-medium">parcourez vos fichiers</span>
              </p>
              <p className="text-gray-600 text-xs mt-1">JPG, PNG ou PDF - 5 Mo max</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          ) : (
            <div className="border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-start gap-4">
                {permisPreview ? (
                  <img
                    src={permisPreview}
                    alt="Apercu du permis"
                    className="w-20 h-20 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={24} className="text-neutral-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{permisFile.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {(permisFile.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleUploadPermis}
                      disabled={uploading}
                      className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        'Uploader le permis'
                      )}
                    </button>
                    <button
                      onClick={() => { setPermisFile(null); setPermisPreview(null); }}
                      disabled={uploading}
                      className="text-gray-500 hover:text-white px-3 py-2 rounded-lg text-sm transition hover:bg-white/5"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setPermisFile(null); setPermisPreview(null); }}
                  disabled={uploading}
                  className="text-gray-600 hover:text-red-500 transition-colors shrink-0 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Programme de fidelite */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            Programme de fidelite
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Gagnez des points a chaque location et beneficiez de reductions exclusives.
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
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy size={24} className="text-yellow-500" />
                    <div>
                      <p className="text-white font-medium text-lg capitalize">{fidelite.niveau_actuel}</p>
                      <p className="text-gray-400 text-sm">{fidelite.reduction_actuelle}% de reduction sur vos locations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-2xl">{fidelite.points_fidelite}</p>
                    <p className="text-gray-500 text-xs">points</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-2xl">{fidelite.nombre_locations}</p>
                  <p className="text-gray-500 text-sm">Locations effectuees</p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <p className="text-white font-semibold text-2xl">{fidelite.points_fidelite}</p>
                  <p className="text-gray-500 text-sm">Points cumules</p>
                </div>
              </div>

              {/* Prochain niveau */}
              {fidelite.prochain_niveau && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Prochain niveau</p>
                    <span className="text-white text-sm font-medium capitalize">{fidelite.prochain_niveau.niveau}</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((fidelite.nombre_locations) / (fidelite.nombre_locations + fidelite.prochain_niveau.locations_restantes)) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Plus que {fidelite.prochain_niveau.locations_restantes} location(s) pour {fidelite.prochain_niveau.reduction}% de reduction
                  </p>
                </div>
              )}

              {/* Niveaux disponibles */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Niveaux de fidelite</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(fidelite.niveaux).map(([nom, config]) => (
                    <div
                      key={nom}
                      className={`text-center p-2 rounded-lg ${
                        nom === fidelite.niveau_actuel
                          ? 'bg-yellow-500/10 border border-yellow-500/20'
                          : 'bg-white/[0.02]'
                      }`}
                    >
                      <p className="text-white text-xs font-medium capitalize">{nom}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{config.reduction}% off</p>
                      <p className="text-gray-600 text-[10px]">{config.locations_min}+</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Impossible de charger les informations de fidelite.</p>
          )}
        </div>

        {/* Informations personnelles */}
        <form onSubmit={handleUpdate} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Mes informations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Nom complet</label>
              <input
                type="text"
                value={form.nom_complet}
                onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Telephone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                readOnly
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-white/50 text-sm cursor-not-allowed"
              />
              <p className="text-gray-600 text-xs mt-1">L'email ne peut pas etre modifie</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">CIN</label>
              <input
                type="text"
                value={form.cin}
                readOnly
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-white/50 text-sm cursor-not-allowed"
              />
              <p className="text-gray-600 text-xs mt-1">Le CIN ne peut pas etre modifie</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-400 text-xs mb-1.5 block uppercase tracking-wider">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none transition"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link to="/" className="text-gray-500 hover:text-white text-sm transition-colors">
              Retour a l'accueil
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
