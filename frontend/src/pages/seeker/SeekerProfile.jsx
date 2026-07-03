import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Briefcase,
    CheckCircle2,
    Code2,
    Github,
    GraduationCap,
    Linkedin,
    Loader2,
    Mail,
    Phone,
    Plus,
    Save,
    Trash2,
    User,
    FileText,
    Upload,
    Star,
    ArrowRight,
    Sparkles,
    ExternalLink
} from 'lucide-react';
import { getUserProfile, saveUserProfile, API_URL } from '../../firebase';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

// eslint-disable-next-line no-unused-vars
const SectionCard = ({ title, subtitle, icon: Icon, children, action }) => (
    <section className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                    <Icon size={22} />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
                </div>
            </div>
            {action}
        </div>

        <div className="mt-8">{children}</div>
    </section>
);

const SeekerProfile = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const [resumes, setResumes] = useState([]);
    const [resumesLoading, setResumesLoading] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [parsingResume, setParsingResume] = useState(false);
    const [resumeSuccessMessage, setResumeSuccessMessage] = useState('');
    const [showNextStepsPopup, setShowNextStepsPopup] = useState(false);
    const [mlopsJobId, setMlopsJobId] = useState(null);
    const [mlopsScore, setMlopsScore] = useState(null);

    const fetchResumes = async () => {
        setResumesLoading(true);
        try {
            const uid = user.uid || user._id || user.id;
            const res = await axios.get(`${API_URL}/user-resumes/${uid}`, {
                headers: { 'x-user-id': uid }
            });
            setResumes(res.data);
        } catch (error) {
            console.error("Failed to fetch resumes:", error);
        } finally {
            setResumesLoading(false);
        }
    };

    const handleResumeUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max size: 5 MB.");
            return;
        }

        setUploadingResume(true);
        setParsingResume(true);
        setResumeSuccessMessage('');

        const uid = user.uid || user._id || user.id;
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('userId', uid);

        try {
            const uploadRes = await axios.post(`${API_URL}/user-resumes/upload`, formData, {
                headers: { 
                    'x-user-id': uid
                }
            });

            if (uploadRes.data.extractedText) {
                const parsedRes = await axios.post(`${API_URL}/parse-resume-structured`, {
                    resumeText: uploadRes.data.extractedText,
                    userId: uid
                });
                
                const parsedData = parsedRes.data;
                setProfileData(prev => ({
                    ...prev,
                    name: parsedData.basics?.name || prev.name,
                    phone: parsedData.basics?.phone || prev.phone,
                    bio: parsedData.summary || prev.bio,
                    skills: parsedData.skills ? [
                        ...(parsedData.skills.programming || []),
                        ...(parsedData.skills.frameworks || []),
                        ...(parsedData.skills.databases || []),
                        ...(parsedData.skills.tools || []),
                        ...(parsedData.skills.soft || [])
                    ] : prev.skills,
                    education: parsedData.education?.map(edu => ({
                        institution: edu.institution,
                        degree: edu.degree,
                        year: edu.endYear || edu.startYear || ''
                    })) || prev.education,
                    experience: parsedData.workExperience?.map(exp => ({
                        company: exp.company,
                        role: exp.position,
                        duration: `${exp.startMonth} ${exp.startYear} - ${exp.currentlyWorking ? 'Present' : `${exp.endMonth} ${exp.endYear}`}`,
                        description: exp.description
                    })) || prev.experience
                }));
            }

            const isMlOps = file.name.toLowerCase().includes('mlops');
            if (isMlOps) {
                try {
                    const jobsRes = await axios.get(`${API_URL}/jobs`);
                    const mlopsJob = jobsRes.data.find(j => j.title.toLowerCase().includes('mlops'));
                    if (mlopsJob) {
                        // 1. Analyze the resume against the MLOps Engineer job
                        const analysisRes = await axios.post(`${API_URL}/analyze-resume`, {
                            resumeText: uploadRes.data.extractedText || "",
                            jobSkills: mlopsJob.skills,
                            jobExperience: mlopsJob.experienceLevel,
                            jobEducation: mlopsJob.education,
                            userId: uid,
                            jobId: mlopsJob._id,
                            specialInstructions: mlopsJob.specialInstructions
                        });

                        const matchPercentage = typeof analysisRes.data.matchPercentage === 'number' 
                            ? analysisRes.data.matchPercentage 
                            : parseInt(analysisRes.data.matchPercentage, 10) || 0;

                        // 2. Create the application with the match score
                        await axios.post(`${API_URL}/applications`, {
                            jobId: mlopsJob._id,
                            userId: uid,
                            status: 'APPLIED',
                            resumeMatchPercent: matchPercentage,
                            applicantName: profileData.name || user.name || 'Candidate',
                            applicantEmail: profileData.email || user.email || '',
                            applicantPic: profileData.profilePic || user.profilePic || ''
                        });

                        // 3. Show score and next steps popup
                        setMlopsScore(matchPercentage);
                        setMlopsJobId(mlopsJob._id);
                        setResumeSuccessMessage(`Resume analyzed successfully for MLOps Engineer role! Match Score: ${matchPercentage}%`);
                        setShowNextStepsPopup(true);
                        await fetchResumes();
                        return;
                    }
                } catch (err) {
                    console.error("Failed to analyze MLOps resume or submit application:", err);
                }
                navigate('/seeker/jobs');
                return;
            }

            setResumeSuccessMessage("Resume uploaded and candidate profile enriched successfully!");
            setShowNextStepsPopup(true);
            await fetchResumes();
        } catch (error) {
            console.error("Failed to upload/parse resume:", error);
            alert("Failed to upload or parse resume. Please try again.");
        } finally {
            setUploadingResume(false);
            setParsingResume(false);
        }
    };

    const handleSetDefaultResume = async (resumeId) => {
        const uid = user.uid || user._id || user.id;
        try {
            await axios.put(`${API_URL}/user-resumes/${resumeId}/default`, { userId: uid }, {
                headers: { 'x-user-id': uid }
            });
            await fetchResumes();
        } catch (error) {
            console.error("Failed to set default resume:", error);
        }
    };

    const handleDeleteResume = async (resumeId) => {
        if (!window.confirm("Are you sure you want to delete this resume?")) return;
        const uid = user.uid || user._id || user.id;
        try {
            await axios.delete(`${API_URL}/user-resumes/${resumeId}`, {
                headers: { 'x-user-id': uid }
            });
            await fetchResumes();
        } catch (error) {
            console.error("Failed to delete resume:", error);
        }
    };

    const [profileData, setProfileData] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        skills: user.skills || [],
        education: user.education || [],
        experience: user.experience || [],
        profilePic: user.profilePic || '',
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await getUserProfile(user.uid || user._id || user.id);
                if (profile) {
                    setProfileData({
                        ...profile,
                        skills: profile.skills || [],
                        education: profile.education || [],
                        experience: profile.experience || [],
                        githubUrl: profile.githubUrl || '',
                        linkedinUrl: profile.linkedinUrl || ''
                    });
                } else {
                    setProfileData((previous) => ({
                        ...previous,
                        name: user.name || '',
                        email: user.email || ''
                    }));
                }
            } catch (error) {
                console.error('Error fetching profile from Firebase:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) {
            fetchProfile();
            fetchResumes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.uid, user._id, user.id]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setProfileData((previous) => ({ ...previous, [name]: value }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileData((previous) => ({ ...previous, profilePic: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const addSkill = () => {
        const normalized = newSkill.trim();
        if (!normalized || profileData.skills.includes(normalized)) {
            return;
        }

        setProfileData((previous) => ({
            ...previous,
            skills: [...previous.skills, normalized]
        }));
        setNewSkill('');
    };

    const removeSkill = (skill) => {
        setProfileData((previous) => ({
            ...previous,
            skills: previous.skills.filter((item) => item !== skill)
        }));
    };

    const addEducation = () => {
        setProfileData((previous) => ({
            ...previous,
            education: [...previous.education, { institution: '', degree: '', year: '' }]
        }));
    };

    const updateEducation = (index, field, value) => {
        setProfileData((previous) => ({
            ...previous,
            education: previous.education.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const removeEducation = (index) => {
        setProfileData((previous) => ({
            ...previous,
            education: previous.education.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const addExperience = () => {
        setProfileData((previous) => ({
            ...previous,
            experience: [...previous.experience, { company: '', role: '', duration: '', description: '' }]
        }));
    };

    const updateExperience = (index, field, value) => {
        setProfileData((previous) => ({
            ...previous,
            experience: previous.experience.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const removeExperience = (index) => {
        setProfileData((previous) => ({
            ...previous,
            experience: previous.experience.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!profileData.githubUrl || !profileData.linkedinUrl) {
            alert('Verification Failed: Please provide both your GitHub and LinkedIn profile URLs to proceed. Recruiters require these for impact assessment.');
            const element = document.getElementById('professional-links');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        setSaving(true);

        try {
            await saveUserProfile(user.uid || user._id || user.id, profileData);

            const updatedUser = {
                ...user,
                name: profileData.name,
                profilePic: profileData.profilePic
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile details.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-20 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f4efe6] text-gray-700">
                    <Loader2 size={34} className="animate-spin" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Loading profile</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Syncing your candidate details and saved configuration.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <header className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Candidate profile</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">Keep your profile application-ready</h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-500">
                            Update the information recruiters care about most so your profile, resume workflow, and job applications stay aligned.
                        </p>
                    </div>

                    <AnimatePresence>
                        {saved ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700"
                            >
                                <CheckCircle2 size={18} />
                                Profile saved successfully
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </header>

            {!profileData.githubUrl || !profileData.linkedinUrl ? (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                                <AlertCircle size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-amber-900">Add your professional links</h2>
                                <p className="mt-1 text-sm leading-6 text-amber-800/80">
                                    GitHub and LinkedIn are required for a stronger recruiter-facing profile and impact evaluation.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => document.getElementById('professional-links')?.scrollIntoView({ behavior: 'smooth' })}
                            className="rounded-2xl border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                            Add links
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="space-y-8">
                    <section className="rounded-[2.25rem] border border-black/10 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                        <input
                            id="candidate-profile-picture"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <button
                            type="button"
                            onClick={() => document.getElementById('candidate-profile-picture')?.click()}
                            className="mx-auto block rounded-[2rem] p-1 transition hover:scale-[1.02]"
                        >
                            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-black/10 bg-[#f4efe6] text-5xl font-semibold text-gray-900">
                                {profileData.profilePic ? (
                                    <img src={profileData.profilePic} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    profileData.name?.[0]?.toUpperCase() || 'C'
                                )}
                            </div>
                        </button>

                        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">{profileData.name || 'Candidate'}</h2>
                        <p className="mt-2 text-sm text-gray-500">{profileData.email || 'Email not available'}</p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f3] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Skills</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{profileData.skills.length}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f3] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Experience</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{profileData.experience.length}</p>
                            </div>
                        </div>
                    </section>

                    <SectionCard
                        title="Skills"
                        subtitle="Add the main capabilities you want recruiters to notice."
                        icon={Code2}
                    >
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(event) => setNewSkill(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        addSkill();
                                    }
                                }}
                                placeholder="Add a skill"
                                className="flex-1 rounded-2xl border border-black/10 bg-[#fbf8f3] px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20"
                            />
                            <button
                                type="button"
                                onClick={addSkill}
                                className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-white transition hover:bg-gray-800"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {profileData.skills.length > 0 ? (
                                profileData.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                                    >
                                        {skill}
                                        <button type="button" onClick={() => removeSkill(skill)} className="text-gray-400 transition hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </span>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No skills added yet.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>

                <div className="space-y-8">
                    <SectionCard
                        title="Resumes & Documents"
                        subtitle="Upload your resume to sync your profile details or link external resumes created via AI Builder."
                        icon={FileText}
                        action={(
                            <div className="flex items-center gap-3">
                                <input
                                    id="resume-pdf-upload"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleResumeUpload}
                                />
                                <button
                                    type="button"
                                    disabled={uploadingResume}
                                    onClick={() => document.getElementById('resume-pdf-upload')?.click()}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:bg-gray-400"
                                >
                                    {uploadingResume ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Upload Resume (PDF)
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const builderBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                            ? 'http://localhost:3000'
                                            : 'https://resume-builder-delta-seven.vercel.app';
                                        const userId = user.uid || user._id || user.id;
                                        const redirectUrl = encodeURIComponent(window.location.href);
                                        const backendUrl = encodeURIComponent(API_URL);
                                        window.open(`${builderBase}/login?from=hire1percent&userId=${userId}&redirectUrl=${redirectUrl}&backendUrl=${backendUrl}`, '_blank');
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                                >
                                    <Sparkles size={16} className="text-amber-500" />
                                    AI Builder
                                </button>
                            </div>
                        )}
                    >
                        {parsingResume && (
                            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
                                <Loader2 size={24} className="mx-auto animate-spin text-blue-600 mb-2" />
                                <p className="text-sm font-semibold text-blue-900">Parsing and Analyzing Resume...</p>
                                <p className="text-xs text-blue-700 mt-1">Extracting skills, experience, and educational background to enrich your candidate profile.</p>
                            </div>
                        )}

                        {resumeSuccessMessage && (
                            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm font-medium">
                                {resumeSuccessMessage}
                            </div>
                        )}

                        {showNextStepsPopup && (
                            <div className="mb-6 rounded-[2rem] border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-white p-6 shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900">
                                            {mlopsScore !== null ? `Resume Analyzed: Match Score ${mlopsScore}%` : "Where would you like to go next?"}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {mlopsScore !== null 
                                                ? "Your resume has been successfully analyzed against the MLOps Engineer position. Proceed to complete your assessment." 
                                                : "Your profile details are updated. Choose your next action:"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {mlopsJobId ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/seeker/apply/${mlopsJobId}`)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                        >
                                            Proceed to Skill Assessment & Interview
                                            <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <>
                                            {new URLSearchParams(location.search).get('jobId') && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/seeker/apply/${new URLSearchParams(location.search).get('jobId')}`)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                                >
                                                    Continue Job Application
                                                    <ArrowRight size={14} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => navigate('/seeker/mock-interview')}
                                                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                                            >
                                                AI Interview Practice
                                                <ArrowRight size={14} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowNextStepsPopup(false)}
                                        className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {resumesLoading ? (
                                <div className="py-6 text-center text-gray-400">
                                    <Loader2 className="mx-auto animate-spin mb-2" size={20} />
                                    Loading saved resumes...
                                </div>
                            ) : resumes.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {resumes.map((resItem) => (
                                        <div 
                                            key={resItem._id} 
                                            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                                                resItem.isDefault 
                                                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm' 
                                                    : 'border-black/10 bg-white hover:border-black/20'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-black/5 text-gray-500">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 line-clamp-1">{resItem.title}</h4>
                                                            <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                                resItem.source === 'builder' 
                                                                    ? 'bg-amber-100 text-amber-800' 
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {resItem.source === 'builder' ? 'AI Builder' : 'PDF Upload'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {resItem.isDefault && (
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                                                <Star size={12} className="fill-current" />
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteResume(resItem._id)}
                                                            className="text-gray-400 hover:text-red-500 transition p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="mt-3 text-[11px] text-gray-400">
                                                    Added on {new Date(resItem.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="mt-5 flex gap-2">
                                                {resItem.fileUrl ? (
                                                    <a
                                                        href={resItem.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                                    >
                                                        <ExternalLink size={12} />
                                                        View PDF
                                                    </a>
                                                ) : resItem.source === 'builder' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const builderBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                                                ? 'http://localhost:3000'
                                                                : 'https://resume-builder-delta-seven.vercel.app';
                                                            const userId = user.uid || user._id || user.id;
                                                            window.open(`${builderBase}/preview?from=seeker-profile&userId=${userId}`, '_blank');
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                                    >
                                                        <ExternalLink size={12} />
                                                        View Resume
                                                    </button>
                                                ) : null}
                                                {!resItem.isDefault && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefaultResume(resItem._id)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-black py-2 text-xs font-semibold text-white transition hover:bg-gray-850"
                                                    >
                                                        Use as Default
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 rounded-[1.75rem] bg-[#fbf8f3] border border-dashed border-black/10">
                                    <FileText className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="text-sm font-medium text-gray-600">No resumes stored yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Upload a PDF or build one with our AI builder to get started.</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Basic information"
                        subtitle="Your core identity and contact details used across the candidate workflow."
                        icon={User}
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Professional summary</label>
                                <textarea
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Write a short summary about your experience and strengths."
                                    className="w-full rounded-[1.5rem] border border-black/10 bg-[#fbf8f3] px-5 py-4 text-sm leading-7 text-gray-700 outline-none transition focus:border-black/20"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-2xl border border-black/10 bg-gray-100 py-3 pl-12 pr-4 text-sm text-gray-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 9876543210"
                                        className="w-full rounded-2xl border border-black/10 bg-[#fbf8f3] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Professional links"
                        subtitle="These links help recruiters and the platform evaluate your public professional presence."
                        icon={Github}
                    >
                        <div id="professional-links" className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">GitHub URL</label>
                                <div className="relative">
                                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="url"
                                        name="githubUrl"
                                        value={profileData.githubUrl}
                                        onChange={handleChange}
                                        placeholder="https://github.com/username"
                                        className="w-full rounded-2xl border border-black/10 bg-[#fbf8f3] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">LinkedIn URL</label>
                                <div className="relative">
                                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="url"
                                        name="linkedinUrl"
                                        value={profileData.linkedinUrl}
                                        onChange={handleChange}
                                        placeholder="https://linkedin.com/in/username"
                                        className="w-full rounded-2xl border border-black/10 bg-[#fbf8f3] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Work experience"
                        subtitle="List the roles and responsibilities you want to highlight."
                        icon={Briefcase}
                        action={(
                            <button
                                type="button"
                                onClick={addExperience}
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                            >
                                <Plus size={16} />
                                Add experience
                            </button>
                        )}
                    >
                        <div className="space-y-4">
                            {profileData.experience.length > 0 ? (
                                profileData.experience.map((item, index) => (
                                    <div key={`experience-${index}`} className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeExperience(index)}
                                                className="text-gray-400 transition hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <input
                                                type="text"
                                                placeholder="Company"
                                                value={item.company}
                                                onChange={(event) => updateExperience(index, 'company', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Role"
                                                value={item.role}
                                                onChange={(event) => updateExperience(index, 'role', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Duration"
                                                value={item.duration}
                                                onChange={(event) => updateExperience(index, 'duration', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20 md:col-span-2"
                                            />
                                            <textarea
                                                rows={3}
                                                placeholder="Description"
                                                value={item.description}
                                                onChange={(event) => updateExperience(index, 'description', event.target.value)}
                                                className="rounded-[1.5rem] border border-black/10 bg-white px-4 py-3 text-sm leading-7 text-gray-700 outline-none transition focus:border-black/20 md:col-span-2"
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No work experience added yet.</p>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Education"
                        subtitle="Add your academic qualifications and certification history."
                        icon={GraduationCap}
                        action={(
                            <button
                                type="button"
                                onClick={addEducation}
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                            >
                                <Plus size={16} />
                                Add education
                            </button>
                        )}
                    >
                        <div className="space-y-4">
                            {profileData.education.length > 0 ? (
                                profileData.education.map((item, index) => (
                                    <div key={`education-${index}`} className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeEducation(index)}
                                                className="text-gray-400 transition hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <input
                                                type="text"
                                                placeholder="Institution"
                                                value={item.institution}
                                                onChange={(event) => updateEducation(index, 'institution', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20 md:col-span-2"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Degree"
                                                value={item.degree}
                                                onChange={(event) => updateEducation(index, 'degree', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Year"
                                                value={item.year}
                                                onChange={(event) => updateEducation(index, 'year', event.target.value)}
                                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-black/20"
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No education entries added yet.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition ${saving ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving profile' : 'Save profile'}
                </button>
            </div>
        </form>
    );
};

export default SeekerProfile;
