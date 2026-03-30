import React from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CommuterDashboard from './pages/commuter/commuterDashboard';
import HomePage from './pages/HomePage';
import { LandingPage } from './pages/public/LandingPage';
import Layout from './pages/Layout';
import { RequireRole, RedirectByRole } from './components/RouteGuards';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ScheduleDetails from './pages/ScheduleDetails';
import AdminDashboard from './pages/admin/AdminDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverScannerPage from './pages/driver/DriverScannerPage';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import CompanyLayout from './layouts/CompanyLayout';
import CommuterLayout from './layouts/CommuterLayout';
import DriverLayout from './layouts/DriverLayout';
import CompanyDashboard from './pages/company/CompanyDashboard';
import TailwindExample from './components/TailwindExample';
import { Schedules } from './pages/commuter/schedules';
import ReportsPage from './pages/ReportsPage';
import DriverTracking from './pages/company/DriverTracking';
import FirstLoginChange from './pages/FirstLoginChange';
import AccountSettings from './pages/account/AccountSettings';
import PaymentPage from './pages/commuter/PaymentPage';
import SeatMapPage from './pages/commuter/SeatMapPage';
import SearchBusPage from './pages/commuter/SearchBusPage';
import BookingSuccessPage from './pages/commuter/BookingSuccessPage';
import TrackBusPage from './pages/commuter/TrackBusPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ProfilePage from './pages/user/ProfilePage';
import CompanyVerificationsPage from './pages/admin/CompanyVerificationsPage';
import SubscriptionRequestsPage from './pages/admin/SubscriptionRequestsPage';
import CommutersPage from './pages/why-safaritix/CommutersPage';
import CompaniesPage from './pages/why-safaritix/CompaniesPage';
import DriversPage from './pages/why-safaritix/DriversPage';
import BusTrackingPage from './pages/solutions/BusTrackingPage';
import TicketingSystemPage from './pages/solutions/TicketingSystemPage';
import SubscriptionManagementPage from './pages/solutions/SubscriptionManagementPage';
import DriverAppPage from './pages/solutions/DriverAppPage';
import CompanyDashboardPage from './pages/solutions/CompanyDashboardPage';
import DocumentationPage from './pages/resources/DocumentationPage';
import BlogPage from './pages/resources/BlogPage';
import ResourceHelpCenterPage from './pages/resources/HelpCenterPage';
import APIReferencePage from './pages/resources/APIReferencePage';
import PricingPage from './pages/pricing/PricingPage';
import AboutUsPage from './pages/footer/AboutUsPage';
import PopularRoutesPage from './pages/footer/PopularRoutesPage';
import BusOperatorsPage from './pages/footer/BusOperatorsPage';
import CareersPage from './pages/footer/CareersPage';
import HelpCenterFooterPage from './pages/footer/HelpCenterPage';
import FAQsPage from './pages/footer/FAQsPage';
import ContactUsPage from './pages/footer/ContactUsPage';
import CancellationPolicyPage from './pages/footer/CancellationPolicyPage';
import TermsOfServicePage from './pages/footer/TermsOfServicePage';
import PrivacyPolicyPage from './pages/footer/PrivacyPolicyPage';
import CookiePolicyPage from './pages/footer/CookiePolicyPage';
import AccessibilityPage from './pages/footer/AccessibilityPage';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page as default home */}
            <Route path='/' element={<LandingPage />} />
            <Route path='/why-safaritix/commuters' element={<CommutersPage />} />
            <Route path='/why-safaritix/companies' element={<CompaniesPage />} />
            <Route path='/why-safaritix/drivers' element={<DriversPage />} />
            <Route path='/solutions/bus-tracking' element={<BusTrackingPage />} />
            <Route path='/solutions/ticketing-system' element={<TicketingSystemPage />} />
            <Route path='/solutions/subscription-management' element={<SubscriptionManagementPage />} />
            <Route path='/solutions/driver-app' element={<DriverAppPage />} />
            <Route path='/solutions/company-dashboard' element={<CompanyDashboardPage />} />
            <Route path='/resources/documentation' element={<DocumentationPage />} />
            <Route path='/resources/blog' element={<BlogPage />} />
            <Route path='/resources/help-center' element={<ResourceHelpCenterPage />} />
            <Route path='/resources/api-reference' element={<APIReferencePage />} />
            <Route path='/pricing' element={<PricingPage />} />
            <Route path='/about' element={<AboutUsPage />} />
            <Route path='/routes' element={<PopularRoutesPage />} />
            <Route path='/operators' element={<BusOperatorsPage />} />
            <Route path='/careers' element={<CareersPage />} />
            <Route path='/help-center' element={<HelpCenterFooterPage />} />
            <Route path='/faqs' element={<FAQsPage />} />
            <Route path='/contact' element={<ContactUsPage />} />
            <Route path='/cancellation-policy' element={<CancellationPolicyPage />} />
            <Route path='/terms' element={<TermsOfServicePage />} />
            <Route path='/privacy' element={<PrivacyPolicyPage />} />
            <Route path='/cookies' element={<CookiePolicyPage />} />
            <Route path='/accessibility' element={<AccessibilityPage />} />

            {/* Other routes wrapped in Layout */}
            <Route path='/app' element={<Layout />}>
              <Route index element={<RedirectByRole><HomePage /></RedirectByRole>} />
              <Route path='login' element={<LoginPage />} />
              <Route path='signup' element={<SignupPage />} />
              <Route path='schedules/:id' element={<ScheduleDetails />} />
              <Route path='*' element={<NotFound />} />
            </Route>

            {/* Dashboard routes - new layouts */}
            <Route path='/dashboard' element={<Layout />}>
              <Route path='admin' element={<RequireRole allowed={["admin"]}><AdminLayout/></RequireRole>}>
                <Route index element={<AdminDashboard/>} />
                <Route path='company-verifications' element={<CompanyVerificationsPage/>} />
                <Route path='subscription-requests' element={<SubscriptionRequestsPage/>} />
              </Route>

              <Route path='company' element={<RequireRole allowed={["company_admin"]}><CompanyLayout/></RequireRole>}>
                <Route index element={<CompanyDashboard/>} />
                <Route path='subscription' element={<CompanyDashboard/>} />
              </Route>

              <Route path='commuter' element={<RequireRole allowed={["commuter"]}><CommuterLayout/></RequireRole>}>
                <Route index element={<CommuterDashboard/>} />
                <Route path='search-bus' element={<SearchBusPage/>} />
                <Route path='seatmap' element={<SeatMapPage/>} />
                <Route path='payment' element={<PaymentPage/>} />
                <Route path='booking-success' element={<BookingSuccessPage/>} />
                <Route path='track-bus/:bookingId' element={<TrackBusPage/>} />
              </Route>

              {/* Account settings page */}
              <Route path='account' element={<RequireRole allowed={["commuter"]}><AccountSettings/></RequireRole>} />

              <Route path='driver' element={<RequireRole allowed={["driver"]}><DriverLayout/></RequireRole>}>
                <Route index element={<DriverDashboard/>} />
                <Route path='my-trips' element={<DriverDashboard/>} />
                <Route path='scanner' element={<DriverScannerPage/>} />
              </Route>

              <Route path='*' element={<NotFound />} />
            </Route>

            <Route path='/first-login-change' element={<FirstLoginChange/>} />
            <Route path='/forgot-password' element={<ForgotPassword/>} />
            <Route path='/reset-password' element={<ResetPassword/>} />
            <Route path='/verify-email' element={<VerifyEmail/>} />
            <Route path='/profile' element={<RequireRole allowed={["commuter","company_admin","driver","admin"]}><ProfilePage/></RequireRole>} />
            <Route path='/seatmap' element={<RequireRole allowed={["commuter"]}><SeatMapPage/></RequireRole>} />
            <Route path='/commuter/search' element={<RequireRole allowed={["commuter"]}><SearchBusPage/></RequireRole>} />
            <Route path='/commuter/search-bus' element={<RequireRole allowed={["commuter"]}><SearchBusPage/></RequireRole>} />
            <Route path='/commuter/bookings' element={<RequireRole allowed={["commuter"]}><CommuterDashboard/></RequireRole>} />
            <Route path='/commuter/seat-map' element={<RequireRole allowed={["commuter"]}><SeatMapPage/></RequireRole>} />
            <Route path='/track-bus/:bookingId' element={<RequireRole allowed={["commuter"]}><TrackBusPage/></RequireRole>} />
            <Route path='/admin/company-verifications' element={<Navigate to='/dashboard/admin/company-verifications' replace />} />

            {/* Alias dashboard routes */}
            <Route path='/driver/dashboard' element={<Layout />}>
              <Route index element={<RequireRole allowed={["driver"]}><DriverDashboard/></RequireRole>} />
              <Route path='tracking' element={<RequireRole allowed={["driver"]}><DriverTracking/></RequireRole>} />
            </Route>
            <Route path='/company/dashboard' element={<Layout />}>
              <Route index element={<RequireRole allowed={["company_admin","company"]}><CompanyDashboard/></RequireRole>} />
              <Route path='subscription' element={<RequireRole allowed={["company_admin","company"]}><CompanyDashboard/></RequireRole>} />
            </Route>
            {/* Tailwind test route */}
            <Route path='/tailwind-test' element={<Layout />}>
              <Route index element={<TailwindExample/>} />
            </Route>
            {/* /company/dashboard routes removed (reset). */}

            {/* Fallback route */}
            <Route path='*' element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
