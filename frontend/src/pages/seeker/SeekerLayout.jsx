import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileText, UserCircle, LogOut, Zap, Clock } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, API_URL, auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const SeekerLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = useState(user);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isInterviewSurface =
        location.pathname.startsWith('/seeker/apply/') ||
        location.pathname === '/seeker/mock-interview' ||
        location.pathname === '/seeker/agent-interview' ||
        location.pathname === '/seeker/agentInterview' ||
        location.pathname === '/seeker/agentInterview.jsx';

    useEffect(() => {
        if (user.role && user.role !== 'seeker') {
            navigate('/recruiter');
            return;
        }
        const fetchProfile = async () => {
            const uid = user.uid || user._id || user.id;
            if (!uid) return;

            try {
                const profileData = await getUserProfile(uid);
                if (profileData) {
                    setProfile(profileData);
                    localStorage.setItem('user', JSON.stringify({ ...user, ...profileData }));
                }

            } catch (error) {
                console.error("Layout profile fetch failed:", error);
            }
        };
        fetchProfile();
    }, [user.uid, user._id, user.id]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error('Firebase signOut error:', e);
        }
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/seeker' },
        { label: 'Browse Jobs', icon: <Briefcase size={20} />, path: '/seeker/jobs' },
        { label: 'My Applications', icon: <Clock size={20} />, path: '/seeker/applications' },
        { label: 'Profile', icon: <UserCircle size={20} />, path: '/seeker/profile' },
    ];

    return (
        <div className="flex h-screen bg-[#080a0f] text-white overflow-hidden relative">
            {/* Hamburger for Mobile */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden fixed top-6 left-6 z-50 p-2 bg-white/5 border border-white/10 rounded-xl"
            >
                {isSidebarOpen ? <LogOut className="rotate-90" size={24} /> : <Zap size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#080a0f] flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <Zap size={22} className="text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tighter">TALENT<span className="text-teal-400">ECO</span></span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/seeker'}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all duration-300 group
                                ${isActive
                                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_25px_rgba(20,184,166,0.1)]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/[0.03] border border-transparent'}
                            `}
                        >
                            <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                            <span className="font-bold text-sm tracking-tight">{item.label}</span>
                        </NavLink>
                    ))}
                    <NavLink
                        to="/seeker/mock-interview"
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) => `
                            flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all duration-300 group
                            ${isActive
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_25px_rgba(20,184,166,0.1)]'
                                : 'text-gray-500 hover:text-white hover:bg-white/[0.03] border border-transparent'}
                        `}
                    >
                        <Zap size={20} className="transition-transform group-hover:scale-110" />
                        <span className="font-bold text-sm tracking-tight">Mock Interview</span>
                    </NavLink>
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-5 py-4 rounded-2xl text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300 mb-4"
                    >
                        <LogOut size={20} />
                        <span className="font-bold text-sm tracking-tight">Logout</span>
                    </button>


                    <div className="p-4 rounded-[2rem] bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border border-white/5 shadow-inner">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-black border border-teal-500/20 overflow-hidden text-lg">
                                {profile?.profilePic ? (
                                    <img src={profile.profilePic} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'S'
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-black truncate">{profile?.name || user.name || 'Candidate'}</p>
                                <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-black opacity-60">Candidate</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto relative scroll-smooth pt-20 md:pt-0 ${isInterviewSurface ? 'bg-white text-gray-900' : 'bg-[#0a0c12]'}`}>
                {/* Background Glows */}
                <div className={`fixed top-[-10%] right-[-5%] w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none -z-10 ${isInterviewSurface ? 'bg-teal-200/40' : 'bg-teal-600/10'}`} />
                <div className={`fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none -z-10 ${isInterviewSurface ? 'bg-emerald-100/60' : 'bg-emerald-500/5'}`} />

                <div className="p-4 md:p-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SeekerLayout;
