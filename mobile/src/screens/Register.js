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

    setLoading(true);
    try {
      await register({
        nom_complet: form.nom_complet.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
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
  error: { color: colors.dangerLight, fontSize: 13, marginTop: 16 },
  cta: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { color: colors.info, fontSize: 14, fontWeight: '600' },
});
