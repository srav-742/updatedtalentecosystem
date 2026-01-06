import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Briefcase, Users, UserCircle, LogOut, Zap, Coins } from 'lucide-react';
import axios from 'axios';
import { getUserProfile, API_URL } from '../../firebase';

const RecruiterLayout = () => {
    const navigate = useNavigate();
    const [user] = React.useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = React.useState(user);
    const [coins, setCoins] = React.useState(0);

    React.useEffect(() => {
        if (user.role && user.role !== 'recruiter') {
            navigate('/seeker');
            return;
        }

        const fetchProfile = async () => {
            const uid = user.uid || user._id || user.id;
            if (!uid) return;

            // Optional: Only fetch if the cached profile is missing some details
            try {
                const profileData = await getUserProfile(uid);
                if (profileData) {
                    setProfile(profileData);
                    // Sync back to label storage if different
                    localStorage.setItem('user', JSON.stringify({ ...user, ...profileData }));
                }

                // Fetch Coins
                const coinRes = await axios.get(`${API_URL}/user/${uid}/coins`);
                if (coinRes.data) setCoins(coinRes.data.coins);

            } catch (error) {
                console.error("Layout profile fetch failed from Firebase:", error);
            }
        };

        // Call fetch in background
        fetchProfile();
    }, [user.uid, user._id, user.id]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/recruiter' },
        { label: 'Post Job', icon: <FilePlus size={20} />, path: '/recruiter/post-job' },
        { label: 'My Jobs', icon: <Briefcase size={20} />, path: '/recruiter/my-jobs' },
        { label: 'Applicants', icon: <Users size={20} />, path: '/recruiter/applicants' },
        { label: 'Profile', icon: <UserCircle size={20} />, path: '/recruiter/profile' },
    ];

    return (
        <div className="flex h-screen bg-[#0c0f16] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 flex flex-col bg-[#0c0f16] z-20">
                <div className="p-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-400 rounded-lg flex items-center justify-center">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Recruiter Hub</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/recruiter'}
                            className={({ isActive }) => `
                                flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
                            `}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Logout</span>
                    </button>

                    <div className="mb-4 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between group hover:bg-blue-500/20 transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-400 font-bold text-sm">Balance</span>
                        </div>
                        <span className="text-white font-black text-lg">{coins}</span>
                    </div>

                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-teal-500/10 border border-white/5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 overflow-hidden">
                                {profile?.profilePic ? (
                                    <img src={profile.profilePic} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'R'
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{profile?.name || user.name || 'Recruiter'}</p>
                                <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-bold">{profile?.designation || 'Hiring Lead'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#0a0c10] relative">
                {/* Global Background Accents */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default RecruiterLayout;
