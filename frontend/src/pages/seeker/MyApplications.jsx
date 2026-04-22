import React, { useEffect, useMemo, useState } from 'react';
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

const getStatusTone = (status) => {
    switch (status) {
        case 'SHORTLISTED':
            return 'bg-[#eef8f1] text-emerald-700 border-emerald-200';
        case 'ELIGIBLE':
            return 'bg-[#eef4ff] text-blue-700 border-blue-200';
        case 'REJECTED':
            return 'bg-[#fff1f1] text-red-700 border-red-200';
        default:
            return 'bg-[#f8f4ed] text-gray-700 border-black/10';
    }
};

const getTimeline = (status) => {
    const shortlisted = status === 'SHORTLISTED' || status === 'ELIGIBLE';
    const selected = status === 'ELIGIBLE';
    const rejected = status === 'REJECTED';

    return [
        {
            label: 'Application submitted',
            active: true,
            completed: true
        },
        {
            label: rejected ? 'Application reviewed' : 'Pending review',
            active: status === 'APPLIED' || rejected,
            completed: shortlisted || selected || rejected
        },
        {
            label: rejected ? 'Not shortlisted' : 'Shortlisted',
            active: shortlisted || rejected,
            completed: shortlisted || selected || rejected
        },
        {
            label: rejected ? 'Closed' : 'Selected for job',
            active: selected || rejected,
            completed: selected || rejected
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

const ApplicationsSection = ({ title, subtitle, icon: Icon, applications, open, onToggle, emptyMessage }) => (
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

                                <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
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
                                        <Metric label="Resume Match" value={`${application.resumeMatchPercent ?? '--'}%`} />
                                        <Metric label="Assessment" value={application.assessmentScore ?? '--'} />
                                        <Metric label="Interview" value={application.interviewScore ?? '--'} />
                                        <Metric label="Final Score" value={application.finalScore ?? '--'} />
                                    </div>
                                </div>
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

const MyApplications = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittedOpen, setSubmittedOpen] = useState(true);
    const [archivedOpen, setArchivedOpen] = useState(false);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const res = await axios.get(`${API_URL}/applications/seeker/${userId}`);
                setApplications(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) {
            fetchApps();
        }
    }, [user.uid, user._id, user.id]);

    const submittedApplications = useMemo(
        () => applications.filter((application) => application.status !== 'REJECTED'),
        [applications]
    );

    const archivedApplications = useMemo(
        () => applications.filter((application) => application.status === 'REJECTED'),
        [applications]
    );

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
                <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3efe6] text-gray-700">
                        <Loader2 size={34} className="animate-spin" />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Loading application tracker</h2>
                    <p className="mt-3 text-sm leading-7 text-gray-500">Syncing your job applications and current status history.</p>
                </div>
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
                    />
                </>
            )}
        </div>
    );
};

export default MyApplications;
