import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Briefcase, Clock, LayoutDashboard, LogOut, Star, UserCircle, Zap } from 'lucide-react';
import { getUserProfile, auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/seeker' },
    { label: 'Browse Jobs', icon: Briefcase, path: '/seeker/jobs' },
    { label: 'My Applications', icon: Clock, path: '/seeker/applications' },
    { label: 'Elite Community', icon: Star, path: '/seeker/community' },
    { label: 'Profile', icon: UserCircle, path: '/seeker/profile' }
];

const SeekerLayout = () => {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = useState(user);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // Only redirect if user has a role and it's not seeker OR admin
        if (user.role && user.role !== 'seeker' && user.role !== 'admin') {
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
                console.error('Layout profile fetch failed:', error);
            }
        };

        fetchProfile();
    }, [navigate, user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Firebase signOut error:', error);
        }

        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="relative flex h-screen overflow-hidden bg-[#f3efe7] text-gray-900">
            <button
                onClick={() => setIsSidebarOpen((value) => !value)}
                className="fixed left-6 top-6 z-50 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:hidden"
            >
                <Zap size={22} />
            </button>

            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-black/10 bg-[#fcfbf8] shadow-[0_24px_70px_rgba(15,23,42,0.08)]
                    transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-black text-white shadow-lg shadow-black/10">
                            <Zap size={22} />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">Candidate portal</p>
                            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                                hire1<span className="text-gray-500">percent</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/seeker'}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `
                                    flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold transition
                                    ${isActive
                                        ? 'border-black bg-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
                                        : 'border-transparent bg-transparent text-gray-500 hover:border-black/5 hover:bg-black/[0.03] hover:text-gray-900'}
                                `}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}

                    <NavLink
                        to="/seeker/mock-interview"
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) => `
                            flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold transition
                            ${isActive
                                ? 'border-black bg-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
                                : 'border-transparent bg-transparent text-gray-500 hover:border-black/5 hover:bg-black/[0.03] hover:text-gray-900'}
                        `}
                    >
                        <Zap size={18} />
                        <span>Mock Interview</span>
                    </NavLink>
                </nav>

                <div className="mt-auto border-t border-black/10 p-4">
                    <button
                        onClick={handleLogout}
                        className="mb-4 flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>

                    <div className="rounded-[1.9rem] border border-black/10 bg-[#f4efe6] p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.25rem] border border-black/10 bg-white text-lg font-semibold text-gray-900">
                                {profile?.profilePic ? (
                                    <img src={profile.profilePic} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'S'
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{profile?.name || user.name || 'Candidate'}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">Candidate</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {isSidebarOpen ? (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            ) : null}

            <main className="relative flex-1 overflow-y-auto bg-[#f7f4ee] pt-20 text-gray-900 md:pt-0">
                <div className="pointer-events-none fixed right-[-5%] top-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-[#ded7cb] blur-[150px]" />
                <div className="pointer-events-none fixed bottom-[-10%] left-[-5%] -z-10 h-[600px] w-[600px] rounded-full bg-[#ebe5db] blur-[150px]" />

                <div className="mx-auto max-w-[1440px] p-4 md:p-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SeekerLayout;
