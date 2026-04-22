import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    Code2,
    FileText,
    GraduationCap,
    Languages,
    Loader2,
    Mail,
    MapPin,
    Phone,
    ScrollText,
    ShieldCheck,
    Sparkles,
    Upload,
    UserRound
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../../firebase';

const createEmptyStructuredProfile = () => ({
    basics: {
        name: '',
        email: '',
        phone: '',
        location: ''
    },
    summary: '',
    education: [],
    skills: {
        programming: [],
        frameworks: [],
        databases: [],
        tools: [],
        soft: []
    },
    languages: [],
    workExperience: [],
    projects: [],
    professionalProfiles: [],
    publications: [],
    experienceYears: 0
});

const uniqueStrings = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const normalizeStructuredProfile = (payload = {}) => ({
    basics: {
        name: String(payload?.basics?.name || '').trim(),
        email: String(payload?.basics?.email || '').trim(),
        phone: String(payload?.basics?.phone || '').trim(),
        location: String(payload?.basics?.location || '').trim()
    },
    summary: String(payload?.summary || '').trim(),
    education: Array.isArray(payload?.education)
        ? payload.education
            .map((item) => ({
                institution: String(item?.institution || '').trim(),
                country: String(item?.country || '').trim(),
                degree: String(item?.degree || '').trim(),
                field: String(item?.field || '').trim(),
                startYear: String(item?.startYear || '').trim(),
                startMonth: String(item?.startMonth || '').trim(),
                endYear: String(item?.endYear || '').trim(),
                endMonth: String(item?.endMonth || '').trim(),
                currentlyStudying: Boolean(item?.currentlyStudying),
                cgpa: String(item?.cgpa || '').trim(),
                scale: String(item?.scale || '').trim()
            }))
            .filter((item) => item.institution || item.degree)
        : [],
    skills: {
        programming: uniqueStrings(payload?.skills?.programming || []),
        frameworks: uniqueStrings(payload?.skills?.frameworks || []),
        databases: uniqueStrings(payload?.skills?.databases || []),
        tools: uniqueStrings(payload?.skills?.tools || []),
        soft: uniqueStrings(payload?.skills?.soft || [])
    },
    languages: uniqueStrings(payload?.languages || []),
    workExperience: Array.isArray(payload?.workExperience)
        ? payload.workExperience
            .map((item) => ({
                company: String(item?.company || '').trim(),
                position: String(item?.position || item?.role || '').trim(),
                startYear: String(item?.startYear || '').trim(),
                startMonth: String(item?.startMonth || '').trim(),
                endYear: String(item?.endYear || '').trim(),
                endMonth: String(item?.endMonth || '').trim(),
                currentlyWorking: Boolean(item?.currentlyWorking),
                employmentType: String(item?.employmentType || 'Full Time').trim(),
                description: String(item?.description || '').trim(),
                projects: Array.isArray(item?.projects) ? item.projects.map(p => ({
                    name: String(p?.name || '').trim(),
                    description: String(p?.description || '').trim()
                })) : []
            }))
            .filter((item) => item.company || item.position)
        : [],
    projects: Array.isArray(payload?.projects)
        ? payload.projects
            .map((item) => ({
                name: String(item?.name || '').trim(),
                tech: uniqueStrings(item?.tech || []),
                role: String(item?.role || '').trim(),
                description: String(item?.description || '').trim()
            }))
            .filter((item) => item.name || item.role || item.description || item.tech.length)
        : [],
    professionalProfiles: Array.isArray(payload?.professionalProfiles)
        ? payload.professionalProfiles
            .map((item) => ({
                platform: String(item?.platform || '').trim(),
                url: String(item?.url || '').trim()
            }))
            .filter((item) => item.platform || item.url)
        : [],
    publications: Array.isArray(payload?.publications)
        ? payload.publications
            .map((item) => ({
                title: String(item?.title || '').trim(),
                url: String(item?.url || '').trim(),
                year: String(item?.year || '').trim(),
                citations: String(item?.citations || '').trim()
            }))
            .filter((item) => item.title)
        : [],
    experienceYears: Math.max(0, Number(payload?.experienceYears) || 0)
});

const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const hasBasicInfo = (profile) =>
    [profile.basics.name, profile.basics.email, profile.basics.phone, profile.basics.location].some(Boolean);

const hasSkills = (profile) =>
    Object.values(profile.skills).some((group) => Array.isArray(group) && group.length > 0);

const hasStructuredResumeData = (profile) =>
    hasBasicInfo(profile) ||
    profile.education.length > 0 ||
    hasSkills(profile) ||
    profile.languages.length > 0 ||
    profile.workExperience.length > 0 ||
    profile.projects.length > 0 ||
    Boolean(profile.summary);

const sectionConfig = [
    { id: 'resume', label: 'Resume Upload', icon: FileText },
    { id: 'basic', label: 'Basic information', icon: UserRound },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills and languages', icon: Code2 },
    { id: 'experience', label: 'Work Experience', icon: BriefcaseBusiness },
    { id: 'profiles', label: 'Professional Profiles', icon: Sparkles },
    { id: 'publications', label: 'Published Work', icon: ScrollText },
    { id: 'summary', label: 'Profile summary', icon: ScrollText }
];

const DetailCard = ({ title, subtitle, icon: Icon, children }) => (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                    <Icon size={22} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
                </div>
            </div>
        </div>
        <div className="mt-6">{children}</div>
    </div>
);

const FormField = ({ label, required, children, error }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
);

const Input = ({ className = '', ...props }) => (
    <input
        className={`w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${className}`}
        {...props}
    />
);

const Select = ({ children, className = '', ...props }) => (
    <select
        className={`w-full appearance-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${className}`}
        {...props}
    >
        {children}
    </select>
);

const Textarea = ({ className = '', ...props }) => (
    <textarea
        className={`w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${className}`}
        {...props}
    />
);

const ResumeAnalyzer = ({ job, user, onComplete }) => {
    const navigate = useNavigate();
    const userId = user.uid || user._id || user.id;

    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [applicationSaved, setApplicationSaved] = useState(false);
    const [structuredProfile, setStructuredProfile] = useState(createEmptyStructuredProfile());
    const [activeSection, setActiveSection] = useState('resume');
    const [isRedirecting, setIsRedirecting] = useState(false);

    const previewUrl = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    useEffect(() => () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    }, [previewUrl]);

    useEffect(() => {
        const loadStoredResumeProfile = async () => {
            if (!userId) {
                return;
            }

            try {
                const response = await axios.get(`${API_URL}/resume-profile/${userId}`);
                const normalizedProfile = normalizeStructuredProfile(response.data);

                if (!hasStructuredResumeData(normalizedProfile)) {
                    return;
                }

                setStructuredProfile(normalizedProfile);

                const firstCompletedSection = sectionConfig.find((section) => section.id !== 'resume' && (
                    section.id === 'basic' ? hasBasicInfo(normalizedProfile) :
                        section.id === 'education' ? normalizedProfile.education.length > 0 :
                            section.id === 'skills' ? hasSkills(normalizedProfile) :
                                section.id === 'languages' ? normalizedProfile.languages.length > 0 :
                                    section.id === 'experience' ? normalizedProfile.workExperience.length > 0 :
                                        section.id === 'projects' ? normalizedProfile.projects.length > 0 :
                                            Boolean(normalizedProfile.summary)
                ));

                setActiveSection(firstCompletedSection?.id || 'resume');
            } catch (storedProfileError) {
                if (storedProfileError?.response?.status !== 404) {
                    console.error('Failed to load stored resume profile:', storedProfileError);
                }
            }
        };

        loadStoredResumeProfile();
    }, [userId]);

    const sectionStatus = useMemo(() => ({
        resume: Boolean(file),
        basic: hasBasicInfo(structuredProfile),
        education: structuredProfile.education.length > 0,
        skills: hasSkills(structuredProfile),
        experience: structuredProfile.workExperience.length > 0,
        profiles: structuredProfile.professionalProfiles.length > 0,
        publications: structuredProfile.publications.length > 0,
        summary: Boolean(structuredProfile.summary)
    }), [file, structuredProfile]);

    const updateBasics = (field, value) => {
        setStructuredProfile(prev => ({
            ...prev,
            basics: { ...prev.basics, [field]: value }
        }));
    };

    const updateEducation = (index, field, value) => {
        const newEdu = [...structuredProfile.education];
        newEdu[index] = { ...newEdu[index], [field]: value };
        setStructuredProfile(prev => ({ ...prev, education: newEdu }));
    };

    const addEducation = () => {
        setStructuredProfile(prev => ({
            ...prev,
            education: [...prev.education, {
                institution: '', country: '', degree: '', field: '',
                startYear: '', startMonth: '', endYear: '', endMonth: '',
                currentlyStudying: false, cgpa: '', scale: ''
            }]
        }));
    };

    const removeEducation = (index) => {
        const newEdu = structuredProfile.education.filter((_, i) => i !== index);
        setStructuredProfile(prev => ({ ...prev, education: newEdu }));
    };

    const updateExperience = (index, field, value) => {
        const newExp = [...structuredProfile.workExperience];
        newExp[index] = { ...newExp[index], [field]: value };
        setStructuredProfile(prev => ({ ...prev, workExperience: newExp }));
    };

    const addExperience = () => {
        setStructuredProfile(prev => ({
            ...prev,
            workExperience: [...prev.workExperience, {
                company: '', position: '', startYear: '', startMonth: '',
                endYear: '', endMonth: '', currentlyWorking: false,
                employmentType: 'Full Time', description: '', projects: []
            }]
        }));
    };

    const removeExperience = (index) => {
        const newExp = structuredProfile.workExperience.filter((_, i) => i !== index);
        setStructuredProfile(prev => ({ ...prev, workExperience: newExp }));
    };

    const updateProfile = (index, field, value) => {
        const newProfiles = [...structuredProfile.professionalProfiles];
        newProfiles[index] = { ...newProfiles[index], [field]: value };
        setStructuredProfile(prev => ({ ...prev, professionalProfiles: newProfiles }));
    };

    const addProfile = () => {
        setStructuredProfile(prev => ({
            ...prev,
            professionalProfiles: [...prev.professionalProfiles, { platform: '', url: '' }]
        }));
    };

    const removeProfile = (index) => {
        const newProfiles = structuredProfile.professionalProfiles.filter((_, i) => i !== index);
        setStructuredProfile(prev => ({ ...prev, professionalProfiles: newProfiles }));
    };

    const updatePublication = (index, field, value) => {
        const newPubs = [...structuredProfile.publications];
        newPubs[index] = { ...newPubs[index], [field]: value };
        setStructuredProfile(prev => ({ ...prev, publications: newPubs }));
    };

    const addPublication = () => {
        setStructuredProfile(prev => ({
            ...prev,
            publications: [...prev.publications, { title: '', url: '', year: '', citations: '' }]
        }));
    };

    const removePublication = (index) => {
        const newPubs = structuredProfile.publications.filter((_, i) => i !== index);
        setStructuredProfile(prev => ({ ...prev, publications: newPubs }));
    };

    const updateSkills = (category, value) => {
        setStructuredProfile(prev => ({
            ...prev,
            skills: { ...prev.skills, [category]: value }
        }));
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0];
        setFile(selectedFile || null);
        setError(null);
        setAnalysisResult(null);
        setStructuredProfile(createEmptyStructuredProfile());
        setApplicationSaved(false);
        setActiveSection('resume');
    };

    const handleAnalyze = async () => {
        if (!file) {
            setError('Please select a resume file first.');
            return;
        }

        setAnalyzing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('resume', file);

            const extractRes = await axios.post(`${API_URL}/extract-pdf`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const resumeText = extractRes.data.text;

            const analysisRes = await axios.post(`${API_URL}/analyze-resume`, {
                resumeText,
                jobSkills: job.skills,
                jobExperience: job.experienceLevel,
                jobEducation: job.education,
                userId,
                jobId: job._id,
                specialInstructions: job.specialInstructions
            });

            let normalizedProfile = createEmptyStructuredProfile();

            try {
                const structuredRes = await axios.post(`${API_URL}/parse-resume-structured`, {
                    resumeText,
                    userId
                });
                normalizedProfile = normalizeStructuredProfile(structuredRes.data);
            } catch (structuredError) {
                normalizedProfile = createEmptyStructuredProfile();
            }

            const { data } = analysisRes;
            const normalizedData = {
                matchPercentage: typeof data.matchPercentage === 'number' ? data.matchPercentage : parseInt(data.matchPercentage, 10) || 0,
                skillsScore: typeof data.skillsScore === 'number' ? data.skillsScore : parseInt(data.skillsScore, 10) || 0,
                experienceScore: typeof data.experienceScore === 'number' ? data.experienceScore : parseInt(data.experienceScore, 10) || 0,
                skillsFeedback: data.skillsFeedback || 'No skills feedback provided.',
                experienceFeedback: data.experienceFeedback || 'No experience feedback provided.',
                explanation: data.explanation || 'No detailed explanation provided.'
            };

            setStructuredProfile(normalizedProfile);
            setAnalysisResult({
                text: resumeText,
                data: normalizedData,
                structuredProfile: normalizedProfile
            });

            const firstCompletedSection = sectionConfig.find((section) => section.id !== 'resume' && (
                section.id === 'basic' ? hasBasicInfo(normalizedProfile) :
                    section.id === 'education' ? normalizedProfile.education.length > 0 :
                        section.id === 'skills' ? hasSkills(normalizedProfile) :
                            section.id === 'languages' ? normalizedProfile.languages.length > 0 :
                                section.id === 'experience' ? normalizedProfile.workExperience.length > 0 :
                                    section.id === 'projects' ? normalizedProfile.projects.length > 0 :
                                        Boolean(normalizedProfile.summary)
            ));

            setActiveSection(firstCompletedSection?.id || 'resume');

            // --- AUTOMATIC NAVIGATION LOGIC ---
            const minThreshold = job.minPercentage || 60;
            if (normalizedData.matchPercentage >= minThreshold) {
                setIsRedirecting(true);
                // Show success for 2.5 seconds then auto-navigate
                setTimeout(async () => {
                    try {
                        // 1. Save Application
                        await axios.post(`${API_URL}/applications`, {
                            jobId: job._id,
                            userId,
                            status: 'APPLIED',
                            resumeMatchPercent: normalizedData.matchPercentage,
                            applicantName: user.name,
                            applicantEmail: user.email,
                            applicantPic: user.profilePic || ''
                        });

                        // 2. Auto-complete step
                        onComplete({
                            ...normalizedData,
                            structuredProfile: normalizedProfile
                        });
                    } catch (navError) {
                        console.error('Auto-navigation failed:', navError);
                    }
                }, 2500); // 2.5s delay to let user see the extraordinary score gauge
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Failed to analyze resume. Please try again.'
            );
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApplyAndSave = async () => {
        if (!analysisResult) {
            return;
        }

        try {
            await axios.post(`${API_URL}/applications`, {
                jobId: job._id,
                userId,
                status: 'APPLIED',
                resumeMatchPercent: analysisResult.data.matchPercentage,
                applicantName: user.name,
                applicantEmail: user.email,
                applicantPic: user.profilePic || ''
            });

            setApplicationSaved(true);
            setError(null);
        } catch (err) {
            setError('Network error. Could not save application.');
        }
    };

    const threshold = job.minPercentage || 60;
    const matchPercentage = analysisResult?.data?.matchPercentage || 0;
    const isPassed = analysisResult ? matchPercentage >= threshold : false;

    const renderSectionContent = () => {
        if (activeSection === 'resume') {
            return (
                <DetailCard
                    title="Resume Upload"
                    subtitle="Upload the latest PDF resume and analyze it against the selected job."
                    icon={FileText}
                >
                    <div className="space-y-5">
                        <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{file ? file.name : 'No resume selected yet'}</p>
                                        <p className="text-sm text-gray-500">
                                            {file ? `Ready to upload - ${formatFileSize(file.size)}` : 'Upload your latest resume in PDF format'}
                                        </p>
                                    </div>
                                </div>

                                {file && previewUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                                        className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#faf7f1]"
                                    >
                                        View
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <label className="block cursor-pointer rounded-[2rem] border-2 border-dashed border-black/10 bg-[#fcfaf6] px-8 py-14 text-center transition hover:border-black/20 hover:bg-[#faf7f1]">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-gray-600 shadow-sm">
                                <Upload size={30} />
                            </div>
                            <h3 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Drag and drop your resume here, or browse</h3>
                            <p className="mt-3 text-sm text-gray-500">PDF files only, up to 5MB. The file will be analyzed against this job&apos;s requirements.</p>
                        </label>
                    </div>
                </DetailCard>
            );
        }

        if (activeSection === 'basic') {
            return (
                <DetailCard
                    title="Basic information"
                    subtitle="Edit your personal details as they appear on your profile."
                    icon={UserRound}
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField label="Full Name" required>
                            <Input
                                value={structuredProfile.basics.name}
                                onChange={(e) => updateBasics('name', e.target.value)}
                                placeholder="e.g. John Doe"
                            />
                        </FormField>
                        <FormField label="Email" required>
                            <Input
                                value={structuredProfile.basics.email}
                                onChange={(e) => updateBasics('email', e.target.value)}
                                placeholder="e.g. john@example.com"
                            />
                        </FormField>
                        <FormField label="Phone Number">
                            <Input
                                value={structuredProfile.basics.phone}
                                onChange={(e) => updateBasics('phone', e.target.value)}
                                placeholder="+91 98765 43210"
                            />
                        </FormField>
                        <FormField label="Location">
                            <Input
                                value={structuredProfile.basics.location}
                                onChange={(e) => updateBasics('location', e.target.value)}
                                placeholder="e.g. Hyderabad, India"
                            />
                        </FormField>
                    </div>
                </DetailCard>
            );
        }

        if (activeSection === 'education') {
            return (
                <div className="space-y-6">
                    {structuredProfile.education.map((edu, index) => (
                        <DetailCard
                            key={index}
                            title={`Education ${index + 1}`}
                            subtitle="Manage your academic background and qualifications."
                            icon={GraduationCap}
                        >
                            <div className="relative">
                                <button
                                    onClick={() => removeEducation(index)}
                                    className="absolute -top-12 right-0 text-red-500 hover:text-red-600 transition"
                                >
                                    <AlertCircle size={20} />
                                </button>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <FormField label="University / School" required>
                                        <Input
                                            value={edu.institution}
                                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                            placeholder="e.g. Stanford University"
                                        />
                                    </FormField>
                                    <FormField label="Country">
                                        <Select
                                            value={edu.country}
                                            onChange={(e) => updateEducation(index, 'country', e.target.value)}
                                        >
                                            <option value="">Select country</option>
                                            <option value="India">India</option>
                                            <option value="USA">USA</option>
                                            <option value="UK">UK</option>
                                            {/* Add more as needed */}
                                        </Select>
                                    </FormField>
                                    <FormField label="Degree" required>
                                        <Select
                                            value={edu.degree}
                                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                        >
                                            <option value="">Select degree</option>
                                            <option value="Bachelors">Bachelors (or equivalent)</option>
                                            <option value="Masters">Masters (or equivalent)</option>
                                            <option value="PhD">PhD</option>
                                            <option value="Diploma">Diploma</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Field of study" required>
                                        <Input
                                            value={edu.field}
                                            onChange={(e) => updateEducation(index, 'field', e.target.value)}
                                            placeholder="e.g. Computer Science"
                                        />
                                    </FormField>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Start Date" required>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={edu.startYear}
                                                    onChange={(e) => updateEducation(index, 'startYear', e.target.value)}
                                                >
                                                    <option value="">Year</option>
                                                    {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    value={edu.startMonth}
                                                    onChange={(e) => updateEducation(index, 'startMonth', e.target.value)}
                                                >
                                                    <option value="">Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </FormField>
                                        <FormField label="End Date" required>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={edu.endYear}
                                                    onChange={(e) => updateEducation(index, 'endYear', e.target.value)}
                                                    disabled={edu.currentlyStudying}
                                                >
                                                    <option value="">Year</option>
                                                    {Array.from({ length: 35 }, (_, i) => 2030 - i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    value={edu.endMonth}
                                                    onChange={(e) => updateEducation(index, 'endMonth', e.target.value)}
                                                    disabled={edu.currentlyStudying}
                                                >
                                                    <option value="">Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </FormField>
                                    </div>
                                    <div className="flex items-center gap-2 mt-8">
                                        <input
                                            type="checkbox"
                                            checked={edu.currentlyStudying}
                                            onChange={(e) => updateEducation(index, 'currentlyStudying', e.target.checked)}
                                            className="rounded border-black/10 text-black focus:ring-black"
                                        />
                                        <span className="text-sm text-gray-600">Currently studying</span>
                                    </div>
                                    <FormField label="CGPA">
                                        <Input
                                            value={edu.cgpa}
                                            onChange={(e) => updateEducation(index, 'cgpa', e.target.value)}
                                            placeholder="e.g. 8.5"
                                        />
                                    </FormField>
                                    <FormField label="Out of (Scale)">
                                        <Input
                                            value={edu.scale}
                                            onChange={(e) => updateEducation(index, 'scale', e.target.value)}
                                            placeholder="e.g. 10"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </DetailCard>
                    ))}
                    <button
                        onClick={addEducation}
                        className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        <Sparkles size={16} />
                        Add Education
                    </button>
                </div>
            );
        }

        if (activeSection === 'skills') {
            return (
                <DetailCard
                    title="Skills and languages"
                    subtitle="List your core technical skills and languages you speak."
                    icon={Code2}
                >
                    <div className="space-y-6">
                        {['programming', 'frameworks', 'databases', 'tools', 'soft'].map((cat) => (
                            <FormField key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                                <Input
                                    value={structuredProfile.skills[cat].join(', ')}
                                    onChange={(e) => updateSkills(cat, e.target.value.split(',').map(s => s.trim()))}
                                    placeholder={`e.g. ${cat === 'programming' ? 'JavaScript, Python' : cat === 'frameworks' ? 'React, Node.js' : '...'}`}
                                />
                            </FormField>
                        ))}
                        <FormField label="Languages">
                            <Input
                                value={structuredProfile.languages.join(', ')}
                                onChange={(e) => setStructuredProfile(prev => ({ ...prev, languages: e.target.value.split(',').map(s => s.trim()) }))}
                                placeholder="e.g. English, Hindi, Spanish"
                            />
                        </FormField>
                    </div>
                </DetailCard>
            );
        }

        if (activeSection === 'experience') {
            return (
                <div className="space-y-6">
                    {structuredProfile.workExperience.map((exp, index) => (
                        <DetailCard
                            key={index}
                            title={exp.company ? exp.company : "New Work Experience"}
                            subtitle="Add your work experience to your profile. You can add multiple work experiences."
                            icon={BriefcaseBusiness}
                        >
                            <div className="relative">
                                <button
                                    onClick={() => removeExperience(index)}
                                    className="absolute -top-12 right-0 text-red-500 hover:text-red-600 transition"
                                >
                                    <AlertCircle size={20} />
                                </button>
                                <div className="grid gap-6">
                                    <FormField label="Position" required>
                                        <Input
                                            value={exp.position}
                                            onChange={(e) => updateExperience(index, 'position', e.target.value)}
                                            placeholder="e.g. Senior Software Engineer"
                                        />
                                    </FormField>
                                    <FormField label="Company" required>
                                        <Input
                                            value={exp.company}
                                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                            placeholder="e.g. Google"
                                        />
                                    </FormField>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Start Date" required>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={exp.startYear}
                                                    onChange={(e) => updateExperience(index, 'startYear', e.target.value)}
                                                >
                                                    <option value="">Year</option>
                                                    {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    value={exp.startMonth}
                                                    onChange={(e) => updateExperience(index, 'startMonth', e.target.value)}
                                                >
                                                    <option value="">Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </FormField>
                                        <FormField label="End Date" required>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={exp.endYear}
                                                    onChange={(e) => updateExperience(index, 'endYear', e.target.value)}
                                                    disabled={exp.currentlyWorking}
                                                >
                                                    <option value="">Year</option>
                                                    {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    value={exp.endMonth}
                                                    onChange={(e) => updateExperience(index, 'endMonth', e.target.value)}
                                                    disabled={exp.currentlyWorking}
                                                >
                                                    <option value="">Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </FormField>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={exp.currentlyWorking}
                                            onChange={(e) => updateExperience(index, 'currentlyWorking', e.target.checked)}
                                            className="rounded border-black/10 text-black focus:ring-black"
                                        />
                                        <span className="text-sm text-gray-600">Currently working here</span>
                                    </div>
                                    <FormField label="Employment Type">
                                        <div className="flex flex-wrap gap-4">
                                            {['Full Time', 'Part Time', 'Freelance', 'Self-Employed', 'Contract', 'Internship', 'Other'].map(type => (
                                                <label key={type} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`employmentType-${index}`}
                                                        value={type}
                                                        checked={exp.employmentType === type}
                                                        onChange={(e) => updateExperience(index, 'employmentType', e.target.value)}
                                                        className="border-black/10 text-black focus:ring-black"
                                                    />
                                                    <span className="text-sm text-gray-600">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </FormField>
                                    <FormField label="Description">
                                        <Textarea
                                            value={exp.description}
                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                            placeholder="Describe your responsibilities and achievements..."
                                            rows={4}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </DetailCard>
                    ))}
                    <button
                        onClick={addExperience}
                        className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        <Sparkles size={16} />
                        Add Work Experience
                    </button>
                </div>
            );
        }

        if (activeSection === 'profiles') {
            return (
                <div className="space-y-6">
                    {structuredProfile.professionalProfiles.map((profile, index) => (
                        <DetailCard
                            key={index}
                            title="New Link"
                            subtitle="Add your professional profiles and portfolios."
                            icon={Sparkles}
                        >
                            <div className="relative">
                                <button
                                    onClick={() => removeProfile(index)}
                                    className="absolute -top-12 right-0 text-red-500 hover:text-red-600 transition"
                                >
                                    <AlertCircle size={20} />
                                </button>
                                <div className="grid gap-6">
                                    <FormField label="Type" required>
                                        <Select
                                            value={profile.platform}
                                            onChange={(e) => updateProfile(index, 'platform', e.target.value)}
                                        >
                                            <option value="">Select link type</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                            <option value="GitHub">GitHub</option>
                                            <option value="Portfolio">Portfolio</option>
                                            <option value="LeetCode">LeetCode</option>
                                            <option value="Other">Other</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="URL" required>
                                        <Input
                                            value={profile.url}
                                            onChange={(e) => updateProfile(index, 'url', e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </DetailCard>
                    ))}
                    <button
                        onClick={addProfile}
                        className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        <Sparkles size={16} />
                        Add Link
                    </button>
                </div>
            );
        }

        if (activeSection === 'publications') {
            return (
                <div className="space-y-6">
                    {structuredProfile.publications.map((pub, index) => (
                        <DetailCard
                            key={index}
                            title="New Publication"
                            subtitle="Add your research papers and publications."
                            icon={ScrollText}
                        >
                            <div className="relative">
                                <button
                                    onClick={() => removePublication(index)}
                                    className="absolute -top-12 right-0 text-red-500 hover:text-red-600 transition"
                                >
                                    <AlertCircle size={20} />
                                </button>
                                <div className="grid gap-6">
                                    <FormField label="Title" required>
                                        <Input
                                            value={pub.title}
                                            onChange={(e) => updatePublication(index, 'title', e.target.value)}
                                            placeholder="Publication title"
                                        />
                                    </FormField>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField label="URL">
                                            <Input
                                                value={pub.url}
                                                onChange={(e) => updatePublication(index, 'url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </FormField>
                                        <FormField label="Year">
                                            <Select
                                                value={pub.year}
                                                onChange={(e) => updatePublication(index, 'year', e.target.value)}
                                            >
                                                <option value="">Select year</option>
                                                {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </Select>
                                        </FormField>
                                    </div>
                                    <FormField label="Number of Citations">
                                        <Input
                                            type="number"
                                            value={pub.citations}
                                            onChange={(e) => updatePublication(index, 'citations', e.target.value)}
                                            placeholder="0"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </DetailCard>
                    ))}
                    <button
                        onClick={addPublication}
                        className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        <Sparkles size={16} />
                        Add Publication
                    </button>
                </div>
            );
        }

        if (activeSection === 'summary') {
            return (
                <DetailCard
                    title="Profile summary"
                    subtitle="A short professional summary about yourself."
                    icon={ScrollText}
                >
                    <FormField label="Summary">
                        <Textarea
                            value={structuredProfile.summary}
                            onChange={(e) => setStructuredProfile(prev => ({ ...prev, summary: e.target.value }))}
                            placeholder="Write a brief professional summary..."
                            rows={6}
                        />
                    </FormField>
                </DetailCard>
            );
        }

        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-8 lg:grid-cols-[380px_1fr]"
        >
            <aside className="h-fit space-y-6">
                <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white shadow-xl">
                        <Sparkles size={28} />
                    </div>
                    <h2 className="mt-6 text-3xl font-black tracking-tight text-gray-900">Analysis Center</h2>
                    <p className="mt-4 text-[13px] leading-relaxed text-gray-500">
                        Our AI engine scans your resume against the recruiter&apos;s requirements to ensure a perfect match for {job.title}.
                    </p>

                    <div className="mt-8 space-y-4">
                        <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50/50 p-5">
                            <div className="flex items-center gap-3 text-amber-900">
                                <AlertCircle size={18} />
                                <h3 className="text-xs font-black uppercase tracking-widest">Pro Tips</h3>
                            </div>
                            <ul className="mt-4 space-y-2 text-[11px] leading-normal text-amber-800/70 font-medium">
                                <li className="flex gap-2"><span>â€¢</span> Ensure your resume is a readable PDF.</li>
                                <li className="flex gap-2"><span>â€¢</span> Review and correct extracted data manually.</li>
                                <li className="flex gap-2"><span>â€¢</span> Missing skills can be added before final submission.</li>
                                <li className="flex gap-2"><span>â€¢</span> A match above {threshold}% is recommended.</li>
                            </ul>
                        </div>

                        <nav className="space-y-2">
                            {sectionConfig.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                const isCompleted = sectionStatus[section.id];

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 transition-all duration-300 ${isActive
                                            ? 'bg-black text-white shadow-lg'
                                            : isCompleted
                                                ? 'bg-emerald-50/50 text-emerald-900 border border-emerald-100'
                                                : 'bg-gray-50/50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-white/10' : 'bg-white'}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                {section.id === 'resume' ? 'Step 1' : 'Profile'}
                                            </p>
                                            <p className="text-xs font-black tracking-tight">{section.label}</p>
                                        </div>
                                        {isCompleted && !isActive && (
                                            <div className="ml-auto text-emerald-600">
                                                <CheckCircle2 size={18} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {analysisResult && (
                    <button
                        onClick={async () => {
                            try {
                                await axios.post(`${API_URL}/resume-profile/${userId}`, {
                                    ...structuredProfile,
                                    userId
                                });
                                setError(null);
                                alert('Profile saved successfully!');
                            } catch (err) {
                                setError('Failed to save manual changes.');
                            }
                        }}
                        className="flex w-full items-center justify-center gap-3 rounded-[2rem] border border-black bg-white px-6 py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-gray-50 active:scale-95"
                    >
                        <ShieldCheck size={20} />
                        Save All Changes
                    </button>
                )}

                <div className="rounded-[2rem] border border-black/5 bg-[#fbf8f3] p-6 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Minimum match</p>
                    <p className="mt-2 text-2xl font-black text-gray-900">{threshold}% Required</p>
                </div>
            </aside>

            <div className="space-y-6">
                <header className="rounded-[2.5rem] border border-black/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">Analysis workflow</p>
                    <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-tight">Apply for {job.title}</h1>
                            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-gray-500 font-medium">
                                Complete your profile assessment to unlock the next stage of the application process.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#fbf8f3] px-5 py-3 text-xs font-bold text-gray-700">
                            <span className="opacity-50 uppercase tracking-widest">Stage</span>
                            <span className="text-lg">1/4</span>
                        </div>
                    </div>
                </header>

                <div className="min-h-[400px]">
                    {renderSectionContent()}
                </div>

                {applicationSaved ? (
                    <div className="rounded-[2.25rem] border border-black/10 bg-white p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                        <div className="mx-auto max-w-3xl text-center">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#eff9ef] text-emerald-600">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Successfully applied for this job</h2>
                            <p className="mt-4 text-base leading-7 text-gray-500">
                                Your profile has been updated and your application is submitted.
                            </p>

                            <div className="mt-8 grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Role</p>
                                    <p className="mt-3 text-lg font-semibold text-gray-900">{job.title}</p>
                                </div>
                                <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Resume match</p>
                                    <p className="mt-3 text-lg font-semibold text-gray-900">{matchPercentage}%</p>
                                </div>
                                <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Next</p>
                                    <p className="mt-3 text-lg font-semibold text-gray-900">Skill assessment</p>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                                <button
                                    onClick={() => navigate('/seeker/jobs')}
                                    className="rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                                >
                                    Back to jobs
                                </button>
                                <button
                                    onClick={() => onComplete({
                                        ...analysisResult.data,
                                        structuredProfile
                                    })}
                                    disabled={isRedirecting}
                                    className={`rounded-2xl bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800 flex items-center gap-2 ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isRedirecting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Redirecting to Assessment...
                                        </>
                                    ) : (
                                        'Continue to Skill Assessment'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : analysisResult ? (
                    <div className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                        <div className={`rounded-[2rem] px-8 py-10 ${isPassed ? 'bg-[#eef9f0]' : 'bg-[#fff2f1]'}`}>
                            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Resume result</p>
                                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">
                                        {isPassed ? 'You are qualified to continue' : 'Your profile needs a stronger match'}
                                    </h2>
                                    <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                                        {isPassed
                                            ? 'Your resume meets the minimum requirement. Please review and edit the extracted information if needed.'
                                            : 'Your current match is below the required threshold for this opportunity.'}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative flex h-40 w-40 items-center justify-center">
                                        <svg className="h-full w-full" viewBox="0 0 100 100">
                                            <circle
                                                className="text-black/5"
                                                strokeWidth="8"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r="42"
                                                cx="50"
                                                cy="50"
                                            />
                                            <motion.circle
                                                className="text-black"
                                                strokeWidth="8"
                                                strokeDasharray={264}
                                                initial={{ strokeDashoffset: 264 }}
                                                animate={{ strokeDashoffset: 264 - (264 * matchPercentage) / 100 }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r="42"
                                                cx="50"
                                                cy="50"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black tracking-tight text-gray-900">{matchPercentage}%</span>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Match</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 shadow-sm">
                                        <div className={`h-1.5 w-1.5 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Min. {threshold}% Required
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Skills match</p>
                                <div className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">{analysisResult.data.skillsScore}%</div>
                                <p className="mt-3 text-sm leading-6 text-gray-500">{analysisResult.data.skillsFeedback}</p>
                            </div>
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Experience and education</p>
                                <div className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">{analysisResult.data.experienceScore}%</div>
                                <p className="mt-3 text-sm leading-6 text-gray-500">{analysisResult.data.experienceFeedback}</p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[1.75rem] border border-black/10 bg-[#f8f4ed] p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">AI summary</p>
                                    <p className="text-base font-semibold text-gray-900">Why this resume scored the way it did</p>
                                </div>
                            </div>
                            <p className="mt-5 text-sm leading-7 text-gray-600">{analysisResult.data.explanation}</p>
                        </div>

                        {error ? (
                            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        ) : null}

                        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                            <button
                                onClick={() => navigate('/seeker/jobs')}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                            >
                                <ArrowLeft size={18} />
                                Back to jobs
                            </button>

                            {isPassed ? (
                                <button
                                    onClick={async () => {
                                        try {
                                            // Save the final state of the structured profile
                                            await axios.post(`${API_URL}/resume-profile/${userId}`, {
                                                ...structuredProfile,
                                                userId
                                            });
                                            await handleApplyAndSave();
                                        } catch (e) {
                                            setError('Failed to save profile before applying.');
                                        }
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                                >
                                    Apply successfully and continue
                                    <ArrowRight size={18} />
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                        <button
                            onClick={() => navigate('/seeker/jobs')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>

                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing || !file}
                            className={`group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-[2rem] px-10 py-5 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${analyzing || !file ? 'cursor-not-allowed border border-black/10 bg-gray-100 text-gray-400' : 'bg-black text-white hover:bg-gray-800 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)]'}`}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                {analyzing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Start Analysis
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ResumeAnalyzer;
