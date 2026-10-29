import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { useAuth } from '../auth';
import { formatMAD } from '../utils/date';

const FALLBACK = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

export default function VehicleDetail({ navigation, route }) {
  const { id } = route.params;
  const { client } = useAuth();
  const [vehicule, setVehicule] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/vehicules/${id}`)
      .then(({ data }) => setVehicule(data))
      .catch(() => setError('Véhicule introuvable'));
  }, [id]);

  const reserver = () => {
    if (!client) {
      navigation.navigate('Login', {
        returnTo: { name: 'ReservationForm', params: { vehiculeId: id, vehicule } },
      });
      return;
    }
    navigation.navigate('ReservationForm', { vehiculeId: id, vehicule });
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#999' }}>{error}</Text>
      </View>
    );
  }

  if (!vehicule) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#dc2626" size="large" accessibilityLabel="Chargement du véhicule" />
      </View>
    );
  }

  const photo = vehicule.photos?.[0];
  const uri = photo && !photo.startsWith('http') && !photo.startsWith('/')
    ? `https://firasbkacar.com/storage/${photo}`
    : (photo || FALLBACK);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Image
        source={{ uri }}
        style={styles.image}
        accessibilityLabel={`Photo du véhicule ${vehicule.marque} ${vehicule.modele}`}
      />
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{vehicule.marque} {vehicule.modele}</Text>
        <Text style={styles.price}>{formatMAD(vehicule.prix_jour)} / jour</Text>
        <Text style={styles.label}>Catégorie</Text>
        <Text style={styles.value}>{vehicule.categorie}</Text>
        <Text style={styles.label}>Transmission</Text>
        <Text style={styles.value}>{vehicule.transmission}</Text>
        <Text style={styles.label}>Carburant</Text>
        <Text style={styles.value}>{vehicule.carburant}</Text>
        <Text style={styles.label}>Places</Text>
        <Text style={styles.value}>{vehicule.places}</Text>
        {vehicule.description ? (
          <>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{vehicule.description}</Text>
          </>
        ) : null}

        <TouchableOpacity
          style={styles.cta}
          onPress={reserver}
          accessibilityRole="button"
          accessibilityLabel={`Réserver ${vehicule.marque} ${vehicule.modele}`}
        >
          <Text style={styles.ctaText}>Réserver</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 260 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  price: { color: '#dc2626', fontSize: 20, fontWeight: '700', marginTop: 4, marginBottom: 16 },
  label: { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 },
  value: { color: '#eee', fontSize: 15, marginTop: 2 },
  cta: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
