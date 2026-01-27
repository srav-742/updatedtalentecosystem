import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

// Seeker Pages
import SeekerLayout from './pages/seeker/SeekerLayout';
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import BrowseJobs from './pages/seeker/BrowseJobs';
import JobDetails from './pages/seeker/JobDetails';
import ApplicationFlow from './pages/seeker/ApplicationFlow';

import MyApplications from './pages/seeker/MyApplications';
import SeekerProfile from './pages/seeker/SeekerProfile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Recruiter Routes */}
        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<RecruiterDashboard />} />
          <Route path="post-job" element={<PostJob />} />
          <Route path="my-jobs" element={<MyJobs />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="profile" element={<RecruiterProfile />} />
        </Route>

        {/* Seeker Routes */}
        <Route path="/seeker" element={<SeekerLayout />}>
          <Route index element={<SeekerDashboard />} />
          <Route path="jobs" element={<BrowseJobs />} />
          <Route path="job/:id" element={<JobDetails />} />
          <Route path="apply/:jobId" element={<ApplicationFlow />} />

          <Route path="applications" element={<MyApplications />} />
          <Route path="profile" element={<SeekerProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
