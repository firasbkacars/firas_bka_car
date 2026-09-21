import { useState, useEffect } from 'react';
import { Star, Inbox } from 'lucide-react';
import api from '../../services/api';

export default function Avis() {
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAvis(); }, []);

  const fetchAvis = async () => {
    try {
      const { data } = await api.get('/avis');
      setAvis(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const renderStars = (note) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < note ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'}
        />
      ))}
    </div>
  );

  const noteMoyenne = avis.length > 0
    ? (avis.reduce((a, v) => a + v.note, 0) / avis.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
          <Star size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Avis clients</h1>
          <p className="text-neutral-500 text-sm">{avis.length} avis — Note moyenne : {noteMoyenne}/5</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-3 px-5 font-medium">Client</th>
                <th className="text-left py-3 px-5 font-medium">Véhicule</th>
                <th className="text-left py-3 px-5 font-medium">Note</th>
                <th className="text-left py-3 px-5 font-medium">Commentaire</th>
                <th className="text-left py-3 px-5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={5} className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : avis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-neutral-500">
                    <Inbox size={40} className="mx-auto mb-3 text-neutral-600" />
                    <p className="text-sm">Aucun avis pour le moment</p>
                  </td>
                </tr>
              ) : avis.map((a) => (
                <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-5 text-white">{a.client?.nom_complet || 'Anonyme'}</td>
                  <td className="py-3 px-5 text-neutral-400">{a.vehicule?.marque} {a.vehicule?.modele}</td>
                  <td className="py-3 px-5">{renderStars(a.note)}</td>
                  <td className="py-3 px-5 text-neutral-400 max-w-xs truncate">{a.commentaire}</td>
                  <td className="py-3 px-5 text-neutral-500 text-xs">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
