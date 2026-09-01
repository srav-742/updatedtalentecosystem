import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Briefcase, Globe, Building2, Users2, Save, Loader2, CheckCircle2, Camera } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, saveUserProfile } from '../../firebase';
import './recruiter-theme.css';

const RecruiterProfile = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [profileData, setProfileData] = useState({
        name: user.name || '',
        email: user.email || '',
        designation: user.designation || '',
        phone: user.phone || '',
        company: user.company || {
            name: '',
            website: '',
            industry: '',
            size: '50-100',
            description: ''
        },
        profilePic: user.profilePic || ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await getUserProfile(user.uid || user._id || user.id);
                if (profile) {
                    setProfileData({
                        ...profile,
                        company: profile.company || {
                            name: '',
                            website: '',
                            industry: '',
                            size: '50-100',
                            description: ''
                        }
                    });
                } else {
                    // Fallback to local storage data if profile not in DB yet
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setProfileData({
                ...profileData,
                [parent]: { ...profileData[parent], [child]: value }
            });
        } else {
            setProfileData({ ...profileData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await saveUserProfile(user.uid || user._id || user.id, profileData);

            // Update local storage if name or image changed
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
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-3">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Profile Details...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            {/* Header Banner */}
            <header className="rec-hero p-8 md:p-9">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="rec-badge-dark px-3 py-0.5 text-[10px] uppercase tracking-wider">
                                Identity & Settings
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            Recruiter <span className="rec-text-gradient">Profile</span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600">
                            Manage your personal credentials, organizational branding, and company specifications.
                        </p>
                    </div>

                    {saved && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rec-badge-emerald px-4 py-2 flex items-center gap-2 text-xs font-bold shadow-xs self-start md:self-auto"
                        >
                            <CheckCircle2 size={16} /> Changes Saved Successfully
                        </motion.div>
                    )}
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Quick Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rec-card p-8 text-center relative overflow-hidden">
                        <input
                            type="file"
                            id="profilePicInput"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div
                            onClick={() => document.getElementById('profilePicInput').click()}
                            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-teal-400 p-1 mb-5 relative group cursor-pointer shadow-md"
                        >
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl font-extrabold text-slate-800 overflow-hidden">
                                {profileData.profilePic ? (
                                    <img loading="lazy" src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    profileData.name?.[0]?.toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="absolute inset-0 bg-slate-900/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all text-white">
                                <Camera size={20} className="mb-1 text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Update Photo</span>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-0.5">{profileData.name || 'Recruiter'}</h3>
                        <p className="text-xs font-semibold text-indigo-600 mb-5">{profileData.designation || 'Hiring Lead'}</p>

                        <div className="pt-5 border-t border-slate-100 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Organization</span>
                                <span className="text-slate-900 font-bold">{profileData.company?.name || 'Not Specified'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Account Tier</span>
                                <span className="rec-badge-emerald px-2 py-0.5 text-[9px] uppercase">Verified Recruiter</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rec-btn-primary w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                </div>

                {/* Right Column: Detailed Form Cards */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. Personal Details */}
                    <div className="rec-card p-7 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                                01
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                                <p className="text-xs text-slate-500">Your direct contact details and role in the hiring process</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleChange}
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                        placeholder="Full Name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        readOnly
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50/80! text-slate-500! cursor-not-allowed border-slate-200!"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        placeholder="+1 234 567 8900"
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation / Role</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="designation"
                                        value={profileData.designation}
                                        onChange={handleChange}
                                        placeholder="e.g. Technical Hiring Lead"
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Company Details */}
                    <div className="rec-card p-7 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold">
                                02
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Company & Organization</h2>
                                <p className="text-xs text-slate-500">Public company profile displayed on your job listings</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="company.name"
                                        value={profileData.company?.name || ''}
                                        onChange={handleChange}
                                        placeholder="Acme Technologies"
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="url"
                                        name="company.website"
                                        placeholder="https://company.com"
                                        value={profileData.company?.website || ''}
                                        onChange={handleChange}
                                        className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Industry Sector</label>
                                <input
                                    type="text"
                                    name="company.industry"
                                    placeholder="e.g. Fintech / SaaS / AI"
                                    value={profileData.company?.industry || ''}
                                    onChange={handleChange}
                                    className="rec-input w-full px-4 py-2.5 text-xs font-medium"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company Size</label>
                                <div className="relative">
                                    <Users2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="company.size"
                                        value={profileData.company?.size || '50-100'}
                                        onChange={handleChange}
                                        className="rec-select w-full pl-10 pr-4 py-2.5 text-xs font-medium cursor-pointer"
                                    >
                                        <option value="1-10">1-10 Employees (Seed / Startup)</option>
                                        <option value="11-50">11-50 Employees (Early Stage)</option>
                                        <option value="51-200">51-200 Employees (Growth)</option>
                                        <option value="201-500">201-500 Employees (Scaleup)</option>
                                        <option value="500+">500+ Employees (Enterprise)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">About Organization & Culture</label>
                                <textarea
                                    name="company.description"
                                    rows="4"
                                    value={profileData.company?.description || ''}
                                    onChange={handleChange}
                                    placeholder="Describe your company culture, mission, tech stack, and benefits..."
                                    className="rec-textarea w-full px-4 py-3 text-xs leading-relaxed resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default RecruiterProfile;
