import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, CheckCircle2, ExternalLink, Lock, MessageSquare, Star, Terminal, Zap } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const EliteCommunity = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [isVetted, setIsVetted] = useState(false);
    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkVettedStatus = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const res = await axios.get(`${API_URL}/applications/seeker/${userId}`);
                const apps = res.data;
                const vetted = apps.some((item) => item.status === 'SHORTLISTED' || item.status === 'ELIGIBLE');
                setIsVetted(vetted);

                if (vetted) {
                    const communityRes = await axios.get(`${API_URL}/community`);
                    setCommunity(communityRes.data);
                }
            } catch (error) {
                console.error('Failed to check status or fetch community:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) {
            checkVettedStatus();
        }
    }, [user.uid, user._id, user.id]);

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-20 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f4efe6] text-gray-700">
                    <Zap size={34} className="animate-pulse" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Checking community access</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Reviewing your application status and unlocking the right candidate experience.</p>
            </div>
        );
    }

    if (!isVetted) {
        return <LockedState />;
    }

    return (
        <div className="space-y-8">
            <header className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                            Access unlocked
                        </div>
                        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-900">Welcome to the Elite Talent Community</h1>
                        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-500">
                            You have cleared the candidate screening bar for at least one role, so community-only opportunities and conversations are now open to you.
                        </p>

                        <a
                            href={community?.invitationLink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                            Join {community?.platform || 'Community'}
                            <ExternalLink size={18} />
                        </a>
                    </div>

                    <div className="rounded-[2rem] border border-black/10 bg-[#f8f4ed] p-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                                <Star size={22} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Community benefits</p>
                                <p className="text-lg font-semibold text-gray-900">Reserved for vetted candidates</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            {[
                                'Access peer discussions with other screened candidates.',
                                'Discover hidden projects, talent programs, and curated roles.',
                                'Stay closer to recruiters and community-led events.'
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-sm leading-6 text-gray-600">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid gap-5 md:grid-cols-3">
                {community?.benefits?.map((benefit, index) => {
                    const Icon = index === 0 ? MessageSquare : index === 1 ? Terminal : Briefcase;

                    return (
                        <motion.div
                            key={benefit.title || index}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                <Icon size={22} />
                            </div>
                            <h3 className="mt-5 text-xl font-semibold tracking-tight text-gray-900">{benefit.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-gray-500">{benefit.description}</p>
                        </motion.div>
                    );
                })}
            </div>

            <section className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Upcoming sessions</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Community events</h2>

                <div className="mt-8 space-y-4">
                    {community?.amaSessions?.length > 0 ? (
                        community.amaSessions.map((session, index) => (
                            <div
                                key={`${session.title}-${index}`}
                                className="flex flex-col gap-4 rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] px-5 py-5 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold tracking-tight text-gray-900">{session.title}</h3>
                                    <p className="mt-1 text-sm text-gray-500">with {session.speaker}</p>
                                </div>
                                <div className="text-sm font-medium text-gray-600">
                                    {new Date(session.date).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-[#fbf8f3] px-6 py-14 text-center">
                            <p className="text-sm font-medium text-gray-500">No community events are scheduled right now.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

const LockedState = () => (
    <div className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-14 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#f8f4ed] text-gray-700">
            <Lock size={36} />
        </div>
        <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Elite Community is locked</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-gray-500">
            This space opens after you clear the candidate screening stages for at least one job. Complete your application flow to unlock it.
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Requirement 1</p>
                <p className="mt-3 text-lg font-semibold text-gray-900">Complete the candidate workflow</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">Resume analysis, assessment, and interview should be finished for an application.</p>
            </div>
            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Requirement 2</p>
                <p className="mt-3 text-lg font-semibold text-gray-900">Reach a shortlisted or eligible status</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">Access unlocks automatically once the application status qualifies.</p>
            </div>
        </div>

        <button
            onClick={() => window.location.assign('/seeker/jobs')}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
            Apply for a job
            <ArrowRight size={18} />
        </button>
    </div>
);

export default EliteCommunity;
