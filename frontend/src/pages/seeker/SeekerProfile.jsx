import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Briefcase,
    Building,
    Calendar,
    Camera,
    CheckCircle2,
    Code2,
    ExternalLink,
    FileText,
    Github,
    GraduationCap,
    Linkedin,
    Loader2,
    Mail,
    Phone,
    Plus,
    Save,
    Sparkles,
    Star,
    Trash2,
    Upload,
    User,
    ArrowRight,
    X,
    Layers
} from 'lucide-react';
import { getUserProfile, saveUserProfile, API_URL, getAuthHeaders } from '../../firebase';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileSkeleton } from '../../components/Skeleton';

const SectionCard = ({ title, subtitle, icon: Icon, children, action, badge, tone = 'indigo' }) => {
    const toneStyles = {
        indigo: 'bg-indigo-50/80 text-indigo-600 border-indigo-100',
        purple: 'bg-purple-50/80 text-purple-600 border-purple-100',
        blue: 'bg-blue-50/80 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50/80 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50/80 text-amber-600 border-amber-100',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const currentTone = toneStyles[tone] || toneStyles.indigo;

    return (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition-all duration-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-xs ${currentTone}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">{title}</h2>
                            {badge}
                        </div>
                        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            <div className="mt-6">{children}</div>
        </section>
    );
};

const SeekerProfile = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const uid = user?.uid || user?._id || user?.id;

    const { data: resumes = [], isLoading: resumesLoading } = useQuery({
        queryKey: ['resumes', uid],
        queryFn: async () => {
            if (!uid) return [];
            const res = await axios.get(`${API_URL}/user-resumes/${uid}`, {
                headers: { 'x-user-id': uid }
            });
            return res.data;
        },
        enabled: !!uid,
    });

    const [uploadingResume, setUploadingResume] = useState(false);
    const [parsingResume, setParsingResume] = useState(false);
    const [resumeSuccessMessage, setResumeSuccessMessage] = useState('');
    const [showNextStepsPopup, setShowNextStepsPopup] = useState(false);
    const [mlopsJobId, setMlopsJobId] = useState(null);
    const [mlopsScore, setMlopsScore] = useState(null);

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

    const { data: fetchedProfile, isLoading: profileLoading } = useQuery({
        queryKey: ['userProfile', uid],
        queryFn: async () => {
            if (!uid) return null;
            return await getUserProfile(uid);
        },
        enabled: !!uid,
    });

    useEffect(() => {
        if (fetchedProfile) {
            setProfileData({
                name: fetchedProfile.name || '',
                email: fetchedProfile.email || '',
                phone: fetchedProfile.phone || '',
                bio: fetchedProfile.bio || '',
                profilePic: fetchedProfile.profilePic || '',
                skills: fetchedProfile.skills || [],
                education: (fetchedProfile.education || []).map(edu => ({
                    institution: edu.institution || '',
                    degree: edu.degree || '',
                    year: edu.year || ''
                })),
                experience: (fetchedProfile.experience || []).map(exp => ({
                    company: exp.company || '',
                    role: exp.role || '',
                    duration: exp.duration || '',
                    description: exp.description || ''
                })),
                githubUrl: fetchedProfile.githubUrl || '',
                linkedinUrl: fetchedProfile.linkedinUrl || ''
            });
        }
    }, [fetchedProfile]);

    // Calculate profile completeness score
    const profileCompleteness = useMemo(() => {
        let score = 0;
        if (profileData.name) score += 10;
        if (profileData.email) score += 10;
        if (profileData.phone) score += 10;
        if (profileData.bio) score += 15;
        if (profileData.skills?.length >= 3) score += 15;
        if (profileData.githubUrl) score += 10;
        if (profileData.linkedinUrl) score += 10;
        if (profileData.experience?.length >= 1) score += 10;
        if (resumes?.length >= 1) score += 10;
        return Math.min(score, 100);
    }, [profileData, resumes]);

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

        const currentUid = user.uid || user._id || user.id;
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('userId', currentUid);

        try {
            const uploadRes = await axios.post(`${API_URL}/user-resumes/upload`, formData, {
                headers: { 
                    'x-user-id': currentUid
                }
            });

            if (uploadRes.data.extractedText) {
                const parsedRes = await axios.post(`${API_URL}/parse-resume-structured`, {
                    resumeText: uploadRes.data.extractedText,
                    userId: currentUid
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
                        const analysisRes = await axios.post(`${API_URL}/analyze-resume`, {
                            resumeText: uploadRes.data.extractedText || "",
                            jobSkills: mlopsJob.skills,
                            jobExperience: mlopsJob.experienceLevel,
                            jobEducation: mlopsJob.education,
                            userId: currentUid,
                            jobId: mlopsJob._id,
                            specialInstructions: mlopsJob.specialInstructions
                        });

                        const matchPercentage = typeof analysisRes.data.matchPercentage === 'number' 
                            ? analysisRes.data.matchPercentage 
                            : parseInt(analysisRes.data.matchPercentage, 10) || 0;

                        await axios.post(`${API_URL}/applications`, {
                            jobId: mlopsJob._id,
                            userId: currentUid,
                            status: 'APPLIED',
                            resumeMatchPercent: matchPercentage,
                            applicantName: profileData.name || user.name || 'Candidate',
                            applicantEmail: profileData.email || user.email || '',
                            applicantPic: profileData.profilePic || user.profilePic || ''
                        });

                        setMlopsScore(matchPercentage);
                        setMlopsJobId(mlopsJob._id);
                        setResumeSuccessMessage(`Resume analyzed successfully for MLOps Engineer role! Match Score: ${matchPercentage}%`);
                        setShowNextStepsPopup(true);
                        queryClient.invalidateQueries({ queryKey: ['resumes', currentUid] });
                        return;
                    }
                } catch (err) {
                    console.error("Failed to analyze MLOps resume or submit application:", err);
                }
                navigate('/candidate/jobs');
                return;
            }

            setResumeSuccessMessage("Resume uploaded and candidate profile enriched successfully!");
            setShowNextStepsPopup(true);
            queryClient.invalidateQueries({ queryKey: ['resumes', currentUid] });
        } catch (error) {
            console.error("Failed to upload/parse resume:", error);
            alert("Failed to upload or parse resume. Please try again.");
        } finally {
            setUploadingResume(false);
            setParsingResume(false);
        }
    };

    const handleSetDefaultResume = async (resumeId) => {
        if (!resumeId) return;
        const currentUid = user.uid || user._id || user.id;
        try {
            const authHeaders = await getAuthHeaders();
            await axios.put(`${API_URL}/user-resumes/${resumeId}/default`, { userId: currentUid }, {
                headers: {
                    ...authHeaders,
                    'x-user-id': currentUid
                }
            });
            queryClient.invalidateQueries({ queryKey: ['resumes', currentUid] });
        } catch (error) {
            console.error("Failed to set default resume:", error);
        }
    };

    const handleDeleteResume = async (resumeId) => {
        if (!resumeId) return;
        if (!window.confirm("Are you sure you want to delete this resume?")) return;
        const currentUid = user.uid || user._id || user.id;

        // Optimistically remove from UI cache immediately
        queryClient.setQueryData(['resumes', currentUid], (old = []) =>
            Array.isArray(old) ? old.filter(r => (r._id || r.id) !== resumeId) : []
        );

        try {
            const authHeaders = await getAuthHeaders();
            await axios.delete(`${API_URL}/user-resumes/${resumeId}`, {
                headers: {
                    ...authHeaders,
                    'x-user-id': currentUid
                }
            });
            queryClient.invalidateQueries({ queryKey: ['resumes', currentUid] });
        } catch (error) {
            console.error("Failed to delete resume:", error);
            // Invalidate query to ensure state is synchronized
            queryClient.invalidateQueries({ queryKey: ['resumes', currentUid] });
        }
    };

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

    if (profileLoading) {
        return <ProfileSkeleton />;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Elevated Header Banner */}
            <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-indigo-50/30 p-6 md:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl" />
                <div className="pointer-events-none absolute right-48 -bottom-16 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700 shadow-2xs">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Candidate Profile
                        </div>
                        <h1 className="mt-2.5 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                            Keep your profile application-ready
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs md:text-sm text-slate-500 leading-relaxed">
                            Update your credentials, portfolio links, and parsed resumes to maximize automated match scores with top recruiters.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <AnimatePresence>
                            {saved && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 shadow-xs"
                                >
                                    <CheckCircle2 size={16} />
                                    Profile Saved
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs md:text-sm font-bold transition-all shadow-sm active:scale-95 ${
                                saving ? 'cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                            }`}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Warning banner if professional links are missing */}
            {(!profileData.githubUrl || !profileData.linkedinUrl) && (
                <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-white p-4.5 shadow-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs border border-amber-200">
                                <AlertCircle size={19} />
                            </div>
                            <div>
                                <h2 className="text-xs md:text-sm font-bold text-amber-950">Add your GitHub & LinkedIn profiles</h2>
                                <p className="text-[11px] md:text-xs text-amber-800/80 mt-0.5">
                                    Recruiters evaluate verified portfolios to benchmark code quality and career track record.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => document.getElementById('professional-links')?.scrollIntoView({ behavior: 'smooth' })}
                            className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 shadow-2xs shrink-0"
                        >
                            Add Links
                        </button>
                    </div>
                </div>
            )}

            {/* Main 2-Column Grid */}
            <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
                {/* Left Column: Identity & Skills Hub */}
                <div className="space-y-6">
                    {/* Candidate Identity Card */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-7 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition-all">
                        <input
                            id="candidate-profile-picture"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="relative mx-auto w-fit">
                            <button
                                type="button"
                                onClick={() => document.getElementById('candidate-profile-picture')?.click()}
                                className="group relative block rounded-3xl p-1 transition-all"
                            >
                                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50 text-3xl font-black text-indigo-900 shadow-sm transition group-hover:scale-[1.02] group-hover:ring-4 group-hover:ring-indigo-100">
                                    {profileData.profilePic ? (
                                        <img loading="lazy" src={profileData.profilePic} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        profileData.name?.[0]?.toUpperCase() || 'C'
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition group-hover:bg-indigo-600 group-hover:scale-105">
                                    <Camera size={14} />
                                </div>
                            </button>
                        </div>

                        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{profileData.name || 'Candidate'}</h2>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">{profileData.email || 'Email not provided'}</p>

                        {/* Profile Completeness Bar */}
                        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-left">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-emerald-600" />
                                    Profile Strength
                                </span>
                                <span className="text-emerald-700 font-extrabold">{profileCompleteness}%</span>
                            </div>
                            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 shadow-xs"
                                    style={{ width: `${profileCompleteness}%` }}
                                />
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500 font-medium">
                                {profileCompleteness >= 80 ? '🎯 Profile is primed for top recruiter matching' : '💡 Complete all sections to unlock maximum match rates'}
                            </p>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills</p>
                                <p className="mt-1 text-base font-extrabold text-slate-900">{profileData.skills.length}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exp</p>
                                <p className="mt-1 text-base font-extrabold text-slate-900">{profileData.experience.length}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resumes</p>
                                <p className="mt-1 text-base font-extrabold text-slate-900">{resumes.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Skills Hub Card */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-7 shadow-[0_10px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition-all">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
                                    <Code2 size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Technical Skills</h3>
                                    <p className="text-[10px] text-slate-500">Core technologies & tools</p>
                                </div>
                            </div>
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100">
                                {profileData.skills.length} Added
                            </span>
                        </div>

                        {/* Add Skill Input */}
                        <div className="mt-4 flex gap-2">
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
                                placeholder="Add skill (e.g. React, Python)..."
                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                            />
                            <button
                                type="button"
                                onClick={addSkill}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2.5 text-white transition hover:bg-indigo-600 shadow-xs active:scale-95"
                                title="Add Skill"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Skill Tags */}
                        <div className="mt-4 flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
                            {profileData.skills.length > 0 ? (
                                profileData.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100/80 hover:border-indigo-200 shadow-2xs"
                                    >
                                        <span>{skill}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-indigo-400 hover:text-red-600 transition"
                                            title={`Remove ${skill}`}
                                        >
                                            <X size={13} />
                                        </button>
                                    </span>
                                ))
                            ) : (
                                <div className="text-center py-6 w-full">
                                    <Code2 className="mx-auto text-slate-300 mb-1.5" size={24} />
                                    <p className="text-xs text-slate-400">No skills added yet</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Type a skill above & press Enter</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Resumes, Basic Info, Experience, Education */}
                <div className="space-y-6">
                    {/* Resumes & Documents Card */}
                    <SectionCard
                        title="Resumes & Documents"
                        subtitle="Upload your resume to auto-sync skills or generate one with the AI Builder."
                        icon={FileText}
                        tone="blue"
                        action={(
                            <div className="flex flex-wrap items-center gap-2">
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
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-600 disabled:bg-slate-400 shadow-xs active:scale-95"
                                >
                                    {uploadingResume ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={13} />
                                            <span>Upload PDF</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const builderBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                            ? 'http://localhost:3000'
                                            : 'https://resume-builder-delta-seven.vercel.app';
                                        const currentUid = user.uid || user._id || user.id;
                                        const redirectUrl = encodeURIComponent(window.location.href);
                                        const backendUrl = encodeURIComponent(API_URL);
                                        window.open(`${builderBase}/login?from=hire1percent&userId=${currentUid}&redirectUrl=${redirectUrl}&backendUrl=${backendUrl}`, '_blank');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:from-amber-600 hover:to-orange-600 shadow-xs active:scale-95"
                                >
                                    <Sparkles size={13} />
                                    <span>AI Builder</span>
                                </button>
                            </div>
                        )}
                    >
                        {parsingResume && (
                            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center">
                                <Loader2 size={20} className="mx-auto animate-spin text-blue-600 mb-1.5" />
                                <p className="text-xs font-bold text-blue-900">Parsing and Analyzing Resume...</p>
                                <p className="text-[11px] text-blue-700 mt-0.5">Extracting skills, experience, and educational background.</p>
                            </div>
                        )}

                        {resumeSuccessMessage && (
                            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-800 text-xs font-medium flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                <span>{resumeSuccessMessage}</span>
                            </div>
                        )}

                        {showNextStepsPopup && (
                            <div className="mb-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">
                                            {mlopsScore !== null ? `Resume Analyzed: Match Score ${mlopsScore}%` : "Where would you like to go next?"}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {mlopsScore !== null 
                                                ? "Your resume has been evaluated against the MLOps Engineer position. Proceed to complete your assessment." 
                                                : "Your profile details are updated. Choose your next action:"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3.5 flex flex-wrap gap-2">
                                    {mlopsJobId ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/candidate/apply/${mlopsJobId}`)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                        >
                                            <span>Proceed to Skill Assessment & Interview</span>
                                            <ArrowRight size={13} />
                                        </button>
                                    ) : (
                                        <>
                                            {new URLSearchParams(location.search).get('jobId') && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/candidate/apply/${new URLSearchParams(location.search).get('jobId')}`)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                                >
                                                    <span>Continue Job Application</span>
                                                    <ArrowRight size={13} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => navigate('/candidate/mock-interview')}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                                            >
                                                <span>AI Interview Practice</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowNextStepsPopup(false)}
                                        className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Resume Cards Grid */}
                        <div className="space-y-3">
                            {resumesLoading ? (
                                <div className="py-8 text-center text-xs text-slate-400">
                                    <Loader2 className="mx-auto animate-spin mb-2 text-indigo-600" size={20} />
                                    Loading saved resumes...
                                </div>
                            ) : resumes.length > 0 ? (
                                <div className="grid gap-3.5 sm:grid-cols-2">
                                    {resumes.map((resItem) => (
                                        <div 
                                            key={resItem._id} 
                                            className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${
                                                resItem.isDefault 
                                                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm ring-1 ring-emerald-200' 
                                                    : 'border-slate-200/80 bg-slate-50/40 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 truncate">{resItem.title}</h4>
                                                            <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                                resItem.source === 'builder' 
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                            }`}>
                                                                {resItem.source === 'builder' ? 'AI Builder' : 'PDF Upload'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {resItem.isDefault && (
                                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Default Resume">
                                                                <Star size={11} className="fill-current" />
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteResume(resItem._id || resItem.id)}
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition p-1.5 rounded-lg"
                                                            title="Delete Resume"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="mt-2.5 text-[10px] font-medium text-slate-400">
                                                    Added on {new Date(resItem.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="mt-3.5 flex gap-2 pt-2.5 border-t border-slate-100">
                                                {resItem.fileUrl ? (
                                                    <a
                                                        href={resItem.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>View PDF</span>
                                                    </a>
                                                ) : resItem.source === 'builder' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const builderBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                                                ? 'http://localhost:3000'
                                                                : 'https://resume-builder-delta-seven.vercel.app';
                                                            const currentUid = user.uid || user._id || user.id;
                                                            window.open(`${builderBase}/preview?from=seeker-profile&userId=${currentUid}`, '_blank');
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>Preview</span>
                                                    </button>
                                                ) : null}
                                                {!resItem.isDefault && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefaultResume(resItem._id || resItem.id)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 text-[11px] font-bold text-white transition hover:bg-indigo-600 shadow-2xs"
                                                    >
                                                        <span>Set Default</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
                                    <FileText className="mx-auto text-slate-400 mb-1.5" size={26} />
                                    <p className="text-xs font-bold text-slate-700">No resumes stored yet</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Upload a PDF or build one with our AI builder to get started.</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Basic Information */}
                    <SectionCard
                        title="Basic Information"
                        subtitle="Your identity and primary contact details for recruiters."
                        icon={User}
                        tone="indigo"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Professional Summary</label>
                                <textarea
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Write a short summary highlighting your core expertise, years of experience, and tech stack..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs md:text-sm leading-relaxed text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Email (Verified)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/80 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-500 outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 9876543210"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Professional Links */}
                    <SectionCard
                        title="Professional Links"
                        subtitle="Public repositories and profile links required for recruiter assessments."
                        icon={Github}
                        tone="purple"
                    >
                        <div id="professional-links" className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    GitHub Profile <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="url"
                                        name="githubUrl"
                                        value={profileData.githubUrl}
                                        onChange={handleChange}
                                        placeholder="https://github.com/username"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    LinkedIn Profile <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="url"
                                        name="linkedinUrl"
                                        value={profileData.linkedinUrl}
                                        onChange={handleChange}
                                        placeholder="https://linkedin.com/in/username"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Work Experience */}
                    <SectionCard
                        title="Work Experience"
                        subtitle="Highlight past engineering roles, internships, and key achievements."
                        icon={Briefcase}
                        tone="emerald"
                        action={(
                            <button
                                type="button"
                                onClick={addExperience}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white shadow-2xs"
                            >
                                <Plus size={14} />
                                <span>Add Experience</span>
                            </button>
                        )}
                    >
                        <div className="space-y-3">
                            {profileData.experience.length > 0 ? (
                                profileData.experience.map((item, index) => (
                                    <div key={`experience-${index}`} className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs">
                                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                                                    {index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {item.role ? `${item.role} at ${item.company || 'Company'}` : 'Experience Entry'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeExperience(index)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition p-1.5 rounded-lg"
                                                title="Delete Experience"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <input
                                                type="text"
                                                placeholder="Company Name"
                                                value={item.company || ''}
                                                onChange={(event) => updateExperience(index, 'company', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Job Title / Role"
                                                value={item.role || ''}
                                                onChange={(event) => updateExperience(index, 'role', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Duration (e.g. Jan 2024 - Present)"
                                                value={item.duration || ''}
                                                onChange={(event) => updateExperience(index, 'duration', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium sm:col-span-2"
                                            />
                                            <textarea
                                                rows={2}
                                                placeholder="Key contributions and technical stack used..."
                                                value={item.description || ''}
                                                onChange={(event) => updateExperience(index, 'description', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm leading-relaxed text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium sm:col-span-2"
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 py-4 text-center">No work experience added yet. Click &quot;Add Experience&quot; to highlight your past roles.</p>
                            )}
                        </div>
                    </SectionCard>

                    {/* Education */}
                    <SectionCard
                        title="Education & Certifications"
                        subtitle="Add degrees, universities, and specialized training programs."
                        icon={GraduationCap}
                        tone="amber"
                        action={(
                            <button
                                type="button"
                                onClick={addEducation}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white shadow-2xs"
                            >
                                <Plus size={14} />
                                <span>Add Education</span>
                            </button>
                        )}
                    >
                        <div className="space-y-3">
                            {profileData.education.length > 0 ? (
                                profileData.education.map((item, index) => (
                                    <div key={`education-${index}`} className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs">
                                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                                                    {index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {item.degree ? `${item.degree} - ${item.institution || 'University'}` : 'Education Entry'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeEducation(index)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition p-1.5 rounded-lg"
                                                title="Delete Education"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <input
                                                type="text"
                                                placeholder="Institution / University"
                                                value={item.institution || ''}
                                                onChange={(event) => updateEducation(index, 'institution', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium sm:col-span-2"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Graduation Year"
                                                value={item.year || ''}
                                                onChange={(event) => updateEducation(index, 'year', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Degree / Major (e.g. B.Tech Computer Science)"
                                                value={item.degree || ''}
                                                onChange={(event) => updateEducation(index, 'degree', event.target.value)}
                                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 font-medium sm:col-span-3"
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 py-4 text-center">No education entries added yet. Click &quot;Add Education&quot; to list your degrees.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* Bottom Floating/Sticky Save Profile Action Bar */}
            <div className="sticky bottom-4 z-20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-4.5 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <p className="text-xs font-medium text-slate-600">
                        Make sure to save changes so recruiters always see your latest resume and portfolio links.
                    </p>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-xs md:text-sm font-bold transition-all shadow-sm shrink-0 active:scale-95 ${
                        saving ? 'cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-md'
                    }`}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
            </div>
        </form>
    );
};

export default SeekerProfile;
