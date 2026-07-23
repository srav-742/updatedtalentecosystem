import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Archive,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Circle,
    CircleDot,
    Clock3,
    FileText,
    Loader2
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { ApplicationTrackerSkeleton } from '../../components/Skeleton';

const getStatusTone = (status) => {
    switch (status) {
        case 'SHORTLISTED':
            return 'bg-[#eef8f1] text-emerald-700 border-emerald-200';
        case 'HIRED':
        case 'ELIGIBLE':
            return 'bg-[#eef4ff] text-blue-700 border-blue-200';
        case 'REJECTED':
            return 'bg-[#fff1f1] text-red-700 border-red-200';
        case 'SAVED':
            return 'bg-[#fef9c3] text-amber-700 border-amber-200';
        default:
            return 'bg-[#f8f4ed] text-gray-700 border-black/10';
    }
};

const getTimeline = (status) => {
    const isShortlisted = ['SHORTLISTED', 'ELIGIBLE', 'HIRED'].includes(status);
    const isSelected = ['ELIGIBLE', 'HIRED'].includes(status);
    const isHired = status === 'HIRED';
    const isRejected = status === 'REJECTED';

    return [
        {
            label: 'Application submitted',
            active: false,
            completed: true
        },
        {
            label: isRejected ? 'Application reviewed' : 'Pending review',
            active: status === 'APPLIED',
            completed: isShortlisted || isSelected || isRejected || isHired
        },
        {
            label: isRejected ? 'Not shortlisted' : 'Shortlisted',
            active: status === 'SHORTLISTED',
            completed: isShortlisted || isSelected || isRejected || isHired
        },
        {
            label: isRejected ? 'Closed' : 'Selected for job',
            active: isSelected || isRejected || isHired,
            completed: isSelected || isRejected || isHired
        }
    ];
};

const Metric = ({ label, value }) => (
    <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f3] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{label}</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
);

const TimelineRow = ({ step, isCurrent }) => (
    <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white">
            {step.completed ? (
                <CheckCircle2 size={16} className="text-black" />
            ) : step.active ? (
                <CircleDot size={16} className="text-black" />
            ) : (
                <Circle size={16} className="text-gray-300" />
            )}
        </div>
        <div>
            <p className={`text-sm font-medium ${step.completed || step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
            </p>
            {isCurrent ? (
                <p className="mt-1 text-xs font-medium text-gray-500">Current stage</p>
            ) : null}
        </div>
    </div>
);

const ApplicationsSection = ({ title, subtitle, icon: Icon, applications, open, onToggle, emptyMessage, onUnsave }) => (
    <section className="rounded-[2.25rem] border border-black/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <button
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8"
        >
            <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                    <Icon size={18} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title} ({applications.length})</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
                </div>
            </div>
            {open ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
        </button>

        {open ? (
            <div className="space-y-4 border-t border-black/10 px-4 py-4 md:px-6 md:py-6">
                {applications.length > 0 ? (
                    applications.map((application) => {
                        const timeline = getTimeline(application.status);
                        const currentIndex = timeline.findIndex((step) => step.active);

                        return (
                            <article
                                key={application._id}
                                className="rounded-[2rem] border border-black/10 bg-[#fcfaf6] p-5 md:p-6"
                            >
                                <div className="flex flex-col gap-5 border-b border-black/10 pb-5 md:flex-row md:items-start md:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white text-gray-700 shadow-sm">
                                            <BriefcaseBusiness size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold tracking-tight text-gray-900">
                                                {application.jobId?.title || 'Untitled role'}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {application.jobId?.recruiterId?.company?.name || application.jobId?.company || 'Hiring team'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(application.status)}`}>
                                            {application.status === 'APPLIED' ? 'Pending Review' : application.status}
                                        </span>
                                    </div>
                                </div>

                                {application.status === 'SAVED' ? (
                                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[1.75rem] border border-black/10 bg-white p-5">
                                        <p className="text-sm text-gray-600">
                                            You saved this job. You can start your AI application whenever you have time.
                                        </p>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <button
                                                onClick={() => onUnsave(application._id)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-[#faf7f1]"
                                            >
                                                Remove
                                            </button>
                                            <Link
                                                to={`/seeker/job/${application.jobId?._id}`}
                                                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                                            >
                                                Apply Now
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-5 space-y-4">
                                        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                                            <div className="space-y-3 rounded-[1.75rem] border border-black/10 bg-white p-5">
                                                {timeline.map((step, index) => (
                                                    <TimelineRow
                                                        key={`${application._id}-${step.label}`}
                                                        step={step}
                                                        isCurrent={index === currentIndex}
                                                    />
                                                ))}
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                <Metric label="Resume Match" value={application.resumeMatchPercent ? `${application.resumeMatchPercent}/10` : '--'} />
                                                <Metric label="Assessment" value={application.assessmentScore ? `${application.assessmentScore}/20` : '--'} />
                                                <Metric label="Interview" value={application.interviewScore ? `${application.interviewScore}/70` : '--'} />
                                                <Metric label="Final Score" value={application.finalScore ? `${application.finalScore}/100` : '--'} />
                                            </div>
                                        </div>

                                        {!application.interviewScore && application.jobId?.mockInterview?.enabled && (
                                            <div className="flex justify-end pt-2">
                                                <Link
                                                    to={`/seeker/apply/${application.jobId?._id || application.jobId}`}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-semibold text-white transition hover:bg-gray-800 shadow-sm"
                                                >
                                                    <BriefcaseBusiness size={14} />
                                                    Resume Application Flow
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })
                ) : (
                    <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-[#fbf8f3] px-6 py-14 text-center">
                        <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
                    </div>
                )}
            </div>
        ) : null}
    </section>
);

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MyApplications = () => {
    const queryClient = useQueryClient();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [submittedOpen, setSubmittedOpen] = useState(true);
    const [archivedOpen, setArchivedOpen] = useState(false);

    const userId = user.uid || user._id || user.id;

    // React Query hook for fetching and caching seeker applications
    const { data: applications = [], isLoading: loading } = useQuery({
        queryKey: ['applications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/candidate/${userId}`);
            return res.data;
        },
        enabled: !!userId
    });

    const submittedApplications = useMemo(
        () => applications.filter((application) => application.status !== 'REJECTED' && application.status !== 'SAVED'),
        [applications]
    );

    const archivedApplications = useMemo(
        () => applications.filter((application) => application.status === 'REJECTED' || application.status === 'SAVED'),
        [applications]
    );

    // Mutation for unsaving jobs
    const unsaveMutation = useMutation({
        mutationFn: async (appId) => {
            await axios.delete(`${API_URL}/applications/${appId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        }
    });

    const handleUnsave = async (appId) => {
        unsaveMutation.mutate(appId);
    };

    return (
        <div className="space-y-8">
            <header className="rounded-[2.25rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Application tracking</p>
                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Track your applications</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                            Follow each submitted application from review to shortlist and selection, all in one clean timeline.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                        <Clock3 size={16} />
                        Updated in real time
                    </div>
                </div>
            </header>

            {loading ? (
                <ApplicationTrackerSkeleton />
            ) : (
                <>
                    <ApplicationsSection
                        title="Submitted"
                        subtitle="Track the progress of your active applications and see each stage as it moves forward."
                        icon={FileText}
                        applications={submittedApplications}
                        open={submittedOpen}
                        onToggle={() => setSubmittedOpen((value) => !value)}
                        emptyMessage="No active applications yet. Once you apply, they will appear here."
                    />

                    <ApplicationsSection
                        title="Archived"
                        subtitle="Closed or unsuccessful applications stay here for reference."
                        icon={Archive}
                        applications={archivedApplications}
                        open={archivedOpen}
                        onToggle={() => setArchivedOpen((value) => !value)}
                        emptyMessage="No archived applications right now."
                        onUnsave={handleUnsave}
                    />
                </>
            )}
        </div>
    );
};

export default MyApplications;
