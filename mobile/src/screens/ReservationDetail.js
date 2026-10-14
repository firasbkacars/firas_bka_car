import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import api from '../api';
import { colors, STATUS_COLORS, STATUS_LABELS } from '../theme';
import { formatDate, formatMAD } from '../utils/date';

function Ligne({ label, valeur }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneValue}>{valeur}</Text>
    </View>
  );
}

export default function ReservationDetail({ navigation, route }) {
  const [reservation, setReservation] = useState(route.params?.reservation || null);
  const [annulationEnCours, setAnnulationEnCours] = useState(false);

  if (!reservation) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#999' }}>Réservation introuvable</Text>
      </View>
    );
  }

  const statut = reservation.statut || 'confirmee';
  const annulable = ['confirmee', 'en_cours'].includes(statut);
  const vehicule = reservation.vehicule;

  const annuler = () => {
    Alert.alert(
      'Annuler la réservation',
      'Vérifiez la politique d’annulation ci-dessous avant de confirmer.',
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Voir la politique',
          onPress: async () => {
            try {
              const { data } = await api.get(`/client/reservations/${reservation.id}/annulation-preview`);
              if (!data.annulable) {
                Alert.alert('Annulation impossible', 'Cette réservation ne peut plus être annulée.');
                return;
              }
              Alert.alert(
                'Politique d’annulation',
                `${data.politique}\n\nRemboursement estimé : ${formatMAD(data.montant_rembourse)}`,
                [
                  { text: 'Retour', style: 'cancel' },
                  {
                    text: 'Annuler la réservation',
                    style: 'destructive',
                    onPress: () => confirmerAnnulation(),
                  },
                ],
              );
            } catch {
              Alert.alert('Erreur', 'Impossible de récupérer la politique d’annulation.');
            }
          },
        },
      ],
    );
  };

  const confirmerAnnulation = async () => {
    setAnnulationEnCours(true);
    try {
      const { data } = await api.put(`/client/reservations/${reservation.id}/annuler`);
      setReservation(data.reservation);
      Alert.alert('Réservation annulée', `Remboursement : ${formatMAD(data.montant_rembourse)} (${data.politique})`);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Annulation impossible.');
    } finally {
      setAnnulationEnCours(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Text style={styles.numero}>N° {reservation.numero}</Text>
        <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[statut] || colors.sub}22` }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[statut] || colors.sub }]}>
            {STATUS_LABELS[statut] || statut}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {vehicule ? (
          <Text style={styles.vehicule}>{vehicule.marque} {vehicule.modele}</Text>
        ) : null}
        <Ligne label="Prise en charge" valeur={formatDate(reservation.date_debut)} />
        <Ligne label="Retour" valeur={formatDate(reservation.date_fin)} />
        <Ligne label="Lieu de prise en charge" valeur={reservation.lieu_prise || '—'} />
        <Ligne label="Lieu de retour" valeur={reservation.lieu_retour || '—'} />
        {reservation.agence ? <Ligne label="Agence" valeur={reservation.agence.nom} /> : null}
      </View>

      <View style={styles.card}>
        <Ligne label="Prix total" valeur={formatMAD(reservation.prix_total)} />
        <Ligne label="Acompte" valeur={formatMAD(reservation.acompte)} />
        <Ligne label="Caution" valeur={formatMAD(reservation.montant_caution)} />
        <Ligne label="Mode de paiement" valeur={reservation.mode_paiement === 'cmi' ? 'Carte bancaire (CMI)' : 'Espèces'} />
        {reservation.code_promo ? <Ligne label="Code promo" valeur={`${reservation.code_promo} (-${formatMAD(reservation.remise)})`} /> : null}
      </View>

      {reservation.notes ? (
        <View style={styles.card}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notes}>{reservation.notes}</Text>
        </View>
      ) : null}

      {annulable ? (
        <TouchableOpacity
          style={[styles.cancel, annulationEnCours && { opacity: 0.6 }]}
          onPress={annuler}
          disabled={annulationEnCours}
          accessibilityRole="button"
          accessibilityLabel="Annuler cette réservation"
          accessibilityState={{ disabled: annulationEnCours }}
        >
          <Text style={styles.cancelText}>Annuler la réservation</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  numero: { color: colors.text, fontSize: 18, fontWeight: '700' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  vehicule: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  ligneLabel: { color: colors.dim, fontSize: 13, flexShrink: 1 },
  ligneValue: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  notesLabel: { color: colors.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  notes: { color: colors.sub, fontSize: 14, lineHeight: 20 },
  cancel: { borderRadius: 12, borderWidth: 1, borderColor: colors.dangerLight, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  cancelText: { color: colors.dangerLight, fontWeight: '700' },
});
