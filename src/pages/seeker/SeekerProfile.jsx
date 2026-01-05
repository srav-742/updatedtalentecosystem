import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, BookOpen, Briefcase, Plus, Trash2, Save, Loader2, CheckCircle2, Code2, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, saveUserProfile } from '../../firebase';

const SeekerProfile = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [profileData, setProfileData] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        skills: user.skills || [],
        education: user.education || [],
        experience: user.experience || [],
        profilePic: user.profilePic || ''
    });

    const [newSkill, setNewSkill] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await getUserProfile(user.uid || user._id || user.id);
                if (profile) {
                    setProfileData({
                        ...profile,
                        skills: profile.skills || [],
                        education: profile.education || [],
                        experience: profile.experience || []
                    });
                } else {
                    setProfileData(prev => ({ ...prev, name: user.name, email: user.email }));
                }
            } catch (error) {
                console.error('Error fetching profile from Firebase:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) fetchProfile();
    }, [user.uid, user._id, user.id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData({ ...profileData, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData({ ...profileData, profilePic: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const addSkill = () => {
        if (newSkill && !profileData.skills.includes(newSkill)) {
            setProfileData({ ...profileData, skills: [...profileData.skills, newSkill] });
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setProfileData({ ...profileData, skills: profileData.skills.filter(s => s !== skill) });
    };

    const addEducation = () => {
        setProfileData({
            ...profileData,
            education: [...profileData.education, { institution: '', degree: '', year: '' }]
        });
    };

    const updateEducation = (index, field, value) => {
        const updated = [...profileData.education];
        updated[index][field] = value;
        setProfileData({ ...profileData, education: updated });
    };

    const removeEducation = (index) => {
        setProfileData({
            ...profileData,
            education: profileData.education.filter((_, i) => i !== index)
        });
    };

    const addExperience = () => {
        setProfileData({
            ...profileData,
            experience: [...profileData.experience, { company: '', role: '', duration: '', description: '' }]
        });
    };

    const updateExperience = (index, field, value) => {
        const updated = [...profileData.experience];
        updated[index][field] = value;
        setProfileData({ ...profileData, experience: updated });
    };

    const removeExperience = (index) => {
        setProfileData({
            ...profileData,
            experience: profileData.experience.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await saveUserProfile(user.uid || user._id || user.id, profileData);

            // Sync local storage
            const updatedUser = { ...user, name: profileData.name, profilePic: profileData.profilePic };
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-teal-400" size={40} />
            <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">Accessing Profile Data...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 italic bg-white bg-clip-text">Candidate Identity</h1>
                    <p className="text-gray-500 font-medium lowercase tracking-tight">Configure your professional ledger for peak compatibility.</p>
                </div>
                {saved && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-6 py-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-2xl text-xs font-black uppercase tracking-widest">
                        <CheckCircle2 size={16} /> Sync Successful
                    </motion.div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Picture & Skills */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Portrait Section */}
                    <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 text-center relative overflow-hidden shadow-2xl backdrop-blur-sm group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />

                        <input type="file" id="pPic" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <div onClick={() => document.getElementById('pPic').click()} className="w-40 h-40 mx-auto rounded-[2.5rem] bg-gradient-to-br from-teal-400 to-blue-600 p-1 mb-8 relative cursor-pointer transform transition-transform duration-500 hover:rotate-6 active:scale-95 shadow-2xl">
                            <div className="w-full h-full rounded-[2.3rem] bg-[#0a0a0c] flex items-center justify-center text-6xl font-black text-white overflow-hidden">
                                {profileData.profilePic ? (
                                    <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    profileData.name?.[0]?.toUpperCase() || 'P'
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-[2.3rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black px-3 py-1 rounded-lg">Upload</span>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-1 italic">{profileData.name || 'Anonymous User'}</h3>
                        <p className="text-teal-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">Verified Candidate</p>

                        <div className="flex items-center justify-center gap-4 text-gray-500">
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold">{profileData.skills.length}</span>
                                <span className="text-[8px] uppercase font-black">Skills</span>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold">{profileData.experience.length}</span>
                                <span className="text-[8px] uppercase font-black">Nodes</span>
                            </div>
                        </div>
                    </div>

                    {/* Skill Registry */}
                    <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                                <Code2 size={20} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest italic">Skill Registry</h2>
                        </div>

                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                placeholder="Add competency..."
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none text-xs font-bold"
                            />
                            <button type="button" onClick={addSkill} className="p-3 rounded-xl bg-white text-black hover:bg-teal-400 transition-all active:scale-95 shadow-lg shadow-white/5">
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <AnimatePresence>
                                {profileData.skills.map((skill) => (
                                    <motion.span
                                        key={skill}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-gray-300 group hover:border-red-500/30 transition-all"
                                    >
                                        {skill}
                                        <button type="button" onClick={() => removeSkill(skill)} className="text-gray-600 hover:text-red-400 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </motion.span>
                                ))}
                            </AnimatePresence>
                            {profileData.skills.length === 0 && <p className="text-[10px] text-gray-600 italic">No skills registered yet.</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-6 rounded-[2.5rem] bg-white text-black font-black uppercase tracking-[0.3em] hover:bg-teal-400 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-2xl shadow-white/5 text-[10px]"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Synchronizing...' : 'Save Configuration'}
                    </button>
                </div>

                {/* Right Column: Main Details */}
                <div className="lg:col-span-8 space-y-10">
                    {/* General Intel */}
                    <div className="p-10 rounded-[4rem] bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.3em]">Personal Biography</label>
                                <textarea
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Briefly state your professional objective and core philosophy..."
                                    className="w-full px-6 py-4 rounded-[2rem] bg-black/40 border border-white/10 focus:border-teal-500/50 outline-none text-xs font-semibold leading-relaxed text-gray-300 resize-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.3em]">Communication Protocol (Email)</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                                    <input type="email" value={profileData.email} readOnly className="w-full pl-16 pr-6 py-4 rounded-2xl bg-white/2 border border-white/5 text-gray-600 outline-none cursor-not-allowed text-xs font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.3em]">Frequency Port (Phone)</label>
                                <div className="relative">
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" name="phone" value={profileData.phone} onChange={handleChange} placeholder="+91 00000 00000" className="w-full pl-16 pr-6 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-teal-500/50 outline-none text-xs font-bold text-white transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Experience Ledger */}
                    <div className="p-10 rounded-[4rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <Briefcase size={22} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest italic">Experience Ledger</h2>
                            </div>
                            <button type="button" onClick={addExperience} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all active:scale-95 shadow-xl">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {profileData.experience.map((exp, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 relative group transition-all hover:border-blue-500/30">
                                    <button type="button" onClick={() => removeExperience(idx)} className="absolute top-6 right-6 p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="text" placeholder="Organization" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/30 outline-none text-[10px] font-black uppercase tracking-widest" />
                                        <input type="text" placeholder="Protocol Role" value={exp.role} onChange={(e) => updateExperience(idx, 'role', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/30 outline-none text-[10px] font-black uppercase tracking-widest text-blue-400" />
                                        <input type="text" placeholder="Duration (e.g. 2021 - Present)" value={exp.duration} onChange={(e) => updateExperience(idx, 'duration', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/30 outline-none text-[10px] font-bold" />
                                        <textarea placeholder="Deployment Description..." rows="2" value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/30 outline-none text-[10px] font-semibold md:col-span-2 resize-none" />
                                    </div>
                                </motion.div>
                            ))}
                            {profileData.experience.length === 0 && <p className="text-center py-10 text-gray-600 font-bold uppercase tracking-widest text-[8px]">Registry empty. Add experience to amplify your profile.</p>}
                        </div>
                    </div>

                    {/* Academic Foundation */}
                    <div className="p-10 rounded-[4rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                    <GraduationCap size={22} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest italic">Academic Foundation</h2>
                            </div>
                            <button type="button" onClick={addEducation} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all active:scale-95 shadow-xl">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {profileData.education.map((edu, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 relative group transition-all hover:border-purple-500/30">
                                    <button type="button" onClick={() => removeEducation(idx)} className="absolute top-6 right-6 p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <input type="text" placeholder="Institution" value={edu.institution} onChange={(e) => updateEducation(idx, 'institution', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-purple-500/30 outline-none text-[10px] font-black uppercase tracking-widest lg:col-span-2" />
                                        <input type="text" placeholder="Degree / Certification" value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-purple-500/30 outline-none text-[10px] font-bold text-purple-400" />
                                        <input type="text" placeholder="Year" value={edu.year} onChange={(e) => updateEducation(idx, 'year', e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-purple-500/30 outline-none text-[10px] font-bold" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SeekerProfile;
