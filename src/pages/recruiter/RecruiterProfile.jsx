import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Briefcase, Globe, Building2, Users2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, saveUserProfile } from '../../firebase';

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

    if (loading) return <div className="flex items-center justify-center h-[60vh] text-blue-400">Loading Profile...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Recruiter Profile</h1>
                    <p className="text-gray-400">Manage your personal and company identity.</p>
                </div>
                {saved && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold"
                    >
                        <CheckCircle2 size={16} /> Changes Saved
                    </motion.div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Pic & Quick Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 text-center relative overflow-hidden group shadow-xl">
                        <input
                            type="file"
                            id="profilePicInput"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div
                            onClick={() => document.getElementById('profilePicInput').click()}
                            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-teal-400 p-1 mb-6 relative group transform transition-all duration-300 group-hover:scale-105 cursor-pointer"
                        >
                            <div className="w-full h-full rounded-full bg-[#11131a] flex items-center justify-center text-5xl font-black text-white overflow-hidden">
                                {profileData.profilePic ? (
                                    <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    profileData.name?.[0]?.toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 px-2 py-1 rounded-md">Update</span>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-1 uppercase tracking-tight">{profileData.name}</h3>
                        <p className="text-blue-400 font-bold text-sm mb-4 uppercase tracking-widest">{profileData.designation || 'Hiring Lead'}</p>
                        <div className="pt-6 border-t border-white/5">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Company</p>
                            <p className="text-white font-bold">{profileData.company?.name || 'Set Company Name'}</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 shadow-2xl shadow-white/5"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>

                {/* Form Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* B. Personal Details */}
                    <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                B
                            </div>
                            <h2 className="text-xl font-bold">Personal Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        readOnly
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/5 text-gray-600 outline-none cursor-not-allowed text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 00000 00000"
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Designation</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        name="designation"
                                        value={profileData.designation}
                                        onChange={handleChange}
                                        placeholder="e.g. Technical Recruiter"
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* C & D. Company Details */}
                    <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                                C
                            </div>
                            <h2 className="text-xl font-bold">Company Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Company Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        name="company.name"
                                        value={profileData.company?.name || ''}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Company Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="url"
                                        name="company.website"
                                        placeholder="https://company.com"
                                        value={profileData.company?.website || ''}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Industry</label>
                                <input
                                    type="text"
                                    name="company.industry"
                                    placeholder="e.g. IT Services / Fintech"
                                    value={profileData.company?.industry || ''}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Company Size</label>
                                <div className="relative">
                                    <Users2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <select
                                        name="company.size"
                                        value={profileData.company?.size || '50-100'}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-[#11131a] border border-white/10 focus:border-teal-500/50 outline-none appearance-none cursor-pointer text-sm font-medium"
                                    >
                                        <option value="1-10">1-10 Employees</option>
                                        <option value="11-50">11-50 Employees</option>
                                        <option value="51-200">51-200 Employees</option>
                                        <option value="201-500">201-500 Employees</option>
                                        <option value="500+">500+ Employees</option>
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">About Company</label>
                                <textarea
                                    name="company.description"
                                    rows="4"
                                    value={profileData.company?.description || ''}
                                    onChange={handleChange}
                                    placeholder="Write a brief overview of your company mission and culture..."
                                    className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default RecruiterProfile;
