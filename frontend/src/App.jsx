import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import CookieBanner from './components/CookieBanner';

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
const AdminContentPage = lazy(() => import('./pages/AdminContentPage'));
const PerformanceDashboard = lazy(() => import('./pages/recruiter/PerformanceDashboard'));
const OnboardingKit = lazy(() => import('./pages/recruiter/OnboardingKit'));
const TalentSearch = lazy(() => import('./pages/recruiter/TalentSearch'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
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


function App() {
  return (
    <BrowserRouter>
      <CookieBanner />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0c0f16] text-white">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Loading...</div>
        </div>
      }>
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
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminContentPage /></ProtectedRoute>} />
        <Route path="/admin-content" element={<ProtectedRoute role="admin"><AdminContentPage /></ProtectedRoute>} />
        <Route path="/recruiter/admin-content" element={<ProtectedRoute role="admin"><AdminContentPage /></ProtectedRoute>} />
        <Route path="/recruiter/AdminContentPage" element={<ProtectedRoute role="admin"><AdminContentPage /></ProtectedRoute>} />



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
        </Route>

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
        </Route>
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
