import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { parseDate, toISO, joursEntre, formatMAD } from '../utils/date';

export default function ReservationForm({ navigation, route }) {
  const { vehiculeId, vehicule: vehiculeInitial } = route.params || {};
  const { client } = useAuth();

  const [vehicule, setVehicule] = useState(vehiculeInitial || null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [lieuPrise, setLieuPrise] = useState('');
  const [lieuRetour, setLieuRetour] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [codePromo, setCodePromo] = useState('');
  const [notes, setNotes] = useState('');
  const [tauxAcompte, setTauxAcompte] = useState(30);
  const [error, setError] = useState(null);
  const [permisError, setPermisError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehiculeInitial && vehiculeId) {
      api.get(`/vehicules/${vehiculeId}`).then(({ data }) => setVehicule(data)).catch(() => setError('Véhicule introuvable'));
    }
  }, [vehiculeId, vehiculeInitial]);

  useEffect(() => {
    api.get('/parametres').then(({ data }) => {
      const arr = Array.isArray(data) ? data : data?.data || [];
      const p = arr.find((x) => x.cle === 'taux_acompte');
      if (p) setTauxAcompte(Number(p.valeur) || 30);
    }).catch(() => {});
  }, []);

  const jours = useMemo(() => joursEntre(parseDate(dateDebut), parseDate(dateFin)), [dateDebut, dateFin]);
  const prixTotal = vehicule ? Math.max(jours, 0) * Number(vehicule.prix_jour || 0) : 0;
  const acompte = Math.round(prixTotal * (tauxAcompte / 100) * 100) / 100;

  const submit = async () => {
    setError(null);
    setPermisError(false);

    const d1 = parseDate(dateDebut);
    const d2 = parseDate(dateFin);
    if (!d1 || !d2) return setError('Dates invalides (format JJ/MM/AAAA).');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d1 <= today) return setError('La date de prise en charge doit être dans le futur.');
    if (d2 <= d1) return setError('La date de retour doit être après la prise en charge.');
    if (!lieuPrise.trim()) return setError('Le lieu de prise en charge est obligatoire.');
    if (!lieuRetour.trim()) return setError('Le lieu de retour est obligatoire.');

    setLoading(true);
    try {
      const payload = {
        vehicule_id: vehiculeId,
        date_debut: toISO(d1),
        date_fin: toISO(d2),
        lieu_prise: lieuPrise.trim(),
        lieu_retour: lieuRetour.trim(),
        mode_paiement: modePaiement,
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (codePromo.trim()) payload.code_promo = codePromo.trim().toUpperCase();

      const { data: reservation } = await api.post('/reservations', payload);

      if (modePaiement === 'cmi') {
        navigation.replace('Confirmation', {
          numero: reservation.numero,
          reservationId: reservation.id,
          modePaiement: 'cmi',
          montantAcompte: reservation.acompte,
        });
      } else {
        navigation.replace('Confirmation', {
          numero: reservation.numero,
          modePaiement: 'especes',
          montantAcompte: reservation.acompte,
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'La réservation a échoué.';
      if (status === 401) {
        navigation.navigate('Login', {
          returnTo: { name: 'ReservationForm', params: { vehiculeId, vehicule } },
        });
        return;
      }
      if (/permis/i.test(message)) {
        setPermisError(true);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!vehicule && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.danger} size="large" accessibilityLabel="Chargement du véhicule" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {vehicule ? (
          <Text style={styles.summary}>
            {vehicule.marque} {vehicule.modele} — {formatMAD(vehicule.prix_jour)}/jour
          </Text>
        ) : null}

        <Text style={styles.label}>Date de prise en charge (JJ/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          placeholder="20/10/2026"
          placeholderTextColor={colors.dim}
          value={dateDebut}
          onChangeText={setDateDebut}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Date de prise en charge"
        />

        <Text style={styles.label}>Date de retour (JJ/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          placeholder="25/10/2026"
          placeholderTextColor={colors.dim}
          value={dateFin}
          onChangeText={setDateFin}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Date de retour"
        />

        <Text style={styles.label}>Lieu de prise en charge</Text>
        <TextInput
          style={styles.input}
          placeholder="Aéroport de Tanger"
          placeholderTextColor={colors.dim}
          value={lieuPrise}
          onChangeText={setLieuPrise}
          accessibilityLabel="Lieu de prise en charge"
        />

        <Text style={styles.label}>Lieu de retour</Text>
        <TextInput
          style={styles.input}
          placeholder="Aéroport de Tanger"
          placeholderTextColor={colors.dim}
          value={lieuRetour}
          onChangeText={setLieuRetour}
          accessibilityLabel="Lieu de retour"
        />

        <Text style={styles.label}>Mode de paiement</Text>
        <View style={styles.row}>
          {[
            { value: 'especes', label: 'Espèces à la livraison' },
            { value: 'cmi', label: 'Carte bancaire (CMI)' },
          ].map((opt) => {
            const selected = modePaiement === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setModePaiement(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.label}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Code promo (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="EX: RAMADAN10"
          placeholderTextColor={colors.dim}
          autoCapitalize="characters"
          value={codePromo}
          onChangeText={setCodePromo}
          accessibilityLabel="Code promo"
        />

        <Text style={styles.label}>Notes (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Demande particulière…"
          placeholderTextColor={colors.dim}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Notes"
        />

        {jours > 0 && vehicule ? (
          <View style={styles.recap} accessibilityLabel="Récapitulatif du prix">
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>{jours} jour{jours > 1 ? 's' : ''} × {formatMAD(vehicule.prix_jour)}</Text>
              <Text style={styles.recapValue}>{formatMAD(prixTotal)}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Acompte estimé ({tauxAcompte}%)</Text>
              <Text style={[styles.recapValue, { color: colors.dangerLight }]}>{formatMAD(acompte)}</Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            {permisError ? (
              <TouchableOpacity
                style={styles.link}
                onPress={() => navigation.navigate('Profil')}
                accessibilityRole="button"
                accessibilityLabel="Aller à mon profil pour le permis"
              >
                <Text style={styles.linkText}>Mettre à jour mon permis →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.cta, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Confirmer la réservation"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading
            ? <ActivityIndicator color="#fff" accessibilityLabel="Réservation en cours" />
            : <Text style={styles.ctaText}>Réserver</Text>}
        </TouchableOpacity>

        {!client ? (
          <Text style={styles.hint}>Vous devez être connecté pour réserver.</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 40 },
  summary: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  label: { color: colors.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipSelected: { borderColor: colors.danger, backgroundColor: 'rgba(220,38,38,0.12)' },
  chipText: { color: colors.sub, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.text },
  recap: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 20 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  recapLabel: { color: colors.sub, fontSize: 14 },
  recapValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  errorBox: { marginTop: 16 },
  error: { color: colors.dangerLight, fontSize: 13, marginBottom: 6 },
  link: { marginTop: 4 },
  linkText: { color: colors.info, fontSize: 13, fontWeight: '600' },
  cta: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: colors.dim, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
