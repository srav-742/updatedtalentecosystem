import React from 'react';

// Base Skeleton Component with support for light (default) and dark themes
export const Skeleton = ({ className = '', variant = 'light' }) => {
    const baseBg = variant === 'dark' ? 'bg-white/5 border border-white/5' : 'bg-black/5 border border-black/5';
    return (
        <div className={`animate-pulse rounded ${baseBg} ${className}`} />
    );
};

// Seeker - Browse Jobs Card Skeleton
export const JobCardSkeleton = () => (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-6">
        <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-14 w-14 rounded-[1.5rem]" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
            </div>
        </div>
        <div className="space-y-3">
            <Skeleton className="h-7 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="border-t border-black/5 pt-5 flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-7 w-16 rounded-md" />
        </div>
    </div>
);

// Seeker - Application Tracker Item Skeleton
export const ApplicationTrackerSkeleton = () => (
    <div className="space-y-6">
        {[1, 2].map((i) => (
            <div key={i} className="rounded-[2.25rem] border border-black/10 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-[1.25rem]" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48 rounded" />
                            <Skeleton className="h-4 w-32 rounded" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] pt-4 border-t border-black/5">
                    {/* Timeline skeleton */}
                    <div className="space-y-4 rounded-[1.75rem] border border-black/10 bg-[#faf8f3]/30 p-5">
                        {[1, 2, 3].map((j) => (
                            <div key={j} className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-1/3 rounded" />
                                    <Skeleton className="h-3 w-1/4 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Metrics grid skeleton */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="rounded-[1.25rem] border border-black/10 bg-white p-4 space-y-2 flex flex-col justify-between">
                                <Skeleton className="h-3 w-16 rounded" />
                                <Skeleton className="h-6 w-10 rounded mt-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Seeker - Job Detail Page Skeleton
export const JobDetailSkeleton = () => (
    <div className="space-y-8">
        {/* Back button placeholder */}
        <Skeleton className="h-10 w-32 rounded-full" />

        {/* Header Card Skeleton */}
        <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-5">
                    <Skeleton className="h-20 w-20 rounded-[2rem]" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-8 w-64 rounded-md" />
                        <Skeleton className="h-5 w-40 rounded" />
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
            </div>
            <div className="grid gap-4 pt-6 border-t border-black/5 sm:grid-cols-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl bg-[#faf7f1]/50 p-4 space-y-2 border border-black/[0.03]">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-5 w-24 rounded" />
                    </div>
                ))}
            </div>
        </div>

        {/* Body content skeleton */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6 rounded-[2.5rem] border border-black/10 bg-white p-8">
                <div className="space-y-3">
                    <Skeleton className="h-6 w-48 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                </div>
                <div className="space-y-3 pt-6 border-t border-black/5">
                    <Skeleton className="h-6 w-36 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                </div>
            </div>
            <div className="h-fit rounded-[2.5rem] border border-black/10 bg-[#faf7f1] p-8 space-y-6">
                <Skeleton className="h-6 w-32 rounded" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <Skeleton className="h-4 w-20 rounded" />
                            <Skeleton className="h-4 w-24 rounded" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
        </div>
    </div>
);

// Seeker - Profile Page Skeleton
export const ProfileSkeleton = () => (
    <div className="space-y-8 max-w-[1320px] mx-auto">
        {/* Header Section */}
        <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 flex flex-col md:flex-row items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3 w-full text-center md:text-left">
                <Skeleton className="h-7 w-48 rounded mx-auto md:mx-0" />
                <Skeleton className="h-4 w-32 rounded mx-auto md:mx-0" />
                <Skeleton className="h-4 w-64 rounded mx-auto md:mx-0" />
            </div>
        </div>

        {/* Profile Details Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <div className="rounded-[2rem] border border-black/10 bg-white p-6 space-y-4">
                    <Skeleton className="h-6 w-32 rounded" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
                <div className="rounded-[2rem] border border-black/10 bg-white p-6 space-y-4">
                    <Skeleton className="h-6 w-32 rounded" />
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="rounded-[2rem] border border-black/10 bg-white p-6 space-y-4">
                    <Skeleton className="h-6 w-24 rounded" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
            </div>
        </div>
    </div>
);

// Seeker - Resume Analysis Parsing Stage Skeleton
export const ResumeAnalysisSkeleton = () => (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] space-y-6">
        <div className="flex items-center gap-4 border-b border-black/5 pb-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
        </div>
        
        {/* Analyzing alert/banner */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </div>
            <p className="text-xs font-semibold text-blue-900">
                AI is extracting information from your resume... This may take a moment.
            </p>
        </div>

        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Contact Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-black/5">
            <h4 className="text-sm font-semibold text-gray-900">Education Background</h4>
            <div className="space-y-3">
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3 rounded" />
                        <Skeleton className="h-3 w-1/4 rounded" />
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-black/5">
            <h4 className="text-sm font-semibold text-gray-900">Key Skills</h4>
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-14 rounded-full" />
            </div>
        </div>
    </div>
);

// Recruiter - Applicants List Skeleton (Dark Theme matches recruiter portal)
export const ApplicantsSkeleton = () => (
    <div className="space-y-4 mb-10">
        {/* Job Title Skeleton */}
        <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-48 rounded-full" variant="dark" />
            <Skeleton className="h-5 w-20 rounded-full" variant="dark" />
        </div>

        {/* Table Container Skeleton */}
        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl overflow-hidden">
            <table className="w-full text-left relative z-10" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '5%' }} />
                </colgroup>
                <thead>
                    <tr className="border-b border-white/10 text-gray-500 text-[10px] uppercase font-bold tracking-wider bg-white/[0.01]">
                        <th className="pb-4 pt-4 text-center">S.No</th>
                        <th className="pb-4 pt-4 pl-4 text-left">Candidate Info</th>
                        <th className="pb-4 pt-4 text-center">Video Intro</th>
                        <th className="pb-4 pt-4 text-center">Resume Match</th>
                        <th className="pb-4 pt-4 text-center">Assessment</th>
                        <th className="pb-4 pt-4 text-center">Interview</th>
                        <th className="pb-4 pt-4 text-center">Proctoring Score</th>
                        <th className="pb-4 pt-4 text-center">Final Score</th>
                        <th className="pb-4 pt-4 text-center">Status</th>
                        <th className="pb-4 pt-4 text-right pr-6">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="border-b border-white/5 last:border-b-0">
                            <td className="py-5 text-center">
                                <Skeleton className="h-4 w-6 mx-auto rounded" variant="dark" />
                            </td>
                            <td className="py-5 pl-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32 rounded" variant="dark" />
                                    <Skeleton className="h-3 w-40 rounded" variant="dark" />
                                </div>
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-6 w-16 mx-auto rounded-full" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-8 w-12 mx-auto rounded-xl" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-8 w-12 mx-auto rounded-xl" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-8 w-12 mx-auto rounded-xl" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-6 w-16 mx-auto rounded-full" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-8 w-12 mx-auto rounded-xl" variant="dark" />
                            </td>
                            <td className="py-5 text-center">
                                <Skeleton className="h-6 w-20 mx-auto rounded-full" variant="dark" />
                            </td>
                            <td className="py-5 text-right pr-6">
                                <Skeleton className="h-8 w-8 ml-auto rounded-xl" variant="dark" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// Recruiter - Job Card Skeleton (Dark Theme)
export const RecruiterJobCardSkeleton = () => (
    <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex items-start gap-6 flex-1">
                <Skeleton className="w-20 h-20 rounded-[2rem]" variant="dark" />
                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-7 w-1/3 rounded-lg" variant="dark" />
                        <Skeleton className="h-6 w-20 rounded-xl" variant="dark" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-24 rounded" variant="dark" />
                            <Skeleton className="h-4 w-24 rounded" variant="dark" />
                            <Skeleton className="h-4 w-24 rounded" variant="dark" />
                        </div>
                        <Skeleton className="h-5 w-48 rounded" variant="dark" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-16 rounded-md" variant="dark" />
                            <Skeleton className="h-6 w-16 rounded-md" variant="dark" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-4 w-full md:w-auto md:min-w-[360px]">
                <Skeleton className="h-14 w-48 rounded-2xl" variant="dark" />
                <div className="flex gap-2 w-full">
                    <Skeleton className="h-12 flex-1 rounded-2xl" variant="dark" />
                    <Skeleton className="h-12 w-12 rounded-2xl" variant="dark" />
                    <Skeleton className="h-12 w-12 rounded-2xl" variant="dark" />
                    <Skeleton className="h-12 w-12 rounded-2xl" variant="dark" />
                </div>
            </div>
        </div>
    </div>
);

// Recruiter - Dashboard Skeleton (Dark Theme)
export const RecruiterDashboardSkeleton = () => (
    <div className="space-y-8">
        {/* Welcome Header Skeleton */}
        <div className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-4">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 w-96 rounded-md" />
            <Skeleton className="h-5 w-full rounded" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" variant="dark" />
                    <Skeleton className="h-4 w-28 rounded" variant="dark" />
                    <Skeleton className="h-8 w-16 rounded" variant="dark" />
                </div>
            ))}
        </div>

        {/* Recent Jobs Table Skeleton */}
        <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-36 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48 rounded" />
                            <Skeleton className="h-3 w-32 rounded" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Seeker - Dashboard Skeleton (Light Theme)
export const SeekerDashboardSkeleton = () => (
    <div className="space-y-8">
        {/* Welcome Header Skeleton */}
        <div className="rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-4">
            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-10 w-96 rounded-md" />
                    <Skeleton className="h-5 w-full rounded" />
                    <div className="flex gap-3">
                        <Skeleton className="h-12 w-32 rounded-2xl" />
                        <Skeleton className="h-12 w-40 rounded-2xl" />
                    </div>
                </div>
                <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-28 rounded" />
                            <Skeleton className="h-5 w-40 rounded" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-5/6 rounded" />
                        <Skeleton className="h-4 w-4/5 rounded" />
                    </div>
                </div>
            </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-[1.9rem] border border-black/10 bg-white p-6 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-8 w-16 rounded" />
                </div>
            ))}
        </div>

        {/* Quick Actions & Profile Info Skeleton */}
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-6">
                <div>
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-8 w-64 rounded-md mt-2" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-[1.9rem] border border-black/10 bg-[#fcfaf6] p-6 space-y-4">
                            <Skeleton className="h-12 w-12 rounded-2xl" />
                            <Skeleton className="h-6 w-28 rounded" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)] space-y-6">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-8 w-64 rounded-md" />
                <Skeleton className="h-4 w-full rounded" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 rounded-2xl border border-black/10 bg-[#fbf8f3] p-4">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-5/6 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);


