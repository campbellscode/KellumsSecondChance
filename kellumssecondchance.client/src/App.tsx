import { lazy, useEffect } from 'react';
import { captureFirstTouch } from '@/lib/attribution';
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
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const ServiceAreaPage = lazy(() => import('@/pages/ServiceAreaPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const EstimatePage = lazy(() => import('@/pages/EstimatePage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const WorkWithUsPage = lazy(() => import('@/pages/WorkWithUsPage'));
const BookingsPage = lazy(() => import('@/pages/BookingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminEstimateRequestsPage = lazy(() => import('@/pages/admin/AdminEstimateRequestsPage'));
const AdminEstimateRequestDetailPage = lazy(
  () => import('@/pages/admin/AdminEstimateRequestDetailPage'),
);
const AdminProjectsPage = lazy(() => import('@/pages/admin/AdminProjectsPage'));
const AdminProjectEditorPage = lazy(() => import('@/pages/admin/AdminProjectEditorPage'));
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'));
const AdminTestimonialsPage = lazy(() => import('@/pages/admin/AdminTestimonialsPage'));
const AdminFaqsPage = lazy(() => import('@/pages/admin/AdminFaqsPage'));
const AdminServiceAreasPage = lazy(() => import('@/pages/admin/AdminServiceAreasPage'));
const AdminSiteSettingsPage = lazy(() => import('@/pages/admin/AdminSiteSettingsPage'));
const AdminEmploymentInterestsPage = lazy(() => import('@/pages/admin/AdminEmploymentInterestsPage'));
const AdminBookingsPage = lazy(() => import('@/pages/admin/AdminBookingsPage'));
const AdminGalleryPage = lazy(() => import('@/pages/admin/AdminGalleryPage'));

export default function App() {
  useEffect(captureFirstTouch, []);
  return (
    <SiteContentProvider>
      <ErrorBoundary>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:slug" element={<ServiceDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="projects/:slug" element={<ProjectDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="service-area" element={<ServiceAreaPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="request-estimate" element={<EstimatePage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="work-with-us" element={<WorkWithUsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="estimate-requests" element={<AdminEstimateRequestsPage />} />
            <Route path="estimate-requests/:id" element={<AdminEstimateRequestDetailPage />} />
            <Route path="employment-interests" element={<AdminEmploymentInterestsPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="projects" element={<AdminProjectsPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            {/* "new" and an id share one editor — the same form, one without a record. */}
            <Route path="projects/new" element={<AdminProjectEditorPage />} />
            <Route path="projects/:id" element={<AdminProjectEditorPage />} />
            {/*
              A link written as .../edit is the obvious guess, and an owner who
              bookmarks the editor should not land on a "not found" because of a
              suffix. Same screen either way.
            */}
            <Route path="projects/:id/edit" element={<AdminProjectEditorPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="testimonials" element={<AdminTestimonialsPage />} />
            <Route path="faqs" element={<AdminFaqsPage />} />
            <Route path="service-areas" element={<AdminServiceAreasPage />} />
            <Route path="site-settings" element={<AdminSiteSettingsPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </SiteContentProvider>
  );
}
