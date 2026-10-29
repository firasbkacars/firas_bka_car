import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { applySeo, isPrivatePath, ogLocale } from './lib/seo'
import { AuthProvider } from './context/AuthContext'
import { FavorisProvider } from './context/FavorisContext'
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
import PaiementAcompte from './pages/PaiementAcompte'
import PaiementRetour from './pages/PaiementRetour'
import ClientLogin from './pages/client/Login'
import ClientRegister from './pages/client/Register'
import ClientActiverCompte from './pages/client/ActiverCompte'
import ClientActiverCompteToken from './pages/client/ActiverCompteToken'
import ClientProfil from './pages/client/Profil'
import ClientTableauDeBord from './pages/client/TableauDeBord'
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
import AdminContratsFournisseurs from './pages/admin/ContratsFournisseurs'
import AdminMessages from './pages/admin/Messages'
import ClientMessagerie from './pages/client/Messagerie'
import AdminLayout from './components/admin/AdminLayout'
import NotFound from './pages/NotFound'

/**
 * Les pages publiques posent elles-mêmes leurs métadonnées. Ce garde-fou
 * couvre les routes privées (admin, client, réservation, paiement), qui
 * n'ont pas de composant SEO et ne doivent jamais être indexées.
 */
function PrivateSeoGuard() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    if (!isPrivatePath(pathname)) return

    applySeo({
      title: t('seo.private.titre'),
      description: t('seo.private.description'),
      canonical: null,
      robots: 'noindex, nofollow',
      image: null,
      locale: ogLocale(i18n.language),
    })
  }, [pathname, t, i18n.language])

  return null
}

function App() {
  const { t } = useTranslation()

  return (
    <AuthProvider>
      <FavorisProvider>
        <a href="#main-content" className="skip-link">{t('header.allerContenu')}</a>
        <ScrollToTop />
        <PrivateSeoGuard />
        <main id="main-content" tabIndex={-1}>
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
          <Route path="/paiement/acompte/:numero" element={<><Header /><PaiementAcompte /><Footer /></>} />
          <Route path="/paiement/retour" element={<><Header /><PaiementRetour /><Footer /></>} />

          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/register" element={<ClientRegister />} />
          <Route path="/client/activer" element={<ClientActiverCompte />} />
          <Route path="/client/activer/:token" element={<ClientActiverCompteToken />} />
          <Route path="/client/profil" element={<><Header /><ClientProfil /><Footer /></>} />
          <Route path="/client/tableau-de-bord" element={<><Header /><ClientTableauDeBord /><Footer /></>} />
          <Route path="/client/messagerie" element={<><Header /><ClientMessagerie /><Footer /></>} />

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
            <Route path="messages" element={<AdminMessages />} />
            <Route path="contrats-fournisseurs" element={<AdminContratsFournisseurs />} />
            <Route path="codes-promo" element={<AdminCodesPromo />} />
            <Route path="agences" element={<AdminAgences />} />
            <Route path="etats-lieux" element={<AdminEtatsLieux />} />
            <Route path="parametres" element={<AdminParametres />} />
          </Route>
          <Route path="*" element={<><Header /><NotFound /><Footer /></>} />
          </Routes>
        </main>
      </FavorisProvider>
    </AuthProvider>
  )
}

export default App
