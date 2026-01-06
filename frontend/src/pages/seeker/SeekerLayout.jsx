import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileText, UserCircle, LogOut, Zap, Clock, Coins } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, API_URL } from '../../firebase';

const SeekerLayout = () => {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = useState(user);
    const [coins, setCoins] = useState(0);

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

                // Fetch Coins
                const coinRes = await axios.get(`${API_URL}/user/${uid}/coins`);
                if (coinRes.data) setCoins(coinRes.data.coins);

            } catch (error) {
                console.error("Layout profile/coin fetch failed:", error);
            }
        };
        fetchProfile();
    }, [user.uid, user._id, user.id]);

    const handleLogout = () => {
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
        <div className="flex h-screen bg-[#080a0f] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 flex flex-col bg-[#080a0f] z-20">
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
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-5 py-4 rounded-2xl text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300 mb-4"
                    >
                        <LogOut size={20} />
                        <span className="font-bold text-sm tracking-tight">Logout</span>
                    </button>

                    <div className="mb-4 px-4 py-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 flex items-center justify-between group hover:bg-yellow-500/20 transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-400 font-bold text-sm">Balance</span>
                        </div>
                        <span className="text-white font-black text-lg">{coins}</span>
                    </div>

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

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#0a0c12] relative scroll-smooth">
                {/* Background Glows */}
                <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-teal-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
                <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />

                <div className="p-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SeekerLayout;
