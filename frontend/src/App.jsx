import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import RecruiterLayout from './pages/recruiter/RecruiterLayout';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import PostJob from './pages/recruiter/PostJob';
import MyJobs from './pages/recruiter/MyJobs';
import Applicants from './pages/recruiter/Applicants';
import RecruiterProfile from './pages/recruiter/RecruiterProfile';
import AdminContentPage from "./pages/AdminContentPage";
import PerformanceDashboard from "./pages/recruiter/PerformanceDashboard";
import OnboardingKit from "./pages/recruiter/OnboardingKit";
import TalentSearch from "./pages/recruiter/TalentSearch";
import PricingPage from './pages/PricingPage';
// Seeker Pages
import SeekerLayout from './pages/seeker/SeekerLayout';
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import BrowseJobs from './pages/seeker/BrowseJobs';
import JobDetails from './pages/seeker/JobDetails';
import ApplicationFlow from './pages/seeker/ApplicationFlow';
import InterviewFeedbackForm from './pages/seeker/ApplicationFlow/InterviewFeedbackForm';

import MyApplications from './pages/seeker/MyApplications';
import SeekerProfile from './pages/seeker/SeekerProfile';
import AgentInterview from './pages/seeker/ApplicationFlow/AgentInterview';
import EliteCommunity from './pages/seeker/EliteCommunity';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Contact from './pages/Contact';
import CookieBanner from './components/CookieBanner';


//seo pages
import AIInterviewPlatform from './pages/seo/AIInterviewPlatform.jsx';
import AIRecruitmentSoftware from './pages/seo/AIRecruitmentSoftware.jsx';
import AutomatedHiring from './pages/seo/AutomatedHiring.jsx';
import CandidateScreening from './pages/seo/CandidateScreening.jsx';
import ResumeAnalysis from './pages/seo/ResumeAnalysis.jsx';


function App() {
  return (
    <BrowserRouter>
      <CookieBanner />
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
    </BrowserRouter>
  );
}

export default App
