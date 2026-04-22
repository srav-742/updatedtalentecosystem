import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Copy, CheckCircle, RefreshCw, Layers } from "lucide-react";
import { getAllContent, generateContent } from "../services/contentService";
import ContentList from "../components/ContentList";
import ContentDetail from "../components/ContentDetail";
import CommunitySettingsModal from "../components/CommunitySettingsModal";
import { Settings } from "lucide-react";

const AdminContentPage = () => {
    const [content, setContent] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [showCommunitySettings, setShowCommunitySettings] = useState(false);

    const fetchContent = async () => {
        try {
            const data = await getAllContent();
            if (Array.isArray(data)) {
                setContent(data);
            } else {
                console.error("Fetched data is not an array:", data);
                setContent([]);
            }
        } catch (error) {
            console.error("Failed to fetch content from backend:", error);
            setContent([]);
        }
    };

    useEffect(() => {
        fetchContent();
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setStatusMsg("Scanning news & Hacker News...");
        try {
            await generateContent();
            await fetchContent();
        } catch (err) {
            console.error("Generation failed:", err);
        } finally {
            setLoading(false);
            setStatusMsg("");
        }
    };

    return (
        <div className="min-h-screen bg-[#0c0f16] text-white font-sans overflow-x-hidden">
            
            <main className="container mx-auto px-6 pt-16 pb-20">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Layers size={18} />
                            </div>
                            <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Marketing Engine</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Content <span className="text-teal-400">Dashboard</span></h1>
                        <p className="text-gray-500 font-medium">Manage AI-generated viral content for multi-channel growth.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowCommunitySettings(true)}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-teal-400 hover:border-teal-500/30 transition-all shadow-xl"
                            title="Community Settings"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`group relative overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-500/20`}
                        >
                        <div className="flex items-center gap-2 relative z-10">
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                            {loading ? (statusMsg || "Processing...") : "Generate Daily Batch"}
                        </div>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl h-[700px] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-6 px-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Content Feed</h3>
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                                    {content.length} Items
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <ContentList content={content} onSelect={setSelected} selectedId={selected?._id} />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl min-h-[700px] flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <ContentDetail selected={selected} refresh={fetchContent} />
                        </div>
                    </div>
                </div>
            </main>

            {showCommunitySettings && <CommunitySettingsModal onClose={() => setShowCommunitySettings(false)} />}
        </div>
    );
};

export default AdminContentPage;
