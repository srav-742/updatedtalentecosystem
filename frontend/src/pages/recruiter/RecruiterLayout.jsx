import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Briefcase, Users, UserCircle, LogOut, Zap, Package, Sparkles, Crown, ChevronLeft, ChevronRight, Wallet, Plus, FileText, BookOpen } from 'lucide-react';
import { getUserProfile, auth, API_URL } from '../../firebase';
import { signOut } from 'firebase/auth';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import CreatePasswordModal from '../../components/CreatePasswordModal';
import TopUpModal from '../../components/TopUpModal';
import { prefetchRecruiterRoutes } from '../../utils/prefetchRoutes';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/recruiter' },
    { label: 'Post Job', icon: FilePlus, path: '/recruiter/post-job' },
    { label: 'My Jobs', icon: Briefcase, path: '/recruiter/my-jobs' },
    { label: 'Applicants', icon: Users, path: '/recruiter/applicants' },
    { label: 'Onboarding Kit', icon: Package, path: '/recruiter/onboarding-kit' },
    { label: 'AI Search', icon: Sparkles, path: '/recruiter/ai-search' },
    { label: 'Knowledge Hub', icon: BookOpen, path: '/recruiter/knowledge-hub' },
    { label: 'Profile', icon: UserCircle, path: '/recruiter/profile' },
];

const RecruiterLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const mainRef = React.useRef(null);
    const [user] = React.useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [profile, setProfile] = React.useState(user);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);

    // Always scroll to top of page content on any route change so the navbar/header is immediately visible
    React.useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [location.pathname]);

    const activeNavItems = React.useMemo(() => {
        const items = [...navItems];
        if (user.role === 'admin') {
            items.splice(6, 0, { label: 'Blog Posts', icon: FileText, path: '/recruiter/blog' });
        }
        return items;
    }, [user.role]);

    // Wallet States
    const [walletBalance, setWalletBalance] = React.useState(user.walletBalance || 0);
    const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);

    const fetchWalletBalance = async () => {
        const uid = user.uid || user._id || user.id;
        if (!uid) return;
        try {
            const res = await axios.get(`${API_URL}/wallet/balance/${uid}`);
            if (res.data && res.data.success) {
                setWalletBalance(res.data.balance);
            }
        } catch (err) {
            console.error("Failed to fetch wallet balance:", err);
        }
    };

    // Prefetch all recruiter page chunks and data in background
    // so navigation between recruiter pages is instant
    React.useEffect(() => {
        prefetchRecruiterRoutes();
        const uid = user.uid || user._id || user.id;
        if (uid) {
            queryClient.prefetchQuery({
                queryKey: ['applicants', uid],
                queryFn: () => axios.get(`${API_URL}/applications/recruiter/${uid}`).then(res => res.data),
                staleTime: 5 * 60 * 1000
            });
            queryClient.prefetchQuery({
                queryKey: ['jobs', 'recruiter', uid],
                queryFn: () => axios.get(`${API_URL}/jobs/recruiter/${uid}`).then(res => res.data),
                staleTime: 5 * 60 * 1000
            });
            queryClient.prefetchQuery({
                queryKey: ['dashboard', 'stats', uid],
                queryFn: () => axios.get(`${API_URL}/dashboard/${uid}`).then(res => res.data),
                staleTime: 5 * 60 * 1000
            });
            queryClient.prefetchQuery({
                queryKey: ['wallet', 'balance', uid],
                queryFn: () => axios.get(`${API_URL}/wallet/balance/${uid}`).then(res => res.data?.success ? res.data.balance : 0),
                staleTime: 5 * 60 * 1000
            });
        }
    }, [user.uid, user._id, user.id, queryClient]);

    React.useEffect(() => {
        fetchWalletBalance();
        
        const handleWalletUpdate = () => {
            fetchWalletBalance();
        };
        window.addEventListener('wallet-update', handleWalletUpdate);
        return () => {
            window.removeEventListener('wallet-update', handleWalletUpdate);
        };
    }, [user.uid, user._id, user.id]);


    React.useEffect(() => {
        // Only redirect if user has a role and it's not recruiter OR admin
        if (user.role && user.role !== 'recruiter' && user.role !== 'admin') {
            navigate('/candidate');
            return;
        }

        const handleImmediateLogout = async (msg = "Your session has expired.") => {
            try {
                await signOut(auth);
            } catch (e) {}
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sessionStorage.setItem('login_notice_msg', msg);
            navigate('/login?expired=true', {
                state: {
                    pilotExpired: true,
                    sessionExpired: true,
                    message: msg
                },
                replace: true
            });
        };

        const fetchProfile = async () => {
            const uid = user.uid || user._id || user.id;
            if (!uid) return;

            // Immediate client-side check if trial period ended
            if (user.accountType === 'pilot' && user.pilotExpiresAt) {
                if (new Date() > new Date(user.pilotExpiresAt)) {
                    console.warn("[RECRUITER-PILOT] Pilot trial period ended locally. Immediate logout.");
                    await handleImmediateLogout("Your session has expired.");
                    return;
                }
            }

            try {
                const profileData = await getUserProfile(user.email || uid);

                // If this is a pilot account and profileData is null, admin deleted the credentials!
                if (user.accountType === 'pilot' && !profileData) {
                    console.warn("[RECRUITER-PILOT] Pilot account credentials were deleted by admin. Immediate logout.");
                    await handleImmediateLogout("Your session has expired.");
                    return;
                }

                if (profileData) {
                    // Check if pilot account has expired on server
                    if (profileData.role === 'recruiter' && profileData.accountType === 'pilot') {
                        const isExpired = (profileData.pilotExpiresAt && new Date() > new Date(profileData.pilotExpiresAt)) || profileData.isPilotExpired;
                        if (isExpired) {
                            console.warn("[RECRUITER-PILOT] Pilot account expired on server. Immediate logout.");
                            await handleImmediateLogout("Your session has expired.");
                            return;
                        }
                    }

                    setProfile(profileData);
                    // IMPORTANT: Always preserve the session role (set at login time).
                    // Never let a background DB fetch overwrite the role — if the DB has
                    // a stale or mismatched role, the user would get silently redirected
                    // to /seeker when clicking sidebar links like 'Post Job'.
                    localStorage.setItem('user', JSON.stringify({
                        ...user,
                        ...profileData,
                        role: user.role  // ← pin to login-session role
                    }));
                }
            } catch (error) {
                console.error("Layout profile fetch failed from Firebase:", error);
            }
        };

        // Call fetch immediately
        fetchProfile();

        // If pilot account, keep an active liveness heartbeat running every 5 seconds + on window focus
        let intervalId = null;
        if (user.accountType === 'pilot') {
            intervalId = setInterval(fetchProfile, 5000);
            window.addEventListener('focus', fetchProfile);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('focus', fetchProfile);
        };
    }, [user.uid, user._id, user.id, user.accountType, user.pilotExpiresAt, navigate]);

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
                fixed inset-y-0 left-0 z-40 flex flex-col border-r border-black/10 bg-[#fcfbf8] shadow-[0_24px_70px_rgba(15,23,42,0.08)]
                transition-all duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isMinimized ? 'w-16' : 'w-52'}
                h-full overflow-y-auto custom-scrollbar
            `}>
                {/* Expand / Collapse Toggle Button */}
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-3.5 z-50 h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition cursor-pointer"
                    title={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className={`transition-all duration-300 ${isMinimized ? 'p-3 flex justify-center' : 'px-4 py-4'}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-md shadow-black/10" title="Recruiter Portal">
                            <Zap size={18} />
                        </div>
                        {!isMinimized && (
                            <div className="min-w-0 transition-opacity duration-300">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 truncate">Recruiter portal</p>
                                <h1 className="text-base font-extrabold tracking-tight text-gray-900 truncate">
                                    hire1<span className="text-gray-500">percent</span>
                                </h1>
                            </div>
                        )}
                    </div>
                </div>

                <nav className={`flex-1 space-y-1 transition-all duration-300 ${isMinimized ? 'px-2' : 'px-2 pb-1'}`}>
                    {activeNavItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/recruiter'}
                                onClick={() => setIsSidebarOpen(false)}
                                title={isMinimized ? item.label : undefined}
                                className={({ isActive }) => `
                                    flex items-center transition w-full
                                    ${isMinimized 
                                        ? 'h-9 w-9 justify-center mx-auto rounded-xl border border-transparent' 
                                        : 'gap-3 px-3.5 py-2.5 text-sm font-bold rounded-xl border'}
                                    ${isActive
                                        ? 'border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]'
                                        : 'border-transparent bg-transparent text-gray-600 hover:border-black/5 hover:bg-black/[0.04] hover:text-gray-900'}
                                `}
                            >
                                <Icon size={18} className="shrink-0" />
                                {!isMinimized && (
                                    <span className="flex-1 text-[13.5px] font-bold tracking-tight truncate">
                                        {item.label}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className={`mt-auto shrink-0 border-t border-black/10 transition-all duration-300 ${isMinimized ? 'p-2 flex flex-col items-center gap-1.5' : 'p-2'}`}>
                    {/* Wallet Widget */}
                    {!isMinimized ? (
                        <div className="mx-0.5 mb-1.5 p-2 bg-black/[0.03] border border-black/5 rounded-xl shadow-2xs">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Wallet Balance</span>
                                <Wallet size={11} className="text-gray-500" />
                            </div>
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="text-sm font-black text-gray-900">₹{(walletBalance || 0).toFixed(2)}</div>
                                <button
                                    onClick={() => setIsTopUpOpen(true)}
                                    className="py-0.5 px-2 bg-black hover:bg-black/80 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                >
                                    <Plus size={8} /> Top Up
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsTopUpOpen(true)}
                            title={`Wallet Balance: ₹${(walletBalance || 0).toFixed(2)}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 bg-black/[0.03] text-gray-700 hover:bg-black/10 hover:text-black transition cursor-pointer mb-1"
                        >
                            <Wallet size={15} />
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        title={isMinimized ? "Logout" : undefined}
                        className={`
                            flex items-center text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-500
                            ${isMinimized 
                                ? 'h-9 w-9 justify-center rounded-xl border border-transparent' 
                                : 'mb-1.5 w-full gap-2 rounded-xl px-2.5 py-1.5'}
                        `}
                    >
                        <LogOut size={15} className="shrink-0" />
                        {!isMinimized && <span>Logout</span>}
                    </button>
                    <div 
                        className={`
                            border border-black/10 bg-[#f4efe6] transition-all duration-300
                            ${isMinimized 
                                ? 'flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white' 
                                : 'rounded-xl p-2 w-full'}
                        `}
                        title={isMinimized ? (profile?.name || user.name || 'Recruiter') : undefined}
                    >
                        {isMinimized ? (
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white text-xs font-semibold text-gray-900">
                                {profile?.profilePic ? (
                                    <img loading="lazy" src={profile.profilePic} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'R'
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white text-xs font-semibold text-gray-900">
                                    {profile?.profilePic ? (
                                        <img loading="lazy" src={profile.profilePic} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        user.name?.[0]?.toUpperCase() || 'R'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <p className="truncate text-xs font-semibold text-gray-900">{profile?.name || user.name || 'Recruiter'}</p>
                                        {(profile?.hiringPattern === "Premium Recruiter" || profile?.isPro === true) && (
                                            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-1 py-0.2 text-[7px] font-extrabold uppercase tracking-wider text-black shadow-xs">
                                                <Crown size={7} className="fill-black" /> PRO
                                            </span>
                                        )}
                                        {profile?.accountType === 'pilot' && (
                                            <span className="flex items-center gap-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-1 py-0.2 text-[7px] font-black uppercase tracking-wider text-blue-600">
                                                Pilot
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-gray-400 truncate">{profile?.designation || 'Hiring Lead'}</p>
                                    {profile?.accountType === 'pilot' && profile?.pilotExpiresAt && (
                                        <p className="text-[8px] font-bold text-blue-600 mt-0.5">
                                            {Math.max(0, Math.ceil((new Date(profile.pilotExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))} days left
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main ref={mainRef} className="recruiter-content relative flex-1 overflow-y-auto bg-[#f7f4ee] pt-20 text-gray-900 md:pt-0">
                <div className="mx-auto w-full max-w-none p-4 md:px-8 md:py-6">
                    <Outlet />
                </div>
            </main>
            <CreatePasswordModal />
            <TopUpModal 
                isOpen={isTopUpOpen} 
                onClose={() => setIsTopUpOpen(false)} 
                onSuccess={(newBal) => {
                    setWalletBalance(newBal);
                    window.dispatchEvent(new Event('wallet-update'));
                }} 
                currentBalance={walletBalance} 
            />
        </div>
    );
};

export default RecruiterLayout;
