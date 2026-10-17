import { useState, useEffect } from 'react';
import { Star, Inbox, Check, X, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';

const STATUT_STYLES = {
  publie: 'bg-emerald-500/10 text-emerald-400',
  en_attente: 'bg-yellow-500/10 text-yellow-400',
  rejete: 'bg-red-500/10 text-red-400',
};

const STATUT_LABELS = {
  publie: 'Publié',
  en_attente: 'En attente',
  rejete: 'Rejeté',
};

export default function Avis() {
  const [avis, setAvis] = useState([]);
  const [filtre, setFiltre] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => { fetchAvis(); }, [filtre]);

  const fetchAvis = async () => {
    try {
      setLoading(true);
      const params = filtre ? `?statut=${filtre}` : '';
      const { data } = await api.get(`/avis${params}`);
      setAvis(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const moderer = async (id, statut) => {
    try {
      setActionId(id);
      await api.put(`/avis/${id}/moderation`, { statut });
      setAvis((prev) => prev.map((a) => (a.id === id ? { ...a, statut } : a)));
      // Un avis modere en moins a traiter : badge sidebar a jour.
      window.dispatchEvent(new Event('admin-notifications-refresh'));
    } catch (err) { console.error(err); }
    finally { setActionId(null); }
  };

  const renderStars = (note) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < note ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <Star size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Avis clients</h1>
            <p className="text-muted text-sm">{avis.length} avis</p>
          </div>
        </div>
        <select aria-label="Trier les avis"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl px-3 py-2"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="publie">Publiés</option>
          <option value="rejete">Rejetés</option>
        </select>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-muted border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Client</th>
                <th className="text-left py-3 px-5 font-medium">Véhicule</th>
                <th className="text-left py-3 px-5 font-medium">Note</th>
                <th className="text-left py-3 px-5 font-medium">Commentaire</th>
                <th className="text-left py-3 px-5 font-medium">Photo</th>
                <th className="text-left py-3 px-5 font-medium">Statut</th>
                <th className="text-left py-3 px-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={7} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : avis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <Inbox size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm">Aucun avis pour le moment</p>
                  </td>
                </tr>
              ) : avis.map((a) => (
                <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5 text-white">{a.client?.nom_complet || 'Anonyme'}</td>
                  <td className="py-3 px-5 text-neutral-400">{a.vehicule?.marque} {a.vehicule?.modele}</td>
                  <td className="py-3 px-5">{renderStars(a.note)}</td>
                  <td className="py-3 px-5 text-neutral-400 max-w-xs truncate">{a.commentaire}</td>
                  <td className="py-3 px-5">
                    {a.photo_chemin ? (
                      <a href={a.photo_chemin.startsWith('/') ? a.photo_chemin : `/storage/${a.photo_chemin}`}
                         target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs">
                        <ImageIcon size={14} /> Voir
                      </a>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[a.statut] || 'bg-neutral-800 text-neutral-400'}`}>
                      {STATUT_LABELS[a.statut] || a.statut}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex gap-1">
                      {a.statut !== 'publie' && (
                        <button
                          onClick={() => moderer(a.id, 'publie')}
                          disabled={actionId === a.id}
                          title="Approuver"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {a.statut !== 'rejete' && (
                        <button
                          onClick={() => moderer(a.id, 'rejete')}
                          disabled={actionId === a.id}
                          title="Rejeter"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
