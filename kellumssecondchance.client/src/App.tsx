import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { SiteContentProvider } from '@/lib/SiteContentProvider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import HomePage from '@/pages/HomePage';

/*
 * Route-level code splitting: the homepage ships in the initial bundle because
 * it is the landing page; everything else loads on navigation. Admin is split
 * hardest — no visitor should download the CMS to read about kitchens.
 */
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('@/pages/ServiceDetailPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const ServiceAreaPage = lazy(() => import('@/pages/ServiceAreaPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const EstimatePage = lazy(() => import('@/pages/EstimatePage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminEstimateRequestsPage = lazy(() => import('@/pages/admin/AdminEstimateRequestsPage'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));

export default function App() {
  return (
    <SiteContentProvider>
      <ErrorBoundary>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:slug" element={<ServiceDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:slug" element={<ProjectDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="service-area" element={<ServiceAreaPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="request-estimate" element={<EstimatePage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="estimate-requests" element={<AdminEstimateRequestsPage />} />
            <Route path="projects" element={<AdminContentPage kind="projects" />} />
            <Route path="services" element={<AdminContentPage kind="services" />} />
            <Route path="testimonials" element={<AdminContentPage kind="testimonials" />} />
            <Route path="faqs" element={<AdminContentPage kind="faqs" />} />
            <Route path="service-areas" element={<AdminContentPage kind="service-areas" />} />
            <Route path="site-settings" element={<AdminContentPage kind="site-settings" />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </SiteContentProvider>
  );
}
