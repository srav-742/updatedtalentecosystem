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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test-feedback" element={<InterviewFeedbackForm />} />
        <Route path="/admin" element={<AdminContentPage />} />
        <Route path="/admin-content" element={<AdminContentPage />} />
        <Route path="/admincontentpage" element={<AdminContentPage />} />
        <Route path="/AdminContentPage" element={<AdminContentPage />} />
        <Route path="/recruiter/AdminContentPage" element={<AdminContentPage />} />
        <Route path="/recruiter/admincontentpage" element={<AdminContentPage />} />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App
