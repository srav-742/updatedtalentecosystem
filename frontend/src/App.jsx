import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import CookieBanner from './components/CookieBanner';
import Navbar from './components/Navbar';
import { GlobalPageSkeleton } from './components/Skeleton';
import BlogNavbar from './components/BlogNavbar';
import { BlogThemeProvider, useBlogTheme } from './pages/blog/BlogThemeContext';

// Wrapper that reads blog theme context for Navbar + background
function BlogRouteWrapper({ children }) {
  const { isDark } = useBlogTheme();
  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0c0f16' : '#f8f9fb' }}>
      <Navbar theme={isDark ? 'dark' : 'light'} />
      {children}
    </div>
  );
}

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RecruiterLayout = lazy(() => import('./pages/recruiter/RecruiterLayout'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));
const PostJob = lazy(() => import('./pages/recruiter/PostJob'));
const MyJobs = lazy(() => import('./pages/recruiter/MyJobs'));
const Applicants = lazy(() => import('./pages/recruiter/Applicants'));
const RecruiterProfile = lazy(() => import('./pages/recruiter/RecruiterProfile'));
const PerformanceDashboard = lazy(() => import('./pages/recruiter/PerformanceDashboard'));
const OnboardingKit = lazy(() => import('./pages/recruiter/OnboardingKit'));
const TalentSearch = lazy(() => import('./pages/recruiter/TalentSearch'));
const BlogEditor = lazy(() => import('./pages/recruiter/BlogEditor'));
const BlogPosts = lazy(() => import('./pages/recruiter/BlogPosts'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PaymentUpgrade = lazy(() => import('./pages/payment/PaymentUpgrade'));
const SeekerLayout = lazy(() => import('./pages/seeker/SeekerLayout'));
const SeekerDashboard = lazy(() => import('./pages/seeker/SeekerDashboard'));
const BrowseJobs = lazy(() => import('./pages/seeker/BrowseJobs'));
const JobDetails = lazy(() => import('./pages/seeker/JobDetails'));
const MyApplications = lazy(() => import('./pages/seeker/MyApplications'));
const SeekerProfile = lazy(() => import('./pages/seeker/SeekerProfile'));
const EliteCommunity = lazy(() => import('./pages/seeker/EliteCommunity'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Contact = lazy(() => import('./pages/Contact'));
const ApplicationFlow = lazy(() => import('./pages/seeker/ApplicationFlow'));
const InterviewFeedbackForm = lazy(() => import('./pages/seeker/ApplicationFlow/InterviewFeedbackForm'));
const AgentInterview = lazy(() => import('./pages/seeker/ApplicationFlow/AgentInterview'));
const AIInterviewPlatform = lazy(() => import('./pages/seo/AIInterviewPlatform.jsx'));
const AIRecruitmentSoftware = lazy(() => import('./pages/seo/AIRecruitmentSoftware.jsx'));
const AutomatedHiring = lazy(() => import('./pages/seo/AutomatedHiring.jsx'));
const CandidateScreening = lazy(() => import('./pages/seo/CandidateScreening.jsx'));
const ResumeAnalysis = lazy(() => import('./pages/seo/ResumeAnalysis.jsx'));
const PublicJobDetails = lazy(() => import('./pages/seeker/PublicJobDetails'));
const ProctoringTest = lazy(() => import('./pages/seeker/ProctoringTest'));
const BlogLandingPage = lazy(() => import('./pages/blog/BlogLandingPage'));
const BlogPostDetailsPage = lazy(() => import('./pages/blog/BlogPostDetailsPage'));

function App() {
  return (
    <BrowserRouter>
      <CookieBanner />

      <Suspense fallback={<GlobalPageSkeleton />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
          <Route path="profile" element={<RecruiterProfile />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="onboarding-kit" element={<OnboardingKit />} />
          <Route path="ai-search" element={<TalentSearch />} />

          <Route path="upgrade" element={<PaymentUpgrade />} />
        </Route>

        {/* Public Seeker Job Details — accessible without login */}
        <Route path="/seeker/job/:id" element={<PublicJobDetails />} />

        {/* Seeker Routes */}
        <Route path="/seeker" element={<ProtectedRoute><SeekerLayout /></ProtectedRoute>}>
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

        {/* Blog Routes */}
        <Route path="/blog" element={
          <BlogThemeProvider>
            <BlogRouteWrapper>
              <BlogLandingPage />
            </BlogRouteWrapper>
          </BlogThemeProvider>
        } />
        <Route path="/blog/:slug" element={
          <BlogThemeProvider>
            <BlogRouteWrapper>
              <BlogPostDetailsPage />
            </BlogRouteWrapper>
          </BlogThemeProvider>
        } />

        <Route path="/ai-interview-platform" element={<AIInterviewPlatform />} />
        <Route path="/ai-recruitment-software" element={<AIRecruitmentSoftware />} />
        <Route path="/automated-hiring" element={<AutomatedHiring />} />
        <Route path="/candidate-screening" element={<CandidateScreening />} />
        <Route path="/resume-analysis" element={<ResumeAnalysis />} />

        {/* PascalCase aliases */}
        <Route path="/AIInterviewPlatform" element={<AIInterviewPlatform />} />
        <Route path="/AIRecruitmentSoftware" element={<AIRecruitmentSoftware />} />
        <Route path="/AutomatedHiring" element={<AutomatedHiring />} />
        <Route path="/CandidateScreening" element={<CandidateScreening />} />
        <Route path="/ResumeAnalysis" element={<ResumeAnalysis />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App
