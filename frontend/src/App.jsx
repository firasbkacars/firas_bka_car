import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ScrollToTop from './components/ScrollToTop'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Services from './pages/Services'
import APropos from './pages/APropos'
import Contact from './pages/Contact'
import Vehicules from './pages/Vehicules'
import VehiculeDetail from './pages/VehiculeDetail'
import Compare from './pages/Compare'
import Finalisation from './pages/Finalisation'
import Confirmation from './pages/Confirmation'
import ClientLogin from './pages/client/Login'
import ClientRegister from './pages/client/Register'
import ClientProfil from './pages/client/Profil'
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminReservations from './pages/admin/Reservations'
import AdminVehicules from './pages/admin/Vehicules'
import AdminClients from './pages/admin/Clients'
import AdminCalendrier from './pages/admin/Calendrier'
import AdminPaiements from './pages/admin/Paiements'
import AdminRapports from './pages/admin/Rapports'
import AdminAvis from './pages/admin/Avis'
import AdminMaintenances from './pages/admin/Maintenances'
import AdminParametres from './pages/admin/Parametres'
import AdminCodesPromo from './pages/admin/CodesPromo'
import AdminAgences from './pages/admin/Agences'
import AdminEtatsLieux from './pages/admin/EtatsLieux'
import AdminLayout from './components/admin/AdminLayout'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<><Header /><Home /><Footer /></>} />
        <Route path="/services" element={<><Header /><Services /><Footer /></>} />
        <Route path="/a-propos" element={<><Header /><APropos /><Footer /></>} />
        <Route path="/contact" element={<><Header /><Contact /><Footer /></>} />
        <Route path="/vehicules" element={<><Header /><Vehicules /><Footer /></>} />
        <Route path="/vehicules/compare" element={<><Header /><Compare /><Footer /></>} />
        <Route path="/vehicules/:id" element={<><Header /><VehiculeDetail /><Footer /></>} />
        <Route path="/reservation/:vehiculeId" element={<><Header /><Finalisation /><Footer /></>} />
        <Route path="/confirmation" element={<><Header /><Confirmation /><Footer /></>} />

        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/register" element={<ClientRegister />} />
        <Route path="/client/profil" element={<><Header /><ClientProfil /><Footer /></>} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="vehicules" element={<AdminVehicules />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="calendrier" element={<AdminCalendrier />} />
          <Route path="paiements" element={<AdminPaiements />} />
          <Route path="rapports" element={<AdminRapports />} />
          <Route path="maintenances" element={<AdminMaintenances />} />
          <Route path="avis" element={<AdminAvis />} />
          <Route path="codes-promo" element={<AdminCodesPromo />} />
          <Route path="agences" element={<AdminAgences />} />
          <Route path="etats-lieux" element={<AdminEtatsLieux />} />
          <Route path="parametres" element={<AdminParametres />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
