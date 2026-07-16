import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Mail, Check } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, applicationId, candidateName }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !applicationId) return null;

    const shareUrl = `${window.location.origin}/public/interview/${applicationId}`;
    const formattedCandidate = candidateName ? candidateName : 'Candidate';

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
            console.error('Failed to copy share link:', err);
        });
    };

    const handleWhatsAppShare = () => {
        const text = `Hi, please review the AI interview recording and evaluation for ${formattedCandidate} on hire1percent:\n\n${shareUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleEmailShare = () => {
        const subject = `AI Interview Review: ${formattedCandidate}`;
        const body = `Hi,\n\nPlease find the candidate's AI interview recording, transcript, and aggregate evaluation metrics here:\n${shareUrl}\n\nBest regards,\nHiring Team`;
        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(emailUrl, '_self');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-md bg-[#1a1d24] text-white border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-6"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight text-white">Share Interview</h3>
                            <p className="text-xs text-gray-400 mt-1">Review candidate: <span className="text-purple-400 font-bold">{formattedCandidate}</span></p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Sharing Option Grid */}
                    <div className="space-y-4">
                        {/* Copy Link Option */}
                        <button
                            onClick={handleCopy}
                            className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 p-4 rounded-2xl text-left transition-all hover:scale-102 cursor-pointer group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Copy Shareable Link</div>
                                <div className="text-xs text-gray-400 mt-0.5">{copied ? 'Link Copied successfully!' : 'Copy raw URL to clipboard'}</div>
                            </div>
                        </button>

                        {/* WhatsApp Option */}
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 p-4 rounded-2xl text-left transition-all hover:scale-102 cursor-pointer group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                                {/* SVG WhatsApp Icon */}
                                <svg size={18} className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.023-5.101-2.887-6.967C16.638 1.944 14.162 1.9 11.706 1.9c-5.435 0-9.859 4.417-9.863 9.848-.001 1.748.473 3.42 1.368 4.958l-1.04 3.793 3.886-1.018zm11.394-6.435c-.3-.149-1.777-.878-2.076-.985-.3-.108-.52-.162-.74.167-.217.329-.84 1.059-1.03 1.272-.189.214-.378.24-.677.09-2.793-1.396-4.385-3.32-5.127-4.593-.19-.329-.019-.507.147-.671.148-.148.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.677-1.635-.927-2.235-.245-.589-.494-.509-.677-.518-.174-.008-.374-.01-.573-.01-.2 0-.523.074-.797.373-.273.3-1.045 1.02-1.045 2.487 0 1.468 1.07 2.885 1.218 3.085.15.2 2.106 3.22 5.1 4.512.712.308 1.27.492 1.702.63.716.227 1.368.195 1.884.118.576-.085 1.778-.727 2.026-1.43.248-.702.248-1.305.173-1.43-.076-.125-.285-.2-.585-.35z"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Share via WhatsApp</div>
                                <div className="text-xs text-gray-400 mt-0.5">Open WhatsApp Web/App to share link</div>
                            </div>
                        </button>

                        {/* Email Option */}
                        <button
                            onClick={handleEmailShare}
                            className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 p-4 rounded-2xl text-left transition-all hover:scale-102 cursor-pointer group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                                <Mail size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Share via Email</div>
                                <div className="text-xs text-gray-400 mt-0.5">Draft an email containing the evaluation link</div>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ShareModal;
