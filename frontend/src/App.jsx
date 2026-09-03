import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import CookieBanner from './components/CookieBanner';
import Navbar from './components/Navbar';
import { GlobalPageSkeleton } from './components/Skeleton';

// ─── ALL page components are lazy-loaded ───────────────────────────────────────
// Only the shell (Router, Navbar, Skeleton, ProtectedRoute) is in the initial bundle.
// Each page's code is downloaded on-demand when the user navigates to that route.

// Public pages — AssessmentsHome is the root landing page, eagerly bundled to eliminate waterfall latency
import AssessmentsHome from './pages/AssessmentsHome';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// Legal pages
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Contact = lazy(() => import('./pages/Contact'));

// Recruiter pages
const RecruiterLayout = lazy(() => import('./pages/recruiter/RecruiterLayout'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));
const PostJob = lazy(() => import('./pages/recruiter/PostJob'));
const MyJobs = lazy(() => import('./pages/recruiter/MyJobs'));
const Applicants = lazy(() => import('./pages/recruiter/Applicants'));
const RecruiterProfile = lazy(() => import('./pages/recruiter/RecruiterProfile'));
const ProctoringReports = lazy(() => import('./pages/recruiter/ProctoringReports'));
const PerformanceDashboard = lazy(() => import('./pages/recruiter/PerformanceDashboard'));
const OnboardingKit = lazy(() => import('./pages/recruiter/OnboardingKit'));
const TalentSearch = lazy(() => import('./pages/recruiter/TalentSearch'));
const BlogEditor = lazy(() => import('./pages/recruiter/BlogEditor'));
const BlogPosts = lazy(() => import('./pages/recruiter/BlogPosts'));
const CodingAssessmentConfig = lazy(() => import('./pages/recruiter/CodingAssessmentConfig'));
const CustomCodingAssessmentConfig = lazy(() => import('./pages/recruiter/CustomCodingAssessmentConfig'));
const RecruiterTranscriptPage = lazy(() => import('./pages/recruiter/RecruiterTranscriptPage'));
const PaymentUpgrade = lazy(() => import('./pages/payment/PaymentUpgrade'));

// Candidate / Seeker pages
const SeekerLayout = lazy(() => import('./pages/seeker/SeekerLayout'));
const SeekerDashboard = lazy(() => import('./pages/seeker/SeekerDashboard'));
const BrowseJobs = lazy(() => import('./pages/seeker/BrowseJobs'));
const MyApplications = lazy(() => import('./pages/seeker/MyApplications'));
const SeekerProfile = lazy(() => import('./pages/seeker/SeekerProfile'));
const JobDetails = lazy(() => import('./pages/seeker/JobDetails'));
const PublicJobDetails = lazy(() => import('./pages/seeker/PublicJobDetails'));
const AgentInterview = lazy(() => import('./pages/seeker/ApplicationFlow/AgentInterview'));
const ApplicationFlow = lazy(() => import('./pages/seeker/ApplicationFlow'));
const InterviewFeedbackForm = lazy(() => import('./pages/seeker/ApplicationFlow/InterviewFeedbackForm'));
const EliteCommunity = lazy(() => import('./pages/seeker/EliteCommunity'));
const ProctoringTest = lazy(() => import('./pages/seeker/ProctoringTest'));

// Blog pages (context + wrapper also lazy-loaded — not needed outside /blog)
const BlogLandingPage = lazy(() => import('./pages/blog/BlogLandingPage'));
const BlogPostDetailsPage = lazy(() => import('./pages/blog/BlogPostDetailsPage'));

// SEO pages
const AIInterviewPlatform = lazy(() => import('./pages/seo/AIInterviewPlatform.jsx'));
const AIRecruitmentSoftware = lazy(() => import('./pages/seo/AIRecruitmentSoftware.jsx'));
const AutomatedHiring = lazy(() => import('./pages/seo/AutomatedHiring.jsx'));
const CandidateScreening = lazy(() => import('./pages/seo/CandidateScreening.jsx'));
const ResumeAnalysis = lazy(() => import('./pages/seo/ResumeAnalysis.jsx'));

// Public pages
const PublicInterviewDetail = lazy(() => import('./pages/public/PublicInterviewDetail'));

// ─── Lazy Blog Route Shell ─────────────────────────────────────────────────────
// BlogThemeContext + BlogNavbar are only imported when user visits /blog routes.
// This keeps the entire blog context/navbar out of the initial bundle.
const LazyBlogShell = lazy(() => import('./pages/blog/BlogThemeContext').then(mod => {
  // Return a component that wraps children with BlogThemeProvider + Navbar
  const { BlogThemeProvider, useBlogTheme } = mod;
  // We need a separate inner component to use the context
  function BlogRouteInner({ children }) {
    const { isDark } = useBlogTheme();
    return (
      <div className="min-h-screen" style={{ background: isDark ? '#0c0f16' : '#f8f9fb' }}>
        <Navbar theme={isDark ? 'dark' : 'light'} />
        {children}
      </div>
    );
  }
  // Return a wrapper component
  return {
    default: function BlogShell({ children }) {
      return (
        <BlogThemeProvider>
          <BlogRouteInner>{children}</BlogRouteInner>
        </BlogThemeProvider>
      );
    }
  };
}));

function SeekerJobRedirect() {
  const { id } = useParams();
  return <Navigate to={`/candidate/job/${id}`} replace />;
}

function SeekerApplyRedirect() {
  const { jobId } = useParams();
  const location = useLocation();
  return <Navigate to={`/candidate/apply/${jobId}${location.search}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <CookieBanner />

      <Suspense fallback={<GlobalPageSkeleton />}>
      <Routes>
        <Route path="/" element={<AssessmentsHome />} />
        <Route path="/service" element={<LandingPage />} />
        <Route path="/assessments-home" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test-feedback" element={<InterviewFeedbackForm />} />

        {/* Legal Routes */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/contact" element={<Contact />} />

        {/* Public Job Details Route — accessible without login */}
        <Route path="/job/:id" element={
          <div className="min-h-screen bg-[#f7f4ee]">
            <Navbar theme="light" />
            <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
              <JobDetails />
            </main>
          </div>
        } />

        {/* Recruiter Routes */}
        <Route path="/recruiter" element={<ProtectedRoute><RecruiterLayout /></ProtectedRoute>}>
          <Route index element={<RecruiterDashboard />} />
          <Route path="post-job" element={<PostJob />} />
          <Route path="my-jobs" element={<MyJobs />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="transcript/:applicationId" element={<RecruiterTranscriptPage />} />
          <Route path="proctoring-reports" element={<ProctoringReports />} />
          <Route path="profile" element={<RecruiterProfile />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="onboarding-kit" element={<OnboardingKit />} />
          <Route path="ai-search" element={<TalentSearch />} />
          <Route path="blog" element={<BlogPosts />} />
          <Route path="blog/new" element={<BlogEditor />} />
          <Route path="blog/edit/:id" element={<BlogEditor />} />
          <Route path="coding-assessment/:jobId" element={<CodingAssessmentConfig />} />
          <Route path="custom-coding-assessment/:jobId" element={<CustomCodingAssessmentConfig />} />

          <Route path="upgrade" element={<PaymentUpgrade />} />
        </Route>

        {/* Public Candidate Job Details — accessible without login */}
        <Route path="/candidate/job/:id" element={<PublicJobDetails />} />

        {/* Candidate Routes */}
        <Route path="/candidate" element={<ProtectedRoute><SeekerLayout /></ProtectedRoute>}>
          <Route index element={<SeekerDashboard />} />
          <Route path="jobs" element={<BrowseJobs />} />
          <Route path="job/:id" element={<JobDetails />} />
          <Route path="apply/:jobId" element={<ApplicationFlow />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="profile" element={<SeekerProfile />} />
          <Route path="mock-interview" element={<AgentInterview />} />
          <Route path="agent-interview" element={<AgentInterview />} />
          <Route path="agentInterview" element={<AgentInterview />} />
          <Route path="agentInterview.jsx" element={<AgentInterview />} />
          <Route path="community" element={<EliteCommunity />} />
          <Route path="proctoring-test" element={<ProctoringTest />} />
        </Route>

        {/* Blog Routes — BlogThemeContext/Navbar lazy-loaded only when visiting /blog */}
        <Route path="/blog" element={
          <LazyBlogShell>
            <BlogLandingPage />
          </LazyBlogShell>
        } />
        <Route path="/blog/:slug" element={
          <LazyBlogShell>
            <BlogPostDetailsPage />
          </LazyBlogShell>
        } />

        <Route path="/ai-interview-platform" element={<AIInterviewPlatform />} />
        <Route path="/ai-recruitment-software" element={<AIRecruitmentSoftware />} />
        <Route path="/automated-hiring" element={<AutomatedHiring />} />
        <Route path="/candidate-screening" element={<CandidateScreening />} />
        <Route path="/resume-analysis" element={<ResumeAnalysis />} />
        <Route path="/public/interview/:applicationId" element={<PublicInterviewDetail />} />

        {/* PascalCase aliases */}
        <Route path="/AIInterviewPlatform" element={<AIInterviewPlatform />} />
        <Route path="/AIRecruitmentSoftware" element={<AIRecruitmentSoftware />} />
        <Route path="/AutomatedHiring" element={<AutomatedHiring />} />
        <Route path="/CandidateScreening" element={<CandidateScreening />} />
        <Route path="/ResumeAnalysis" element={<ResumeAnalysis />} />
        {/* Redirects from old /seeker paths to /candidate */}
        <Route path="/seeker" element={<Navigate to="/candidate" replace />} />
        <Route path="/seeker/jobs" element={<Navigate to="/candidate/jobs" replace />} />
        <Route path="/seeker/job/:id" element={<SeekerJobRedirect />} />
        <Route path="/seeker/apply/:jobId" element={<SeekerApplyRedirect />} />
        <Route path="/seeker/applications" element={<Navigate to="/candidate/applications" replace />} />
        <Route path="/seeker/profile" element={<Navigate to="/candidate/profile" replace />} />
        <Route path="/seeker/mock-interview" element={<Navigate to="/candidate/mock-interview" replace />} />
        <Route path="/seeker/community" element={<Navigate to="/candidate/community" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App
