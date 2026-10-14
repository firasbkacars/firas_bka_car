import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import api from '../api';
import { colors } from '../theme';
import { formatMAD } from '../utils/date';

export default function Confirmation({ navigation, route }) {
  const { numero, reservationId, modePaiement, montantAcompte } = route.params || {};
  const [paiementStatut, setPaiementStatut] = useState(modePaiement === 'cmi' ? 'en_cours' : null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (modePaiement !== 'cmi' || !reservationId) return undefined;

    const init = async () => {
      try {
        const { data } = await api.post('/client/payments/cmi/initialize', { reservation_id: reservationId });
        if (data.payment_url) {
          await WebBrowser.openBrowserAsync(data.payment_url);
        }
        pollRef.current = setInterval(async () => {
          try {
            const st = await api.get(`/client/payments/cmi/status/${data.transaction_id}`);
            if (st.data.paid) {
              clearInterval(pollRef.current);
              setPaiementStatut('paye');
            } else if (st.data.status === 'echoue' || st.data.status === 'annule') {
              clearInterval(pollRef.current);
              setPaiementStatut('echoue');
            }
          } catch {}
        }, 5000);
      } catch (err) {
        setPaiementStatut('echoue');
      }
    };
    init();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [modePaiement, reservationId]);

  const enCours = paiementStatut === 'en_cours';

  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityElementsHidden>
        {paiementStatut === 'paye' ? '✓' : enCours ? '⏳' : modePaiement === 'cmi' && paiementStatut === 'echoue' ? '!' : '✓'}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {enCours ? 'Paiement en cours…' : paiementStatut === 'echoue' ? 'Paiement non confirmé' : 'Réservation confirmée'}
      </Text>
      {numero ? <Text style={styles.numero}>N° {numero}</Text> : null}
      {montantAcompte != null ? (
        <Text style={styles.sub}>
          Acompte : {formatMAD(montantAcompte)}
          {modePaiement === 'especes' ? ' — à régler à la livraison' : ''}
        </Text>
      ) : null}
      {enCours ? (
        <Text style={styles.sub}>
          Finalisez le paiement dans la fenêtre bancaire. Cette page se met à jour automatiquement.
        </Text>
      ) : null}
      {paiementStatut === 'echoue' ? (
        <Text style={[styles.sub, { color: colors.dangerLight }]}>
          Le paiement CMI n'a pas abouti. Votre réservation reste enregistrée : vous pouvez payer en espèces à la livraison ou réessayer depuis votre espace.
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.replace('MesReservations')}
        accessibilityRole="button"
        accessibilityLabel="Voir mes réservations"
      >
        <Text style={styles.ctaText}>Mes réservations</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.ctaGhost}
        onPress={() => navigation.popToTop()}
        accessibilityRole="button"
        accessibilityLabel="Retour au catalogue"
      >
        <Text style={styles.ctaGhostText}>Retour au catalogue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 52, marginBottom: 12, color: colors.success },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  numero: { color: colors.dangerLight, fontSize: 16, fontWeight: '700', marginTop: 8 },
  sub: { color: colors.sub, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  cta: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 28 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ctaGhost: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 10, borderWidth: 1, borderColor: colors.border },
  ctaGhostText: { color: colors.sub, fontWeight: '600', fontSize: 15 },
});
