import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { colors, STATUS_COLORS, STATUS_LABELS } from '../theme';
import { formatDate, formatMAD } from '../utils/date';

export default function MesReservations({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/client/reservations');
      setReservations(Array.isArray(data) ? data : data?.data || []);
      setError(null);
    } catch {
      setError('Impossible de charger vos réservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.danger} size="large" accessibilityLabel="Chargement des réservations" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={charger} accessibilityRole="button" accessibilityLabel="Réessayer">
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={reservations}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            charger();
          }}
          tintColor={colors.danger}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune réservation pour le moment.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const vehicule = item.vehicule;
        const statut = item.statut || 'confirmee';
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ReservationDetail', { reservation: item })}
            accessibilityRole="button"
            accessibilityLabel={`Réservation ${item.numero}, ${vehicule ? `${vehicule.marque} ${vehicule.modele}, ` : ''}${STATUS_LABELS[statut] || statut}`}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>
                {vehicule ? `${vehicule.marque} ${vehicule.modele}` : `Réservation ${item.numero}`}
              </Text>
              <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[statut] || colors.sub}22` }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[statut] || colors.sub }]}>
                  {STATUS_LABELS[statut] || statut}
                </Text>
              </View>
            </View>
            <Text style={styles.sub}>N° {item.numero}</Text>
            <Text style={styles.dates}>
              {formatDate(item.date_debut)} → {formatDate(item.date_fin)}
            </Text>
            <Text style={styles.price}>{formatMAD(item.prix_total)}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#999', marginBottom: 16, textAlign: 'center' },
  empty: { color: colors.dim, textAlign: 'center' },
  retry: { backgroundColor: colors.danger, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sub: { color: colors.dim, fontSize: 12, marginTop: 6 },
  dates: { color: colors.sub, fontSize: 13, marginTop: 4 },
  price: { color: colors.dangerLight, fontSize: 15, fontWeight: '700', marginTop: 6 },
});
