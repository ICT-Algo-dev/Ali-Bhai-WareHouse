import { Suspense, lazy } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import CookieConsentBanner from './components/layout/CookieConsentBanner'
import ScrollToTop from './components/layout/ScrollToTop'
import ProtectedRoute from './admin/ProtectedRoute'
import AdminLayout from './admin/AdminLayout'
import AdminSeo from './admin/AdminSeo'

const Home = lazy(() => import('./pages/Home'))
const Services = lazy(() => import('./pages/Services'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const About = lazy(() => import('./pages/About'))
const CourierPartners = lazy(() => import('./pages/CourierPartners'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'))
const Terms = lazy(() => import('./pages/Terms'))
const Contact = lazy(() => import('./pages/Contact'))
const GetQuote = lazy(() => import('./pages/GetQuote'))
const InventoryIntake = lazy(() => import('./pages/InventoryIntake'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const AdminInquiries = lazy(() => import('./admin/AdminInquiries'))
const AdminInquiryDetail = lazy(() => import('./admin/AdminInquiryDetail'))
const AdminIntakes = lazy(() => import('./admin/AdminIntakes'))
const AdminIntakeDetail = lazy(() => import('./admin/AdminIntakeDetail'))

function AdminNotFound() {
  return (
    <>
      <AdminSeo title="Admin page not found" />
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Admin page not found</h1>
      </div>
    </>
  )
}

function PublicLayout() {
  return (
    <>
      <a href="#main-content" className="sr-only z-[60] rounded-lg bg-white px-4 py-3 text-navy-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content"><Outlet /></main>
      <Footer />
      <CookieConsentBanner />
    </>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <LoaderCircle className="h-8 w-8 animate-spin text-orange-500 motion-reduce:animate-none" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            )}
          >
            <Route index element={<AdminInquiries />} />
            <Route path="inquiries/:id" element={<AdminInquiryDetail />} />
            <Route path="intakes" element={<AdminIntakes />} />
            <Route path="intakes/:id" element={<AdminIntakeDetail />} />
            <Route path="*" element={<AdminNotFound />} />
          </Route>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/courier-partners" element={<CourierPartners />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/get-a-quote" element={<GetQuote />} />
            <Route path="/inventory-intake" element={<InventoryIntake />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
