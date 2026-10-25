import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../auth';
import { colors } from '../theme';

export default function Register({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    password: '',
    password_confirmation: '',
    est_etranger: false,
    cin: '',
    passeport: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async () => {
    setError(null);
    if (!form.nom_complet.trim()) return setError('Le nom complet est obligatoire.');
    if (!form.email.includes('@')) return setError('Email invalide.');
    if (!/^(\+212|0)[5-7]\d{8}$/.test(form.telephone.trim())) {
      return setError('Téléphone invalide (ex : 0612345678 ou +212612345678).');
    }
    if (form.password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (form.password !== form.password_confirmation) return setError('Les mots de passe ne correspondent pas.');

    if (form.est_etranger) {
      if (!/^[A-Z0-9]{6,20}$/.test(form.passeport.trim())) {
        return setError('Numéro de passeport invalide (6 à 20 lettres majuscules ou chiffres).');
      }
    } else if (!/^[A-Z]{1,2}\d{4,6}$/.test(form.cin.trim())) {
      return setError('CIN invalide (ex : A12345 ou AB123456).');
    }

    setLoading(true);
    try {
      await register({
        nom_complet: form.nom_complet.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        est_etranger: form.est_etranger,
        cin: form.est_etranger ? '' : form.cin.trim(),
        passeport: form.est_etranger ? form.passeport.trim() : '',
      });
      navigation.replace('Profil');
    } catch (err) {
      const messages = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join('\n')
        || 'Inscription impossible.';
      setError(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.hint}>
          Inscrivez-vous pour réserver. Un permis de conduire sera demandé avant la première location.
        </Text>

        {[
          { key: 'nom_complet', label: 'Nom complet', placeholder: 'Prénom Nom' },
          { key: 'email', label: 'Email', placeholder: 'vous@email.com', keyboard: 'email-address', auto: 'none' },
          { key: 'telephone', label: 'Téléphone', placeholder: '0612345678', keyboard: 'phone-pad' },
          { key: 'password', label: 'Mot de passe', placeholder: '8 caractères minimum', secure: true },
          { key: 'password_confirmation', label: 'Confirmer le mot de passe', placeholder: 'Retapez le mot de passe', secure: true },
        ].map((champ) => (
          <View key={champ.key}>
            <Text style={styles.label}>{champ.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={champ.placeholder}
              placeholderTextColor={colors.dim}
              value={form[champ.key]}
              onChangeText={set(champ.key)}
              keyboardType={champ.keyboard || 'default'}
              autoCapitalize={champ.auto || 'words'}
              secureTextEntry={champ.secure}
              accessibilityLabel={champ.label}
            />
          </View>
        ))}

        <Text style={styles.label}>Nationalité</Text>
        <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel="Nationalité">
          {[
            { value: false, label: 'Marocaine — CIN' },
            { value: true, label: 'Étrangère — passeport' },
          ].map((option) => {
            const actif = form.est_etranger === option.value;
            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.segment, actif && styles.segmentActif]}
                onPress={() => setForm((f) => ({
                  ...f,
                  est_etranger: option.value,
                  cin: option.value ? '' : f.cin,
                  passeport: option.value ? f.passeport : '',
                }))}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.segmentText, actif && styles.segmentTextActif]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {form.est_etranger ? (
          <View>
            <Text style={styles.label}>Numéro de passeport</Text>
            <TextInput
              style={styles.input}
              placeholder="X1234567"
              placeholderTextColor={colors.dim}
              value={form.passeport}
              onChangeText={(v) => setForm((f) => ({ ...f, passeport: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) }))}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Numéro de passeport"
            />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>CIN</Text>
            <TextInput
              style={styles.input}
              placeholder="AB123456"
              placeholderTextColor={colors.dim}
              value={form.cin}
              onChangeText={(v) => setForm((f) => ({ ...f, cin: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }))}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="CIN"
            />
          </View>
        )}

        <Text style={styles.documentHint}>
          Après l'inscription, vous devrez téléverser une photo nette de votre permis
          et de votre {form.est_etranger ? 'passeport' : 'carte nationale'} dans votre profil.
          Les photos floues, sombres ou au format PDF sont refusées automatiquement.
        </Text>

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        <TouchableOpacity
          style={[styles.cta, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="S'inscrire"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading
            ? <ActivityIndicator color="#fff" accessibilityLabel="Inscription en cours" />
            : <Text style={styles.ctaText}>S'inscrire</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="J'ai déjà un compte"
        >
          <Text style={styles.linkText}>J'ai déjà un compte — se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  hint: { color: colors.sub, fontSize: 13, lineHeight: 19, marginBottom: 20 },
  label: { color: colors.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', backgroundColor: colors.card },
  segmentActif: { borderColor: colors.danger, backgroundColor: 'rgba(220,38,38,0.12)' },
  segmentText: { color: colors.sub, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  segmentTextActif: { color: colors.text },
  documentHint: { color: colors.dim, fontSize: 12, lineHeight: 18, marginTop: 16 },
  error: { color: colors.dangerLight, fontSize: 13, marginTop: 16 },
  cta: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { color: colors.info, fontSize: 14, fontWeight: '600' },
});
