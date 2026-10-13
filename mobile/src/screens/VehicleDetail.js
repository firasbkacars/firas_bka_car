import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';

const FALLBACK = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

export default function VehicleDetail({ route }) {
  const { id } = route.params;
  const [vehicule, setVehicule] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/vehicules/${id}`)
      .then(({ data }) => setVehicule(data))
      .catch(() => setError('Véhicule introuvable'));
  }, [id]);

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
        <ActivityIndicator color="#dc2626" size="large" />
      </View>
    );
  }

  const photo = vehicule.photos?.[0];
  const uri = photo && !photo.startsWith('http') && !photo.startsWith('/')
    ? `https://firasbkacar.fly.dev/storage/${photo}`
    : (photo || FALLBACK);

  return (
    <ScrollView style={{ backgroundColor: '#0a0a0a' }}>
      <Image source={{ uri }} style={styles.image} />
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{vehicule.marque} {vehicule.modele}</Text>
        <Text style={styles.price}>{vehicule.prix_jour} DH / jour</Text>
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
});
