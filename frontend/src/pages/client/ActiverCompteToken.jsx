import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';

/**
 * Definition du mot de passe via le lien recu par email.
 *
 * Le token est verifie avant d'afficher le formulaire ; il est a usage unique
 * et expire au bout de sept jours.
 */
export default function ActiverCompteToken() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { activerCompte } = useAuth();

  const [verification, setVerification] = useState({ loading: true, client: null, error: '' });
  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [showPw, setShowPw] = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let annule = false;

    api.get(`/client/activer/${token}`)
      .then(({ data }) => {
        if (!annule) setVerification({ loading: false, client: data, error: '' });
      })
      .catch((err) => {
        if (!annule) {
          setVerification({
            loading: false,
            client: null,
            error: err.response?.data?.message || "Ce lien d'activation est invalide ou a expiré.",
          });
        }
      });

    return () => { annule = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setLoading(true);
    try {
      await activerCompte(token, form.password, form.password_confirmation);
      navigate('/client/profil', { replace: true });
    } catch (err) {
      const erreurs = err.response?.data?.errors;
      const premiere = erreurs ? Object.values(erreurs).flat().find(Boolean) : null;
      setError(
        premiere
        || err.response?.data?.message
        || "Erreur lors de l'activation du compte."
      );
    } finally {
      setLoading(false);
    }
  };

  if (verification.loading) {
    return (
      <AuthLayout title="Activation du compte" subtitle="Vérification du lien...">
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 flex items-center justify-center gap-3 text-muted text-sm">
          <Loader2 size={18} className="animate-spin" />
          Vérification en cours...
        </div>
      </AuthLayout>
    );
  }

  if (verification.error) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Impossible d'activer ce compte">
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#dc2626]/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-primary-light" />
          </div>
          <p className="text-muted text-sm leading-relaxed">{verification.error}</p>
          <Link
            to="/client/activer"
            className="inline-block mt-6 text-primary-light text-sm hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Définissez votre mot de passe"
      subtitle={`Bienvenue ${verification.client?.nom_complet || ''}`}
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

        <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 mb-5">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-muted text-xs leading-relaxed">
            Compte lié à <span className="text-white">{verification.client?.email}</span>.
            Choisissez un mot de passe pour accéder à vos réservations.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="activation-pw" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              Mot de passe *
            </label>
            <div className="relative">
              <input
                id="activation-pw"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 caractères"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-11 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white/60 transition-colors p-0.5"
                aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="activation-pw-conf" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <input
                id="activation-pw-conf"
                type={showPwConf ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                placeholder="Retapez le mot de passe"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-11 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwConf(!showPwConf)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white/60 transition-colors p-0.5"
                aria-label={showPwConf ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPwConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-disabled disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Activation en cours...' : 'Activer mon compte'}
        </button>
      </form>
    </AuthLayout>
  );
}
