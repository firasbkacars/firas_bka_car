import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';
import { Eye, EyeOff, Loader2, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';

function PasswordInput({ id, label, value, onChange, placeholder, show, onToggle, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-11 text-white text-sm placeholder:text-white/20 focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-0.5"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StrengthIndicator({ strength }) {
  const config = {
    weak: { label: 'Faible', color: 'bg-[#dc2626]', text: 'text-[#dc2626]', width: 'w-1/3' },
    medium: { label: 'Moyen', color: 'bg-amber-500', text: 'text-amber-500', width: 'w-2/3' },
    strong: { label: 'Fort', color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' },
  };
  if (!strength) return null;
  const s = config[strength];
  return (
    <div className="mt-2">
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${s.color} ${s.width} rounded-full transition-all duration-500`} />
      </div>
      <p className={`text-[11px] mt-1 ${s.text} font-medium`}>Force : {s.label}</p>
    </div>
  );
}

export default function ClientRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    nom_complet: '', email: '', telephone: '',
    password: '', password_confirmation: '',
    cin: '', adresse: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setFieldErrors(p => ({ ...p, [key]: '' }));
  };

  const passwordStrength = useMemo(() => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return 'weak';
    if (score <= 2) return 'medium';
    return 'strong';
  }, [form.password]);

  const passwordsMatch = form.password && form.password_confirmation && form.password === form.password_confirmation;
  const passwordsMismatch = form.password_confirmation && form.password !== form.password_confirmation;

  const phoneError = useMemo(() => {
    if (!form.telephone) return '';
    if (!/^(06|07)\d{8}$/.test(form.telephone)) return 'Format invalide (06XXXXXXXX ou 07XXXXXXXX)';
    return '';
  }, [form.telephone]);

  const cinError = useMemo(() => {
    if (!form.cin) return '';
    if (!/^[A-Z]{1,2}\d{4,6}$/.test(form.cin)) return 'Le CIN doit contenir 1 à 2 lettres majuscules suivies de 4 à 6 chiffres (ex: A12345 ou AB123456)';
    return '';
  }, [form.cin]);

  const isValid = form.nom_complet && form.email && form.telephone && form.password.length >= 6
    && form.password === form.password_confirmation && cgu && !phoneError && !cinError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate('/client/profil'), 2500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
      } else {
        setError(data?.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Inscription réussie" subtitle="Redirection vers la connexion...">
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Compte créé avec succès</h2>
          <p className="text-white/40 text-sm">Vous allez être redirigé vers la page de connexion.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez-nous pour réserver votre voiture" image="/images/photo2.jpg">
      <form onSubmit={handleSubmit} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 sm:p-7">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] text-sm px-4 py-3 rounded-xl mb-5">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Nom complet */}
          <div>
            <label htmlFor="reg-nom" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              Nom complet *
            </label>
            <input
              id="reg-nom"
              type="text"
              required
              autoFocus
              autoComplete="name"
              value={form.nom_complet}
              onChange={(e) => update('nom_complet', e.target.value)}
              className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm focus:ring-1 outline-none transition-all ${
                fieldErrors.nom_complet ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
              }`}
            />
            {fieldErrors.nom_complet && (
              <p className="text-[#dc2626] text-xs mt-1" role="alert">{fieldErrors.nom_complet}</p>
            )}
          </div>

          {/* Email + Téléphone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-email" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                Email *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm focus:ring-1 outline-none transition-all ${
                  fieldErrors.email ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-[#dc2626] text-xs mt-1" role="alert">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="reg-tel" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                Téléphone *
              </label>
              <input
                id="reg-tel"
                type="tel"
                required
                autoComplete="tel"
                value={form.telephone}
                onChange={(e) => update('telephone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="06XXXXXXXX"
                className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:ring-1 outline-none transition-all ${
                  phoneError || fieldErrors.telephone ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                }`}
              />
              {(phoneError || fieldErrors.telephone) && (
                <p className="text-[#dc2626] text-xs mt-1" role="alert">{fieldErrors.telephone || phoneError}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <PasswordInput
            id="reg-pw"
            label="Mot de passe *"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Min. 6 caractères"
            show={showPw}
            onToggle={() => setShowPw(!showPw)}
          />
          <StrengthIndicator strength={passwordStrength} />

          {/* Password confirmation */}
          <div>
            <PasswordInput
              id="reg-pw-conf"
              label="Confirmer le mot de passe *"
              value={form.password_confirmation}
              onChange={(e) => update('password_confirmation', e.target.value)}
              placeholder="Retapez le mot de passe"
              show={showPwConf}
              onToggle={() => setShowPwConf(!showPwConf)}
            />
            {passwordsMismatch && (
              <p className="text-[#dc2626] text-xs mt-1.5 flex items-center gap-1" role="alert">
            <AlertTriangle size={16} className="shrink-0" />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {passwordsMatch && (
              <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                <Check size={12} className="text-emerald-400" strokeWidth={3} />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          {/* CIN + Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-cin" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                CIN
              </label>
              <input
                id="reg-cin"
                type="text"
                autoComplete="off"
                value={form.cin}
                onChange={(e) => update('cin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="AB123456"
                maxLength={8}
                className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:ring-1 outline-none transition-all ${
                  cinError || fieldErrors.cin ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                }`}
              />
              {(cinError || fieldErrors.cin) && (
                <p className="text-[#dc2626] text-xs mt-1" role="alert">{fieldErrors.cin || cinError}</p>
              )}
            </div>
            <div>
              <label htmlFor="reg-adresse" className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                Adresse
              </label>
              <input
                id="reg-adresse"
                type="text"
                autoComplete="street-address"
                value={form.adresse}
                onChange={(e) => update('adresse', e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* CGU */}
          <label className="flex items-start gap-3 cursor-pointer group/cgu pt-1">
            <span className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
              cgu
                ? 'bg-[#dc2626] border-[#dc2626]'
                : 'border-white/20 group-hover/cgu:border-white/40'
            }`}>
              {cgu && <Check size={12} className="text-white" strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              checked={cgu}
              onChange={(e) => setCgu(e.target.checked)}
              className="sr-only"
            />
            <span className="text-white/50 text-[13px] leading-relaxed group-hover/cgu:text-white/70 transition-colors">
              J'accepte les{' '}
              <span className="text-[#dc2626] hover:underline">
                 conditions générales d'utilisation
              </span>
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Inscription en cours...' : 'S\'inscrire'}
        </button>

        {/* Login link */}
        <p className="text-center text-white/30 text-sm mt-5">
          Déjà un compte ?{' '}
          <Link to="/client/login" className="text-[#dc2626] hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
