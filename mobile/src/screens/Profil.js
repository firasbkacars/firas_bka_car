import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api';
import { useAuth } from '../auth';
import { colors, PERMIS_COLORS, PERMIS_LABELS } from '../theme';
import { parseDate, toISO, formatDate, formatMAD } from '../utils/date';

function Section({ titre, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{titre}</Text>
      {children}
    </View>
  );
}

function Info({ label, valeur }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneValue}>{valeur || '—'}</Text>
    </View>
  );
}

export default function Profil({ navigation }) {
  const { client, setProfile, logout } = useAuth();
  const [profil, setProfil] = useState(client);
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);

  const recharger = useCallback(async () => {
    try {
      const { data } = await api.get('/client/profile');
      setProfil(data);
      setProfile(data);
    } catch {}
  }, [setProfile]);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const demarrerEdition = () => {
    setForm({
      nom_complet: profil?.nom_complet || '',
      telephone: profil?.telephone || '',
      email: profil?.email || '',
      cin: profil?.cin || '',
      adresse: profil?.adresse || '',
      date_expiration_permis: profil?.date_expiration_permis
        ? formatDate(profil.date_expiration_permis)
        : '',
    });
    setError(null);
    setEdition(true);
  };

  const enregistrer = async () => {
    setError(null);
    if (form.date_expiration_permis && !parseDate(form.date_expiration_permis)) {
      return setError('Date d’expiration du permis invalide (JJ/MM/AAAA).');
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.date_expiration_permis) payload.date_expiration_permis = toISO(parseDate(payload.date_expiration_permis));
      else payload.date_expiration_permis = null;
      const { data } = await api.put('/client/profile', payload);
      setProfil(data);
      setProfile(data);
      setEdition(false);
    } catch (err) {
      const messages = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join('\n')
        || 'Enregistrement impossible.';
      setError(messages);
    } finally {
      setSaving(false);
    }
  };

  const choisirPhoto = async (destination) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès à vos photos pour continuer.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: destination === 'photo' ? [1, 1] : undefined,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploading(destination);
    try {
      const formData = new FormData();
      formData.append(destination === 'permis' ? 'permis_conduire' : 'photo', {
        uri: asset.uri,
        name: destination === 'permis' ? 'permis.jpg' : 'photo.jpg',
        type: 'image/jpeg',
      });
      await api.post(destination === 'permis' ? '/client/permis' : '/client/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await recharger();
      Alert.alert('Succès', destination === 'permis'
        ? 'Permis envoyé. Un agent validera votre document.'
        : 'Photo de profil mise à jour.');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'L’envoi a échoué.');
    } finally {
      setUploading(null);
    }
  };

  const deconnexion = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.popToTop();
        },
      },
    ]);
  };

  if (!profil) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.danger} size="large" accessibilityLabel="Chargement du profil" />
      </View>
    );
  }

  const statutPermis = profil.permis_statut || 'en_attente';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.identite}>
        {profil.photo_profil ? (
          <Image
            source={{ uri: `https://firasbkacar.fly.dev/storage/${profil.photo_profil}` }}
            style={styles.avatar}
            accessibilityLabel="Photo de profil"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarVide]} accessibilityElementsHidden>
            <Text style={styles.avatarInitiales}>{(profil.nom_complet || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.nom}>{profil.nom_complet}</Text>
          <Text style={styles.email}>{profil.email}</Text>
          {profil.points_fidelite != null ? (
            <Text style={styles.fidelite}>
              {formatMAD(profil.points_fidelite)} de points · {profil.niveau_fidelite || '—'} · {profil.nombre_locations || 0} location(s)
            </Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={styles.ghost}
        onPress={() => choisirPhoto('photo')}
        disabled={uploading === 'photo'}
        accessibilityRole="button"
        accessibilityLabel="Changer la photo de profil"
      >
        {uploading === 'photo'
          ? <ActivityIndicator color={colors.text} />
          : <Text style={styles.ghostText}>Changer la photo</Text>}
      </TouchableOpacity>

      <Section titre="Mon profil">
        {edition ? (
          <>
            {[
              { key: 'nom_complet', label: 'Nom complet', keyboard: 'default' },
              { key: 'telephone', label: 'Téléphone', keyboard: 'phone-pad' },
              { key: 'email', label: 'Email', keyboard: 'email-address' },
              { key: 'cin', label: 'CIN' },
              { key: 'adresse', label: 'Adresse' },
              { key: 'date_expiration_permis', label: 'Expiration permis (JJ/MM/AAAA)' },
            ].map((champ) => (
              <View key={champ.key}>
                <Text style={styles.inputLabel}>{champ.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[champ.key] ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, [champ.key]: v }))}
                  autoCapitalize={champ.key === 'email' || champ.key === 'cin' ? 'none' : 'words'}
                  keyboardType={champ.keyboard || 'default'}
                  accessibilityLabel={champ.label}
                />
              </View>
            ))}
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.cta, { flex: 1, marginRight: 8 }, saving && { opacity: 0.6 }]}
                onPress={enregistrer}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer le profil"
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Enregistrer</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghost, { flex: 1 }]}
                onPress={() => setEdition(false)}
                accessibilityRole="button"
                accessibilityLabel="Annuler l’édition"
              >
                <Text style={styles.ghostText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Info label="Nom complet" valeur={profil.nom_complet} />
            <Info label="Téléphone" valeur={profil.telephone} />
            <Info label="Email" valeur={profil.email} />
            <Info label="CIN" valeur={profil.cin} />
            <Info label="Adresse" valeur={profil.adresse} />
            <TouchableOpacity
              style={styles.edit}
              onPress={demarrerEdition}
              accessibilityRole="button"
              accessibilityLabel="Modifier mon profil"
            >
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      <Section titre="Permis de conduire">
        <View style={styles.ligne}>
          <Text style={styles.ligneLabel}>Statut</Text>
          <View style={[styles.badge, { backgroundColor: `${PERMIS_COLORS[statutPermis] || colors.sub}22` }]}>
            <Text style={[styles.badgeText, { color: PERMIS_COLORS[statutPermis] || colors.sub }]}>
              {PERMIS_LABELS[statutPermis] || statutPermis}
            </Text>
          </View>
        </View>
        {profil.permis_rejet_motif ? (
          <Text style={styles.error}>Motif : {profil.permis_rejet_motif}</Text>
        ) : null}
        <Info label="Document" valeur={profil.permis_conduire ? 'Envoyé' : 'Aucun document'} />
        {profil.date_expiration_permis ? (
          <Info label="Expire le" valeur={formatDate(profil.date_expiration_permis)} />
        ) : null}
        <TouchableOpacity
          style={styles.ghost}
          onPress={() => choisirPhoto('permis')}
          disabled={uploading === 'permis'}
          accessibilityRole="button"
          accessibilityLabel={profil.permis_conduire ? 'Remplacer le permis' : 'Envoyer le permis'}
        >
          {uploading === 'permis'
            ? <ActivityIndicator color={colors.text} />
            : <Text style={styles.ghostText}>{profil.permis_conduire ? 'Remplacer le permis' : 'Envoyer mon permis (photo)'}</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>Un agent valide votre permis avant la première réservation.</Text>
      </Section>

      <Section titre="Mon espace">
        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('MesReservations')}
          accessibilityRole="button"
          accessibilityLabel="Mes réservations"
        >
          <Text style={styles.linkText}>Mes réservations →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Messagerie')}
          accessibilityRole="button"
          accessibilityLabel="Messagerie"
        >
          <Text style={styles.linkText}>Messagerie →</Text>
        </TouchableOpacity>
      </Section>

      <TouchableOpacity
        style={styles.logout}
        onPress={deconnexion}
        accessibilityRole="button"
        accessibilityLabel="Se déconnecter"
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  identite: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarVide: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarInitiales: { color: colors.text, fontSize: 24, fontWeight: '700' },
  nom: { color: colors.text, fontSize: 19, fontWeight: '700' },
  email: { color: colors.sub, fontSize: 13, marginTop: 2 },
  fidelite: { color: colors.warning, fontSize: 12, marginTop: 4 },
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 12 },
  ligneLabel: { color: colors.dim, fontSize: 13 },
  ligneValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  inputLabel: { color: colors.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#0d0d0d', borderColor: colors.border, borderWidth: 1, borderRadius: 10, color: colors.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  row: { flexDirection: 'row', marginTop: 16 },
  cta: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ghostText: { color: colors.text, fontWeight: '600' },
  edit: { alignSelf: 'flex-start', marginTop: 12 },
  editText: { color: colors.info, fontWeight: '700', fontSize: 13 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  error: { color: colors.dangerLight, fontSize: 13, marginTop: 8 },
  hint: { color: colors.dim, fontSize: 12, marginTop: 10 },
  link: { paddingVertical: 10 },
  linkText: { color: colors.info, fontSize: 14, fontWeight: '600' },
  logout: { borderRadius: 12, borderWidth: 1, borderColor: colors.dangerLight, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  logoutText: { color: colors.dangerLight, fontWeight: '700' },
});
