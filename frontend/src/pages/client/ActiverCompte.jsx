import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2, MailCheck } from 'lucide-react';
import api from '../../services/api';
import AuthLayout from '../../components/AuthLayout';

/**
 * Demande d'un lien d'activation pour un compte cree par un agent.
 *
 * La reponse du serveur est volontairement generique : elle ne revele pas si
 * l'adresse correspond a un compte existant.
 */
export default function ActiverCompte() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/client/activer', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer la demande pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Vérifiez votre boîte mail"
        subtitle="Un lien d'activation vient de vous être envoyé"
        image="/images/photo2.jpg"
      >
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={24} className="text-emerald-500" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Consultez vos emails</h2>
          <p className="text-muted text-sm leading-relaxed">
            Si un compte est éligible pour <span className="text-white">{email}</span>, vous
            recevrez un lien valable 7 jours pour définir votre mot de passe.
          </p>
          <p className="text-muted text-xs mt-4">
            Pensez à vérifier vos courriers indésirables.
          </p>
          <Link
            to="/client/login"
            className="inline-block mt-6 text-primary-light text-sm hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activer mon compte"
      subtitle="Vous avez réservé par téléphone ? Définissez votre mot de passe."
      image="/images/photo2.jpg"
    >
      <form onSubmit={handleSubmit} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 sm:p-7">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 bg-[#dc2626]/10 border border-[#dc2626]/20 text-primary-light text-sm px-4 py-3 rounded-xl mb-5"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-muted text-sm leading-relaxed mb-4">
          Votre compte a été créé par notre équipe lors de votre réservation. Indiquez
          l'adresse email communiquée pour recevoir votre lien d'activation.
        </p>

        <div>
          <label htmlFor="activation-email" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
            Email
          </label>
          <input
            id="activation-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-disabled disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Envoi en cours...' : "Recevoir le lien d'activation"}
        </button>

        <p className="text-center text-muted text-sm mt-5">
          Compte déjà activé ?{' '}
          <Link to="/client/login" className="text-primary-light hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
