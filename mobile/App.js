import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/auth';
import Home from './src/screens/Home';
import VehicleDetail from './src/screens/VehicleDetail';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import ReservationForm from './src/screens/ReservationForm';
import Confirmation from './src/screens/Confirmation';
import MesReservations from './src/screens/MesReservations';
import ReservationDetail from './src/screens/ReservationDetail';
import Profil from './src/screens/Profil';
import Messagerie from './src/screens/Messagerie';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0a0a0a', card: '#111', primary: '#dc2626' },
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#111' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#0a0a0a' },
          }}
        >
          <Stack.Screen name="Home" component={Home} options={{ title: 'FIRAS BKA CAR' }} />
          <Stack.Screen name="VehicleDetail" component={VehicleDetail} options={{ title: 'Détails' }} />
          <Stack.Screen name="Login" component={Login} options={{ title: 'Connexion' }} />
          <Stack.Screen name="Register" component={Register} options={{ title: 'Inscription' }} />
          <Stack.Screen name="ReservationForm" component={ReservationForm} options={{ title: 'Réserver' }} />
          <Stack.Screen
            name="Confirmation"
            component={Confirmation}
            options={{ title: 'Confirmation', headerBackVisible: false }}
          />
          <Stack.Screen name="MesReservations" component={MesReservations} options={{ title: 'Mes réservations' }} />
          <Stack.Screen name="ReservationDetail" component={ReservationDetail} options={{ title: 'Réservation' }} />
          <Stack.Screen name="Profil" component={Profil} options={{ title: 'Mon compte' }} />
          <Stack.Screen name="Messagerie" component={Messagerie} options={{ title: 'Messagerie' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
