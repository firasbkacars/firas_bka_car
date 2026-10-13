import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/client/login', { email, password });
      await AsyncStorage.setItem('client_token', data.token);
      navigation.goBack();
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
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#555"
        secureTextEntry
        value={password}
        onChange={(e) => setPassword(e.nativeEvent.text)}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.cta} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Se connecter</Text>}
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
});
