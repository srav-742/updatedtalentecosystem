import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, 
    X, 
    Plus, 
    Upload, 
    Trash2, 
    Mail, 
    Copy, 
    Check, 
    Users, 
    AlertCircle, 
    CheckCircle2, 
    Loader2, 
    Search,
    Share2,
    FileText
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../firebase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CandidateWhitelistModal = ({ isOpen, onClose, job, onUpdateComplete }) => {
    const [isRestricted, setIsRestricted] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [singleEmail, setSingleEmail] = useState('');
    const [bulkInput, setBulkInput] = useState('');
    const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedInviteText, setCopiedInviteText] = useState(false);
    const fileInputRef = useRef(null);

    // Sync state when modal opens or job changes
    useEffect(() => {
        if (isOpen && job) {
            setIsRestricted(Boolean(job.isRestrictedToWhitelist));
            const existing = Array.isArray(job.allowedCandidates) 
                ? job.allowedCandidates.map(e => String(e).trim().toLowerCase()).filter(e => EMAIL_REGEX.test(e))
                : [];
            setCandidates([...new Set(existing)]);
            setSingleEmail('');
            setBulkInput('');
            setSearchQuery('');
            setErrorMessage('');
            setSaveSuccess(false);
            setActiveTab('single');
        }
    }, [isOpen, job]);

    if (!isOpen || !job) return null;

    const handleAddSingleEmail = (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');
        const trimmed = singleEmail.trim().toLowerCase();

        if (!trimmed) return;
        if (!EMAIL_REGEX.test(trimmed)) {
            setErrorMessage(`"${trimmed}" is not a valid email address.`);
            return;
        }
        if (candidates.includes(trimmed)) {
            setErrorMessage(`"${trimmed}" is already on the allowed list.`);
            return;
        }

        setCandidates(prev => [trimmed, ...prev]);
        setSingleEmail('');
    };

    const handleParseBulkEmails = () => {
        setErrorMessage('');
        if (!bulkInput.trim()) return;

        // Split by newline, comma, semicolon, space, or tab
        const tokens = bulkInput
            .split(/[\r\n,;\t\s]+/)
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        const validEmails = [];
        const invalidEmails = [];

        tokens.forEach(token => {
            if (EMAIL_REGEX.test(token)) {
                validEmails.push(token);
            } else {
                invalidEmails.push(token);
            }
        });

        if (validEmails.length === 0) {
            setErrorMessage('No valid email addresses found in the pasted text.');
            return;
        }

        const merged = [...new Set([...candidates, ...validEmails])];
        const addedCount = merged.length - candidates.length;
        setCandidates(merged);
        setBulkInput('');

        if (invalidEmails.length > 0) {
            setErrorMessage(`Added ${addedCount} emails. Skipped ${invalidEmails.length} invalid items (e.g. ${invalidEmails.slice(0, 2).join(', ')}).`);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                setBulkInput(content);
                setActiveTab('bulk');
            }
        };
        reader.readAsText(file);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveCandidate = (emailToRemove) => {
        setCandidates(prev => prev.filter(email => email !== emailToRemove));
    };

    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to clear all candidate emails from this whitelist?')) {
            setCandidates([]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);

        try {
            // Deduplicate and ensure clean emails
            const cleanList = [...new Set(
                candidates.map(c => String(c).trim().toLowerCase()).filter(c => EMAIL_REGEX.test(c))
            )];

            // If restricted is enabled but no candidates are added, warn the recruiter
            if (isRestricted && cleanList.length === 0) {
                const proceed = window.confirm(
                    'You have enabled "Invite Only" mode, but no candidate emails are added. This will block all candidates until emails are listed. Do you want to proceed?'
                );
                if (!proceed) {
                    setIsSaving(false);
                    return;
                }
            }

            let headers = {};
            try {
                headers = await getAuthHeaders();
            } catch (err) {
                console.warn('[WHITELIST-MODAL] Could not retrieve auth headers, continuing:', err.message);
            }

            const payload = {
                isRestrictedToWhitelist: isRestricted,
                allowedCandidates: cleanList
            };

            await axios.put(`${API_URL}/jobs/${job._id}`, payload, { headers });

            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                onUpdateComplete?.();
                onClose();
            }, 1000);
        } catch (error) {
            console.error('[WHITELIST-MODAL] Error updating job whitelist:', error);
            setErrorMessage(error.response?.data?.message || error.message || 'Failed to update whitelist settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleCopyInviteText = async () => {
        const text = `Hi,\n\nYou have been invited to complete the assessment for the position of "${job.title}" at ${job.company || 'our company'}.\n\nAccess your assessment directly here:\n${shareUrl}\n\nPlease ensure you log in with your invited email address to access the test.\n\nBest of luck!`;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedInviteText(true);
            setTimeout(() => setCopiedInviteText(false), 2000);
        } catch (err) {
            console.error('Failed to copy invite text:', err);
        }
    };

    const filteredCandidates = candidates.filter(email => 
        email.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-purple-50/70 via-white to-white">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                    Assessment Candidate Whitelist
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                                    Email Verification
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {job.title} {job.company ? `• ${job.company}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Master Whitelist Toggle Card */}
                    <div className={`p-4.5 rounded-2xl border transition-all ${
                        isRestricted 
                            ? 'bg-purple-50/50 border-purple-200 shadow-xs' 
                            : 'bg-slate-50 border-slate-200/80'
                    }`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Restrict Assessment to Listed Emails (Invite-Only)
                                    </h3>
                                    {isRestricted ? (
                                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase">
                                            Open Access
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    When enabled, only candidates logged into an account matching one of the verified email addresses below can access and submit the assessment.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsRestricted(prev => !prev)}
                                className={`w-12 h-6 rounded-full transition-all relative shrink-0 cursor-pointer ${
                                    isRestricted ? 'bg-purple-600' : 'bg-slate-300'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${
                                    isRestricted ? 'left-7' : 'left-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {/* Whitelist Management Controls */}
                    {isRestricted && (
                        <div className="space-y-4">
                            {/* Input Mode Tabs */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('single')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'single'
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        + Single Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('bulk')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'bulk'
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        Bulk Paste / Import
                                    </button>
                                </div>

                                {/* CSV Upload Quick Trigger */}
                                <div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        accept=".csv,.txt" 
                                        className="hidden" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                                    >
                                        <Upload size={13} />
                                        <span>Import CSV/TXT</span>
                                    </button>
                                </div>
                            </div>

                            {/* Single Email Input */}
                            {activeTab === 'single' && (
                                <form onSubmit={handleAddSingleEmail} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            value={singleEmail}
                                            onChange={(e) => {
                                                setSingleEmail(e.target.value);
                                                setErrorMessage('');
                                            }}
                                            placeholder="candidate.email@example.com"
                                            className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 text-slate-900 transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!singleEmail.trim()}
                                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <Plus size={14} />
                                        <span>Add</span>
                                    </button>
                                </form>
                            )}

                            {/* Bulk Paste / Import */}
                            {activeTab === 'bulk' && (
                                <div className="space-y-2">
                                    <textarea
                                        rows={4}
                                        value={bulkInput}
                                        onChange={(e) => {
                                            setBulkInput(e.target.value);
                                            setErrorMessage('');
                                        }}
                                        placeholder="Paste candidate emails here, separated by commas, spaces, or line breaks:&#10;alice@example.com, bob@example.com&#10;charlie@example.com"
                                        className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 text-slate-900 transition-all"
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-slate-400">
                                            Emails are automatically deduplicated and converted to lowercase.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleParseBulkEmails}
                                            disabled={!bulkInput.trim()}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                                        >
                                            Process & Add Emails
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error / Feedback Message */}
                            {errorMessage && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Current Allowed Candidates List */}
                            <div className="space-y-2.5 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Authorized Candidates
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                                            {candidates.length}
                                        </span>
                                    </div>

                                    {candidates.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearAll}
                                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {/* Search bar if list is longer than 4 */}
                                {candidates.length > 4 && (
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Filter candidates..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:outline-hidden"
                                        />
                                    </div>
                                )}

                                {/* Emails Container */}
                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                                    {candidates.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400">
                                            <Users size={24} className="mx-auto mb-1 opacity-50" />
                                            <p className="text-xs font-semibold">No candidate emails listed yet</p>
                                            <p className="text-[11px]">Add emails above to authorize them for this assessment</p>
                                        </div>
                                    ) : filteredCandidates.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 text-xs">
                                            No candidates match "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredCandidates.map((email) => (
                                            <div
                                                key={email}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0 uppercase">
                                                        {email.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-800 truncate">
                                                        {email}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCandidate(email)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                                    title={`Remove ${email}`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Assessment Link & Invitation Share Block */}
                            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                                        <Share2 size={14} className="text-purple-600" />
                                        <span>Candidate Invitation Link</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyLink}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs cursor-pointer transition-colors"
                                        >
                                            {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyInviteText}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs cursor-pointer transition-colors"
                                        >
                                            {copiedInviteText ? <Check size={12} className="text-emerald-600" /> : <FileText size={12} />}
                                            <span>{copiedInviteText ? 'Copied Message' : 'Copy Invite Message'}</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[11px] text-purple-700/80 font-mono truncate bg-white/80 px-2.5 py-1.5 rounded-lg border border-purple-100">
                                    {shareUrl}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <div>
                        {saveSuccess && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                <CheckCircle2 size={15} />
                                <span>Settings saved successfully!</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={15} />
                                    <span>Save Whitelist</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CandidateWhitelistModal;
