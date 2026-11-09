import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import CookieBanner from './components/CookieBanner';
import RouteTracker from './components/RouteTracker';
import Navbar from './components/Navbar';
import { GlobalPageSkeleton } from './components/Skeleton';
import useFirebaseAuthSync from './hooks/useFirebaseAuthSync';

const AssessmentsHome = lazy(() => import('./pages/AssessmentsHome'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AssessmentPricingPage = lazy(() => import('./pages/AssessmentPricingPage'));
const SampleReportPage = lazy(() => import('./pages/SampleReportPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Contact = lazy(() => import('./pages/Contact'));

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
const QuestionBank = lazy(() => import('./pages/recruiter/QuestionBank'));
const RecruiterTranscriptPage = lazy(() => import('./pages/recruiter/RecruiterTranscriptPage'));
const RecruiterKnowledgeHub = lazy(() => import('./pages/recruiter/RecruiterKnowledgeHub'));
const PaymentUpgrade = lazy(() => import('./pages/payment/PaymentUpgrade'));
const AdminQuestionBankRedirect = lazy(() => import('./pages/admin/AdminQuestionBankRedirect'));

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
const CandidateCareerHub = lazy(() => import('./pages/public/CandidateCareerHub'));
const BlogLandingPage = lazy(() => import('./pages/blog/BlogLandingPage'));
const BlogPostDetailsPage = lazy(() => import('./pages/blog/BlogPostDetailsPage'));

const AIInterviewPlatform = lazy(() => import('./pages/seo/AIInterviewPlatform'));
const AIRecruitmentSoftware = lazy(() => import('./pages/seo/AIRecruitmentSoftware'));
const AutomatedHiring = lazy(() => import('./pages/seo/AutomatedHiring'));
const CandidateScreening = lazy(() => import('./pages/seo/CandidateScreening'));
const ResumeAnalysis = lazy(() => import('./pages/seo/ResumeAnalysis'));
const PublicInterviewDetail = lazy(() => import('./pages/public/PublicInterviewDetail'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LazyBlogShell = lazy(() => import('./pages/blog/BlogThemeContext').then((module) => {
    const { BlogThemeProvider: Provider, useBlogTheme } = module;
    function BlogShellContent({ children }) {
        const { isDark } = useBlogTheme();
        return (
            <div className="min-h-screen" style={{ background: isDark ? '#0e121e' : '#F8F8FA' }}>
                {children}
            </div>
        );
    }

    return {
        default: function BlogShell({ children }) {
            return (
                <Provider>
                    <BlogShellContent>{children}</BlogShellContent>
                </Provider>
            );
        }
    };
}));

function SeekerApplyRedirect() {
    const { jobId } = useParams();
    const location = useLocation();
    return <Navigate to={`/candidate/apply/${jobId}${location.search}`} replace />;
}

function FirebaseAuthSync() {
    useFirebaseAuthSync();
    return null;
}

function App() {
    return (
        <BrowserRouter>
            <RouteTracker />
            <FirebaseAuthSync />
            <CookieBanner />
            <Suspense fallback={<GlobalPageSkeleton />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/assessments" element={<AssessmentsHome />} />
                    <Route path="/service" element={<Navigate to="/assessments" replace />} />
                    <Route path="/assessments-home" element={<Navigate to="/assessments" replace />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/assessment-pricing" element={<AssessmentPricingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/sample-report" element={<SampleReportPage />} />
                    <Route path="/test-feedback" element={<InterviewFeedbackForm />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />

                    <Route path="/job/:id" element={
                        <div className="min-h-screen bg-[#f7f4ee]">
                            <Navbar theme="light" />
                            <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
                                <JobDetails />
                            </main>
                        </div>
                    } />

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
                        <Route path="knowledge-hub" element={<RecruiterKnowledgeHub />} />
                        <Route path="blog" element={<BlogPosts />} />
                        <Route path="blog/new" element={<BlogEditor />} />
                        <Route path="blog/edit/:id" element={<BlogEditor />} />
                        <Route path="blog-editor" element={<BlogEditor />} />
                        <Route path="blog-editor/:id" element={<BlogEditor />} />
                        <Route path="coding-assessment/:jobId" element={<CodingAssessmentConfig />} />
                        <Route path="custom-coding-assessment/:jobId" element={<CustomCodingAssessmentConfig />} />
                        <Route path="question-bank" element={<QuestionBank />} />
                        <Route path="upgrade" element={<PaymentUpgrade />} />
                    </Route>

                    <Route path="/admin/question-bank" element={<AdminQuestionBankRedirect />} />
                    <Route path="/admin-question-bank" element={<AdminQuestionBankRedirect />} />

                    <Route path="/seeker/job/:id" element={<PublicJobDetails />} />
                    <Route path="/candidate/job/:id" element={<PublicJobDetails />} />
                    <Route path="/candidate/jobs" element={
                        <div className="min-h-screen bg-[#f7f4ee]">
                            <Navbar theme="light" />
                            <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
                                <BrowseJobs />
                            </main>
                        </div>
                    } />

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

                    <Route path="/candidate" element={<ProtectedRoute><SeekerLayout /></ProtectedRoute>}>
                        <Route index element={<SeekerDashboard />} />
                        <Route path="jobs" element={<BrowseJobs />} />
                        <Route path="job/:id" element={<JobDetails />} />
                        <Route path="apply/:jobId" element={<ApplicationFlow />} />
                        <Route path="applications" element={<MyApplications />} />
                        <Route path="profile" element={<SeekerProfile />} />
                        <Route path="mock-interview" element={<AgentInterview />} />
                        <Route path="agent-interview" element={<AgentInterview />} />
                        <Route path="community" element={<EliteCommunity />} />
                        <Route path="proctoring-test" element={<ProctoringTest />} />
                        <Route path="career-hub" element={<CandidateCareerHub isCandidatePortal />} />
                    </Route>

                    <Route path="/career-hub" element={<CandidateCareerHub />} />
                    <Route path="/career-guide" element={<Navigate to="/career-hub" replace />} />
                    <Route path="/career-questions" element={<Navigate to="/career-hub" replace />} />
                    <Route path="/candidate-career-hub" element={<Navigate to="/career-hub" replace />} />

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

                    <Route path="/AIInterviewPlatform" element={<Navigate to="/ai-interview-platform" replace />} />
                    <Route path="/AIRecruitmentSoftware" element={<Navigate to="/ai-recruitment-software" replace />} />
                    <Route path="/AutomatedHiring" element={<Navigate to="/automated-hiring" replace />} />
                    <Route path="/CandidateScreening" element={<Navigate to="/candidate-screening" replace />} />
                    <Route path="/ResumeAnalysis" element={<Navigate to="/resume-analysis" replace />} />

                    <Route path="/admin" element={<Navigate to="/recruiter" replace />} />
                    <Route path="/admin/dashboard" element={<Navigate to="/recruiter" replace />} />
                    <Route path="/admindashboard" element={<Navigate to="/recruiter" replace />} />
                    <Route path="/admin/blogs" element={<Navigate to="/recruiter/blog" replace />} />
                    <Route path="/admin/blog" element={<Navigate to="/recruiter/blog" replace />} />
                    <Route path="/admin/blog/new" element={<Navigate to="/recruiter/blog/new" replace />} />
                    <Route path="/admin/blog-editor" element={<Navigate to="/recruiter/blog/new" replace />} />
                    <Route path="/seeker/jobs" element={<Navigate to="/candidate/jobs" replace />} />
                    <Route path="/seeker/apply/:jobId" element={<SeekerApplyRedirect />} />
                    <Route path="/seeker/applications" element={<Navigate to="/candidate/applications" replace />} />
                    <Route path="/seeker/profile" element={<Navigate to="/candidate/profile" replace />} />
                    <Route path="/seeker/mock-interview" element={<Navigate to="/candidate/mock-interview" replace />} />
                    <Route path="/seeker/community" element={<Navigate to="/candidate/community" replace />} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
