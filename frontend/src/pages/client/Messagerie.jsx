import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../lib/formatters';

export default function Messagerie() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const fetchMessages = async (initial = false) => {
    try {
      const { data } = await api.get('/client/messages');
      setMessages(data);
      // La messagerie ouverte marque les messages admin comme lus :
      // on rafraichit le badge du menu client.
      window.dispatchEvent(new Event('client-notifications-refresh'));
    } catch (err) { console.error(err); }
    finally { if (initial) setLoading(false); }
  };

  useEffect(() => {
    fetchMessages(true);
    const timer = setInterval(() => fetchMessages(), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      setSending(true);
      const { data } = await api.post('/client/messages', { message: texte.trim() });
      setMessages((prev) => [...prev, data]);
      setTexte('');
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader
        title={t('messagerie.titre')}
        breadcrumbs={[{ label: t('messagerie.filAriane'), path: '/client/tableau-de-bord' }]}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl flex flex-col" style={{ height: '65vh' }}>
          <div className="p-4 border-b border-white/[0.06] flex items-center gap-2 text-white font-medium">
            <MessageSquare size={18} className="text-primary-light" />
            {t('messagerie.contacterEquipe')}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />)}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted text-sm pt-12">
                {t('messagerie.aucunMessage')}
              </p>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex ${m.from_admin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.from_admin ? 'bg-white/[0.08] text-white rounded-bl-md' : 'bg-[#dc2626] text-white rounded-br-md'
                }`}>
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <span className="block text-[10px] mt-1 text-white/60">
                    {formatDateTime(m.created_at)}
                  </span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={envoyer} className="p-3 border-t border-white/[0.06] flex gap-2">
            <input aria-label={t('messagerie.placeholder')}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder={t('messagerie.placeholder')}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder"
            />
            <button type="submit" disabled={sending || !texte.trim()}
              aria-label={t('messagerie.envoyer')}
              className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white px-4 rounded-xl transition">
              <Send size={16} className="rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
