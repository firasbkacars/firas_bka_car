import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';
import { Eye, EyeOff, Loader2, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';

function PasswordInput({ id, label, value, onChange, placeholder, show, onToggle, autoFocus }) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 pe-11 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-white/60 transition-colors p-0.5"
          aria-label={show ? t('auth.masquerMotDePasse') : t('auth.afficherMotDePasse')}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StrengthIndicator({ strength }) {
  const { t } = useTranslation();
  const config = {
    weak: { label: t('register.forceFaible'), color: 'bg-[#dc2626]', text: 'text-primary-light', width: 'w-1/3' },
    medium: { label: t('register.forceMoyen'), color: 'bg-amber-500', text: 'text-amber-500', width: 'w-2/3' },
    strong: { label: t('register.forceFort'), color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' },
  };
  if (!strength) return null;
  const s = config[strength];
  return (
    <div className="mt-2">
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${s.color} ${s.width} rounded-full transition-all duration-500`} />
      </div>
      <p className={`text-xs mt-1 ${s.text} font-medium`}>{t('register.force')} {s.label}</p>
    </div>
  );
}

export default function ClientRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    nom_complet: '', email: '', telephone: '',
    password: '', password_confirmation: '',
    cin: '', passeport: '', est_etranger: false,
    adresse: '', code_parrainage: '',
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
    if (!/^(06|07)\d{8}$/.test(form.telephone)) return t('register.erreurTelephone');
    return '';
  }, [form.telephone, t]);

  const cinError = useMemo(() => {
    if (form.est_etranger || !form.cin) return '';
    if (!/^[A-Z]{1,2}\d{4,6}$/.test(form.cin)) return t('register.erreurCin');
    return '';
  }, [form.cin, form.est_etranger, t]);

  const passeportError = useMemo(() => {
    if (!form.est_etranger || !form.passeport) return '';
    if (!/^[A-Z0-9]{6,20}$/.test(form.passeport)) return t('register.erreurPasseport');
    return '';
  }, [form.passeport, form.est_etranger, t]);

  const documentIdentiteManquant = form.est_etranger ? !form.passeport : !form.cin;

  const isValid = form.nom_complet && form.email && form.telephone && form.password.length >= 8
    && form.password === form.password_confirmation && cgu && !phoneError && !cinError
    && !passeportError && !documentIdentiteManquant;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register({
        ...form,
        // Seule la pièce correspondant à la nationalité est transmise.
        cin: form.est_etranger ? '' : form.cin,
        passeport: form.est_etranger ? form.passeport : '',
      });
      setSuccess(true);
      setTimeout(() => navigate('/client/profil'), 2500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
      } else {
        setError(data?.message || t('register.erreurInscription'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title={t('register.succesTitre')} subtitle={t('register.succesSousTitre')}>
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">{t('register.succesCompteCree')}</h2>
          <p className="text-muted text-sm">
            {t('register.succesDerniereEtape', {
              piece: form.est_etranger ? t('register.passeport') : t('register.carteNationale'),
            })}
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('register.titre')} subtitle={t('register.sousTitre')} image="/images/photo2.jpg">
      <form onSubmit={handleSubmit} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 sm:p-7">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 bg-[#dc2626]/10 border border-[#dc2626]/20 text-primary-light text-sm px-4 py-3 rounded-xl mb-5">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {(fieldErrors.email || fieldErrors.telephone) && (
          <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 mb-5">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-muted text-xs leading-relaxed">
              {t('register.dejaReserve')}{' '}
              <Link
                to="/client/activer"
                state={{ email: form.email }}
                className="text-primary-light hover:underline font-medium"
              >
                {t('register.activerCompte')}
              </Link>{' '}
              {t('register.dejaReserveFin')}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Nom complet */}
          <div>
            <label htmlFor="reg-nom" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              {t('register.nomComplet')}
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
              <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.nom_complet}</p>
            )}
          </div>

          {/* Email + Téléphone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-email" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                {t('register.email')}
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
                <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="reg-tel" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                {t('register.telephone')}
              </label>
              <input
                id="reg-tel"
                type="tel"
                required
                autoComplete="tel"
                value={form.telephone}
                onChange={(e) => update('telephone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={t('register.telephonePlaceholder')}
                className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:ring-1 outline-none transition-all ${
                  phoneError || fieldErrors.telephone ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                }`}
              />
              {(phoneError || fieldErrors.telephone) && (
                <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.telephone || phoneError}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <PasswordInput
            id="reg-pw"
            label={t('register.motDePasse')}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder={t('register.motDePassePlaceholder')}
            show={showPw}
            onToggle={() => setShowPw(!showPw)}
          />
          <StrengthIndicator strength={passwordStrength} />

          {/* Password confirmation */}
          <div>
            <PasswordInput
              id="reg-pw-conf"
              label={t('register.confirmerMotDePasse')}
              value={form.password_confirmation}
              onChange={(e) => update('password_confirmation', e.target.value)}
              placeholder={t('register.confirmerPlaceholder')}
              show={showPwConf}
              onToggle={() => setShowPwConf(!showPwConf)}
            />
            {passwordsMismatch && (
              <p className="text-primary-light text-xs mt-1.5 flex items-center gap-1" role="alert">
            <AlertTriangle size={16} className="shrink-0" />
                {t('register.motsDePasseDifferents')}
              </p>
            )}
            {passwordsMatch && (
              <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                <Check size={12} className="text-emerald-400" strokeWidth={3} />
                {t('register.motsDePasseIdentiques')}
              </p>
            )}
          </div>

          {/* Nationalité */}
          <div>
            <label htmlFor="reg-nationalite" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              {t('register.nationalite')}
            </label>
            <select
              id="reg-nationalite"
              value={form.est_etranger ? 'etranger' : 'marocain'}
              onChange={(e) => {
                const etranger = e.target.value === 'etranger';
                setForm(p => ({
                  ...p,
                  est_etranger: etranger,
                  cin: etranger ? '' : p.cin,
                  passeport: etranger ? p.passeport : '',
                }));
                setFieldErrors(p => ({ ...p, cin: '', passeport: '' }));
              }}
              className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
            >
              <option value="marocain">{t('register.optionMarocaine')}</option>
              <option value="etranger">{t('register.optionEtrangere')}</option>
            </select>
          </div>

          {/* Pièce d'identité + Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {form.est_etranger ? (
                <>
                  <label htmlFor="reg-passeport" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                    {t('register.numeroPasseport')}
                  </label>
                  <input
                    id="reg-passeport"
                    type="text"
                    autoComplete="off"
                    required
                    value={form.passeport}
                    onChange={(e) => update('passeport', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                    placeholder={t('register.passeportPlaceholder')}
                    maxLength={20}
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:ring-1 outline-none transition-all ${
                      passeportError || fieldErrors.passeport ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                    }`}
                  />
                  {(passeportError || fieldErrors.passeport) && (
                    <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.passeport || passeportError}</p>
                  )}
                </>
              ) : (
                <>
                  <label htmlFor="reg-cin" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                    {t('register.cin')}
                  </label>
                  <input
                    id="reg-cin"
                    type="text"
                    autoComplete="off"
                    required
                    value={form.cin}
                    onChange={(e) => update('cin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder={t('register.cinPlaceholder')}
                    maxLength={8}
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:ring-1 outline-none transition-all ${
                      cinError || fieldErrors.cin ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
                    }`}
                  />
                  {(cinError || fieldErrors.cin) && (
                    <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.cin || cinError}</p>
                  )}
                </>
              )}
            </div>
            <div>
              <label htmlFor="reg-adresse" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
                {t('register.adresse')}
              </label>
              <input
                id="reg-adresse"
                type="text"
                autoComplete="street-address"
                value={form.adresse}
                onChange={(e) => update('adresse', e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:border-[#dc2626]/50 focus:ring-1 focus:ring-[#dc2626]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Documents obligatoires */}
          <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-muted text-xs leading-relaxed">
              {t('register.documentsInfo', {
                piece: form.est_etranger ? t('register.passeport') : t('register.carteNationale'),
              })}
            </p>
          </div>


          {/* Code parrainage (V2) */}
          <div>
            <label htmlFor="reg-parrain" className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">
              {t('register.codeParrainage')} <span className="normal-case text-muted">{t('register.optionnel')}</span>
            </label>
            <input
              id="reg-parrain"
              type="text"
              autoComplete="off"
              value={form.code_parrainage}
              onChange={(e) => update('code_parrainage', e.target.value.toUpperCase().slice(0, 12))}
              placeholder={t('register.parrainagePlaceholder')}
              maxLength={12}
              className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-placeholder focus:ring-1 outline-none transition-all ${
                fieldErrors.code_parrainage ? 'border-[#dc2626]/50 focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20' : 'border-white/[0.08] focus:border-[#dc2626]/50 focus:ring-[#dc2626]/20'
              }`}
            />
            {fieldErrors.code_parrainage && (
              <p className="text-primary-light text-xs mt-1" role="alert">{fieldErrors.code_parrainage}</p>
            )}
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
            <span className="text-white/70 text-[13px] leading-relaxed group-hover/cgu:text-white/70 transition-colors">
              {t('register.cguAccepte')}{' '}
              <span className="text-primary-light hover:underline">
                {t('register.cguLien')}
              </span>
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-white/[0.06] disabled:text-disabled disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? t('register.inscriptionEnCours') : t('actions.sInscrire')}
        </button>

        {/* Login link */}
        <p className="text-center text-muted text-sm mt-5">
          {t('register.dejaCompte')}{' '}
          <Link to="/client/login" className="text-primary-light hover:underline font-medium">
            {t('actions.seConnecter')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
