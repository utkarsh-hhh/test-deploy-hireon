import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

// Layouts
import { RecruiterLayout } from '@/components/layout/RecruiterLayout'
import { InterviewerLayout } from '@/components/layout/InterviewerLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Landing
import LandingPage from '@/pages/landing/LandingPage'
import OnboardingPage from '@/pages/candidate/OnboardingPage'

// Recruiter pages
import OverviewPage from '@/pages/recruiter/OverviewPage'
import JobsListPage from '@/pages/recruiter/JobsListPage'
import AddJobPage from '@/pages/recruiter/AddJobPage'
import CandidatesPage from '@/pages/recruiter/CandidatesPage'
import PipelinePage from '@/pages/recruiter/PipelinePage'
import UploadResumePage from '@/pages/recruiter/UploadResumePage'
import InterviewsListPage from '@/pages/recruiter/InterviewsListPage'
import OffersPage from '@/pages/recruiter/OffersPage'
import AnalyticsPage from '@/pages/recruiter/AnalyticsPage'
import TalentPoolPage from '@/pages/recruiter/TalentPoolPage'
import RecruiterProfilePage from '@/pages/recruiter/RecruiterProfilePage'
import RecruiterSettingsPage from '@/pages/recruiter/RecruiterSettingsPage'

// Interviewer pages
import InterviewerDashboard from '@/pages/interviewer/InterviewerDashboard'
import MyInterviewsPage from '@/pages/interviewer/MyInterviewsPage'
import ScorecardPage from '@/pages/interviewer/ScorecardPage'
import PrepKitPage from '@/pages/interviewer/PrepKitPage'
import LiveRoomPage from '@/pages/interviewer/LiveRoomPage'
import ScorecardHubPage from '@/pages/interviewer/ScorecardHubPage'
import PrepKitHubPage from '@/pages/interviewer/PrepKitHubPage'
import LiveRoomHubPage from '@/pages/interviewer/LiveRoomHubPage'
import InterviewerProfilePage from '@/pages/interviewer/InterviewerProfilePage'

// Portal pages
import PortalDashboard from '@/pages/portal/PortalDashboard'
import PortalApplicationsPage from '@/pages/portal/PortalApplicationsPage'
import PortalInterviewsPage from '@/pages/portal/PortalInterviewsPage'
import PortalOffersPage from '@/pages/portal/PortalOffersPage'
import PortalProfilePage from '@/pages/portal/PortalProfilePage'
import PortalPrepHub from '@/pages/portal/PortalPrepHub'
import PortalOpenings from '@/pages/portal/PortalOpenings'
import PortalNotifications from '@/pages/portal/PortalNotifications'
import PortalSettingsPage from '@/pages/portal/PortalSettingsPage'

// Admin pages
import TeamManagementPage from '@/pages/admin/TeamManagementPage'
import AuditLogsPage from '@/pages/admin/AuditLogsPage'

// ── Protected route wrapper ────────────────────────────────────────────────────
function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: UserRole[]
}) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) {
    // Redirect to appropriate home based on role
    if (user.role === 'candidate') return <Navigate to="/portal" replace />
    if (user.role === 'interviewer') return <Navigate to="/interviewer" replace />
    return <Navigate to="/recruiter" replace />
  }
  return <>{children}</>
}

import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1a1040',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '12px 24px',
            border: '1px solid #f1f0ff',
          },
          success: {
            iconTheme: {
              primary: '#6c47ff',
              secondary: '#ffffff',
            },
          },
        }} 
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding/:token" element={<OnboardingPage />} />

        {/* Recruiter / Admin routes */}
        <Route
          path="/recruiter"
          element={
            <RequireAuth roles={['admin', 'recruiter']}>
              <RecruiterLayout />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="jobs" element={<JobsListPage />} />
          <Route path="jobs/new" element={<AddJobPage />} />
          <Route path="jobs/:id/edit" element={<AddJobPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="upload" element={<UploadResumePage />} />
          <Route path="interviews" element={<InterviewsListPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="talent-pool" element={<TalentPoolPage />} />
          <Route path="profile" element={<RecruiterProfilePage />} />
          <Route path="settings" element={<RecruiterSettingsPage />} />
        </Route>

        {/* Admin-specific routes (nested under recruiter layout) */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin']}>
              <RecruiterLayout />
            </RequireAuth>
          }
        >
          <Route path="team" element={<TeamManagementPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
        </Route>

        {/* Interviewer routes */}
        <Route
          path="/interviewer"
          element={
            <RequireAuth roles={['admin', 'recruiter', 'interviewer']}>
              <InterviewerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<InterviewerDashboard />} />
          <Route path="interviews" element={<MyInterviewsPage />} />
          <Route path="scorecard-hub" element={<ScorecardHubPage />} />
          <Route path="prep-kit-hub" element={<PrepKitHubPage />} />
          <Route path="live-room-hub" element={<LiveRoomHubPage />} />
          <Route path="scorecard/:interviewId" element={<ScorecardPage />} />
          <Route path="prep-kit/:interviewId" element={<PrepKitPage />} />
          <Route path="live-room/:interviewId" element={<LiveRoomPage />} />
          <Route path="profile" element={<InterviewerProfilePage />} />
        </Route>

        {/* Candidate portal routes */}
        <Route
          path="/portal"
          element={
            <RequireAuth roles={['candidate']}>
              <PortalLayout />
            </RequireAuth>
          }
        >
          <Route index element={<PortalDashboard />} />
          <Route path="applications" element={<PortalApplicationsPage />} />
          <Route path="interviews" element={<PortalInterviewsPage />} />
          <Route path="offers" element={<PortalOffersPage />} />
          <Route path="profile" element={<PortalProfilePage />} />
          <Route path="prep" element={<PortalPrepHub />} />
          <Route path="openings" element={<PortalOpenings />} />
          <Route path="notifications" element={<PortalNotifications />} />
          <Route path="settings" element={<PortalSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
