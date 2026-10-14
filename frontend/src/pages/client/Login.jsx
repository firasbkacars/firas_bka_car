import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';
import { Eye, EyeOff, Loader2, AlertTriangle, Check } from 'lucide-react';

export default function ClientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      const from = location.state?.from;
      navigate(from && typeof from === 'string' && from.startsWith('/') ? from : '/client/profil', { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Trop de tentatives. Veuillez réessayer dans 1 minute.');
      } else {
        setError(err.response?.data?.message || 'Identifiants incorrects. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace client" image="/images/photo1.jpg">
      <form onSubmit={handleSubmit} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 sm:p-7">
        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 bg-[#dc2626]/10 border border-[#dc2626]/20 text-primary-light text-sm px-4 py-3 rounded-xl mb-5"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com"
              className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-white/70 text-[11px] font-medium uppercase tracking-wider">
                Mot de passe
              </label>
              <Link to="/client/login" className="text-primary-light text-[11px] hover:underline transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-11 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
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

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer group/check">
            <span className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all shrink-0 ${
              remember
                ? 'bg-[#dc2626] border-[#dc2626]'
                : 'border-white/20 group-hover/check:border-white/40'
            }`}>
              {remember && (
                <Check size={12} className="text-white" strokeWidth={3} />
              )}
            </span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only"
            />
            <span className="text-white/70 text-sm group-hover/check:text-white/70 transition-colors">Se souvenir de moi</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-disabled disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        {/* Register link */}
        <p className="text-center text-muted text-sm mt-5">
          Pas encore de compte ?{' '}
          <Link to="/client/register" className="text-primary-light hover:underline font-medium">
            S'inscrire
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
