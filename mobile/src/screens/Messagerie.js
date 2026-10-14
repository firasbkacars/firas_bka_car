import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import api from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';

export default function Messagerie() {
  const { client } = useAuth();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let vivant = true;
    const charger = async () => {
      try {
        const { data } = await api.get('/client/messages');
        if (vivant) setMessages(Array.isArray(data) ? data : data?.data || []);
      } catch {}
    };
    charger();
    const interval = setInterval(charger, 10000);
    return () => {
      vivant = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (messages.length && listRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages.length]);

  const envoyer = async () => {
    const message = texte.trim();
    if (!message || envoi) return;
    setEnvoi(true);
    try {
      const { data } = await api.post('/client/messages', { message });
      setMessages((m) => [...m, data]);
      setTexte('');
    } catch {
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>
              Une question sur votre réservation ? Écrivez-nous, l’équipe vous répond ici.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mien = !item.from_admin;
          return (
            <View style={[styles.bulle, mien ? styles.bulleMienne : styles.bulleAdmin]}>
              <Text style={[styles.auteur, mien && { color: colors.dangerLight }]}>
                {mien ? 'Moi' : 'FIRAS BKA CAR'}
              </Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          );
        }}
      />
      <View style={styles.barre}>
        <TextInput
          style={styles.input}
          placeholder="Votre message…"
          placeholderTextColor={colors.dim}
          value={texte}
          onChangeText={setTexte}
          multiline
          accessibilityLabel="Votre message"
        />
        <TouchableOpacity
          style={[styles.envoi, (envoi || !texte.trim()) && { opacity: 0.5 }]}
          onPress={envoyer}
          disabled={envoi || !texte.trim()}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: envoi || !texte.trim() }}
        >
          <Text style={styles.envoiText}>↗</Text>
        </TouchableOpacity>
      </View>
      {!client ? <Text style={styles.hint}>Connectez-vous pour écrire à l’équipe.</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty: { color: colors.dim, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  bulle: { maxWidth: '82%', borderRadius: 14, padding: 12, marginBottom: 10 },
  bulleMienne: { alignSelf: 'flex-end', backgroundColor: 'rgba(220,38,38,0.14)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.35)' },
  bulleAdmin: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  auteur: { color: colors.dim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 },
  barre: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, maxHeight: 100 },
  envoi: { backgroundColor: colors.danger, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  envoiText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hint: { color: colors.dim, fontSize: 11, textAlign: 'center', paddingBottom: 8 },
});
