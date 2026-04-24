import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Briefcase, Users, UserCircle, LogOut, Zap, BarChart3, Package, Sparkles } from 'lucide-react';
import { getUserProfile, auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/recruiter' },
    { label: 'Post Job', icon: FilePlus, path: '/recruiter/post-job' },
    { label: 'My Jobs', icon: Briefcase, path: '/recruiter/my-jobs' },
    { label: 'Applicants', icon: Users, path: '/recruiter/applicants' },
    { label: 'Performance', icon: BarChart3, path: '/recruiter/performance' },
    { label: 'Onboarding Kit', icon: Package, path: '/recruiter/onboarding-kit' },
    { label: 'AI Search', icon: Sparkles, path: '/recruiter/ai-search' },
    { label: 'Profile', icon: UserCircle, path: '/recruiter/profile' },
];

const RecruiterLayout = () => {
    const navigate = useNavigate();
    const [user] = React.useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = React.useState(user);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);


    React.useEffect(() => {
        // Only redirect if user has a role and it's not recruiter OR admin
        if (user.role && user.role !== 'recruiter' && user.role !== 'admin') {
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



            } catch (error) {
                console.error("Layout profile fetch failed from Firebase:", error);
            }
        };

        // Call fetch in background
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

    return (
        <div className="recruiter-light-theme relative flex h-screen overflow-hidden bg-[#f3efe7] text-gray-900">
            <button
                onClick={() => setIsSidebarOpen((value) => !value)}
                className="fixed left-6 top-6 z-50 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:hidden"
            >
                <Zap size={22} />
            </button>

            <aside className={`
                fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-black/10 bg-[#fcfbf8] shadow-[0_24px_70px_rgba(15,23,42,0.08)]
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-black text-white shadow-lg shadow-black/10">
                            <Zap size={22} />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">Recruiter portal</p>
                            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                                hire1<span className="text-gray-500">percent</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-1.5 px-4 pb-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/recruiter'}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `
                                    flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold transition
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
                </nav>

                <div className="mt-auto shrink-0 border-t border-black/10 p-3">
                    <button
                        onClick={handleLogout}
                        className="mb-3 flex w-full items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                    <div className="rounded-[1.6rem] border border-black/10 bg-[#f4efe6] p-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[1.1rem] border border-black/10 bg-white text-base font-semibold text-gray-900">
                                {profile?.profilePic ? (
                                    <img src={profile.profilePic} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'R'
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{profile?.name || user.name || 'Recruiter'}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">{profile?.designation || 'Hiring Lead'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="recruiter-content relative flex-1 overflow-y-auto bg-[#f7f4ee] pt-20 text-gray-900 md:pt-0">
                <div className="mx-auto max-w-[1440px] p-4 md:p-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default RecruiterLayout;
