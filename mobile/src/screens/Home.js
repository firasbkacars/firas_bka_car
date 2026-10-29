import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { useAuth } from '../auth';

const FALLBACK = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&q=80';

export default function Home({ navigation }) {
  const { client } = useAuth();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/vehicules')
      .then(({ data }) => setVehicules(data.data || data.vehicules || data || []))
      .catch(() => setError('Impossible de charger le catalogue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate(client ? 'Profil' : 'Login')}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={client ? 'Mon compte' : 'Connexion'}
        >
          <Text style={styles.headerBtnText}>{client ? 'Compte' : 'Connexion'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, client]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#dc2626" size="large" accessibilityLabel="Chargement du catalogue" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Connexion"
        >
          <Text style={styles.ctaText}>Connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: '#0a0a0a' }}
      data={vehicules}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const photo = item.photos?.[0];
        const uri = photo && !photo.startsWith('http') && !photo.startsWith('/')
          ? `https://firasbkacar.com/storage/${photo}`
          : (photo || FALLBACK);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('VehicleDetail', { id: item.id })}
            accessibilityRole="button"
            accessibilityLabel={`Voir le véhicule ${item.marque} ${item.modele}, ${item.prix_jour} DH par jour`}
          >
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.marque} {item.modele}</Text>
              <Text style={styles.sub}>{item.annee} · {item.categorie}</Text>
              <Text style={styles.price}>{item.prix_jour} DH/jour</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#999', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#111', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  image: { width: '100%', height: 180 },
  cardBody: { padding: 14 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sub: { color: '#777', fontSize: 12, marginTop: 2 },
  price: { color: '#dc2626', fontSize: 16, fontWeight: '700', marginTop: 6 },
  cta: { backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#fff', fontWeight: '600' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  headerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
