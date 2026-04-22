import React, { useEffect, useState } from 'react';
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
    User
} from 'lucide-react';
import { getUserProfile, saveUserProfile } from '../../firebase';

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
        }
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
