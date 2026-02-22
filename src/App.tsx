import React from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import CompanyLayout from './layouts/CompanyLayout';
import CommuterLayout from './layouts/CommuterLayout';
import DriverLayout from './layouts/DriverLayout';
import CompanyDashboard from './pages/company/CompanyDashboard';
import TailwindExample from './components/TailwindExample';
import { Schedules } from './pages/commuter/schedules';
import Tickets from './pages/Tickets';
import Buses from './pages/Buses';
import Drivers from './pages/Drivers';
import CompanySettings from './pages/CompanySettings';
import LiveTracking from './pages/LiveTracking';
import Revenue from './pages/Revenue';
import SubscriptionPage from './pages/SubscriptionPage';
import ReportsPage from './pages/ReportsPage';
import DriverTracking from './pages/company/DriverTracking';
import FirstLoginChange from './pages/FirstLoginChange';
import AccountSettings from './pages/account/AccountSettings';
import PaymentPage from './pages/commuter/PaymentPage';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page as default home */}
            <Route path='/' element={<LandingPage />} />

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
              </Route>

              <Route path='company' element={<RequireRole allowed={["company_admin"]}><CompanyLayout/></RequireRole>}>
                <Route index element={<CompanyDashboard/>} />
              </Route>

              <Route path='commuter' element={<RequireRole allowed={["commuter"]}><CommuterLayout/></RequireRole>}>
                <Route index element={<CommuterDashboard/>} />
                <Route path='payment' element={<PaymentPage/>} />
              </Route>

              {/* Account settings page */}
              <Route path='account' element={<RequireRole allowed={["commuter"]}><AccountSettings/></RequireRole>} />

              <Route path='driver' element={<RequireRole allowed={["driver"]}><DriverLayout/></RequireRole>}>
                <Route index element={<DriverDashboard/>} />
              </Route>

              <Route path='*' element={<NotFound />} />
            </Route>

            <Route path='/first-login-change' element={<FirstLoginChange/>} />

            {/* Alias dashboard routes */}
            <Route path='/driver/dashboard' element={<Layout />}>
              <Route index element={<RequireRole allowed={["driver"]}><DriverDashboard/></RequireRole>} />
              <Route path='tracking' element={<RequireRole allowed={["driver"]}><DriverTracking/></RequireRole>} />
            </Route>
            <Route path='/company/dashboard' element={<Layout />}>
              <Route index element={<RequireRole allowed={["company_admin","company"]}><CompanyDashboard/></RequireRole>} />
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
