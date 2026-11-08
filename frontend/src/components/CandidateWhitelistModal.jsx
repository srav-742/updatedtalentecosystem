import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import './CandidateWhitelistModal.css';

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
                ...job,
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

    const modalContent = (
        <div className="cwm-backdrop animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="cwm-modal-box"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cwm-title"
            >
                {/* Header */}
                <div className="cwm-header">
                    <div className="flex items-center gap-3.5">
                        <div className="cwm-header-icon">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="cwm-title" className="cwm-header-title">
                                    Assessment Candidate Whitelist
                                </h2>
                                <span className="cwm-header-badge">
                                    Email Verification
                                </span>
                            </div>
                            <p className="cwm-header-subtitle">
                                {job.title} {job.company ? `• ${job.company}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="cwm-close-btn"
                        aria-label="Close modal"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="cwm-body">
                    {/* Master Whitelist Toggle Card */}
                    <div className={`cwm-toggle-card ${isRestricted ? 'is-active' : 'is-inactive'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="cwm-toggle-title">
                                        Restrict Assessment to Listed Emails (Invite-Only)
                                    </h3>
                                    {isRestricted ? (
                                        <span className="cwm-status-pill pill-active">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="cwm-status-pill pill-open">
                                            Open Access
                                        </span>
                                    )}
                                </div>
                                <p className="cwm-toggle-desc">
                                    When enabled, only candidates logged into an account matching one of the verified email addresses below can access and submit the assessment.
                                </p>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={isRestricted}
                                onClick={() => setIsRestricted(prev => !prev)}
                                className={`cwm-switch ${isRestricted ? 'switch-on' : 'switch-off'}`}
                                title={isRestricted ? 'Click to disable invite-only restriction' : 'Click to enable invite-only restriction'}
                            >
                                <div className="cwm-switch-knob" />
                            </button>
                        </div>
                    </div>

                    {/* Whitelist Management Controls */}
                    {isRestricted && (
                        <div className="space-y-4">
                            {/* Input Mode Tabs */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('single')}
                                        className={`cwm-tab-btn ${activeTab === 'single' ? 'tab-active' : 'tab-inactive'}`}
                                    >
                                        + Single Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('bulk')}
                                        className={`cwm-tab-btn ${activeTab === 'bulk' ? 'tab-active' : 'tab-inactive'}`}
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
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="email"
                                            value={singleEmail}
                                            onChange={(e) => {
                                                setSingleEmail(e.target.value);
                                                setErrorMessage('');
                                            }}
                                            placeholder="candidate.email@example.com"
                                            className="cwm-input"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!singleEmail.trim()}
                                        className="cwm-btn-purple shrink-0"
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
                                        className="cwm-textarea"
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Emails are deduplicated and formatted automatically.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleParseBulkEmails}
                                            disabled={!bulkInput.trim()}
                                            className="cwm-btn-dark shrink-0"
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
                                    <span className="font-medium">{errorMessage}</span>
                                </div>
                            )}

                            {/* Current Allowed Candidates List */}
                            <div className="space-y-2 pt-1">
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
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Filter candidates..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:border-purple-600"
                                        />
                                    </div>
                                )}

                                {/* Emails Container */}
                                <div className="cwm-candidates-box">
                                    {candidates.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400">
                                            <Users size={24} className="mx-auto mb-1 opacity-60 text-slate-400" />
                                            <p className="text-xs font-semibold text-slate-600">No candidate emails listed yet</p>
                                            <p className="text-[11px] text-slate-400">Add emails above to authorize them for this assessment</p>
                                        </div>
                                    ) : filteredCandidates.length === 0 ? (
                                        <div className="text-center py-4 text-slate-500 text-xs font-medium">
                                            No candidates match "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredCandidates.map((email) => (
                                            <div
                                                key={email}
                                                className="cwm-candidate-row"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="cwm-avatar-circle">
                                                        {email.charAt(0)}
                                                    </div>
                                                    <span className="cwm-candidate-email">
                                                        {email}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCandidate(email)}
                                                    className="cwm-delete-btn"
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
                            <div className="cwm-share-box">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="cwm-share-title">
                                        <Share2 size={14} className="text-purple-600" />
                                        <span>Candidate Invitation Link</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyLink}
                                            className="cwm-copy-btn"
                                        >
                                            {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyInviteText}
                                            className="cwm-copy-btn"
                                        >
                                            {copiedInviteText ? <Check size={12} className="text-emerald-600" /> : <FileText size={12} />}
                                            <span>{copiedInviteText ? 'Copied Message' : 'Copy Invite Message'}</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="cwm-url-display">
                                    {shareUrl}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="cwm-footer">
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
                            className="cwm-btn-cancel"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="cwm-btn-purple uppercase tracking-wider"
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

    // Render directly in document.body via Portal to prevent any parent styling leaks
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default CandidateWhitelistModal;
