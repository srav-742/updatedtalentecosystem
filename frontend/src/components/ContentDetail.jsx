import React, { useState } from "react";
import { Copy, CheckCircle, Smartphone, ExternalLink, RefreshCw } from "lucide-react";
import { markAsPosted, regenerateContent } from "../services/contentService";

const ContentDetail = ({ selected, refresh }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    if (!selected) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
                <Smartphone size={64} className="mb-6 stroke-[1]" />
                <h3 className="text-xl font-black uppercase tracking-widest">Select an Item</h3>
                <p className="max-w-xs text-sm mt-2">Pick a generated post from the feed to review and manage.</p>
            </div>
        );
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(selected.generatedPost);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleMarkPosted = async () => {
        try {
            await markAsPosted(selected._id);
            refresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            await regenerateContent(selected._id);
            refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 block">Preview Mode</span>
                    <h2 className="text-xl font-black uppercase tracking-tight">{selected.topicTitle}</h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCopy}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        title="Copy to Clipboard"
                    >
                        {copySuccess ? <CheckCircle size={18} className="text-teal-400" /> : <Copy size={18} />}
                    </button>
                    <a 
                        href="https://www.linkedin.com" 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        title="Open LinkedIn"
                    >
                        <ExternalLink size={18} />
                    </a>
                </div>
            </header>

            <div className="flex-1 bg-black/20 border border-white/5 rounded-3xl p-8 mb-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400" />
                        <div>
                            <div className="h-2 w-24 bg-white/20 rounded-full mb-1.5" />
                            <div className="h-1.5 w-16 bg-white/10 rounded-full" />
                        </div>
                    </div>
                    
                    <div className="text-gray-300 leading-relaxed space-y-4 whitespace-pre-wrap font-medium">
                        {selected.generatedPost}
                    </div>
                </div>
            </div>

            <footer className="flex items-center gap-4">
                <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isRegenerating ? "animate-spin" : ""} />
                    {isRegenerating ? "Regenerating..." : "Regenerate"}
                </button>

                <button
                    onClick={() => {
                        handleCopy();
                        handleMarkPosted();
                    }}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
                        copySuccess
                        ? 'bg-teal-500/20 text-teal-400 cursor-default border border-teal-500/20'
                        : 'bg-white text-black hover:bg-teal-400 hover:text-white shadow-xl active:scale-95'
                    }`}
                >
                    {copySuccess ? (
                        <><CheckCircle size={16} /> Copied to Clipboard</>
                    ) : (
                        <><Copy size={16} /> Copy LinkedIn Post</>
                    )}
                </button>
            </footer>
        </div>
    );
};

export default ContentDetail;