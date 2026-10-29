import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Percent, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function Parametres() {
  const [activeTab, setActiveTab] = useState('general');
  const [parametres, setParametres] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchParametres(); }, []);

  const fetchParametres = async () => {
    try {
      const { data } = await api.get('/parametres');
      const map = {};
      data.forEach(p => { map[p.cle] = p.valeur; });
      setParametres(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parametresArray = Object.entries(parametres).map(([cle, valeur]) => ({ cle, valeur }));
      await api.put('/parametres', { parametres: parametresArray });
      setToast({ type: 'success', message: 'Parametres sauvegardes' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Erreur lors de la sauvegarde' });
      setTimeout(() => setToast(null), 3000);
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'location', label: 'Location', icon: Percent },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'securite', label: 'Securite', icon: Shield },
  ];

  const updateParam = (cle, value) => {
    setParametres(prev => ({ ...prev, [cle]: value }));
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-right-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {toast.type === 'error' ? 'Erreur' : 'Succes'}
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
            <Settings size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Parametres</h1>
            <p className="text-muted text-sm">Configuration du systeme</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                activeTab === tab.id
                  ? 'bg-red-600/15 text-red-400 font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        {activeTab === 'general' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-white font-semibold">Informations du business</h3>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-109">Nom de l'entreprise</label>
              <input id="ctl-109" type="text" defaultValue="FIRAS BKA CAR" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-113">Email</label>
              <input id="ctl-113" type="email" defaultValue="firasbkacars@gmail.com" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-117">Telephone</label>
              <input id="ctl-117" type="tel" defaultValue="+212 603 477 786" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-121">Adresse</label>
              <input id="ctl-121" type="text" defaultValue="Tanger, Maroc" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" />
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-white font-semibold">Parametres de location</h3>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-131">Taux d'acompte (%)</label>
              <input id="ctl-131"
                type="number"
                min="0"
                max="100"
                value={parametres.taux_acompte || '30'}
                onChange={(e) => updateParam('taux_acompte', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
              />
              <p className="text-muted text-xs mt-1">Pourcentage du total requis comme acompte</p>
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-143">Supplement conducteur additionnel (DH/jour)</label>
              <input id="ctl-143"
                type="number"
                min="0"
                value={parametres.supplement_conducteur_jour || '50'}
                onChange={(e) => updateParam('supplement_conducteur_jour', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
              />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-153">Delai annulation gratuite (heures)</label>
              <input id="ctl-153"
                type="number"
                min="0"
                value={parametres.delai_annulation_gratuit || '48'}
                onChange={(e) => updateParam('delai_annulation_gratuit', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
              />
              <p className="text-muted text-xs mt-1">Heures avant la date de debut pour annulation gratuite</p>
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-164">Delai annulation partielle (heures)</label>
              <input id="ctl-164"
                type="number"
                min="0"
                value={parametres.delai_annulation_partielle || '24'}
                onChange={(e) => updateParam('delai_annulation_partielle', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
              />
              <p className="text-muted text-xs mt-1">Remboursement 50% entre ce delai et le delai gratuit</p>
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-175">Penalite de retard (%/jour)</label>
              <input id="ctl-175"
                type="number"
                min="0"
                max="100"
                value={parametres.penalite_retard_pourcentage || '50'}
                onChange={(e) => updateParam('penalite_retard_pourcentage', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
              />
              <p className="text-muted text-xs mt-1">Pourcentage du prix journalier facture par jour de retard</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-white font-semibold">Preferences de notifications</h3>
            {[
              { label: 'Nouvelle reservation', desc: 'Recevoir une alerte pour chaque nouvelle reservation' },
              { label: 'Annulation', desc: 'Recevoir une alerte lors d\'une annulation' },
              { label: 'Retour vehicule', desc: 'Rappel de retour de vehicule aujourd\'hui' },
              { label: 'Paiement recu', desc: 'Confirmation de paiement recu' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <p className="text-white text-sm">{item.label}</p>
                  <p className="text-muted text-xs">{item.desc}</p>
                </div>
                <div className="w-10 h-6 bg-red-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'securite' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-white font-semibold">Securite du compte</h3>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-215">Mot de passe actuel</label>
              <input id="ctl-215" type="password" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-219">Nouveau mot de passe</label>
              <input id="ctl-219" type="password" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-neutral-400 text-sm mb-1 block" htmlFor="ctl-223">Confirmer</label>
              <input id="ctl-223" type="password" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition" placeholder="••••••••" />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition">
              <Shield size={16} />
              Mettre a jour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
