/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UploadCloud, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    AlertCircle, 
    RefreshCw, 
    X, 
    Users, 
    Copy, 
    Check, 
    ShieldCheck, 
    Mail, 
    Brain, 
    Code2, 
    Video, 
    Sparkles,
    Lock,
    ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../firebase';

const ROUND_OPTIONS = [
    { 
        id: 'ALL', 
        label: 'All Configured Rounds', 
        badge: 'Test & Interview',
        icon: Sparkles, 
        desc: 'Skill Assessment + Coding + AI Interview' 
    },
    { 
        id: 'ASSESSMENT', 
        label: 'Skill Assessment', 
        badge: 'MCQ Test',
        icon: Brain, 
        desc: 'Domain multiple-choice test only' 
    },
    { 
        id: 'CODING', 
        label: 'Coding Assessment', 
        badge: 'Hands-on IDE',
        icon: Code2, 
        desc: 'Proctored sandbox coding round only' 
    },
    { 
        id: 'INTERVIEW', 
        label: 'AI Mock Interview', 
        badge: 'AI Avatar Video',
        icon: Video, 
        desc: 'AI conversational round only' 
    },
];

const BulkUploadModal = ({ isOpen, onClose, jobId, job, onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [targetRound, setTargetRound] = useState('ALL');
    const [jobDetails, setJobDetails] = useState(job || null);
    const [editingEmails, setEditingEmails] = useState({});
    const [savingEmailId, setSavingEmailId] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);

    const fileInputRef = useRef(null);
    const [recruiter] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    // Fetch or sync job details
    useEffect(() => {
        if (job) {
            setJobDetails(job);
        } else if (jobId && isOpen) {
            axios.get(`${API_URL}/jobs/${jobId}`)
                .then(res => setJobDetails(res.data))
                .catch(err => console.warn('[BULK-UPLOAD] Could not fetch job:', err.message));
        }
    }, [job, jobId, isOpen]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setProcessing(false);
            setEditingEmails({});
            setSavingEmailId(null);
            setCopiedLink(false);
            setCopiedInvite(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            (file) => file.type === 'application/pdf'
        );
        addFilesToList(droppedFiles);
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files).filter(
            (file) => file.type === 'application/pdf'
        );
        addFilesToList(selectedFiles);
    };

    const addFilesToList = (newFiles) => {
        const mapped = newFiles.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            status: 'queued', // queued, uploading, parsing, analyzing, success, failed
            progress: 0,
            error: null,
            candidate: null,
        }));
        setFiles((prev) => [...prev, ...mapped]);
    };

    const removeFile = (id) => {
        if (processing) return;
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const triggerSelect = () => {
        if (processing) return;
        fileInputRef.current?.click();
    };

    const getStepQuery = (round) => {
        if (round === 'ASSESSMENT') return '?step=assessment';
        if (round === 'CODING') return '?step=coding';
        if (round === 'INTERVIEW') return '?step=interview';
        return '';
    };

    const candidateAccessUrl = `${window.location.origin}/candidate/apply/${jobId}${getStepQuery(targetRound)}`;

    const processFiles = async () => {
        if (files.length === 0 || processing) return;
        setProcessing(true);

        const recruiterId = recruiter.uid || recruiter._id || recruiter.id;

        // Process files sequentially to give a premium, readable step-by-step update in the UI
        for (let i = 0; i < files.length; i++) {
            const currentFile = files[i];
            if (currentFile.status === 'success') continue;

            // Step 1: Uploading
            updateFileStatus(currentFile.id, { status: 'uploading', progress: 25 });
            await delay(500);

            // Step 2: Parsing
            updateFileStatus(currentFile.id, { status: 'parsing', progress: 50 });

            const formData = new FormData();
            formData.append('resume', currentFile.file);
            formData.append('jobId', jobId);
            formData.append('recruiterId', recruiterId);
            formData.append('targetRound', targetRound);

            try {
                const res = await axios.post(`${API_URL}/recruiter/bulk-upload-candidate`, formData);

                // Step 3: Analyzing
                updateFileStatus(currentFile.id, { status: 'analyzing', progress: 75 });
                await delay(500);

                // Step 4: Complete
                if (res.data && res.data.success) {
                    updateFileStatus(currentFile.id, {
                        status: 'success',
                        progress: 100,
                        candidate: res.data.candidate,
                    });
                } else {
                    throw new Error(res.data?.message || 'Processing incomplete.');
                }
            } catch (err) {
                console.error(`Error processing file ${currentFile.name}:`, err);
                updateFileStatus(currentFile.id, {
                    status: 'failed',
                    progress: 100,
                    error: err.response?.data?.message || err.message || 'Server error occurred',
                });
            }
        }

        setProcessing(false);
        if (onUploadComplete) {
            onUploadComplete();
        }
    };

    const handleGrantManualAccess = async (fileId, candidateName) => {
        const emailToGrant = (editingEmails[fileId] || '').trim().toLowerCase();
        if (!emailToGrant || !emailToGrant.includes('@')) {
            alert('Please enter a valid candidate email address.');
            return;
        }

        setSavingEmailId(fileId);
        try {
            const res = await axios.post(`${API_URL}/recruiter/grant-candidate-access`, {
                jobId,
                candidateEmail: emailToGrant,
                candidateName,
                targetRound
            });

            if (res.data?.success) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileId
                            ? {
                                  ...f,
                                  candidate: {
                                      ...f.candidate,
                                      email: emailToGrant,
                                      rawEmail: emailToGrant,
                                      isDummyEmail: false,
                                      accessGranted: true,
                                      targetRound
                                  }
                              }
                            : f
                    )
                );
                if (onUploadComplete) onUploadComplete();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to grant access to candidate.');
        } finally {
            setSavingEmailId(null);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(candidateAccessUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (e) {
            console.error('Failed to copy link:', e);
        }
    };

    const handleCopyInvite = async () => {
        const jobTitle = jobDetails?.title || 'Open Position';
        const company = jobDetails?.company || 'our team';
        const roundInfo = ROUND_OPTIONS.find((r) => r.id === targetRound);
        const roundLabel = roundInfo ? roundInfo.label : 'Assessment & Interview';

        const text = `Hi,\n\nYou have been shortlisted and granted exclusive access to take the ${roundLabel} for the position of "${jobTitle}" at ${company}.\n\nAccess your assessment & interview directly using this link:\n${candidateAccessUrl}\n\nImportant: Please sign in with your email address used on your resume to unlock your test/interview session.\n\nBest of luck!\nRecruitment Team`;

        try {
            await navigator.clipboard.writeText(text);
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2000);
        } catch (e) {
            console.error('Failed to copy invite text:', e);
        }
    };

    const updateFileStatus = (id, updates) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getStatusTextAndStyle = (file) => {
        switch (file.status) {
            case 'queued':
                return { text: 'Ready', class: '!text-gray-400 bg-white/5 border-white/5', style: { color: '#9ca3af' } };
            case 'uploading':
                return { text: 'Uploading...', class: '!text-blue-400 bg-blue-500/10 border-blue-500/20', style: { color: '#60a5fa' } };
            case 'parsing':
                return { text: 'AI Extracting Details...', class: '!text-purple-400 bg-purple-500/10 border-purple-500/20', style: { color: '#c084fc' } };
            case 'analyzing':
                return { text: 'ATS Scoring...', class: '!text-amber-400 bg-amber-500/10 border-amber-500/20', style: { color: '#fbbf24' } };
            case 'success':
                return { text: 'Access Granted', class: '!text-emerald-400 bg-emerald-500/10 border-emerald-500/20', style: { color: '#34d399' } };
            case 'failed':
                return { text: 'Failed', class: '!text-red-400 bg-red-500/10 border-red-500/20', style: { color: '#f87171' } };
            default:
                return { text: 'Queued', class: '!text-gray-400 bg-white/5 border-white/5', style: { color: '#9ca3af' } };
        }
    };

    const getProgressBarColor = (status) => {
        switch (status) {
            case 'uploading':
                return 'bg-blue-500';
            case 'parsing':
                return 'bg-purple-500';
            case 'analyzing':
                return 'bg-amber-500';
            case 'success':
                return 'bg-emerald-500';
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-white/10';
        }
    };

    const successFiles = files.filter((f) => f.status === 'success' && f.candidate);
    const successCount = successFiles.length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                className="relative w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Glow Background effect */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

                {/* Header */}
                <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between relative z-10 bg-zinc-950/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                            <UploadCloud size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Bulk Resume Upload</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                    <ShieldCheck size={11} /> Exclusive Access
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-medium">
                                {jobDetails?.title ? `${jobDetails.title} • ` : ''}Extract candidate names & emails to grant exclusive test/interview access.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 md:p-6 overflow-y-auto space-y-6 relative z-10 flex-1">
                    {/* Target Round Selector Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lock size={14} className="text-purple-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                                    Assign Test or Interview Access
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                                Only extracted candidates will receive access
                            </span>
                        </div>

                        {/* Round Pills Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {ROUND_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = targetRound === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        disabled={processing}
                                        onClick={() => setTargetRound(opt.id)}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                            isSelected
                                                ? 'bg-gradient-to-b from-purple-500/20 to-blue-500/10 border-purple-500/50 text-white shadow-md shadow-purple-500/10'
                                                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:border-white/15 hover:text-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <Icon size={16} className={isSelected ? 'text-purple-400' : 'text-gray-500'} />
                                            {isSelected && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold leading-tight">{opt.label}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{opt.badge}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Drag and Drop Zone (When no files in queue) */}
                    {files.length === 0 && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={triggerSelect}
                            className={`p-10 md:p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-500/5 shadow-inner'
                                    : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]'
                            }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                accept=".pdf"
                                className="hidden"
                            />
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center text-blue-400 mb-4 transition-transform group-hover:scale-109 shadow-lg">
                                <UploadCloud size={32} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-1">
                                Drag & Drop Candidate Resumes Here
                            </h4>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-4">
                                Upload multiple PDF resumes. The system will automatically fetch each candidate's name & email and authorize them for the selected test/interview.
                            </p>
                            <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer">
                                Select PDF Files
                            </span>
                        </div>
                    )}

                    {/* File List Queue & Candidate Extraction Display */}
                    {files.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    Resumes in Queue ({files.length})
                                </span>
                                {!processing && (
                                    <button
                                        onClick={triggerSelect}
                                        className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        + Add More Resumes
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    multiple
                                    accept=".pdf"
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {files.map((fileObj) => {
                                        const statusStyle = getStatusTextAndStyle(fileObj);
                                        const isDone = fileObj.status === 'success';
                                        const candidate = fileObj.candidate;

                                        return (
                                            <motion.div
                                                key={fileObj.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 relative ${
                                                    isDone
                                                        ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                                        : fileObj.status === 'failed'
                                                        ? 'bg-rose-500/[0.03] border-rose-500/20'
                                                        : 'bg-white/[0.02] border-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                                                            isDone 
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                                : 'bg-white/5 border-white/5 text-blue-400'
                                                        }`}>
                                                            {isDone ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-gray-200 truncate pr-3">
                                                                {fileObj.name}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 font-medium">
                                                                {fileObj.size}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            style={statusStyle.style}
                                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${statusStyle.class}`}
                                                        >
                                                            {statusStyle.text}
                                                        </span>
                                                        {!processing && fileObj.status === 'queued' && (
                                                            <button
                                                                onClick={() => removeFile(fileObj.id)}
                                                                className="text-gray-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                {fileObj.status !== 'queued' && (
                                                    <div className="w-full space-y-1">
                                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${fileObj.progress}%` }}
                                                                className={`h-full ${getProgressBarColor(fileObj.status)} transition-all duration-300`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Extracted Candidate Details & Round Access Display */}
                                                {isDone && candidate && (
                                                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10 space-y-2">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            {/* Candidate Name & Email */}
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-[10px] font-bold shrink-0">
                                                                    {candidate.name?.charAt(0) || 'C'}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-xs font-bold text-white block truncate">
                                                                        {candidate.name}
                                                                    </span>
                                                                    {candidate.email ? (
                                                                        <span className="text-[11px] text-cyan-300 font-mono block truncate">
                                                                            {candidate.email}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-amber-400 font-medium block">
                                                                            Email not detected in resume
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Badges: Score & Round Access */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-gray-300 border border-white/5">
                                                                    ATS: {candidate.score}/10
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                                    <ShieldCheck size={11} /> Access: {ROUND_OPTIONS.find(r => r.id === (candidate.targetRound || targetRound))?.badge || 'Test & Interview'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* If Email is Missing or Dummy, Allow Recruiter to Input It */}
                                                        {(!candidate.email || candidate.isDummyEmail) && (
                                                            <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                                                                <input
                                                                    type="email"
                                                                    placeholder="Enter candidate email to grant access..."
                                                                    value={editingEmails[fileObj.id] || ''}
                                                                    onChange={(e) =>
                                                                        setEditingEmails((prev) => ({
                                                                            ...prev,
                                                                            [fileObj.id]: e.target.value
                                                                        }))
                                                                    }
                                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={savingEmailId === fileObj.id}
                                                                    onClick={() => handleGrantManualAccess(fileObj.id, candidate.name)}
                                                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                                >
                                                                    {savingEmailId === fileObj.id ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <Check size={12} />
                                                                    )}
                                                                    <span>Grant Access</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Error Display */}
                                                {fileObj.status === 'failed' && fileObj.error && (
                                                    <div className="text-[11px] font-semibold text-rose-400 flex items-start gap-1.5 bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/10">
                                                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                                        <span>{fileObj.error}</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Post-Upload Candidate Access & Invitation Sharing Card */}
                    {successCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900/90 to-blue-950/40 border border-purple-500/30 space-y-3.5 shadow-xl"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                            {successCount} Candidate{successCount > 1 ? 's' : ''} Whitelisted & Authorized
                                        </h4>
                                        <p className="text-[11px] text-gray-400">
                                            Target Round: <strong className="text-purple-300">{ROUND_OPTIONS.find(r => r.id === targetRound)?.label}</strong>. Only these candidates have access.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Direct URL Box */}
                            <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-gray-300 font-mono truncate select-all">
                                    {candidateAccessUrl}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        style={{ backgroundColor: '#000000', color: '#ffffff' }}
                                        className="px-3 py-1.5 rounded-lg bg-black hover:bg-zinc-900 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                    >
                                        {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} style={{ color: '#ffffff' }} />}
                                        <span style={{ color: '#ffffff' }}>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopyInvite}
                                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-purple-600/20"
                                    >
                                        {copiedInvite ? <Check size={12} className="text-emerald-400" /> : <Mail size={12} />}
                                        <span>{copiedInvite ? 'Copied Invite' : 'Copy Invite'}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-5 md:p-6 border-t border-white/10 flex items-center justify-between relative z-10 bg-zinc-950/80 backdrop-blur-md">
                    <div className="text-xs text-gray-400 font-medium">
                        {files.length > 0 && (
                            <span>
                                <strong className="text-white">{successCount}</strong> of <strong className="text-white">{files.length}</strong> processed successfully
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2.5">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-gray-300 uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {successCount > 0 ? 'Done' : 'Cancel'}
                        </button>
                        {files.length > 0 && !files.every((f) => f.status === 'success') && (
                            <button
                                onClick={processFiles}
                                disabled={processing}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Extracting & Authorizing...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={14} />
                                        <span>Start Processing & Authorize</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default BulkUploadModal;
