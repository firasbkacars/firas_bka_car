import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard, Search, Download, RotateCcw, AlertTriangle, Loader2, Receipt,
  ChevronDown, FilterX,
} from 'lucide-react';
import api from '../../services/api';
import StatutPaiement, { montantSigne } from '../../components/StatutPaiement';
import Modal from '../../components/Modal';
import { formatMAD, formatDate, formatDateTime } from '../../lib/formatters';
import { useDebouncedValue } from '../../hooks/useDebounce';

const TYPE_LABELS = {
  acompte: 'Acompte',
  solde: 'Solde',
  complement: 'Complément',
  caution: 'Caution',
  remboursement: 'Remboursement',
};

const METHODE_LABELS = {
  cmi: 'Carte (CMI)',
  especes: 'Espèces',
};

const STATUTS = [
  { valeur: '', libelle: 'Tous les statuts' },
  { valeur: 'paye', libelle: 'Payé' },
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'echoue', libelle: 'Échoué' },
  { valeur: 'annule', libelle: 'Annulé' },
  { valeur: 'expire', libelle: 'Expiré' },
  { valeur: 'suspect', libelle: 'À vérifier' },
];

const METHODES = [
  { valeur: '', libelle: 'Tous les canaux' },
  { valeur: 'cmi', libelle: 'Carte (CMI)' },
  { valeur: 'especes', libelle: 'Espèces' },
];

const COLUMNS = [
  { cle: 'reservation', libelle: 'Réservation' },
  { cle: 'type', libelle: 'Type' },
  { cle: 'montant', libelle: 'Montant' },
  { cle: 'methode', libelle: 'Canal' },
  { cle: 'transaction', libelle: 'Transaction / Carte' },
  { cle: 'statut', libelle: 'Statut' },
  { cle: 'date', libelle: 'Date' },
];

/** Colspan du corps de tableau : case + # + colonnes + actions. */
const NB_COLONNES = COLUMNS.length + 3;

/** Date de reference d'une ecriture pour le filtre et le tri. */
function dateEcriture(p) {
  return p.date_paiement || p.created_at || null;
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreMethode, setFiltreMethode] = useState('');
  const [filtreDu, setFiltreDu] = useState('');
  const [filtreAu, setFiltreAu] = useState('');
  const [tri, setTri] = useState({ cle: 'date', sens: 'desc' });
  const [expandedId, setExpandedId] = useState(null);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundMontant, setRefundMontant] = useState('');
  const [refundMotif, setRefundMotif] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState(null);

  const searchDebounced = useDebouncedValue(search.trim().toLowerCase(), 300);

  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async () => {
    try {
      setLoadError(null);
      const { data } = await api.get('/paiements');
      setPaiements(Array.isArray(data) ? data : data.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Impossible de charger les paiements.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtreActif =
    Boolean(searchDebounced || filtreStatut || filtreMethode || filtreDu || filtreAu);

  const resetFiltres = () => {
    setSearch('');
    setFiltreStatut('');
    setFiltreMethode('');
    setFiltreDu('');
    setFiltreAu('');
  };

  const toggleTri = useCallback((cle) => {
    setTri((t) => (t.cle === cle
      ? { cle, sens: t.sens === 'asc' ? 'desc' : 'asc' }
      : { cle, sens: cle === 'date' || cle === 'montant' ? 'desc' : 'asc' }));
  }, []);

  const filtered = useMemo(() => {
    const debut = filtreDu ? new Date(`${filtreDu}T00:00:00`) : null;
    const fin = filtreAu ? new Date(`${filtreAu}T23:59:59`) : null;

    return paiements.filter((p) => {
      if (filtreStatut && p.statut !== filtreStatut) return false;
      if (filtreMethode && p.methode !== filtreMethode) return false;

      if (debut || fin) {
        const d = dateEcriture(p);
        if (!d) return false;
        const t = new Date(d);
        if (debut && t < debut) return false;
        if (fin && t > fin) return false;
      }

      if (!searchDebounced) return true;

      const haystack = [
        p.transaction_id, p.carte_masquee, p.methode, p.statut, p.statut_affichage,
        p.type, TYPE_LABELS[p.type], p.reservation?.numero,
        p.reservation?.client?.nom_complet, p.reservation?.client?.telephone,
        p.montant, montantSigne(p),
      ]
        .filter((v) => v != null)
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchDebounced);
    });
  }, [paiements, searchDebounced, filtreStatut, filtreMethode, filtreDu, filtreAu]);

  const sorted = useMemo(() => {
    const dir = tri.sens === 'asc' ? 1 : -1;
    const val = (p) => {
      switch (tri.cle) {
        case 'montant': return montantSigne(p);
        case 'date': return dateEcriture(p) || '';
        case 'statut': return p.statut_affichage || p.statut || '';
        case 'reservation': return p.reservation?.numero || '';
        case 'type': return TYPE_LABELS[p.type] || p.type || '';
        case 'methode': return p.methode || '';
        case 'transaction': return p.transaction_id || '';
        default: return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * dir;
    });
  }, [filtered, tri]);

  // Solde NET : un remboursement compense un encaissement, il ne s'y ajoute pas.
  // Calcule sur la SELECTION courante pour que les indicateurs suivent les filtres.
  const kpis = useMemo(() => {
    const encaisse = filtered
      .filter((p) => p.statut === 'paye')
      .reduce((a, p) => a + montantSigne(p), 0);
    const rembourse = filtered
      .filter((p) => p.type === 'remboursement' && p.statut === 'paye')
      .reduce((a, p) => a + Math.abs(Number(p.montant)), 0);
    const enAttente = filtered
      .filter((p) => p.statut === 'en_attente')
      .reduce((a, p) => a + Number(p.montant), 0);
    const aVerifier = filtered.filter((p) => p.statut === 'suspect').length;
    return { net: encaisse, rembourse, enAttente, aVerifier };
  }, [filtered]);

  const exportCSV = () => {
    // Export cote client de ce qui est affiche : le CSV reflete exactement la
    // selection courante, sans requete supplementaire ni logique serveur.
    const lignes = [
      ['ID', 'Reservation', 'Client', 'Type', 'Montant', 'Canal', 'Transaction',
        'Carte', 'Statut', 'Statut affiche', 'Rembourse sur', 'Date paiement'],
      ...sorted.map((p) => [
        p.id,
        p.reservation?.numero || '',
        p.reservation?.client?.nom_complet || '',
        TYPE_LABELS[p.type] || p.type || '',
        montantSigne(p).toFixed(2),
        METHODE_LABELS[p.methode] || p.methode || '',
        p.transaction_id || '',
        p.carte_masquee || '',
        p.statut || '',
        p.statut_affichage || p.statut || '',
        Number(p.rembourse_sur || 0).toFixed(2),
        p.date_paiement ? new Date(p.date_paiement).toISOString() : '',
      ]),
    ];

    // BOM UTF-8 : sans lui, Excel ouvre le CSV avec des caracteres cassees.
    const csv = '\ufeff' + `${lignes.map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paiements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast(`Export de ${sorted.length} écriture(s).`);
  };

  const openRefund = (p) => {
    // Le plafond est le reste remboursable, pas l'encaissement brut :
    // apres un remboursement partiel, propose le reliquat et non le total.
    const dejaRembourse = Number(p.rembourse_sur) || 0;
    const reste = Math.max(0, Number(p.montant) - dejaRembourse);
    setRefundTarget(p);
    setRefundMontant(String(reste > 0 ? reste : Number(p.montant)));
    setRefundMotif('');
  };

  const submitRefund = async (e) => {
    e.preventDefault();
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await api.post(`/paiements/${refundTarget.id}/rembourser`, {
        montant: parseFloat(refundMontant),
        motif: refundMotif,
      });
      showToast(`Remboursement de ${formatMAD(refundMontant)} enregistré.`);
      setRefundTarget(null);
      fetchPaiements();
      // Paiement traite : badge sidebar a jour.
      window.dispatchEvent(new Event('admin-notifications-refresh'));
    } catch (err) {
      showToast(err.response?.data?.message || 'Remboursement impossible.', 'error');
    } finally {
      setRefunding(false);
    }
  };

  const dejaRembourse = Number(refundTarget?.rembourse_sur) || 0;
  const resteRemboursable = refundTarget
    ? Math.max(0, Number(refundTarget.montant) - dejaRembourse)
    : 0;

  const nbColonnes = NB_COLONNES;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <div role="status" className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <CreditCard size={20} className="text-red-500" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Paiements</h1>
            <p className="text-muted text-sm">
              {sorted.length} écriture(s)
              {filtreActif && (
                <span className="text-muted"> sur {paiements.length}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportCSV}
            disabled={sorted.length === 0}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-neutral-800 disabled:opacity-50"
            title="Exporte la sélection courante (filtres et tri appliqués)"
          >
            <Download size={16} aria-hidden="true" />
            Exporter la sélection
          </button>
        </div>
      </div>

      {/* Filtres — agissent sur le tableau ET sur les indicateurs. */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <label htmlFor="paiements-search" className="sr-only">Rechercher</label>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="paiements-search"
              type="search"
              placeholder="N° réservation, client, transaction, carte, montant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
            />
          </div>

          <div>
            <label htmlFor="paiements-statut" className="sr-only">Statut</label>
            <select
              id="paiements-statut"
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
            >
              {STATUTS.map((s) => (
                <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="paiements-methode" className="sr-only">Canal</label>
            <select
              id="paiements-methode"
              value={filtreMethode}
              onChange={(e) => setFiltreMethode(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#dc2626] outline-none"
            >
              {METHODES.map((m) => (
                <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label htmlFor="paiements-du" className="block text-[11px] text-muted mb-1">Du</label>
              <input
                id="paiements-du"
                type="date"
                value={filtreDu}
                onChange={(e) => setFiltreDu(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:border-[#dc2626] outline-none"
              />
            </div>
            <div>
              <label htmlFor="paiements-au" className="block text-[11px] text-muted mb-1">Au</label>
              <input
                id="paiements-au"
                type="date"
                value={filtreAu}
                onChange={(e) => setFiltreAu(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:border-[#dc2626] outline-none"
              />
            </div>
          </div>

          {filtreActif && (
            <button
              type="button"
              onClick={resetFiltres}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white px-3 py-2.5 rounded-xl text-sm transition hover:bg-white/5"
            >
              <FilterX size={15} aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">Solde net</p>
          <p className="text-2xl font-bold text-green-400">{formatMAD(kpis.net)}</p>
          <p className="text-muted text-xs mt-1">Encaissements - remboursements</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">Remboursé</p>
          <p className="text-2xl font-bold text-blue-400">{formatMAD(kpis.rembourse)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{formatMAD(kpis.enAttente)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-400 text-sm mb-1">À vérifier</p>
          <p className={`text-2xl font-bold ${kpis.aVerifier > 0 ? 'text-amber-400' : 'text-muted'}`}>{kpis.aVerifier}</p>
          {kpis.aVerifier > 0 && (
            <p className="text-amber-500/70 text-xs mt-1">Montant divergent de la passerelle</p>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <caption className="sr-only">
              Écritures de paiement, {sorted.length} résultat(s)
            </caption>
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th scope="col" className="text-left py-3 px-5 font-medium w-8">
                  <span className="sr-only">Détails</span>
                </th>
                <th scope="col" className="text-left py-3 px-5 font-medium">#</th>
                {COLUMNS.map((c) => (
                  <th key={c.cle} scope="col" className="text-left py-3 px-5 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleTri(c.cle)}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                      aria-label={`Trier par ${c.libelle}`}
                    >
                      {c.libelle}
                      <ChevronDown
                        size={12}
                        aria-hidden="true"
                        className={`transition-transform ${
                          tri.cle !== c.cle
                            ? 'opacity-0'
                            : tri.sens === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </th>
                ))}
                <th scope="col" className="text-right py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={nbColonnes} className="px-5 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse w-24" />
                    </td>
                  </tr>
                ))
              ) : loadError ? (
                <tr>
                  <td colSpan={nbColonnes} className="text-center py-12 px-5">
                    <AlertTriangle size={36} className="mx-auto mb-3 text-amber-400" aria-hidden="true" />
                    <p className="text-neutral-400 text-sm mb-3">{loadError}</p>
                    <button
                      type="button"
                      onClick={() => { setLoading(true); fetchPaiements(); }}
                      className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm border border-neutral-800"
                    >
                      Réessayer
                    </button>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={nbColonnes} className="text-center py-12 text-muted">
                    <CreditCard size={40} className="mx-auto mb-3 text-muted" aria-hidden="true" />
                    <p className="text-sm">
                      {filtreActif
                        ? 'Aucune écriture ne correspond à ces filtres.'
                        : 'Aucun paiement trouvé'}
                    </p>
                    {filtreActif && (
                      <button
                        type="button"
                        onClick={resetFiltres}
                        className="text-primary-light text-sm hover:underline mt-2"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </td>
                </tr>
              ) : sorted.map((p) => {
                const estRemboursement = p.type === 'remboursement';
                const signe = montantSigne(p);
                const peutRembourser =
                  p.statut === 'paye' && !estRemboursement && Number(p.montant) > 0;
                const ouvert = expandedId === p.id;

                return (
                  <PaiementRow
                    key={p.id}
                    p={p}
                    ouvert={ouvert}
                    onToggle={() => setExpandedId(ouvert ? null : p.id)}
                    estRemboursement={estRemboursement}
                    signe={signe}
                    peutRembourser={peutRembourser}
                    onRefund={openRefund}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        title={`Rembourser l'encaissement #${refundTarget?.id ?? ''}`}
      >
        <form onSubmit={submitRefund}>
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Receipt size={18} aria-hidden="true" />
            <p className="text-sm">Remboursement partiel ou intégral</p>
          </div>

          <div className="bg-neutral-800/50 rounded-xl p-3 mb-4 text-xs text-neutral-400 space-y-1">
            <div className="flex justify-between">
              <span>Réservation</span>
              <span className="text-white font-mono">{refundTarget?.reservation?.numero || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Client</span>
              <span className="text-white">{refundTarget?.reservation?.client?.nom_complet || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Montant encaissé</span>
              <span className="text-white">{formatMAD(refundTarget?.montant)}</span>
            </div>
            {dejaRembourse > 0 && (
              <div className="flex justify-between">
                <span>Déjà remboursé</span>
                <span className="text-blue-400">-{formatMAD(dejaRembourse)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-700/60 pt-1 mt-1">
              <span className="text-neutral-300">Reste remboursable</span>
              <span className="text-white font-semibold">{formatMAD(resteRemboursable)}</span>
            </div>
          </div>

          <label htmlFor="refund-montant" className="block text-xs text-neutral-400 mb-1">
            Montant à rembourser (DH)
          </label>
          <input
            id="refund-montant"
            data-autofocus
            type="number"
            step="0.01"
            min="0.01"
            max={resteRemboursable}
            required
            value={refundMontant}
            onChange={(e) => setRefundMontant(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm mb-1 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-muted mb-3">
            Maximum {formatMAD(resteRemboursable)}.
          </p>

          <label htmlFor="refund-motif" className="block text-xs text-neutral-400 mb-1">Motif (obligatoire)</label>
          <textarea
            id="refund-motif"
            required
            maxLength={500}
            rows={3}
            value={refundMotif}
            onChange={(e) => setRefundMotif(e.target.value)}
            placeholder="Annulation client, litige, erreur de facturation..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 outline-none resize-none"
          />

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              Cette opération crée une écriture de remboursement qui compense
              l'encaissement. Les revenus nets en seront diminués d'autant.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setRefundTarget(null)}
              className="px-4 py-2 rounded-lg text-sm text-neutral-400 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={refunding}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {refunding && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Confirmer le remboursement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PaiementRow({ p, ouvert, onToggle, estRemboursement, signe, peutRembourser, onRefund }) {
  return (
    <>
      <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition align-top">
        <td className="py-3 px-5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={ouvert}
            aria-label={ouvert ? 'Masquer le détail' : 'Afficher le détail'}
            className="p-1 rounded text-muted hover:text-white transition-colors"
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform ${ouvert ? 'rotate-180' : ''}`}
            />
          </button>
        </td>
        <td className="py-3 px-5 text-neutral-400 font-mono text-xs">#{p.id}</td>
        <td className="py-3 px-5 text-neutral-300">
          <div className="font-mono text-xs">{p.reservation?.numero || '—'}</div>
          {p.reservation?.client?.nom_complet && (
            <div className="text-muted text-xs">{p.reservation.client.nom_complet}</div>
          )}
        </td>
        <td className="py-3 px-5">
          <span className={`text-xs ${estRemboursement ? 'text-blue-400' : 'text-neutral-400'}`}>
            {TYPE_LABELS[p.type] || p.type || 'Acompte'}
          </span>
        </td>
        <td className={`py-3 px-5 font-medium ${signe < 0 ? 'text-blue-400' : 'text-white'}`}>
          {signe < 0 ? '-' : ''}{formatMAD(Math.abs(signe))}
        </td>
        <td className="py-3 px-5 text-neutral-400">
          {METHODE_LABELS[p.methode] || p.methode}
        </td>
        <td className="py-3 px-5">
          {p.transaction_id ? (
            <div>
              <div className="font-mono text-[10px] text-muted">{p.transaction_id}</div>
              {p.carte_masquee && (
                <div className="text-neutral-400 text-xs mt-0.5">{p.carte_masquee}</div>
              )}
            </div>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
        </td>
        <td className="py-3 px-5">
          <StatutPaiement statut={p.statut_affichage || p.statut} showIcon={false} />
          {p.code_erreur_gateway && (
            <div className="text-[10px] text-muted mt-0.5 font-mono">
              {p.code_erreur_gateway}
            </div>
          )}
        </td>
        <td className="py-3 px-5 text-muted text-xs">
          {p.date_paiement ? formatDate(p.date_paiement) : '—'}
        </td>
        <td className="py-3 px-5 text-right">
          {peutRembourser && (
            <button
              type="button"
              onClick={() => onRefund(p)}
              className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Rembourser
            </button>
          )}
        </td>
      </tr>

      {ouvert && (
        <tr className="border-b border-neutral-800/50 bg-neutral-950/40">
          <td colSpan={NB_COLONNES} className="px-5 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <Detail label="Créée le" value={formatDateTime(p.created_at)} />
              <Detail label="Payée le" value={p.date_paiement ? formatDateTime(p.date_paiement) : '—'} />
              <Detail
                label="Remboursée le"
                value={p.rembourse_le ? formatDateTime(p.rembourse_le) : '—'}
                accent={Boolean(p.rembourse_le)}
              />
              <Detail
                label="Reste remboursable"
                value={formatMAD(Math.max(0, Number(p.montant) - Number(p.rembourse_sur || 0)))}
              />
              <Detail label="Passerelle" value={p.gateway || '—'} />
              <Detail label="Devise" value={p.devise || 'MAD'} />
              <Detail label="Type" value={TYPE_LABELS[p.type] || p.type || '—'} />
              <Detail label="Référence externe" value={p.reference_externe || '—'} mono />
              {p.note_admin && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-muted mb-1">Note admin</p>
                  <p className="text-neutral-300 bg-neutral-800/50 rounded-lg p-2 leading-relaxed">
                    {p.note_admin}
                  </p>
                </div>
              )}
              {p.reservation && (
                <div className="col-span-2 md:col-span-4 border-t border-neutral-800 pt-3">
                  <p className="text-muted mb-1">Réservation</p>
                  <p className="text-neutral-300">
                    {p.reservation.numero}
                    {p.reservation.client?.nom_complet && ` — ${p.reservation.client.nom_complet}`}
                    {p.reservation.client?.telephone && ` — ${p.reservation.client.telephone}`}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value, accent, mono }) {
  return (
    <div>
      <p className="text-muted mb-1">{label}</p>
      <p className={`text-neutral-300 ${mono ? 'font-mono text-[11px] break-all' : ''} ${accent ? 'text-blue-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}
