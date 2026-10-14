import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../auth';

export default function Login({ navigation, route }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const returnTo = route.params?.returnTo;
      if (returnTo) navigation.replace(returnTo.name, returnTo.params);
      else navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#555"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChange={(e) => setEmail(e.nativeEvent.text)}
        accessibilityLabel="Email"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#555"
        secureTextEntry
        value={password}
        onChange={(e) => setPassword(e.nativeEvent.text)}
        accessibilityLabel="Mot de passe"
      />
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity
        style={styles.cta}
        onPress={submit}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Se connecter"
        accessibilityState={{ disabled: loading, busy: loading }}
      >
        {loading ? <ActivityIndicator color="#fff" accessibilityLabel="Connexion en cours" /> : <Text style={styles.ctaText}>Se connecter</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.link}
        onPress={() => navigation.navigate('Register')}
        accessibilityRole="button"
        accessibilityLabel="Créer un compte"
      >
        <Text style={styles.linkText}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 24 },
  input: { backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: 12, color: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  error: { color: '#dc2626', marginBottom: 14, fontSize: 13 },
  cta: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
});
