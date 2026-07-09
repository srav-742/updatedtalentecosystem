import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../firebase';

const BulkUploadModal = ({ isOpen, onClose, jobId, onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const [recruiter] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setProcessing(false);
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
        fileInputRef.current.click();
    };

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
            await delay(600); // Visual spacing for micro-interactions

            // Step 2: Parsing
            updateFileStatus(currentFile.id, { status: 'parsing', progress: 50 });

            const formData = new FormData();
            formData.append('resume', currentFile.file);
            formData.append('jobId', jobId);
            formData.append('recruiterId', recruiterId);

            try {
                const res = await axios.post(`${API_URL}/recruiter/bulk-upload-candidate`, formData);

                // Step 3: Analyzing
                updateFileStatus(currentFile.id, { status: 'analyzing', progress: 75 });
                await delay(600);

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

    const updateFileStatus = (id, updates) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getStatusTextAndStyle = (file) => {
        switch (file.status) {
            case 'queued':
                return { text: 'Ready', class: 'text-gray-400 bg-white/5 border-white/5' };
            case 'uploading':
                return { text: 'Uploading...', class: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
            case 'parsing':
                return { text: 'AI Extracting...', class: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
            case 'analyzing':
                return { text: 'Job Scoring...', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            case 'success':
                return { text: 'Completed', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
            case 'failed':
                return { text: 'Failed', class: 'text-red-400 bg-red-500/10 border-red-500/20' };
            default:
                return { text: 'Queued', class: 'text-gray-400 bg-white/5 border-white/5' };
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

    const successCount = files.filter((f) => f.status === 'success').length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-zinc-950/90 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Glow Background effect */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <UploadCloud size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Bulk Resume Upload</h3>
                            <p className="text-xs text-gray-500">Extract, parse, and score candidate profiles instantly using AI.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 relative z-10 flex-1">
                    {/* Drag and Drop Zone */}
                    {files.length === 0 && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={triggerSelect}
                            className={`p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
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
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 mb-4 transition-transform group-hover:scale-110">
                                <UploadCloud size={32} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1">Drag & Drop Resumes Here</h4>
                            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                                Upload multiple candidate PDF profiles. Our engine will auto-create virtual applicant profiles.
                            </p>
                            <span className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md">
                                Browse PDF Files
                            </span>
                        </div>
                    )}

                    {/* File List Queue */}
                    {files.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    Files In Upload Queue ({files.length})
                                </span>
                                {!processing && (
                                    <button
                                        onClick={triggerSelect}
                                        className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors"
                                    >
                                        + Add More
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

                            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {files.map((fileObj) => {
                                        const statusStyle = getStatusTextAndStyle(fileObj);
                                        return (
                                            <motion.div
                                                key={fileObj.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 group/item relative"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-blue-400 shrink-0">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-gray-200 truncate pr-4">
                                                                {fileObj.name}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 font-medium">
                                                                {fileObj.size}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${statusStyle.class}`}
                                                        >
                                                            {statusStyle.text}
                                                        </span>
                                                        {!processing && fileObj.status === 'queued' && (
                                                            <button
                                                                onClick={() => removeFile(fileObj.id)}
                                                                className="text-gray-500 hover:text-red-400 p-1 transition-colors"
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
                                                                className={`h-full ${getProgressBarColor(
                                                                    fileObj.status
                                                                )} transition-all duration-300`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* File Processing Summary/Error Output */}
                                                {fileObj.status === 'success' && fileObj.candidate && (
                                                    <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2 py-1.5 rounded-lg border border-emerald-500/10">
                                                        <CheckCircle2 size={12} />
                                                        <span>
                                                            Imported:{' '}
                                                            <strong className="text-white">
                                                                {fileObj.candidate.name}
                                                            </strong>{' '}
                                                            ({fileObj.candidate.email}) — AI Resume Score:{' '}
                                                            <strong className="text-white">
                                                                {fileObj.candidate.score}/10
                                                            </strong>{' '}
                                                            [{fileObj.candidate.status}]
                                                        </span>
                                                    </div>
                                                )}

                                                {fileObj.status === 'failed' && fileObj.error && (
                                                    <div className="text-[10px] font-semibold text-red-400 flex items-start gap-1 bg-red-500/5 px-2 py-1.5 rounded-lg border border-red-500/10">
                                                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
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
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between relative z-10 bg-black/40">
                    <div className="text-xs text-gray-500 font-medium">
                        {files.length > 0 && (
                            <span>
                                {successCount} of {files.length} processed successfully
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {successCount > 0 ? 'Close' : 'Cancel'}
                        </button>
                        {files.length > 0 && !files.every((f) => f.status === 'success') && (
                            <button
                                onClick={processFiles}
                                disabled={processing}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>AI Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={14} />
                                        <span>Start Processing</span>
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
