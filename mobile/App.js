import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Home from './src/screens/Home';
import VehicleDetail from './src/screens/VehicleDetail';
import Login from './src/screens/Login';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0a0a0a', card: '#111', primary: '#dc2626' },
};

export default function App() {
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
