import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Inbox } from 'lucide-react';
import api from '../../services/api';

export default function Messages() {
  const [clients, setClients] = useState([]);
  const [selection, setSelection] = useState(null);
  const [fil, setFil] = useState([]);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (selection) fetchFil(selection.id); }, [selection]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [fil]);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/messages-admin');
      setClients(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchFil = async (clientId) => {
    try {
      const { data } = await api.get(`/messages-admin/${clientId}`);
      setFil(data.messages);
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, non_lus: 0 } : c)));
    } catch (err) { console.error(err); }
  };

  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || !selection) return;
    try {
      setSending(true);
      const { data } = await api.post(`/messages-admin/${selection.id}`, { message: texte.trim() });
      setFil((prev) => [...prev, data]);
      setTexte('');
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
          <MessageSquare size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Messages clients</h1>
          <p className="text-neutral-500 text-sm">{clients.length} conversation(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-neutral-800 text-sm font-medium text-neutral-400">Conversations</div>
          <div className="overflow-y-auto max-h-[65vh]">
            {loading ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />)}
              </div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                <Inbox size={32} className="mx-auto mb-2 text-neutral-600" />
                Aucune conversation
              </div>
            ) : clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelection(c)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-800/50 transition ${
                  selection?.id === c.id ? 'bg-red-600/10' : 'hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{c.nom_complet}</span>
                  {Number(c.non_lus) > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {c.non_lus}
                    </span>
                  )}
                </div>
                <span className="text-neutral-500 text-xs">{c.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col" style={{ minHeight: '60vh' }}>
          {!selection ? (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
              Selectionnez une conversation
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-neutral-800 text-white font-medium">{selection.nom_complet}</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                {fil.map((m) => (
                  <div key={m.id} className={`flex ${m.from_admin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.from_admin ? 'bg-red-600 text-white rounded-br-md' : 'bg-neutral-800 text-neutral-200 rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                      <span className={`block text-[10px] mt-1 ${m.from_admin ? 'text-white/60' : 'text-neutral-500'}`}>
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={envoyer} className="p-3 border-t border-neutral-800 flex gap-2">
                <input
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder="Votre reponse..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm"
                />
                <button type="submit" disabled={sending || !texte.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 rounded-xl transition">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
