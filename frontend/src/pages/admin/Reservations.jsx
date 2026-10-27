import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  History,
  Loader2,
  X,
  Printer,
  FileDown,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { contratExpire } from '../../lib/formatters';

const STATUT_LABELS = {
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const STATUT_STYLES = {
  confirmee: 'bg-blue-500/15 text-blue-400',
  en_cours: 'bg-yellow-500/15 text-yellow-400',
  terminee: 'bg-green-500/15 text-green-400',
  annulee: 'bg-red-500/15 text-red-400',
};

const PER_PAGE_OPTIONS = [10, 20, 50];

const MODES_PAIEMENT = [
  { value: 'especes', label: 'Especes (agence)' },
  { value: 'cmi', label: 'Carte bancaire (CMI)' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'wafacash', label: 'Wafacash' },
];

/** Format attendu par <input type="datetime-local"> (heure locale). */
function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formulaire vierge : prise en charge demain 10h, retour trois jours plus tard. */
function defaultCreateForm() {
  const debut = new Date();
  debut.setDate(debut.getDate() + 1);
  debut.setHours(10, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 3);

  return {
    clientMode: 'existing',
    client_id: '',
    nom_complet: '',
    telephone: '',
    email: '',
    cin: '',
    passeport: '',
    est_etranger: false,
    adresse: '',
    vehicule_id: '',
    agence_id: '',
    date_debut: toDateTimeLocal(debut),
    date_fin: toDateTimeLocal(fin),
    mode_paiement: 'especes',
    code_promo: '',
    notes: '',
    conducteur_additionnel_nom: '',
    conducteur_additionnel_telephone: '',
    conducteur_additionnel_permis: '',
    assurance_conducteur_additionnel: false,
  };
}

function formatDH(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800/50">
      <td colSpan={8} className="px-5 py-4">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-4 w-28 bg-neutral-800 rounded" />
          <div className="h-4 w-24 bg-neutral-800 rounded" />
          <div className="h-4 w-32 bg-neutral-800 rounded" />
          <div className="h-4 w-28 bg-neutral-800 rounded" />
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-5 w-16 bg-neutral-800 rounded-full" />
        </div>
      </td>
    </tr>
  );
}

function SortButton({ field, sort, onSort, children }) {
  const active = sort.field === field;
  const dir = active ? sort.dir : null;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 font-medium transition ${active ? 'text-red-400' : 'text-muted hover:text-neutral-300'}`}
    >
      {children}
      {active ? (
        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

export default function AdminReservations() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterVehicule, setFilterVehicule] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [cautionModal, setCautionModal] = useState(null);
  const [cautionStatut, setCautionStatut] = useState('');
  const [cautionMotif, setCautionMotif] = useState('');
  const [cautionRetenu, setCautionRetenu] = useState('');
  const [cautionHist, setCautionHist] = useState(null);
  const [cautionHistLoading, setCautionHistLoading] = useState(false);
  const [contratLoading, setContratLoading] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createDataLoading, setCreateDataLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehiculesAdmin, setVehiculesAdmin] = useState([]);
  const [agences, setAgences] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [parametres, setParametres] = useState({
    taux_acompte: 30,
    supplement_conducteur_jour: 50,
  });

  const inputClass = 'w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder:text-placeholder focus:border-red-600 focus:outline-none';

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reservations');
      setReservations(data);
      // Nouvelles reservations vues : on remet le badge sidebar a zero.
      api.post('/notifications-admin/reservations-vues')
        .then(() => window.dispatchEvent(new Event('admin-notifications-refresh')))
        .catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    setCreateForm(defaultCreateForm());
    setClientSearch('');
    setCreateError('');
    setShowCreate(true);
    setCreateDataLoading(true);

    try {
      const [clientsRes, vehiculesRes, agencesRes, parametresRes] = await Promise.all([
        api.get('/clients'),
        api.get('/vehicules-admin'),
        api.get('/agences-admin'),
        api.get('/parametres'),
      ]);

      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
      setVehiculesAdmin(vehiculesRes.data?.data || vehiculesRes.data?.vehicules || []);
      setAgences(Array.isArray(agencesRes.data) ? agencesRes.data : []);

      const valeurs = {};
      (Array.isArray(parametresRes.data) ? parametresRes.data : []).forEach((p) => {
        valeurs[p.cle] = p.valeur;
      });
      setParametres({
        taux_acompte: Number(valeurs.taux_acompte ?? 30),
        supplement_conducteur_jour: Number(valeurs.supplement_conducteur_jour ?? 50),
      });
    } catch (err) {
      console.error(err);
      setCreateError('Impossible de charger les clients, vehicules ou agences.');
    } finally {
      setCreateDataLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createSaving) return;
    setCreateError('');

    if (!createForm.vehicule_id) {
      setCreateError('Selectionnez un vehicule.');
      return;
    }

    if (createForm.clientMode === 'existing' && !createForm.client_id) {
      setCreateError('Selectionnez un client existant.');
      return;
    }

    if (createForm.clientMode === 'new' && (!createForm.nom_complet.trim() || !createForm.telephone.trim())) {
      setCreateError('Le nom et le telephone du nouveau client sont obligatoires.');
      return;
    }

    if (createJours <= 0) {
      setCreateError('La date de retour doit etre posterieure a la date de prise en charge.');
      return;
    }

    const payload = {
      vehicule_id: Number(createForm.vehicule_id),
      agence_id: createForm.agence_id ? Number(createForm.agence_id) : null,
      date_debut: createForm.date_debut.replace('T', ' '),
      date_fin: createForm.date_fin.replace('T', ' '),
      mode_paiement: createForm.mode_paiement,
      notes: createForm.notes.trim() || null,
      code_promo: createForm.code_promo.trim() || null,
      conducteur_additionnel_nom: createForm.conducteur_additionnel_nom.trim() || null,
      conducteur_additionnel_telephone: createForm.conducteur_additionnel_telephone.trim() || null,
      conducteur_additionnel_permis: createForm.conducteur_additionnel_permis.trim() || null,
      assurance_conducteur_additionnel: createForm.assurance_conducteur_additionnel,
    };

    if (createForm.clientMode === 'existing') {
      payload.client_id = Number(createForm.client_id);
    } else {
      payload.client = {
        nom_complet: createForm.nom_complet.trim(),
        telephone: createForm.telephone.trim(),
        email: createForm.email.trim() || null,
        cin: createForm.est_etranger ? null : (createForm.cin.trim() || null),
        passeport: createForm.est_etranger ? (createForm.passeport.trim() || null) : null,
        est_etranger: createForm.est_etranger,
        adresse: createForm.adresse.trim() || null,
      };
    }

    setCreateSaving(true);
    try {
      const { data } = await api.post('/reservations-admin', payload);
      setShowCreate(false);
      toast.success(`Reservation ${data.numero} creee.`);
      fetchReservations();
    } catch (err) {
      const erreurs = err.response?.data?.errors;
      const premiere = erreurs ? Object.values(erreurs).flat().find(Boolean) : null;
      setCreateError(
        premiere
        || err.response?.data?.message
        || 'Erreur lors de la creation de la reservation.'
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const handleAnnuler = async (id) => {
    const ok = await confirm({
      title: 'Annuler la réservation',
      message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
      confirmLabel: 'Annuler la réservation',
    });
    if (!ok) return;
    try {
      await api.put(`/reservations/${id}/annuler`);
      toast.success('Réservation annulée.');
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    }
  };

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  /**
   * Ouvre le contrat en apercu (impression navigateur) ou le telecharge.
   * Le PDF est genere cote serveur avec le numero de contrat fige.
   */
  const handleContrat = async (reservation, mode = 'preview') => {
    const key = `${reservation.id}:${mode}`;
    // Fenetre ouverte immediatement pour eviter le blocage des popups
    // pendant l'appel API asynchrone.
    const previewWindow = mode === 'preview' ? window.open('', '_blank') : null;

    setContratLoading(key);
    try {
      const suffix = mode === 'preview' ? '/preview' : '';
      const { data } = await api.get(`/reservations-admin/${reservation.id}/contrat${suffix}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));

      if (mode === 'preview') {
        if (previewWindow) {
          previewWindow.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener');
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contrat-${reservation.numero_contrat || reservation.numero}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      // Laisse le temps au navigateur d'ouvrir le PDF avant revocation.
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      previewWindow?.close();
      toast.error(err.response?.data?.message || 'Impossible de generer le contrat.');
    } finally {
      setContratLoading(null);
    }
  };

  const handleUpdateCaution = async () => {
    if (!cautionModal || !cautionStatut) return;
    if (cautionStatut === 'retenue_partiellement' && (!cautionMotif || !cautionRetenu || Number(cautionRetenu) <= 0)) {
      toast.error('Le motif et un montant retenu positif sont obligatoires.');
      return;
    }
    try {
      await api.put(`/reservations/${cautionModal.id}/caution`, {
        caution_statut: cautionStatut,
        montant_retenu: cautionStatut === 'retenue_partiellement' ? Number(cautionRetenu) : 0,
        motif_rejet_caution: cautionStatut === 'retenue_partiellement' ? cautionMotif : null,
      });
      setCautionModal(null);
      setCautionStatut('');
      setCautionMotif('');
      setCautionRetenu('');
      fetchReservations();
      toast.success('Caution mise a jour.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise a jour de la caution.');
    }
  };

  const showCautionHistorique = async (reservation) => {
    setCautionHistLoading(true);
    setCautionHist({ reservation, entries: [] });
    try {
      const { data } = await api.get(`/reservations/${reservation.id}/caution-historique`);
      setCautionHist({ reservation, entries: data });
    } catch {
      toast.error('Impossible de charger l\'historique des cautions');
      setCautionHist(null);
    } finally {
      setCautionHistLoading(false);
    }
  };

  const clientsFiltres = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (!q) return true;
        return c.nom_complet?.toLowerCase().includes(q)
          || c.telephone?.includes(q)
          || c.email?.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.nom_complet || '').localeCompare(b.nom_complet || ''));
  }, [clients, clientSearch]);

  const selectedVehicule = useMemo(
    () => vehiculesAdmin.find((v) => String(v.id) === String(createForm.vehicule_id)) || null,
    [vehiculesAdmin, createForm.vehicule_id],
  );

  const createJours = useMemo(() => {
    if (!createForm.date_debut || !createForm.date_fin) return 0;
    const debut = new Date(createForm.date_debut);
    const fin = new Date(createForm.date_fin);
    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return 0;
    return Math.max(0, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
  }, [createForm.date_debut, createForm.date_fin]);

  const createPreview = useMemo(() => {
    if (!selectedVehicule || createJours <= 0) return null;

    const sousTotal = Number(selectedVehicule.prix_jour) * createJours;
    const supplement = createForm.conducteur_additionnel_nom.trim()
      ? parametres.supplement_conducteur_jour * createJours
      : 0;
    const total = sousTotal + supplement;

    return {
      sousTotal,
      supplement,
      total,
      acompte: total * (parametres.taux_acompte / 100),
      caution: Number(selectedVehicule.montant_caution || 0),
    };
  }, [
    selectedVehicule,
    createJours,
    createForm.conducteur_additionnel_nom,
    parametres,
  ]);

  const uniqueVehicules = useMemo(() => {
    const map = new Map();
    reservations.forEach(r => {
      if (r.vehicule) {
        map.set(r.vehicule.id, `${r.vehicule.marque} ${r.vehicule.modele}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [reservations]);

  const filtered = useMemo(() => {
    let result = [...reservations];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.numero?.toLowerCase().includes(q) ||
        r.client?.nom_complet?.toLowerCase().includes(q)
      );
    }

    if (filterStatut) {
      result = result.filter(r => r.statut === filterStatut);
    }

    if (filterVehicule) {
      result = result.filter(r => String(r.vehicule_id) === filterVehicule);
    }

    if (filterDateStart) {
      result = result.filter(r => new Date(r.date_debut) >= new Date(filterDateStart));
    }

    if (filterDateEnd) {
      result = result.filter(r => new Date(r.date_fin) <= new Date(filterDateEnd));
    }

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sort.field) {
        case 'numero': aVal = a.numero; bVal = b.numero; break;
        case 'client': aVal = a.client?.nom_complet || ''; bVal = b.client?.nom_complet || ''; break;
        case 'vehicule': aVal = `${a.vehicule?.marque} ${a.vehicule?.modele}`; bVal = `${b.vehicule?.marque} ${b.vehicule?.modele}`; break;
        case 'date_debut': aVal = new Date(a.date_debut); bVal = new Date(b.date_debut); break;
        case 'prix_total': aVal = Number(a.prix_total); bVal = Number(b.prix_total); break;
        case 'statut': aVal = a.statut; bVal = b.statut; break;
        default: aVal = new Date(a.created_at); bVal = new Date(b.created_at);
      }
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [reservations, search, filterStatut, filterVehicule, filterDateStart, filterDateEnd, sort]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatut, filterVehicule, filterDateStart, filterDateEnd, perPage]);

  const totalMontant = filtered.reduce((a, r) => a + Number(r.prix_total || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Réservations</h1>
          <p className="text-muted text-sm">
            {filtered.length} réservation(s) — {totalMontant.toLocaleString('fr-FR')} DH
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <Plus size={16} />
          Nouvelle réservation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Rechercher par client ou n°..."
              type="text"
              placeholder="Rechercher par client ou n°..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-placeholder focus:outline-none focus:border-red-600 transition"
            />
          </div>

          <select aria-label="Filtrer par statut"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="confirmee">Confirmée</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>

          <select aria-label="Filtrer par véhicule"
            value={filterVehicule}
            onChange={(e) => setFilterVehicule(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition cursor-pointer"
          >
            <option value="">Tous les véhicules</option>
            {uniqueVehicules.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Date de début"
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
            />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Date de fin"
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5"><SortButton field="numero" sort={sort} onSort={handleSort}>N° Réservation</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="client" sort={sort} onSort={handleSort}>Client</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="vehicule" sort={sort} onSort={handleSort}>Véhicule</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="date_debut" sort={sort} onSort={handleSort}>Dates</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="prix_total" sort={sort} onSort={handleSort}>Montant</SortButton></th>
                <th className="text-left py-3 px-5"><SortButton field="statut" sort={sort} onSort={handleSort}>Statut</SortButton></th>
                <th className="text-left py-3 px-5 font-medium text-muted">Caution</th>
                <th className="text-right py-3 px-5 font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted">
                    <Inbox size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucune réservation trouvée</p>
                  </td>
                </tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5 text-white font-mono text-xs">
                    <span className="block">{r.numero}</span>
                    <span className="block text-[10px] font-sans text-muted mt-0.5">
                      Contrat : {r.numero_contrat || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-600/15 flex items-center justify-center text-red-400 text-[10px] font-bold flex-shrink-0">
                        {r.client?.nom_complet?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="text-neutral-300">{r.client?.nom_complet}</span>
                        {r.conducteur_additionnel_nom && (
                          <p className="text-[10px] text-purple-400 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            + {r.conducteur_additionnel_nom}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-neutral-300">
                    {r.vehicule?.marque} {r.vehicule?.modele}
                  </td>
                  <td className="py-3 px-5 text-muted text-xs whitespace-nowrap">
                    {new Date(r.date_debut).toLocaleDateString('fr-FR')} — {new Date(r.date_fin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-5 text-white font-medium">
                    {Number(r.prix_total).toLocaleString('fr-FR')} DH
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[r.statut] || 'bg-neutral-500/15 text-neutral-400'}`}>
                      {STATUT_LABELS[r.statut] || r.statut}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    {r.montant_caution > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCautionModal(r);
                            setCautionStatut(r.caution_statut || 'bloquee');
                            setCautionMotif(r.motif_rejet_caution || '');
                            setCautionRetenu(r.montant_retenu_caution || '');
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition hover:opacity-80 ${
                            r.caution_statut === 'restituee'
                              ? 'bg-green-500/15 text-green-400'
                              : r.caution_statut === 'retenue_partiellement'
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'bg-blue-500/15 text-blue-400'
                          }`}
                          title="Gerer la caution"
                        >
                          <Shield size={10} className="inline mr-1" />
                          {r.caution_statut === 'restituee' ? 'Restituee' : r.caution_statut === 'retenue_partiellement' ? 'retenue' : 'Bloquee'}
                        </button>
                        <button
                          onClick={() => showCautionHistorique(r)}
                          className="p-1 rounded text-muted hover:text-white hover:bg-neutral-800 transition"
                          title="Historique des caution"
                        >
                          <History size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleContrat(r, 'preview')}
                        disabled={contratLoading === `${r.id}:preview`}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-blue-500/10 hover:text-blue-400 transition disabled:opacity-40"
                        title="Imprimer le contrat (cachet et signature)"
                      >
                        {contratLoading === `${r.id}:preview` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Printer size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleContrat(r, 'download')}
                        disabled={contratLoading === `${r.id}:download`}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition disabled:opacity-40"
                        title="Telecharger le contrat"
                      >
                        {contratLoading === `${r.id}:download` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FileDown size={16} />
                        )}
                      </button>
                      {r.statut !== 'annulee' && r.statut !== 'terminee' && (
                        <button
                          onClick={() => handleAnnuler(r.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition"
                          title="Annuler"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Afficher</span>
              <select aria-label="Éléments par page"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-red-600 cursor-pointer"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>sur {filtered.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                      page === pageNum
                        ? 'bg-red-600 text-white'
                        : 'text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {cautionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCautionModal(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setCautionModal(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">Gerer la caution</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Reservation {cautionModal.numero} | {cautionModal.montant_caution} DH
            </p>
            <div className="space-y-3">
              <label className="text-neutral-400 text-sm block" htmlFor="ctl-490">Statut de la caution</label>
              <select id="ctl-490"
                value={cautionStatut}
                onChange={(e) => setCautionStatut(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
              >
                <option value="bloquee">Bloquee (en attente)</option>
                <option value="restituee">Restituee (remboursee)</option>
                <option value="retenue_partiellement">Retenue partiellement</option>
              </select>
              {cautionStatut === 'retenue_partiellement' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-503">Montant retenu (DH)</label>
                    <input id="ctl-503"
                      type="number"
                      min="0"
                      max={cautionModal.montant_caution}
                      step="0.01"
                      value={cautionRetenu}
                      onChange={(e) => setCautionRetenu(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600"
                      placeholder="Ex: 500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-516">Motif de la retenue</label>
                    <textarea id="ctl-516"
                      value={cautionMotif}
                      onChange={(e) => setCautionMotif(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 resize-none"
                      placeholder="Description des dommages ou motifs..."
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCautionModal(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition">Annuler</button>
                <button onClick={handleUpdateCaution} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">Confirmer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cautionHist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCautionHist(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <button onClick={() => setCautionHist(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-white font-semibold mb-2">Historique des cautions</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Reservation {cautionHist.reservation.numero} | {cautionHist.reservation.montant_caution} DH
            </p>
            {cautionHistLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-neutral-400" />
              </div>
            ) : cautionHist.entries.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">Aucune modification de caution enregistree.</p>
            ) : (
              <div className="space-y-3">
                {cautionHist.entries.map((h) => (
                  <div key={h.id} className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted">{h.ancien_statut || '-'}</span>
                        <span className="text-muted">→</span>
                        <span className="text-white font-medium">{h.nouveau_statut}</span>
                      </div>
                      <span className="text-muted text-xs">
                        {new Date(h.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {Number(h.montant_retenu) > 0 && (
                      <p className="text-yellow-400 text-xs mb-1">Retenu : {Number(h.montant_retenu).toLocaleString('fr-FR')} DH</p>
                    )}
                    {h.motif && <p className="text-neutral-400 text-xs mb-1">Motif : {h.motif}</p>}
                    <p className="text-muted text-xs">Par : {h.agent?.name || 'Système'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!createSaving) setShowCreate(false); }}
          />
          <div className="relative my-8 w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-4">
              <div>
                <h3 className="font-semibold text-white">Nouvelle réservation</h3>
                <p className="mt-0.5 text-xs text-muted">Réservation prise par téléphone ou au comptoir</p>
              </div>
              <button
                type="button"
                onClick={() => { if (!createSaving) setShowCreate(false); }}
                className="text-neutral-400 transition hover:text-white"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
              {createError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {createError}
                </div>
              )}

              {createDataLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                  <Loader2 size={18} className="animate-spin" />
                  Chargement des données...
                </div>
              ) : (
                <>
                  <section className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-semibold text-white">Client</h4>
                      <div className="inline-flex w-fit rounded-lg border border-neutral-700 p-0.5">
                        <button
                          type="button"
                          onClick={() => setCreateForm((prev) => ({ ...prev, clientMode: 'existing' }))}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            createForm.clientMode === 'existing'
                              ? 'bg-red-600 text-white'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Client existant
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm((prev) => ({ ...prev, clientMode: 'new' }))}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            createForm.clientMode === 'new'
                              ? 'bg-red-600 text-white'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Nouveau client
                        </button>
                      </div>
                    </div>

                    {createForm.clientMode === 'existing' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="relative sm:col-span-2">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                          <input
                            type="text"
                            aria-label="Rechercher un client"
                            placeholder="Rechercher par nom, téléphone ou email..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                        <select
                          aria-label="Client existant"
                          value={createForm.client_id}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, client_id: e.target.value }))}
                          className={`${inputClass} cursor-pointer sm:col-span-2`}
                        >
                          <option value="">Sélectionner un client...</option>
                          {clientsFiltres.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom_complet} — {c.telephone}{c.email ? ` — ${c.email}` : ''}
                            </option>
                          ))}
                        </select>
                        {clientsFiltres.length === 0 && (
                          <p className="text-xs text-yellow-400 sm:col-span-2">
                            Aucun client ne correspond. Passez en « Nouveau client ».
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          aria-label="Nom complet"
                          placeholder="Nom complet *"
                          value={createForm.nom_complet}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_complet: e.target.value }))}
                          className={inputClass}
                        />
                        <input
                          type="tel"
                          aria-label="Téléphone"
                          placeholder="Téléphone * (06...)"
                          value={createForm.telephone}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, telephone: e.target.value }))}
                          className={inputClass}
                        />
                        <input
                          type="email"
                          aria-label="Email"
                          placeholder="Email (optionnel)"
                          value={createForm.email}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                          className={inputClass}
                        />
                        <select
                          aria-label="Nationalité"
                          value={createForm.est_etranger ? 'etranger' : 'marocain'}
                          onChange={(e) => setCreateForm((prev) => ({
                            ...prev,
                            est_etranger: e.target.value === 'etranger',
                          }))}
                          className={`${inputClass} cursor-pointer`}
                        >
                          <option value="marocain">Marocaine — carte nationale</option>
                          <option value="etranger">Étrangère — passeport</option>
                        </select>
                        {createForm.est_etranger ? (
                          <input
                            type="text"
                            aria-label="Numéro de passeport"
                            placeholder="Numéro de passeport"
                            value={createForm.passeport}
                            onChange={(e) => setCreateForm((prev) => ({ ...prev, passeport: e.target.value.toUpperCase() }))}
                            className={inputClass}
                          />
                        ) : (
                          <input
                            type="text"
                            aria-label="CIN"
                            placeholder="CIN"
                            value={createForm.cin}
                            onChange={(e) => setCreateForm((prev) => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                            className={inputClass}
                          />
                        )}
                        <input
                          type="text"
                          aria-label="Adresse"
                          placeholder="Adresse (optionnel)"
                          value={createForm.adresse}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, adresse: e.target.value }))}
                          className={`${inputClass} sm:col-span-2`}
                        />
                      </div>
                    )}
                  </section>

                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="create-vehicule" className="mb-1 block text-xs font-medium text-muted">
                        Véhicule *
                      </label>
                      <select
                        id="create-vehicule"
                        value={createForm.vehicule_id}
                        onChange={(e) => {
                          const value = e.target.value;
                          const vehicule = vehiculesAdmin.find((v) => String(v.id) === String(value));
                          setCreateForm((prev) => ({
                            ...prev,
                            vehicule_id: value,
                            agence_id: prev.agence_id || (vehicule?.agence_id ? String(vehicule.agence_id) : ''),
                          }));
                        }}
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="">Sélectionner un véhicule...</option>
                        {vehiculesAdmin.map((v) => {
                          const indisponible = v.statut !== 'disponible'
                            || contratExpire(v.date_expiration_assurance)
                            || contratExpire(v.date_expiration_carte_grise);
                          return (
                            <option key={v.id} value={v.id} disabled={indisponible}>
                              {v.marque} {v.modele} — {formatDH(v.prix_jour)}/jour{indisponible ? ' (indisponible)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="create-agence" className="mb-1 block text-xs font-medium text-muted">
                        Agence
                      </label>
                      <select
                        id="create-agence"
                        value={createForm.agence_id}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, agence_id: e.target.value }))}
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="">Agence du véhicule</option>
                        {agences.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nom}{a.active === false ? ' (inactive)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="create-date-debut" className="mb-1 block text-xs font-medium text-muted">
                        Prise en charge *
                      </label>
                      <input
                        id="create-date-debut"
                        type="datetime-local"
                        value={createForm.date_debut}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, date_debut: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="create-date-fin" className="mb-1 block text-xs font-medium text-muted">
                        Retour *
                      </label>
                      <input
                        id="create-date-fin"
                        type="datetime-local"
                        value={createForm.date_fin}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, date_fin: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="create-mode" className="mb-1 block text-xs font-medium text-muted">
                        Mode de paiement de l'acompte *
                      </label>
                      <select
                        id="create-mode"
                        value={createForm.mode_paiement}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, mode_paiement: e.target.value }))}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {MODES_PAIEMENT.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="create-promo" className="mb-1 block text-xs font-medium text-muted">
                        Code promo
                      </label>
                      <input
                        id="create-promo"
                        type="text"
                        placeholder="Optionnel"
                        value={createForm.code_promo}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, code_promo: e.target.value.toUpperCase() }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="create-notes" className="mb-1 block text-xs font-medium text-muted">
                        Notes internes
                      </label>
                      <textarea
                        id="create-notes"
                        rows={2}
                        placeholder="Informations utiles (vol, heure d'arrivée, demandes...)"
                        value={createForm.notes}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-neutral-800 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-white">Conducteur additionnel</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        aria-label="Nom du conducteur additionnel"
                        placeholder="Nom complet"
                        value={createForm.conducteur_additionnel_nom}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, conducteur_additionnel_nom: e.target.value }))}
                        className={inputClass}
                      />
                      <input
                        type="tel"
                        aria-label="Téléphone du conducteur additionnel"
                        placeholder="Téléphone"
                        value={createForm.conducteur_additionnel_telephone}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, conducteur_additionnel_telephone: e.target.value }))}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        aria-label="Permis du conducteur additionnel"
                        placeholder="Numéro de permis *"
                        value={createForm.conducteur_additionnel_permis}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, conducteur_additionnel_permis: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                      <input
                        type="checkbox"
                        checked={createForm.assurance_conducteur_additionnel}
                        onChange={(e) => setCreateForm((prev) => ({
                          ...prev,
                          assurance_conducteur_additionnel: e.target.checked,
                        }))}
                        className="accent-red-600"
                      />
                      Assurance conducteur additionnel
                    </label>
                  </section>

                  {createPreview ? (
                    <section className="space-y-2 rounded-xl border border-neutral-700/60 bg-neutral-800/40 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">
                          Véhicule ({createJours} jour{createJours > 1 ? 's' : ''})
                        </span>
                        <span className="text-white">{formatDH(createPreview.sousTotal)}</span>
                      </div>
                      {createPreview.supplement > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Conducteur additionnel</span>
                          <span className="text-white">{formatDH(createPreview.supplement)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-neutral-700/60 pt-2">
                        <span className="font-medium text-white">Total</span>
                        <span className="font-semibold text-white">{formatDH(createPreview.total)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Acompte ({parametres.taux_acompte}%)</span>
                        <span className="font-medium text-red-400">{formatDH(createPreview.acompte)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Caution (bloquée)</span>
                        <span className="text-neutral-300">{formatDH(createPreview.caution)}</span>
                      </div>
                      <p className="pt-1 text-[11px] text-muted">
                        Le code promo éventuel est appliqué par le serveur à la création.
                      </p>
                    </section>
                  ) : (
                    <p className="text-xs text-muted">
                      Sélectionnez un véhicule et des dates pour voir le total et l'acompte.
                    </p>
                  )}
                </>
              )}

              <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => { if (!createSaving) setShowCreate(false); }}
                  className="flex-1 rounded-xl border border-neutral-700 py-2.5 text-sm text-neutral-400 transition hover:bg-neutral-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createSaving || createDataLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createSaving && <Loader2 size={16} className="animate-spin" />}
                  Créer la réservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
