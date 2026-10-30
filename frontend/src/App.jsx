import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
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
import NotFound from './pages/NotFound'

/**
 * Découpage par route : les pages publiques restent chargées immédiatement
 * (aucun décalage de mise en page), tandis que l'administration, ses
 * graphiques et les parcours transactionnels arrivent à la demande.
 */
const Finalisation = lazy(() => import('./pages/Finalisation'))
const Confirmation = lazy(() => import('./pages/Confirmation'))
const PaiementAcompte = lazy(() => import('./pages/PaiementAcompte'))
const PaiementRetour = lazy(() => import('./pages/PaiementRetour'))
const ClientLogin = lazy(() => import('./pages/client/Login'))
const ClientRegister = lazy(() => import('./pages/client/Register'))
const ClientActiverCompte = lazy(() => import('./pages/client/ActiverCompte'))
const ClientActiverCompteToken = lazy(() => import('./pages/client/ActiverCompteToken'))
const ClientProfil = lazy(() => import('./pages/client/Profil'))
const ClientTableauDeBord = lazy(() => import('./pages/client/TableauDeBord'))
const ClientMessagerie = lazy(() => import('./pages/client/Messagerie'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminReservations = lazy(() => import('./pages/admin/Reservations'))
const AdminVehicules = lazy(() => import('./pages/admin/Vehicules'))
const AdminClients = lazy(() => import('./pages/admin/Clients'))
const AdminCalendrier = lazy(() => import('./pages/admin/Calendrier'))
const AdminPaiements = lazy(() => import('./pages/admin/Paiements'))
const AdminRapports = lazy(() => import('./pages/admin/Rapports'))
const AdminAvis = lazy(() => import('./pages/admin/Avis'))
const AdminMaintenances = lazy(() => import('./pages/admin/Maintenances'))
const AdminParametres = lazy(() => import('./pages/admin/Parametres'))
const AdminCodesPromo = lazy(() => import('./pages/admin/CodesPromo'))
const AdminAgences = lazy(() => import('./pages/admin/Agences'))
const AdminEtatsLieux = lazy(() => import('./pages/admin/EtatsLieux'))
const AdminContratsFournisseurs = lazy(() => import('./pages/admin/ContratsFournisseurs'))
const AdminMessages = lazy(() => import('./pages/admin/Messages'))

function PageFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden="true" />
      <span className="sr-only">{t('chargement')}</span>
    </div>
  )
}

/** Pages publiques : header et footer restent stables pendant le chargement. */
function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
      <Footer />
    </>
  )
}

/** Pages sans chrome (login, register, admin) : simple frontière Suspense. */
function BareLayout({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

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
          <Route path="/reservation/:vehiculeId" element={<PublicLayout><Finalisation /></PublicLayout>} />
          <Route path="/confirmation" element={<PublicLayout><Confirmation /></PublicLayout>} />
          <Route path="/paiement/acompte/:numero" element={<PublicLayout><PaiementAcompte /></PublicLayout>} />
          <Route path="/paiement/retour" element={<PublicLayout><PaiementRetour /></PublicLayout>} />

          <Route path="/client/login" element={<BareLayout><ClientLogin /></BareLayout>} />
          <Route path="/client/register" element={<BareLayout><ClientRegister /></BareLayout>} />
          <Route path="/client/activer" element={<BareLayout><ClientActiverCompte /></BareLayout>} />
          <Route path="/client/activer/:token" element={<BareLayout><ClientActiverCompteToken /></BareLayout>} />
          <Route path="/client/profil" element={<PublicLayout><ClientProfil /></PublicLayout>} />
          <Route path="/client/tableau-de-bord" element={<PublicLayout><ClientTableauDeBord /></PublicLayout>} />
          <Route path="/client/messagerie" element={<PublicLayout><ClientMessagerie /></PublicLayout>} />

          <Route path="/admin/login" element={<BareLayout><AdminLogin /></BareLayout>} />
          <Route path="/admin" element={<BareLayout><AdminLayout /></BareLayout>}>
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
